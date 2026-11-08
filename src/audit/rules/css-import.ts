import { defineRule } from "../types.js";

export default defineRule({
  id: "css-import",
  severity: "warn",
  description: "Inline styles don't use @import.",
  why: "@import makes stylesheets load one after another instead of in parallel, delaying first render (FCP).",
  check({ doc, report }) {
    for (const style of doc.byName("style")) {
      if (/@import\s/i.test(style.text ?? "")) report("@import in <style>: use <link rel=\"stylesheet\"> instead", style);
    }
  },
});
