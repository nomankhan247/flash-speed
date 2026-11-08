import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkBudget, kindOf, formatBytes } from "../dist/budget.js";

test("kinds and formatting", () => {
  assert.equal(kindOf("a/b.MJS"), "js");
  assert.equal(kindOf("x.woff2"), "font");
  assert.equal(kindOf("x.txt"), "other");
  assert.equal(formatBytes(2048), "2.0 KB");
});

test("checkBudget measures compressed sizes and reports violations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fs-budget-"));
  await mkdir(join(dir, "assets"));
  await writeFile(join(dir, "assets", "app.js"), "console.log('hello');\n".repeat(2000));
  await writeFile(join(dir, "assets", "app.js.map"), "ignored");
  await writeFile(join(dir, "index.html"), "<!doctype html><title>x</title>");
  const pass = await checkBudget(dir, { js: 10_000 });
  assert.equal(pass.passed, true);
  assert.equal(pass.assets.length, 2, "source maps are ignored");
  const js = pass.assets.find((a) => a.kind === "js");
  assert.ok(js.brotli < js.raw / 10, "repetitive JS compresses well");

  const fail = await checkBudget(dir, { js: 10, maxFile: 10 });
  assert.equal(fail.passed, false);
  assert.deepEqual(fail.violations.map((v) => v.limit).sort(), ["js", "maxFile", "maxFile"]);
});
