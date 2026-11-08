/**
 * Vitals: a tiny real-user monitoring (RUM) reporter for Core Web Vitals,
 * built only on PerformanceObserver. Runs in the browser.
 *
 * Measures LCP, CLS, INP, FCP and TTFB and reports each one once, when the page is hidden,
 * so you can beacon it to your own endpoint or analytics.
 *
 * For lab-grade accuracy across every edge case, Google's `web-vitals` package is the reference;
 * this module trades a few edge cases for ~1 KB and zero dependencies.
 */

export type MetricName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
export type Rating = "good" | "needs-improvement" | "poor";

export interface Metric {
  name: MetricName;
  value: number;
  rating: Rating;
  /** The page URL the metric belongs to. */
  url: string;
  /** Navigation type: navigate, reload, back_forward, prerender. */
  navigationType: string;
}

/** Google's published thresholds: [good upper bound, needs-improvement upper bound]. */
export const thresholds: Record<MetricName, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

export function rate(name: MetricName, value: number): Rating {
  const [good, poor] = thresholds[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export interface ReportOptions {
  /** Called once per metric. */
  onMetric?: (metric: Metric) => void;
  /** If set, every metric is sent to this URL with `navigator.sendBeacon` as JSON. */
  beaconUrl?: string;
}

/** Start observing. Call once, as early as possible (e.g. in a small inline module script). */
export function reportWebVitals(options: ReportOptions): void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const navigationType = nav?.type ?? "navigate";
  const reported = new Set<MetricName>();

  const send = (name: MetricName, value: number) => {
    if (reported.has(name)) return;
    reported.add(name);
    const metric: Metric = { name, value: round(name, value), rating: rate(name, value), url: location.href, navigationType };
    options.onMetric?.(metric);
    if (options.beaconUrl && "sendBeacon" in navigator) {
      navigator.sendBeacon(options.beaconUrl, new Blob([JSON.stringify(metric)], { type: "application/json" }));
    }
  };

  // activationStart is non-zero for prerendered pages; older DOM typings don't include it.
  if (nav) send("TTFB", Math.max(nav.responseStart - ((nav as { activationStart?: number }).activationStart ?? 0), 0));

  observe("paint", (entries) => {
    for (const entry of entries) if (entry.name === "first-contentful-paint") send("FCP", entry.startTime);
  });

  let lcp = 0;
  observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) lcp = last.startTime;
  });

  // CLS: the largest "session window" of layout shifts (shifts < 1s apart, window < 5s).
  let cls = 0;
  let sessionValue = 0;
  let sessionStart = 0;
  let sessionLast = 0;
  observe("layout-shift", (entries) => {
    for (const entry of entries as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
      if (entry.hadRecentInput) continue;
      if (sessionValue && entry.startTime - sessionLast < 1000 && entry.startTime - sessionStart < 5000) {
        sessionValue += entry.value;
      } else {
        sessionValue = entry.value;
        sessionStart = entry.startTime;
      }
      sessionLast = entry.startTime;
      cls = Math.max(cls, sessionValue);
    }
  });

  // INP: approximated as the slowest interaction (exact INP uses the 98th percentile on pages with 50+ interactions).
  let inp = 0;
  observe(
    "event",
    (entries) => {
      for (const entry of entries as Array<PerformanceEntry & { interactionId?: number }>) {
        if (entry.interactionId) inp = Math.max(inp, entry.duration);
      }
    },
    { durationThreshold: 40 },
  );

  const flush = () => {
    if (lcp) send("LCP", lcp);
    send("CLS", cls);
    if (inp) send("INP", inp);
  };
  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  addEventListener("pagehide", flush);
}

function observe(
  type: string,
  callback: (entries: PerformanceEntry[]) => void,
  extra: Record<string, unknown> = {},
): void {
  try {
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    const observer = new PerformanceObserver((list) => callback(list.getEntries()));
    observer.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
  } catch {
    // Unsupported entry type in this browser: skip silently.
  }
}

function round(name: MetricName, value: number): number {
  return name === "CLS" ? Math.round(value * 1000) / 1000 : Math.round(value);
}
