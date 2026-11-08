# Audit

Static speed checks for HTML. It runs on your build output (or any HTML string) without a browser, so it's fast enough for every commit.

```bash
npx flash-speed audit dist                 # a folder: every .html file in it
npx flash-speed audit dist/index.html      # one file
npx flash-speed audit dist --json          # machine-readable
npx flash-speed audit dist --fail-on warn  # exit 1 on warnings too
npx flash-speed rules                      # list the rules
```

## API

```js
import { auditHtml, auditPath } from "flash-speed/audit";

const findings = auditHtml(html, { rules: { "modern-image-formats": "off" } });
// [{ rule: "img-dimensions", severity: "error", message: "...", line: 12 }]

const all = await auditPath("dist"); // each finding also has `file`
```

| Option | |
| --- | --- |
| `rules` | `{ [ruleId]: "error" \| "warn" \| "info" \| "off" }` |
| `extraRules` | Your own rules, made with `defineRule` (see [writing a rule](../writing-a-rule.md)) |

## What it can't see

The audit reads HTML; it does not load the page. It can't measure real LCP, find which image is actually largest on screen, or see markup added by JavaScript. Use it alongside Lighthouse or [Vitals](vitals.md) data from real visitors. Rules that guess (such as "images after the third are below the fold") are `warn` or `info` for this reason.
