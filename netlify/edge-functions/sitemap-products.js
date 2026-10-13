/* A live sitemap of the pieces, read from the same public Storefront token the site uses.
   Products come and go with every firing, so the list is generated on request rather than
   committed. robots.txt points search engines here alongside the static sitemap. */
const SHOP = { domain: "spencer-ceramics-2.myshopify.com", token: "d1c2f3c092fff343f37ed2e12b6f2e73", version: "2026-07" };

export default async function (request) {
  const origin = new URL(request.url).origin;
  let handles = [], after = null;
  try {
    for (let i = 0; i < 8; i++) {
      const q = `query($after:String){ products(first:250, after:$after, query:"status:active") { pageInfo { hasNextPage endCursor } edges { node { handle updatedAt } } } }`;
      const r = await fetch(`https://${SHOP.domain}/api/${SHOP.version}/graphql.json`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": SHOP.token },
        body: JSON.stringify({ query: q, variables: { after } })
      });
      const j = await r.json(); const p = j && j.data && j.data.products; if (!p) break;
      handles = handles.concat(p.edges.map((e) => e.node));
      if (!p.pageInfo.hasNextPage) break; after = p.pageInfo.endCursor;
    }
  } catch (e) { /* an empty sitemap beats a 500 */ }
  const esc = (s) => String(s).replace(/&/g, "&amp;");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    handles.map((h) => `  <url><loc>${esc(origin)}/product.html?id=${esc(h.handle)}</loc><lastmod>${esc((h.updatedAt || "").slice(0, 10))}</lastmod><priority>0.7</priority></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

export const config = { path: "/sitemap-products.xml" };
