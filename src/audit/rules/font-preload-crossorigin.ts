import { defineRule } from "../types.js";
import { has } from "../parser.js";

export default defineRule({
  id: "font-preload-crossorigin",
  severity: "error",
  description: "Font preloads include the crossorigin attribute.",
  why: "Fonts are always fetched in CORS mode. A preload without crossorigin is wasted and the font downloads twice.",
  check({ doc, report }) {
    for (const link of doc.byName("link")) {
      if (link.attrs.rel?.toLowerCase() === "preload" && link.attrs.as === "font" && !has(link, "crossorigin")) {
        report(`Font preload ${link.attrs.href ?? ""} needs crossorigin`, link);
      }
    }
  },
});
