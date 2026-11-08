# Images

Markup for images that don't shift the layout, download the right size and use modern formats.

```js
import { imageTag, pictureTag, imageCdns } from "flash-speed/images";

// Above the fold (the LCP image): eager, fetchpriority="high"
pictureTag({ src: "/img/hero.jpg", alt: "Our team", width: 1600, height: 900, priority: true, sizes: "100vw" });

// Everywhere else: lazy, async decoding
imageTag({ src: "/img/card.jpg", alt: "Card", width: 600, height: 400, sizes: "(min-width: 768px) 33vw, 100vw" });

// With an image CDN
imageTag({ src: "/img/card.jpg", alt: "Card", width: 600, height: 400, url: imageCdns.cloudflare });
```

`width` and `height` are required: they let the browser reserve space (no CLS). `imageAttributes()` returns the same thing as an object, for JSX or templates.

## Image CDNs

| | |
| --- | --- |
| default | `?w=640&fm=avif` query parameters |
| `imageCdns.cloudflare` | `/cdn-cgi/image/width=640,format=avif,quality=80/...` |
| `imageCdns.imgix` | `?w=640&auto=compress&fm=avif` |
| `imageCdns.next` | `/_next/image?url=...&w=640&q=75` |

Any `(src, width, format) => string` function works. Adding builders for more CDNs is a great first contribution.
