import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { URL } from "url";

export interface Metadata {
  title: string | null;
  extractedTitle: string | null;
  description: string | null;
  author: string | null;
  publishedDate: Date | null;
  language: string | null;
  domain: string;
  faviconUrl: string | null;
  imageUrl: string | null;
}

export interface ReadableContent {
  text: string;
  html: string;
  // Same plain text as `text`, but with the source's real <h1-4> tags
  // converted to inline "## heading" markers first. Feed this (not `text`)
  // to anything that needs to detect section structure (AI table-of-contents
  // extraction) — plain-text-only stripped all heading markup, so the model
  // had nothing but prose to guess sections from and would under-detect real
  // headings the source article actually had.
  textWithHeadingMarkers: string;
  wordCount: number;
  readingTimeMinutes: number;
  // False when the extraction looks like boilerplate rather than a real
  // article — most commonly a JS-rendered page (SPA/paywall) where the raw
  // HTML fetch only sees a shell (nav, cookie banner, loading skeleton), which
  // Readability's low charThreshold (100 chars) happily accepts as "content."
  // Downstream (AI summarize/tag/embed) skips this so it never confidently
  // summarizes text that isn't actually the saved article.
  looksLikeRealArticle: boolean;
}

// Below this word count, Readability's result is far more likely to be a
// page shell than a genuine short article — real articles rarely clear the
// 100-char charThreshold with nothing left to say.
const MIN_WORD_COUNT = 80;

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function resolveUrl(base: string, href: string | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function extractMetadata(html: string, pageUrl: string): Metadata {
  const $ = cheerio.load(html);

  const og = (prop: string) =>
    $(`meta[property="og:${prop}"]`).attr("content") ??
    $(`meta[name="og:${prop}"]`).attr("content") ??
    null;

  const meta = (name: string) =>
    $(`meta[name="${name}"]`).attr("content") ??
    $(`meta[property="${name}"]`).attr("content") ??
    null;

  const rawTitle =
    og("title") ??
    meta("twitter:title") ??
    $("title").first().text().trim() ??
    null;

  const description =
    og("description") ??
    meta("description") ??
    meta("twitter:description") ??
    null;

  const author =
    meta("author") ??
    meta("article:author") ??
    $('[itemprop="author"]').first().text().trim() ??
    null;

  const rawDate =
    meta("article:published_time") ??
    meta("date") ??
    meta("pubdate") ??
    $("time[datetime]").first().attr("datetime") ??
    null;

  let publishedDate: Date | null = null;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) publishedDate = d;
  }

  const language =
    $("html").attr("lang")?.split("-")[0] ??
    meta("language") ??
    null;

  const imageUrl = resolveUrl(
    pageUrl,
    og("image") ?? meta("twitter:image") ?? $("link[rel='image_src']").attr("href"),
  );

  const faviconUrl = resolveUrl(
    pageUrl,
    $("link[rel='icon']").attr("href") ??
      $("link[rel='shortcut icon']").attr("href") ??
      "/favicon.ico",
  );

  return {
    title: null, // user-editable title — not set from extraction
    extractedTitle: rawTitle ? rawTitle.slice(0, 500) : null,
    description: description ? description.slice(0, 1000) : null,
    author: author ? author.slice(0, 200) : null,
    publishedDate,
    language,
    domain: domain(pageUrl),
    faviconUrl,
    imageUrl,
  };
}

export function extractContent(html: string, pageUrl: string): ReadableContent | null {
  let dom: JSDOM;
  try {
    dom = new JSDOM(html, { url: pageUrl });
  } catch {
    return null;
  }

  const reader = new Readability(dom.window.document, {
    charThreshold: 100,
  });

  const article = reader.parse();
  if (!article) return null;

  // Strip tags for plain text
  const plainText = article.textContent.replace(/\s+/g, " ").trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  const $content = cheerio.load(article.content);
  $content("h1, h2, h3, h4").each((_, el) => {
    const $el = $content(el);
    const level = Number(el.tagName.slice(1));
    $el.replaceWith(`\n${"#".repeat(level)} ${$el.text().trim()}\n`);
  });
  const textWithHeadingMarkers = $content
    .text()
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    text: plainText.slice(0, 100_000), // 100k chars max
    html: article.content.slice(0, 500_000),
    textWithHeadingMarkers: textWithHeadingMarkers.slice(0, 100_000),
    wordCount,
    readingTimeMinutes,
    looksLikeRealArticle: wordCount >= MIN_WORD_COUNT,
  };
}
