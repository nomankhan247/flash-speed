import { defineRule } from "../types.js";

export default defineRule({
  id: "iframe-lazy",
  severity: "warn",
  description: "Iframes use loading=\"lazy\" (or a click-to-load facade).",
  why: "Embeds like YouTube and maps pull in hundreds of KB of script on page load (LCP, INP).",
  check({ doc, report }) {
    for (const iframe of doc.byName("iframe")) {
      if (iframe.attrs.loading?.toLowerCase() !== "lazy") {
        report(`<iframe src="${iframe.attrs.src ?? ""}"> should use loading="lazy" or a facade`, iframe);
      }
    }
  },
});
