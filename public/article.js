const articlePage = document.querySelector("#articlePage");
const articleStoreName = document.querySelector("#articleStoreName");
const footerStoreName = document.querySelector("#footerStoreName");
const footerNote = document.querySelector("#footerNote");
const footerPhone = document.querySelector("#footerPhone");
const footerEmail = document.querySelector("#footerEmail");
const footerLocation = document.querySelector("#footerLocation");
const footerHours = document.querySelector("#footerHours");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderFooter(settings = {}) {
  const storeName = settings.storeName || "EpicVolt";
  articleStoreName.textContent = storeName;
  footerStoreName.textContent = storeName;
  footerNote.textContent = settings.footerNote || settings.tagline || "";
  footerPhone.textContent = settings.phone ? `Phone: ${settings.phone}` : "";
  footerEmail.textContent = settings.publicEmail ? `Email: ${settings.publicEmail}` : "";
  footerLocation.textContent = settings.serviceLocation ? `Location: ${settings.serviceLocation}` : "";
  footerHours.textContent = settings.businessHours ? `Hours: ${settings.businessHours}` : "";
}

function paragraphs(content) {
  return String(content || "")
    .split(/\n{2,}|\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join("");
}

async function initArticle() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug) throw new Error("Article address is missing.");

  const response = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Article could not load.");

  const { article, settings } = data;
  renderFooter(settings);
  document.title = article.seoTitle || article.title;
  const metaDescription = document.querySelector("meta[name='description']");
  if (metaDescription) metaDescription.content = article.metaDescription || article.summary || "";

  articlePage.innerHTML = `
    <article class="article-detail">
      <div class="article-detail-copy">
        <p class="eyebrow">Urgent auto help</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-summary">${escapeHtml(article.summary || "")}</p>
      </div>
      <img class="article-detail-image" src="${escapeHtml(article.image || "/assets/hero-service.png")}" alt="${escapeHtml(article.imageAlt || article.title)}">
      <div class="article-content">
        ${paragraphs(article.content)}
        <a class="button dark" href="/#shop">Request fast service</a>
      </div>
    </article>
  `;
}

initArticle().catch((error) => {
  articlePage.innerHTML = `
    <div class="empty-state">
      <div>
        <strong>Article could not load.</strong>
        <p>${escapeHtml(error.message)}</p>
      </div>
    </div>
  `;
});
