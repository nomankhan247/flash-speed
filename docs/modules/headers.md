# Headers

Correct `Cache-Control` values, and header configs for each host.

## Presets

```js
import { cachePresets, cacheControl } from "flash-speed/headers";

cachePresets.immutable; // "public, max-age=31536000, immutable": fingerprinted files like app.3f9a1c.js
cachePresets.static;    // files without a hash in the name: a day, then stale-while-revalidate
cachePresets.html;      // pages: browsers revalidate, CDNs cache 10 min and serve stale while refreshing
cachePresets.api;       // short shared caching for public API responses
cachePresets.private;   // logged-in pages
cachePresets.noStore;   // tokens, checkout

cacheControl({ maxAge: 3600, staleWhileRevalidate: 86400 }); // build your own
```

Only use `immutable` on URLs whose content never changes: if you overwrite `logo.png` in place, visitors keep the old one for a year.

## Config files

```bash
npx flash-speed headers --format cloudflare --assets /_astro > public/_headers
npx flash-speed headers --format netlify    --assets /assets > public/_headers
npx flash-speed headers --format vercel     # paste the "headers" array into vercel.json
npx flash-speed headers --format nginx      # location blocks for your server block
npx flash-speed headers --format apache     # for .htaccess (needs mod_headers)
```

`--assets` is the folder your bundler writes hashed files to: `/_astro` (Astro), `/_next/static` (Next.js), `/assets` (Vite).

Cloudflare Pages and Netlify combine every matching `_headers` rule, so the `/*` rule there leaves out `Cache-Control` and HTML gets the platform's default (always revalidate). The other formats include the HTML policy.

## API

```js
import { recommendedRules, toHeadersFile, toVercelHeaders, toNginx, toHtaccess, headersFor } from "flash-speed/headers";

const rules = [...recommendedRules({ assetsDir: "/static" }), { path: "/api/*", headers: { "Cache-Control": "no-store" } }];
headersFor("/static/app.js", rules); // use in your own server or middleware
```
