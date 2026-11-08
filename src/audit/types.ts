import type { HtmlDocument, Tag } from "./parser.js";

export type Severity = "error" | "warn" | "info";
export type RuleSetting = Severity | "off";

export interface Finding {
  rule: string;
  severity: Severity;
  message: string;
  /** File the finding is in (set by the runner). */
  file?: string;
  line?: number;
}

export interface RuleContext {
  doc: HtmlDocument;
  /** Report a problem. `tag` sets the line number. */
  report(message: string, tag?: Tag): void;
}

export interface Rule {
  /** kebab-case id, also the file name in src/audit/rules/. */
  id: string;
  /** Default severity. Users can override it in flash-speed.config.json. */
  severity: Severity;
  /** One sentence: what the rule checks. */
  description: string;
  /** Why it matters for speed, and which metric it moves (LCP, CLS, INP, FCP, TTFB). */
  why: string;
  check(context: RuleContext): void;
}

/** Helper so rule files get full type checking with no boilerplate. */
export function defineRule(rule: Rule): Rule {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(rule.id)) throw new Error(`Rule id must be kebab-case: ${rule.id}`);
  return rule;
}
