/* ============================================================
   Spencer Ceramics - site behaviour
   Mobile nav, a lightweight localStorage cart, and cart rendering.

   NOTE ON CHECKOUT
   The cart here is a local demo so the Shop → Cart flow works the
   moment you deploy. Real payment is handed off to Shopify - wire the
   "Checkout" button to your Shopify cart / Buy Button (see README).
   ============================================================ */
(function () {
  var KEY = "sc_cart_v1";
  function cur() { return (window.SHOPIFY && window.SHOPIFY.currency) || "NZD"; }   // read late: data.js sets it once the catalogue loads

  /* ---------- storage ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(c) { localStorage.setItem(KEY, JSON.stringify(c)); paint(); }
  function count(c) {
    c = c || load();
    return Object.keys(c).reduce(function (n, k) { return n + c[k]; }, 0);
  }
  function money(n) { return "$ " + n.toFixed(2); }

  /* ---------- public-ish API ---------- */
  window.Cart = {
    add: function (id, qty) {
      var c = load(); c[id] = (c[id] || 0) + (qty || 1); save(c);
      flash();
    },
    setQty: function (id, qty) {
      var c = load();
      if (qty <= 0) { delete c[id]; } else { c[id] = qty; }
      save(c);
    },
    remove: function (id) { var c = load(); delete c[id]; save(c); },
    items: function () {
      var c = load();
      return Object.keys(c).map(function (id) {
        var p = window.byId ? window.byId(id) : null;
        return p ? { product: p, qty: c[id] } : null;
      }).filter(Boolean);
    },
    subtotal: function () {
      return this.items().reduce(function (s, l) { return s + l.product.price * l.qty; }, 0);
    }
  };

  /* ---------- header cart count ---------- */
  function paint() {
    var n = count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
    });
    document.querySelectorAll(".nav__cart-fab").forEach(function (el) { el.hidden = n < 1; });   // the phone cart button only exists while there is something in it
    if (document.body.getAttribute("data-page") === "cart") renderCart();
  }

  /* brief confirmation pulse on the cart link */
  function flash() {
    document.querySelectorAll(".nav__cart").forEach(function (el) {
      el.style.transition = "opacity .2s"; el.style.opacity = "0.4";
      setTimeout(function () { el.style.opacity = "1"; }, 200);
    });
  }

  /* ---------- mobile nav ---------- */
  function initNav() {
    var burger = document.querySelector(".nav__burger");
    var menu = document.querySelector(".menu");
    if (burger && menu) {
      var lastFocus = null;
      function setMenu(open) {
        menu.classList.toggle("open", open);
        document.documentElement.classList.toggle("menu-open", open);   // locks page scroll behind the overlay
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        burger.setAttribute("aria-label", open ? "Close menu" : "Menu");
        burger.textContent = open ? "\u2715" : "\u2630";
        if (open) { lastFocus = document.activeElement; var first = menu.querySelector("a"); if (first) first.focus(); }
        else if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
      }
      burger.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
      menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("open")) setMenu(false); });
    }
    // hero nav: fade to a solid bar once scrolled past the top
    var heroNav = document.querySelector(".nav--dark");
    if (heroNav) {
      var onScroll = function () { heroNav.classList.toggle("nav--scrolled", window.scrollY > 80); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  /* ---------- add-to-cart (delegated, works for async-rendered buttons) ---------- */
  function initAddButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-add]");
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute("data-add");
      var p = window.byId(id);
      if (p && p.state === "sold") return;
      window.Cart.add(id, 1);
      if (btn.dataset.busy) return;
      btn.dataset.busy = "1";
      var prevHTML = btn.innerHTML;
      btn.innerHTML = "Added to cart ✓";
      setTimeout(function () { btn.innerHTML = prevHTML; btn.dataset.busy = ""; }, 1400);
    });
  }

  /* ---------- cart page rendering ---------- */
  function renderCart() {
    var wrap = document.querySelector("[data-cart-root]");
    if (!wrap) return;
    if (!window.CATALOG || !window.CATALOG.length) return; // wait for content to load
    var items = window.Cart.items();

    if (!items.length) {
      wrap.innerHTML =
        '<div class="cart-body"><div class="cart-empty">' +
          '<div class="label">Cart · empty</div>' +
          '<div class="display">Nothing here yet.</div>' +
          '<a class="btn btn--fill btn--pill" href="shop.html">Browse the shop <span class="arrow">&rarr;</span></a>' +
        '</div><div></div></div>';
      return;
    }

    var sub = window.Cart.subtotal();

    var lines = items.map(function (l) {
      var p = l.product;
      return '' +
      '<div class="cart-line">' +
        '<div class="cart-line__media"><img src="' + window.scImg(p.img, 300) + '" srcset="' + window.scSrcset(p.img, [200, 300, 400]) + '" sizes="140px" alt="' + p.name + '" data-media="' + p.id + '"></div>' +
        '<div>' +
          '<div class="label" style="margin-bottom:10px">N° ' + p.ref + ' · ' + p.state + '</div>' +
          '<div class="cart-line__name">' + p.name + '</div>' +
          '<div class="cart-line__spec">' + p.spec + '</div>' +
          '<div class="cart-line__controls">' +
            '<span class="qty">' +
              '<button data-dec="' + p.id + '" aria-label="Decrease">&minus;</button>' +
              '<span>' + l.qty + '</span>' +
              '<button data-inc="' + p.id + '" aria-label="Increase">+</button>' +
            '</span>' +
            '<button class="cart-line__remove" data-remove="' + p.id + '">Remove</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-line__price tnum">' + money(p.price * l.qty) + '</div>' +
      '</div>';
    }).join("");

    wrap.innerHTML =
      '<div class="cart-body">' +
        '<div class="cart-lines">' + lines +
          '<div style="padding:30px var(--gutter); display:flex; justify-content:space-between; align-items:center;">' +
            '<span class="label">Add a note for Craig at checkout</span>' +
            '<a class="link-underline" href="shop.html">&larr; Keep browsing</a>' +
          '</div>' +
        '</div>' +
        '<aside class="summary">' +
          '<div class="label" style="margin-bottom:24px">Summary</div>' +
          '<div class="summary__row"><span>Subtotal</span><span class="tnum">' + money(sub) + '</span></div>' +
          '<div class="summary__row"><span>Shipping</span><span>Calculated at checkout</span></div>' +
          '<div class="summary__row"><span>Currency</span><span class="currency" data-currency><span class="currency__one" data-currency-code>' + cur() + '</span><span class="currency__pick" hidden><select aria-label="Currency"></select></span></span></div>' +
          '<div class="summary__total"><span>Total</span><span class="tnum">' + money(sub) + ' ' + cur() + '</span></div>' +
          '<button class="btn btn--fill btn--block" style="margin-top:30px" data-checkout>Secure checkout · Shopify <span class="arrow">&rarr;</span></button>' +
          '<div class="summary__note">Orders are charged in the currency of the shipping country. Every piece is securely wrapped and packed by hand. Tracking provided once your order ships. <a href="faq.html" style="border-bottom:1px solid currentColor">Shipping &amp; FAQ</a></div>' +
        '</aside>' +
      '</div>';

    initCurrency();

    // wire row controls
    wrap.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-inc");
        var p = window.byId(id), want = currentQty(id) + 1;
        if (p && want > p.stock) { b.classList.add('is-max'); setTimeout(function () { b.classList.remove('is-max'); }, 600); return; }   // no more than exist
        window.Cart.setQty(id, want);
      });
    });
    wrap.querySelectorAll("[data-dec]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-dec");
        window.Cart.setQty(id, currentQty(id) - 1);
      });
    });
    wrap.querySelectorAll("[data-remove]").forEach(function (b) {
      b.addEventListener("click", function () { window.Cart.remove(b.getAttribute("data-remove")); });
    });
    wrap.querySelectorAll("[data-checkout]").forEach(function (b) {
      b.addEventListener("click", function () {
        var items = window.Cart.items().filter(function (l) { return l.product && l.product.variantId; });
        if (!items.length) { alert("Your cart is empty."); return; }
        var s = window.SHOPIFY || {};
        if (b.dataset.busy) return;
        b.dataset.busy = "1"; b.textContent = "Redirecting…";
        /* permalink straight to the Shopify cart - used as a fallback */
        var permalink = "https://" + s.domain + "/cart/" +
          items.map(function (l) { return l.product.variantNum + ":" + l.qty; }).join(",");
        /* preferred: create a Shopify cart and jump straight to its secure checkout */
        var lines = items.map(function (l) { return { merchandiseId: l.product.variantId, quantity: l.qty }; });
        /* buyerIdentity carries the chosen market so checkout opens in the same currency */
        var q = "mutation($lines:[CartLineInput!]!,$buyer:CartBuyerIdentityInput){ cartCreate(input:{lines:$lines,buyerIdentity:$buyer}){ cart{ checkoutUrl } userErrors{ message } } }";
        var buyer = s.country ? { countryCode: s.country } : null;
        fetch("https://" + s.domain + "/api/" + s.version + "/graphql.json", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": s.token },
          body: JSON.stringify({ query: q, variables: { lines: lines, buyer: buyer } })
        })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var c = j && j.data && j.data.cartCreate && j.data.cartCreate.cart;
          window.location.href = (c && c.checkoutUrl) ? c.checkoutUrl : permalink;
        })
        .catch(function () { window.location.href = permalink; });
      });
    });
  }

  /* ---------- currency picker ----------
     Any [data-currency] element: shows the active currency, and becomes a
     select once the store offers more than one. Changing it reloads so
     every price on the page is re-fetched in the new currency. */
  function initCurrency() {
    var s = window.SHOPIFY || {}; var list = s.currencies || [];
    document.querySelectorAll("[data-currency]").forEach(function (el) {
      if (el.dataset.currencyReady) return;
      el.dataset.currencyReady = "1";
      el.querySelectorAll("[data-currency-code]").forEach(function (c) { c.textContent = s.currency || "NZD"; });
      var one = el.querySelector(".currency__one"), pick = el.querySelector(".currency__pick"), sel = el.querySelector("select");
      if (list.length < 2 || !sel) { if (el.hasAttribute("data-currency-hide-single")) el.hidden = true; return; }
      sel.innerHTML = list.map(function (c) { return '<option value="' + c.code + '">' + c.code + '</option>'; }).join("");
      sel.value = s.currency;
      if (one) one.hidden = true; if (pick) pick.hidden = false;
      sel.addEventListener("change", function () {
        try { localStorage.setItem(window.SC_CURRENCY_KEY || "sc_currency", sel.value); } catch (e) {}
        window.location.reload();
      });
    });
  }

  /* ---------- loupe: a round window over a photo showing the surface at full size ----------
     Pointer devices only (hover + fine pointer); touch gets the plain photo. The big image
     is fetched once, on first hover. Direct 1:1 tracking, no easing. */
  function initLoupe(box) {
    if (!box || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var big = box.getAttribute("data-loupe"), lens = box.querySelector(".loupe");
    if (!big || !lens) return;
    var ready = false, SIZE = 220, ZOOM = 2.2, iw = 0, ih = 0;
    function prime() {
      if (ready) return; ready = true;
      var im = new Image(); im.onload = function () { iw = im.naturalWidth; ih = im.naturalHeight; lens.style.backgroundImage = "url('" + big + "')"; box.classList.add("has-loupe"); }; im.src = big;
    }
    box.addEventListener("mouseenter", prime);
    box.addEventListener("mousemove", function (e) {
      if (!iw) return;
      var r = box.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      // the photo is object-fit: cover, so map the cursor to the visible crop of the image
      var scale = Math.max(r.width / iw, r.height / ih), dw = iw * scale, dh = ih * scale;
      var ox = (r.width - dw) / 2, oy = (r.height - dh) / 2;
      var px = (x - ox) / dw, py = (y - oy) / dh;             // 0..1 across the photo
      var bw = dw * ZOOM, bh = dh * ZOOM;                      // the magnified photo
      lens.style.left = (x - SIZE / 2) + "px"; lens.style.top = (y - SIZE / 2) + "px";
      lens.style.backgroundSize = bw + "px " + bh + "px";
      lens.style.backgroundPosition = (SIZE / 2 - px * bw) + "px " + (SIZE / 2 - py * bh) + "px";
      box.classList.add("is-looking");
    });
    box.addEventListener("mouseleave", function () { box.classList.remove("is-looking"); });
  }
  window.initLoupe = initLoupe;

  window.scInitCurrency = initCurrency;   // pages that re-render their own markup can call this

  function currentQty(id) {
    var l = window.Cart.items().find(function (x) { return x.product.id === id; });
    return l ? l.qty : 0;
  }

  /* ---------- hero: slow crossfade through the images ---------- */
  function initHeroCrossfade() {
    var imgs = document.querySelectorAll(".hero__media .hero__img");
    if (imgs.length < 2) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var i = 0;
    setInterval(function () {
      imgs[i].classList.remove("is-active");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("is-active");
    }, 5400);
  }

  /* ---------- subtle scroll motion: hero parallax + caption drift ---------- */
  function initScrollFX() {
    var hero = document.querySelector(".hero");
    var media = hero && hero.querySelector(".hero__media");
    var inner = hero && hero.querySelector(".hero__inner");
    if (!hero || !media) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var ticking = false;
    function update() {
      var y = window.scrollY || window.pageYOffset || 0;
      var h = hero.offsetHeight || window.innerHeight;
      var p = Math.max(0, Math.min(1, y / h));
      media.style.transform = "translate3d(0," + (y * 0.12).toFixed(1) + "px,0)";
      if (inner) {
        inner.style.transform = "translate3d(0," + (y * 0.22).toFixed(1) + "px,0)";
        inner.style.opacity = (1 - p * 0.85).toFixed(3);
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- reveal sections as they scroll into view ---------- */
  /* ---------- plate focus, "assembled type": the dark ground wipes in from the
     left with a hard edge, then the contents are typeset in sequence as the
     scroll continues - mono labels, heading line by line, then the two columns.
     Each element owns a window of the overall progress (1:1 with scroll, so
     scrolling back disassembles it). rAF-throttled, no timers, no blur, no
     overshoot. At rest all inline styles are cleared: identical to the static
     plate. Reduced motion: shown as-is. No JS: never hidden. ---------- */
  function initPlateFocus() {
    var panels = [].slice.call(document.querySelectorAll(".manifesto__panel[data-focus]"));
    if (!panels.length) return;
    var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var START = 0.94, END = 0.34;   // plate top edge, as a fraction of viewport height: progress runs 0 -> 1 between these
    var W_GROUND = [0.00, 0.26];    // window of overall progress: dark ground wipes in, left to right
    var W_META   = [0.28, 0.44];    // window: the two mono labels, left then right
    var W_HEAD   = [0.44, 0.82];    // window: heading lines, top to bottom
    var W_COLS   = [0.80, 1.00];    // window: the two columns, left then right
    var LEN_META = 0.12;            // how much progress each label takes to land (items overlap inside their window)
    var LEN_LINE = 0.18;            // same, per heading line
    var LEN_COL  = 0.14;            // same, per column
    var RISE     = 8;               // px each element rises into place
    var OP_LATE  = 0.4;             // fraction of an item's own window spent invisible before opacity ramps (solidifies late)
    var WIPE_OK  = !!(window.CSS && CSS.supports && CSS.supports("clip-path", "inset(0 50% 0 0)"));

    function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
    function win(t, a, b) { return clamp01((t - a) / (b - a)); }   // local progress inside window [a, b]

    // Spread els evenly across window w; each lasts len of the overall progress.
    function spread(els, w, len) {
      var span = w[1] - w[0], n = els.length;
      len = Math.min(len, span);
      var step = n > 1 ? (span - len) / (n - 1) : 0;
      return els.map(function (el, i) { return { el: el, a: w[0] + i * step, b: w[0] + i * step + len }; });
    }

    // Wrap each <br>-separated heading line in a block span (the <br> is dropped;
    // see the .pl rule in site.css). Idempotent: a heading already wrapped is left alone.
    function wrapLines(h) {
      if (!h) return [];
      if (!h.querySelector(".pl")) {
        var cur = null;
        [].slice.call(h.childNodes).forEach(function (n) {
          if (n.nodeType === 1 && n.tagName === "BR") { h.removeChild(n); cur = null; return; }
          if (!cur) { cur = document.createElement("span"); cur.className = "pl"; h.insertBefore(cur, n); }
          cur.appendChild(n);
        });
      }
      return [].slice.call(h.querySelectorAll(".pl"));
    }

    // One element's move inside its own window: a short rise that eases to rest
    // (never past it) while opacity stays at 0, then ramps late. Resolved: styles cleared.
    function place(el, u) {
      if (u >= 1) { el.style.transform = ""; el.style.opacity = ""; return; }
      var r = 1 - u;
      el.style.transform = "translateY(" + (RISE * r * r).toFixed(2) + "px)";
      el.style.opacity = clamp01((u - OP_LATE) / (1 - OP_LATE)).toFixed(3);
    }

    // The ground: a hard-edged wipe from the left. Without clip-path support it
    // simply solidifies in place instead. Resolved: the inline clip is removed.
    function ground(p, u) {
      if (u >= 1) { p.style.clipPath = ""; p.style.webkitClipPath = ""; if (!WIPE_OK) p.style.opacity = 1; return; }
      if (!WIPE_OK) { p.style.opacity = u.toFixed(3); return; }
      var v = "inset(0 " + (100 - u * 100).toFixed(2) + "% 0 0)";
      p.style.clipPath = v; p.style.webkitClipPath = v;
    }

    if (REDUCED) {                          // shown as-is; the heading lines are still wrapped so the accent colour applies
      panels.forEach(function (p) { p.style.opacity = 1; wrapLines(p.querySelector(".manifesto__statement")); });
      if (window.onData) window.onData(function () { window.onData(function () {
        panels.forEach(function (p) { wrapLines(p.querySelector(".manifesto__statement")); });
      }); });
      return;
    }

    var states = panels.map(function (p) {
      p.style.opacity = WIPE_OK ? 1 : 0;    // overrides the .js [data-focus] { opacity: 0 } rule; the clip hides it instead
      return { p: p, parts: [], last: -1 };
    });

    function build() {                      // (re)collect the parts and their windows, then paint synchronously (no flash)
      states.forEach(function (s) {
        var meta  = [].slice.call(s.p.querySelectorAll(".manifesto__meta span"));
        var lines = wrapLines(s.p.querySelector(".manifesto__statement"));
        var cols  = [].slice.call(s.p.querySelectorAll(".manifesto__cols p"));
        s.parts = spread(meta, W_META, LEN_META).concat(spread(lines, W_HEAD, LEN_LINE), spread(cols, W_COLS, LEN_COL));
        s.last = -1;
      });
      tick();
    }

    var ticking = false;
    function tick() {
      ticking = false;
      var vh = window.innerHeight;
      states.forEach(function (s) {
        var t = clamp01((vh * START - s.p.getBoundingClientRect().top) / (vh * (START - END)));
        if (t === s.last) return;           // nothing moved: skip the style writes
        s.last = t;
        ground(s.p, win(t, W_GROUND[0], W_GROUND[1]));
        s.parts.forEach(function (it) { place(it.el, win(t, it.a, it.b)); });
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }

    build();
    // The CMS re-renders [data-lines] headings from JSON in applyPages, which is
    // registered on onData AFTER this init. Registering from inside an onData
    // callback queues ours behind everything registered before the data arrived,
    // so we re-wrap the final heading text.
    if (window.onData) window.onData(function () { window.onData(build); });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onScroll);   // lazy images above can shift the plate's position
  }

  function initReveals() {
    var els = document.querySelectorAll(".reveal, .stagger");
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- scroll motion: a gentle parallax INSIDE framed images, so the
     still ceramics quietly drift within their frame as you pass - tactile, not
     flashy. transform-only + rAF; no-ops under reduced motion (CSS hover-zoom
     then remains as the fallback). Heroes are handled separately (initScrollFX). ---------- */
  function initScrollMotion() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var SEL = ".gallery__cell img, .studio__media img, .commission__media img, " +
              ".j-entry__media img, .strip__cell .ph img, .article-hero img";
    var imgs = document.querySelectorAll(SEL);
    if (!imgs.length) return;
    var BASE = 1.1, RANGE = 0.08;            // baseline scale (headroom) + travel as a fraction of frame height
    var active = [];
    imgs.forEach(function (im) {
      im.style.transition = "none";          // parallax tracks scroll 1:1 - easing here would feel rubbery
      im.style.transform = "scale(" + BASE + ")";
    });
    var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = active.indexOf(e.target);
        if (e.isIntersecting && i < 0) { active.push(e.target); e.target.style.willChange = "transform"; }
        else if (!e.isIntersecting && i >= 0) { active.splice(i, 1); e.target.style.willChange = ""; }
      });
      schedule();
    }, { rootMargin: "15% 0px 15% 0px" }) : null;
    if (io) imgs.forEach(function (im) { io.observe(im); });
    else active = Array.prototype.slice.call(imgs);

    var ticking = false;
    function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    function update() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var k = 0; k < active.length; k++) {
        var im = active[k], fr = im.parentElement;
        if (!fr) continue;
        var r = fr.getBoundingClientRect();
        var p = (vh - r.top) / (vh + r.height);
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        var ty = ((p - 0.5) * r.height * RANGE).toFixed(1);
        im.style.transform = "translate3d(0," + ty + "px,0) scale(" + BASE + ")";
      }
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
  }

  /* ---------- text sweep: an ember "reading light" travels a sentence and then
     comes to rest (sticky) on the highlighted phrase. Plays once when the line
     scrolls into view; no-ops under reduced motion (the static .ember phrase
     remains). Marked with [data-sweep]; the .ember child marks the resting phrase. ---------- */
  function initTextSweep() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var targets = document.querySelectorAll("[data-sweep]");
    if (!targets.length) return;
    var INK = [22, 21, 19], EMBER = [122, 46, 30];   // --ink, --ember

    targets.forEach(function (p) {
      // wrap each word in a span; words inside an .ember child are the resting phrase
      var words = [], sticky = [], frag = document.createDocumentFragment();
      function emit(text, isSticky) {
        text.split(/(\s+)/).forEach(function (tok) {
          if (tok === "") return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
          var s = document.createElement("span");
          s.className = "cw";
          s.textContent = tok;
          s.style.color = "rgb(22,21,19)";
          words.push(s);
          if (isSticky) sticky.push(s);
          frag.appendChild(s);
        });
      }
      [].forEach.call(p.childNodes, function (node) {
        var emb = node.nodeType === 1 && node.classList && node.classList.contains("ember");
        emit(node.textContent || "", emb);
      });
      if (!words.length) return;
      p.innerHTML = "";
      p.appendChild(frag);

      var last = words.length - 1;
      var WIDTH = 2.4;     // wave half-width, in words
      var STROKE = 0.55;   // max faux-bold thickness (px) under the light - bolds the glyphs in place, no reflow (unlike font-weight)

      function rgbAt(t) {
        return "rgb(" + Math.round(INK[0] + (EMBER[0] - INK[0]) * t) + "," +
                        Math.round(INK[1] + (EMBER[1] - INK[1]) * t) + "," +
                        Math.round(INK[2] + (EMBER[2] - INK[2]) * t) + ")";
      }
      function paint(pos) {
        for (var i = 0; i < words.length; i++) {
          var t = 1 - Math.abs(i - pos) / WIDTH;
          t = t < 0 ? 0 : (t > 1 ? 1 : t);
          t = t * t * (3 - 2 * t);                            // smoothstep - soft leading/trailing edge
          var c = rgbAt(t);
          words[i].style.color = c;
          words[i].style.webkitTextStrokeColor = c;           // grows bolder under the light (stroke matches the fill colour)
          words[i].style.webkitTextStrokeWidth = (t * STROKE).toFixed(2) + "px";
        }
      }

      var FWD = 6500, t0 = null;   // forward-only sweep; ~8s including the off→on tail below
      function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }   // easeInOut
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var e = ts - t0;
        if (e < FWD) { paint(ease(e / FWD) * last); requestAnimationFrame(frame); return; }   // sweep forward to the last word
        paint(last);
        finish();
      }
      function finish() {
        // light has reached the end → the whole line switches off (back to plain ink, no bold)…
        words.forEach(function (s) {
          s.style.transition = "color .45s ease, -webkit-text-stroke-width .45s ease";
          s.style.color = "var(--ink)";
          s.style.webkitTextStrokeWidth = "0px";
        });
        // …then, after a beat, the phrase fades back on - as colour only (standard weight), and stays
        setTimeout(function () {
          sticky.forEach(function (s) { s.style.transition = "color .6s ease"; s.style.color = "var(--ember)"; });
        }, 800);
      }

      var played = false;
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting && !played) { played = true; io.unobserve(p); requestAnimationFrame(frame); }
          });
        }, { threshold: 0.5 });
        io.observe(p);
      } else {
        (typeof settle === "function" ? settle() : null);
      }
    });
  }

  /* ---------- apply editable Site & Contact settings (footer + contact page) ---------- */
  function applySettings() {
    var s = window.SETTINGS || {};
    document.querySelectorAll("[data-site]").forEach(function (el) {
      var key = el.getAttribute("data-site");
      if (key === "email") {
        if (s.email) { el.textContent = s.email; if (el.tagName === "A") el.setAttribute("href", "mailto:" + s.email); }
      } else if (key === "instagram") {
        if (s.instagram_handle) el.textContent = s.instagram_handle;
        if (el.tagName === "A" && s.instagram_url) el.setAttribute("href", s.instagram_url);
      } else if (s[key] != null && s[key] !== "") {
        el.textContent = s[key];
      }
    });
  }

  /* ---------- apply editable page copy (headings, intros, bodies) ---------- */
  function applyPages() {
    var P = window.PAGES || {};
    function get(path) { return path.split(".").reduce(function (o, k) { return (o && o[k] != null) ? o[k] : undefined; }, P); }
    function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    document.querySelectorAll("[data-text]").forEach(function (el) {
      var v = get(el.getAttribute("data-text"));
      if (v != null && v !== "") el.textContent = v;
    });
    document.querySelectorAll("[data-lines]").forEach(function (el) {     // headings: newlines -> <br>
      var v = get(el.getAttribute("data-lines"));
      if (v != null && v !== "") el.innerHTML = esc(v).replace(/\n/g, "<br>");
    });
    document.querySelectorAll("[data-richtext]").forEach(function (el) {  // bodies: blank lines -> paragraphs
      var v = get(el.getAttribute("data-richtext"));
      if (v != null && v !== "") el.innerHTML = esc(v).split(/\n{2,}/).map(function (p) { return "<p>" + p.replace(/\n/g, "<br>") + "</p>"; }).join("");
    });
  }

  /* ---------- plate lift: on photo plates marked data-lift (shop, studio, contact),
     scrolling lifts the plate away and lets the photograph come through, then the
     page continues. Everything is 1:1 with the scroll (no timers, no easing): the
     plate rises a little faster than the page and thins out, the photo drifts at
     hero pace. Scrolling back reassembles it. A plate in the first screen starts
     lifting from the top of the page; one further down starts once its section
     reaches the top of the viewport. The entry animations (.reveal, data-focus)
     run first; the scroll link takes over once they have landed. Reduced motion:
     static. ---------- */
  function initPlateLift() {
    var secs = [].slice.call(document.querySelectorAll(".manifesto[data-lift]"));
    if (!secs.length) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var ticking = false;
    var items = secs.map(function (sec) {
      var panel = sec.querySelector(".manifesto__panel");
      return panel ? { sec: sec, panel: panel, bg: sec.querySelector(".manifesto__bg"), live: false, solid: sec.getAttribute("data-lift") === "solid",
                       rest: panel.hasAttribute("data-focus") ? "1" : "" } : null;   // data-focus plates are hidden by CSS until JS says otherwise
    }).filter(Boolean);
    items.forEach(function (it) {
      function arm() { if (it.live) return; it.live = true; it.panel.classList.add("is-live"); update(); }
      if (it.panel.classList.contains("reveal")) {
        it.panel.addEventListener("transitionend", function (e) { if (e.target === it.panel) arm(); });
        setTimeout(arm, 1600);                     // in case the transition never fires (already in view, tab hidden)
      } else { arm(); }
    });
    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0, vh = window.innerHeight;
      items.forEach(function (it) {
        if (!it.live) return;
        var h = it.sec.offsetHeight, top = it.sec.getBoundingClientRect().top + y;
        var first = top < vh * 0.5;                // sits in the first screen: lift from the top of the page
        var start = first ? 0 : top;
        var pb = it.panel.getBoundingClientRect().bottom + y - (parseFloat(it.panel.style.transform.split(",")[1]) || 0);
        start = Math.max(start, pb - vh);          // a plate taller than the screen (the contact form on a phone) stays put until all of it has been seen
        var end = Math.max(start + h * 0.4, top + h * 0.78);   // gone by the time most of the photo has passed
        var d = y - start;                         // how far the plate has travelled
        if (!first || it.solid) {                  // solid black when the plate sits in the middle of the screen, sheer on the way in and out (mid-page plates, or data-lift="solid")
          var pr = it.panel.getBoundingClientRect();
          var off = Math.abs((pr.top + pr.bottom) / 2 - vh / 2) / (vh / 2);   // 0 at the centre, 1 at the edge
          var k = 1 - Math.max(0, Math.min(1, (off - 0.12) / 0.6));           // holds solid through the middle band
          it.panel.style.setProperty("--pa", (0.66 + 0.32 * k).toFixed(3));
        }
        if (d <= 0) { it.panel.style.opacity = it.rest; it.panel.style.transform = ""; if (it.bg) it.bg.style.transform = ""; return; }
        var p = Math.max(0, Math.min(1, d / (end - start)));
        it.panel.style.opacity = (1 - p).toFixed(3);
        it.panel.style.transform = "translate3d(0," + (-d * 0.22).toFixed(1) + "px,0)";
        if (it.bg) it.bg.style.transform = "translate3d(0," + (d * 0.12).toFixed(1) + "px,0)";
      });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("load", update);
  }

  /* ---------- return to where you were: the grids render after the catalogue loads, so the
     browser's own scroll restoration lands on an empty page and gives up. Remember the card
     you left from (and the shop's filter state); when you come back through history, the page
     re-renders the same view, then puts that card in the same place on screen. ---------- */
  var RETURN_KEY = "sc_return";
  function readReturn() {
    var page = document.body.getAttribute("data-page"), rec = null;
    try { rec = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null"); } catch (e) {}
    if (!rec || rec.page !== page || Date.now() - rec.t > 30 * 60 * 1000) return null;
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var back = nav ? nav.type === "back_forward" : !!(performance.navigation && performance.navigation.type === 2);
    if (!back) return null;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    return rec;
  }
  window.scReturn = readReturn();            // read at once, before any page script renders
  window.scReturnTo = function () {
    var rec = window.scReturn; if (!rec) return;
    window.scReturn = null;
    try { sessionStorage.removeItem(RETURN_KEY); } catch (e) {}
    var best = null, bestD = Infinity, y0 = window.scrollY || 0;
    document.querySelectorAll("a.card__link").forEach(function (a) {   // the same piece can sit in New in and in the grid: take the one that matches where you were
      if ((a.getAttribute("href") || "").indexOf("id=" + rec.id) < 0) return;
      var card = a.closest(".card") || a, y = card.getBoundingClientRect().top + y0 - rec.top, d = Math.abs(y - rec.y);
      if (d < bestD) { bestD = d; best = y; }
    });
    window.scrollTo(0, Math.max(0, best === null ? rec.y : best));
  };
  function initReturn() {
    var page = document.body.getAttribute("data-page");
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a.card__link") : null; if (!a || !page) return;
      var m = /[?&]id=([^&]+)/.exec(a.getAttribute("href") || ""); if (!m) return;
      var card = a.closest(".card") || a;
      var rec = { page: page, id: decodeURIComponent(m[1]), top: Math.round(card.getBoundingClientRect().top), y: Math.round(window.scrollY || 0),
                  state: window.scGridState ? window.scGridState() : null, t: Date.now() };
      try { sessionStorage.setItem(RETURN_KEY, JSON.stringify(rec)); } catch (err) {}
    });
    // "Back to shop" on a piece: go back through history when that is where you came from, so the position restores
    var back = document.querySelector("a[data-return]");
    if (back) {
      var rec = null; try { rec = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null"); } catch (e) {}
      if (rec && rec.page === "everyday") { back.setAttribute("href", "everyday.html"); back.innerHTML = "<span>\u2190</span> Back to the Everyday"; }
      back.addEventListener("click", function (e) {
        var ref = document.referrer || "";
        if (rec && history.length > 1 && ref.indexOf(back.getAttribute("href").replace(/\.html$/, "")) >= 0) { e.preventDefault(); history.back(); }
      });
    }
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initReturn();
    initAddButtons();
    initHeroCrossfade();
    initScrollFX();
    initReveals();
    initPlateFocus();
    initPlateLift();
    initScrollMotion();
    initTextSweep();
    paint();                                  // cart count (localStorage only)
    if (window.onData) window.onData(paint);          // render cart lines once content loads
    if (window.onData) window.onData(applySettings);  // footer + contact details
    if (window.onData) window.onData(applyPages);     // editable page copy
    if (window.onData) window.onData(function () { window.onData(initCurrency); });  // after each page has rendered its own markup
  });
})();
