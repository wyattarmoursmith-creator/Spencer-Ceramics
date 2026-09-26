/* Share previews for pages whose content arrives by JavaScript.
   iMessage, Slack, Facebook and friends read the HTML only, so for
   /product?id=… and /journal-post?id=… this fills the title, description,
   image and canonical before the page leaves the edge. Product data comes
   from the same public Storefront token the site uses in the browser. */
const SHOP = { domain: "spencer-ceramics-2.myshopify.com", token: "d1c2f3c092fff343f37ed2e12b6f2e73", version: "2025-10" };
const SITE = "Craig Spencer Ceramics";

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function short(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }

async function productMeta(handle) {
  const q = `{ productByHandle(handle: ${JSON.stringify(handle)}) { title description featuredImage { url } availableForSale priceRange { minVariantPrice { amount currencyCode } } } }`;
  const r = await fetch(`https://${SHOP.domain}/api/${SHOP.version}/graphql.json`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": SHOP.token }, body: JSON.stringify({ query: q })
  });
  const j = await r.json(); const p = j && j.data && j.data.productByHandle;
  if (!p) return null;
  const price = p.priceRange && p.priceRange.minVariantPrice;
  const img = p.featuredImage && p.featuredImage.url ? p.featuredImage.url + (p.featuredImage.url.includes("?") ? "&" : "?") + "width=1200" : null;
  const firstPara = (p.description || "").split(/\n|FINISH|CARE/)[0];
  return {
    title: `${p.title} · ${SITE}`,
    description: short(firstPara || `${p.title}, a hand-thrown piece by Craig Spencer.`, 155) + (price ? ` ${Math.round(parseFloat(price.amount))} ${price.currencyCode}.` : "") + (p.availableForSale ? "" : " Sold."),
    image: img, type: "product"
  };
}

async function postMeta(id, origin) {
  const r = await fetch(`${origin}/content/journal.json`); const j = await r.json();
  const p = (j.posts || []).find((x) => x.id === id);
  if (!p) return null;
  return { title: `${p.title} · ${SITE} · Journal`, description: short(p.excerpt || p.body, 155), image: p.img ? `${origin}/${p.img.replace(/^\//, "")}` : null, type: "article" };
}

export default async function (request, context) {
  const url = new URL(request.url); const id = url.searchParams.get("id");
  const res = await context.next();
  if (!id) return res;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return res;
  let meta = null;
  try { meta = url.pathname.startsWith("/product") ? await productMeta(id) : await postMeta(id, url.origin); } catch (e) { meta = null; }
  if (!meta) return res;
  const isProduct = url.pathname.startsWith("/product");
  const pageUrl = `${url.origin}${isProduct ? "/product.html" : "/journal-post.html"}?id=${encodeURIComponent(id)}`;
  const seen = {};
  const set = (attr) => ({ element(el) { el.setAttribute("content", meta[attr] || el.getAttribute("content")); } });
  return new HTMLRewriter()
    .on("title", { element(el) { el.setInnerContent(meta.title); } })
    .on('meta[name="description"]', set("description"))
    .on('meta[property="og:title"]', { element(el) { seen.ogt = 1; el.setAttribute("content", meta.title); } })
    .on('meta[property="og:description"]', { element(el) { seen.ogd = 1; el.setAttribute("content", meta.description); } })
    .on('meta[property="og:image"]', { element(el) { if (meta.image) el.setAttribute("content", meta.image); } })
    .on('meta[property="og:url"]', { element(el) { seen.ogu = 1; el.setAttribute("content", pageUrl); } })
    .on('link[rel="canonical"]', { element(el) { seen.canon = 1; el.setAttribute("href", pageUrl); } })
    .on("head", { element(el) {
      el.onEndTag((end) => {
        let extra = "";
        if (!seen.ogt) extra += `<meta property="og:title" content="${esc(meta.title)}" />`;
        if (!seen.ogd) extra += `<meta property="og:description" content="${esc(meta.description)}" />`;
        if (!seen.ogu) extra += `<meta property="og:url" content="${esc(pageUrl)}" />`;
        if (!seen.canon) extra += `<link rel="canonical" href="${esc(pageUrl)}" />`;
        if (meta.image) extra += `<meta name="twitter:image" content="${esc(meta.image)}" />`;
        if (extra) end.before(extra, { html: true });
      });
    } })
    .transform(res);
}
export const config = { path: ["/product", "/product.html", "/journal-post", "/journal-post.html"] };
