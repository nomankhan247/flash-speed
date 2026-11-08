# Budget

Performance budgets for a build folder. Text files (JS, CSS, HTML, SVG) are measured brotli-compressed, binary files at their real size, because that's what visitors download. Source maps and `.gz`/`.br` copies are ignored.

```bash
npx flash-speed budget dist
npx flash-speed budget dist --json
```

## Defaults

| Limit | Default | |
| --- | --- | --- |
| `js` | 170 KB | All JavaScript, compressed |
| `css` | 50 KB | All CSS, compressed |
| `html` | 100 KB | All HTML, compressed |
| `image` | 1.5 MB | All images |
| `font` | 150 KB | All fonts |
| `total` | 2 MB | Everything |
| `maxFile` | 500 KB | Any single file |

The totals cover the whole folder, not one page, so a big site will want higher totals and the same `maxFile`. Set limits in bytes in `flash-speed.config.json`:

```json
{ "budget": { "js": 120000, "image": 5000000, "maxFile": 250000 } }
```

## API

```js
import { checkBudget } from "flash-speed/budget";

const { passed, totals, violations, assets } = await checkBudget("dist", { js: 120_000 });
```
