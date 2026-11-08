import { defineRule } from "../types.js";

export default defineRule({
  id: "modern-image-formats",
  severity: "info",
  description: "JPEG/PNG/GIF images are offered as AVIF or WebP too.",
  why: "AVIF and WebP are typically 25–50% smaller than JPEG and PNG at the same quality (LCP, bandwidth).",
  check({ doc, report }) {
    for (const img of doc.byName("img")) {
      const src = (img.attrs.src ?? "").split(/[?#]/)[0] ?? "";
      if (!/\.(jpe?g|png|gif)$/i.test(src)) continue;
      if (img.ancestors.includes("picture")) continue;
      if (/\.(avif|webp)/i.test(img.attrs.srcset ?? "")) continue;
      report(`${src} is ${src.split(".").pop()?.toUpperCase()}; serve AVIF/WebP via <picture> or an image CDN`, img);
    }
  },
});
