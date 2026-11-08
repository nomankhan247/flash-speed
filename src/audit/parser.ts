/**
 * A small, forgiving HTML tag scanner. It is not a full HTML parser: it finds start tags,
 * their attributes, their line numbers, whether they sit in <head>, and the raw text
 * of <script> and <style> elements. That is all the audit rules need, with zero dependencies.
 */

export interface Tag {
  /** Lower-case tag name. */
  name: string;
  attrs: Record<string, string>;
  /** 1-based line number of the tag. */
  line: number;
  /** Offset in the source. */
  index: number;
  /** True when the tag appears before </head> (or before <body> when </head> is omitted). */
  inHead: boolean;
  /** Names of open ancestor elements, outermost first (best effort). */
  ancestors: string[];
  /** Raw text content, for <script> and <style> only. */
  text?: string;
}

export interface HtmlDocument {
  source: string;
  tags: Tag[];
  /** Total number of elements found. */
  elementCount: number;
  byName(name: string): Tag[];
}

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
]);
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export function parseHtml(source: string): HtmlDocument {
  const tags: Tag[] = [];
  const stack: string[] = [];
  const lineStarts = computeLineStarts(source);
  let inHead = true;
  let i = 0;

  while (i < source.length) {
    const lt = source.indexOf("<", i);
    if (lt === -1) break;
    if (source.startsWith("<!--", lt)) {
      const end = source.indexOf("-->", lt + 4);
      i = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith("<!", lt) || source.startsWith("<?", lt)) {
      const end = source.indexOf(">", lt);
      i = end === -1 ? source.length : end + 1;
      continue;
    }
    TAG.lastIndex = lt;
    const match = TAG.exec(source);
    if (!match) {
      i = lt + 1;
      continue;
    }
    const [whole, slash, rawName = "", rawAttrs = "", selfClose] = match;
    const name = rawName.toLowerCase();
    i = lt + whole.length;

    if (slash) {
      if (name === "head") inHead = false;
      const at = stack.lastIndexOf(name);
      if (at !== -1) stack.length = at;
      continue;
    }

    if (name === "body") inHead = false;
    const tag: Tag = {
      name,
      attrs: parseAttrs(rawAttrs),
      line: lineOf(lineStarts, lt),
      index: lt,
      inHead: inHead && name !== "html",
      ancestors: [...stack],
    };
    tags.push(tag);

    if (RAW_TEXT.has(name) && !selfClose) {
      const close = new RegExp(`</${name}\\s*>`, "ig");
      close.lastIndex = i;
      const end = close.exec(source);
      const textEnd = end ? end.index : source.length;
      if (name === "script" || name === "style") tag.text = source.slice(i, textEnd);
      i = end ? end.index + end[0].length : source.length;
      continue;
    }
    if (!VOID.has(name) && !selfClose) stack.push(name);
  }

  return {
    source,
    tags,
    elementCount: tags.length,
    byName: (n: string) => tags.filter((t) => t.name === n),
  };
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR.exec(raw))) {
    const key = (m[1] ?? "").toLowerCase();
    if (key && !(key in attrs)) attrs[key] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

function computeLineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

function lineOf(starts: number[], index: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] ?? 0) <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** True when an attribute is present (boolean attributes have an empty value). */
export function has(tag: Tag, attr: string): boolean {
  return attr in tag.attrs;
}

/** Returns the origin of a URL if it is absolute (http/https or protocol-relative), else undefined. */
export function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const value = url.startsWith("//") ? `https:${url}` : url;
  if (!/^https?:\/\//i.test(value)) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}
