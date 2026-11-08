import { test } from "node:test";
import assert from "node:assert/strict";
import { hintTags, linkHeader, preconnect, preloadFont, preloadLcpImage, hintTag } from "../dist/hints.js";
import { imageTag, pictureTag, imageAttributes, defaultWidths, imageCdns } from "../dist/images.js";
import { youtubeFacade, lazyIframe } from "../dist/embeds.js";
import { rate } from "../dist/vitals.js";

test("hints are ordered, deduped and validated", () => {
  const html = hintTags([preloadFont("/f.woff2"), ...preconnect(["https://cdn.example.com/x.js"]), preloadFont("/f.woff2")]);
  const lines = html.split("\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], '<link rel="preconnect" href="https://cdn.example.com">');
  assert.match(lines[2], /as="font" type="font\/woff2" crossorigin/);
  assert.throws(() => hintTag({ rel: "preload", href: "/x" }), /needs an "as"/);
  assert.throws(() => hintTag({ rel: "preload", href: "/f.woff2", as: "font" }), /crossorigin/);
});

test("linkHeader is valid for Early Hints", () => {
  assert.equal(
    linkHeader([preloadLcpImage("/hero.avif")]),
    "</hero.avif>; rel=preload; as=image; fetchpriority=high",
  );
});

test("images get dimensions, srcset and the right loading strategy", () => {
  const lazy = imageAttributes({ src: "/a.jpg", alt: "A", width: 800, height: 600 });
  assert.equal(lazy.loading, "lazy");
  assert.equal(lazy.decoding, "async");
  assert.match(lazy.srcset, /\/a\.jpg\?w=320 320w/);
  const hero = imageAttributes({ src: "/h.jpg", alt: "H", width: 1200, height: 630, priority: true });
  assert.equal(hero.fetchpriority, "high");
  assert.equal(hero.loading, "eager");
  assert.throws(() => imageTag({ src: "/x.jpg", alt: "", width: 0, height: 10 }), /width and height/);
  assert.deepEqual(defaultWidths(700), [320, 480, 640, 700]);
});

test("picture offers AVIF then WebP", () => {
  const html = pictureTag({ src: "/a.jpg", alt: "A \"quoted\"", width: 640, height: 480, url: imageCdns.cloudflare });
  assert.ok(html.indexOf("image/avif") < html.indexOf("image/webp"));
  assert.match(html, /\/cdn-cgi\/image\/width=320,format=avif/);
  assert.match(html, /alt="A &quot;quoted&quot;"/);
});

test("embeds", () => {
  assert.match(youtubeFacade({ id: "dQw4w9WgXcQ", title: "Video" }), /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.throws(() => youtubeFacade({ id: "bad", title: "x" }));
  assert.match(lazyIframe({ src: "/m", title: "Map", width: 600, height: 400 }), /loading="lazy"/);
});

test("vitals ratings follow Google thresholds", () => {
  assert.equal(rate("LCP", 2500), "good");
  assert.equal(rate("LCP", 2501), "needs-improvement");
  assert.equal(rate("CLS", 0.3), "poor");
  assert.equal(rate("INP", 150), "good");
});
