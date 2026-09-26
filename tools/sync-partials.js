#!/usr/bin/env node
/* Keeps the shared chrome (head assets, mobile menu, nav, footer, scripts) identical on every page.
   Sources live in partials/. Each page marks where a partial goes:
       <!-- @partial nav variant="nav--solid" --> ... <!-- /@partial nav -->
   Run:   node tools/sync-partials.js          rewrite every page from the partials
          node tools/sync-partials.js --check  exit 1 if any page is out of date (use in CI)
   The nav and menu get aria-current="page" on the link that matches the page's data-page. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const check = process.argv.includes("--check");
const CURRENT = { shop: "shop.html", everyday: "everyday.html", about: "about.html", contact: "contact.html", cart: "cart.html" };
const partials = {};
for (const f of fs.readdirSync(path.join(root, "partials"))) if (f.endsWith(".html")) partials[f.replace(/\.html$/, "")] = fs.readFileSync(path.join(root, "partials", f), "utf8").trim();
let changed = 0, touched = [];
for (const file of fs.readdirSync(root).filter((f) => f.endsWith(".html"))) {
  const p = path.join(root, file);
  const src = fs.readFileSync(p, "utf8");
  const page = (src.match(/<body[^>]*data-page="([^"]+)"/) || [])[1] || "";
  const out = src.replace(/<!-- @partial (\w[\w-]*)((?:\s+[\w-]+="[^"]*")*) -->[\s\S]*?<!-- \/@partial \1 -->/g, (m, name, attrs) => {
    if (!partials[name]) return m;
    let body = partials[name];
    const vars = {}; for (const [, k, v] of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) vars[k] = v;
    body = body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    if ((name === "nav" || name === "menu") && CURRENT[page]) {
      body = body.replace(new RegExp('(<a [^>]*href="' + CURRENT[page].replace(".", "\\.") + '")'), '$1 aria-current="page"');
    }
    return `<!-- @partial ${name}${attrs} -->\n  ${body}\n  <!-- /@partial ${name} -->`;
  });
  if (out !== src) { changed++; touched.push(file); if (!check) fs.writeFileSync(p, out); }
}
if (check && changed) { console.error("Out of date: " + touched.join(", ") + "\nRun: node tools/sync-partials.js"); process.exit(1); }
console.log(check ? "All pages in sync." : (changed ? "Updated " + touched.join(", ") : "Nothing to update."));
