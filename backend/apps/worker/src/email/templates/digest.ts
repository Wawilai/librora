export interface DigestItem {
  id: string;
  title: string;
  customTitle: string | null;
  extractedTitle: string | null;
  aiAbstract: string | null;
  domain: string;
}

// Plain inline-styled HTML — matches the password-reset email's style
// (backend/apps/api/src/auth/auth.service.ts) rather than pulling in a
// templating engine for a single, simple transactional email.
export function buildDigestEmail(items: DigestItem[], webBaseUrl: string): string {
  const rows = items
    .map((item) => {
      const title = item.customTitle || item.extractedTitle || item.title;
      const abstract = item.aiAbstract
        ? `<p style="margin:4px 0 0;color:#555;font-size:14px;">${escapeHtml(item.aiAbstract)}</p>`
        : "";
      return `
        <li style="margin-bottom:16px;">
          <a href="${webBaseUrl}/read/${item.id}" style="font-size:16px;font-weight:600;color:#1a1a1a;text-decoration:none;">${escapeHtml(title)}</a>
          <div style="color:#888;font-size:12px;">${escapeHtml(item.domain)}</div>
          ${abstract}
        </li>`;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Your Librora reading list</h2>
      <p style="color:#555;">${items.length} item${items.length === 1 ? "" : "s"} waiting for you this week:</p>
      <ul style="list-style:none;padding:0;">${rows}</ul>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        <a href="${webBaseUrl}/settings" style="color:#888;">Manage email preferences</a>
      </p>
    </div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
