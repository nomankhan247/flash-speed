import { defineRule } from "../types.js";
import { has } from "../parser.js";

export default defineRule({
  id: "render-blocking-script",
  severity: "error",
  description: "External scripts in <head> use defer, async or type=\"module\".",
  why: "A plain <script src> in <head> stops the browser from rendering anything until it downloads and runs (FCP, LCP).",
  check({ doc, report }) {
    for (const script of doc.byName("script")) {
      if (!script.inHead || !script.attrs.src) continue;
      const type = (script.attrs.type ?? "").toLowerCase();
      if (type === "module" || (type && !/javascript|^text\/ecmascript$/.test(type))) continue;
      if (!has(script, "defer") && !has(script, "async")) {
        report(`<script src="${script.attrs.src}"> blocks rendering. Add defer (or async if it is independent)`, script);
      }
    }
  },
});
