/* ============================================================
   Spencer Ceramics — content loader
   PRODUCTS load live from Shopify (Storefront API). Journal, site
   photos, contact settings and page copy still come from the CMS
   JSON files. Exposes window.CATALOG / JOURNAL / SITE / SETTINGS /
   PAGES and fires "data:ready". Pages render via window.onData(fn).
   ============================================================ */

/* ---- Shopify Storefront API ----------------------------------------
   This is the PUBLIC, read-only Storefront access token. It is DESIGNED
   to live in client-side code and can only READ the shop — never put an
   Admin API key or password here. Products, prices, photos and stock are
   managed in Shopify; checkout completes on Shopify's secure page. */
window.SHOPIFY = {
  domain:   "spencer-ceramics-2.myshopify.com",
  token:    "d1c2f3c092fff343f37ed2e12b6f2e73",
  version:  "2025-10",
  currency: "NZD"
};

window.CATALOG  = [];
window.JOURNAL  = [];
window.SITE     = { images: {} };
window.SETTINGS = {};
window.PAGES    = {};
window.byId     = function (id) { return window.CATALOG.find(function (p) { return p.id === id; }); };
window.postById = function (id) { return window.JOURNAL.find(function (p) { return p.id === id; }); };

/* numeric tail of a Shopify GID — gid://shopify/ProductVariant/123 -> "123" */
function scGidNum(gid) { var m = String(gid || "").match(/(\d+)\s*$/); return m ? m[1] : ""; }

/* map one Shopify product onto the shape the pages already render */
function scMapProduct(node) {
  var ve = (node.variants && node.variants.edges) || [];
  var v  = (ve[0] && ve[0].node) || null;
  var amount = (v && v.price && v.price.amount) ||
               (node.priceRange && node.priceRange.minVariantPrice && node.priceRange.minVariantPrice.amount) || "0";
  var price  = Math.round(parseFloat(amount) * 100) / 100;
  var avail  = !!node.availableForSale && (!v || v.availableForSale);
  var qty    = (v && typeof v.quantityAvailable === "number") ? v.quantityAvailable
             : (typeof node.totalInventory === "number" ? node.totalInventory : null);
  var state  = !avail ? "sold" : (qty === 1 ? "1 of 1" : "available");
  var type   = (node.productType || "").trim().toLowerCase();
  var images = ((node.images && node.images.edges) || []).map(function (e) { return e.node.url; });
  var sku    = (v && v.sku && v.sku.trim()) || "";
  return {
    id:         node.handle,                                   // cart key + product URL (?id=)
    slug:       node.handle,
    ref:        sku || scGidNum(node.id).slice(-4),            // catalogue "N°" — set a SKU in Shopify for a custom one
    name:       node.title,
    spec:       (node.spec && node.spec.value ? node.spec.value : "").trim(),
    desc:       node.description || "",
    price:      price,
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
  var query =
    "{ products(first: 60, sortKey: CREATED_AT, reverse: true) { edges { node { " +
      "id handle title description productType availableForSale totalInventory " +
      "featuredImage { url } images(first: 6) { edges { node { url } } } " +
      "spec: metafield(namespace: \"custom\", key: \"spec\") { value } " +
      "priceRange { minVariantPrice { amount } } " +
      "variants(first: 1) { edges { node { id sku availableForSale quantityAvailable price { amount } } } } " +
    "} } } }";
  return fetch("https://" + s.domain + "/api/" + s.version + "/graphql.json", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": s.token },
    body: JSON.stringify({ query: query })
  })
  .then(function (r) { return r.json(); })
  .then(function (j) {
    if (j && j.errors) throw new Error("Shopify Storefront errors: " + JSON.stringify(j.errors));
    if (!j || !j.data || !j.data.products) throw new Error("Shopify: unexpected response");
    return j.data.products.edges.map(function (e) { return scMapProduct(e.node); });
  });
}

window._dataReady = Promise.all([
  scFetchProducts().catch(function (err) {
    console.error("[shop] Shopify products failed to load — the shop will show empty until it's reachable.", err);
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
