import { defineRule } from "../types.js";
import { originOf } from "../parser.js";

export default defineRule({
  id: "preconnect-origins",
  severity: "info",
  description: "Third-party origins loaded from <head> have a preconnect hint.",
  why: "Each new origin costs a DNS lookup, TCP and TLS handshake. Preconnect starts that work early (FCP, LCP).",
  check({ doc, report }) {
    const hinted = new Set<string>();
    for (const link of doc.byName("link")) {
      const rel = link.attrs.rel?.toLowerCase() ?? "";
      if (rel.includes("preconnect") || rel.includes("dns-prefetch")) {
        const origin = originOf(link.attrs.href);
        if (origin) hinted.add(origin);
      }
    }
    const reported = new Set<string>();
    for (const tag of doc.tags) {
      if (!tag.inHead) continue;
      const url =
        tag.name === "script" ? tag.attrs.src : tag.name === "link" && tag.attrs.rel === "stylesheet" ? tag.attrs.href : undefined;
      const origin = originOf(url);
      if (origin && !hinted.has(origin) && !reported.has(origin)) {
        reported.add(origin);
        report(`Add <link rel="preconnect" href="${origin}"> for ${url}`, tag);
      }
    }
  },
});
