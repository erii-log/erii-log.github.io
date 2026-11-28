const crypto = require("crypto");

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tagSlug(tag) {
  return crypto.createHash("md5").update(tag).digest("hex").slice(0, 10);
}

// months and common keywords are set by build.js before rendering
let _months = [];
function setMonths(months) { _months = months; }

let _commonKeywords = [];
function setCommonKeywords(keywords) { _commonKeywords = keywords; }

function buildKeywordsMeta(extraKeywords = []) {
  const all = [..._commonKeywords, ...extraKeywords]
    .map((k) => (k ? String(k).trim() : ""))
    .filter(Boolean);
  const unique = [...new Set(all)];
  return unique.join(", ");
}

function renderMonthNav(root, currentMonth) {
  // Group months by year
  const byYear = new Map();
  for (const m of _months) {
    const year = m.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(m);
  }

  const years = [...byYear.keys()].sort().reverse();
  const items = years.map(year => {
    const months = byYear.get(year).sort().reverse();
    const monthLinks = months.map(m => {
      const mm = m.slice(5, 7);
      const cls = m === currentMonth ? ' class="active"' : '';
      return `<a href="${root}/${m}/"${cls}>${mm}月</a>`;
    }).join(" ");
    return `<details${currentMonth && currentMonth.startsWith(year) ? " open" : ""}>
<summary>${year}年</summary>
<div class="month-links">${monthLinks}</div>
</details>`;
  }).join("\n");

  return `<aside class="month-nav">
<h2>月別</h2>
${items}
</aside>`;
}

const SITE_NAME = "山崎エリイ活動記録";
const SITE_BASE_URL = "https://erii-log.github.io";
const SITE_DESCRIPTION = "山崎エリイの活動を1日ごとに記録する非公式ファンサイト。イベント・番組出演・SNS更新・ブログなどを日別にまとめています。";

function renderBase(title, content, { hasEmbeds = false, currentMonth = null, root = ".", fullTitle = null, description = null, keywords = [], path = null, ogType = "website", jsonLd = null, publishedTime = null } = {}) {
  const pageTitle = fullTitle || `${title} - ${SITE_NAME}`;
  const desc = description || SITE_DESCRIPTION;
  const keywordsContent = buildKeywordsMeta(keywords);
  const canonical = path ? `${SITE_BASE_URL}${path}` : null;
  const jsonLdScript = jsonLd
    ? `\n<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="ja" data-root="${root}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(desc)}">
${keywordsContent ? `<meta name="keywords" content="${escapeHtml(keywordsContent)}">\n` : ""}${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${escapeHtml(pageTitle)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:type" content="${ogType}">
${canonical ? `<meta property="og:url" content="${canonical}">` : ""}
<meta property="og:locale" content="ja_JP">
${publishedTime ? `<meta property="article:published_time" content="${publishedTime}">` : ""}
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(pageTitle)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">${jsonLdScript}
<link rel="icon" href="${root}/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}/css/style.css">
${hasEmbeds ? `<link rel="dns-prefetch" href="https://platform.twitter.com">
<link rel="dns-prefetch" href="https://twitter.com">
<link rel="dns-prefetch" href="https://x.com">
<link rel="dns-prefetch" href="https://www.instagram.com">
<link rel="preconnect" href="https://x.com" crossorigin>
<link rel="preconnect" href="https://platform.twitter.com" crossorigin>
<link rel="preconnect" href="https://www.instagram.com" crossorigin>
<link rel="preload" as="script" href="https://platform.twitter.com/widgets.js">
<link rel="preload" as="script" href="https://www.instagram.com/embed.js">` : ""}
</head>
<body>
<header>
  <nav>
    <a href="${root}/" class="site-title">山崎エリイ活動記録</a>
    <a href="${root}/tags/">タグ一覧</a>
    <a href="${root}/about.html">このサイトについて</a>
    <button type="button" class="search-trigger" aria-label="検索">検索 <kbd>Ctrl+K</kbd></button>
  </nav>
</header>
<div class="layout">
${renderMonthNav(root, currentMonth)}
<main>
${content}
</main>
</div>
<footer>
  <p><a href="${root}/about.html">このサイトについて</a> | <a href="${root}/asset/satou_meru.html">さとうめる</a></p>
</footer>
${hasEmbeds ? `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
<script async src="https://www.instagram.com/embed.js"></script>` : ""}
<div id="search-modal" class="search-modal" hidden>
  <div class="search-overlay"></div>
  <div class="search-dialog">
    <div class="search-header">
      <input type="search" id="search-input" placeholder="日付やタグで検索…">
      <kbd>Esc</kbd>
    </div>
    <div id="search-results" class="search-results"></div>
  </div>
</div>
<script src="${root}/js/search.js"></script>
</body>
</html>`;
}

function renderTagBadges(root, tags) {
  return tags.map(t =>
    `<a href="${root}/tags/${tagSlug(t)}/" class="tag">${escapeHtml(t)}</a>`
  ).join(" ");
}

function renderPost(post) {
  const root = "..";
  const content = `
<article class="post-full">
  <h1>${escapeHtml(post.title)}</h1>
  <div class="tags">${renderTagBadges(root, post.tags)}</div>
  <div class="post-nav">
    ${post.prevUrl ? `<a href="${root}/${post.prevUrl}">&larr; 前の日</a>` : "<span></span>"}
    <a href="${root}/${post.month}/">月の一覧</a>
    ${post.nextUrl ? `<a href="${root}/${post.nextUrl}">&rarr; 次の日</a>` : "<span></span>"}
  </div>
  <div class="post-content">
    ${post.content}
  </div>
</article>`;
  const pageTitle = post.title;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: pageTitle,
    description: post.description || "",
    datePublished: post.date,
    url: `${SITE_BASE_URL}/${post.url}`,
    mainEntityOfPage: `${SITE_BASE_URL}/${post.url}`,
    about: { "@type": "Person", name: "山崎エリイ" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_BASE_URL },
    inLanguage: "ja",
  };
  return renderBase(pageTitle, content, {
    hasEmbeds: true,
    currentMonth: post.month,
    root,
    description: post.description,
    keywords: [...post.tags, ...(post.topic ? [post.topic] : [])],
    path: `/${post.url}`,
    ogType: "article",
    publishedTime: post.date,
    jsonLd,
  });
}

function renderPostListItem(root, post) {
  return `<li>
  <a href="${root}/${post.url}">${escapeHtml(post.title)}</a>
  <span class="tags-inline">${renderTagBadges(root, post.tags)}</span>
</li>`;
}

function renderPagination(current, total, baseUrl) {
  if (total <= 1) return "";
  const links = [];
  if (current > 1) {
    const prev = current === 2 ? `${baseUrl}` : `${baseUrl}page/${current - 1}/`;
    links.push(`<a href="${prev}">&laquo; 前へ</a>`);
  }

  const start = Math.max(1, current - 3);
  const end = Math.min(total, current + 3);
  for (let i = start; i <= end; i++) {
    const url = i === 1 ? `${baseUrl}` : `${baseUrl}page/${i}/`;
    if (i === current) {
      links.push(`<span class="current">${i}</span>`);
    } else {
      links.push(`<a href="${url}">${i}</a>`);
    }
  }

  if (current < total) {
    links.push(`<a href="${baseUrl}page/${current + 1}/">次へ &raquo;</a>`);
  }
  return `<nav class="pagination">${links.join(" ")}</nav>`;
}

function renderIndex(posts, pagination, root) {
  const content = `
<h1>活動記録</h1>
<ul class="post-list">
${posts.map(p => renderPostListItem(root, p)).join("\n")}
</ul>
${renderPagination(pagination.current, pagination.total, `${root}/`)}`;
  const isFirst = pagination.current === 1;
  return renderBase("活動記録", content, {
    root,
    fullTitle: isFirst ? `${SITE_NAME}｜山崎エリイの出演・イベント・SNSの日別記録` : null,
    path: isFirst ? "/" : `/page/${pagination.current}/`,
    jsonLd: isFirst
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_BASE_URL,
          description: SITE_DESCRIPTION,
          inLanguage: "ja",
          about: { "@type": "Person", name: "山崎エリイ" },
        }
      : null,
  });
}

function renderMonthPostItem(root, post) {
  return `<article class="post-full" id="${post.day}">
  <h1><a href="${root}/${post.url}">${escapeHtml(post.title)}</a></h1>
  <div class="tags">${renderTagBadges(root, post.tags)}</div>
  <div class="post-content">
    ${post.content}
  </div>
</article>`;
}

function renderMonth(month, posts, { prevMonth = null, nextMonth = null } = {}) {
  const root = "..";
  const toc = posts.map(p =>
    `<li><a href="#${p.day}">${escapeHtml(p.title)}</a></li>`
  ).join("\n");
  const monthNav = `<div class="post-nav">
    ${prevMonth ? `<a href="${root}/${prevMonth}/">&larr; ${prevMonth}</a>` : "<span></span>"}
    <a href="${root}/">トップへ</a>
    ${nextMonth ? `<a href="${root}/${nextMonth}/">${nextMonth} &rarr;</a>` : "<span></span>"}
  </div>`;
  const content = `
<h1>${month}</h1>
${monthNav}
<nav class="month-toc">
<ul>
${toc}
</ul>
</nav>
${posts.map(p => renderMonthPostItem(root, p)).join("\n<hr>\n")}
${monthNav}`;
  const [y, m] = month.split("-");
  const monthTags = [...new Set(posts.flatMap((p) => p.tags))];
  return renderBase(month, content, {
    hasEmbeds: true,
    currentMonth: month,
    root,
    description: `山崎エリイの${y}年${Number(m)}月の活動記録（全${posts.length}日分）。イベント・番組出演・SNS更新などを日別にまとめています。`,
    keywords: [`${y}年${Number(m)}月`, ...monthTags],
    path: `/${month}/`,
  });
}

function renderTagList(tagCounts) {
  const root = "..";
  const items = tagCounts
    .sort((a, b) => b.count - a.count)
    .map(({ tag, count }) =>
      `<li><a href="${root}/tags/${tagSlug(tag)}/">${escapeHtml(tag)}</a> <span class="count">(${count})</span></li>`
    );
  const content = `
<h1>タグ一覧</h1>
<ul class="tag-list">
${items.join("\n")}
</ul>
<p><a href="${root}/">&larr; トップへ</a></p>`;
  return renderBase("タグ一覧", content, {
    root,
    description: "山崎エリイ活動記録のタグ一覧。イベント・番組・レギュラー番組などのカテゴリから日別の記録を探せます。",
    path: "/tags/",
  });
}

function renderTag(tag, posts) {
  const root = "../..";
  const content = `
<h1>${escapeHtml(tag)}</h1>
<p>${posts.length} 件の記録</p>
<ul class="post-list">
${posts.map(p => renderPostListItem(root, p)).join("\n")}
</ul>
<p><a href="${root}/tags/">&larr; タグ一覧</a></p>`;
  return renderBase(tag, content, {
    root,
    description: `山崎エリイ活動記録の「${tag}」タグが付いた記録の一覧（全${posts.length}件）。`,
    keywords: [tag],
    path: `/tags/${tagSlug(tag)}/`,
  });
}

function renderAbout(htmlContent) {
  const root = ".";
  const content = `<article class="post-full">${htmlContent}</article>`;
  return renderBase("このサイトについて", content, {
    root,
    description: "山崎エリイ活動記録（erii-log）について。公式サイトとは関係のない非公式ファンサイトです。",
    path: "/about.html",
  });
}

module.exports = {
  setMonths,
  setCommonKeywords,
  renderBase,
  renderPost,
  renderIndex,
  renderMonth,
  renderTagList,
  renderTag,
  renderAbout,
};
