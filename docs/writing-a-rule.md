# Writing an audit rule

A rule is a small file in `src/audit/rules/` that looks at parsed HTML and reports problems. This guide walks through adding one. It takes about 15 minutes.

## 1. Pick a problem

Good rules:

- catch a mistake that measurably hurts a Core Web Vital (LCP, CLS, INP, FCP or TTFB),
- can be seen in the HTML alone,
- are almost never wrong when they fire.

Example: `<script>` tags that use `document.write` block the parser.

## 2. Create the file

`src/audit/rules/no-document-write.ts`:

```ts
import { defineRule } from "../types.js";

export default defineRule({
  id: "no-document-write",
  severity: "warn",
  description: "Inline scripts don't call document.write().",
  why: "document.write blocks the HTML parser, and Chrome blocks it on slow connections (FCP, LCP).",
  check({ doc, report }) {
    for (const script of doc.byName("script")) {
      if (/document\.write\s*\(/.test(script.text ?? "")) {
        report("document.write() in an inline script: insert elements with the DOM instead", script);
      }
    }
  },
});
```

What the rule gets:

| | |
| --- | --- |
| `doc.tags` | Every start tag in order |
| `doc.byName("img")` | Tags with one name |
| `tag.attrs` | Attributes, lower-case names (`tag.attrs.loading`) |
| `has(tag, "defer")` | Whether an attribute is present (for boolean attributes) |
| `tag.inHead` | `true` before `</head>` |
| `tag.ancestors` | Open parent elements, e.g. `["html", "body", "picture"]` |
| `tag.text` | Raw contents of `<script>` and `<style>` |
| `tag.line` | Line number (passing the tag to `report` adds it) |
| `originOf(url)` | The origin of an absolute URL, or `undefined` |

Choose the severity carefully:

- `error`: definitely slow, easy to fix (fails CI by default)
- `warn`: usually slow
- `info`: a suggestion that may not apply to every site

## 3. Register it

Add an import and an entry to `src/audit/rules/index.ts`, keeping both lists alphabetical.

## 4. Test it

Add tests to `test/audit.test.js`, one that triggers the rule and one that doesn't:

```js
test("no-document-write", () => {
  const flagged = auditHtml("<script>document.write('<p>hi</p>')</script>");
  assert.ok(flagged.some((f) => f.rule === "no-document-write"));
  const clean = auditHtml("<script>document.body.append('hi')</script>");
  assert.ok(!clean.some((f) => f.rule === "no-document-write"));
});
```

If the slow example in `examples/plain-html/index.html` should trigger your rule, add the bad pattern there and add the rule id to the list in the "slow example" test. Make sure `fast.html` still has no findings.

## 5. Document and send it

- Add a row to the rules table in `README.md`.
- Run `npm test`.
- Open a pull request with a link that backs up the `why`.

## Custom rules in your own project

You don't need to send a rule upstream to use it. Pass it to the API:

```js
import { auditPath, defineRule } from "flash-speed/audit";

const noJquery = defineRule({
  id: "no-jquery",
  severity: "warn",
  description: "No jQuery",
  why: "We use the DOM directly",
  check({ doc, report }) {
    for (const s of doc.byName("script")) if (/jquery/i.test(s.attrs.src ?? "")) report("jQuery found", s);
  },
});

const findings = await auditPath("dist", { extraRules: [noJquery] });
```
