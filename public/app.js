const PAGE_SIZE = 12;
const CUSTOM_MAKE_VALUE = "__custom_make__";
const CUSTOM_FITMENT_VALUE = "__custom__";

const state = {
  settings: null,
  products: [],
  articles: [],
  fitmentGuide: [],
  taxonomy: { types: [], categories: [], vehicles: {} },
  visibleCount: PAGE_SIZE,
  selectedFitment: null,
  filters: {
    category: "",
    type: "",
    make: "",
    customVehicleMake: "",
    fitmentId: "",
    customVehicleModel: "",
    groupTokens: [],
    search: ""
  }
};

let moneyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD"
});

const els = {
  categoryNav: document.querySelector("#categoryNav"),
  searchInput: document.querySelector("#searchInput"),
  searchSuggestions: document.querySelector("#searchSuggestions"),
  typeFilter: document.querySelector("#typeFilter"),
  makeFilter: document.querySelector("#makeFilter"),
  modelFilter: document.querySelector("#modelFilter"),
  finderForm: document.querySelector("#finderForm"),
  finderResult: document.querySelector("#finderResult"),
  activeFilters: document.querySelector("#activeFilters"),
  productGrid: document.querySelector("#productGrid"),
  clearFilters: document.querySelector("#clearFilters"),
  productTemplate: document.querySelector("#productTemplate"),
  orderDialog: document.querySelector("#orderDialog"),
  orderDialogBody: document.querySelector("#orderDialogBody"),
  articleGrid: document.querySelector("#articleGrid"),
  articleTemplate: document.querySelector("#articleTemplate"),
  footerStoreName: document.querySelector("#footerStoreName"),
  footerNote: document.querySelector("#footerNote"),
  footerPhone: document.querySelector("#footerPhone"),
  footerEmail: document.querySelector("#footerEmail"),
  footerLocation: document.querySelector("#footerLocation"),
  footerHours: document.querySelector("#footerHours"),
  heroPhoneLink: document.querySelector("#heroPhoneLink")
};

function money(value) {
  return moneyFormatter.format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function optionHtml(value, label, selectedValue) {
  const selected = value === selectedValue ? " selected" : "";
  return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
}

function fillSelect(select, placeholder, options, selectedValue = "") {
  select.innerHTML = [
    optionHtml("", placeholder, selectedValue),
    ...options.map((option) => optionHtml(option, option, selectedValue))
  ].join("");
}

function productTitle(product) {
  return `${product.brand} ${product.model}`.trim();
}

function phoneHref(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return `tel:+${digits}`;
  return digits.length === 10 ? `tel:+1${digits}` : digits ? `tel:${digits}` : "#";
}

function compactDescription(value, maxLength = 118) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.lastIndexOf(" ", maxLength);
  return `${text.slice(0, cut > 70 ? cut : maxLength).trim()}...`;
}

// Split a group string like "47/H5 or 48/H6" into comparable tokens: ["47","H5","48","H6"].
function groupTokens(value) {
  return String(value || "")
    .toUpperCase()
    .split(/[\s,/]+|(?:\bOR\b)/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function productGroupTokens(product) {
  return groupTokens(product.battery?.groupSize);
}

function fitmentGroupTokens(fitment) {
  if (!fitment) return [];
  return [...new Set([
    ...groupTokens(fitment.recommendedGroup),
    ...groupTokens(fitment.alternativeGroup)
  ])];
}

function productMatchesGroups(product, tokens) {
  if (!tokens.length) return true;
  const pTokens = productGroupTokens(product);
  return pTokens.some((token) => tokens.includes(token));
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchTokens(query) {
  return normalizeSearchText(query)
    .split(" ")
    .filter((token) => token.length > 1);
}

function textMatchesTokens(value, tokens) {
  if (!tokens.length) return false;
  const searchableText = normalizeSearchText(value);
  const words = searchableText.split(" ").filter(Boolean);
  const compactText = searchableText.replace(/\s+/g, "");

  return tokens.every((token) => {
    if (words.includes(token)) return true;
    if (token.length >= 3 && words.some((word) => word.startsWith(token))) return true;
    return token.length >= 3 && compactText.includes(token);
  });
}

function productSearchText(product) {
  return [
    product.type,
    product.category,
    product.brand,
    product.model,
    product.partNumber,
    product.description,
    ...(product.features || []),
    ...(product.fitments || []).map((fitment) => `${fitment.make} ${fitment.model}`)
  ].join(" ");
}

function articleSearchText(article) {
  return [
    article.title,
    article.summary,
    article.content,
    ...(article.keywords || [])
  ].join(" ");
}

function productMatchesSearch(product, query) {
  if (!query) return true;
  const tokens = searchTokens(query);
  return textMatchesTokens(productSearchText(product), tokens);
}

function filteredProducts() {
  if (state.filters.customVehicleMake || state.filters.fitmentId === CUSTOM_FITMENT_VALUE || state.filters.customVehicleModel) return [];
  return state.products
    .filter((product) => !state.filters.category || product.category === state.filters.category)
    .filter((product) => !state.filters.type || product.type === state.filters.type)
    .filter((product) => productMatchesGroups(product, state.filters.groupTokens))
    .filter((product) => productMatchesSearch(product, state.filters.search))
    .sort((a, b) => {
      const featuredSort = (b.featured === true) - (a.featured === true);
      if (featuredSort) return featuredSort;
      const dateSort = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (dateSort) return dateSort;
      return productTitle(a).localeCompare(productTitle(b));
    });
}

function sortedArticles() {
  return state.articles
    .slice()
    .sort((a, b) => {
      const featuredSort = (b.featured === true) - (a.featured === true);
      if (featuredSort) return featuredSort;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
}

function ratingStarsHtml(rating) {
  const value = Math.max(0, Math.min(5, Number(rating || 0)));
  if (!value) return "";
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  return `<span class="rating-stars" title="${value} / 5"><span aria-hidden="true">${stars}</span> <small>${value}/5</small></span>`;
}

function suggestionGroup(title, items) {
  if (!items.length) return "";
  return `
    <div class="suggestion-group">
      <p class="suggestion-heading">${escapeHtml(title)}</p>
      ${items.join("")}
    </div>
  `;
}

function suggestionButton(kind, value, title, meta) {
  return `
    <button class="suggestion-item" type="button" data-kind="${escapeHtml(kind)}" data-value="${escapeHtml(value)}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(meta)}</span>
    </button>
  `;
}

function suggestionLink(href, title, meta) {
  return `
    <a class="suggestion-item" href="${escapeHtml(href)}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(meta)}</span>
    </a>
  `;
}

function hideSearchSuggestions() {
  if (!els.searchSuggestions) return;
  els.searchSuggestions.hidden = true;
  els.searchSuggestions.innerHTML = "";
}

function renderSearchSuggestions() {
  if (!els.searchSuggestions) return;
  const query = els.searchInput.value.trim();
  const tokens = searchTokens(query);
  if (!tokens.length) {
    hideSearchSuggestions();
    return;
  }

  const productItems = state.products
    .filter((product) => textMatchesTokens(productSearchText(product), tokens))
    .slice(0, 5)
    .map((product) => suggestionButton("product", productTitle(product), productTitle(product), `${product.category} / ${product.partNumber || product.type}`));

  const taxonomyItems = [
    ...(state.taxonomy.types || []).map((type) => ({ kind: "type", value: type, label: type, meta: "Product type" })),
    ...(state.taxonomy.categories || []).map((category) => ({ kind: "category", value: category, label: category, meta: "Category" }))
  ]
    .filter((item) => textMatchesTokens(item.label, tokens))
    .slice(0, 5)
    .map((item) => suggestionButton(item.kind, item.value, item.label, item.meta));

  const articleItems = (state.articles || [])
    .filter((article) => textMatchesTokens(articleSearchText(article), tokens))
    .slice(0, 4)
    .map((article) => suggestionLink(`/article.html?slug=${encodeURIComponent(article.slug)}`, article.title, "Article"));

  const html = [
    suggestionGroup("Products", productItems),
    suggestionGroup("Categories", taxonomyItems),
    suggestionGroup("Articles", articleItems)
  ].join("");

  if (!html) {
    els.searchSuggestions.innerHTML = `
      <div class="suggestion-group">
        <p class="suggestion-heading">No exact suggestions</p>
        ${suggestionButton("custom", query, `Request: ${query}`, "Ask EpicVolt for a quick quote")}
      </div>
    `;
  } else {
    els.searchSuggestions.innerHTML = html;
  }

  els.searchSuggestions.hidden = false;
  els.searchSuggestions.querySelectorAll("button[data-kind]").forEach((button) => {
    button.addEventListener("click", () => applySearchSuggestion(button.dataset.kind, button.dataset.value));
  });
}

function applySearchSuggestion(kind, value) {
  if (kind === "category") {
    state.filters.category = value;
    state.filters.type = "";
    state.filters.search = "";
    els.searchInput.value = "";
  } else if (kind === "type") {
    state.filters.type = value;
    state.filters.category = "";
    state.filters.search = "";
    els.searchInput.value = "";
  } else {
    state.filters.search = value;
    els.searchInput.value = value;
  }
  hideSearchSuggestions();
  renderFilterOptions();
  renderProducts();
  document.querySelector("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCategoryNav() {
  const buttons = [
    { label: "All parts", value: "" },
    ...state.taxonomy.categories.map((category) => ({ label: category, value: category }))
  ];

  els.categoryNav.innerHTML = buttons
    .map((item) => `<button type="button" data-category="${escapeHtml(item.value)}">${escapeHtml(item.label)}</button>`)
    .join("");

  els.categoryNav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.category = button.dataset.category;
      renderProducts();
      document.querySelector("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function fitmentMakes() {
  return [...new Set((state.fitmentGuide || []).map((f) => f.make).filter(Boolean))].sort();
}

function renderFilterOptions() {
  fillSelect(els.typeFilter, "All products", state.taxonomy.types, state.filters.type);
  const selectedMake = state.filters.customVehicleMake ? CUSTOM_MAKE_VALUE : state.filters.make;
  els.makeFilter.innerHTML = [
    optionHtml("", "Select make", selectedMake),
    ...fitmentMakes().map((make) => optionHtml(make, make, selectedMake)),
    optionHtml(CUSTOM_MAKE_VALUE, "Other / enter manually", selectedMake)
  ].join("");
  syncCustomMakeInput();
  fillModelOptions();
}

function fillModelOptions() {
  const entries = state.filters.make
    ? (state.fitmentGuide || []).filter((f) => f.make === state.filters.make)
    : [];
  entries.sort((a, b) => `${a.model} ${a.yearRange}`.localeCompare(`${b.model} ${b.yearRange}`));
  const selectedValue = state.filters.customVehicleModel ? CUSTOM_FITMENT_VALUE : state.filters.fitmentId;
  els.modelFilter.innerHTML = [
    optionHtml("", state.filters.make ? "Select model & years" : "Choose make first", selectedValue),
    ...entries.map((f) => optionHtml(f.id, `${f.model} ${f.yearRange}`.trim(), selectedValue)),
    state.filters.make ? optionHtml(CUSTOM_FITMENT_VALUE, "Other / enter manually", selectedValue) : ""
  ].join("");
  els.modelFilter.disabled = !state.filters.make;
  syncCustomModelInput();
}

function applyFitmentSelection(fitmentId) {
  if (fitmentId === CUSTOM_FITMENT_VALUE) {
    state.filters.fitmentId = CUSTOM_FITMENT_VALUE;
    state.selectedFitment = null;
    state.filters.groupTokens = [];
    syncCustomModelInput();
    renderFinderResult();
    return;
  }
  state.filters.fitmentId = fitmentId || "";
  state.filters.customVehicleModel = "";
  const fitment = (state.fitmentGuide || []).find((f) => f.id === fitmentId) || null;
  state.selectedFitment = fitment;
  state.filters.groupTokens = fitment ? fitmentGroupTokens(fitment) : [];
  syncCustomModelInput();
  renderFinderResult();
}

function vehicleMakeValue() {
  return state.filters.customVehicleMake || state.filters.make || "";
}

function customVehicleLabel() {
  return [vehicleMakeValue(), state.filters.customVehicleModel].filter(Boolean).join(" ").trim();
}

function syncCustomMakeInput() {
  const wrap = document.querySelector("#customMakeWrap");
  const input = document.querySelector("#customMakeInput");
  if (!wrap || !input) return;
  const visible = els.makeFilter.value === CUSTOM_MAKE_VALUE;
  wrap.hidden = !visible;
  input.disabled = !visible;
  input.value = state.filters.customVehicleMake || "";
  input.required = visible;
}

function syncCustomModelInput() {
  const wrap = document.querySelector("#customModelWrap");
  const input = document.querySelector("#customModelInput");
  if (!wrap || !input) return;
  const visible = Boolean(state.filters.customVehicleMake || (state.filters.make && els.modelFilter.value === CUSTOM_FITMENT_VALUE));
  wrap.hidden = !visible;
  input.disabled = !visible;
  input.value = state.filters.customVehicleModel || "";
  input.required = visible;
}

function renderFinderResult() {
  if (!els.finderResult) return;
  const f = state.selectedFitment;
  if (!f && (state.filters.customVehicleMake || state.filters.customVehicleModel)) {
    els.finderResult.hidden = false;
    els.finderResult.innerHTML = `
      <strong>${escapeHtml(customVehicleLabel() || "Custom vehicle")}</strong>
      <span>We will confirm the correct battery group and availability by phone.</span>
      <span class="muted">Submit a request and the exact vehicle details will be sent to the owner.</span>
    `;
    return;
  }
  if (!f) {
    els.finderResult.hidden = true;
    els.finderResult.innerHTML = "";
    return;
  }
  const groups = [f.recommendedGroup, f.alternativeGroup].filter(Boolean).join(" or ");
  const agm = f.agmRequired && f.agmRequired !== "unknown" ? ` · AGM required: ${f.agmRequired}` : "";
  els.finderResult.hidden = false;
  els.finderResult.innerHTML = `
    <strong>${escapeHtml(f.make)} ${escapeHtml(f.model)} ${escapeHtml(f.yearRange)}</strong>
    <span>Recommended battery group: <b>${escapeHtml(groups)}</b>${escapeHtml(agm)}</span>
    ${f.notes ? `<span>${escapeHtml(f.notes)}</span>` : ""}
    <span class="muted">Final fitment is confirmed before installation. If it does not fit, you do not pay.</span>
  `;
}

function renderActiveFilters(products) {
  const filters = [];
  if (state.filters.category) filters.push(state.filters.category);
  if (state.filters.type) filters.push(state.filters.type);
  if (state.selectedFitment) {
    filters.push(`${state.selectedFitment.make} ${state.selectedFitment.model} ${state.selectedFitment.yearRange}`.trim());
  } else if (state.filters.customVehicleMake || state.filters.customVehicleModel) {
    filters.push(customVehicleLabel());
  }
  if (state.filters.search) filters.push(`Search: "${state.filters.search}"`);

  const base = `${products.length} option${products.length === 1 ? "" : "s"} found`;
  const filterText = filters.length ? ` for ${filters.join(" / ")}` : "";
  els.activeFilters.textContent = `${base}${filterText}. Final battery fitment is confirmed before installation — if it does not fit, you do not pay.`;
}

function installLine(product) {
  if (product.installFree) {
    return `Install <span class="strike">${money(product.installFee)}</span> <span class="free">Free with order</span>`;
  }
  return `Install from ${money(product.installFee)}`;
}

function renderProducts(options = {}) {
  if (!options.keepPagination) state.visibleCount = PAGE_SIZE;
  const products = filteredProducts();
  renderActiveFilters(products);

  if (!products.length) {
    renderCustomRequestCard();
    return;
  }

  els.productGrid.innerHTML = "";
  const visible = products.slice(0, state.visibleCount);
  visible.forEach((product) => {
    const card = els.productTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("img");
    image.src = product.image || "/assets/hero-service.png";
    image.alt = productTitle(product);
    card.querySelector(".chip").textContent = product.category;
    card.querySelector(".part").textContent = product.partNumber || product.type;
    card.querySelector("h3").textContent = productTitle(product);
    if (product.rating > 0) {
      const ratingEl = document.createElement("div");
      ratingEl.className = "rating-line";
      ratingEl.innerHTML = ratingStarsHtml(product.rating);
      card.querySelector("h3").after(ratingEl);
    }
    if (isBattery(product)) {
      const b = product.battery;
      const badge = document.createElement("div");
      badge.className = "battery-badge";
      badge.textContent = [
        `Group ${b.groupSize}`,
        b.batteryType,
        b.conditionGrade ? `Grade ${b.conditionGrade}` : "",
        b.testedCca ? `${b.testedCca} tested CCA` : ""
      ].filter(Boolean).join(" · ");
      card.querySelector("h3").after(badge);
    }
    card.querySelector(".description").textContent = compactDescription(product.description);
    card.querySelector(".price").textContent = money(product.price);
    card.querySelector(".install-line").innerHTML = installLine(product);

    const featureList = card.querySelector(".feature-list");
    featureList.innerHTML = (product.features || [])
      .slice(0, 3)
      .map((feature) => `<li>${escapeHtml(feature)}</li>`)
      .join("");

    card.querySelector(".order-button").addEventListener("click", () => openOrderDialog(product));
    els.productGrid.append(card);
  });

  if (products.length > visible.length) {
    const moreWrap = document.createElement("div");
    moreWrap.style.gridColumn = "1 / -1";
    moreWrap.style.textAlign = "center";
    const moreButton = document.createElement("button");
    moreButton.className = "button ghost";
    moreButton.type = "button";
    moreButton.textContent = `Show more (${visible.length} of ${products.length})`;
    moreButton.addEventListener("click", () => {
      state.visibleCount += PAGE_SIZE;
      renderProducts({ keepPagination: true });
    });
    moreWrap.append(moreButton);
    els.productGrid.append(moreWrap);
  }
}

function requestedProductTitle() {
  const vehicle = state.selectedFitment
    ? `${state.selectedFitment.make} ${state.selectedFitment.model} ${state.selectedFitment.yearRange}`.trim()
    : customVehicleLabel() || state.filters.make;
  const parts = [
    state.filters.type,
    state.filters.search,
    vehicle
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Requested auto part";
}

function renderCustomRequestCard() {
  const card = els.productTemplate.content.firstElementChild.cloneNode(true);
  const image = card.querySelector("img");
  const title = requestedProductTitle();
  image.src = "/assets/hero-service.png";
  image.alt = title;
  card.querySelector(".chip").textContent = state.filters.type || "Special request";
  card.querySelector(".part").textContent = "Price by phone";
  card.querySelector("h3").textContent = title;
  card.querySelector(".description").textContent = "We do not have an exact live listing for this request yet. Submit it and the team will follow up within a few minutes with price, availability, and the fastest service option.";
  card.querySelector(".price").textContent = "Call-back quote";
  card.querySelector(".install-line").textContent = "Priority emergency follow-up";
  card.querySelector(".feature-list").innerHTML = `
    <li>No online payment</li>
    <li>Fast price confirmation by phone</li>
    <li>Built for urgent Calgary service needs</li>
  `;
  card.querySelector(".order-button").textContent = "Request quote";
  card.querySelector(".order-button").addEventListener("click", () => openCustomRequestDialog());
  els.productGrid.innerHTML = "";
  els.productGrid.append(card);
}

function isPickupMode(form) {
  return new FormData(form).get("fulfillment") === "pickup";
}

function pickupContactHtml() {
  const settings = state.settings || {};
  return `
    <div class="pickup-contact">
      <strong>Pickup details</strong>
      <span>${escapeHtml(settings.serviceLocation || "Pickup address will be confirmed by phone.")}</span>
      <span>${escapeHtml(settings.phone || "Phone will be confirmed by phone.")}</span>
      <span>${escapeHtml(settings.publicEmail || "Email will be confirmed by phone.")}</span>
    </div>
  `;
}

function coreUnitFor(product) {
  const perProduct = Number(product.coreExchangeDiscount || 0);
  if (perProduct > 0) return perProduct;
  return Number(state.settings?.coreBuyback || 0);
}

function totals(product, quantity, installRequested = true, deliveryRequested = true, coreReturn = false) {
  const qty = Math.max(1, Number(quantity || 1));
  const productSubtotal = Number(product.price || 0) * qty;
  const rawInstallSubtotal = Number(product.installFee || 0) * qty;
  const installFee = installRequested && !product.installFree ? rawInstallSubtotal : 0;
  const rawDeliveryFee = Number(state.settings?.deliveryFee || 0);
  const deliveryFee = deliveryRequested ? rawDeliveryFee : 0;
  const coreUnit = coreUnitFor(product);
  const coreDiscount = coreReturn && coreUnit > 0 ? coreUnit : 0;

  return {
    productSubtotal,
    rawInstallSubtotal,
    installFee,
    rawDeliveryFee,
    deliveryFee,
    coreUnit,
    coreDiscount,
    totalDue: productSubtotal + installFee + deliveryFee - coreDiscount
  };
}

function isBattery(product) {
  return Boolean(product.battery && product.battery.groupSize);
}

function batterySpecsHtml(product) {
  const b = product.battery || {};
  if (!b.groupSize) return "";
  const rows = [
    ["Group size", b.groupSize],
    ["Type", b.batteryType],
    ["Rated CCA", b.ratedCca],
    ["Tested CCA", b.testedCca],
    ["Voltage", b.voltage],
    ["Condition", b.conditionGrade ? `Grade ${b.conditionGrade}` : ""],
    ["Warranty", b.warrantyDays ? `${b.warrantyDays} days` : ""],
    ["Date code", b.dateCode],
    ["Terminals", b.terminalLayout]
  ].filter(([, value]) => String(value || "").trim());
  return `
    <div class="battery-specs">
      ${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
    </div>
  `;
}

function galleryHtml(product) {
  const images = [product.image, ...(product.gallery || [])].filter(Boolean);
  if (images.length < 2) return "";
  return `
    <div class="battery-gallery">
      ${images.map((url) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(productTitle(product))} photo" loading="lazy">`).join("")}
    </div>
  `;
}

function modelOptionsFor(make, selectedModel = "") {
  const models = make ? state.taxonomy.vehicles[make] || [] : [];
  return [
    optionHtml("", make ? "Select model" : "Select make first", selectedModel),
    ...models.map((model) => optionHtml(model, model, selectedModel))
  ].join("");
}

function openOrderDialog(product) {
  const initialQuantity = product.type === "Tire" ? 4 : 1;
  const coreUnit = coreUnitFor(product);
  const currentTotals = totals(product, initialQuantity, true, true, false);
  els.orderDialogBody.innerHTML = `
    <div class="order-layout">
      <aside class="order-summary">
        <img src="${escapeHtml(product.image || "/assets/hero-service.png")}" alt="${escapeHtml(productTitle(product))}">
        <span class="summary-label">${escapeHtml(product.type)} / ${escapeHtml(product.category)}</span>
        <h2>${escapeHtml(productTitle(product))}</h2>
        ${batterySpecsHtml(product)}
        <p class="pre-line">${escapeHtml(product.description)}</p>
        ${galleryHtml(product)}
        <div class="summary-list" id="orderTotals">
          ${totalsHtml(product, currentTotals, initialQuantity, true, true)}
        </div>
      </aside>
      <section class="order-form">
        <h2>Request service</h2>
        <p class="notice">No payment is collected online. Your order is sent to the owner, and you pay at your address after the service is completed.</p>
        <p class="notice trust">Final battery fitment is confirmed before installation. If the battery does not fit your vehicle, you do not pay.</p>
        <form id="orderForm">
          <div class="form-grid">
            <label>
              Quantity
              <input id="orderQuantity" name="quantity" type="number" min="1" max="8" value="${initialQuantity}" required>
            </label>
            <label>
              Installation
              <span class="toggle-row">
                <input id="orderInstallRequested" name="installRequested" type="checkbox" checked>
                <span>Include installation</span>
              </span>
            </label>
            <label id="coreReturnWrap"${coreUnit > 0 ? "" : " hidden"}>
              Core return
              <span class="toggle-row">
                <input id="orderCoreReturn" name="coreReturn" type="checkbox">
                <span>I will return my old battery (&minus;${money(coreUnit)})</span>
              </span>
            </label>
            <label>
              Fulfillment
              <span class="choice-group">
                <label><input name="fulfillment" type="radio" value="delivery" checked> Delivery</label>
                <label><input name="fulfillment" type="radio" value="pickup"> I will pick it up</label>
              </span>
            </label>
            <label id="pickupTimeWrap" hidden>
              Pickup time
              <input name="pickupTime" type="text" placeholder="Example: Today after 5 PM">
            </label>
            <label>
              Name
              <input name="name" autocomplete="name" placeholder="Full name">
            </label>
            <label>
              Phone
              <input name="phone" autocomplete="tel" placeholder="(403) 555-0123" required>
            </label>
            <label class="full">
              Service address
              <input name="address" autocomplete="street-address" placeholder="Street address, Calgary AB" required>
            </label>
            <label class="full">
              Email
              <input name="email" type="email" autocomplete="email" placeholder="Optional">
            </label>
            <label class="full">
              Notes
              <textarea name="notes" placeholder="Parking, preferred time, or vehicle details"></textarea>
            </label>
          </div>
          <button class="button dark" type="submit">Submit order</button>
          <p class="status-text" id="orderStatus" aria-live="polite"></p>
        </form>
      </section>
    </div>
  `;

  const orderQuantity = document.querySelector("#orderQuantity");
  const orderInstallRequested = document.querySelector("#orderInstallRequested");
  const orderCoreReturn = document.querySelector("#orderCoreReturn");
  const orderTotals = document.querySelector("#orderTotals");
  const orderForm = document.querySelector("#orderForm");
  const orderStatus = document.querySelector("#orderStatus");
  const pickupTimeWrap = document.querySelector("#pickupTimeWrap");
  const pickupTimeInput = orderForm.elements.pickupTime;
  const addressInput = orderForm.elements.address;

  const refreshTotals = () => {
    const installRequested = orderInstallRequested.checked;
    const coreReturn = Boolean(orderCoreReturn && orderCoreReturn.checked);
    const pickup = isPickupMode(orderForm);
    const deliveryRequested = !pickup;
    const nextTotals = totals(product, orderQuantity.value, installRequested, deliveryRequested, coreReturn);
    orderTotals.innerHTML = totalsHtml(product, nextTotals, orderQuantity.value, installRequested, deliveryRequested, pickup);
    pickupTimeWrap.hidden = !pickup;
    pickupTimeInput.required = pickup;
    addressInput.required = !pickup;
    addressInput.placeholder = pickup ? "Optional if you are picking up" : "Street address, Calgary AB";
  };

  orderQuantity.addEventListener("input", refreshTotals);
  orderInstallRequested.addEventListener("change", refreshTotals);
  if (orderCoreReturn) orderCoreReturn.addEventListener("change", refreshTotals);
  orderForm.querySelectorAll("input[name='fulfillment']").forEach((input) => {
    input.addEventListener("change", refreshTotals);
  });
  pickupTimeInput.addEventListener("input", refreshTotals);
  refreshTotals();

  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    orderStatus.textContent = "Sending order...";

    const formData = new FormData(orderForm);
    const payload = {
      productId: product.id,
      quantity: Number(formData.get("quantity") || 1),
      installRequested: formData.get("installRequested") === "on",
      coreReturn: formData.get("coreReturn") === "on",
      fulfillment: formData.get("fulfillment"),
      deliveryRequested: formData.get("fulfillment") !== "pickup",
      pickupTime: formData.get("pickupTime"),
      vehicleMake: state.selectedFitment?.make || vehicleMakeValue(),
      vehicleModel: state.selectedFitment ? `${state.selectedFitment.model} ${state.selectedFitment.yearRange}`.trim() : state.filters.customVehicleModel || "",
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      email: formData.get("email"),
      notes: formData.get("notes")
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order failed.");
      showOrderSuccess(result);
    } catch (error) {
      orderStatus.textContent = error.message;
    }
  });

  document.body.classList.add("dialog-open");
  els.orderDialog.showModal();
}

function openCustomRequestDialog() {
  const makes = fitmentMakes();
  const selectedMake = state.selectedFitment?.make || vehicleMakeValue();
  const selectedModel = state.selectedFitment ? `${state.selectedFitment.model} ${state.selectedFitment.yearRange}`.trim() : state.filters.customVehicleModel || "";
  const title = requestedProductTitle();
  const makeOptions = makes.includes(selectedMake) || !selectedMake
    ? [optionHtml("", "Select make", selectedMake), ...makes.map((make) => optionHtml(make, make, selectedMake))]
    : [optionHtml("", "Select make", selectedMake), optionHtml(selectedMake, selectedMake, selectedMake), ...makes.map((make) => optionHtml(make, make, selectedMake))];

  els.orderDialogBody.innerHTML = `
    <div class="order-layout">
      <aside class="order-summary">
        <img src="/assets/hero-service.png" alt="${escapeHtml(title)}">
        <span class="summary-label">Special request</span>
        <h2>${escapeHtml(title)}</h2>
        <p>Submit this request without payment. We will check price and availability, then contact you within a few minutes.</p>
        <div class="summary-list">
          <div class="summary-row"><span>Price</span><strong>Confirmed by phone</strong></div>
          <div class="summary-row"><span>Priority</span><strong>Emergency support focused</strong></div>
        </div>
      </aside>
      <section class="order-form">
        <h2>Request a fast quote</h2>
        <p class="notice">No online payment is collected. This request is sent to the owner for quick follow-up, especially for urgent roadside, battery, and tire needs.</p>
        <form id="orderForm">
          <div class="form-grid">
            <label>
              Product type
              <input name="customType" value="${escapeHtml(state.filters.type || "")}" placeholder="Battery, tire, alternator, etc.">
            </label>
            <label>
              Search / part details
              <input name="customSearch" value="${escapeHtml(state.filters.search || "")}" placeholder="Brand, size, part number">
            </label>
            <label>
              Vehicle make
              <select id="orderMake" name="vehicleMake">
                ${makeOptions.join("")}
              </select>
            </label>
            <label>
              Vehicle model &amp; years
              <input id="orderModel" name="vehicleModel" value="${escapeHtml(selectedModel)}" placeholder="Example: Corolla 2015">
            </label>
            <label>
              Fulfillment
              <span class="choice-group">
                <label><input name="fulfillment" type="radio" value="delivery" checked> Delivery if available</label>
                <label><input name="fulfillment" type="radio" value="pickup"> I will pick it up</label>
              </span>
            </label>
            <label id="pickupTimeWrap" hidden>
              Pickup time
              <input name="pickupTime" type="text" placeholder="Example: Tomorrow morning">
            </label>
            <label>
              Name
              <input name="name" autocomplete="name" placeholder="Full name">
            </label>
            <label>
              Phone
              <input name="phone" autocomplete="tel" placeholder="(403) 555-0123" required>
            </label>
            <label class="full">
              Service address
              <input name="address" autocomplete="street-address" placeholder="Street address, Calgary AB" required>
            </label>
            <label class="full">
              Email
              <input name="email" type="email" autocomplete="email" placeholder="Optional">
            </label>
            <label class="full">
              Notes
              <textarea name="notes" placeholder="Tell us what happened, urgency, tire size, battery group, or symptoms"></textarea>
            </label>
          </div>
          <button class="button dark" type="submit">Request call-back quote</button>
          <p class="status-text" id="orderStatus" aria-live="polite"></p>
        </form>
      </section>
    </div>
  `;

  const orderForm = document.querySelector("#orderForm");
  const orderStatus = document.querySelector("#orderStatus");
  const pickupTimeWrap = document.querySelector("#pickupTimeWrap");
  const pickupTimeInput = orderForm.elements.pickupTime;
  const addressInput = orderForm.elements.address;
  const refreshCustomFulfillment = () => {
    const pickup = isPickupMode(orderForm);
    pickupTimeWrap.hidden = !pickup;
    pickupTimeInput.required = pickup;
    addressInput.required = !pickup;
    addressInput.placeholder = pickup ? "Optional if you are picking up" : "Street address, Calgary AB";
  };
  orderForm.querySelectorAll("input[name='fulfillment']").forEach((input) => {
    input.addEventListener("change", refreshCustomFulfillment);
  });
  pickupTimeInput.addEventListener("input", refreshCustomFulfillment);
  refreshCustomFulfillment();

  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    orderStatus.textContent = "Sending request...";
    const formData = new FormData(orderForm);
    const payload = {
      customTitle: title,
      customType: formData.get("customType"),
      customSearch: formData.get("customSearch"),
      customDetails: formData.get("notes"),
      quantity: 1,
      installRequested: true,
      fulfillment: formData.get("fulfillment"),
      deliveryRequested: formData.get("fulfillment") !== "pickup",
      pickupTime: formData.get("pickupTime"),
      vehicleMake: formData.get("vehicleMake"),
      vehicleModel: formData.get("vehicleModel"),
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      email: formData.get("email"),
      notes: formData.get("notes")
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed.");
      showOrderSuccess(result);
    } catch (error) {
      orderStatus.textContent = error.message;
    }
  });

  document.body.classList.add("dialog-open");
  els.orderDialog.showModal();
}

function totalsHtml(product, total, quantity, installRequested, deliveryRequested, pickup = false) {
  let install;
  if (!installRequested) {
    install = total.rawInstallSubtotal > 0
      ? `<span><span class="strike">${money(total.rawInstallSubtotal)}</span> Not requested</span>`
      : "<span>Not requested</span>";
  } else if (product.installFree) {
    install = `<span><span class="strike">${money(total.rawInstallSubtotal)}</span> <span class="free">Free</span></span>`;
  } else if (total.rawInstallSubtotal > 0) {
    install = `<span>${money(total.installFee)}</span>`;
  } else {
    install = "<span>No charge</span>";
  }

  const delivery = deliveryRequested
    ? `<span>${money(total.deliveryFee)}</span>`
    : pickup && total.rawDeliveryFee > 0
      ? `<span><span class="strike">${money(total.rawDeliveryFee)}</span> Pickup</span>`
      : total.rawDeliveryFee > 0
        ? `<span><span class="strike">${money(total.rawDeliveryFee)}</span> Not requested</span>`
      : "<span>Not requested</span>";

  let coreRow = "";
  if (total.coreUnit > 0) {
    const coreValue = total.coreDiscount > 0
      ? `<span class="free">-${money(total.coreDiscount)}</span>`
      : `<span>Available: -${money(total.coreUnit)} with old battery</span>`;
    coreRow = `<div class="summary-row"><span>Core return</span>${coreValue}</div>`;
  }

  return `
    <div class="summary-row"><span>Product (${quantity})</span><strong>${money(total.productSubtotal)}</strong></div>
    <div class="summary-row"><span>Installation</span>${install}</div>
    <div class="summary-row"><span>Delivery</span>${delivery}</div>
    ${coreRow}
    <div class="summary-row total"><span>Due after service</span><strong>${money(total.totalDue)}</strong></div>
  `;
}

function showOrderSuccess(result) {
  const notifications = result.notifications || {};
  const notes = [];
  if (notifications.email) {
    notes.push(
      notifications.email.status === "sent"
        ? "The owner has been emailed."
        : "The order is saved and the email copy is in the server outbox until SMTP is configured."
    );
  }
  if (notifications.telegram) {
    notes.push(
      notifications.telegram.status === "sent"
        ? "The owner has been notified on Telegram."
        : "Telegram notification was not sent (check the bot configuration in Settings)."
    );
  }
  const emailNote = notes.join(" ");

  const totalLine = result.order.totals.priced
    ? `<p>Estimated amount due after service: <b>${money(result.order.totals.totalDue)}</b></p>`
    : "<p>Price will be confirmed by phone within a few minutes.</p>";
  const pickupLine = result.order.fulfillment === "pickup"
    ? `
      <p>Your pickup time request: <b>${escapeHtml(result.order.pickupTime || "Not provided")}</b></p>
      ${pickupContactHtml()}
    `
    : "";

  els.orderDialogBody.innerHTML = `
    <div class="success">
      <strong>Order received</strong>
      <p>No payment was collected online.</p>
      <p class="trust">Final battery fitment is confirmed before installation. If the battery does not fit your vehicle, you do not pay.</p>
      ${totalLine}
      ${pickupLine}
      <p>${escapeHtml(emailNote)}</p>
      <form method="dialog">
        <button class="button dark">Close</button>
      </form>
    </div>
  `;
}

function renderArticles() {
  if (!els.articleGrid) return;
  const articles = sortedArticles().slice(0, 3);
  if (!articles.length) {
    els.articleGrid.innerHTML = "";
    return;
  }

  els.articleGrid.innerHTML = "";
  articles.forEach((article) => {
    const card = els.articleTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("img");
    card.href = `/article.html?slug=${encodeURIComponent(article.slug)}`;
    image.src = article.image || "/assets/hero-service.png";
    image.alt = article.imageAlt || article.title;
    card.querySelector(".summary-label").textContent = "Emergency guide";
    card.querySelector("h3").textContent = article.title;
    card.querySelector("p").textContent = article.summary;
    els.articleGrid.append(card);
  });
}

let sliderIndex = 0;
let sliderTimer = null;

function sliderSlides() {
  const productSlides = [];
  const articleSlides = [];
  const productId = state.settings?.slider?.productId;
  const articleId = state.settings?.slider?.articleId;
  const product = productId ? state.products.find((entry) => entry.id === productId) : null;
  const article = articleId ? state.articles.find((entry) => entry.id === articleId) : null;

  if (product) productSlides.push({ kind: "product", item: product });
  sortedProductsForSlider()
    .filter((entry) => entry.id !== product?.id)
    .slice(0, 2 - productSlides.length)
    .forEach((entry) => productSlides.push({ kind: "product", item: entry }));

  if (article) articleSlides.push({ kind: "article", item: article });
  sortedArticles()
    .filter((entry) => entry.id !== article?.id)
    .slice(0, 2 - articleSlides.length)
    .forEach((entry) => articleSlides.push({ kind: "article", item: entry }));

  return [...productSlides.slice(0, 2), ...articleSlides.slice(0, 2)];
}

function sortedProductsForSlider() {
  return state.products
    .slice()
    .sort((a, b) => {
      const featuredSort = (b.featured === true) - (a.featured === true);
      if (featuredSort) return featuredSort;
      const dateSort = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (dateSort) return dateSort;
      return productTitle(a).localeCompare(productTitle(b));
    });
}

function showSlide(index) {
  const slider = document.querySelector("#featureSlider");
  if (!slider) return;
  const slides = slider.querySelectorAll(".feature-slide");
  const dots = slider.querySelectorAll(".slider-dots button");
  if (!slides.length) return;
  sliderIndex = ((index % slides.length) + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle("active", i === sliderIndex));
  dots.forEach((dot, i) => dot.classList.toggle("active", i === sliderIndex));
}

function startSliderTimer(count) {
  if (sliderTimer) clearInterval(sliderTimer);
  if (count > 1) {
    sliderTimer = setInterval(() => showSlide(sliderIndex + 1), 6000);
  }
}

function bindSliderNavigation(slider, track, slides) {
  const prev = document.querySelector("#sliderPrev");
  const next = document.querySelector("#sliderNext");
  const go = (offset) => {
    showSlide(sliderIndex + offset);
    startSliderTimer(slides.length);
  };

  if (prev) prev.onclick = () => go(-1);
  if (next) next.onclick = () => go(1);

  let startX = 0;
  let startY = 0;
  let swiping = false;

  track.onpointerdown = (event) => {
    startX = event.clientX;
    startY = event.clientY;
    swiping = true;
  };

  track.onpointerup = (event) => {
    if (!swiping) return;
    swiping = false;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      go(deltaX < 0 ? 1 : -1);
    }
  };

  track.onpointercancel = () => {
    swiping = false;
  };

  slider.classList.toggle("single-slide", slides.length < 2);
}

function renderSlider() {
  const slider = document.querySelector("#featureSlider");
  const track = document.querySelector("#sliderTrack");
  const dots = document.querySelector("#sliderDots");
  if (!slider || !track || !dots) return;

  const slides = sliderSlides();
  if (!slides.length) {
    slider.hidden = true;
    return;
  }

  track.innerHTML = slides
    .map((slide) => {
      if (slide.kind === "product") {
        const product = slide.item;
        return `
          <article class="feature-slide" data-kind="product" data-id="${escapeHtml(product.id)}">
            <img src="${escapeHtml(product.image || "/assets/hero-service.png")}" alt="${escapeHtml(productTitle(product))}">
            <div class="feature-slide-body">
              <span class="summary-label">Featured product</span>
              <h3>${escapeHtml(productTitle(product))}</h3>
              ${ratingStarsHtml(product.rating)}
              <p>${escapeHtml(compactDescription(product.description, 180))}</p>
              <div class="feature-slide-actions">
                <strong>${money(product.price)}</strong>
                <button class="button dark" type="button" data-slide-order>Order now</button>
              </div>
            </div>
          </article>
        `;
      }

      const article = slide.item;
      return `
        <article class="feature-slide" data-kind="article">
          <img src="${escapeHtml(article.image || "/assets/hero-service.png")}" alt="${escapeHtml(article.imageAlt || article.title)}">
          <div class="feature-slide-body">
            <span class="summary-label">Featured guide</span>
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(compactDescription(article.summary, 180))}</p>
            <div class="feature-slide-actions">
              <a class="button dark" href="/article.html?slug=${encodeURIComponent(article.slug)}">Read article</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  dots.innerHTML = slides
    .map((_, index) => `<button type="button" aria-label="Slide ${index + 1}"></button>`)
    .join("");

  dots.querySelectorAll("button").forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showSlide(index);
      startSliderTimer(slides.length);
    });
  });

  track.querySelectorAll("[data-slide-order]").forEach((button) => {
    const slide = button.closest("[data-kind='product']");
    const product = state.products.find((entry) => entry.id === slide?.dataset.id);
    if (product) button.addEventListener("click", () => openOrderDialog(product));
  });

  slider.hidden = false;
  bindSliderNavigation(slider, track, slides);
  showSlide(0);
  startSliderTimer(slides.length);
}

function renderFooter() {
  const settings = state.settings || {};
  els.footerStoreName.textContent = settings.storeName || "EpicVolt";
  els.footerNote.textContent = settings.footerNote || settings.tagline || "";
  els.footerPhone.textContent = settings.phone ? `Phone: ${settings.phone}` : "";
  els.footerEmail.textContent = settings.publicEmail ? `Email: ${settings.publicEmail}` : "";
  els.footerLocation.textContent = settings.serviceLocation ? `Location: ${settings.serviceLocation}` : "";
  els.footerHours.textContent = settings.businessHours ? `Hours: ${settings.businessHours}` : "";
  if (els.heroPhoneLink && settings.phone) {
    els.heroPhoneLink.textContent = settings.phone;
    els.heroPhoneLink.href = phoneHref(settings.phone);
  }
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    state.filters.search = els.searchInput.value.trim();
    renderProducts();
    renderSearchSuggestions();
  });

  els.searchInput.addEventListener("focus", () => {
    renderSearchSuggestions();
  });

  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSearchSuggestions();
  });

  els.typeFilter.addEventListener("change", () => {
    state.filters.type = els.typeFilter.value;
    renderProducts();
  });

  els.makeFilter.addEventListener("change", () => {
    const customMake = els.makeFilter.value === CUSTOM_MAKE_VALUE;
    state.filters.make = customMake ? "" : els.makeFilter.value;
    state.filters.customVehicleMake = customMake ? state.filters.customVehicleMake : "";
    state.filters.customVehicleModel = "";
    state.filters.fitmentId = customMake ? CUSTOM_FITMENT_VALUE : "";
    state.selectedFitment = null;
    state.filters.groupTokens = [];
    syncCustomMakeInput();
    fillModelOptions();
    renderFinderResult();
    renderProducts();
  });

  els.modelFilter.addEventListener("change", () => {
    applyFitmentSelection(els.modelFilter.value);
    renderProducts();
  });

  const customModelInput = document.querySelector("#customModelInput");
  const customMakeInput = document.querySelector("#customMakeInput");
  if (customMakeInput) {
    customMakeInput.addEventListener("input", () => {
      state.filters.customVehicleMake = customMakeInput.value.trim();
      state.filters.make = "";
      state.filters.fitmentId = CUSTOM_FITMENT_VALUE;
      state.selectedFitment = null;
      state.filters.groupTokens = [];
      syncCustomModelInput();
      renderFinderResult();
      renderProducts();
    });
  }

  if (customModelInput) {
    customModelInput.addEventListener("input", () => {
      state.filters.customVehicleModel = customModelInput.value.trim();
      state.filters.fitmentId = CUSTOM_FITMENT_VALUE;
      state.selectedFitment = null;
      state.filters.groupTokens = [];
      renderFinderResult();
      renderProducts();
    });
  }

  els.finderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
    renderProducts();
  });

  els.clearFilters.addEventListener("click", () => {
    state.filters = { category: "", type: "", make: "", customVehicleMake: "", fitmentId: "", customVehicleModel: "", groupTokens: [], search: "" };
    state.selectedFitment = null;
    els.searchInput.value = "";
    hideSearchSuggestions();
    renderFinderResult();
    renderFilterOptions();
    renderProducts();
  });

  els.orderDialog.addEventListener("close", () => {
    document.body.classList.remove("dialog-open");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-box")) hideSearchSuggestions();
  });
}

async function init() {
  const response = await fetch("/api/catalog");
  const data = await response.json();
  state.settings = data.settings;
  state.products = data.products;
  state.articles = data.articles || [];
  state.fitmentGuide = data.fitmentGuide || [];
  state.taxonomy = data.taxonomy;

  try {
    moneyFormatter = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: state.settings.currency || "CAD"
    });
  } catch {}

  document.title = state.settings.storeName;
  renderCategoryNav();
  renderFilterOptions();
  bindEvents();
  renderProducts();
  renderArticles();
  renderSlider();
  renderFooter();
}

init().catch((error) => {
  els.productGrid.innerHTML = `
    <div class="empty-state">
      <div>
        <strong>Catalog could not load.</strong>
        <p>${escapeHtml(error.message)}</p>
      </div>
    </div>`;
});

// Scroll-scrubbed cinematic video backdrop: the video timeline is tied to the
// scroll position, so scrolling down plays it forward and scrolling up rewinds.
// Respects prefers-reduced-motion and loads after everything else so it never
// slows down the storefront.
function initVideoBackdrop() {
  const backdrop = document.querySelector("#videoBackdrop");
  if (!backdrop) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const video = document.querySelector("#bgVideoA");
  const overlay = document.querySelector("#videoBackdropOverlay");
  const isMobile = window.matchMedia("(max-width: 767px)").matches;

  // Most phones use the lighter encode, but high-density devices on a decent
  // connection get the sharper source because the backdrop is first-viewport.
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const canUseSharperMobileVideo = isMobile
    && window.devicePixelRatio >= 2
    && !connection?.saveData
    && !["slow-2g", "2g"].includes(connection?.effectiveType || "");
  if (isMobile && !canUseSharperMobileVideo) {
    video.src = "/assets/bg-cars-mobile.mp4";
  }

  video.preload = "auto";
  video.load();

  backdrop.hidden = false;
  document.body.classList.add("has-video-bg");

  const scrub = (progress) => {
    if (video.readyState < 1 || !Number.isFinite(video.duration)) return;
    const target = Math.max(0, Math.min(video.duration - 0.05, progress * video.duration));
    if (Math.abs(video.currentTime - target) > 0.02) {
      video.currentTime = target;
    }
  };

  const update = () => {
    const hero = document.querySelector(".hero");
    const mobileScrubDistance = Math.max(window.innerHeight * 0.72, (hero?.offsetHeight || window.innerHeight) * 0.82);
    const maxScroll = isMobile
      ? mobileScrubDistance
      : document.documentElement.scrollHeight - window.innerHeight;
    const p = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;
    scrub(p);
    // Keep the hero vivid at the top, wash the video into the page as you scroll.
    overlay.style.opacity = String(Math.min(0.94, (isMobile ? 0.14 : 0.2) + p * (isMobile ? 1.8 : 1.5)));
  };

  // rAF watcher instead of scroll events: works identically across desktop,
  // mobile browsers, and embedded webviews, and costs nothing while idle.
  let lastY = -1;
  let lastHeight = -1;
  const watch = () => {
    const y = window.scrollY;
    const height = document.documentElement.scrollHeight;
    if (y !== lastY || height !== lastHeight) {
      lastY = y;
      lastHeight = height;
      update();
    }
    requestAnimationFrame(watch);
  };
  video.addEventListener("loadedmetadata", () => { lastY = -1; });
  update();
  requestAnimationFrame(watch);
}

if (document.readyState === "complete") {
  initVideoBackdrop();
} else {
  window.addEventListener("load", initVideoBackdrop);
}
