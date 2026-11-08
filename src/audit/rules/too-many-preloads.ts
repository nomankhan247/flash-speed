import { defineRule } from "../types.js";

const MAX_PRELOADS = 5;

export default defineRule({
  id: "too-many-preloads",
  severity: "warn",
  description: `No more than ${MAX_PRELOADS} preload hints per page.`,
  why: "Preloading everything means nothing is prioritised: preloads compete with the LCP image and critical CSS (LCP).",
  check({ doc, report }) {
    const preloads = doc.byName("link").filter((l) => l.attrs.rel?.toLowerCase() === "preload");
    if (preloads.length > MAX_PRELOADS) {
      report(`${preloads.length} preloads found; keep it to the few resources needed for first render`, preloads[MAX_PRELOADS]);
    }
  },
});
