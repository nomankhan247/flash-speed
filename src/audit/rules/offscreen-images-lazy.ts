import { defineRule } from "../types.js";

/** Images after this many are assumed to be below the fold. */
const ABOVE_THE_FOLD = 3;

export default defineRule({
  id: "offscreen-images-lazy",
  severity: "warn",
  description: "Images further down the page use loading=\"lazy\".",
  why: "Downloading images nobody has scrolled to yet competes with the images and scripts that matter (LCP, bandwidth).",
  check({ doc, report }) {
    const images = doc.byName("img").filter((img) => !img.inHead);
    for (const img of images.slice(ABOVE_THE_FOLD)) {
      if (!img.attrs.loading) report(`<img src="${img.attrs.src ?? ""}"> could use loading="lazy"`, img);
    }
  },
});
