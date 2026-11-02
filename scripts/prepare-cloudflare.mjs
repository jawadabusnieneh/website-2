import { access, rm } from "node:fs/promises";

// Cloudflare handles SPA fallback natively. The Netlify wildcard rewrite
// must not intercept JavaScript, stylesheets or image requests on Cloudflare.
await access(new URL("../dist/index.html", import.meta.url));
await rm(new URL("../dist/_redirects", import.meta.url), { force: true });
console.log("Cloudflare assets ready in dist; native SPA fallback enabled.");
