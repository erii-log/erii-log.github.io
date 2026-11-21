const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const markdownIt = require("markdown-it")({ html: true, linkify: true });
const {
  setMonths,
  renderPost,
  renderIndex,
  renderMonth,
  renderTagList,
  renderTag,
  renderAbout,
} = require("./templates");

const SITEINFO_DIR = path.resolve(__dirname, "../_siteinfo");
const POSTS_DIR = path.resolve(__dirname, "../posts");
const OUT_DIR = path.resolve(__dirname, "../docs");
const REPO_ROOT = path.resolve(__dirname, "..");
const PER_PAGE = 30;

function formatMtimeDateUTC(filePath) {
  const stat = fs.statSync(filePath);
  return new Date(stat.mtimeMs).toISOString().slice(0, 10);
}

function loadGitLastModMap() {
  const map = new Map();
  try {
    const dirty = new Set();
    const statusOut = execSync("git status --porcelain -- posts/", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
    for (const line of statusOut.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const rel = line.slice(3).trim().replace(/^"|"$/g, "");
      dirty.add(rel);
    }

    const logOut = execSync("git log --format=COMMIT:%ct --name-only -- posts/", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
    let curDate = null;
    for (const line of logOut.split(/\r?\n/)) {
      if (line.startsWith("COMMIT:")) {
        const sec = Number(line.slice(7).trim());
        curDate = Number.isFinite(sec)
          ? new Date(sec * 1000).toISOString().slice(0, 10)
          : null;
      } else if (line.startsWith("posts/") && curDate && !map.has(line)) {
        if (!dirty.has(line)) {
          map.set(line, curDate);
        }
      }
    }
  } catch (_) {
    // Fallback to filesystem mtime if git is unavailable
  }
  return map;
}

// Tag name → short filesystem-safe slug
function tagSlug(tag) {
  return crypto.createHash("md5").update(tag).digest("hex").slice(0, 10);
}

// --- Utilities ---

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  mkdirp(dir);
}

// --- Step 1: Collect posts ---

function collectPosts(gitLastModMap) {
  const results = [];
  const monthDirs = fs.readdirSync(POSTS_DIR).filter((d) => {
    return fs.statSync(path.join(POSTS_DIR, d)).isDirectory() && /^\d{4}-\d{2}$/.test(d);
  });

  for (const monthDir of monthDirs.sort()) {
    const monthPath = path.join(POSTS_DIR, monthDir);
    const files = fs.readdirSync(monthPath).filter((f) => {
        if (!f.endsWith(".md")) return false;
        const stat = fs.statSync(path.join(monthPath, f));
        return stat.size > 0;
      });

    for (const file of files.sort()) {
      const date = file.replace(".md", "");
      const day = date.slice(-2);
      const fullPath = path.join(monthPath, file);
      const relKey = `posts/${monthDir}/${file}`;
      const lastmod = gitLastModMap.get(relKey) || formatMtimeDateUTC(fullPath);
      const raw = fs.readFileSync(fullPath, "utf-8");

      // Extract title from h1
      const h1Match = raw.match(/^# (.+)$/m);
      const title = h1Match ? h1Match[1] : date;

      // Extract tags from h2
      const tags = [...raw.matchAll(/^## (.+)$/gm)].map((m) =>
        m[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim()
      );

      // SEO: pick a topic heading (first specific h3, else first specific h2)
      // and build a meta description from the day's sections.
      const cleanHeading = (s) =>
        s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").trim();
      const GENERIC_H3 = new Set([
        "開催概要", "セットリスト", "グッズ販売", "グッズ", "共演者の方",
        "Twitter", "Instagram", "TikTok", "詳細", "タイムテーブル",
      ]);
      const GENERIC_H2 = new Set(["SNS更新", "ブログ更新", "告知"]);
      const h3s = [...raw.matchAll(/^### (.+)$/gm)].map((m) => cleanHeading(m[1]));
      let topic =
        h3s.find((h) => h && !GENERIC_H3.has(h)) ||
        tags.map(cleanHeading).find((h) => h && !GENERIC_H2.has(h)) ||
        null;
      // Event-like first h2 (e.g. a live/event title) wins over a later h3
      const firstH2 = tags.length > 0 ? cleanHeading(tags[0]) : null;
      if (firstH2 && /Event|Live|LIVE|公演|ツアー|TOUR|フェス|舞台/.test(firstH2)) {
        topic = firstH2;
      }
      const [yy, mm, dd] = date.split("-");
      let description = `山崎エリイの${yy}年${Number(mm)}月${Number(dd)}日の活動記録。`;
      const sectionList = [...new Set(tags.map(cleanHeading).filter(Boolean))].slice(0, 4);
      if (sectionList.length > 0) description += `この日の記録：${sectionList.join("、")}。`;
      if (topic) description += topic;
      if (description.length > 120) description = description.slice(0, 119) + "…";

      // Remove h1 from markdown before rendering (title is shown separately)
      const bodyMd = raw.replace(/^# .+$/m, "").trim();

      // Render markdown to HTML, strip <script> tags
      const content = markdownIt
        .render(bodyMd)
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

      results.push({
        date,
        day,
        month: monthDir,
        lastmod,
        title,
        tags,
        topic,
        description,
        content,
        url: `${monthDir}/${day}.html`,
      });
    }
  }

  // Sort descending by date
  results.sort((a, b) => b.date.localeCompare(a.date));

  // Add prev/next links
  for (let i = 0; i < results.length; i++) {
    results[i].nextUrl = i > 0 ? results[i - 1].url : null;
    results[i].prevUrl = i < results.length - 1 ? results[i + 1].url : null;
  }

  return results;
}

// --- Step 2: Build individual post pages ---

function buildPostPages(posts) {
  for (const post of posts) {
    const filePath = path.join(OUT_DIR, post.month, `${post.day}.html`);
    writeFile(filePath, renderPost(post));
  }
  console.log(`  Post pages: ${posts.length}`);
}

// --- Step 3: Build index pages with pagination ---

function buildIndexPages(posts) {
  const totalPages = Math.ceil(posts.length / PER_PAGE);

  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * PER_PAGE;
    const slice = posts.slice(start, start + PER_PAGE);
    const root = page === 1 ? "." : "../..";
    const html = renderIndex(slice, { current: page, total: totalPages }, root);

    if (page === 1) {
      writeFile(path.join(OUT_DIR, "index.html"), html);
    } else {
      writeFile(path.join(OUT_DIR, "page", String(page), "index.html"), html);
    }
  }
  console.log(`  Index pages: ${totalPages}`);
}

// --- Step 4: Build month index pages ---

function buildMonthPages(posts) {
  const byMonth = new Map();
  for (const post of posts) {
    if (!byMonth.has(post.month)) byMonth.set(post.month, []);
    byMonth.get(post.month).push(post);
  }

  const sortedMonths = [...byMonth.keys()].sort();
  for (let i = 0; i < sortedMonths.length; i++) {
    const month = sortedMonths[i];
    const monthPosts = byMonth.get(month);
    const prevMonth = i > 0 ? sortedMonths[i - 1] : null;
    const nextMonth = i < sortedMonths.length - 1 ? sortedMonths[i + 1] : null;
    const filePath = path.join(OUT_DIR, month, "index.html");
    writeFile(filePath, renderMonth(month, monthPosts, { prevMonth, nextMonth }));
  }
  console.log(`  Month pages: ${byMonth.size}`);
}

// --- Step 5: Build tag pages ---

function buildTagPages(posts) {
  const byTag = new Map();
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(post);
    }
  }

  // Tag list page
  const tagCounts = [...byTag.entries()].map(([tag, posts]) => ({
    tag,
    count: posts.length,
  }));
  writeFile(path.join(OUT_DIR, "tags", "index.html"), renderTagList(tagCounts));

  // Individual tag pages
  for (const [tag, tagPosts] of byTag) {
    const slug = tagSlug(tag);
    const filePath = path.join(OUT_DIR, "tags", slug, "index.html");
    writeFile(filePath, renderTag(tag, tagPosts));
  }
  console.log(`  Tag pages: ${byTag.size + 1}`);
}

// --- Step 6: Build sitemap.xml & robots.txt ---

const SITE_BASE_URL = "https://erii-log.github.io";

function buildSitemap(posts, gitLastModMap) {
  const urls = [];
  const maxDate = (a, b) => (!a ? b : !b ? a : a > b ? a : b);
  const latestLastMod = posts.reduce((acc, p) => maxDate(acc, p.lastmod), null);

  // Top page & About page & Tag list page
  urls.push({ loc: `${SITE_BASE_URL}/`, lastmod: latestLastMod });
  const aboutPath = path.join(POSTS_DIR, "about.md");
  if (fs.existsSync(aboutPath)) {
    const aboutLastMod =
      gitLastModMap.get("posts/about.md") || formatMtimeDateUTC(aboutPath);
    urls.push({ loc: `${SITE_BASE_URL}/about.html`, lastmod: aboutLastMod });
  }
  urls.push({ loc: `${SITE_BASE_URL}/tags/`, lastmod: latestLastMod });

  // Index pagination pages (page 2..N)
  const totalIndexPages = Math.ceil(posts.length / PER_PAGE);
  for (let page = 2; page <= totalIndexPages; page++) {
    const start = (page - 1) * PER_PAGE;
    const slice = posts.slice(start, start + PER_PAGE);
    const pageLastMod = slice.reduce((acc, p) => maxDate(acc, p.lastmod), latestLastMod);
    urls.push({ loc: `${SITE_BASE_URL}/page/${page}/`, lastmod: pageLastMod });
  }

  // Month index pages
  const monthLatest = new Map();
  for (const p of posts) {
    monthLatest.set(p.month, maxDate(monthLatest.get(p.month), p.lastmod));
  }
  for (const [month, lastmod] of monthLatest) {
    urls.push({ loc: `${SITE_BASE_URL}/${month}/`, lastmod });
  }

  // Tag pages
  const tagLatest = new Map();
  for (const p of posts) {
    for (const tag of p.tags) {
      tagLatest.set(tag, maxDate(tagLatest.get(tag), p.lastmod));
    }
  }
  for (const [tag, lastmod] of tagLatest) {
    urls.push({ loc: `${SITE_BASE_URL}/tags/${tagSlug(tag)}/`, lastmod });
  }

  // Individual post pages
  for (const p of posts) {
    urls.push({ loc: `${SITE_BASE_URL}/${p.url}`, lastmod: p.lastmod });
  }

  const urlEntries = urls.map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}\n  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join("\n")}\n</urlset>\n`;

  writeFile(path.join(OUT_DIR, "sitemap.xml"), xml);
  writeFile(
    path.join(OUT_DIR, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_BASE_URL}/sitemap.xml\n`
  );
  console.log(`  Sitemap: ${urls.length} URLs`);
}

// --- Step 7: Build search index ---

function buildSearchIndex(posts) {
  const index = posts.map((p) => ({
    d: p.date,
    m: p.month,
    t: p.tags,
    u: p.url,
  }));
  writeFile(
    path.join(OUT_DIR, "search-index.json"),
    JSON.stringify(index)
  );
  const sizeKB = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(1);
  console.log(`  Search index: ${sizeKB} KB`);
}

// --- Main ---

// --- Step 7: Copy static assets ---

function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    mkdirp(dest);
    for (const f of fs.readdirSync(src)) {
      copyRecursive(path.join(src, f), path.join(dest, f));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyAssets() {
  const assetsDir = path.join(__dirname, "assets");
  if (!fs.existsSync(assetsDir)) return;
  copyRecursive(assetsDir, OUT_DIR);
}

function copyPostsAssets() {
  const postsAssetDir = path.join(POSTS_DIR, "asset");
  if (!fs.existsSync(postsAssetDir)) return;
  copyRecursive(postsAssetDir, path.join(OUT_DIR, "asset"));
  console.log("  Posts assets: copied");
}

// --- Step 8: Build about page ---

function buildAboutPage() {
  const aboutPath = path.join(POSTS_DIR, "about.md");
  if (!fs.existsSync(aboutPath)) return;
  const raw = fs.readFileSync(aboutPath, "utf-8");
  const html = markdownIt.render(raw);
  writeFile(path.join(OUT_DIR, "about.html"), renderAbout(html));
  console.log("  About page: built");
}

function copySiteinfo() {
  if (!fs.existsSync(SITEINFO_DIR)) return;
  copyRecursive(SITEINFO_DIR, OUT_DIR);
  console.log("  Site info: copied");
}
// --- Main ---

console.log("Building static site...");
console.log(`  Posts dir: ${POSTS_DIR}`);
console.log(`  Output dir: ${OUT_DIR}`);

cleanDir(OUT_DIR);
fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "");

const gitLastModMap = loadGitLastModMap();
const posts = collectPosts(gitLastModMap);
console.log(`  Total posts: ${posts.length}`);

// Pass month list to templates for sidebar navigation
const months = [...new Set(posts.map(p => p.month))].sort();
setMonths(months);

buildPostPages(posts);
buildIndexPages(posts);
buildMonthPages(posts);
buildTagPages(posts);
buildSitemap(posts, gitLastModMap);
buildSearchIndex(posts);
copyAssets();
copyPostsAssets();
buildAboutPage();
copySiteinfo();

console.log("Done!");
