/**
 * Resource hints: preconnect, dns-prefetch, preload, modulepreload and prefetch,
 * as HTML `<link>` tags or as an HTTP `Link` header (which CDNs can turn into 103 Early Hints).
 */

export type HintRel = "preconnect" | "dns-prefetch" | "preload" | "modulepreload" | "prefetch";

export type PreloadAs = "script" | "style" | "font" | "image" | "fetch" | "document" | "track" | "video" | "audio";

export interface ResourceHint {
  rel: HintRel;
  href: string;
  /** Required for `preload`. */
  as?: PreloadAs;
  /** MIME type, e.g. `font/woff2` or `image/avif`. */
  type?: string;
  /** Set for fonts and any cross-origin fetch that uses CORS. */
  crossorigin?: boolean | "anonymous" | "use-credentials";
  /** `high` for the LCP image or critical CSS; `low` for things that can wait. */
  fetchpriority?: "high" | "low" | "auto";
  /** Responsive image preloads. */
  imagesrcset?: string;
  imagesizes?: string;
  media?: string;
}

export function validateHint(hint: ResourceHint): void {
  if (!hint.href) throw new TypeError("Resource hint needs an href");
  if (hint.rel === "preload" && !hint.as) throw new TypeError(`preload of ${hint.href} needs an "as" value`);
  if (hint.as === "font" && !hint.crossorigin) {
    throw new TypeError(`Font preload of ${hint.href} must set crossorigin, or the browser downloads it twice`);
  }
}

/** Render one hint as an HTML `<link>` tag. */
export function hintTag(hint: ResourceHint): string {
  validateHint(hint);
  const attrs: string[] = [`rel="${hint.rel}"`, `href="${escapeAttr(hint.href)}"`];
  if (hint.as) attrs.push(`as="${hint.as}"`);
  if (hint.type) attrs.push(`type="${escapeAttr(hint.type)}"`);
  if (hint.crossorigin) attrs.push(hint.crossorigin === true ? "crossorigin" : `crossorigin="${hint.crossorigin}"`);
  if (hint.fetchpriority) attrs.push(`fetchpriority="${hint.fetchpriority}"`);
  if (hint.imagesrcset) attrs.push(`imagesrcset="${escapeAttr(hint.imagesrcset)}"`);
  if (hint.imagesizes) attrs.push(`imagesizes="${escapeAttr(hint.imagesizes)}"`);
  if (hint.media) attrs.push(`media="${escapeAttr(hint.media)}"`);
  return `<link ${attrs.join(" ")}>`;
}

/** Render many hints, de-duplicated and ordered so connections open first. */
export function hintTags(hints: ResourceHint[]): string {
  return sortHints(dedupe(hints)).map(hintTag).join("\n");
}

/** Render hints as a single HTTP `Link` header value. */
export function linkHeader(hints: ResourceHint[]): string {
  return sortHints(dedupe(hints))
    .map((hint) => {
      validateHint(hint);
      const params = [`rel=${hint.rel}`];
      if (hint.as) params.push(`as=${hint.as}`);
      if (hint.type) params.push(`type="${hint.type}"`);
      if (hint.crossorigin) params.push(hint.crossorigin === true ? "crossorigin" : `crossorigin=${hint.crossorigin}`);
      if (hint.fetchpriority) params.push(`fetchpriority=${hint.fetchpriority}`);
      return `<${encodeURI(hint.href)}>; ${params.join("; ")}`;
    })
    .join(", ");
}

/** Preconnect (plus dns-prefetch fallback) for third-party origins you use early, e.g. a font or image CDN. */
export function preconnect(origins: string[], options: { crossorigin?: boolean } = {}): ResourceHint[] {
  return origins.flatMap((origin) => {
    const href = new URL(origin).origin;
    return [
      { rel: "preconnect" as const, href, ...(options.crossorigin ? { crossorigin: true } : {}) },
      { rel: "dns-prefetch" as const, href },
    ];
  });
}

/** Preload a WOFF2 font. */
export function preloadFont(href: string): ResourceHint {
  return { rel: "preload", href, as: "font", type: "font/woff2", crossorigin: true };
}

/** Preload the Largest Contentful Paint image at high priority. */
export function preloadLcpImage(href: string, options: { srcset?: string; sizes?: string; type?: string } = {}): ResourceHint {
  return {
    rel: "preload",
    href,
    as: "image",
    fetchpriority: "high",
    ...(options.type ? { type: options.type } : {}),
    ...(options.srcset ? { imagesrcset: options.srcset } : {}),
    ...(options.sizes ? { imagesizes: options.sizes } : {}),
  };
}

const ORDER: Record<HintRel, number> = { preconnect: 0, "dns-prefetch": 1, preload: 2, modulepreload: 3, prefetch: 4 };

function sortHints(hints: ResourceHint[]): ResourceHint[] {
  return [...hints].sort((a, b) => {
    const byRel = ORDER[a.rel] - ORDER[b.rel];
    if (byRel !== 0) return byRel;
    return (a.fetchpriority === "high" ? 0 : 1) - (b.fetchpriority === "high" ? 0 : 1);
  });
}

function dedupe(hints: ResourceHint[]): ResourceHint[] {
  const seen = new Set<string>();
  return hints.filter((hint) => {
    const key = `${hint.rel}|${hint.href}|${hint.as ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
