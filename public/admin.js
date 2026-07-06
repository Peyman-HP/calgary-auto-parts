const adminState = {
  token: localStorage.getItem("epicvolt-admin-token") || "",
  language: localStorage.getItem("roadready-admin-language") || "en",
  productQuery: "",
  settings: null,
  taxonomy: {
    types: [],
    categories: [],
    brands: [],
    productModels: [],
    productModelsByBrand: {},
    vehicles: {}
  },
  products: [],
  orders: [],
  articles: [],
  media: [],
  editingProductId: "",
  editingArticleId: "",
  currentFitments: []
};

const translations = {
  en: {
    addFitment: "Add fitment",
    addNewOption: "+ Add new",
    addProduct: "Add product",
    addProductTab: "Add product",
    adminPasscode: "Admin passcode",
    adminTitle: "Admin",
    active: "Active",
    basicInfo: "Basic info",
    brand: "Brand",
    brandPlaceholder: "New brand name",
    catalog: "Catalog",
    category: "Category",
    categoryPlaceholder: "New category name",
    checking: "Checking...",
    chooseExisting: "Choose existing",
    chooseFitment: "Choose a vehicle make and model first.",
    configuration: "Configuration",
    currency: "Currency",
    deleteConfirm: "Delete",
    deleteProduct: "Delete",
    duplicate: "Duplicate",
    duplicated: "Duplicated.",
    description: "Description",
    editProduct: "Edit product",
    editProductButton: "Edit",
    enterAdmin: "Enter admin",
    features: "Features",
    featuresPlaceholder: "One feature per line",
    fitmentHelp: "Pick existing makes/models or add new ones, then attach them to this product.",
    freeInstall: "Free install",
    fromEmail: "From email",
    imageUrl: "Image URL",
    imageUrlPlaceholder: "/assets/sample-battery.png",
    inbox: "Inbox",
    installFee: "Install fee",
    logout: "Logout",
    mediaDescription: "Media and description",
    modelPlaceholder: "New product model",
    newMakePlaceholder: "New make",
    newModelPlaceholder: "New model",
    newProduct: "New product",
    noOrders: "No orders yet.",
    noProducts: "No products yet.",
    orderVehicleMissing: "Vehicle not provided",
    orders: "Orders",
    ownerAccess: "Owner access",
    ownerEmail: "Owner email",
    partNumber: "Part number",
    partNumberPlaceholder: "48AGM",
    pricingService: "Pricing and service",
    productManager: "Product manager",
    productModel: "Product model",
    productPrice: "Product price",
    productRequired: "Type, category, brand, product model, price, install fee, and description are required.",
    productSaved: "Product saved.",
    products: "Products",
    productsListTab: "Products",
    ordersTab: "Orders",
    remove: "Remove",
    requestFailed: "Request failed.",
    saveProduct: "Save product",
    saveSettings: "Save settings",
    savingProduct: "Saving product...",
    savingSettings: "Saving settings...",
    settingsSaved: "Settings saved.",
    settingsTab: "Settings",
    showStruckInstall: "Show the regular install fee crossed out on the storefront",
    smtpHost: "SMTP host",
    smtpPassword: "SMTP password",
    smtpPasswordPlaceholder: "Leave blank to keep saved password",
    smtpPort: "SMTP port",
    smtpSecure: "SMTP secure",
    smtpUser: "SMTP user",
    storeName: "Store name",
    storeSettings: "Store settings",
    storefront: "Storefront",
    tagline: "Tagline",
    type: "Type",
    typePlaceholder: "New type name",
    uploadImage: "Upload image",
    useSslTls: "Use SSL/TLS",
    vehicleFitments: "Vehicle fitments",
    visibleInStore: "Visible in store"
  },
  fa: {
    addFitment: "افزودن سازگاری",
    addNewOption: "+ افزودن مورد جدید",
    addProduct: "افزودن محصول",
    addProductTab: "افزودن محصول",
    adminPasscode: "رمز مدیریت",
    adminTitle: "مدیریت",
    active: "فعال",
    basicInfo: "اطلاعات اصلی",
    brand: "برند",
    brandPlaceholder: "نام برند جدید",
    catalog: "کاتالوگ",
    category: "دسته‌بندی",
    categoryPlaceholder: "نام دسته‌بندی جدید",
    checking: "در حال بررسی...",
    chooseExisting: "انتخاب از موارد موجود",
    chooseFitment: "اول برند و مدل خودرو را انتخاب یا اضافه کنید.",
    configuration: "تنظیمات",
    currency: "واحد پول",
    deleteConfirm: "حذف شود",
    deleteProduct: "حذف",
    duplicate: "کپی",
    duplicated: "کپی شد.",
    description: "توضیحات",
    editProduct: "ویرایش محصول",
    editProductButton: "ویرایش",
    enterAdmin: "ورود به مدیریت",
    features: "ویژگی‌ها",
    featuresPlaceholder: "هر ویژگی در یک خط",
    fitmentHelp: "برند و مدل خودرو را از لیست انتخاب کنید یا مورد جدید بسازید، سپس به محصول وصل کنید.",
    freeInstall: "نصب رایگان",
    fromEmail: "ایمیل فرستنده",
    imageUrl: "آدرس تصویر",
    imageUrlPlaceholder: "/assets/sample-battery.png",
    inbox: "سفارش‌ها",
    installFee: "دستمزد نصب",
    logout: "خروج",
    mediaDescription: "تصویر و توضیحات",
    modelPlaceholder: "مدل محصول جدید",
    newMakePlaceholder: "برند خودرو جدید",
    newModelPlaceholder: "مدل خودرو جدید",
    newProduct: "محصول جدید",
    noOrders: "هنوز سفارشی ثبت نشده است.",
    noProducts: "هنوز محصولی ثبت نشده است.",
    orderVehicleMissing: "خودرو وارد نشده",
    orders: "سفارش‌ها",
    ownerAccess: "دسترسی صاحب سایت",
    ownerEmail: "ایمیل صاحب سایت",
    partNumber: "شماره قطعه",
    partNumberPlaceholder: "48AGM",
    pricingService: "قیمت و سرویس",
    productManager: "مدیریت محصول",
    productModel: "مدل محصول",
    productPrice: "قیمت محصول",
    productRequired: "نوع، دسته‌بندی، برند، مدل محصول، قیمت، دستمزد نصب و توضیحات اجباری هستند.",
    productSaved: "محصول ذخیره شد.",
    products: "محصولات",
    productsListTab: "محصولات",
    ordersTab: "سفارش‌ها",
    remove: "حذف",
    requestFailed: "درخواست ناموفق بود.",
    saveProduct: "ذخیره محصول",
    saveSettings: "ذخیره تنظیمات",
    savingProduct: "در حال ذخیره محصول...",
    savingSettings: "در حال ذخیره تنظیمات...",
    settingsSaved: "تنظیمات ذخیره شد.",
    settingsTab: "تنظیمات",
    showStruckInstall: "در سایت، مبلغ عادی نصب خط‌خورده نمایش داده شود",
    smtpHost: "هاست SMTP",
    smtpPassword: "رمز SMTP",
    smtpPasswordPlaceholder: "برای حفظ رمز قبلی خالی بگذارید",
    smtpPort: "پورت SMTP",
    smtpSecure: "امنیت SMTP",
    smtpUser: "کاربر SMTP",
    storeName: "نام فروشگاه",
    storeSettings: "تنظیمات فروشگاه",
    storefront: "نمای سایت",
    tagline: "شعار",
    type: "نوع",
    typePlaceholder: "نام نوع جدید",
    uploadImage: "آپلود تصویر",
    useSslTls: "استفاده از SSL/TLS",
    vehicleFitments: "سازگاری با خودرو",
    visibleInStore: "نمایش در فروشگاه"
  }
};

Object.assign(translations.en, {
  ratingLabel: "Star rating (0-5)",
  featuredLabel: "Pin to homepage",
  featuredHint: "Show first on the storefront",
  sliderSettings: "Homepage slider",
  sliderProduct: "Slider product",
  sliderArticle: "Slider article",
  sliderHelp: "Pick one product and/or one article to feature in the slider at the top of the homepage. Choose \"None\" to hide a slide.",
  sliderNone: "None",
  statusNew: "New",
  statusContacted: "Contacted",
  statusDone: "Done",
  deleteOrderConfirm: "Delete this order?",
  searchProducts: "Search products...",
  passcodePlaceholder: "Leave blank to keep current passcode",
  notificationSettings: "Order notifications",
  notificationChannel: "Notify owner via",
  channelEmailOnly: "Email only",
  channelTelegramOnly: "Telegram only",
  channelBoth: "Email and Telegram",
  telegramBotToken: "Telegram bot token",
  telegramBotTokenPlaceholder: "Leave blank to keep saved token",
  telegramChatId: "Telegram chat IDs",
  telegramHelp: "Create a bot with @BotFather. Each person must send /start to the bot, then find their chat ID via getUpdates (or @userinfobot). Separate multiple chat IDs with commas.",
  articleContent: "Article content",
  articleSaved: "Article saved.",
  articlesTab: "Articles",
  deleteMedia: "Delete image",
  deliveryFee: "Delivery fee",
  imageAltText: "Image alt text",
  imageBank: "Image bank",
  imageSeoName: "Image SEO name",
  keywords: "Keywords",
  mediaLibrary: "Media library",
  mediaTab: "Media",
  metaDescription: "Meta description",
  newArticle: "New article",
  noArticles: "No articles yet.",
  noMedia: "No uploaded images yet.",
  previousImages: "Previous images",
  saveArticle: "Save article",
  savingArticle: "Saving article...",
  seoContent: "SEO content",
  seoTitle: "SEO title",
  showOnSite: "Show on site",
  title: "Title",
  uploadCompressedImage: "Upload compressed image",
  uploadingImage: "Uploading and compressing image...",
  imageUploaded: "Image uploaded and compressed.",
  urlSlug: "URL slug",
  summary: "Summary",
  writeArticle: "Write article"
});

Object.assign(translations.fa, {
  ratingLabel: "امتیاز ستاره (۰ تا ۵)",
  featuredLabel: "سنجاق به صفحه اول",
  featuredHint: "اول از همه در فروشگاه نمایش داده شود",
  sliderSettings: "اسلایدر صفحه اول",
  sliderProduct: "محصول اسلایدر",
  sliderArticle: "مقاله اسلایدر",
  sliderHelp: "یک محصول و/یا یک مقاله برای اسلایدر بالای صفحه اول انتخاب کنید. برای مخفی کردن هر اسلاید «هیچ‌کدام» را انتخاب کنید.",
  sliderNone: "هیچ‌کدام",
  statusNew: "جدید",
  statusContacted: "تماس گرفته شد",
  statusDone: "انجام شد",
  deleteOrderConfirm: "این سفارش حذف شود؟",
  searchProducts: "جستجوی محصولات...",
  passcodePlaceholder: "برای حفظ رمز فعلی خالی بگذارید",
  notificationSettings: "اطلاع‌رسانی سفارش",
  notificationChannel: "روش اطلاع‌رسانی به صاحب سایت",
  channelEmailOnly: "فقط ایمیل",
  channelTelegramOnly: "فقط تلگرام",
  channelBoth: "ایمیل و تلگرام",
  telegramBotToken: "توکن بات تلگرام",
  telegramBotTokenPlaceholder: "برای حفظ توکن قبلی خالی بگذارید",
  telegramChatId: "شناسه‌های چت تلگرام",
  telegramHelp: "با @BotFather یک بات بسازید. هر نفر باید /start را به بات بفرستد و شناسه چتش را از getUpdates (یا @userinfobot) پیدا کند. چند شناسه را با کاما جدا کنید.",
  articleContent: "محتوای مقاله",
  articleSaved: "مقاله ذخیره شد.",
  articlesTab: "مقاله‌ها",
  deleteMedia: "حذف عکس",
  deliveryFee: "هزینه ثابت دلیوری",
  imageAltText: "متن جایگزین عکس",
  imageBank: "بانک عکس",
  imageSeoName: "نام سئوی عکس",
  keywords: "کلمات کلیدی",
  mediaLibrary: "کتابخانه مدیا",
  mediaTab: "مدیا",
  metaDescription: "توضیحات متا",
  newArticle: "مقاله جدید",
  noArticles: "هنوز مقاله‌ای ثبت نشده است.",
  noMedia: "هنوز عکسی آپلود نشده است.",
  previousImages: "عکس‌های قبلی",
  saveArticle: "ذخیره مقاله",
  savingArticle: "در حال ذخیره مقاله...",
  seoContent: "محتوای سئو",
  seoTitle: "عنوان سئو",
  showOnSite: "نمایش در سایت",
  title: "عنوان",
  uploadCompressedImage: "آپلود عکس فشرده",
  uploadingImage: "در حال آپلود و فشرده‌سازی عکس...",
  imageUploaded: "عکس آپلود و فشرده شد.",
  urlSlug: "آدرس URL",
  summary: "خلاصه",
  writeArticle: "نوشتن مقاله"
});

const adminEls = {
  loginCard: document.querySelector("#loginCard"),
  loginForm: document.querySelector("#loginForm"),
  loginStatus: document.querySelector("#loginStatus"),
  adminApp: document.querySelector("#adminApp"),
  logoutButton: document.querySelector("#logoutButton"),
  languageEnglish: document.querySelector("#languageEnglish"),
  languagePersian: document.querySelector("#languagePersian"),
  addProductTab: document.querySelector("#addProductTab"),
  productsListTab: document.querySelector("#productsListTab"),
  articlesTab: document.querySelector("#articlesTab"),
  mediaTab: document.querySelector("#mediaTab"),
  ordersTab: document.querySelector("#ordersTab"),
  settingsTab: document.querySelector("#settingsTab"),
  productForm: document.querySelector("#productForm"),
  productFormTitle: document.querySelector("#productFormTitle"),
  productStatus: document.querySelector("#productStatus"),
  resetProductForm: document.querySelector("#resetProductForm"),
  quickAddProduct: document.querySelector("#quickAddProduct"),
  productsPanel: document.querySelector("#productsPanel"),
  ordersPanel: document.querySelector("#ordersPanel"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsForm: document.querySelector("#settingsForm"),
  settingsStatus: document.querySelector("#settingsStatus"),
  productMediaChoice: document.querySelector("#productMediaChoice"),
  productMediaThumbs: document.querySelector("#productMediaThumbs"),
  articlesPanel: document.querySelector("#articlesPanel"),
  mediaPanel: document.querySelector("#mediaPanel"),
  articleForm: document.querySelector("#articleForm"),
  articleFormTitle: document.querySelector("#articleFormTitle"),
  articleStatus: document.querySelector("#articleStatus"),
  resetArticleForm: document.querySelector("#resetArticleForm"),
  articleMediaChoice: document.querySelector("#articleMediaChoice"),
  articleMediaThumbs: document.querySelector("#articleMediaThumbs"),
  articleAdminList: document.querySelector("#articleAdminList"),
  mediaForm: document.querySelector("#mediaForm"),
  mediaStatus: document.querySelector("#mediaStatus"),
  mediaGrid: document.querySelector("#mediaGrid"),
  productAdminList: document.querySelector("#productAdminList"),
  productSearchInput: document.querySelector("#productSearchInput"),
  orderList: document.querySelector("#orderList"),
  fitmentMakeChoice: document.querySelector("#fitmentMakeChoice"),
  fitmentMakeInput: document.querySelector("#fitmentMakeInput"),
  fitmentModelChoice: document.querySelector("#fitmentModelChoice"),
  fitmentModelInput: document.querySelector("#fitmentModelInput"),
  addFitmentButton: document.querySelector("#addFitmentButton"),
  fitmentChips: document.querySelector("#fitmentChips")
};

const comboFields = {
  type: {
    select: document.querySelector("[data-combo-select='type']"),
    input: document.querySelector("[data-combo-input='type']"),
    options: () => adminState.taxonomy.types || []
  },
  category: {
    select: document.querySelector("[data-combo-select='category']"),
    input: document.querySelector("[data-combo-input='category']"),
    options: () => adminState.taxonomy.categories || []
  },
  brand: {
    select: document.querySelector("[data-combo-select='brand']"),
    input: document.querySelector("[data-combo-input='brand']"),
    options: () => adminState.taxonomy.brands || []
  },
  model: {
    select: document.querySelector("[data-combo-select='model']"),
    input: document.querySelector("[data-combo-input='model']"),
    options: () => {
      const brand = comboFields.brand.input.value.trim();
      const brandModels = adminState.taxonomy.productModelsByBrand?.[brand];
      return brandModels?.length ? brandModels : adminState.taxonomy.productModels || [];
    }
  }
};

let adminMoney = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD"
});

function t(key) {
  return translations[adminState.language][key] || translations.en[key] || key;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return adminMoney.format(Number(value || 0));
}

function optionHtml(value, label, selectedValue) {
  const selected = value === selectedValue ? " selected" : "";
  return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function deriveTaxonomy(products) {
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
    types: uniqueSorted(products.map((product) => product.type)),
    categories: uniqueSorted(products.map((product) => product.category)),
    brands: uniqueSorted(products.map((product) => product.brand)),
    productModels: uniqueSorted(products.map((product) => product.model)),
    productModelsByBrand: Object.fromEntries(
      Object.entries(productModelsByBrand).map(([brand, models]) => [brand, [...models].sort()])
    ),
    vehicles: Object.fromEntries(
      Object.entries(vehicles).map(([make, models]) => [make, [...models].sort()])
    )
  };
}

async function adminApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("x-admin-token", adminState.token);
  headers.set("x-admin-language", adminState.language);

  const response = await fetch(path, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || t("requestFailed"));
  return data;
}

function applyLanguage() {
  document.documentElement.lang = adminState.language;
  document.documentElement.dir = adminState.language === "fa" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  adminEls.languageEnglish.classList.toggle("active", adminState.language === "en");
  adminEls.languagePersian.classList.toggle("active", adminState.language === "fa");

  if (!adminEls.adminApp.hidden) {
    renderAllCombos();
    renderFitmentControls();
    renderFitmentChips();
    renderProductList();
    renderOrders();
    renderArticlesAdmin();
    renderMediaLibrary();
    renderMediaChoices();
  }
}

async function loadAdmin({ resetProductForm = true } = {}) {
  const data = await adminApi("/api/admin/state");
  adminState.settings = data.settings;
  adminState.products = data.products || [];
  adminState.orders = data.orders || [];
  adminState.articles = data.articles || [];
  adminState.media = data.media || [];
  adminState.taxonomy = data.taxonomy || deriveTaxonomy(adminState.products);
  try {
    adminMoney = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: adminState.settings?.currency || "CAD"
    });
  } catch {}
  adminEls.loginCard.hidden = true;
  adminEls.adminApp.hidden = false;
  adminEls.logoutButton.hidden = false;
  fillSettingsForm();
  if (resetProductForm) fillProductForm();
  renderProductList();
  renderOrders();
  renderArticlesAdmin();
  renderMediaLibrary();
  renderMediaChoices();
}

function showTab(name) {
  const tabs = {
    add: adminEls.addProductTab,
    products: adminEls.productsListTab,
    articles: adminEls.articlesTab,
    media: adminEls.mediaTab,
    orders: adminEls.ordersTab,
    settings: adminEls.settingsTab
  };
  const views = {
    add: adminEls.productForm,
    products: adminEls.productsPanel,
    articles: adminEls.articlesPanel,
    media: adminEls.mediaPanel,
    orders: adminEls.ordersPanel,
    settings: adminEls.settingsPanel
  };

  Object.entries(tabs).forEach(([key, tab]) => {
    tab.classList.toggle("active", key === name);
  });
  Object.entries(views).forEach(([key, view]) => {
    view.hidden = key !== name;
  });
}

function renderMediaChoices() {
  const options = [
    optionHtml("", t("previousImages"), ""),
    ...adminState.media.map((media) => optionHtml(media.url, media.seoName || media.filename, ""))
  ].join("");
  if (adminEls.productMediaChoice) adminEls.productMediaChoice.innerHTML = options;
  if (adminEls.articleMediaChoice) adminEls.articleMediaChoice.innerHTML = options;
  renderMediaPicker(adminEls.productMediaThumbs, adminEls.productForm?.elements.image, false);
  renderMediaPicker(adminEls.articleMediaThumbs, adminEls.articleForm?.elements.image, true);
}

function applyMediaSelection(media, targetInput, copyAlt) {
  if (!media || !targetInput) return;
  targetInput.value = media.url;
  if (copyAlt && adminEls.articleForm && !adminEls.articleForm.elements.imageAlt.value) {
    adminEls.articleForm.elements.imageAlt.value = media.altText || media.seoName || "";
  }
  renderMediaChoices();
}

function renderMediaPicker(container, targetInput, copyAlt) {
  if (!container) return;
  if (!adminState.media.length) {
    container.innerHTML = `<div class="empty-state compact">${escapeHtml(t("noMedia"))}</div>`;
    return;
  }

  const selectedUrl = targetInput?.value || "";
  container.innerHTML = adminState.media
    .map((media) => `
      <button class="media-thumb${media.url === selectedUrl ? " selected" : ""}" type="button" data-url="${escapeHtml(media.url)}" title="${escapeHtml(media.seoName || media.filename)}">
        <img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.altText || media.seoName || media.filename)}">
        <span>${escapeHtml(media.seoName || media.filename)}</span>
      </button>
    `)
    .join("");

  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const media = adminState.media.find((item) => item.url === button.dataset.url);
      applyMediaSelection(media, targetInput, copyAlt);
    });
  });
}

function renderCombo(name, value = comboFields[name].input.value) {
  const combo = comboFields[name];
  const options = combo.options();
  const hasExistingValue = options.includes(value);
  const selected = value && !hasExistingValue ? "__new" : value;
  combo.select.innerHTML = [
    optionHtml("", t("chooseExisting"), selected),
    ...options.map((option) => optionHtml(option, option, selected)),
    optionHtml("__new", t("addNewOption"), selected)
  ].join("");

  if (selected === "__new") {
    combo.input.hidden = false;
    combo.input.value = value;
  } else {
    combo.input.hidden = true;
    combo.input.value = selected || "";
  }
}

function renderAllCombos() {
  Object.keys(comboFields).forEach((name) => renderCombo(name));
}

function setComboValue(name, value) {
  comboFields[name].input.value = value || "";
  renderCombo(name, value || "");
}

function comboValue(name) {
  return comboFields[name].input.value.trim();
}

function bindComboEvents() {
  Object.entries(comboFields).forEach(([name, combo]) => {
    combo.select.addEventListener("change", () => {
      if (combo.select.value === "__new") {
        combo.input.hidden = false;
        combo.input.value = "";
        combo.input.focus();
      } else {
        combo.input.hidden = true;
        combo.input.value = combo.select.value;
      }

      if (name === "brand") {
        renderCombo("model", comboFields.model.input.value);
      }
    });

    combo.input.addEventListener("input", () => {
      if (name === "brand") renderCombo("model", comboFields.model.input.value);
    });
  });
}

function featuresText(product) {
  return (product.features || []).join("\n");
}

function fillProductForm(product = null) {
  adminState.editingProductId = product?.id || "";
  adminState.currentFitments = (product?.fitments || []).map((fitment) => ({
    make: fitment.make,
    model: fitment.model
  }));

  adminEls.productFormTitle.textContent = product ? t("editProduct") : t("addProduct");
  const fields = adminEls.productForm.elements;
  fields.id.value = product?.id || "";
  fields.partNumber.value = product?.partNumber || "";
  fields.price.value = product?.price ?? "";
  fields.installFee.value = product?.installFee ?? "";
  fields.image.value = product?.image || "";
  if (fields.seoName) fields.seoName.value = "";
  fields.imageFile.value = "";
  fields.description.value = product?.description || "";
  fields.features.value = product ? featuresText(product) : "";
  fields.active.checked = product ? product.active !== false : true;
  fields.installFree.checked = Boolean(product?.installFree);
  fields.rating.value = product?.rating ?? 0;
  fields.featured.checked = Boolean(product?.featured);

  setComboValue("type", product?.type || "");
  setComboValue("category", product?.category || "");
  setComboValue("brand", product?.brand || "");
  setComboValue("model", product?.model || "");
  renderFitmentControls();
  renderFitmentChips();
  renderMediaChoices();
  syncFitmentTextarea();
  adminEls.productStatus.textContent = "";
}

function syncFitmentTextarea() {
  adminEls.productForm.elements.fitments.value = JSON.stringify(adminState.currentFitments);
}

function productFormData() {
  const fields = adminEls.productForm.elements;
  const requiredText = [
    comboValue("type"),
    comboValue("category"),
    comboValue("brand"),
    comboValue("model"),
    fields.price.value,
    fields.installFee.value,
    fields.description.value
  ];

  if (requiredText.some((value) => !String(value || "").trim())) {
    throw new Error(t("productRequired"));
  }

  const data = new FormData();
  const features = fields.features.value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  [
    "id",
    "partNumber",
    "price",
    "installFee",
    "image",
    "description"
  ].forEach((name) => data.append(name, fields[name].value));

  data.append("type", comboValue("type"));
  data.append("category", comboValue("category"));
  data.append("brand", comboValue("brand"));
  data.append("model", comboValue("model"));
  data.append("features", JSON.stringify(features));
  data.append("fitments", JSON.stringify(adminState.currentFitments));
  data.append("active", String(fields.active.checked));
  data.append("installFree", String(fields.installFree.checked));
  data.append("rating", fields.rating.value || "0");
  data.append("featured", String(fields.featured.checked));
  if (fields.imageFile.files[0]) data.append("imageFile", fields.imageFile.files[0]);
  if (fields.seoName) data.append("seoName", fields.seoName.value);
  return data;
}

function renderFitmentControls() {
  const makeOptions = Object.keys(adminState.taxonomy.vehicles || {}).sort();
  const rawMakeChoice = adminEls.fitmentMakeChoice.value;
  const currentMake = rawMakeChoice === "__new"
    ? adminEls.fitmentMakeInput.value.trim()
    : rawMakeChoice;
  const makeSelected = rawMakeChoice === "__new"
    ? "__new"
    : makeOptions.includes(currentMake)
      ? currentMake
      : currentMake
        ? "__new"
        : "";
  adminEls.fitmentMakeChoice.innerHTML = [
    optionHtml("", t("chooseExisting"), makeSelected),
    ...makeOptions.map((make) => optionHtml(make, make, makeSelected)),
    optionHtml("__new", t("addNewOption"), makeSelected)
  ].join("");
  adminEls.fitmentMakeInput.hidden = makeSelected !== "__new";
  if (makeSelected !== "__new") adminEls.fitmentMakeInput.value = "";

  const modelSourceMake = makeSelected === "__new" ? "" : currentMake;
  const models = modelSourceMake
    ? adminState.taxonomy.vehicles[modelSourceMake] || []
    : uniqueSorted(Object.values(adminState.taxonomy.vehicles || {}).flat());
  const rawModelChoice = adminEls.fitmentModelChoice.value;
  const currentModel = rawModelChoice === "__new"
    ? adminEls.fitmentModelInput.value.trim()
    : rawModelChoice;
  const modelSelected = rawModelChoice === "__new"
    ? "__new"
    : models.includes(currentModel)
      ? currentModel
      : currentModel
        ? "__new"
        : "";
  adminEls.fitmentModelChoice.innerHTML = [
    optionHtml("", t("chooseExisting"), modelSelected),
    ...models.map((model) => optionHtml(model, model, modelSelected)),
    optionHtml("__new", t("addNewOption"), modelSelected)
  ].join("");
  adminEls.fitmentModelInput.hidden = modelSelected !== "__new";
  if (modelSelected !== "__new") adminEls.fitmentModelInput.value = "";
}

function selectedFitmentValue(type) {
  if (type === "make") {
    return adminEls.fitmentMakeChoice.value === "__new"
      ? adminEls.fitmentMakeInput.value.trim()
      : adminEls.fitmentMakeChoice.value.trim();
  }

  return adminEls.fitmentModelChoice.value === "__new"
    ? adminEls.fitmentModelInput.value.trim()
    : adminEls.fitmentModelChoice.value.trim();
}

function addFitment() {
  const make = selectedFitmentValue("make");
  const model = selectedFitmentValue("model");

  if (!make || !model) {
    adminEls.productStatus.textContent = t("chooseFitment");
    return;
  }

  const exists = adminState.currentFitments.some((fitment) => fitment.make === make && fitment.model === model);
  if (!exists) {
    adminState.currentFitments.push({ make, model });
  }

  adminEls.fitmentMakeChoice.value = "";
  adminEls.fitmentMakeInput.value = "";
  adminEls.fitmentMakeInput.hidden = true;
  adminEls.fitmentModelChoice.value = "";
  adminEls.fitmentModelInput.value = "";
  adminEls.fitmentModelInput.hidden = true;
  syncFitmentTextarea();
  renderFitmentControls();
  renderFitmentChips();
  adminEls.productStatus.textContent = "";
}

function renderFitmentChips() {
  if (!adminState.currentFitments.length) {
    adminEls.fitmentChips.innerHTML = "";
    return;
  }

  adminEls.fitmentChips.innerHTML = adminState.currentFitments
    .map((fitment, index) => `
      <button class="fitment-chip" type="button" data-index="${index}" aria-label="${escapeHtml(t("remove"))}">
        <span>${escapeHtml(fitment.make)} ${escapeHtml(fitment.model)}</span>
        <b>x</b>
      </button>
    `)
    .join("");

  adminEls.fitmentChips.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      adminState.currentFitments.splice(Number(button.dataset.index), 1);
      syncFitmentTextarea();
      renderFitmentChips();
    });
  });
}

function renderProductList() {
  if (!adminState.products.length) {
    adminEls.productAdminList.innerHTML = `<div class="empty-state">${escapeHtml(t("noProducts"))}</div>`;
    return;
  }

  const query = adminState.productQuery.toLowerCase().trim();
  const visibleProducts = query
    ? adminState.products.filter((product) =>
      [product.brand, product.model, product.type, product.category, product.partNumber]
        .join(" ")
        .toLowerCase()
        .includes(query))
    : adminState.products;

  if (!visibleProducts.length) {
    adminEls.productAdminList.innerHTML = `<div class="empty-state">${escapeHtml(t("noProducts"))}</div>`;
    return;
  }

  adminEls.productAdminList.innerHTML = visibleProducts
    .map((product) => `
      <article class="admin-item" data-id="${escapeHtml(product.id)}">
        <img src="${escapeHtml(product.image || "/assets/hero-service.png")}" alt="${escapeHtml(product.brand)} ${escapeHtml(product.model)}">
        <div>
          <strong>${escapeHtml(product.brand)} ${escapeHtml(product.model)}</strong>
          <small>${escapeHtml(product.type)} / ${escapeHtml(product.category)} / ${money(product.price)} / ${product.active === false ? "Inactive" : "Active"}${product.rating > 0 ? ` / ★${product.rating}` : ""}${product.featured ? " / 📌" : ""}</small>
        </div>
        <div class="admin-item-actions">
          <button class="button ghost" type="button" data-action="edit">${escapeHtml(t("editProductButton"))}</button>
          <button class="button ghost" type="button" data-action="duplicate">${escapeHtml(t("duplicate"))}</button>
          <button class="button ghost" type="button" data-action="delete">${escapeHtml(t("deleteProduct"))}</button>
        </div>
      </article>
    `)
    .join("");

  adminEls.productAdminList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = button.closest(".admin-item");
      const id = item.dataset.id;
      const product = adminState.products.find((entry) => entry.id === id);

      if (button.dataset.action === "edit") {
        showTab("add");
        fillProductForm(product);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (button.dataset.action === "duplicate") {
        await adminApi(`/api/admin/products/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
        await loadAdmin({ resetProductForm: false });
        showTab("products");
        return;
      }

      if (!confirm(`${t("deleteConfirm")} ${product.brand} ${product.model}?`)) return;
      await adminApi(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadAdmin({ resetProductForm: false });
      showTab("products");
    });
  });
}

function orderStatusLabel(status) {
  const map = { new: t("statusNew"), contacted: t("statusContacted"), done: t("statusDone") };
  return map[status] || status;
}

function renderOrders() {
  if (!adminState.orders.length) {
    adminEls.orderList.innerHTML = `<div class="empty-state">${escapeHtml(t("noOrders"))}</div>`;
    return;
  }

  adminEls.orderList.innerHTML = adminState.orders
    .map((order) => {
      const product = adminState.products.find((item) => item.id === order.productId);
      const productName = product
        ? `${product.brand} ${product.model}`
        : order.customRequest?.title || order.productId || "Custom request";
      const totalText = order.totals.priced ? money(order.totals.totalDue) : "TBD";
      const vehicle = order.vehicle?.make || order.vehicle?.model
        ? `${order.vehicle.make || ""} ${order.vehicle.model || ""}`.trim()
        : t("orderVehicleMissing");
      const statusOptions = ["new", "contacted", "done"]
        .map((status) => optionHtml(status, orderStatusLabel(status), order.status))
        .join("");
      return `
        <article class="admin-item" data-id="${escapeHtml(order.id)}">
          <img src="${escapeHtml(product?.image || "/assets/hero-service.png")}" alt="${escapeHtml(productName)}">
          <div>
            <strong>${escapeHtml(productName)} - ${totalText}</strong>
            <small>${escapeHtml(order.customer.phone)} / ${escapeHtml(order.customer.address)}</small>
            <small>${escapeHtml(vehicle)} / ${new Date(order.createdAt).toLocaleString()}</small>
          </div>
          <div class="admin-item-actions">
            <select data-order-status>${statusOptions}</select>
            <button class="button ghost" type="button" data-action="delete-order">${escapeHtml(t("deleteProduct"))}</button>
          </div>
        </article>
      `;
    })
    .join("");

  adminEls.orderList.querySelectorAll("[data-order-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      const id = select.closest(".admin-item").dataset.id;
      try {
        await adminApi(`/api/admin/orders/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: select.value })
        });
        const order = adminState.orders.find((entry) => entry.id === id);
        if (order) order.status = select.value;
      } catch (error) {
        alert(error.message);
      }
    });
  });

  adminEls.orderList.querySelectorAll("[data-action='delete-order']").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.closest(".admin-item").dataset.id;
      if (!confirm(t("deleteOrderConfirm"))) return;
      try {
        await adminApi(`/api/admin/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
        adminState.orders = adminState.orders.filter((entry) => entry.id !== id);
        renderOrders();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function keywordsText(article) {
  return (article.keywords || []).join("\n");
}

function fillArticleForm(article = null) {
  adminState.editingArticleId = article?.id || "";
  adminEls.articleFormTitle.textContent = article ? "Edit article" : t("writeArticle");
  const fields = adminEls.articleForm.elements;
  fields.id.value = article?.id || "";
  fields.title.value = article?.title || "";
  fields.slug.value = article?.slug || "";
  fields.summary.value = article?.summary || "";
  fields.content.value = article?.content || "";
  fields.image.value = article?.image || "";
  fields.imageAlt.value = article?.imageAlt || "";
  fields.seoName.value = "";
  fields.imageFile.value = "";
  fields.seoTitle.value = article?.seoTitle || "";
  fields.metaDescription.value = article?.metaDescription || "";
  fields.keywords.value = article ? keywordsText(article) : "";
  fields.active.checked = article ? article.active !== false : true;
  fields.featured.checked = Boolean(article?.featured);
  renderMediaChoices();
  adminEls.articleStatus.textContent = "";
}

function articleFormData() {
  const fields = adminEls.articleForm.elements;
  const data = new FormData();
  [
    "id",
    "title",
    "slug",
    "summary",
    "content",
    "image",
    "imageAlt",
    "seoName",
    "seoTitle",
    "metaDescription"
  ].forEach((name) => data.append(name, fields[name].value));
  const keywords = fields.keywords.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  data.append("keywords", JSON.stringify(keywords));
  data.append("active", String(fields.active.checked));
  data.append("featured", String(fields.featured.checked));
  if (fields.imageFile.files[0]) data.append("imageFile", fields.imageFile.files[0]);
  return data;
}

function renderArticlesAdmin() {
  if (!adminEls.articleAdminList) return;
  if (!adminState.articles.length) {
    adminEls.articleAdminList.innerHTML = `<div class="empty-state">${escapeHtml(t("noArticles"))}</div>`;
    return;
  }

  adminEls.articleAdminList.innerHTML = adminState.articles
    .map((article) => `
      <article class="admin-item" data-id="${escapeHtml(article.id)}">
        <img src="${escapeHtml(article.image || "/assets/hero-service.png")}" alt="${escapeHtml(article.imageAlt || article.title)}">
        <div>
          <strong>${escapeHtml(article.title)}</strong>
          <small>${escapeHtml(article.slug)} / ${article.active === false ? "Inactive" : "Active"}</small>
        </div>
        <div class="admin-item-actions">
          <button class="button ghost" type="button" data-action="edit">${escapeHtml(t("editProductButton"))}</button>
          <button class="button ghost" type="button" data-action="duplicate">${escapeHtml(t("duplicate"))}</button>
          <button class="button ghost" type="button" data-action="delete">${escapeHtml(t("deleteProduct"))}</button>
        </div>
      </article>
    `)
    .join("");

  adminEls.articleAdminList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = button.closest(".admin-item");
      const id = item.dataset.id;
      const article = adminState.articles.find((entry) => entry.id === id);
      if (button.dataset.action === "edit") {
        fillArticleForm(article);
        showTab("articles");
        return;
      }
      if (button.dataset.action === "duplicate") {
        await adminApi(`/api/admin/articles/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
        await loadAdmin({ resetProductForm: false });
        showTab("articles");
        return;
      }
      if (!confirm(`Delete ${article.title}?`)) return;
      await adminApi(`/api/admin/articles/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadAdmin({ resetProductForm: false });
      showTab("articles");
    });
  });
}

function renderMediaLibrary() {
  if (!adminEls.mediaGrid) return;
  if (!adminState.media.length) {
    adminEls.mediaGrid.innerHTML = `<div class="empty-state">${escapeHtml(t("noMedia"))}</div>`;
    return;
  }

  adminEls.mediaGrid.innerHTML = adminState.media
    .map((media) => `
      <article class="media-item" data-id="${escapeHtml(media.id)}">
        <img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.altText || media.seoName || media.filename)}">
        <div>
          <strong>${escapeHtml(media.seoName || media.filename)}</strong>
          <small>${escapeHtml(media.url)}</small>
          <small>${media.bytes ? `${Math.round(media.bytes / 1024)} KB` : "Existing asset"}</small>
        </div>
        <button class="button ghost" type="button" data-action="delete-media">${escapeHtml(t("deleteMedia"))}</button>
      </article>
    `)
    .join("");

  adminEls.mediaGrid.querySelectorAll("[data-action='delete-media']").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = button.closest(".media-item");
      const media = adminState.media.find((entry) => entry.id === item.dataset.id);
      if (!media || !confirm(`${t("deleteConfirm")} ${media.seoName || media.filename}?`)) return;
      try {
        await adminApi(`/api/admin/media/${encodeURIComponent(media.id)}`, { method: "DELETE" });
        await loadAdmin({ resetProductForm: false });
        showTab("media");
      } catch (error) {
        adminEls.mediaStatus.textContent = error.message;
      }
    });
  });
}

function fillSettingsForm() {
  const settings = adminState.settings;
  const fields = adminEls.settingsForm.elements;
  fields.storeName.value = settings.storeName || "";
  fields.currency.value = settings.currency || "CAD";
  fields.tagline.value = settings.tagline || "";
  fields.ownerEmail.value = settings.ownerEmail || "";
  fields.fromEmail.value = settings.fromEmail || "";
  fields.phone.value = settings.phone || "";
  fields.publicEmail.value = settings.publicEmail || "";
  fields.serviceLocation.value = settings.serviceLocation || "";
  fields.businessHours.value = settings.businessHours || "";
  fields.footerNote.value = settings.footerNote || "";
  if (fields.deliveryFee) fields.deliveryFee.value = settings.deliveryFee ?? 0;
  fields.adminPasscode.value = "";
  fields.smtpHost.value = settings.smtp?.host || "";
  fields.smtpPort.value = settings.smtp?.port || 587;
  fields.smtpUser.value = settings.smtp?.user || "";
  fields.smtpPass.value = "";
  fields.smtpSecure.checked = Boolean(settings.smtp?.secure);
  fields.notificationChannel.value = settings.notifications?.channel || "email";
  fields.telegramBotToken.value = "";
  fields.telegramChatId.value = settings.notifications?.telegram?.chatId || "";

  const sliderProductId = settings.slider?.productId || "";
  const sliderArticleId = settings.slider?.articleId || "";
  fields.sliderProductId.innerHTML = [
    optionHtml("", t("sliderNone"), sliderProductId),
    ...adminState.products.map((product) => optionHtml(product.id, `${product.brand} ${product.model}`, sliderProductId))
  ].join("");
  fields.sliderArticleId.innerHTML = [
    optionHtml("", t("sliderNone"), sliderArticleId),
    ...adminState.articles.map((article) => optionHtml(article.id, article.title, sliderArticleId))
  ].join("");
}

function bindAdminEvents() {
  adminEls.languageEnglish.addEventListener("click", () => {
    adminState.language = "en";
    localStorage.setItem("roadready-admin-language", adminState.language);
    applyLanguage();
  });

  adminEls.languagePersian.addEventListener("click", () => {
    adminState.language = "fa";
    localStorage.setItem("roadready-admin-language", adminState.language);
    applyLanguage();
  });

  adminEls.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminEls.loginStatus.textContent = t("checking");
    const passcode = new FormData(adminEls.loginForm).get("passcode");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-language": adminState.language },
        body: JSON.stringify({ passcode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("requestFailed"));
      adminState.token = data.token;
      localStorage.setItem("epicvolt-admin-token", adminState.token);
      await loadAdmin();
      adminEls.loginStatus.textContent = "";
      applyLanguage();
    } catch (error) {
      adminEls.loginStatus.textContent = error.message;
    }
  });

  adminEls.logoutButton.addEventListener("click", () => {
    localStorage.removeItem("epicvolt-admin-token");
    adminState.token = "";
    adminEls.adminApp.hidden = true;
    adminEls.loginCard.hidden = false;
    adminEls.logoutButton.hidden = true;
  });

  adminEls.addProductTab.addEventListener("click", () => showTab("add"));
  adminEls.productsListTab.addEventListener("click", () => showTab("products"));
  adminEls.articlesTab.addEventListener("click", () => showTab("articles"));
  adminEls.mediaTab.addEventListener("click", () => showTab("media"));
  adminEls.ordersTab.addEventListener("click", () => showTab("orders"));
  adminEls.settingsTab.addEventListener("click", () => showTab("settings"));
  adminEls.quickAddProduct.addEventListener("click", () => {
    fillProductForm();
    showTab("add");
  });
  adminEls.productSearchInput.addEventListener("input", () => {
    adminState.productQuery = adminEls.productSearchInput.value;
    renderProductList();
  });
  adminEls.resetProductForm.addEventListener("click", () => fillProductForm());
  adminEls.productMediaChoice.addEventListener("change", () => {
    if (adminEls.productMediaChoice.value) {
      const media = adminState.media.find((item) => item.url === adminEls.productMediaChoice.value);
      applyMediaSelection(media, adminEls.productForm.elements.image, false);
    }
  });
  adminEls.articleMediaChoice.addEventListener("change", () => {
    if (adminEls.articleMediaChoice.value) {
      const media = adminState.media.find((item) => item.url === adminEls.articleMediaChoice.value);
      applyMediaSelection(media, adminEls.articleForm.elements.image, true);
    }
  });
  adminEls.productForm.elements.image.addEventListener("input", renderMediaChoices);
  adminEls.articleForm.elements.image.addEventListener("input", renderMediaChoices);
  adminEls.resetArticleForm.addEventListener("click", () => fillArticleForm());
  bindComboEvents();

  adminEls.fitmentMakeChoice.addEventListener("change", renderFitmentControls);
  adminEls.fitmentMakeInput.addEventListener("input", renderFitmentControls);
  adminEls.fitmentModelChoice.addEventListener("change", renderFitmentControls);
  adminEls.addFitmentButton.addEventListener("click", addFitment);

  adminEls.productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminEls.productStatus.textContent = t("savingProduct");
    try {
      const id = adminState.editingProductId;
      const path = id ? `/api/admin/products/${encodeURIComponent(id)}` : "/api/admin/products";
      const method = id ? "PUT" : "POST";
      await adminApi(path, {
        method,
        body: productFormData()
      });
      adminEls.productStatus.textContent = t("productSaved");
      await loadAdmin();
      showTab("products");
      applyLanguage();
    } catch (error) {
      adminEls.productStatus.textContent = error.message;
    }
  });

  adminEls.articleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminEls.articleStatus.textContent = t("savingArticle");
    try {
      const id = adminState.editingArticleId;
      const route = id ? `/api/admin/articles/${encodeURIComponent(id)}` : "/api/admin/articles";
      const method = id ? "PUT" : "POST";
      await adminApi(route, { method, body: articleFormData() });
      adminEls.articleStatus.textContent = t("articleSaved");
      await loadAdmin({ resetProductForm: false });
      fillArticleForm();
      showTab("articles");
    } catch (error) {
      adminEls.articleStatus.textContent = error.message;
    }
  });

  adminEls.mediaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminEls.mediaStatus.textContent = t("uploadingImage");
    try {
      const data = new FormData(adminEls.mediaForm);
      await adminApi("/api/admin/media", { method: "POST", body: data });
      adminEls.mediaForm.reset();
      adminEls.mediaStatus.textContent = t("imageUploaded");
      await loadAdmin({ resetProductForm: false });
      showTab("media");
    } catch (error) {
      adminEls.mediaStatus.textContent = error.message;
    }
  });

  adminEls.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminEls.settingsStatus.textContent = t("savingSettings");
    const fields = adminEls.settingsForm.elements;
    const payload = {
      storeName: fields.storeName.value,
      currency: fields.currency.value,
      tagline: fields.tagline.value,
      ownerEmail: fields.ownerEmail.value,
      fromEmail: fields.fromEmail.value,
      phone: fields.phone.value,
      publicEmail: fields.publicEmail.value,
      serviceLocation: fields.serviceLocation.value,
      businessHours: fields.businessHours.value,
      footerNote: fields.footerNote.value,
      deliveryFee: fields.deliveryFee
        ? Number(fields.deliveryFee.value || 0)
        : Number(adminState.settings.deliveryFee || 0),
      adminPasscode: fields.adminPasscode.value,
      smtp: {
        host: fields.smtpHost.value,
        port: Number(fields.smtpPort.value || 587),
        secure: fields.smtpSecure.checked,
        user: fields.smtpUser.value,
        pass: fields.smtpPass.value
      },
      notifications: {
        channel: fields.notificationChannel.value,
        telegram: {
          botToken: fields.telegramBotToken.value,
          chatId: fields.telegramChatId.value
        }
      },
      slider: {
        productId: fields.sliderProductId.value,
        articleId: fields.sliderArticleId.value
      }
    };

    if (!payload.adminPasscode) delete payload.adminPasscode;

    try {
      await adminApi("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      adminEls.settingsStatus.textContent = t("settingsSaved");
      await loadAdmin({ resetProductForm: false });
      applyLanguage();
    } catch (error) {
      adminEls.settingsStatus.textContent = error.message;
    }
  });
}

bindAdminEvents();
applyLanguage();

if (adminState.token) {
  loadAdmin()
    .then(applyLanguage)
    .catch(() => {
      localStorage.removeItem("epicvolt-admin-token");
      adminState.token = "";
    });
}
