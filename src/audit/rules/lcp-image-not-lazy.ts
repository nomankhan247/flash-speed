import { defineRule } from "../types.js";

export default defineRule({
  id: "lcp-image-not-lazy",
  severity: "error",
  description: "The first image in <body> is not lazy-loaded.",
  why: "The first image is usually the Largest Contentful Paint. loading=\"lazy\" delays it until layout is done (LCP).",
  check({ doc, report }) {
    const first = doc.byName("img").find((img) => !img.inHead);
    if (first && first.attrs.loading?.toLowerCase() === "lazy") {
      report(
        `The first image (${first.attrs.src ?? "no src"}) is loading="lazy". Use loading="eager" fetchpriority="high" instead`,
        first,
      );
    }
  },
});
