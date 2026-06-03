# Spencer Ceramics — website

A quiet, photo-led studio site for a Tasmanian potter. Static HTML/CSS/JS — no build step. Designed to host on **Netlify** with checkout handled by **Shopify**.

```
site/
├── index.html        Home (hero, studio intro, selected work)
├── shop.html         Shop (the current edition grid)
├── product.html      Product detail (reads ?id=…)
├── cart.html         Bag / cart summary
├── about.html        Studio / about page
├── journal.html      Journal index (post list)
├── journal-post.html Journal article (reads ?id=…)
├── contact.html      Contact page (Netlify Forms)
├── 404.html          Not-found page (Netlify serves this automatically)
├── css/site.css      All styles + design tokens
├── js/catalog.js     Product list (edit your pieces here)
├── js/journal.js     Journal posts (edit your writing here)
├── js/site.js        Mobile nav + cart logic
├── images/           Placeholder photography (swap these)
└── favicon.svg       SC monogram
```

---

## 1 · Deploy to Netlify (2 minutes)

**Easiest — drag & drop**
1. Go to https://app.netlify.com/drop
2. Drag the **`site`** folder onto the page.
3. It’s live on a `…netlify.app` URL. Done.

**Recommended — Git deploy (so updates auto-publish)**
1. Push this `site/` folder to a GitHub repo.
2. Netlify → *Add new site* → *Import from Git* → pick the repo.
3. Build command: *none*. Publish directory: `site` (or `/` if the repo root *is* the site).
4. Deploy.

**Custom domain:** Netlify → *Domain settings* → add `spencerceramics.com` and follow the DNS steps. HTTPS is automatic.

---

## 2 · Add your own content

**Products** — edit `js/catalog.js`. Each piece:
```js
{ id:"042-01", slug:"tea-bowl-ash", name:"Tea bowl, ash glaze",
  spec:"Ash glaze · stoneware · h. 7cm", price:84,
  state:"available", img:"images/p-teabowl.jpg" }
```
- `state` can be `"available"`, `"1 of 1"`, `"4 of 8"`, or `"sold"` (sold pieces show a tag and can’t be added).
- The Shop, Home teaser, Product page and Related all read from this list — add/remove items in one place.

**Photos** — replace the files in `images/` with your real photography, keeping the names (or update the `img:` paths). Shoot to **4:5 portrait** for product shots; the hero is wide (≈16:10).

**Hero video** — in `index.html`, swap the hero `<img>` for:
```html
<video autoplay muted loop playsinline poster="images/hero.jpg">
  <source src="images/wheel.mp4" type="video/mp4">
</video>
```

**Text** — headlines, studio copy, and footer links are plain HTML in each page; edit directly.

---

## 3 · Connect Shopify (checkout)

The cart in `js/site.js` is a local demo so the flow works immediately. To take real payment, hand off to Shopify — pick one:

**A · Buy Button (simplest)**
1. Shopify admin → *Sales channels* → **Buy Button** → create one per product.
2. Easiest path: link each product’s **“Add to bag”** / **“Checkout”** to the product’s Shopify checkout URL.
3. In `js/site.js`, find the `data-checkout` handler (marked `>>> Replace … <<<`) and set:
   ```js
   window.location.href = "https://YOUR-STORE.myshopify.com/cart/VARIANT_ID:1";
   ```
   (You can also build a multi-item permalink: `/cart/VARIANT1:1,VARIANT2:1`.)

**B · Storefront sync (scales better)**
Use Shopify’s **Buy Button JS SDK** or Storefront API to pull live products/prices and create a real Shopify cart, then redirect to Shopify’s hosted checkout. Map each catalogue `id` to its Shopify variant ID.

Either way, **payment always completes on Shopify’s secure checkout** — never rebuild card handling here.

---

## 4 · Contact form (Netlify Forms)

`contact.html` uses **Netlify Forms** — no backend needed. Once the site is deployed to Netlify it works automatically: submissions appear in your Netlify dashboard under **Forms**, and you can set email notifications there (Forms → Settings → notifications).

- It’s already wired (`data-netlify="true"` + a hidden `form-name` + a honeypot for spam).
- The page shows an on-brand “Thank you” without leaving the page; Netlify still records every submission.
- Update the email address (`studio@spencerceramics.com`) and Instagram handle in `contact.html`.
- Forms only run on the deployed Netlify site, not when opening the file locally.

## 5 · Images — focus points & fast preview (`?edit`)

You don't need to re-deploy to reframe a photo. Add **`?edit`** to any page URL (e.g. `index.html?edit`) to turn on **edit mode**:

- **Set the focal point** — drag on any image; a reticle shows the focus value. This controls what stays in frame when the image crops to fit. Saved instantly (in your browser).
- **Preview a real photo** — drag an image file from your desktop onto any slot. It shows across every page immediately, so you can judge framing before committing. (Preview only — see below.)
- **Export** — click **Export media.js**, then drop the downloaded file into `site/js/` (replacing the old one) and re-deploy. Your focal points are now live for everyone.
- **Reset** clears local previews/focus on your device. **Done** exits edit mode.

Focal points live in `js/media.js` (keyed by slot / product id / post id). Dropped-in previews are **local only** — to publish a new photo, still save the real file into `images/` with the matching name, then re-deploy.

### Faster deploys
- **Connect Git** (recommended): push the `site` folder to GitHub and link it in Netlify. Then every change auto-publishes on push — no more drag-and-drop.
- **Want a real upload UI?** I can add **Decap CMS** (free, Git-based) so you upload photos and edit text from an admin panel in the browser, no code. Ask and I'll wire it in.

## 6 · Notes
- No frameworks, no build. Open `index.html` locally to preview (run a tiny static server if your browser blocks `file://` fetches: `npx serve site`).
- Fonts load from Google Fonts (Jost / Schibsted Grotesk / JetBrains Mono). If you license real **Futura**, add it as a custom font and swap `--disp` in `css/site.css`.
- Design tokens (colours, type, spacing) live at the top of `css/site.css`.
