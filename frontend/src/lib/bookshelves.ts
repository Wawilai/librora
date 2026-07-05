import type { BookshelfDef } from "@/lib/api/types";

export const BOOKSHELVES: BookshelfDef[] = [
  { slug: "code", label: "Code", description: "Snippets, languages, and patterns to keep handy." },
  {
    slug: "software-development",
    label: "Software Development",
    description: "Engineering craft, process, and quality.",
  },
  {
    slug: "architecture",
    label: "Architecture",
    description: "Systems, patterns, and how things fit together.",
  },
  { slug: "design", label: "Design", description: "Visual thinking, interfaces, and craft." },
  { slug: "business", label: "Business", description: "Strategy, markets, and ventures." },
  {
    slug: "management",
    label: "Management",
    description: "Leadership, teams, and decision-making.",
  },
  { slug: "research", label: "Research", description: "Methods, papers, and inquiry." },
  { slug: "news", label: "News", description: "Time-sensitive stories worth keeping." },
  { slug: "tools", label: "Tools", description: "Apps, utilities, and how to use them well." },
  { slug: "learning", label: "Learning", description: "How to learn, study, and remember." },
  {
    slug: "ai",
    label: "Artificial Intelligence",
    description: "Models, capabilities, and limits.",
  },
  {
    slug: "productivity",
    label: "Productivity",
    description: "Habits, focus, and personal systems.",
  },
  {
    slug: "philosophy",
    label: "Philosophy",
    description: "Ideas about thinking, ethics, and meaning.",
  },
  { slug: "other", label: "Other", description: "Items that don't fit neatly elsewhere." },
];

export const bookshelfLabel = (slug?: string) =>
  BOOKSHELVES.find((b) => b.slug === slug)?.label ?? "Unsorted";

export const bookshelfDef = (slug?: string) => BOOKSHELVES.find((b) => b.slug === slug);

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || "unknown";
  }
}
