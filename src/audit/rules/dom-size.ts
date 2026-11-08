import { defineRule } from "../types.js";

const MAX_ELEMENTS = 1500;
const MAX_HTML_BYTES = 150 * 1024;

export default defineRule({
  id: "dom-size",
  severity: "warn",
  description: `Pages stay under ${MAX_ELEMENTS} elements and ${MAX_HTML_BYTES / 1024} KB of HTML.`,
  why: "Large DOMs make style recalculation and layout slow on every interaction (INP) and delay parsing (FCP).",
  check({ doc, report }) {
    if (doc.elementCount > MAX_ELEMENTS) report(`${doc.elementCount} elements (aim for under ${MAX_ELEMENTS})`);
    const bytes = Buffer.byteLength(doc.source);
    if (bytes > MAX_HTML_BYTES) report(`HTML is ${Math.round(bytes / 1024)} KB uncompressed (aim for under ${MAX_HTML_BYTES / 1024} KB)`);
  },
});
