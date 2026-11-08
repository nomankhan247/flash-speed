import { defineRule } from "../types.js";

export default defineRule({
  id: "font-display",
  severity: "warn",
  description: "Web fonts set font-display (inline @font-face and Google Fonts links).",
  why: "Without font-display, text stays invisible for up to 3 seconds while fonts load (FCP, LCP).",
  check({ doc, report }) {
    for (const style of doc.byName("style")) {
      for (const block of style.text?.match(/@font-face\s*{[^}]*}/gi) ?? []) {
        if (!/font-display\s*:/i.test(block)) report("@font-face without font-display (use swap or optional)", style);
      }
    }
    for (const link of doc.byName("link")) {
      const href = link.attrs.href ?? "";
      if (/fonts\.googleapis\.com\/css/i.test(href) && !/[?&]display=/i.test(href)) {
        report("Google Fonts URL is missing &display=swap", link);
      }
    }
  },
});
