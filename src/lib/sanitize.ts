/**
 * Lightweight, allowlist-based HTML sanitizer for rich-text intraoperative notes.
 * Strips scripts, iframes, event handlers, and javascript: URLs so stored HTML
 * can be rendered safely without XSS risk.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "hr",
]);

export function sanitizeClinicalHtml(raw: string | null | undefined): string {
  if (!raw) return "";

  // Remove <script> and <style> blocks completely
  let cleaned = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Strip attributes from allowed tags and remove disallowed tags completely
  cleaned = cleaned.replace(
    /<(\/?)([a-zA-Z0-9]+)(?:\s[^>]*)?(\/?)>/g,
    (_match, closing: string, tagName: string, selfClosing: string) => {
      const lower = tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(lower)) {
        return "";
      }
      if (lower === "br" || lower === "hr") {
        return `<${lower} />`;
      }
      return `<${closing}${lower}${selfClosing ? " /" : ""}>`;
    },
  );

  return cleaned.trim();
}
