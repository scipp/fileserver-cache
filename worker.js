/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
const CACHE_TTL = 60 * 60 * 24;

export default {
  async fetch(request, env, ctx) {
    const cache = caches.default;
    const url = new URL(request.url);
    const targetUrl = 'https://public.esss.dk/' + url.pathname.substring(1);

    // First, make a HEAD request to check the last-modified header
    const headResponse = await fetch(targetUrl, { method: "HEAD" });
    const lastModified = headResponse.headers.get("last-modified");
  
    if (lastModified) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        const cachedLastModified = cachedResponse.headers.get("last-modified");
        if (cachedLastModified && new Date(lastModified) <= new Date(cachedLastModified)) {
          console.log("Cache hit");
          return cachedResponse;
        }
      }
    }
    console.log("Cache miss");

    console.log("Fetching", targetUrl);
    let response = await fetch(targetUrl, { cf: { cacheTtl: CACHE_TTL, cacheEverything: true } });

    if (response.ok) {
      console.log("Status ok", targetUrl);
      response = new Response(response.body, response);
      response.headers.append("Cache-Control", `public, max-age=${CACHE_TTL}`);
      console.log("Adding to cache", targetUrl);
      ctx.waitUntil(cache.put(request, response.clone()));
    }
  
    console.log("Returning response", targetUrl);
    return response;
  },
};
