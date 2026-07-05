import OpenAI from "openai";
import { withRateLimitRetry } from "./openai-retry";

// Same fixed slug list as backend/apps/api/src/bookshelves/bookshelves.service.ts
// and frontend/src/lib/bookshelves.ts — duplicated here following the existing
// pattern of that list living per-app rather than in a shared package.
const BOOKSHELF_SLUGS = [
  "code",
  "software-development",
  "architecture",
  "design",
  "business",
  "management",
  "research",
  "news",
  "tools",
  "learning",
  "ai",
  "productivity",
  "philosophy",
  "other",
] as const;

export interface AiResult {
  abstract: string | null;
  tags: string[];
  toc: TocEntry[];
  bookshelf: (typeof BOOKSHELF_SLUGS)[number] | null;
}

export interface TocEntry {
  level: number;
  text: string;
  anchor: string;
}

function slugify(text: string, index: number): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) + `-${index}`
  );
}

// Truncate content to stay within token budget (~16k tokens ≈ 64k chars)
function truncate(text: string, maxChars = 60_000): string {
  return text.length > maxChars ? text.slice(0, maxChars) + "\n[truncated]" : text;
}

export async function runAiFeatures(
  client: OpenAI,
  model: string,
  content: string,
  title: string | null,
): Promise<AiResult> {
  const truncated = truncate(content);
  const titleLine = title ? `Title: ${title}\n\n` : "";
  const prompt = `${titleLine}Article content:\n${truncated}`;

  // Single batched call to reduce latency + cost
  const response = await withRateLimitRetry(() =>
    client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a librarian assistant. Given an article, return a JSON object with:
- "abstract": A 2-4 sentence summary (max 400 chars) in the same language as the article. null if content is too short.
- "tags": An array of 3-8 lowercase keyword tags (single words or short phrases, no hashes). Empty array if unclear.
- "toc": An array of heading objects [{level:1-3, text:"heading text"}]. The article's real headings are marked
  inline with leading "#"/"##"/"###"/"####" (markdown-style, from the source page's actual heading tags) — use
  those verbatim as the TOC when present, mapping "#"/"####" to level 1/3 at the extremes. Only fall back to
  inferring sections from unmarked prose (e.g. numbered steps like "1. ...", "Step 2:") if the article has no
  "#" markers at all. Empty array if truly no clear sections either way.
- "bookshelf": The single best-fit category for this article, chosen from EXACTLY this list of
  slugs (respond with the slug string, not the label): ${BOOKSHELF_SLUGS.join(", ")}.
  Use "other" if nothing fits well. null if content is too short to classify.

Respond ONLY with valid JSON. No markdown, no explanation.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
    }),
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: { abstract?: unknown; tags?: unknown; toc?: unknown; bookshelf?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { abstract: null, tags: [], toc: [], bookshelf: null };
  }

  const abstract =
    typeof parsed.abstract === "string" && parsed.abstract.trim()
      ? parsed.abstract.trim().slice(0, 400)
      : null;

  const tags = Array.isArray(parsed.tags)
    ? (parsed.tags as unknown[])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim().toLowerCase().slice(0, 50))
        .slice(0, 8)
    : [];

  const toc = Array.isArray(parsed.toc)
    ? (parsed.toc as unknown[])
        .filter(
          (h): h is { level: number; text: string } =>
            typeof h === "object" &&
            h !== null &&
            typeof (h as Record<string, unknown>).level === "number" &&
            typeof (h as Record<string, unknown>).text === "string",
        )
        .slice(0, 50)
        .map((h, i) => ({
          level: Math.max(1, Math.min(3, h.level)),
          text: h.text.trim().slice(0, 200),
          anchor: slugify(h.text, i),
        }))
    : [];

  const bookshelf =
    typeof parsed.bookshelf === "string" &&
    (BOOKSHELF_SLUGS as readonly string[]).includes(parsed.bookshelf)
      ? (parsed.bookshelf as (typeof BOOKSHELF_SLUGS)[number])
      : null;

  return { abstract, tags, toc, bookshelf };
}
