import { chromium } from "playwright";
import { FetchError } from "./fetch-url";

// Cloudflare's JS challenge takes a few seconds to run and redirect once a
// real browser loads it — give it real wall-clock time on top of the caller's
// own fetch timeout, since this is a distinct (slower) code path.
const CHALLENGE_WAIT_MS = 8_000;

// Launching a real browser and letting Cloudflare's challenge script run is
// inherently slower than a plain fetch() — the caller's timeoutMs (tuned for
// the fast path) is too tight here (observed: 15s isn't enough for cold
// browser launch + navigation even when no visible challenge screen renders).
// Floor it at 30s rather than trusting the caller's budget.
const MIN_NAV_TIMEOUT_MS = 30_000;

export async function fetchWithBrowser(
  url: string,
  opts: { timeoutMs: number; maxBytes: number },
): Promise<{ html: string; finalUrl: string; contentType: string }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const navTimeout = Math.max(opts.timeoutMs, MIN_NAV_TIMEOUT_MS);
    let response;
    try {
      response = await page.goto(url, { timeout: navTimeout, waitUntil: "domcontentloaded" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/timeout/i.test(message)) throw new FetchError("Request timed out", "TIMEOUT");
      throw new FetchError(`Network error: ${message}`, "NETWORK_ERROR");
    }

    // Cloudflare's interstitial redirects to the real page once its challenge
    // script finishes — wait for that navigation rather than trusting the
    // first response, which is still the challenge page itself.
    await page
      .waitForFunction(() => !document.title.toLowerCase().includes("just a moment"), {
        timeout: CHALLENGE_WAIT_MS,
      })
      .catch(() => {
        // Challenge didn't clear in time — fall through and report whatever
        // loaded; the caller will see it's a challenge shell via HTTP_ERROR
        // or empty-content downstream rather than hang indefinitely.
      });

    const html = await page.content();
    if (Buffer.byteLength(html, "utf8") > opts.maxBytes) {
      throw new FetchError(`Response exceeds ${opts.maxBytes} bytes`, "TOO_LARGE");
    }

    const finalUrl = page.url();
    const status = response?.status() ?? 200;
    if (status >= 400) {
      throw new FetchError(`HTTP ${status}`, "HTTP_ERROR");
    }

    return { html, finalUrl, contentType: "text/html" };
  } finally {
    await browser.close();
  }
}
