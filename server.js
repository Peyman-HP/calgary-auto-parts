require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const sharp = require("sharp");

const app = express();
const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const OUTBOX_DIR = path.join(DATA_DIR, "outbox");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
const MEDIA_DIR = path.join(PUBLIC_DIR, "media");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error(message(req, "imageOnly")));
      return;
    }
    cb(null, true);
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(PUBLIC_DIR));

async function ensureRuntimeDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(OUTBOX_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(MEDIA_DIR, { recursive: true });
}

const DB_SAMPLE_PATH = path.join(DATA_DIR, "db.sample.json");

async function readDb() {
  await ensureRuntimeDirs();
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    // Fresh checkout: seed the live database from the bundled sample.
    const sample = await fs.readFile(DB_SAMPLE_PATH, "utf8");
    await fs.writeFile(DB_PATH, sample, "utf8");
    return JSON.parse(sample);
  }
}

const BACKUP_DIR = path.join(DATA_DIR, "backups");
const BACKUP_KEEP = 14;

async function backupDbIfDue() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const target = path.join(BACKUP_DIR, `db-${stamp}.json`);
    try {
      await fs.access(target);
      return;
    } catch {}
    await fs.copyFile(DB_PATH, target);
    const entries = (await fs.readdir(BACKUP_DIR))
      .filter((name) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort();
    while (entries.length > BACKUP_KEEP) {
      await fs.rm(path.join(BACKUP_DIR, entries.shift()), { force: true });
    }
  } catch (error) {
    console.error("Database backup failed:", error.message);
  }
}

async function writeDb(db) {
  await ensureRuntimeDirs();
  await backupDbIfDue();
  await fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

// Serializes read-modify-write cycles so concurrent requests cannot drop each other's changes.
let dbQueue = Promise.resolve();
function withDbLock(task) {
  const run = dbQueue.then(task, task);
  dbQueue = run.then(() => {}, () => {});
  return run;
}

function hashPasscode(passcode) {
  return `sha256:${crypto.createHash("sha256").update(String(passcode)).digest("hex")}`;
}

function passcodeMatches(stored, passcode) {
  if (!stored || !passcode) return false;
  if (String(stored).startsWith("sha256:")) return hashPasscode(passcode) === String(stored);
  return String(stored) === String(passcode);
}

const ADMIN_TOKEN_TTL = 12 * 60 * 60 * 1000;
const adminTokens = new Map();

function issueAdminToken() {
  const token = crypto.randomBytes(24).toString("hex");
  adminTokens.set(token, Date.now() + ADMIN_TOKEN_TTL);
  return token;
}

function adminTokenValid(token) {
  const expiry = adminTokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    adminTokens.delete(token);
    return false;
  }
  return true;
}

const ORDER_RATE_LIMIT = 5;
const ORDER_RATE_WINDOW = 10 * 60 * 1000;
const orderRateHits = new Map();

function orderRateExceeded(ip) {
  const now = Date.now();
  const hits = (orderRateHits.get(ip) || []).filter((time) => now - time < ORDER_RATE_WINDOW);
  if (hits.length >= ORDER_RATE_LIMIT) {
    orderRateHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  orderRateHits.set(ip, hits);
  return false;
}

const TELEGRAM_MESSAGE_LIMIT = 4000;

function chunkText(text, size = TELEGRAM_MESSAGE_LIMIT) {
  const chunks = [];
  let rest = String(text);
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n", size);
    if (cut < size / 2) cut = size;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function ensureUniqueSlug(articles, desired, excludeId = "") {
  let slug = desired;
  let counter = 2;
  while (articles.some((article) => article.slug === slug && article.id !== excludeId)) {
    slug = `${desired}-${counter++}`;
  }
  return slug;
}

const ORDER_STATUSES = ["new", "contacted", "done"];

function publicSettings(settings) {
  return {
    storeName: settings.storeName,
    tagline: settings.tagline,
    phone: settings.phone || "",
    publicEmail: settings.publicEmail || "",
    serviceLocation: settings.serviceLocation || "",
    businessHours: settings.businessHours || "",
    footerNote: settings.footerNote || "",
    deliveryFee: Number(settings.deliveryFee || 0),
    currency: settings.currency || "CAD",
    slider: {
      productId: settings.slider?.productId || "",
      articleId: settings.slider?.articleId || ""
    }
  };
}

function ensureCollections(db) {
  db.products ||= [];
  db.orders ||= [];
  db.articles ||= [];
  db.media ||= [];
  return db;
}

function adminSettings(settings) {
  return {
    storeName: settings.storeName,
    tagline: settings.tagline,
    ownerEmail: process.env.OWNER_EMAIL || settings.ownerEmail,
    fromEmail: process.env.MAIL_FROM || settings.fromEmail,
    phone: settings.phone || "",
    publicEmail: settings.publicEmail || "",
    serviceLocation: settings.serviceLocation || "",
    businessHours: settings.businessHours || "",
    footerNote: settings.footerNote || "",
    deliveryFee: Number(settings.deliveryFee || 0),
    currency: settings.currency || "CAD",
    smtp: {
      host: process.env.SMTP_HOST || settings.smtp?.host || "",
      port: Number(process.env.SMTP_PORT || settings.smtp?.port || 587),
      secure: String(process.env.SMTP_SECURE || settings.smtp?.secure || "false") === "true",
      user: process.env.SMTP_USER || settings.smtp?.user || "",
      pass: process.env.SMTP_PASS ? "env-configured" : settings.smtp?.pass ? "saved" : ""
    },
    notifications: {
      channel: settings.notifications?.channel || "email",
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN
          ? "env-configured"
          : settings.notifications?.telegram?.botToken
            ? "saved"
            : "",
        chatId: process.env.TELEGRAM_CHAT_ID || settings.notifications?.telegram?.chatId || ""
      }
    },
    slider: {
      productId: settings.slider?.productId || "",
      articleId: settings.slider?.articleId || ""
    }
  };
}

const MESSAGES = {
  en: {
    invalidAdmin: "Invalid admin passcode.",
    imageOnly: "Only image uploads are allowed.",
    productNotFound: "Product not found.",
    productUnavailable: "Selected product is no longer available.",
    phoneAddressRequired: "Phone and service address are required.",
    phonePickupTimeRequired: "Phone and pickup time are required.",
    tooManyOrders: "Too many orders from this connection. Please wait a few minutes and try again.",
    orderNotFound: "Order not found.",
    invalidStatus: "Invalid order status.",
    serverError: "Server error."
  },
  fa: {
    invalidAdmin: "رمز مدیریت معتبر نیست.",
    imageOnly: "فقط آپلود تصویر مجاز است.",
    productNotFound: "محصول پیدا نشد.",
    productUnavailable: "محصول انتخاب‌شده دیگر در دسترس نیست.",
    phoneAddressRequired: "شماره تلفن و آدرس سرویس اجباری هستند.",
    phonePickupTimeRequired: "شماره تلفن و زمان تحویل حضوری اجباری هستند.",
    tooManyOrders: "تعداد سفارش‌های ارسالی از این اتصال زیاد است. لطفاً چند دقیقه صبر کنید.",
    orderNotFound: "سفارش پیدا نشد.",
    invalidStatus: "وضعیت سفارش معتبر نیست.",
    serverError: "خطای سرور."
  }
};

function requestLanguage(req) {
  const requested = String(req.get("x-admin-language") || req.query.lang || req.get("accept-language") || "en").toLowerCase();
  return requested.startsWith("fa") ? "fa" : "en";
}

function message(req, key) {
  const language = requestLanguage(req);
  return MESSAGES[language][key] || MESSAGES.en[key] || key;
}

function activeProducts(db) {
  return db.products.filter((product) => product.active !== false);
}

function buildTaxonomy(products) {
  const types = [...new Set(products.map((product) => product.type).filter(Boolean))].sort();
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].sort();
  const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))].sort();
  const productModels = [...new Set(products.map((product) => product.model).filter(Boolean))].sort();
  const productModelsByBrand = {};
  const vehicles = {};

  products.forEach((product) => {
    if (product.brand && product.model) {
      if (!productModelsByBrand[product.brand]) productModelsByBrand[product.brand] = new Set();
      productModelsByBrand[product.brand].add(product.model);
    }

    (product.fitments || []).forEach((fitment) => {
      if (!fitment.make || !fitment.model) return;
      if (!vehicles[fitment.make]) vehicles[fitment.make] = new Set();
      vehicles[fitment.make].add(fitment.model);
    });
  });

  return {
    types,
    categories,
    brands,
    productModels,
    productModelsByBrand: Object.fromEntries(
      Object.entries(productModelsByBrand)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([brand, models]) => [brand, [...models].sort()])
    ),
    vehicles: Object.fromEntries(
      Object.entries(vehicles)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([make, models]) => [make, [...models].sort()])
    )
  };
}

function requireAdmin(req, res, next) {
  readDb()
    .then((db) => {
      const token = req.get("x-admin-token") || "";
      const passcode = req.get("x-admin-passcode") || "";
      const authorized = (token && adminTokenValid(token))
        || (passcode && passcodeMatches(db.settings.adminPasscode, passcode));
      if (!authorized) {
        res.status(401).json({ error: message(req, "invalidAdmin") });
        return;
      }
      req.db = db;
      next();
    })
    .catch(next);
}

function parseArrayField(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function parseFitments(value) {
  const parsed = parseArrayField(value);
  return parsed
    .map((item) => {
      if (typeof item === "string") {
        const [make, model] = item.split("|").map((part) => part.trim());
        return { make, model };
      }
      return {
        make: String(item.make || "").trim(),
        model: String(item.model || "").trim()
      };
    })
    .filter((fitment) => fitment.make && fitment.model);
}

function numberField(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function boolField(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function slugify(parts) {
  const slug = parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || crypto.randomUUID();
}

function textSlug(value, fallback = "item") {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `${fallback}-${crypto.randomBytes(3).toString("hex")}`;
}

async function processMediaUpload(file, fields = {}) {
  if (!file) return null;

  const seoName = String(fields.seoName || fields.mediaSeoName || fields.altText || file.originalname || "site-image").trim();
  const base = textSlug(seoName, "site-image");
  const filename = `${Date.now()}-${base}-${crypto.randomBytes(3).toString("hex")}.webp`;
  const outputPath = path.join(MEDIA_DIR, filename);

  const image = sharp(file.buffer, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  await image
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: 78 })
    .toFile(outputPath);

  const stat = await fs.stat(outputPath);
  return {
    id: crypto.randomUUID(),
    url: `/media/${filename}`,
    filename,
    originalName: file.originalname || "",
    seoName,
    altText: String(fields.altText || seoName).trim(),
    mimeType: "image/webp",
    originalBytes: file.size,
    bytes: stat.size,
    width: metadata.width || null,
    height: metadata.height || null,
    createdAt: new Date().toISOString()
  };
}

function articleFromBody(body, fileMedia, existing = {}) {
  const title = String(body.title || existing.title || "").trim();
  const slug = textSlug(body.slug || existing.slug || title, "article");
  const summary = String(body.summary || existing.summary || "").trim();
  const content = String(body.content || existing.content || "").trim();
  const image = fileMedia?.url || String(body.image || existing.image || "").trim();

  return {
    id: existing.id || body.id || crypto.randomUUID(),
    active: body.active === undefined ? existing.active !== false : boolField(body.active),
    featured: body.featured === undefined ? Boolean(existing.featured) : boolField(body.featured),
    title,
    slug,
    summary,
    content,
    image,
    imageAlt: String(body.imageAlt || fileMedia?.altText || existing.imageAlt || title).trim(),
    seoTitle: String(body.seoTitle || existing.seoTitle || title).trim(),
    metaDescription: String(body.metaDescription || existing.metaDescription || summary).trim(),
    keywords: parseArrayField(body.keywords || JSON.stringify(existing.keywords || [])),
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString()
  };
}

function productFromBody(body, fileMedia, existing = {}) {
  const brand = String(body.brand || existing.brand || "").trim();
  const model = String(body.model || existing.model || "").trim();
  const type = String(body.type || existing.type || "Accessory").trim();
  const category = String(body.category || existing.category || "Other Parts").trim();
  const generatedId = slugify([type, brand, model, body.partNumber]) + `-${crypto.randomBytes(3).toString("hex")}`;

  return {
    id: existing.id || body.id || generatedId,
    active: body.active === undefined ? existing.active !== false : boolField(body.active),
    type,
    category,
    brand,
    model,
    partNumber: String(body.partNumber || existing.partNumber || "").trim(),
    price: numberField(body.price, existing.price || 0),
    installFee: numberField(body.installFee, existing.installFee || 0),
    installFree: body.installFree === undefined ? Boolean(existing.installFree) : boolField(body.installFree),
    rating: Math.max(0, Math.min(5, numberField(body.rating, existing.rating || 0))),
    featured: body.featured === undefined ? Boolean(existing.featured) : boolField(body.featured),
    image: fileMedia?.url || String(body.image || existing.image || "/assets/hero-service.png").trim(),
    description: String(body.description || existing.description || "").trim(),
    features: parseArrayField(body.features || JSON.stringify(existing.features || [])),
    fitments: parseFitments(body.fitments || JSON.stringify(existing.fitments || [])),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function resolveMailSettings(settings) {
  return {
    ownerEmail: process.env.OWNER_EMAIL || settings.ownerEmail,
    fromEmail: process.env.MAIL_FROM || settings.fromEmail || process.env.OWNER_EMAIL || settings.ownerEmail,
    smtp: {
      host: process.env.SMTP_HOST || settings.smtp?.host || "",
      port: Number(process.env.SMTP_PORT || settings.smtp?.port || 587),
      secure: String(process.env.SMTP_SECURE || settings.smtp?.secure || "false") === "true",
      user: process.env.SMTP_USER || settings.smtp?.user || "",
      pass: process.env.SMTP_PASS || settings.smtp?.pass || ""
    }
  };
}

function resolveNotificationSettings(settings) {
  return {
    channel: settings.notifications?.channel || "email",
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || settings.notifications?.telegram?.botToken || "",
      chatId: process.env.TELEGRAM_CHAT_ID || settings.notifications?.telegram?.chatId || ""
    }
  };
}

const CURRENCY_SYMBOLS = { CAD: "$", USD: "$", EUR: "€", GBP: "£" };

function money(value, currency = "CAD") {
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  return `${symbol}${Number(value || 0).toFixed(2)} ${currency}`;
}

function buildOrderMessageFa(order, product, currency = "CAD") {
  const vehicle = order.vehicle?.make || order.vehicle?.model
    ? `${order.vehicle.make || ""} ${order.vehicle.model || ""}`.trim()
    : "وارد نشده";
  const productLine = product
    ? `${product.type} - ${product.brand} ${product.model}`
    : `درخواست سفارشی - ${order.customRequest?.title || "محصول خارج از لیست"}`;
  const installFa = !order.installRequested
    ? "نصب درخواست نشده"
    : product?.installFree
      ? `نصب رایگان (قیمت عادی ${money(order.totals.rawInstallSubtotal, currency)})`
      : money(order.totals.rawInstallSubtotal, currency);
  const deliveryFa = order.fulfillment === "pickup"
    ? "تحویل حضوری توسط مشتری"
    : order.deliveryRequested
      ? money(order.totals.deliveryFee, currency)
      : "دلیوری درخواست نشده";

  return [
    order.kind === "custom_request" ? "درخواست محصول سفارشی جدید" : "سفارش جدید",
    "",
    `شناسه سفارش: ${order.id}`,
    `زمان ثبت: ${order.createdAt}`,
    "",
    "مشتری",
    `نام: ${order.customer.name || "وارد نشده"}`,
    `تلفن: ${order.customer.phone}`,
    `ایمیل: ${order.customer.email || "وارد نشده"}`,
    `آدرس: ${order.customer.address || "وارد نشده"}`,
    "",
    "خودرو",
    vehicle,
    "",
    "محصول",
    productLine,
    `شماره قطعه: ${product?.partNumber || order.customRequest?.partNumber || "ندارد"}`,
    `تعداد: ${order.quantity}`,
    `درخواست نصب: ${order.installRequested ? "بله" : "خیر"}`,
    `نحوه تحویل: ${order.fulfillment === "pickup" ? "تحویل حضوری" : "ارسال (دلیوری)"}`,
    order.fulfillment === "pickup" ? `زمان تحویل حضوری: ${order.pickupTime || "وارد نشده"}` : "",
    order.customRequest?.details ? `جزئیات درخواست: ${order.customRequest.details}` : "",
    "",
    "قیمت",
    order.totals.priced
      ? `جمع محصول: ${money(order.totals.productSubtotal, currency)}`
      : "قیمت: تلفنی اعلام می‌شود",
    order.totals.priced ? `نصب: ${installFa}` : "",
    order.totals.priced ? `دلیوری: ${deliveryFa}` : "",
    order.totals.priced
      ? `مبلغ قابل پرداخت هنگام سرویس: ${money(order.totals.totalDue, currency)}`
      : "پیگیری: طی چند دقیقه با مشتری برای اعلام قیمت و موجودی تماس بگیرید.",
    "",
    `یادداشت: ${order.notes || "ندارد"}`
  ].filter(Boolean).join("\n");
}

function buildOrderEmail(order, product, currency = "CAD") {
  const vehicle = order.vehicle?.make || order.vehicle?.model
    ? `${order.vehicle.make || ""} ${order.vehicle.model || ""}`.trim()
    : "Not provided";
  const productLine = product
    ? `${product.type} - ${product.brand} ${product.model}`
    : `Custom request - ${order.customRequest?.title || "Unlisted product"}`;

  const englishText = [
      order.kind === "custom_request" ? "New custom product request" : "New order",
      "",
      `Order ID: ${order.id}`,
      `Created: ${order.createdAt}`,
      "",
      "Customer",
      `Name: ${order.customer.name || "Not provided"}`,
      `Phone: ${order.customer.phone}`,
      `Email: ${order.customer.email || "Not provided"}`,
      `Address: ${order.customer.address}`,
      "",
      "Vehicle",
      vehicle,
      "",
      "Product",
      productLine,
      `Part number: ${product?.partNumber || order.customRequest?.partNumber || "N/A"}`,
      `Quantity: ${order.quantity}`,
      `Installation requested: ${order.installRequested ? "Yes" : "No"}`,
      `Fulfillment: ${order.fulfillment === "pickup" ? "Customer pickup" : "Delivery"}`,
      `Delivery requested: ${order.deliveryRequested ? "Yes" : "No"}`,
      order.fulfillment === "pickup" ? `Pickup time: ${order.pickupTime || "Not provided"}` : "",
      order.customRequest?.details ? `Request details: ${order.customRequest.details}` : "",
      "",
      "Price",
      order.totals.priced
        ? `Product subtotal: ${money(order.totals.productSubtotal, currency)}`
        : "Price: To be confirmed by phone",
      order.totals.priced ? `Install: ${order.totals.installDisplay}` : "",
      order.totals.priced ? `Delivery: ${order.totals.deliveryDisplay}` : "",
      order.totals.priced
        ? `Estimated total due at service: ${money(order.totals.totalDue, currency)}`
        : "Follow-up: Contact customer within a few minutes with price and availability.",
      "",
      `Notes: ${order.notes || "None"}`
    ].filter(Boolean).join("\n");

  return {
    subject: order.kind === "custom_request"
      ? "New custom product request | درخواست محصول سفارشی جدید"
      : "New order | سفارش جدید",
    text: `${englishText}\n\n----------------------\n\n${buildOrderMessageFa(order, product, currency)}`
  };
}

async function writeOutbox(email) {
  await ensureRuntimeDirs();
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.txt`;
  await fs.writeFile(path.join(OUTBOX_DIR, filename), `${email.subject}\n\n${email.text}\n`, "utf8");
  return filename;
}

async function sendOrderEmail(settings, order, product) {
  const mail = resolveMailSettings(settings);
  const email = buildOrderEmail(order, product, settings.currency || "CAD");

  if (!mail.ownerEmail || !mail.smtp.host || !mail.smtp.user || !mail.smtp.pass) {
    const outboxFile = await writeOutbox(email);
    return { status: "saved_to_outbox", outboxFile };
  }

  const transporter = nodemailer.createTransport({
    host: mail.smtp.host,
    port: mail.smtp.port,
    secure: mail.smtp.secure,
    auth: {
      user: mail.smtp.user,
      pass: mail.smtp.pass
    }
  });

  await transporter.sendMail({
    from: mail.fromEmail,
    to: mail.ownerEmail,
    subject: email.subject,
    text: email.text
  });

  return { status: "sent" };
}

async function sendOrderTelegram(settings, order, product) {
  const notifications = resolveNotificationSettings(settings);
  const { botToken, chatId } = notifications.telegram;
  const email = buildOrderEmail(order, product, settings.currency || "CAD");
  const chatIds = String(chatId || "").split(/[,\s]+/).filter(Boolean);

  if (!botToken || !chatIds.length) {
    return { status: "not_configured" };
  }

  const chunks = chunkText(email.text);
  const errors = [];
  let sent = 0;

  for (const id of chatIds) {
    try {
      for (const chunk of chunks) {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: id, text: chunk })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.description || `HTTP ${response.status}`);
        }
      }
      sent += 1;
    } catch (error) {
      errors.push(`${id}: ${error.message}`);
    }
  }

  if (!sent) {
    throw new Error(errors.join(" | "));
  }

  return errors.length ? { status: "sent", sent, errors } : { status: "sent", sent };
}

async function sendOrderNotifications(settings, order, product) {
  const notifications = resolveNotificationSettings(settings);
  const channel = notifications.channel;
  const results = {};

  if (channel === "email" || channel === "both") {
    try {
      results.email = await sendOrderEmail(settings, order, product);
    } catch (error) {
      const outboxFile = await writeOutbox({
        subject: "New order",
        text: `${buildOrderEmail(order, product, settings.currency || "CAD").text}\n\nEmail send error: ${error.message}`
      });
      results.email = { status: "failed_saved_to_outbox", outboxFile, error: error.message };
    }
  }

  if (channel === "telegram" || channel === "both") {
    try {
      results.telegram = await sendOrderTelegram(settings, order, product);
    } catch (error) {
      results.telegram = { status: "failed", error: error.message };
    }
  }

  return results;
}

app.get("/api/catalog", async (_req, res, next) => {
  try {
    const db = ensureCollections(await readDb());
    const products = activeProducts(db);
    res.json({
      settings: publicSettings(db.settings),
      products,
      articles: db.articles.filter((article) => article.active !== false),
      taxonomy: buildTaxonomy(products)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/articles/:slug", async (req, res, next) => {
  try {
    const db = ensureCollections(await readDb());
    const article = db.articles.find((entry) => entry.slug === req.params.slug && entry.active !== false);
    if (!article) {
      res.status(404).json({ error: "Article not found." });
      return;
    }
    res.json({ article, settings: publicSettings(db.settings) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", async (req, res, next) => {
  try {
    const db = await readDb();
    const passcode = String(req.body?.passcode || "");
    if (!passcodeMatches(db.settings.adminPasscode, passcode)) {
      res.status(401).json({ error: message(req, "invalidAdmin") });
      return;
    }

    // Upgrade a legacy plaintext passcode to a hash on first successful login.
    if (!String(db.settings.adminPasscode).startsWith("sha256:")) {
      await withDbLock(async () => {
        const fresh = await readDb();
        fresh.settings.adminPasscode = hashPasscode(passcode);
        await writeDb(fresh);
      });
    }

    res.json({ token: issueAdminToken() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/state", requireAdmin, (req, res) => {
  ensureCollections(req.db);
  res.json({
    settings: adminSettings(req.db.settings),
    taxonomy: buildTaxonomy(req.db.products),
    products: req.db.products,
    orders: req.db.orders.slice().reverse(),
    articles: req.db.articles.slice().reverse(),
    media: req.db.media.slice().reverse()
  });
});

app.put("/api/admin/settings", requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const smtp = body.smtp || {};
    const notifications = body.notifications || {};
    const telegram = notifications.telegram || {};
    const slider = body.slider || {};

    const settings = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const current = db.settings;

      db.settings = {
        ...current,
        storeName: String(body.storeName || current.storeName || "").trim(),
        tagline: String(body.tagline || current.tagline || "").trim(),
        ownerEmail: String(body.ownerEmail ?? current.ownerEmail ?? "").trim(),
        fromEmail: String(body.fromEmail ?? current.fromEmail ?? "").trim(),
        phone: String(body.phone ?? current.phone ?? "").trim(),
        publicEmail: String(body.publicEmail ?? current.publicEmail ?? "").trim(),
        serviceLocation: String(body.serviceLocation ?? current.serviceLocation ?? "").trim(),
        businessHours: String(body.businessHours ?? current.businessHours ?? "").trim(),
        footerNote: String(body.footerNote ?? current.footerNote ?? "").trim(),
        deliveryFee: numberField(body.deliveryFee, current.deliveryFee || 0),
        currency: String(body.currency || current.currency || "CAD").trim(),
        adminPasscode: body.adminPasscode
          ? hashPasscode(String(body.adminPasscode).trim())
          : current.adminPasscode,
        smtp: {
          host: String(smtp.host ?? current.smtp?.host ?? "").trim(),
          port: numberField(smtp.port, current.smtp?.port || 587),
          secure: boolField(smtp.secure),
          user: String(smtp.user ?? current.smtp?.user ?? "").trim(),
          pass: smtp.pass ? String(smtp.pass) : current.smtp?.pass || ""
        },
        notifications: {
          channel: ["email", "telegram", "both"].includes(notifications.channel)
            ? notifications.channel
            : current.notifications?.channel || "email",
          telegram: {
            botToken: telegram.botToken ? String(telegram.botToken).trim() : current.notifications?.telegram?.botToken || "",
            chatId: String(telegram.chatId ?? current.notifications?.telegram?.chatId ?? "").trim()
          }
        },
        slider: {
          productId: String(slider.productId ?? current.slider?.productId ?? "").trim(),
          articleId: String(slider.articleId ?? current.slider?.articleId ?? "").trim()
        }
      };

      await writeDb(db);
      return db.settings;
    });

    res.json({ settings: adminSettings(settings) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/products", requireAdmin, upload.single("imageFile"), async (req, res, next) => {
  try {
    const media = await processMediaUpload(req.file, req.body);
    const product = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      if (media) db.media.push(media);
      const created = productFromBody(req.body, media, undefined);
      db.products.push(created);
      await writeDb(db);
      return created;
    });
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/products/:id", requireAdmin, upload.single("imageFile"), async (req, res, next) => {
  try {
    const media = await processMediaUpload(req.file, req.body);
    const product = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const index = db.products.findIndex((entry) => entry.id === req.params.id);
      if (index === -1) return null;
      if (media) db.media.push(media);
      db.products[index] = productFromBody(req.body, media, db.products[index]);
      await writeDb(db);
      return db.products[index];
    });

    if (!product) {
      res.status(404).json({ error: message(req, "productNotFound") });
      return;
    }
    res.json({ product });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/products/:id/duplicate", requireAdmin, async (req, res, next) => {
  try {
    const copy = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const index = db.products.findIndex((product) => product.id === req.params.id);
      if (index === -1) return null;
      const source = db.products[index];
      const created = {
        ...source,
        id: slugify([source.type, source.brand, source.model, source.partNumber]) + `-${crypto.randomBytes(3).toString("hex")}`,
        features: [...(source.features || [])],
        fitments: (source.fitments || []).map((fitment) => ({ ...fitment })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.products.splice(index + 1, 0, created);
      await writeDb(db);
      return created;
    });

    if (!copy) {
      res.status(404).json({ error: message(req, "productNotFound") });
      return;
    }
    res.status(201).json({ product: copy });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res, next) => {
  try {
    const removed = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const before = db.products.length;
      db.products = db.products.filter((product) => product.id !== req.params.id);
      if (db.products.length === before) return false;
      await writeDb(db);
      return true;
    });

    if (!removed) {
      res.status(404).json({ error: message(req, "productNotFound") });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/media", requireAdmin, upload.single("imageFile"), async (req, res, next) => {
  try {
    const media = await processMediaUpload(req.file, req.body);
    if (!media) {
      res.status(400).json({ error: "Image file is required." });
      return;
    }

    await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      db.media.push(media);
      await writeDb(db);
    });
    res.status(201).json({ media });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/media/:id", requireAdmin, async (req, res, next) => {
  try {
    const result = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const media = db.media.find((entry) => entry.id === req.params.id);
      if (!media) return { code: 404, error: "Image not found." };

      const inUse = db.products.some((product) => product.image === media.url)
        || db.articles.some((article) => article.image === media.url);
      if (inUse) {
        return { code: 400, error: "This image is used by a product or article. Change those images before deleting it." };
      }

      db.media = db.media.filter((entry) => entry.id !== req.params.id);
      if (media.url?.startsWith("/media/")) {
        const filename = path.basename(media.url);
        const filePath = path.resolve(MEDIA_DIR, filename);
        if (filePath.startsWith(path.resolve(MEDIA_DIR))) {
          await fs.rm(filePath, { force: true });
        }
      }

      await writeDb(db);
      return { code: 200 };
    });

    if (result.code !== 200) {
      res.status(result.code).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/articles", requireAdmin, upload.single("imageFile"), async (req, res, next) => {
  try {
    const media = await processMediaUpload(req.file, req.body);
    const article = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      if (media) db.media.push(media);
      const created = articleFromBody(req.body, media);
      created.slug = ensureUniqueSlug(db.articles, created.slug, created.id);
      db.articles.push(created);
      await writeDb(db);
      return created;
    });
    res.status(201).json({ article });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/articles/:id", requireAdmin, upload.single("imageFile"), async (req, res, next) => {
  try {
    const media = await processMediaUpload(req.file, req.body);
    const article = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const index = db.articles.findIndex((entry) => entry.id === req.params.id);
      if (index === -1) return null;
      if (media) db.media.push(media);
      const updated = articleFromBody(req.body, media, db.articles[index]);
      updated.slug = ensureUniqueSlug(db.articles, updated.slug, updated.id);
      db.articles[index] = updated;
      await writeDb(db);
      return updated;
    });

    if (!article) {
      res.status(404).json({ error: "Article not found." });
      return;
    }
    res.json({ article });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/articles/:id/duplicate", requireAdmin, async (req, res, next) => {
  try {
    const copy = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const index = db.articles.findIndex((article) => article.id === req.params.id);
      if (index === -1) return null;
      const source = db.articles[index];
      const baseTitle = String(source.title || "").replace(/\s*\(Copy\)$/, "");
      const baseSlug = String(source.slug || "").replace(/-copy(-\d+)?$/, "");
      const created = {
        ...source,
        id: crypto.randomUUID(),
        title: `${baseTitle} (Copy)`,
        slug: ensureUniqueSlug(db.articles, `${baseSlug}-copy`),
        keywords: [...(source.keywords || [])],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.articles.splice(index + 1, 0, created);
      await writeDb(db);
      return created;
    });

    if (!copy) {
      res.status(404).json({ error: "Article not found." });
      return;
    }
    res.status(201).json({ article: copy });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/articles/:id", requireAdmin, async (req, res, next) => {
  try {
    const removed = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const before = db.articles.length;
      db.articles = db.articles.filter((article) => article.id !== req.params.id);
      if (db.articles.length === before) return false;
      await writeDb(db);
      return true;
    });

    if (!removed) {
      res.status(404).json({ error: "Article not found." });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/orders/:id", requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body?.status || "").trim();
    if (!ORDER_STATUSES.includes(status)) {
      res.status(400).json({ error: message(req, "invalidStatus") });
      return;
    }

    const order = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const found = db.orders.find((entry) => entry.id === req.params.id);
      if (!found) return null;
      found.status = status;
      found.statusUpdatedAt = new Date().toISOString();
      await writeDb(db);
      return found;
    });

    if (!order) {
      res.status(404).json({ error: message(req, "orderNotFound") });
      return;
    }
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/orders/:id", requireAdmin, async (req, res, next) => {
  try {
    const removed = await withDbLock(async () => {
      const db = ensureCollections(await readDb());
      const before = db.orders.length;
      db.orders = db.orders.filter((order) => order.id !== req.params.id);
      if (db.orders.length === before) return false;
      await writeDb(db);
      return true;
    });

    if (!removed) {
      res.status(404).json({ error: message(req, "orderNotFound") });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", async (req, res, next) => {
  try {
    if (orderRateExceeded(req.ip || req.socket?.remoteAddress || "unknown")) {
      res.status(429).json({ error: message(req, "tooManyOrders") });
      return;
    }

    const db = ensureCollections(await readDb());
    const body = req.body || {};
    const product = body.productId
      ? db.products.find((item) => item.id === body.productId && item.active !== false)
      : null;

    if (body.productId && !product) {
      res.status(404).json({ error: message(req, "productUnavailable") });
      return;
    }

    const fulfillment = String(body.fulfillment || "").trim() === "pickup" ? "pickup" : "delivery";
    const deliveryRequested = fulfillment === "delivery" && (body.deliveryRequested === undefined ? true : boolField(body.deliveryRequested));
    const pickupTime = String(body.pickupTime || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    if (!phone || (!address && fulfillment !== "pickup")) {
      res.status(400).json({ error: message(req, "phoneAddressRequired") });
      return;
    }
    if (fulfillment === "pickup" && !pickupTime) {
      res.status(400).json({ error: message(req, "phonePickupTimeRequired") });
      return;
    }

    const quantity = Math.max(1, Math.min(8, Math.round(numberField(body.quantity, 1))));
    const installRequested = body.installRequested === undefined ? true : boolField(body.installRequested);
    const isCustomRequest = !product;
    const currency = db.settings.currency || "CAD";
    const productSubtotal = product ? Number(product.price || 0) * quantity : 0;
    const rawInstallSubtotal = product ? Number(product.installFee || 0) * quantity : 0;
    const installFee = product && installRequested && !product.installFree ? rawInstallSubtotal : 0;
    const rawDeliveryFee = Number(db.settings.deliveryFee || 0);
    const deliveryFee = product && deliveryRequested ? rawDeliveryFee : 0;
    const installDisplay = isCustomRequest
      ? "To be confirmed"
      : !installRequested
        ? rawInstallSubtotal > 0
          ? `No installation requested (regular ${money(rawInstallSubtotal, currency)} removed)`
          : "No installation requested"
        : product.installFree
          ? `Free install (regular ${money(rawInstallSubtotal, currency)})`
          : money(rawInstallSubtotal, currency);
    const deliveryDisplay = isCustomRequest
      ? "To be confirmed"
      : fulfillment === "pickup"
        ? rawDeliveryFee > 0
          ? `Customer pickup (regular ${money(rawDeliveryFee, currency)} delivery removed)`
          : "Customer pickup"
      : deliveryRequested
        ? money(deliveryFee, currency)
        : rawDeliveryFee > 0
          ? `No delivery requested (regular ${money(rawDeliveryFee, currency)} removed)`
          : "No delivery requested";

    const order = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "new",
      kind: isCustomRequest ? "custom_request" : "product_order",
      productId: product?.id || null,
      quantity,
      installRequested,
      fulfillment,
      deliveryRequested,
      pickupTime,
      customRequest: isCustomRequest
        ? {
          title: String(body.customTitle || "Unlisted product request").trim(),
          type: String(body.customType || "").trim(),
          category: String(body.customCategory || "").trim(),
          brand: String(body.customBrand || "").trim(),
          model: String(body.customModel || "").trim(),
          search: String(body.customSearch || "").trim(),
          details: String(body.customDetails || "").trim()
        }
        : null,
      vehicle: {
        make: String(body.vehicleMake || "").trim(),
        model: String(body.vehicleModel || "").trim()
      },
      customer: {
        name: String(body.name || "").trim(),
        phone,
        email: String(body.email || "").trim(),
        address
      },
      notes: String(body.notes || "").trim(),
      totals: {
        priced: !isCustomRequest,
        productSubtotal,
        rawInstallSubtotal,
        installFee,
        rawDeliveryFee,
        deliveryFee,
        totalDue: isCustomRequest ? null : productSubtotal + installFee + deliveryFee,
        installDisplay,
        deliveryDisplay
      }
    };

    await withDbLock(async () => {
      const fresh = ensureCollections(await readDb());
      fresh.orders.push(order);
      await writeDb(fresh);
    });

    const notificationResults = await sendOrderNotifications(db.settings, order, product);

    res.status(201).json({
      order,
      product,
      notifications: notificationResults
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || message(_req, "serverError") });
});

ensureRuntimeDirs().then(() => {
  app.listen(PORT, () => {
    console.log(`Calgary Auto Parts running at http://localhost:${PORT}`);
  });
});
