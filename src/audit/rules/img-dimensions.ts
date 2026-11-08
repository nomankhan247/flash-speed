import { defineRule } from "../types.js";

export default defineRule({
  id: "img-dimensions",
  severity: "error",
  description: "Every <img> has width and height attributes.",
  why: "Without dimensions the browser can't reserve space, so content jumps when the image loads (CLS).",
  check({ doc, report }) {
    for (const img of doc.byName("img")) {
      const style = img.attrs.style ?? "";
      if (/aspect-ratio/i.test(style)) continue;
      if (!img.attrs.width || !img.attrs.height) {
        report(`<img src="${img.attrs.src ?? ""}"> is missing width and/or height`, img);
      }
    }
  },
});
