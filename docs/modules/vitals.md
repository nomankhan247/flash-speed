# Vitals

Measure Core Web Vitals from real visitors, with no dependencies (about 1 KB minified).

```html
<script type="module">
  import { reportWebVitals } from "/js/flash-speed-vitals.js"; // or a CDN like esm.sh
  reportWebVitals({
    beaconUrl: "/api/vitals",              // POSTs JSON with navigator.sendBeacon
    onMetric: (m) => console.log(m),       // { name, value, rating, url, navigationType }
  });
</script>
```

| Metric | Good | Poor |
| --- | --- | --- |
| LCP | ≤ 2.5 s | > 4 s |
| CLS | ≤ 0.1 | > 0.25 |
| INP | ≤ 200 ms | > 500 ms |
| FCP | ≤ 1.8 s | > 3 s |
| TTFB | ≤ 0.8 s | > 1.8 s |

Each metric is reported once, when the page is hidden. Two simplifications compared with Google's [`web-vitals`](https://github.com/GoogleChrome/web-vitals) library: INP uses the slowest interaction rather than the 98th percentile (they're the same on pages with fewer than 50 interactions), and back/forward-cache restores aren't reported as new page views. Use `web-vitals` if you need those.

`rate(name, value)` and `thresholds` are exported for use on the server when you store the beacons.
