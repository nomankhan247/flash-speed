/**
 * Embeds: lightweight "facades" for heavy third-party iframes.
 * A YouTube iframe costs ~500 KB+ of JavaScript before anyone presses play.
 * A facade shows a thumbnail and a button, and loads the real iframe on click.
 */

import { escapeAttr } from "./hints.js";

export interface YouTubeFacadeOptions {
  /** The 11-character video ID. */
  id: string;
  title: string;
  /** Thumbnail quality. `hqdefault` (480x360) always exists; `maxresdefault` may not. */
  thumbnail?: "hqdefault" | "sddefault" | "maxresdefault";
  /** Start time in seconds. */
  start?: number;
}

const YOUTUBE_ID = /^[\w-]{11}$/;

/** Markup for a click-to-load YouTube player. Pair it with `facadeScript` once per page. */
export function youtubeFacade(options: YouTubeFacadeOptions): string {
  if (!YOUTUBE_ID.test(options.id)) throw new TypeError(`Invalid YouTube video id: ${options.id}`);
  const thumb = `https://i.ytimg.com/vi_webp/${options.id}/${options.thumbnail ?? "hqdefault"}.webp`;
  const params = new URLSearchParams({ autoplay: "1", rel: "0" });
  if (options.start) params.set("start", String(Math.floor(options.start)));
  const embed = `https://www.youtube-nocookie.com/embed/${options.id}?${params.toString()}`;
  const title = escapeAttr(options.title);
  return [
    `<div class="fs-facade" data-fs-embed="${escapeAttr(embed)}" data-fs-title="${title}"`,
    `  style="position:relative;aspect-ratio:16/9;background:#000 center/cover url('${thumb}');cursor:pointer">`,
    `  <button type="button" aria-label="Play: ${title}"`,
    `    style="position:absolute;inset:0;margin:auto;width:68px;height:48px;border:0;border-radius:12px;background:#f00c;color:#fff;font-size:24px;cursor:pointer">&#9654;</button>`,
    `</div>`,
  ].join("\n");
}

/** Tiny inline script (no dependencies) that swaps facades for the real iframe on click or keypress. */
export const facadeScript = `<script>
document.addEventListener("click", function (event) {
  var el = event.target && event.target.closest && event.target.closest(".fs-facade");
  if (!el || el.dataset.fsLoaded) return;
  el.dataset.fsLoaded = "1";
  var iframe = document.createElement("iframe");
  iframe.src = el.dataset.fsEmbed;
  iframe.title = el.dataset.fsTitle || "";
  iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
  iframe.allowFullscreen = true;
  iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0";
  el.replaceChildren(iframe);
});
</script>`;

/** A lazily loaded generic iframe (maps, forms, widgets). */
export function lazyIframe(options: { src: string; title: string; width: number; height: number }): string {
  return `<iframe src="${escapeAttr(options.src)}" title="${escapeAttr(options.title)}" width="${options.width}" height="${options.height}" loading="lazy" style="border:0"></iframe>`;
}
