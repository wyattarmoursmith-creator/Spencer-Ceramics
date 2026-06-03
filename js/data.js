/* ============================================================
   Spencer Ceramics — content loader
   Loads products + journal + site photos from JSON files that the
   CMS edits (content/products.json, content/journal.json,
   content/site.json), exposes window.CATALOG / window.JOURNAL /
   window.SITE, and fires a "data:ready" event.

   Pages render through window.onData(fn) so they wait for content.
   ============================================================ */
window.CATALOG = [];
window.JOURNAL = [];
window.SITE     = { images: {} };
window.SETTINGS = {};
window.PAGES    = {};
window.byId     = function (id) { return window.CATALOG.find(function (p) { return p.id === id; }); };
window.postById = function (id) { return window.JOURNAL.find(function (p) { return p.id === id; }); };

window._dataReady = Promise.all([
  fetch("content/products.json").then(function (r) { return r.ok ? r.json() : { products: [] }; }).catch(function () { return { products: [] }; }),
  fetch("content/journal.json").then(function (r) { return r.ok ? r.json() : { posts: [] }; }).catch(function () { return { posts: [] }; }),
  fetch("content/site.json").then(function (r) { return r.ok ? r.json() : { images: {} }; }).catch(function () { return { images: {} }; }),
  fetch("content/settings.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
  fetch("content/pages.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
]).then(function (res) {
  window.CATALOG  = (res[0] && res[0].products) || [];
  window.JOURNAL  = (res[1] && res[1].posts) || [];
  window.SITE     = (res[2] && res[2].images) ? res[2] : { images: {} };
  window.SETTINGS = res[3] || {};
  window.PAGES    = res[4] || {};
  document.dispatchEvent(new Event("data:ready"));
});

/* run fn once content has loaded (or immediately if already loaded) */
window.onData = function (fn) { window._dataReady.then(fn); };
