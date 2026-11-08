/**
 * The rule registry. To add a rule: create src/audit/rules/<id>.ts and add one line here.
 * Keep the list alphabetical so merge conflicts stay small.
 */
import type { Rule } from "../types.js";
import cssImport from "./css-import.js";
import domSize from "./dom-size.js";
import fontDisplay from "./font-display.js";
import fontPreloadCrossorigin from "./font-preload-crossorigin.js";
import iframeLazy from "./iframe-lazy.js";
import imgDimensions from "./img-dimensions.js";
import lcpImageNotLazy from "./lcp-image-not-lazy.js";
import modernImageFormats from "./modern-image-formats.js";
import offscreenImagesLazy from "./offscreen-images-lazy.js";
import preconnectOrigins from "./preconnect-origins.js";
import renderBlockingScript from "./render-blocking-script.js";
import tooManyPreloads from "./too-many-preloads.js";
import viewportMeta from "./viewport-meta.js";

export const rules: Rule[] = [
  cssImport,
  domSize,
  fontDisplay,
  fontPreloadCrossorigin,
  iframeLazy,
  imgDimensions,
  lcpImageNotLazy,
  modernImageFormats,
  offscreenImagesLazy,
  preconnectOrigins,
  renderBlockingScript,
  tooManyPreloads,
  viewportMeta,
];
