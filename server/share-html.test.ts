import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderShareHtml } from "./share-html";

const metadata = {
  title: 'Black Doves (2024) — Hotlist',
  description: 'TV Show · A friend\'s "pick" & more <script>alert(1)</script>',
  url: "https://example.com/shared/123?x=1&y=2",
  image: "https://image.tmdb.org/t/p/w500/poster.jpg",
};

function checkHtml(html: string) {
  for (const property of ["title", "description", "url", "image"]) {
    assert.equal((html.match(new RegExp(`property="og:${property}"`, "g")) || []).length, 1);
  }
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.ok(html.includes('content="Black Doves (2024) — Hotlist"'));
  assert.ok(html.includes('content="https://image.tmdb.org/t/p/w500/poster.jpg"'));
  assert.ok(html.includes("&#39;"));
  assert.ok(html.includes("&quot;"));
  assert.ok(html.includes("&amp;"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("Your Personal Watch List"));
  assert.ok(html.includes('<div id="root">'));
}

test("share HTML replaces generic metadata and retains the app", async () => {
  checkHtml(await renderShareHtml(metadata, "/shared/123"));
});

test("development share pages receive Vite's HTML transformation", async () => {
  let calls = 0;
  const html = await renderShareHtml(metadata, "/shared/123?autoAdd=1", async (url, html) => {
    calls++;
    assert.equal(url, "/shared/123?autoAdd=1");
    checkHtml(html);
    return html.replace("</head>", '<script src="/vite-preamble.js"></script></head>');
  });
  assert.equal(calls, 1);
  assert.ok(html.includes("/vite-preamble.js"));
});

test("published CommonJS share renderer reads built HTML beside the bundle", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "hotlist-share-"));
  try {
    await mkdir(path.join(directory, "public"));
    const template = await readFile("client/index.html", "utf8");
    await writeFile(path.join(directory, "public/index.html"), template.replace(
      'src="/src/main.tsx"', 'src="/assets/built-app.js"',
    ));
    const bundle = path.join(directory, "index.cjs");
    await build({
      entryPoints: ["server/share-html.ts"],
      outfile: bundle,
      platform: "node",
      format: "cjs",
      bundle: true,
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    const productionRenderer = createRequire(import.meta.url)(bundle);
    const html = await productionRenderer.renderShareHtml(metadata, "/shared/123");
    checkHtml(html);
    assert.ok(html.includes('src="/assets/built-app.js"'));
    assert.ok(!html.includes('src="/src/main.tsx"'));
    const listHtml = await productionRenderer.renderShareHtml({
      ...metadata, title: 'Friend\'s "Hotlist"', image: "https://example.com/icon-512.png",
    }, "/list/example");
    assert.ok(listHtml.includes('content="Friend&#39;s &quot;Hotlist&quot;"'));
    assert.equal((listHtml.match(/property="og:title"/g) || []).length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
