# Hints

Resource hints tell the browser what it will need before it finds out on its own.

```js
import { hintTags, linkHeader, preconnect, preloadFont, preloadLcpImage } from "flash-speed/hints";

const hints = [
  ...preconnect(["https://images.example-cdn.com"]),
  preloadFont("/fonts/inter-var.woff2"),
  preloadLcpImage("/img/hero-1200.avif", { type: "image/avif" }),
];

hintTags(hints);   // <link> tags for <head>
linkHeader(hints); // an HTTP Link header; Cloudflare and others turn it into 103 Early Hints
```

Hints are de-duplicated and ordered (preconnect, then preload, high priority first). Mistakes that make a hint useless throw an error: a `preload` with no `as`, or a font preload without `crossorigin`.

Use them sparingly: preconnect only to origins needed for the first render (2–4 at most), and preload only the LCP image and the fonts used above the fold.
