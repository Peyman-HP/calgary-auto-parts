const PAGE_SIZE = 12;

const state = {
  settings: null,
  products: [],
  articles: [],
  taxonomy: { types: [], categories: [], vehicles: {} },
  visibleCount: PAGE_SIZE,
  filters: {
    category: "",
    type: "",
    make: "",
    model: "",
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
  footerHours: document.querySelector("#footerHours")
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

function hasFitment(product, make, model) {
  if (!make) return true;
  return (product.fitments || []).some((fitment) => {
    const makeMatch = fitment.make === make;
    const modelMatch = !model || fitment.model === model;
    return makeMatch && modelMatch;
  });
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
  return state.products
    .filter((product) => !state.filters.category || product.category === state.filters.category)
    .filter((product) => !state.filters.type || product.type === state.filters.type)
    .filter((product) => hasFitment(product, state.filters.make, state.filters.model))
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

function renderFilterOptions() {
  fillSelect(els.typeFilter, "All products", state.taxonomy.types, state.filters.type);
  fillSelect(els.makeFilter, "Any make", Object.keys(state.taxonomy.vehicles), state.filters.make);
  fillModelOptions();
}

function fillModelOptions() {
  const models = state.filters.make ? state.taxonomy.vehicles[state.filters.make] || [] : [];
  fillSelect(els.modelFilter, state.filters.make ? "Any model" : "Choose make first", models, state.filters.model);
  els.modelFilter.disabled = !state.filters.make;
}

function renderActiveFilters(products) {
  const filters = [];
  if (state.filters.category) filters.push(state.filters.category);
  if (state.filters.type) filters.push(state.filters.type);
  if (state.filters.make) filters.push(state.filters.make);
  if (state.filters.model) filters.push(state.filters.model);
  if (state.filters.search) filters.push(`Search: "${state.filters.search}"`);

  const base = `${products.length} option${products.length === 1 ? "" : "s"} found`;
  const filterText = filters.length ? ` for ${filters.join(" / ")}` : "";
  els.activeFilters.textContent = `${base}${filterText}. Installation and delivery can be added or removed before submitting your order.`;
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
    card.querySelector(".description").textContent = product.description;
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
  const parts = [
    state.filters.type,
    state.filters.search,
    state.filters.make,
    state.filters.model
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

function totals(product, quantity, installRequested = true, deliveryRequested = true) {
  const qty = Math.max(1, Number(quantity || 1));
  const productSubtotal = Number(product.price || 0) * qty;
  const rawInstallSubtotal = Number(product.installFee || 0) * qty;
  const installFee = installRequested && !product.installFree ? rawInstallSubtotal : 0;
  const rawDeliveryFee = Number(state.settings?.deliveryFee || 0);
  const deliveryFee = deliveryRequested ? rawDeliveryFee : 0;

  return {
    productSubtotal,
    rawInstallSubtotal,
    installFee,
    rawDeliveryFee,
    deliveryFee,
    totalDue: productSubtotal + installFee + deliveryFee
  };
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
  const currentTotals = totals(product, initialQuantity, true, true);
  els.orderDialogBody.innerHTML = `
    <div class="order-layout">
      <aside class="order-summary">
        <img src="${escapeHtml(product.image || "/assets/hero-service.png")}" alt="${escapeHtml(productTitle(product))}">
        <span class="summary-label">${escapeHtml(product.type)} / ${escapeHtml(product.category)}</span>
        <h2>${escapeHtml(productTitle(product))}</h2>
        <p>${escapeHtml(product.description)}</p>
        <div class="summary-list" id="orderTotals">
          ${totalsHtml(product, currentTotals, initialQuantity, true, true)}
        </div>
      </aside>
      <section class="order-form">
        <h2>Request service</h2>
        <p class="notice">No payment is collected online. Your order is sent to the owner, and you pay at your address after the service is completed.</p>
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
  const orderTotals = document.querySelector("#orderTotals");
  const orderForm = document.querySelector("#orderForm");
  const orderStatus = document.querySelector("#orderStatus");
  const pickupTimeWrap = document.querySelector("#pickupTimeWrap");
  const pickupTimeInput = orderForm.elements.pickupTime;
  const addressInput = orderForm.elements.address;

  const refreshTotals = () => {
    const installRequested = orderInstallRequested.checked;
    const pickup = isPickupMode(orderForm);
    const deliveryRequested = !pickup;
    const nextTotals = totals(product, orderQuantity.value, installRequested, deliveryRequested);
    orderTotals.innerHTML = totalsHtml(product, nextTotals, orderQuantity.value, installRequested, deliveryRequested, pickup);
    pickupTimeWrap.hidden = !pickup;
    pickupTimeInput.required = pickup;
    addressInput.required = !pickup;
    addressInput.placeholder = pickup ? "Optional if you are picking up" : "Street address, Calgary AB";
  };

  orderQuantity.addEventListener("input", refreshTotals);
  orderInstallRequested.addEventListener("change", refreshTotals);
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
      fulfillment: formData.get("fulfillment"),
      deliveryRequested: formData.get("fulfillment") !== "pickup",
      pickupTime: formData.get("pickupTime"),
      vehicleMake: state.filters.make,
      vehicleModel: state.filters.model,
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
  const makes = Object.keys(state.taxonomy.vehicles);
  const selectedMake = state.filters.make || "";
  const selectedModel = state.filters.model || "";
  const title = requestedProductTitle();

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
                ${[optionHtml("", "Select make", selectedMake), ...makes.map((make) => optionHtml(make, make, selectedMake))].join("")}
              </select>
            </label>
            <label>
              Vehicle model
              <select id="orderModel" name="vehicleModel">
                ${modelOptionsFor(selectedMake, selectedModel)}
              </select>
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

  const orderMake = document.querySelector("#orderMake");
  const orderModel = document.querySelector("#orderModel");
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
  orderMake.addEventListener("change", () => {
    orderModel.innerHTML = modelOptionsFor(orderMake.value, "");
  });
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

  return `
    <div class="summary-row"><span>Product (${quantity})</span><strong>${money(total.productSubtotal)}</strong></div>
    <div class="summary-row"><span>Installation</span>${install}</div>
    <div class="summary-row"><span>Delivery</span>${delivery}</div>
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
  const slides = [];
  const productId = state.settings?.slider?.productId;
  const articleId = state.settings?.slider?.articleId;
  const product = productId ? state.products.find((entry) => entry.id === productId) : null;
  const article = articleId ? state.articles.find((entry) => entry.id === articleId) : null;

  if (product) slides.push({ kind: "product", item: product });
  if (article) slides.push({ kind: "article", item: article });
  return slides;
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
              <p>${escapeHtml(product.description)}</p>
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
            <p>${escapeHtml(article.summary)}</p>
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

  const orderButton = track.querySelector("[data-slide-order]");
  if (orderButton) {
    const product = state.products.find((entry) => entry.id === track.querySelector("[data-kind='product']").dataset.id);
    orderButton.addEventListener("click", () => openOrderDialog(product));
  }

  slider.hidden = false;
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
    state.filters.make = els.makeFilter.value;
    state.filters.model = "";
    fillModelOptions();
    renderProducts();
  });

  els.modelFilter.addEventListener("change", () => {
    state.filters.model = els.modelFilter.value;
    renderProducts();
  });

  els.finderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
    renderProducts();
  });

  els.clearFilters.addEventListener("click", () => {
    state.filters = { category: "", type: "", make: "", model: "", search: "" };
    els.searchInput.value = "";
    hideSearchSuggestions();
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
