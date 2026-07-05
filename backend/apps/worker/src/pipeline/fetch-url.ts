import { URL } from "url";
import { lookup } from "dns/promises";
import { fetchWithBrowser } from "./fetch-url-browser";

// RFC-1918 + loopback + link-local — block SSRF targets
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

// Codes that are worth retrying — a genuine network/DNS blip or timeout can
// succeed on the next attempt. REDIRECT_LOOP is deliberately excluded: a real
// redirect loop will loop identically every time, so retrying just wastes a
// job attempt. Everything else (bad URL, SSRF, non-HTML content, oversized
// response) will also fail identically every time.
const TRANSIENT_CODES = new Set(["NETWORK_ERROR", "TIMEOUT", "DNS_FAILED"]);

export class FetchError extends Error {
  public readonly transient: boolean;

  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "FetchError";
    this.transient = TRANSIENT_CODES.has(code);
  }
}

const MAX_MANUAL_REDIRECTS = 10;

async function assertNotPrivateIp(hostname: string): Promise<void> {
  try {
    const { address } = await lookup(hostname);
    if (isPrivateIp(address)) {
      throw new FetchError("Blocked: private/loopback IP", "SSRF_BLOCKED");
    }
  } catch (err) {
    if (err instanceof FetchError) throw err;
    throw new FetchError(`DNS resolution failed: ${hostname}`, "DNS_FAILED");
  }
}

// A self-identifying bot UA ("Librora/1.0 (+bot)") gets explicitly denied
// anonymous access by some sites' bot detection — confirmed against Notion:
// the same request that gets bounced into an infinite login-redirect loop
// with the bot UA returns the real page directly with a browser-like UA,
// since the page genuinely is public. This is the same UA convention most
// read-it-later tools use for exactly this reason.
//
// Deliberately NOT setting Accept/Accept-Language — confirmed by direct
// testing against Notion that sending *any* explicit Accept header (with any
// value) alone triggers the same bot-detection redirect loop, while omitting
// it entirely (falling back to undici's default) does not. This appears to
// be a fingerprint check on Cloudflare's/Notion's side rather than anything
// about the header's actual content, so leave both unset rather than trying
// to hand-craft a "convincing" value.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchOneHop(
  url: string,
  timeoutMs: number,
  redirect: "follow" | "manual",
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
      },
      redirect,
    });
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError") throw new FetchError("Request timed out", "TIMEOUT");
    // undici wraps the real reason in `.cause` (e.g. "redirect count exceeded")
    // — String(err) alone only gives "TypeError: fetch failed", which loses
    // exactly the detail needed to detect the Cloudflare-redirect quirk below.
    const errCause = err instanceof Error ? (err as Error & { cause?: unknown }).cause : undefined;
    const cause = errCause instanceof Error ? errCause.message : "";
    throw new FetchError(`Network error: ${String(err)}${cause ? ` (${cause})` : ""}`, "NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchUrl(
  rawUrl: string,
  opts: { timeoutMs: number; maxBytes: number },
): Promise<{ html: string; finalUrl: string; contentType: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new FetchError("Invalid URL", "INVALID_URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new FetchError("Only http/https URLs are allowed", "DISALLOWED_PROTOCOL");
  }

  await assertNotPrivateIp(parsed.hostname);

  let response: Response;
  try {
    response = await fetchOneHop(rawUrl, opts.timeoutMs, "follow");
  } catch (err) {
    // Some CDN-fronted sites' redirect responses (multiple Set-Cookie headers
    // plus certain Vary combinations) can trip a known undici quirk that
    // reports "redirect count exceeded" after only one or two genuine hops.
    // Automatic redirect-following can't be trusted once this happens — fall
    // back to following redirects manually, re-running the SSRF check on
    // every hop since each one is a new destination host. If the site has an
    // actual redirect loop (rather than just tripping the undici quirk), the
    // hop cap below correctly reports that as a permanent REDIRECT_LOOP.
    const isRedirectBug =
      err instanceof FetchError &&
      err.code === "NETWORK_ERROR" &&
      /redirect count exceeded/i.test(err.message);
    if (!isRedirectBug) throw err;

    let currentUrl = rawUrl;
    let hop = 0;
    for (;;) {
      const res = await fetchOneHop(currentUrl, opts.timeoutMs, "manual");
      if (res.status < 300 || res.status >= 400 || !res.headers.get("location")) {
        response = res;
        break;
      }
      hop += 1;
      if (hop > MAX_MANUAL_REDIRECTS) {
        // A genuine redirect loop (observed: app.notion.com's sessionSync
        // flow bounces forever for anonymous/bot visitors that don't accept
        // cookies) — this is permanent, not a blip, so don't burn retries on it.
        throw new FetchError(
          `Redirect loop — the page requires a login session that never resolves for an anonymous fetch (stopped after ${MAX_MANUAL_REDIRECTS} hops)`,
          "REDIRECT_LOOP",
        );
      }
      const nextUrl = new URL(res.headers.get("location")!, currentUrl).toString();
      const nextParsed = new URL(nextUrl);
      if (!["http:", "https:"].includes(nextParsed.protocol)) {
        throw new FetchError("Only http/https URLs are allowed", "DISALLOWED_PROTOCOL");
      }
      await assertNotPrivateIp(nextParsed.hostname);
      currentUrl = nextUrl;
    }
  }

  // Cloudflare (and similar) bot-management can reject a plain fetch() purely
  // on TLS/HTTP2 fingerprint — identical headers/User-Agent that succeed from
  // curl or a real browser still get a 403 here, because the fingerprint check
  // happens below the HTTP layer where Node's fetch can't pass for Chrome. The
  // `cf-mitigated: challenge` response header is Cloudflare's own signal that
  // this is exactly that case (not a real access-denied/paywall 403) — retry
  // once through a real headless-Chromium context, whose actual TLS/HTTP2
  // stack passes the same fingerprint check a real visitor's would.
  const isCloudflareChallenge =
    !response.ok && response.headers.get("cf-mitigated") === "challenge";
  if (isCloudflareChallenge) {
    return fetchWithBrowser(response.url || rawUrl, opts);
  }

  if (!response.ok) {
    throw new FetchError(`HTTP ${response.status}`, "HTTP_ERROR");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("xml") && !contentType.includes("text")) {
    throw new FetchError(`Non-text content-type: ${contentType}`, "NON_TEXT_CONTENT");
  }

  // Stream with size cap
  const reader = response.body?.getReader();
  if (!reader) throw new FetchError("No response body", "NO_BODY");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    if (totalBytes > opts.maxBytes) {
      await reader.cancel();
      throw new FetchError(`Response exceeds ${opts.maxBytes} bytes`, "TOO_LARGE");
    }
    chunks.push(value);
  }

  const html = new TextDecoder().decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.length + chunk.length);
      merged.set(acc);
      merged.set(chunk, acc.length);
      return merged;
    }, new Uint8Array(0)),
  );

  return { html, finalUrl: response.url, contentType };
}
