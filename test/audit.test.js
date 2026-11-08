import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { auditHtml, auditPath, parseHtml, rules, defineRule } from "../dist/audit/index.js";

const example = fileURLToPath(new URL("../examples/plain-html/", import.meta.url));
const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const ids = (findings) => [...new Set(findings.map((f) => f.rule))].sort();

test("parser finds tags, lines, head and raw text", () => {
  const doc = parseHtml('<html><head>\n<script>if (a < b) document.write("<img>")</script>\n</head><body><!-- <img> --><picture><img src=x></picture></body></html>');
  assert.equal(doc.byName("img").length, 1);
  assert.equal(doc.byName("script")[0].line, 2);
  assert.equal(doc.byName("script")[0].inHead, true);
  assert.equal(doc.byName("img")[0].inHead, false);
  assert.deepEqual(doc.byName("img")[0].ancestors, ["html", "body", "picture"]);
});

test("every rule has an id, severity, description and why", () => {
  const seen = new Set();
  for (const rule of rules) {
    assert.ok(rule.id && rule.description && rule.why, rule.id);
    assert.ok(["error", "warn", "info"].includes(rule.severity), rule.id);
    assert.ok(!seen.has(rule.id), `duplicate ${rule.id}`);
    seen.add(rule.id);
  }
});

test("slow example triggers each rule it is built to trigger", async () => {
  const findings = (await auditPath(example)).filter((f) => f.file === "index.html");
  assert.deepEqual(ids(findings), [
    "css-import",
    "font-display",
    "font-preload-crossorigin",
    "iframe-lazy",
    "img-dimensions",
    "lcp-image-not-lazy",
    "modern-image-formats",
    "offscreen-images-lazy",
    "preconnect-origins",
    "render-blocking-script",
    "viewport-meta",
  ]);
});

test("fast example has no errors or warnings", async () => {
  const findings = (await auditPath(example)).filter((f) => f.file === "fast.html");
  assert.deepEqual(findings, []);
});

test("rules can be turned off or re-levelled", () => {
  const html = "<html><head></head><body><img src=a.png></body></html>";
  const off = auditHtml(html, { rules: { "img-dimensions": "off", "viewport-meta": "off", "modern-image-formats": "error" } });
  assert.deepEqual(off.map((f) => [f.rule, f.severity]), [["modern-image-formats", "error"]]);
});

test("custom rules run alongside built-in ones", () => {
  const noMarquee = defineRule({
    id: "no-marquee",
    severity: "warn",
    description: "No marquee",
    why: "It's 2026",
    check({ doc, report }) {
      for (const tag of doc.byName("marquee")) report("marquee found", tag);
    },
  });
  const findings = auditHtml("<marquee>hi</marquee>", { extraRules: [noMarquee] });
  assert.deepEqual(ids(findings), ["no-marquee"]);
});

test("CLI exits 1 on errors and prints JSON", () => {
  let status = 0;
  let stdout = "";
  try {
    execFileSync(process.execPath, [cli, "audit", example, "--json"], { encoding: "utf8" });
  } catch (error) {
    status = error.status;
    stdout = error.stdout;
  }
  assert.equal(status, 1);
  assert.ok(JSON.parse(stdout).length > 5);
  const ok = execFileSync(process.execPath, [cli, "audit", `${example}fast.html`], { encoding: "utf8" });
  assert.match(ok, /No speed issues/);
});
