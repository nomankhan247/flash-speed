import { defineRule } from "../types.js";

export default defineRule({
  id: "viewport-meta",
  severity: "error",
  description: "The page has <meta name=\"viewport\">.",
  why: "Without it phones render a 980px desktop layout and zoom out, and tap handling is slower (INP, mobile usability).",
  check({ doc, report }) {
    if (!doc.byName("html").length && !doc.byName("head").length) return; // a fragment, not a page
    const ok = doc.byName("meta").some((m) => m.attrs.name?.toLowerCase() === "viewport");
    if (!ok) report('Missing <meta name="viewport" content="width=device-width, initial-scale=1">');
  },
});
