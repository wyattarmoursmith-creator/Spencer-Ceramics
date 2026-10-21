/* Shopify Analytics for this custom storefront (no library; the same events Shopify's own
   hydrogen-react package sends, written out by hand so the site stays dependency-free).
   Shopify's visitor tracking normally runs inside Shopify-hosted themes. This sends the same events
   from here: a page view on every page (with the product on product pages, the collection on the
   shop and Everyday pages) and an add-to-cart event. Shopify stitches them to checkout and orders,
   which fills in sessions, conversion rate and top products in Shopify Analytics.
   Consent: Shopify's Customer Privacy API decides, from the store's privacy settings and the
   visitor's region, whether analytics may run; where consent is required and none has been given,
   nothing is sent. Cookies: _shopify_y (visitor, one year) and _shopify_s (session, 30 min), set on
   the root domain so the checkout on checkout.craigspencerceramics.com can read them. */
(function () {
  "use strict";
  if (typeof window === "undefined" || /Chrome-Lighthouse/.test(navigator.userAgent)) return;
  var S = window.SHOPIFY || {};
  var SHOP_ID = 97681801522;
  var ROOT = "craigspencerceramics.com";                                   // cookies live here so checkout can read them
  var DOMAIN = S.analyticsDomain || "checkout." + ROOT;                     // the store's primary (online store) domain
  var APP_ID = "12875497473";                                              // Shopify's id for "headless" storefronts
  var ASSET_VERSION = "2025.7.0";
  var PAGE_TYPES = { home: "index", shop: "collection", everyday: "collection", product: "product", cart: "cart",
                     terms: "policy", privacy: "policy", "404": "404" };    // everything else is a plain page

  /* ids in the format Shopify's own package produces: 8 hex of time + 4-4-4-12 random, upper case */
  function hexTime() { var t = new Date().getTime() >>> 0, p = 0; try { p = performance.now() >>> 0; } catch (e) {} return Math.abs(t + p).toString(16).toLowerCase().padStart(8, "0"); }
  function uuid() {
    var tpl = "xxxx-4xxx-xxxx-xxxxxxxxxxxx", out;
    try { var a = new Uint16Array(31); crypto.getRandomValues(a); var i = 0; out = tpl.replace(/[x]/g, function () { var r = a[i++] % 16; return r.toString(16); }).toUpperCase(); }
    catch (e) { out = tpl.replace(/[x]/g, function () { return (Math.random() * 16 | 0).toString(16); }).toUpperCase(); }
    return hexTime() + "-" + out;
  }
  function cookie(name) { var m = document.cookie.match("(?:^|; )" + name + "=([^;]*)"); return m ? decodeURIComponent(m[1]) : ""; }
  function setCookie(name, value, maxAge) {
    var onRoot = location.hostname === ROOT || location.hostname.slice(-ROOT.length - 1) === "." + ROOT;
    document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=" + maxAge + "; Path=/; SameSite=Lax; Secure" + (onRoot ? "; Domain=." + ROOT : "");
  }
  function ensureCookies() {                                               // same names and lifetimes Shopify uses
    setCookie("_shopify_y", cookie("_shopify_y") || uuid(), 31536000);
    setCookie("_shopify_s", cookie("_shopify_s") || uuid(), 1800);
  }
  function gidNum(gid) { var m = String(gid || "").match(/\/(\d+)(?:[?#]|$)/); return m ? parseInt(m[1], 10) : 0; }
  function navInfo() {
    try { var n = performance.getEntriesByType && performance.getEntriesByType("navigation"); if (n && n[0] && n[0].type) return [String(n[0].type), "PerformanceNavigationTiming"]; } catch (e) {}
    return ["unknown", "unknown"];
  }
  function clean(obj) { var o = {}; Object.keys(obj).forEach(function (k) { if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") o[k] = obj[k]; }); return o; }
  function wrap(schema, payload) { return { schema_id: schema, payload: payload, metadata: { event_created_at_ms: Date.now() } }; }

  /* the common fields of every event */
  function browser() {
    var nav = navInfo();
    return { uniqueToken: cookie("_shopify_y"), visitToken: cookie("_shopify_s"), url: location.href, path: location.pathname, search: location.search,
             referrer: document.referrer, title: document.title, userAgent: navigator.userAgent, navigationType: nav[0], navigationApi: nav[1] };
  }
  function trekkieCommon(b) {
    return { appClientId: APP_ID, isMerchantRequest: false, hydrogenSubchannelId: "0", isPersistentCookie: true,
             uniqToken: b.uniqueToken, visitToken: b.visitToken, microSessionId: uuid(), microSessionCount: 1,
             url: b.url, path: b.path, search: b.search, referrer: b.referrer, title: b.title,
             shopId: SHOP_ID, currency: S.currency || "AUD", contentLanguage: "en" };
  }
  function customerCommon(b) {
    return { source: "headless", asset_version_id: ASSET_VERSION, hydrogenSubchannelId: "0", is_persistent_cookie: true,
             deprecated_visit_token: b.visitToken, unique_token: b.uniqueToken, event_time: Date.now(), event_id: uuid(),
             event_source_url: b.url, referrer: b.referrer, user_agent: b.userAgent, navigation_type: b.navigationType, navigation_api: b.navigationApi,
             shop_id: SHOP_ID, currency: S.currency || "AUD", ccpa_enforced: false, gdpr_enforced: false, gdpr_enforced_as_string: "false",
             analytics_allowed: true, marketing_allowed: false, sale_of_data_allowed: false };
  }
  function productJson(p, qty) {
    return JSON.stringify(clean({ variant_gid: p.variantId, category: p.category, sku: p.ref, product_id: gidNum(p.gid), variant_id: gidNum(p.variantId),
      product_gid: p.gid, name: p.name, variant: p.name || "", brand: "Craig Spencer Ceramics", price: parseFloat(p.price) || 0, quantity: Number(qty || 1) }));
  }
  function post(events) {
    try { var cp = (window.Shopify || {}).customerPrivacy; if (cp && !cp.analyticsProcessingAllowed()) return Promise.resolve(); } catch (e) {}   // respect a decline made after load
    var body = JSON.stringify({ events: events, metadata: { event_sent_at_ms: Date.now() } });
    return fetch("https://" + DOMAIN + "/.well-known/shopify/monorail/unstable/produce_batch", { method: "post", headers: { "content-type": "text/plain" }, body: body, keepalive: true })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (t) { if (!t) return; try { JSON.parse(t).result.forEach(function (x) { if (x.status !== 200) console.warn("Shopify analytics:", x.message); }); } catch (e) {} })
      .catch(function () {});
  }

  function pageView(pageType, opts) {
    var b = browser(), canonical = (document.querySelector("link[rel=canonical]") || {}).href || b.url;
    var tc = trekkieCommon(b), cc = customerCommon(b);
    var events = [
      wrap("trekkie_storefront_page_view/1.4", clean(Object.assign({ pageType: pageType, customerId: 0, resourceType: opts.resourceType, resourceId: opts.resourceId }, tc))),
      wrap("custom_storefront_customer_tracking/1.2", clean(Object.assign({ event_name: "page_rendered", canonical_url: canonical, customer_id: 0 }, cc)))
    ];
    if (pageType === "collection") events.push(wrap("custom_storefront_customer_tracking/1.2", clean(Object.assign({ event_name: "collection_page_rendered", canonical_url: canonical, customer_id: 0, collection_name: opts.collectionHandle }, cc))));
    if (pageType === "product" && opts.product) events.push(wrap("custom_storefront_customer_tracking/1.2", clean(Object.assign({ event_name: "product_page_rendered", canonical_url: canonical, customer_id: 0, products: [productJson(opts.product, 1)], total_value: parseFloat(opts.product.price) || 0 }, cc))));
    return post(events);
  }
  function addToCart(p, qty) {
    var b = browser(), cc = customerCommon(b);
    return post([wrap("custom_storefront_customer_tracking/1.2", clean(Object.assign({ event_name: "product_added_to_cart", cart_token: null, total_value: (parseFloat(p.price) || 0) * (qty || 1), products: [productJson(p, qty || 1)], customer_id: 0 }, cc)))]);
  }

  /* Shopify's privacy banner bundle (it carries the Customer Privacy API). The banner only appears for
     visitors in regions the store's Customer privacy settings mark as needing consent (the EU and UK);
     everyone else never sees it. analyticsProcessingAllowed() folds in the store's settings, the
     visitor's region and any recorded consent. Consent is stored against the checkout domain, so it
     carries through to checkout on checkout.craigspencerceramics.com. */
  var PRIVACY = { storefrontAccessToken: S.token || "", checkoutRootDomain: DOMAIN, storefrontRootDomain: ROOT };
  function loadPrivacyApi(cb) {
    var done = false, finish = function () { if (done) return; done = true; cb((window.Shopify || {}).customerPrivacy || null); };
    var s = document.createElement("script");
    s.src = "https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js"; s.async = true;
    s.onload = function () {
      try { if (window.privacyBanner && window.privacyBanner.loadBanner) { window.privacyBanner.loadBanner(PRIVACY).then(finish, finish); return; } } catch (e) {}
      finish();
    };
    s.onerror = finish;
    document.head.appendChild(s);
    setTimeout(finish, 6000);                                              // never hold the page up on a slow script
  }
  window.scShowPrivacyPreferences = function () {                           // for a "cookie settings" link, if one is ever added
    try { if (window.privacyBanner) window.privacyBanner.showPreferences(PRIVACY); } catch (e) {}
  };
  function whenCatalogue(cb) {                                              // the catalogue arrives after the page
    if (window.CATALOG && window.CATALOG.length) return cb();
    var n = 0, t = setInterval(function () { if ((window.CATALOG && window.CATALOG.length) || ++n > 40) { clearInterval(t); cb(); } }, 250);
  }

  function start() {
    ensureCookies();
    var page = document.body.getAttribute("data-page") || "", pageType = PAGE_TYPES[page] || "page";
    var id = new URLSearchParams(location.search).get("id");
    whenCatalogue(function () {
      var opts = {};
      if (page === "product" && id && window.byId && window.byId(id)) { var p = window.byId(id); opts.product = p; opts.resourceType = "product"; opts.resourceId = gidNum(p.gid) || undefined; }
      if (page === "shop") opts.collectionHandle = "all";
      if (page === "everyday") opts.collectionHandle = "everyday";
      pageView(pageType, opts);
    });
    document.addEventListener("sc:addtocart", function (e) {                 // fired by site.js when a piece goes into the cart
      var p = e.detail && window.byId ? window.byId(e.detail.id) : null; if (!p) return;
      ensureCookies(); addToCart(p, 1);
    });
  }

  loadPrivacyApi(function (cp) {
    var allowed = true;
    try { if (cp) allowed = !!cp.analyticsProcessingAllowed(); } catch (e) {}
    if (allowed) return start();
    document.addEventListener("visitorConsentCollected", function (e) { if (e.detail && e.detail.analyticsAllowed) start(); });
  });
})();
