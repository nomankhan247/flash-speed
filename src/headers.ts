/**
 * Headers: Cache-Control presets and ready-to-paste header configs for
 * Cloudflare Pages / Netlify (`_headers`), Vercel (`vercel.json`), Nginx and Apache.
 */

export interface CacheControlOptions {
  /** `public` (CDN + browser may cache) or `private` (browser only). Default `public`. */
  visibility?: "public" | "private";
  /** Browser cache lifetime in seconds (`max-age`). */
  maxAge?: number;
  /** Shared/CDN cache lifetime in seconds (`s-maxage`). */
  sMaxAge?: number;
  /** Serve stale while revalidating in the background, in seconds. */
  staleWhileRevalidate?: number;
  /** Serve stale if the origin errors, in seconds. */
  staleIfError?: number;
  /** The file never changes at this URL (fingerprinted assets). */
  immutable?: boolean;
  /** Always revalidate before use. */
  noCache?: boolean;
  /** Never store (sensitive responses). Overrides everything else. */
  noStore?: boolean;
  /** Caches must not serve stale content once expired. */
  mustRevalidate?: boolean;
}

/** Build a `Cache-Control` header value from options. */
export function cacheControl(options: CacheControlOptions): string {
  if (options.noStore) return "no-store";
  const parts: string[] = [options.visibility ?? "public"];
  if (options.noCache) parts.push("no-cache");
  if (options.maxAge !== undefined) parts.push(`max-age=${seconds(options.maxAge)}`);
  if (options.sMaxAge !== undefined) parts.push(`s-maxage=${seconds(options.sMaxAge)}`);
  if (options.staleWhileRevalidate !== undefined)
    parts.push(`stale-while-revalidate=${seconds(options.staleWhileRevalidate)}`);
  if (options.staleIfError !== undefined) parts.push(`stale-if-error=${seconds(options.staleIfError)}`);
  if (options.mustRevalidate) parts.push("must-revalidate");
  if (options.immutable) parts.push("immutable");
  return parts.join(", ");
}

function seconds(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid cache lifetime: ${value}`);
  return Math.floor(value);
}

const YEAR = 31_536_000;
const DAY = 86_400;

/** Battle-tested Cache-Control values for common kinds of responses. */
export const cachePresets = {
  /** Fingerprinted JS/CSS/fonts/images such as `app.3f9a1c.js`: cache for a year, never revalidate. */
  immutable: cacheControl({ maxAge: YEAR, immutable: true }),
  /** Static files without a hash in the name (logo.png, favicon.ico). */
  static: cacheControl({ maxAge: DAY, staleWhileRevalidate: 7 * DAY }),
  /** HTML pages: browsers always revalidate, the CDN keeps them for 10 minutes and serves stale while refreshing. */
  html: cacheControl({ maxAge: 0, sMaxAge: 600, staleWhileRevalidate: DAY, staleIfError: DAY, mustRevalidate: true }),
  /** API responses that can be briefly shared. */
  api: cacheControl({ maxAge: 0, sMaxAge: 60, staleWhileRevalidate: 300 }),
  /** Logged-in or personalised responses. */
  private: cacheControl({ visibility: "private", noCache: true }),
  /** Secrets, tokens, checkout pages. */
  noStore: cacheControl({ noStore: true }),
} as const;

export interface HeaderRule {
  /** URL path pattern. `*` matches anything, e.g. `/assets/*` or `/*.woff2`. */
  path: string;
  headers: Record<string, string>;
}

/** Headers that help speed (and are safe to send on every response). */
export const baseHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Lets real-user monitoring (see the vitals module) read full resource timings.
  "Timing-Allow-Origin": "*",
};

/** A sensible default rule set for a static or server-rendered site. */
export function recommendedRules(options: { assetsDir?: string } = {}): HeaderRule[] {
  const assets = (options.assetsDir ?? "/assets").replace(/\/$/, "");
  return [
    { path: "/*", headers: { ...baseHeaders, "Cache-Control": cachePresets.html } },
    { path: `${assets}/*`, headers: { "Cache-Control": cachePresets.immutable } },
    { path: "/*.woff2", headers: { "Cache-Control": cachePresets.immutable, "Access-Control-Allow-Origin": "*" } },
    { path: "/*.avif", headers: { "Cache-Control": cachePresets.static } },
    { path: "/*.webp", headers: { "Cache-Control": cachePresets.static } },
    { path: "/*.svg", headers: { "Cache-Control": cachePresets.static } },
    { path: "/favicon.ico", headers: { "Cache-Control": cachePresets.static } },
  ];
}

/**
 * Render rules as a Cloudflare Pages / Netlify `_headers` file.
 *
 * Unlike Nginx, Apache and Vercel (where the most specific or last rule wins), these platforms
 * merge every matching rule and join repeated headers with a comma, which would produce a
 * broken `Cache-Control: <html policy>, <asset policy>`. So a header set by a more specific
 * rule is left out of the catch-all `/*` rule here; HTML then gets the platform's default
 * (always revalidate), which is the safe choice.
 */
export function toHeadersFile(rules: HeaderRule[]): string {
  const specific = new Set(
    rules.filter((rule) => rule.path !== "/*").flatMap((rule) => Object.keys(rule.headers).map((h) => h.toLowerCase())),
  );
  return (
    rules
      .map((rule) => {
        const entries = Object.entries(rule.headers).filter(
          ([name]) => rule.path !== "/*" || !specific.has(name.toLowerCase()),
        );
        return [rule.path, ...entries.map(([name, value]) => `  ${name}: ${value}`)].join("\n");
      })
      .join("\n\n") + "\n"
  );
}

/** Render rules as the `headers` array of a `vercel.json`. */
export function toVercelHeaders(rules: HeaderRule[]): Array<{ source: string; headers: Array<{ key: string; value: string }> }> {
  return rules.map((rule) => ({
    source: rule.path.replace(/^\/\*\.(\w+)$/, "/(.*).$1").replace(/\/\*$/, "/(.*)"),
    headers: Object.entries(rule.headers).map(([key, value]) => ({ key, value })),
  }));
}

/** Render rules as Nginx `location` blocks. */
export function toNginx(rules: HeaderRule[]): string {
  return (
    rules
      .map((rule) => {
        const ext = /^\/\*\.(\w+)$/.exec(rule.path);
        const location = ext
          ? `location ~* \\.${ext[1]}$`
          : rule.path === "/*"
            ? "location /"
            : `location ^~ ${rule.path.replace(/\*$/, "")}`;
        const lines = Object.entries(rule.headers).map(
          ([name, value]) => `    add_header ${name} "${value}" always;`,
        );
        return `${location} {\n${lines.join("\n")}\n}`;
      })
      .join("\n\n") + "\n"
  );
}

/** Render rules as an Apache `.htaccess` snippet (needs mod_headers). */
export function toHtaccess(rules: HeaderRule[]): string {
  const blocks = rules.map((rule) => {
    const lines = Object.entries(rule.headers).map(([name, value]) => `  Header set ${name} "${value}"`);
    const ext = /^\/\*\.(\w+)$/.exec(rule.path);
    if (ext) return `<FilesMatch "\\.${ext[1]}$">\n${lines.join("\n")}\n</FilesMatch>`;
    if (rule.path === "/*") return lines.map((l) => l.trim()).join("\n");
    const dir = rule.path.replace(/^\//, "").replace(/\/?\*$/, "");
    return `<If "%{REQUEST_URI} =~ m#^/${dir}/#">\n${lines.join("\n")}\n</If>`;
  });
  return `<IfModule mod_headers.c>\n${blocks.join("\n\n")}\n</IfModule>\n`;
}

/** Find the headers that apply to a path (later rules override earlier ones). */
export function headersFor(path: string, rules: HeaderRule[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rule of rules) {
    if (matchPath(rule.path, path)) Object.assign(result, rule.headers);
  }
  return result;
}

function matchPath(pattern: string, path: string): boolean {
  const regex = new RegExp(
    "^" + pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$",
  );
  return regex.test(path);
}
