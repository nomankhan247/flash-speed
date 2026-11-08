import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheControl, cachePresets, headersFor, recommendedRules, toHeadersFile, toNginx, toVercelHeaders, toHtaccess } from "../dist/headers.js";

test("cacheControl builds directives in order", () => {
  assert.equal(cacheControl({ maxAge: 31536000, immutable: true }), "public, max-age=31536000, immutable");
  assert.equal(cacheControl({ noStore: true, maxAge: 10 }), "no-store");
  assert.equal(cacheControl({ visibility: "private", noCache: true }), "private, no-cache");
});

test("cacheControl rejects negative lifetimes", () => {
  assert.throws(() => cacheControl({ maxAge: -1 }), RangeError);
});

test("presets are stable", () => {
  assert.match(cachePresets.html, /max-age=0/);
  assert.match(cachePresets.html, /s-maxage=600/);
});

test("headersFor applies matching rules in order", () => {
  const rules = recommendedRules();
  assert.equal(headersFor("/assets/app.123.js", rules)["Cache-Control"], cachePresets.immutable);
  assert.equal(headersFor("/blog/post", rules)["Cache-Control"], cachePresets.html);
  assert.equal(headersFor("/fonts/inter.woff2", rules)["Access-Control-Allow-Origin"], "*");
});

test("renders every config format", () => {
  const rules = recommendedRules({ assetsDir: "/_astro/" });
  assert.match(toHeadersFile(rules), /^\/_astro\/\*\n  Cache-Control: public, max-age=31536000, immutable$/m);
  assert.equal(toVercelHeaders(rules)[1].source, "/_astro/(.*)");
  assert.equal(toVercelHeaders(rules)[2].source, "/(.*).woff2");
  assert.match(toNginx(rules), /location \^~ \/_astro\//);
  assert.match(toNginx(rules), /location ~\* \\\.woff2\$/);
  assert.match(toHtaccess(rules), /<FilesMatch "\\\.woff2\$">/);
});

test("_headers never sets the same header on /* and a specific rule (they would be comma-joined)", () => {
  const file = toHeadersFile(recommendedRules());
  const catchAll = file.split("\n\n")[0];
  assert.doesNotMatch(catchAll, /Cache-Control/);
  assert.match(catchAll, /X-Content-Type-Options: nosniff/);
});
