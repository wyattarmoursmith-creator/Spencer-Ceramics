/* Share previews for pages whose content arrives by JavaScript.
   iMessage, Slack, Facebook and friends read the HTML only, so for
   /product?id=… and /journal-post?id=… this fills the title, description,
   image and canonical before the page leaves the edge. Product data comes
   from the same public Storefront token the site uses in the browser. */
const SHOP = { domain: "spencer-ceramics-2.myshopify.com", token: "d1c2f3c092fff343f37ed2e12b6f2e73", version: "2025-10" };
const SITE = "Craig Spencer Ceramics";

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function short(s, n) { s = String(s || "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();   // the site never shows em dashes return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }

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
  let html;
  try { html = await res.text(); } catch (e) { return res; }
  // plain string edits on the head: small, predictable, no parser dependency at the edge
  const setMeta = (attr, key, value) => {
    const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`, "i");
    const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`;
    if (re.test(html)) html = html.replace(re, tag); else html = html.replace(/<\/head>/i, tag + "\n</head>");
  };
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(meta.title)}</title>`);
  setMeta("name", "description", meta.description);
  setMeta("property", "og:title", meta.title);
  setMeta("property", "og:description", meta.description);
  setMeta("property", "og:url", pageUrl);
  if (meta.image) { setMeta("property", "og:image", meta.image); setMeta("name", "twitter:image", meta.image); }
  const canon = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i;
  const canonTag = `<link rel="canonical" href="${esc(pageUrl)}" />`;
  html = canon.test(html) ? html.replace(canon, canonTag) : html.replace(/<\/head>/i, canonTag + "\n</head>");
  const headers = new Headers(res.headers); headers.delete("content-length");
  return new Response(html, { status: res.status, headers });
}
export const config = { path: ["/product", "/product.html", "/journal-post", "/journal-post.html"] };
