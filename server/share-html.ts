import fs from "node:fs/promises";
import path from "node:path";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export async function renderShareHtml(
  metadata: { title: string; description: string; url: string; image: string },
  requestUrl: string,
  transform?: (url: string, html: string) => Promise<string>,
): Promise<string> {
  // The published server is CommonJS (dist/index.cjs): import.meta.dirname
  // becomes undefined there. Match the static server's dist/public location.
  const htmlPath = process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "public", "index.html")
    : path.resolve(process.cwd(), "client", "index.html");
  let html = await fs.readFile(htmlPath, "utf-8");
  html = html
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\s+name="description"[^>]*\/?>/gi, "")
    .replace(/<meta\s+property="og:[^"]+"[^>]*\/?>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*\/?>/gi, "");

  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const url = escapeHtml(metadata.url);
  const image = escapeHtml(metadata.image);
  html = html.replace("</head>", `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Hotlist" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>`);
  // Shared pages bypass Vite's catch-all, but still need its React preamble
  // and module transforms when tested through the development preview.
  return transform ? transform(requestUrl, html) : html;
}
