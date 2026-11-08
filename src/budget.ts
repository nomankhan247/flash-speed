/**
 * Budget: performance budgets for your build output (Node.js).
 * Fails CI when JavaScript, CSS, images, fonts or any single file grow past a limit,
 * measured gzipped and brotli-compressed, the way browsers actually download them.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

export type AssetKind = "js" | "css" | "html" | "image" | "font" | "other";

/** Limits in bytes. Totals are compressed (brotli) for text and raw for binary files. */
export interface Budget {
  js?: number;
  css?: number;
  html?: number;
  image?: number;
  font?: number;
  /** Total of everything. */
  total?: number;
  /** Largest single file of any kind. */
  maxFile?: number;
}

/** A starting budget that keeps most marketing and content sites fast on mid-range phones. */
export const defaultBudget: Required<Budget> = {
  js: 170 * 1024,
  css: 50 * 1024,
  html: 100 * 1024,
  image: 1500 * 1024,
  font: 150 * 1024,
  total: 2000 * 1024,
  maxFile: 500 * 1024,
};

export interface AssetSize {
  path: string;
  kind: AssetKind;
  raw: number;
  gzip: number;
  brotli: number;
  /** The size that counts toward the budget: brotli for text, raw for binary. */
  transfer: number;
}

export interface BudgetResult {
  assets: AssetSize[];
  totals: Record<AssetKind | "total", number>;
  violations: Array<{ limit: keyof Budget; actual: number; allowed: number; path?: string }>;
  passed: boolean;
}

const KINDS: Record<string, AssetKind> = {
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".css": "css",
  ".html": "html",
  ".htm": "html",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".webp": "image",
  ".avif": "image",
  ".svg": "image",
  ".ico": "image",
  ".woff": "font",
  ".woff2": "font",
  ".ttf": "font",
  ".otf": "font",
};

const TEXT_KINDS = new Set<AssetKind>(["js", "css", "html", "other"]);

export function kindOf(path: string): AssetKind {
  return KINDS[extname(path).toLowerCase()] ?? "other";
}

export async function measureFile(path: string, root = ""): Promise<AssetSize> {
  const data = await readFile(path);
  const kind = kindOf(path);
  const isText = TEXT_KINDS.has(kind) || extname(path).toLowerCase() === ".svg";
  const gzip = isText ? gzipSync(data, { level: 9 }).length : data.length;
  const brotli = isText ? brotliCompressSync(data).length : data.length;
  return { path: root ? relative(root, path) : path, kind, raw: data.length, gzip, brotli, transfer: brotli };
}

export async function listFiles(dir: string, ignore: (path: string) => boolean = defaultIgnore): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (ignore(full)) continue;
    if (entry.isDirectory()) out.push(...(await listFiles(full, ignore)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function defaultIgnore(path: string): boolean {
  return /(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(path) || /\.(map|gz|br)$/.test(path);
}

/** Measure every file in a build directory and check it against a budget. */
export async function checkBudget(dir: string, budget: Budget = defaultBudget): Promise<BudgetResult> {
  if (!(await stat(dir)).isDirectory()) throw new Error(`${dir} is not a directory`);
  const assets = await Promise.all((await listFiles(dir)).map((file) => measureFile(file, dir)));
  assets.sort((a, b) => b.transfer - a.transfer);

  const totals: BudgetResult["totals"] = { js: 0, css: 0, html: 0, image: 0, font: 0, other: 0, total: 0 };
  for (const asset of assets) {
    totals[asset.kind] += asset.transfer;
    totals.total += asset.transfer;
  }

  const violations: BudgetResult["violations"] = [];
  for (const key of ["js", "css", "html", "image", "font", "total"] as const) {
    const allowed = budget[key];
    if (allowed !== undefined && totals[key] > allowed) violations.push({ limit: key, actual: totals[key], allowed });
  }
  if (budget.maxFile !== undefined) {
    for (const asset of assets) {
      if (asset.transfer > budget.maxFile) {
        violations.push({ limit: "maxFile", actual: asset.transfer, allowed: budget.maxFile, path: asset.path });
      }
    }
  }
  return { assets, totals, violations, passed: violations.length === 0 };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
