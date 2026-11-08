#!/usr/bin/env node
/**
 * flash-speed CLI
 *
 *   flash-speed audit <file-or-dir> [--json] [--fail-on error|warn|info]
 *   flash-speed budget <dir> [--json]
 *   flash-speed headers [--format netlify|cloudflare|vercel|nginx|apache] [--assets /assets]
 *   flash-speed rules
 *
 * Settings are read from ./flash-speed.config.json when present (or --config <path>).
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditPath, hasFindingsAtLeast, rules, type Finding, type RuleSetting, type Severity } from "./audit/index.js";
import { checkBudget, defaultBudget, formatBytes, type Budget } from "./budget.js";
import { recommendedRules, toHeadersFile, toHtaccess, toNginx, toVercelHeaders } from "./headers.js";

interface Config {
  budget?: Budget;
  audit?: { rules?: Record<string, RuleSetting>; failOn?: Severity };
}

const HELP = `flash-speed: web performance toolkit

Usage:
  flash-speed audit <file-or-dir> [--json] [--fail-on error|warn|info]
  flash-speed budget <dir> [--json]
  flash-speed headers [--format netlify|cloudflare|vercel|nginx|apache] [--assets /assets]
  flash-speed rules

Options:
  --config <path>   Config file (default: ./flash-speed.config.json)
  --help            Show this help
`;

const COLORS = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (s: string) => (COLORS ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = paint(31);
const yellow = paint(33);
const blue = paint(34);
const green = paint(32);
const dim = paint(2);

async function main(argv: string[]): Promise<number> {
  const { positional, flags } = parseArgs(argv);
  const command = positional[0];
  if (!command || flags.help) {
    process.stdout.write(HELP);
    return command ? 0 : flags.help ? 0 : 1;
  }
  const config = await loadConfig(typeof flags.config === "string" ? flags.config : undefined);

  switch (command) {
    case "audit":
      return runAudit(positional[1] ?? ".", config, flags);
    case "budget":
      return runBudget(positional[1] ?? "dist", config, flags);
    case "headers":
      return runHeaders(flags);
    case "rules":
      for (const rule of rules) {
        process.stdout.write(`${rule.id.padEnd(28)} ${sevLabel(rule.severity)}  ${rule.description}\n`);
      }
      return 0;
    default:
      process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
      return 1;
  }
}

async function runAudit(target: string, config: Config, flags: Flags): Promise<number> {
  const findings = await auditPath(target, { rules: config.audit?.rules ?? {} });
  const failOn = (flags["fail-on"] as Severity | undefined) ?? config.audit?.failOn ?? "error";
  if (flags.json) {
    process.stdout.write(JSON.stringify(findings, null, 2) + "\n");
  } else {
    printFindings(findings);
  }
  return hasFindingsAtLeast(findings, failOn) ? 1 : 0;
}

function printFindings(findings: Finding[]): void {
  if (!findings.length) {
    process.stdout.write(green("✓ No speed issues found\n"));
    return;
  }
  let currentFile: string | undefined;
  for (const f of findings) {
    if (f.file !== currentFile) {
      currentFile = f.file;
      process.stdout.write(`\n${currentFile}\n`);
    }
    const where = f.line ? dim(`:${f.line}`.padEnd(6)) : "      ";
    process.stdout.write(`  ${where} ${sevLabel(f.severity)}  ${f.message} ${dim(`(${f.rule})`)}\n`);
  }
  const count = (s: Severity) => findings.filter((f) => f.severity === s).length;
  process.stdout.write(
    `\n${red(`${count("error")} errors`)}, ${yellow(`${count("warn")} warnings`)}, ${blue(`${count("info")} suggestions`)}\n`,
  );
}

async function runBudget(dir: string, config: Config, flags: Flags): Promise<number> {
  const budget = { ...defaultBudget, ...config.budget };
  const result = await checkBudget(dir, budget);
  if (flags.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return result.passed ? 0 : 1;
  }
  process.stdout.write(`Largest files in ${dir} (brotli for text):\n`);
  for (const asset of result.assets.slice(0, 10)) {
    process.stdout.write(`  ${formatBytes(asset.transfer).padStart(10)}  ${asset.path}\n`);
  }
  process.stdout.write("\nTotals:\n");
  for (const key of ["js", "css", "html", "image", "font", "total"] as const) {
    const limit = budget[key];
    const actual = result.totals[key];
    const ok = limit === undefined || actual <= limit;
    const mark = ok ? green("✓") : red("✗");
    process.stdout.write(
      `  ${mark} ${key.padEnd(6)} ${formatBytes(actual).padStart(10)}${limit !== undefined ? dim(` / ${formatBytes(limit)}`) : ""}\n`,
    );
  }
  for (const v of result.violations.filter((v) => v.limit === "maxFile")) {
    process.stdout.write(`  ${red("✗")} ${v.path} is ${formatBytes(v.actual)} (max file ${formatBytes(v.allowed)})\n`);
  }
  process.stdout.write(result.passed ? green("\nBudget passed\n") : red(`\nBudget failed: ${result.violations.length} over\n`));
  return result.passed ? 0 : 1;
}

function runHeaders(flags: Flags): number {
  const format = String(flags.format ?? "netlify");
  const headerRules = recommendedRules(typeof flags.assets === "string" ? { assetsDir: flags.assets } : {});
  switch (format) {
    case "netlify":
    case "cloudflare":
      process.stdout.write(toHeadersFile(headerRules));
      return 0;
    case "vercel":
      process.stdout.write(JSON.stringify({ headers: toVercelHeaders(headerRules) }, null, 2) + "\n");
      return 0;
    case "nginx":
      process.stdout.write(toNginx(headerRules));
      return 0;
    case "apache":
      process.stdout.write(toHtaccess(headerRules));
      return 0;
    default:
      process.stderr.write(`Unknown format: ${format}. Use netlify, cloudflare, vercel, nginx or apache.\n`);
      return 1;
  }
}

function sevLabel(severity: Severity): string {
  if (severity === "error") return red("error");
  if (severity === "warn") return yellow("warn ");
  return blue("info ");
}

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg.startsWith("--")) {
      const [key = "", inline] = arg.slice(2).split("=", 2);
      const next = argv[i + 1];
      if (inline !== undefined) flags[key] = inline;
      else if (next !== undefined && !next.startsWith("--") && !["json", "help"].includes(key)) {
        flags[key] = next;
        i++;
      } else flags[key] = true;
    } else if (arg === "-h") flags.help = true;
    else positional.push(arg);
  }
  return { positional, flags };
}

async function loadConfig(path?: string): Promise<Config> {
  const file = resolve(path ?? "flash-speed.config.json");
  if (!existsSync(file)) {
    if (path) throw new Error(`Config file not found: ${file}`);
    return {};
  }
  return JSON.parse(await readFile(file, "utf8")) as Config;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`flash-speed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  },
);
