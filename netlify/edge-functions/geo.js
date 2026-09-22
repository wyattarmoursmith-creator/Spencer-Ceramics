/* /geo - tells the browser which country it is visiting from, using Netlify's
   built-in geolocation. The site uses it to pick the shopper's currency before
   the catalogue loads. No data is stored; the answer is a two-letter code. */
export default async function (request, context) {
  var code = (context.geo && context.geo.country && context.geo.country.code) || "";
  return new Response(JSON.stringify({ country: code }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
export const config = { path: "/geo" };
