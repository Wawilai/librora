const DEFAULT_SITE_URL = "https://app.librora.xyz";
const DEFAULT_IMAGE = "/og-image.svg";

export const siteUrl = (import.meta.env.VITE_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, "");

type SeoOptions = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function seo({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
}: SeoOptions) {
  const canonical = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  const robots = noIndex ? "noindex, nofollow" : "index, follow";

  return [
    { title },
    ...(description ? [{ name: "description", content: description }] : []),
    { name: "robots", content: robots },
    { property: "og:type", content: type },
    { property: "og:site_name", content: "Librora" },
    { property: "og:title", content: title },
    ...(description ? [{ property: "og:description", content: description }] : []),
    { property: "og:url", content: canonical },
    { property: "og:image", content: imageUrl },
    { property: "og:image:alt", content: "Librora personal AI library interface" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    ...(description ? [{ name: "twitter:description", content: description }] : []),
    { name: "twitter:image", content: imageUrl },
  ];
}

export function canonical(path = "/") {
  return [{ rel: "canonical", href: absoluteUrl(path) }];
}

export function noIndexSeo(title: string, path: string, description?: string) {
  return seo({ title, description, path, noIndex: true });
}
