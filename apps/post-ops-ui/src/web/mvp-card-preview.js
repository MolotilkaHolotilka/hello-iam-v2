function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function asText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function assetUrl(path) {
  if (!path || typeof path !== "string") return "";
  return `/assets/${path.replace(/^\/+/, "")}`;
}

function detectCardVariant(card, index, total) {
  if (card.brandLeft || card.brandRight) return "brand";
  if (card.titleAccent) return "hello";
  if (card.quote) return "quote";
  if (card.subtitle && (card.backgroundImage || card.image)) return "media";
  if (card.text) return "story";
  return "generic";
}

function renderHello(card) {
  const bg = asText(card.background, "#d61e23");
  const title = asText(card.title, "HELLO,\nI AM");
  const accent = asText(card.titleAccent, "");
  const label = asText(card.label, "");
  const titleColor = asText(card.titleColor, "#ffffff");
  const accentColor = asText(card.accentColor, "#ffce1f");
  const image = assetUrl(card.image);

  return `
    <div class="mvp-pv mvp-pv--hello" style="background:${escapeHtml(bg)}">
      ${image ? `<img class="mvp-pv-hello-photo" src="${escapeHtml(image)}" alt="" />` : ""}
      <div class="mvp-pv-hello-title" style="color:${escapeHtml(titleColor)}">${escapeHtml(title)}</div>
      <div class="mvp-pv-hello-accent" style="color:${escapeHtml(accentColor)}">${escapeHtml(accent)}</div>
      ${label ? `<div class="mvp-pv-label">${escapeHtml(label)}</div>` : ""}
    </div>
  `;
}

function renderQuote(card) {
  const bg = asText(card.background, "#d9dde0");
  const title = asText(card.title, "");
  const quote = asText(card.quote, "");
  const label = asText(card.label, "");
  const quoteColor = asText(card.quoteColor, "#d61e23");
  const image = assetUrl(card.image);

  return `
    <div class="mvp-pv mvp-pv--quote" style="background:${escapeHtml(bg)}">
      ${title ? `<div class="mvp-pv-quote-title">${escapeHtml(title)}</div>` : ""}
      ${image ? `<div class="mvp-pv-quote-photo"><img src="${escapeHtml(image)}" alt="" /></div>` : ""}
      ${quote ? `<div class="mvp-pv-quote-text" style="color:${escapeHtml(quoteColor)}">${escapeHtml(quote)}</div>` : ""}
      ${label ? `<div class="mvp-pv-label">${escapeHtml(label)}</div>` : ""}
    </div>
  `;
}

function renderBrand(card) {
  const bg = asText(card.background, "#d9dde0");
  const brandLeft = asText(card.brandLeft, "helloiam");
  const brandRight = asText(card.brandRight, "am");
  const brandColor = asText(card.brandColor, "#420000");
  const image = assetUrl(card.image);

  return `
    <div class="mvp-pv mvp-pv--brand" style="background:${escapeHtml(bg)}">
      <div class="mvp-pv-brand-row" style="color:${escapeHtml(brandColor)}">
        <span>${escapeHtml(brandLeft)}</span>
        ${image ? `<img src="${escapeHtml(image)}" alt="" />` : ""}
        <span>${escapeHtml(brandRight)}</span>
      </div>
    </div>
  `;
}

function renderMedia(card) {
  const bgImage = assetUrl(card.backgroundImage);
  const onDark = Boolean(bgImage);
  const bg = asText(card.background, onDark ? "#000000" : "#d9dde0");
  const title = asText(card.title, "");
  const subtitle = asText(card.subtitle, "");
  const image = assetUrl(card.image);
  const titleStyle = onDark ? "" : ' style="color:#d61e23"';
  const subtitleStyle = onDark ? "" : ' style="color:#1e1e1e"';

  return `
    <div class="mvp-pv mvp-pv--media${onDark ? "" : " mvp-pv--media-light"}" style="background:${escapeHtml(bg)}">
      ${bgImage ? `<img class="mvp-pv-media-bg" src="${escapeHtml(bgImage)}" alt="" />` : ""}
      ${onDark ? '<div class="mvp-pv-media-overlay"></div>' : ""}
      ${title ? `<div class="mvp-pv-media-title"${titleStyle}>${escapeHtml(title)}</div>` : ""}
      ${subtitle ? `<div class="mvp-pv-media-subtitle"${subtitleStyle}>${escapeHtml(subtitle)}</div>` : ""}
      ${image ? `<div class="mvp-pv-media-thumb"><img src="${escapeHtml(image)}" alt="" /></div>` : ""}
    </div>
  `;
}

function renderStory(card) {
  const bg = asText(card.background, "#d9dde0");
  const title = asText(card.title, "");
  const text = asText(card.text, "");
  const image = assetUrl(card.image);

  return `
    <div class="mvp-pv mvp-pv--story" style="background:${escapeHtml(bg)}">
      ${title ? `<div class="mvp-pv-story-title">${escapeHtml(title)}</div>` : ""}
      ${text ? `<div class="mvp-pv-story-text">${escapeHtml(text)}</div>` : ""}
      ${image ? `<div class="mvp-pv-story-thumb"><img src="${escapeHtml(image)}" alt="" /></div>` : ""}
    </div>
  `;
}

function renderGeneric(card) {
  const bg = asText(card.background, "#d9dde0");
  const rows = Object.entries(card || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(
      ([key, value]) =>
        `<div class="mvp-pv-generic-row"><span>${escapeHtml(key)}</span><p>${escapeHtml(value)}</p></div>`
    )
    .join("");

  return `
    <div class="mvp-pv mvp-pv--generic" style="background:${escapeHtml(bg)}">
      ${rows || '<p class="mvp-pv-empty">Empty card</p>'}
    </div>
  `;
}

export function renderCardPreviewInner(card, index, total) {
  const variant = detectCardVariant(card, index, total);
  switch (variant) {
    case "hello":
      return renderHello(card);
    case "quote":
      return renderQuote(card);
    case "brand":
      return renderBrand(card);
    case "media":
      return renderMedia(card);
    case "story":
      return renderStory(card);
    default:
      return renderGeneric(card);
  }
}

export function renderCardPreviewSlide(card, index, total) {
  return `
    <div class="mvp-carousel-slide" data-carousel-slide="${index}">
      <div class="mvp-pv-frame">
        ${renderCardPreviewInner(card, index, total)}
      </div>
    </div>
  `;
}
