/* ============================================================
   Spencer Ceramics — content loader
   Loads products + journal from JSON files that the CMS edits
   (content/products.json, content/journal.json), then exposes
   window.CATALOG / window.JOURNAL and fires a "data:ready" event.

   Pages render through window.onData(fn) so they wait for content.
   ============================================================ */
window.CATALOG = [];
window.JOURNAL = [];
window.byId     = function (id) { return window.CATALOG.find(function (p) { return p.id === id; }); };
window.postById = function (id) { return window.JOURNAL.find(function (p) { return p.id === id; }); };

window._dataReady = Promise.all([
  fetch("content/products.json").then(function (r) { return r.ok ? r.json() : { products: [] }; }).catch(function () { return { products: [] }; }),
  fetch("content/journal.json").then(function (r) { return r.ok ? r.json() : { posts: [] }; }).catch(function () { return { posts: [] }; })
]).then(function (res) {
  window.CATALOG = (res[0] && res[0].products) || [];
  window.JOURNAL = (res[1] && res[1].posts) || [];
  document.dispatchEvent(new Event("data:ready"));
});

/* run fn once content has loaded (or immediately if already loaded) */
window.onData = function (fn) { window._dataReady.then(fn); };
