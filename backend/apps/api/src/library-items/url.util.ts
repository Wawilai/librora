export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
    // Remove trailing slash, fragment, and common tracking params
    u.hash = "";
    for (const p of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"]) {
      u.searchParams.delete(p);
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function faviconLetter(domain: string): string {
  return (domain[0] ?? "?").toUpperCase();
}

const GOOGLE_DOC_PATH_RE = /^\/(document|spreadsheets|presentation)\//;

// Google Docs/Sheets/Slides are always login-gated for full content — even a
// headless-browser fetch (see fetch-url-browser.ts's Cloudflare fallback) has
// no user session, so extraction can never succeed here. Classify by URL
// shape alone (no fetch needed) so this is known at save time.
export function detectSourceType(url: string): "ARTICLE" | "GOOGLE_DOC" {
  try {
    const u = new URL(url);
    if (u.hostname === "docs.google.com" && GOOGLE_DOC_PATH_RE.test(u.pathname)) {
      return "GOOGLE_DOC";
    }
  } catch {
    // fall through to ARTICLE
  }
  return "ARTICLE";
}
