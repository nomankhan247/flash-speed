/**
 * Audit: static speed checks for built HTML. Point it at a file or a build folder
 * and it reports problems that hurt Core Web Vitals, each with the reason and the fix.
 */
import { readFile, stat } from "node:fs/promises";
import { relative } from "node:path";
import { listFiles } from "../budget.js";
import { parseHtml } from "./parser.js";
import { rules as builtInRules } from "./rules/index.js";
import type { Finding, Rule, RuleSetting, Severity } from "./types.js";

export { parseHtml, has, originOf } from "./parser.js";
export type { HtmlDocument, Tag } from "./parser.js";
export { defineRule } from "./types.js";
export type { Finding, Rule, RuleContext, RuleSetting, Severity } from "./types.js";
export { builtInRules as rules };

export interface AuditOptions {
  /** Override or turn off rules by id, e.g. `{ "modern-image-formats": "off" }`. */
  rules?: Record<string, RuleSetting>;
  /** Extra rules (your own or a plugin's). */
  extraRules?: Rule[];
}

/** Audit one HTML string. */
export function auditHtml(html: string, options: AuditOptions = {}): Finding[] {
  const doc = parseHtml(html);
  const findings: Finding[] = [];
  for (const rule of [...builtInRules, ...(options.extraRules ?? [])]) {
    const setting = options.rules?.[rule.id] ?? rule.severity;
    if (setting === "off") continue;
    rule.check({
      doc,
      report(message, tag) {
        findings.push({ rule: rule.id, severity: setting, message, ...(tag ? { line: tag.line } : {}) });
      },
    });
  }
  return findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
}

/** Audit an .html file or every .html file in a directory. */
export async function auditPath(path: string, options: AuditOptions = {}): Promise<Finding[]> {
  const files = (await stat(path)).isDirectory()
    ? (await listFiles(path)).filter((f) => /\.html?$/i.test(f))
    : [path];
  const root = (await stat(path)).isDirectory() ? path : "";
  const results: Finding[] = [];
  for (const file of files.sort()) {
    const html = await readFile(file, "utf8");
    for (const finding of auditHtml(html, options)) {
      results.push({ ...finding, file: root ? relative(root, file) : file });
    }
  }
  return results;
}

const RANK: Record<Severity, number> = { info: 0, warn: 1, error: 2 };

/** True if any finding is at or above the given severity. */
export function hasFindingsAtLeast(findings: Finding[], level: Severity): boolean {
  return findings.some((f) => RANK[f.severity] >= RANK[level]);
}
