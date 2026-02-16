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

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

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

  function extractBullets(markdownBody) {
    return markdownBody
      .split("\n")
      .map((line) => line.match(/^\s*-\s+(.*)$/))
      .filter(Boolean)
      .map((match) => match[1].trim())
      .filter(Boolean);
  }

  function extractParagraphs(markdownBody) {
    return markdownBody
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .filter((block) => !block.startsWith("- "))
      .map((block) => block.replace(/\n+/g, " "));
  }

  function formatDate(dateValue) {
    if (!dateValue) return "";

    const normalized = String(dateValue).trim();
    if (!normalized) return "";
    if (normalized.toLowerCase() === "present") return "Present";

    if (/^\d{4}$/.test(normalized)) {
      return normalized;
    }

    if (/^\d{4}-\d{2}$/.test(normalized)) {
      const [year, month] = normalized.split("-");
      const monthIndex = Number(month) - 1;
      const monthName = monthNames[monthIndex];
      return monthName ? `${monthName} ${year}` : normalized;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const [year, month] = normalized.split("-");
      const monthIndex = Number(month) - 1;
      const monthName = monthNames[monthIndex];
      return monthName ? `${monthName} ${year}` : normalized;
    }

    return normalized;
  }

  function buildDateRange(meta) {
    const start = formatDate(meta.start_date);
    const end = meta.current ? "Present" : formatDate(meta.end_date);
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
    return end || "";
  }

  function buildSubtitle(meta) {
    if (meta.subtitle) return meta.subtitle;
    const org = meta.organization || "";
    const range = buildDateRange(meta);
    return org && range ? `${org} (${range})` : org || range || "";
  }

  function createTimelineItem(entry) {
    const item = document.createElement("div");
    item.className = "timeline-item";

    const title = document.createElement("h3");
    title.textContent = entry.meta.role || entry.meta.title || "Experience";
    item.appendChild(title);

    const subtitleText = buildSubtitle(entry.meta);
    if (subtitleText) {
      const subtitle = document.createElement("p");
      subtitle.textContent = subtitleText;
      item.appendChild(subtitle);
    }

    const bullets = extractBullets(entry.body);
    if (bullets.length > 0) {
      const list = document.createElement("ul");
      bullets.forEach((bullet) => {
        const li = document.createElement("li");
        li.textContent = bullet;
        list.appendChild(li);
      });
      item.appendChild(list);
    } else {
      const paragraphs = extractParagraphs(entry.body);
      if (paragraphs.length > 0) {
        paragraphs.forEach((paragraphText) => {
          const paragraph = document.createElement("p");
          paragraph.textContent = paragraphText;
          item.appendChild(paragraph);
        });
      } else if (entry.meta.summary) {
        const summary = document.createElement("p");
        summary.textContent = entry.meta.summary;
        item.appendChild(summary);
      }
    }

    return item;
  }

  function createTalkTimelineItem(talk) {
    const item = document.createElement("div");
    item.className = "timeline-item";

    const title = document.createElement("h3");
    title.textContent = talk.title || "Talk";
    item.appendChild(title);

    const subtitleParts = [];
    if (talk.subtitle) subtitleParts.push(talk.subtitle);
    if (talk.date) subtitleParts.push(talk.date);
    const subtitleText = subtitleParts.join(", ");

    if (subtitleText) {
      const subtitle = document.createElement("p");
      subtitle.textContent = subtitleText;
      item.appendChild(subtitle);
    }

    return item;
  }

  function createEducationTimelineItem(education) {
    const item = document.createElement("div");
    item.className = "timeline-item";

    const title = document.createElement("h3");
    title.textContent = education.title || "Education";
    item.appendChild(title);

    const subtitleParts = [];
    if (education.organisation) subtitleParts.push(education.organisation);
    if (education.date) subtitleParts.push(education.date);
    const formattedSubtitle =
      education.organisation && education.date
        ? `${education.organisation} (${education.date})`
        : subtitleParts.join(", ");

    if (formattedSubtitle) {
      const subtitle = document.createElement("p");
      subtitle.textContent = formattedSubtitle;
      item.appendChild(subtitle);
    }

    if (education.grade) {
      const grade = document.createElement("p");
      grade.textContent = education.grade;
      item.appendChild(grade);
    }

    if (education.thesis) {
      const thesis = document.createElement("p");
      thesis.textContent = `Thesis: ${education.thesis}`;
      item.appendChild(thesis);
    }

    const courses = Array.isArray(education.courses) ? education.courses : [];
    if (courses.length > 0) {
      const coursesText = document.createElement("p");
      coursesText.textContent = `Key Courses: ${courses.join(", ")}`;
      item.appendChild(coursesText);
    }

    return item;
  }

  function createSimpleListItem(entry) {
    const item = document.createElement("li");
    const parts = [];
    if (entry.title) parts.push(entry.title);
    const details = [entry.organisation, entry.date].filter(Boolean).join(", ");
    if (details) {
      item.textContent = `${parts[0] || "Item"} (${details})`;
    } else {
      item.textContent = parts[0] || "Item";
    }
    return item;
  }

  function showLoadError(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML =
      '<div class="timeline-item"><p>Unable to load experience content right now.</p></div>';
  }

  async function fetchExperience(path) {
    const response = await fetchWithFallback(path);
    const markdown = await response.text();
    return parseFrontMatter(markdown);
  }

  async function renderTimeline(containerId, filePaths) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entries = await Promise.all(filePaths.map(fetchExperience));
    container.innerHTML = "";
    entries.forEach((entry) =>
      container.appendChild(createTimelineItem(entry)),
    );
  }

  async function renderJsonList(containerId, jsonPath, itemRenderer) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!jsonPath) {
      container.innerHTML = "";
      return;
    }

    const response = await fetchWithFallback(jsonPath);

    const entries = await response.json();
    const safeEntries = Array.isArray(entries) ? entries : [];
    container.innerHTML = "";
    safeEntries.forEach((entry) => container.appendChild(itemRenderer(entry)));
  }

  async function renderEducationTimeline(containerId, jsonPath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!jsonPath) {
      container.innerHTML = "";
      return;
    }

    const response = await fetchWithFallback(jsonPath);

    const educationItems = await response.json();
    const safeItems = Array.isArray(educationItems) ? educationItems : [];
    container.innerHTML = "";
    safeItems.forEach((item) =>
      container.appendChild(createEducationTimelineItem(item)),
    );
  }

  async function renderTalksTimeline(containerId, jsonPath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!jsonPath) {
      container.innerHTML = "";
      return;
    }

    const response = await fetchWithFallback(jsonPath);

    const talks = await response.json();
    const safeTalks = Array.isArray(talks) ? talks : [];
    container.innerHTML = "";
    safeTalks.forEach((talk) =>
      container.appendChild(createTalkTimelineItem(talk)),
    );
  }

  async function initExperiences() {
    try {
      const response = await fetchWithFallback("data/site.json");

      const manifest = await response.json();
      const workFiles =
        manifest.content &&
        Array.isArray(manifest.content.work_experience_files)
          ? manifest.content.work_experience_files
          : [];
      const researchFiles =
        manifest.content &&
        Array.isArray(manifest.content.research_experience_files)
          ? manifest.content.research_experience_files
          : [];
      const educationJsonPath =
        manifest.content && typeof manifest.content.education_json === "string"
          ? manifest.content.education_json
          : "";
      const volunteeringFiles =
        manifest.content && Array.isArray(manifest.content.volunteering_files)
          ? manifest.content.volunteering_files
          : [];
      const talksJsonPath =
        manifest.content && typeof manifest.content.talks_json === "string"
          ? manifest.content.talks_json
          : "";
      const awardsJsonPath =
        manifest.content && typeof manifest.content.awards_json === "string"
          ? manifest.content.awards_json
          : "";
      const certificationsJsonPath =
        manifest.content &&
        typeof manifest.content.certifications_json === "string"
          ? manifest.content.certifications_json
          : "";

      await Promise.all([
        renderTimeline("work-experience-timeline", workFiles),
        renderTimeline("research-experience-timeline", researchFiles),
        renderEducationTimeline("education-timeline", educationJsonPath),
        renderTimeline("volunteering-timeline", volunteeringFiles),
        renderTalksTimeline("talks-timeline", talksJsonPath),
        renderJsonList("awards-list", awardsJsonPath, createSimpleListItem),
        renderJsonList(
          "certifications-list",
          certificationsJsonPath,
          createSimpleListItem,
        ),
      ]);
    } catch (error) {
      console.error(error);
      showLoadError("work-experience-timeline");
      showLoadError("research-experience-timeline");
      showLoadError("education-timeline");
      showLoadError("volunteering-timeline");
      showLoadError("talks-timeline");
    }
  }

  document.addEventListener("DOMContentLoaded", initExperiences);
})();
