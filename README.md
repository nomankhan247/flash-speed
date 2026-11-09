# Flash Speed ⚡

Flash Speed is a free, open-source web performance toolkit you can drop into any new project. It has no runtime dependencies and works with any framework: plain HTML, Astro, Next.js, Eleventy, WordPress themes or anything that ships HTML.

- **Find what makes pages slow:** `flash-speed audit` checks your built HTML for the mistakes that hurt Core Web Vitals (render-blocking scripts, lazy-loaded hero images, images without dimensions, missing font-display and more), with the reason and the fix for each.
- **Keep it fast:** `flash-speed budget` fails CI when JavaScript, CSS, images or fonts grow past your limits, measured compressed the way browsers download them.
- **Ship the right defaults:** generate correct cache headers for Cloudflare Pages, Netlify, Vercel, Nginx or Apache, and emit resource hints, responsive images and lightweight video embeds from one small library.
- **Measure real users:** a ~1 KB Core Web Vitals reporter (LCP, CLS, INP, FCP, TTFB) that beacons to your own endpoint.
- **Built by the community:** each audit rule is one small file. [Add one](docs/writing-a-rule.md) and every project using Flash Speed gets faster.
- **Free and open source** ([MIT](LICENSE)).

## Quick start

Run an audit on your build output, no install needed:

```bash
npx flash-speed audit dist
```

Add it to a project so CI can run it:

```bash
npm install --save-dev flash-speed
```

```jsonc
// package.json
{
  "scripts": {
    "perf": "flash-speed audit dist && flash-speed budget dist"
  }
}
```

Try it on the included examples (one slow page, one fast page):

```bash
npx flash-speed audit examples/plain-html
```

## Modules

| Module | Import | What it does |
| --- | --- | --- |
| [Audit](docs/modules/audit.md) | `flash-speed/audit` | Static speed checks for HTML, as a CLI or an API, with your own rules (Node.js) |
| [Budget](docs/modules/budget.md) | `flash-speed/budget` | Size limits for build output, gzip and brotli measured (Node.js) |
| [Headers](docs/modules/headers.md) | `flash-speed/headers` | Cache-Control presets and header configs for every major host |
| [Hints](docs/modules/hints.md) | `flash-speed/hints` | Preconnect, preload and `Link` headers for 103 Early Hints |
| [Images](docs/modules/images.md) | `flash-speed/images` | `<img>` and `<picture>` markup with srcset, AVIF/WebP and no layout shift |
| [Embeds](docs/modules/embeds.md) | `flash-speed/embeds` | Click-to-load YouTube facade and lazy iframes |
| [Vitals](docs/modules/vitals.md) | `flash-speed/vitals` | Core Web Vitals reporting from real visitors (browser) |

Everything except Audit and Budget runs anywhere: the browser, Node, Deno, Bun or edge workers.

## Audit rules

Run `npx flash-speed rules` for the current list.

| Rule | Default | Moves |
| --- | --- | --- |
| `render-blocking-script` | error | FCP, LCP |
| `lcp-image-not-lazy` | error | LCP |
| `img-dimensions` | error | CLS |
| `font-preload-crossorigin` | error | LCP |
| `viewport-meta` | error | INP |
| `font-display` | warn | FCP, LCP |
| `offscreen-images-lazy` | warn | LCP |
| `iframe-lazy` | warn | LCP, INP |
| `css-import` | warn | FCP |
| `too-many-preloads` | warn | LCP |
| `dom-size` | warn | INP |
| `preconnect-origins` | info | FCP, LCP |
| `modern-image-formats` | info | LCP |

Turn rules off or change their level in `flash-speed.config.json`:

```json
{
  "audit": {
    "failOn": "error",
    "rules": { "modern-image-formats": "off", "offscreen-images-lazy": "error" }
  },
  "budget": { "js": 150000, "css": 40000, "maxFile": 300000 }
}
```

## Using the library

```js
import { cachePresets, hintTags, preconnect, preloadFont, pictureTag, youtubeFacade, facadeScript } from "flash-speed";

// <head>
const head = hintTags([...preconnect(["https://cdn.example.com"]), preloadFont("/fonts/inter.woff2")]);

// Hero image: eager, high priority, AVIF/WebP, no layout shift
const hero = pictureTag({ src: "/img/hero.jpg", alt: "Our team", width: 1600, height: 900, priority: true });

// A YouTube video that costs nothing until someone presses play
const video = youtubeFacade({ id: "dQw4w9WgXcQ", title: "Product tour" }) + facadeScript;

// Server: Cache-Control for fingerprinted assets
response.headers.set("Cache-Control", cachePresets.immutable);
```

Generate a headers file for your host:

```bash
npx flash-speed headers --format cloudflare --assets /_astro > public/_headers
```

Report Core Web Vitals from real visitors:

```html
<script type="module">
  import { reportWebVitals } from "https://esm.sh/flash-speed/vitals";
  reportWebVitals({ beaconUrl: "/api/vitals" });
</script>
```

## In CI

A ready-made GitHub Actions job is in [docs/ci.md](docs/ci.md).

## Contributing

Flash Speed is built so that anyone can add to it. New audit rules, URL builders for more image CDNs, header presets for more hosts, framework guides and bug reports are all welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get set up, and see issues labelled [`good first issue`](https://github.com/nomankhan247/flash-speed/labels/good%20first%20issue).

## Maintainers

Flash Speed was created and is maintained by [Noman Khan](https://github.com/nomankhan247), Founder & CEO of [fyme.agency](https://fyme.agency).

## License

[MIT](LICENSE) © Noman Khan ([fyme.agency](https://fyme.agency)) and Flash Speed contributors
