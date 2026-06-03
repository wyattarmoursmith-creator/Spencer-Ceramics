/* ============================================================
   Spencer Ceramics — image focus + preview editor
   Always-on (lightweight): applies saved focal points + any
   locally-previewed images to every [data-media] image.

   Add ?edit to any URL to turn on EDIT MODE:
     • drag on any image to set its focal point (what stays in frame)
     • drop an image file onto a slot to preview it across the whole site
     • Export media.js to save focal points for real (commit the file)
   Previews live in your browser only (localStorage) until you commit.
   ============================================================ */
(function () {
  var FK = "sc_focus", IK = "sc_imgs";

  function store(k) { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) { return {}; } }
  function put(k, o) { localStorage.setItem(k, JSON.stringify(o)); }

  function focusFor(key) {
    return store(FK)[key] || (window.MEDIA && window.MEDIA[key]) || "50% 50%";
  }
  function imgFor(key) { return store(IK)[key]; }

  function applyOne(img) {
    var k = img.getAttribute("data-media"); if (!k) return;
    var src = imgFor(k);
    if (src && img.getAttribute("data-prev") !== k) { img.src = src; img.setAttribute("data-prev", k); }
    img.style.objectPosition = focusFor(k);
  }
  function applyAll(root) {
    (root || document).querySelectorAll("img[data-media]").forEach(applyOne);
  }
  window.applyFocus = applyAll;

  /* keep dynamically-rendered images (shop grid, cart, journal) in sync */
  var mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches("img[data-media]")) applyOne(n);
        applyAll(n);
      });
    });
  });

  function isEdit() { return /[?&]edit\b/.test(location.search); }

  document.addEventListener("DOMContentLoaded", function () {
    applyAll();
    mo.observe(document.body, { childList: true, subtree: true });
    if (isEdit()) initEdit();
  });

  /* ===================== EDIT MODE ===================== */
  function initEdit() {
    injectStyles();
    document.body.classList.add("fx-edit");

    var bar = document.createElement("div");
    bar.className = "fx-bar";
    bar.innerHTML =
      '<span class="fx-bar__t">Focus edit</span>' +
      '<span class="fx-bar__h">Drag an image to set its focal point · drop a photo onto a slot to preview</span>' +
      '<span class="fx-bar__sp"></span>' +
      '<button class="fx-btn" data-fx="reset">Reset</button>' +
      '<button class="fx-btn" data-fx="export">Export media.js</button>' +
      '<button class="fx-btn fx-btn--solid" data-fx="done">Done</button>';
    document.body.appendChild(bar);

    bar.querySelector('[data-fx="reset"]').onclick = function () {
      if (confirm("Clear all local focus + image previews on this device?")) {
        localStorage.removeItem(FK); localStorage.removeItem(IK); location.reload();
      }
    };
    bar.querySelector('[data-fx="export"]').onclick = exportConfig;
    bar.querySelector('[data-fx="done"]').onclick = function () {
      location.href = location.pathname;
    };

    document.querySelectorAll("img[data-media]").forEach(enableImage);
  }

  function enableImage(img) {
    img.classList.add("fx-target");
    var key = img.getAttribute("data-media");

    // tag
    var wrap = img.closest("[class]") || img.parentElement;
    if (wrap && getComputedStyle(wrap).position === "static") wrap.style.position = "relative";

    function setFromEvent(e) {
      var r = img.getBoundingClientRect();
      var x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
      var y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
      var val = Math.round(x) + "% " + Math.round(y) + "%";
      var o = store(FK); o[key] = val; put(FK, o);
      img.style.objectPosition = val;
      showReticle(img, x, y, val);
    }

    img.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      img.setPointerCapture(e.pointerId);
      img.classList.add("fx-dragging");
      setFromEvent(e);
      function move(ev) { setFromEvent(ev); }
      function up(ev) {
        img.releasePointerCapture(e.pointerId);
        img.classList.remove("fx-dragging");
        img.removeEventListener("pointermove", move);
        img.removeEventListener("pointerup", up);
        setTimeout(hideReticle, 600);
      }
      img.addEventListener("pointermove", move);
      img.addEventListener("pointerup", up);
    });

    // drop to preview
    img.addEventListener("dragover", function (e) { e.preventDefault(); img.classList.add("fx-over"); });
    img.addEventListener("dragleave", function () { img.classList.remove("fx-over"); });
    img.addEventListener("drop", function (e) {
      e.preventDefault(); img.classList.remove("fx-over");
      var file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file || !/^image\//.test(file.type)) return;
      var rd = new FileReader();
      rd.onload = function () {
        var o = store(IK); o[key] = rd.result; put(IK, o);
        document.querySelectorAll('img[data-media="' + key + '"]').forEach(function (im) {
          im.src = rd.result; im.setAttribute("data-prev", key);
        });
        toast("Previewing your photo for “" + key + "”. Export real files to images/ to publish.");
      };
      rd.readAsDataURL(file);
    });
  }

  /* reticle + toast */
  var ret;
  function showReticle(img, x, y, val) {
    if (!ret) { ret = document.createElement("div"); ret.className = "fx-ret"; document.body.appendChild(ret); }
    var r = img.getBoundingClientRect();
    ret.style.left = (r.left + (x / 100) * r.width) + "px";
    ret.style.top = (r.top + (y / 100) * r.height) + "px";
    ret.setAttribute("data-v", val);
    ret.style.display = "block";
  }
  function hideReticle() { if (ret) ret.style.display = "none"; }

  var tEl;
  function toast(msg) {
    if (!tEl) { tEl = document.createElement("div"); tEl.className = "fx-toast"; document.body.appendChild(tEl); }
    tEl.textContent = msg; tEl.classList.add("show");
    clearTimeout(tEl._t); tEl._t = setTimeout(function () { tEl.classList.remove("show"); }, 3200);
  }

  function exportConfig() {
    var keys = {};
    Object.keys(window.MEDIA || {}).forEach(function (k) { keys[k] = focusFor(k); });
    Object.keys(store(FK)).forEach(function (k) { keys[k] = store(FK)[k]; });
    var lines = Object.keys(keys).map(function (k) {
      return '  ' + JSON.stringify(k) + ': ' + JSON.stringify(keys[k]);
    });
    var out =
      "/* Spencer Ceramics — media focus config. Replace site/js/media.js with this. */\n" +
      "window.MEDIA = {\n" + lines.join(",\n") + "\n};\n";
    var blob = new Blob([out], { type: "text/javascript" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "media.js"; a.click();
    toast("Saved media.js — drop it into site/js/ and re-deploy to publish your focal points.");
  }

  function injectStyles() {
    var css =
      ".fx-edit .fx-target{ cursor:crosshair; outline:1px solid rgba(194,90,62,.55); outline-offset:-1px; }" +
      ".fx-edit .fx-target.fx-dragging{ outline:2px solid #C25A3E; }" +
      ".fx-edit .fx-target.fx-over{ outline:2px dashed #C25A3E; filter:brightness(.7); }" +
      ".fx-ret{ position:fixed; z-index:9999; width:18px; height:18px; margin:-9px 0 0 -9px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 0 2px rgba(0,0,0,.5); pointer-events:none; display:none; }" +
      ".fx-ret::after{ content:attr(data-v); position:absolute; left:50%; top:22px; transform:translateX(-50%); white-space:nowrap; font:500 11px/1 'JetBrains Mono',monospace; letter-spacing:.08em; color:#fff; background:#0B0B0C; padding:4px 7px; border-radius:3px; }" +
      ".fx-bar{ position:fixed; left:50%; bottom:20px; transform:translateX(-50%); z-index:9999; display:flex; align-items:center; gap:16px; width:min(740px, calc(100vw - 32px)); background:#0B0B0C; color:#EFECE6; padding:12px 14px 12px 22px; border-radius:999px; box-shadow:0 12px 40px rgba(0,0,0,.4); }" +
      ".fx-bar__t{ font:500 11px/1 'JetBrains Mono',monospace; letter-spacing:.2em; text-transform:uppercase; color:#C25A3E; white-space:nowrap; }" +
      ".fx-bar__h{ font:400 12px/1.3 'Schibsted Grotesk',sans-serif; color:#9E9A92; max-width:340px; }" +
      ".fx-bar__sp{ flex:1; min-width:8px; }" +
      ".fx-btn{ font:400 12px/1 'Schibsted Grotesk',sans-serif; letter-spacing:.02em; color:#EFECE6; background:transparent; border:1px solid #46433C; border-radius:999px; padding:9px 15px; cursor:pointer; white-space:nowrap; }" +
      ".fx-btn:hover{ border-color:#EFECE6; }" +
      ".fx-btn--solid{ background:#EFECE6; color:#0B0B0C; border-color:#EFECE6; }" +
      ".fx-toast{ position:fixed; left:50%; bottom:84px; transform:translateX(-50%) translateY(8px); z-index:9999; opacity:0; transition:.25s; background:#2A2925; color:#EFECE6; font:400 12.5px/1.4 'Schibsted Grotesk',sans-serif; padding:12px 18px; border-radius:8px; max-width:min(520px,calc(100vw - 32px)); text-align:center; pointer-events:none; }" +
      ".fx-toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }" +
      "@media(max-width:620px){ .fx-bar__h{ display:none; } }";
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  }
})();
