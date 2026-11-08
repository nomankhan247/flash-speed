/**
 * Images: fast, layout-shift-free `<img>` and `<picture>` markup.
 * Works with any image CDN through a URL builder function.
 */

import { escapeAttr } from "./hints.js";

/** Builds the URL for one width (and format) of an image. */
export type ImageUrlBuilder = (src: string, width: number, format?: ImageFormat) => string;

export type ImageFormat = "avif" | "webp" | "jpeg" | "png";

export interface ResponsiveImageOptions {
  src: string;
  alt: string;
  /** Intrinsic width and height. Required: they prevent layout shift (CLS). */
  width: number;
  height: number;
  /** Widths to generate. Defaults to a spread up to 2x the intrinsic width. */
  widths?: number[];
  /** The `sizes` attribute, e.g. `(min-width: 768px) 50vw, 100vw`. Default `100vw`. */
  sizes?: string;
  /** Set `true` for the LCP / above-the-fold image: loads eagerly at high priority. */
  priority?: boolean;
  /** Builds a URL per width. Defaults to `?w=<width>` (works with many CDNs). */
  url?: ImageUrlBuilder;
  /** Extra formats to offer through `<picture>`, best first. e.g. `["avif", "webp"]`. */
  formats?: ImageFormat[];
  className?: string;
}

export const defaultUrlBuilder: ImageUrlBuilder = (src, width, format) => {
  const [base, query = ""] = src.split("?");
  const params = new URLSearchParams(query);
  params.set("w", String(width));
  if (format) params.set("fm", format);
  return `${base}?${params.toString()}`;
};

/** URL builders for popular image CDNs. */
export const imageCdns = {
  /** Cloudflare Images / Image Resizing (`/cdn-cgi/image/...`). */
  cloudflare: ((src, width, format) =>
    `/cdn-cgi/image/width=${width},format=${format ?? "auto"},quality=80${src.startsWith("/") ? "" : "/"}${src}`) as ImageUrlBuilder,
  /** imgix and Cloudinary-style `?w=&fm=&auto=` query APIs. */
  imgix: ((src, width, format) => {
    const url = new URL(src, "http://x");
    url.searchParams.set("w", String(width));
    url.searchParams.set("auto", "compress");
    if (format) url.searchParams.set("fm", format);
    return src.startsWith("http") ? url.toString() : url.pathname + url.search;
  }) as ImageUrlBuilder,
  /** Next.js `/_next/image` endpoint. */
  next: ((src, width) => `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`) as ImageUrlBuilder,
} as const;

/** Pick sensible srcset widths for an image of a given intrinsic width. */
export function defaultWidths(intrinsicWidth: number): number[] {
  const candidates = [320, 480, 640, 768, 960, 1200, 1600, 2000, 2560];
  const max = Math.max(intrinsicWidth, 320);
  const widths = candidates.filter((w) => w <= max);
  if (!widths.includes(intrinsicWidth) && intrinsicWidth >= 320) widths.push(intrinsicWidth);
  return widths.sort((a, b) => a - b);
}

export function srcset(src: string, widths: number[], url: ImageUrlBuilder = defaultUrlBuilder, format?: ImageFormat): string {
  return widths.map((w) => `${url(src, w, format)} ${w}w`).join(", ");
}

/** The attributes for a fast `<img>` (useful for JSX or templating). */
export function imageAttributes(options: ResponsiveImageOptions): Record<string, string> {
  if (!(options.width > 0 && options.height > 0)) {
    throw new TypeError(`Image ${options.src} needs a positive width and height to avoid layout shift`);
  }
  const url = options.url ?? defaultUrlBuilder;
  const widths = options.widths ?? defaultWidths(options.width);
  const largest = widths[widths.length - 1] ?? options.width;
  const attrs: Record<string, string> = {
    src: url(options.src, Math.min(largest, options.width)),
    srcset: srcset(options.src, widths, url),
    sizes: options.sizes ?? "100vw",
    width: String(options.width),
    height: String(options.height),
    alt: options.alt,
    decoding: "async",
  };
  if (options.priority) {
    attrs.fetchpriority = "high";
    attrs.loading = "eager";
  } else {
    attrs.loading = "lazy";
  }
  if (options.className) attrs.class = options.className;
  return attrs;
}

/** Render a fast `<img>` tag. */
export function imageTag(options: ResponsiveImageOptions): string {
  return `<img ${renderAttrs(imageAttributes(options))}>`;
}

/** Render a `<picture>` with modern formats (AVIF/WebP) and an `<img>` fallback. */
export function pictureTag(options: ResponsiveImageOptions): string {
  const formats = options.formats ?? ["avif", "webp"];
  const url = options.url ?? defaultUrlBuilder;
  const widths = options.widths ?? defaultWidths(options.width);
  const sizes = options.sizes ?? "100vw";
  const sources = formats.map(
    (format) =>
      `  <source type="image/${format}" srcset="${escapeAttr(srcset(options.src, widths, url, format))}" sizes="${escapeAttr(sizes)}">`,
  );
  return ["<picture>", ...sources, `  ${imageTag(options)}`, "</picture>"].join("\n");
}

function renderAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([name, value]) => `${name}="${escapeAttr(value)}"`)
    .join(" ");
}
