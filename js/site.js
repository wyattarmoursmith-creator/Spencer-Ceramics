/* ============================================================
   Spencer Ceramics — site behaviour
   Mobile nav, a lightweight localStorage cart, and cart rendering.

   NOTE ON CHECKOUT
   The cart here is a local demo so the Shop → Cart flow works the
   moment you deploy. Real payment is handed off to Shopify — wire the
   "Checkout" button to your Shopify cart / Buy Button (see README).
   ============================================================ */
(function () {
  var KEY = "sc_cart_v1";
  var CURRENCY = (window.SHOPIFY && window.SHOPIFY.currency) || "NZD";   // shipping is calculated by Shopify at checkout

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
      burger.addEventListener("click", function () { menu.classList.toggle("open"); });
      menu.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { menu.classList.remove("open"); });
      });
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
      btn.innerHTML = "Added to bag ✓";
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
          '<div class="label">Bag — empty</div>' +
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
        '<div class="cart-line__media"><img src="' + p.img + '" alt="' + p.name + '" data-media="' + p.id + '"></div>' +
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
            '<span class="label">Add a note for Spencer at checkout</span>' +
            '<a class="link-underline" href="shop.html">&larr; Keep browsing</a>' +
          '</div>' +
        '</div>' +
        '<aside class="summary">' +
          '<div class="label" style="margin-bottom:24px">Summary</div>' +
          '<div class="summary__row"><span>Subtotal</span><span class="tnum">' + money(sub) + '</span></div>' +
          '<div class="summary__row"><span>Shipping</span><span>Calculated at checkout</span></div>' +
          '<div class="summary__total"><span>Total</span><span class="tnum">' + money(sub) + ' ' + CURRENCY + '</span></div>' +
          '<button class="btn btn--fill btn--block" style="margin-top:30px" data-checkout>Checkout — Shopify <span class="arrow">&rarr;</span></button>' +
          '<button class="btn btn--ghost btn--block" style="margin-top:12px" data-checkout>Express · Shop Pay <span class="arrow">&rarr;</span></button>' +
          '<div class="summary__note">Each piece is wrapped in unbleached paper and packed by hand. Ships from New Zealand within 7 days. Tracking provided.</div>' +
        '</aside>' +
      '</div>';

    // wire row controls
    wrap.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-inc");
        window.Cart.setQty(id, currentQty(id) + 1);
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
        if (!items.length) { alert("Your bag is empty."); return; }
        var s = window.SHOPIFY || {};
        if (b.dataset.busy) return;
        b.dataset.busy = "1"; b.textContent = "Redirecting…";
        /* permalink straight to the Shopify cart — used as a fallback */
        var permalink = "https://" + s.domain + "/cart/" +
          items.map(function (l) { return l.product.variantNum + ":" + l.qty; }).join(",");
        /* preferred: create a Shopify cart and jump straight to its secure checkout */
        var lines = items.map(function (l) { return { merchandiseId: l.product.variantId, quantity: l.qty }; });
        var q = "mutation($lines:[CartLineInput!]!){ cartCreate(input:{lines:$lines}){ cart{ checkoutUrl } userErrors{ message } } }";
        fetch("https://" + s.domain + "/api/" + s.version + "/graphql.json", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": s.token },
          body: JSON.stringify({ query: q, variables: { lines: lines } })
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
     still ceramics quietly drift within their frame as you pass — tactile, not
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
      im.style.transition = "none";          // parallax tracks scroll 1:1 — easing here would feel rubbery
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
      var STROKE = 0.55;   // max faux-bold thickness (px) under the light — bolds the glyphs in place, no reflow (unlike font-weight)

      function rgbAt(t) {
        return "rgb(" + Math.round(INK[0] + (EMBER[0] - INK[0]) * t) + "," +
                        Math.round(INK[1] + (EMBER[1] - INK[1]) * t) + "," +
                        Math.round(INK[2] + (EMBER[2] - INK[2]) * t) + ")";
      }
      function paint(pos) {
        for (var i = 0; i < words.length; i++) {
          var t = 1 - Math.abs(i - pos) / WIDTH;
          t = t < 0 ? 0 : (t > 1 ? 1 : t);
          t = t * t * (3 - 2 * t);                            // smoothstep — soft leading/trailing edge
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
        // …then, after a beat, the phrase fades back on — as colour only (standard weight), and stays
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
        settle();
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

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initAddButtons();
    initHeroCrossfade();
    initScrollFX();
    initReveals();
    initScrollMotion();
    initTextSweep();
    paint();                                  // cart count (localStorage only)
    if (window.onData) window.onData(paint);          // render cart lines once content loads
    if (window.onData) window.onData(applySettings);  // footer + contact details
    if (window.onData) window.onData(applyPages);     // editable page copy
  });
})();
