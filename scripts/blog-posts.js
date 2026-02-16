(function () {
  function candidatePaths(path) {
    const value = String(path || "").trim();
    if (!value) return [];
    if (value.startsWith("/")) return [value];
    return [value, `/${value}`];
  }

  async function fetchWithFallback(path) {
    const candidates = candidatePaths(path);
    let lastStatus = "";

    for (const candidate of candidates) {
      const response = await fetch(candidate);
      if (response.ok) return response;
      lastStatus = `${candidate} (${response.status})`;
    }

    throw new Error(
      `Failed to load ${path}${lastStatus ? `: ${lastStatus}` : ""}`,
    );
  }

  function uniqueSortedPaths(paths) {
    const unique = Array.from(
      new Set(
        (paths || [])
          .map((path) => String(path || "").trim())
          .filter((path) => path.endsWith(".md")),
      ),
    );
    return unique.sort((a, b) => b.localeCompare(a));
  }

  async function discoverBlogFilesFromDirectory() {
    try {
      const response = await fetchWithFallback("content/blog/");
      const html = await response.text();
      const matches = html.matchAll(/href="([^"]+\.md)"/g);
      const files = [];

      for (const match of matches) {
        const href = match[1];
        if (href.startsWith("http://") || href.startsWith("https://")) continue;
        if (href.includes("..")) continue;

        if (href.startsWith("content/blog/")) {
          files.push(href);
          continue;
        }

        const cleanHref = href.startsWith("/") ? href.slice(1) : href;
        files.push(`content/blog/${cleanHref}`);
      }

      return uniqueSortedPaths(files);
    } catch (_error) {
      return [];
    }
  }

  async function discoverBlogFilesFromGitHub(repo) {
    const repoName = repo || "pragyamodi/pragyamodi.github.io";
    const url = `https://api.github.com/repos/${repoName}/contents/content/blog`;

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) return [];

      const items = await response.json();
      if (!Array.isArray(items)) return [];

      const files = items
        .filter(
          (item) => item && item.type === "file" && /\.md$/i.test(item.name),
        )
        .map((item) => item.path);

      return uniqueSortedPaths(files);
    } catch (_error) {
      return [];
    }
  }

  function stripQuotes(value) {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  function parseValue(rawValue) {
    const value = rawValue.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(",").map((item) => stripQuotes(item));
    }
    if (value === "true") return true;
    if (value === "false") return false;
    return stripQuotes(value);
  }

  function parseFrontMatter(markdown) {
    const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) {
      return { meta: {}, body: markdown };
    }

    const metaText = match[1];
    const body = match[2];
    const meta = {};

    metaText.split("\n").forEach((line) => {
      const keyValueMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (!keyValueMatch) return;
      const key = keyValueMatch[1];
      const value = keyValueMatch[2];
      meta[key] = parseValue(value);
    });

    return { meta, body };
  }

  function createBlogItem(entry) {
    const li = document.createElement("li");
    li.className = "blog-item";

    const source = String(entry.meta.source || "website").toLowerCase();
    li.setAttribute(
      "data-source",
      source === "external" ? "external" : "website",
    );

    const title = document.createElement("h3");
    title.textContent = entry.meta.title || "Untitled Blog";
    li.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "blog-meta";
    const metaParts = [entry.meta.platform, entry.meta.date].filter(Boolean);
    meta.textContent = metaParts.join(" • ");
    li.appendChild(meta);

    const summary = document.createElement("p");
    summary.textContent =
      entry.meta.summary || entry.body.trim() || "No summary provided.";
    li.appendChild(summary);

    const link = document.createElement("a");
    link.className = "cta-button";
    link.href = entry.meta.url || "#";
    link.textContent = source === "external" ? "Read Article" : "Read Blog";
    if (source === "external") {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    li.appendChild(link);

    return li;
  }

  async function fetchMarkdown(path) {
    const response = await fetchWithFallback(path);
    const markdown = await response.text();
    return parseFrontMatter(markdown);
  }

  async function initBlogs() {
    const list = document.querySelector(".blog-list");
    const emptyState = document.getElementById("blog-empty-state");
    if (!list) return;

    try {
      const manifestResponse = await fetchWithFallback("data/site.json");
      const manifest = await manifestResponse.json();
      const configuredFiles =
        manifest.content && Array.isArray(manifest.content.blog_files)
          ? manifest.content.blog_files
          : [];
      const repo =
        manifest.profile && typeof manifest.profile.github_repo === "string"
          ? manifest.profile.github_repo
          : "";

      const directoryDiscoveredFiles = await discoverBlogFilesFromDirectory();
      const githubDiscoveredFiles = directoryDiscoveredFiles.length
        ? []
        : await discoverBlogFilesFromGitHub(repo);

      const files = uniqueSortedPaths([
        ...directoryDiscoveredFiles,
        ...githubDiscoveredFiles,
        ...configuredFiles,
      ]);

      const entries = await Promise.all(files.map(fetchMarkdown));
      list.innerHTML = "";
      entries.forEach((entry) => list.appendChild(createBlogItem(entry)));
      if (emptyState) {
        emptyState.hidden = entries.length > 0;
      }
    } catch (error) {
      console.error(error);
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = "Unable to load blog posts right now.";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initBlogs);
})();
