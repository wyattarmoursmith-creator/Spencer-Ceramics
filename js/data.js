/* ============================================================
   Spencer Ceramics - content loader
   PRODUCTS load live from Shopify (Storefront API). Journal, site
   photos, contact settings and page copy still come from the CMS
   JSON files. Exposes window.CATALOG / JOURNAL / SITE / SETTINGS /
   PAGES and fires "data:ready". Pages render via window.onData(fn).
   ============================================================ */

/* ---- Shopify Storefront API ----------------------------------------
   This is the PUBLIC, read-only Storefront access token. It is DESIGNED
   to live in client-side code and can only READ the shop - never put an
   Admin API key or password here. Products, prices, photos and stock are
   managed in Shopify; checkout completes on Shopify's secure page. */
window.SHOPIFY = {
  domain:   "spencer-ceramics-2.myshopify.com",
  token:    "d1c2f3c092fff343f37ed2e12b6f2e73",
  version:  "2025-10",
  currency: "NZD",        // updated to the shopper's currency once the catalogue loads
  country:  "",           // market the prices were fetched for (drives checkout too)
  currencies: []          // [{ code, country }] offered by the store's markets
};

/* ---- currency ----------------------------------------------------
   Shoppers pick a currency; prices are requested from Shopify in that
   market and checkout opens in it. The list comes from the markets set
   up in Shopify, so enabling a currency there is all it takes for it
   to appear on the site. Order of preference: the currency the shopper
   chose, else the currency of the country they are visiting from (Netlify
   geolocation via /geo, else the browser locale), else AUD, else the
   store currency. Checkout is always charged in the shipping country's
   currency, so matching the visitor's location keeps the two the same. */
window.SC_CURRENCY_KEY = "sc_currency";
window.SC_DEFAULT_CURRENCY = "AUD";
function scPreferredCurrency() { try { return localStorage.getItem(window.SC_CURRENCY_KEY) || ""; } catch (e) { return ""; } }
window.SC_GEO_KEY = "sc_geo";
/* two-letter country the visitor is in; cached for a week, never blocks for long */
function scGeoCountry() {
  try {
    var c = JSON.parse(localStorage.getItem(window.SC_GEO_KEY) || "null");
    if (c && c.code && (Date.now() - c.at) < 7 * 864e5) return Promise.resolve(c.code);
  } catch (e) {}
  function fromLocale() {
    var m = String((navigator.languages && navigator.languages[0]) || navigator.language || "").match(/[-_]([A-Za-z]{2})\b/);
    return m ? m[1].toUpperCase() : "";
  }
  function remember(code) { try { localStorage.setItem(window.SC_GEO_KEY, JSON.stringify({ code: code, at: Date.now() })); } catch (e) {} return code; }
  var ctl = ("AbortController" in window) ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 1500);
  return fetch("/geo", { signal: ctl ? ctl.signal : undefined })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (j) { clearTimeout(timer); var c = j && j.country; return c ? remember(c) : fromLocale(); })   // only a real answer is cached
    .catch(function () { clearTimeout(timer); return fromLocale(); });
}
function scGql(query) {
  var s = window.SHOPIFY;
  return fetch("https://" + s.domain + "/api/" + s.version + "/graphql.json", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": s.token },
    body: JSON.stringify({ query: query })
  }).then(function (r) { return r.json(); });
}
/* one entry per currency; the representative country is the one that
   uses it at home (AU for AUD, NZ for NZD), else the first market that offers it */
function scResolveMarket() {
  var s = window.SHOPIFY;
  var HOME = { AUD: "AU", NZD: "NZ", USD: "US", GBP: "GB", EUR: "DE", CAD: "CA", JPY: "JP", SGD: "SG" };
  return Promise.all([
    scGql("{ localization { country { isoCode currency { isoCode } } availableCountries { isoCode currency { isoCode } } } }"),
    scGeoCountry()
  ])
  .then(function (res) {
    var j = res[0], geo = (res[1] || "").toUpperCase();
    var loc = j && j.data && j.data.localization;
    if (!loc) return;
    var seen = {}, list = [], byCountry = {};
    (loc.availableCountries || []).forEach(function (c) {
      var code = c.currency && c.currency.isoCode; if (!code) return;
      byCountry[c.isoCode] = code;
      if (!seen[code]) { seen[code] = { code: code, country: c.isoCode }; list.push(seen[code]); }
      if (HOME[code] === c.isoCode) seen[code].country = c.isoCode;
    });
    list.sort(function (a, b) { return a.code < b.code ? -1 : 1; });
    var chosen = scPreferredCurrency();
    var pick = null;
    if (chosen && seen[chosen]) pick = seen[chosen];                                   // the shopper picked one
    else if (!chosen && geo && byCountry[geo]) pick = { code: byCountry[geo], country: geo };   // where they are
    else pick = seen[window.SC_DEFAULT_CURRENCY] || (loc.country && seen[loc.country.currency.isoCode]) || list[0];
    s.currencies = list;
    s.geo = geo;
    if (pick) { s.currency = pick.code; s.country = pick.country; }
  })
  .catch(function () { /* fall through to the store's own currency */ });
}

window.CATALOG  = [];
window.JOURNAL  = [];
window.SITE     = { images: {} };
window.SETTINGS = {};
window.PAGES    = {};
window.byId     = function (id) { return window.CATALOG.find(function (p) { return p.id === id; }); };
window.postById = function (id) { return window.JOURNAL.find(function (p) { return p.id === id; }); };

/* numeric tail of a Shopify GID - gid://shopify/ProductVariant/123 -> "123" */
function scGidNum(gid) { var m = String(gid || "").match(/(\d+)\s*$/); return m ? m[1] : ""; }

/* Shopify descriptions arrive as HTML pasted from wherever Craig wrote them
   (Canva, Docs...) with junk classes. Read only the structure: paragraphs,
   list items and headings. A paragraph that is entirely bold, or a short
   ALL-CAPS line ("FINISH", "CARE", "*LIQUID QUARTZ"), is a section label;
   a short trailing line with measurements ("h.9 d.7.5 / 12cm incl. handle")
   is the dimensions. Em dashes are turned into commas per the site rule. */
function scTidy(t) { return String(t || "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim(); }
function scTitleCase(t) {
  return t.replace(/^\*+\s*/, "").toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
}
function scParseDescription(html, plain) {
  var blocks = [];
  if (html && typeof DOMParser !== "undefined") {
    var doc = new DOMParser().parseFromString(html, "text/html");
    doc.body.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6").forEach(function (el) {
      if (el.querySelector("p, li")) return;                      // container, its children are handled
      var text = scTidy(el.textContent); if (!text) return;
      var bold = el.querySelector("strong, b");
      var boldOnly = !!bold && scTidy(bold.textContent) === text;
      var caps = text.length < 32 && /^[*\s]*[A-Z][A-Z0-9\s&/*]+$/.test(text) && /[A-Z]{3}/.test(text);
      var label = /^H[1-6]$/.test(el.tagName) || boldOnly || caps;
      blocks.push({ type: label ? "label" : "p", text: text });
    });
  }
  if (!blocks.length) scTidy(plain).split(/\n{2,}/).forEach(function (t) { t = scTidy(t); if (t) blocks.push({ type: "p", text: t }); });
  var dims = "";
  var last = blocks[blocks.length - 1];
  if (last && last.type === "p" && last.text.length < 60 && /(^|\s)(h|d|w|dia)\.?\s?\d|\d\s?cm\b/i.test(last.text)) { dims = last.text; blocks.pop(); }
  var intro = [], sections = [], cur = null;
  blocks.forEach(function (b) {
    if (b.type === "label") { cur = { label: scTitleCase(b.text), lines: [] }; sections.push(cur); }
    else if (cur) cur.lines.push(b.text);
    else intro.push(b.text);
  });
  return { intro: intro, sections: sections.filter(function (s) { return s.lines.length; }), dims: dims };
}

/* map one Shopify product onto the shape the pages already render */
function scMapProduct(node) {
  var ve = (node.variants && node.variants.edges) || [];
  var v  = (ve[0] && ve[0].node) || null;
  var amount = (v && v.price && v.price.amount) ||
               (node.priceRange && node.priceRange.minVariantPrice && node.priceRange.minVariantPrice.amount) || "0";
  var price  = Math.round(parseFloat(amount) * 100) / 100;
  var cur    = (v && v.price && v.price.currencyCode) ||
               (node.priceRange && node.priceRange.minVariantPrice && node.priceRange.minVariantPrice.currencyCode) || window.SHOPIFY.currency;
  var avail  = !!node.availableForSale && (!v || v.availableForSale);
  var qty    = (v && typeof v.quantityAvailable === "number") ? v.quantityAvailable
             : (typeof node.totalInventory === "number" ? node.totalInventory : null);
  var state  = !avail ? "sold" : (qty === 1 ? "1 of 1" : "available");
  var type   = (node.productType || "").trim().toLowerCase();
  var images = ((node.images && node.images.edges) || []).map(function (e) { return e.node.url; });
  var sku    = (v && v.sku && v.sku.trim()) || "";
  // clean the Shopify body copy: no em/en dashes on the site, and the CSV import
  // folded the spec line onto the end of some descriptions ("...made.Matte slip · stoneware · h. 34cm")
  var desc = scTidy(node.description);
  var spec = (node.spec && node.spec.value ? node.spec.value : "").trim();
  if (!spec) {
    var folded = desc.match(/\.\s*([^.·]+·[^.·]+·[^.]*?h\.?\s?[\d.,]+\s?cm)\s*$/i);
    if (folded) { spec = folded[1].trim(); desc = desc.slice(0, folded.index + 1).trim(); }
  }
  var rich = scParseDescription(node.descriptionHtml, desc);
  if (rich.intro.length) desc = rich.intro.join("\n\n");   // the summary: what the meta description and cards use
  if (!spec && rich.dims) spec = rich.dims;
  return {
    id:         node.handle,                                   // cart key + product URL (?id=)
    slug:       node.handle,
    ref:        sku || scGidNum(node.id).slice(-4),            // catalogue "N°" - set a SKU in Shopify for a custom one
    name:       node.title,
    spec:       spec,
    desc:       desc,
    intro:      rich.intro,
    sections:   rich.sections,
    dims:       rich.dims,
    price:      price,
    currency:   cur,
    state:      state,
    img:        (node.featuredImage && node.featuredImage.url) || images[0] || "",
    images:     images,
    category:   (["vessels", "tableware", "lighting"].indexOf(type) >= 0) ? type : "",
    variantId:  v ? v.id : "",
    variantNum: v ? scGidNum(v.id) : "",
    available:  avail
  };
}

function scFetchProducts() {
  var s = window.SHOPIFY;
  var ctx = s.country ? "query @inContext(country: " + s.country + ") " : "";
  var query = ctx +
    "{ products(first: 60, sortKey: CREATED_AT, reverse: true) { edges { node { " +
      "id handle title description descriptionHtml productType availableForSale totalInventory " +
      "featuredImage { url } images(first: 6) { edges { node { url } } } " +
      "spec: metafield(namespace: \"custom\", key: \"spec\") { value } " +
      "priceRange { minVariantPrice { amount currencyCode } } " +
      "variants(first: 1) { edges { node { id sku availableForSale quantityAvailable price { amount currencyCode } } } } " +
    "} } } }";
  return scGql(query)
  .then(function (j) {
    if (j && j.errors) throw new Error("Shopify Storefront errors: " + JSON.stringify(j.errors));
    if (!j || !j.data || !j.data.products) throw new Error("Shopify: unexpected response");
    return j.data.products.edges.map(function (e) { return scMapProduct(e.node); });
  });
}

window._dataReady = Promise.all([
  scResolveMarket().then(scFetchProducts).catch(function (err) {
    console.error("[shop] Shopify products failed to load - the shop will show empty until it's reachable.", err);
    return [];
  }),
  fetch("content/journal.json").then(function (r) { return r.ok ? r.json() : { posts: [] }; }).catch(function () { return { posts: [] }; }),
  fetch("content/site.json").then(function (r) { return r.ok ? r.json() : { images: {} }; }).catch(function () { return { images: {} }; }),
  fetch("content/settings.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
  fetch("content/pages.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
]).then(function (res) {
  window.CATALOG  = res[0] || [];
  window.JOURNAL  = (res[1] && res[1].posts) || [];
  window.SITE     = (res[2] && res[2].images) ? res[2] : { images: {} };
  window.SETTINGS = res[3] || {};
  window.PAGES    = res[4] || {};
  document.dispatchEvent(new Event("data:ready"));
});

/* run fn once content has loaded (or immediately if already loaded) */
window.onData = function (fn) { window._dataReady.then(fn); };
