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
  var SHIPPING = 24;       // flat AUD; adjust or let Shopify calculate
  var CURRENCY = "AUD";

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
    var total = sub + SHIPPING;

    var lines = items.map(function (l) {
      var p = l.product;
      return '' +
      '<div class="cart-line">' +
        '<div class="cart-line__media"><img src="' + p.img + '" alt="' + p.name + '" data-media="' + p.id + '"></div>' +
        '<div>' +
          '<div class="label" style="margin-bottom:10px">N° ' + p.id + ' · ' + p.state + '</div>' +
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
          '<div class="summary__row"><span>Shipping</span><span class="tnum">' + money(SHIPPING) + '</span></div>' +
          '<div class="summary__total"><span>Total</span><span class="tnum">' + money(total) + ' ' + CURRENCY + '</span></div>' +
          '<button class="btn btn--fill btn--block" style="margin-top:30px" data-checkout>Checkout — Shopify <span class="arrow">&rarr;</span></button>' +
          '<button class="btn btn--ghost btn--block" style="margin-top:12px" data-checkout>Express · Shop Pay <span class="arrow">&rarr;</span></button>' +
          '<div class="summary__note">Each piece is wrapped in unbleached paper and packed by hand. Ships from Tasmania within 7 days. Tracking provided.</div>' +
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
        /* >>> Replace with your Shopify checkout URL / Buy Button checkout <<< */
        alert("Connect Shopify to complete checkout.\n\nSee README — Step 3: wire this button to your Shopify cart/checkout URL.");
      });
    });
  }

  function currentQty(id) {
    var l = window.Cart.items().find(function (x) { return x.product.id === id; });
    return l ? l.qty : 0;
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initAddButtons();
    paint();                                  // cart count (localStorage only)
    if (window.onData) window.onData(paint);  // render cart lines once content loads
  });
})();
