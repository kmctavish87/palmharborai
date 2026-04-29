document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("studyList")) {
    return;
  }

  initTmsHub();
});

async function initTmsHub() {
  const state = {
    studies: [],
    news: [],
    query: "",
    filter: "All",
    studySort: "newest",
    newsSort: "newest",
    selected: new Map(),
    lastUpdated: null,
  };

  const elements = {
    search: document.getElementById("tmsSearch"),
    searchButton: document.getElementById("tmsSearchButton"),
    filterRow: document.getElementById("tmsFilterRow"),
    studySort: document.getElementById("studySort"),
    newsSort: document.getElementById("newsSort"),
    studyList: document.getElementById("studyList"),
    newsList: document.getElementById("newsList"),
    studyEmpty: document.getElementById("studyEmptyState"),
    newsEmpty: document.getElementById("newsEmptyState"),
    selectedCount: document.getElementById("tmsSelectedCount"),
    lastUpdated: document.getElementById("tmsLastUpdated"),
    statusBar: document.getElementById("tmsStatusBar"),
    generatedDraft: document.getElementById("generatedDraft"),
    generateDraftButton: document.getElementById("generateDraftButton"),
    clearSelectionsButton: document.getElementById("clearSelectionsButton"),
    copyDraftButton: document.getElementById("copyDraftButton"),
    downloadDraftButton: document.getElementById("downloadDraftButton"),
  };

  bindInteractions(state, elements);
  await loadHubData(state, elements);
}

function bindInteractions(state, elements) {
  elements.searchButton.addEventListener("click", () => {
    state.query = elements.search.value.trim();
    renderHub(state, elements);
  });

  elements.search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.query = elements.search.value.trim();
      renderHub(state, elements);
    }
  });

  document.querySelectorAll(".tms-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      elements.search.value = chip.dataset.chip || "";
      state.query = elements.search.value.trim();
      updateActiveChip(elements.search.value.trim());
      renderHub(state, elements);
    });
  });

  elements.filterRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) {
      return;
    }

    state.filter = button.dataset.filter || "All";
    elements.filterRow.querySelectorAll(".tms-filter-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip === button);
    });
    renderHub(state, elements);
  });

  elements.studySort.addEventListener("change", () => {
    state.studySort = elements.studySort.value;
    renderHub(state, elements);
  });

  elements.newsSort.addEventListener("change", () => {
    state.newsSort = elements.newsSort.value;
    renderHub(state, elements);
  });

  elements.generateDraftButton.addEventListener("click", async () => {
    await generateDraft(state, elements);
  });

  elements.clearSelectionsButton.addEventListener("click", () => {
    state.selected.clear();
    elements.generatedDraft.value = "";
    updateSelectionCount(state, elements);
    renderHub(state, elements);
  });

  elements.copyDraftButton.addEventListener("click", async () => {
    if (!elements.generatedDraft.value.trim()) {
      return;
    }

    await navigator.clipboard.writeText(elements.generatedDraft.value);
    elements.copyDraftButton.textContent = "Copied";
    window.setTimeout(() => {
      elements.copyDraftButton.textContent = "Copy";
    }, 1600);
  });

  elements.downloadDraftButton.addEventListener("click", () => {
    const text = elements.generatedDraft.value.trim();
    if (!text) {
      return;
    }

    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tms-draft.md";
    link.click();
    URL.revokeObjectURL(url);
  });
}

async function loadHubData(state, elements) {
  setStatus(elements, "Loading the latest TMS research and news sources...");

  try {
    const response = await fetch("/api/tms");
    if (!response.ok) {
      throw new Error("Unable to load TMS intelligence data.");
    }

    const payload = await response.json();
    state.studies = payload.studies || [];
    state.news = payload.news || [];
    state.lastUpdated = payload.lastUpdated || null;
    elements.lastUpdated.textContent = state.lastUpdated
      ? formatDateTime(state.lastUpdated)
      : "Not available";

    setStatus(
      elements,
      `Loaded ${state.studies.length} studies and ${state.news.length} news articles.`
    );
    renderHub(state, elements);
  } catch (error) {
    setStatus(
      elements,
      "There was a problem loading TMS data. Check API configuration and refresh settings."
    );
    console.error(error);
  }
}

function renderHub(state, elements) {
  updateActiveChip(state.query);

  const filteredStudies = filterAndSortItems(state.studies, state.query, state.filter, state.studySort);
  const filteredNews = filterAndSortItems(state.news, state.query, state.filter, state.newsSort);

  renderItemList(filteredStudies, "study", state, elements.studyList);
  renderItemList(filteredNews, "news", state, elements.newsList);

  elements.studyEmpty.hidden = filteredStudies.length > 0;
  elements.newsEmpty.hidden = filteredNews.length > 0;
  updateSelectionCount(state, elements);
}

function renderItemList(items, type, state, container) {
  container.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("article");
    const selectionKey = `${type}:${item.id}`;
    const isSelected = state.selected.has(selectionKey);
    card.className = `tms-result-card${isSelected ? " is-selected" : ""}`;

    const title = escapeHtml(item.title || "Untitled");
    const source = escapeHtml(item.journal || item.source || "Unknown source");
    const summary = escapeHtml(item.abstract || item.summary || item.snippet || "No summary available.");
    const url = item.source_url || item.url || "#";
    const date = formatDate(item.publication_date || item.published_date || item.date_added);
    const metaBits = [
      date,
      type === "study" ? source : `Publisher: ${source}`,
      item.authors && item.authors.length ? `Authors: ${item.authors.slice(0, 3).join(", ")}` : "",
      item.author ? `Author: ${item.author}` : "",
      item.doi ? `DOI: ${item.doi}` : "",
      item.pmid ? `PMID: ${item.pmid}` : "",
    ].filter(Boolean);

    const imageMarkup =
      type === "news" && item.image_url
        ? `<img class="tms-card-image" src="${escapeAttribute(item.image_url)}" alt="" loading="lazy" />`
        : "";

    const tags = (item.tags || []).slice(0, 6);
    const tagMarkup = tags.length
      ? `<div class="tms-card-tags">${tags
          .map((tag) => `<span class="tms-tag">${escapeHtml(tag)}</span>`)
          .join("")}</div>`
      : "";
    const sourceLinkMarkup =
      url && url !== "#"
        ? `<a class="tms-link-button" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">
            Open source
          </a>`
        : "";

    card.innerHTML = `
      ${imageMarkup}
      <h3>${title}</h3>
      <div class="tms-card-meta">${metaBits.map((bit) => `<span>${escapeHtml(bit)}</span>`).join("")}</div>
      <p class="tms-card-summary">${summary}</p>
      ${tagMarkup}
      <div class="tms-card-actions">
        <button class="tms-select-button${isSelected ? " is-selected" : ""}" type="button">
          ${isSelected ? "Selected" : "Select for content generation"}
        </button>
        ${sourceLinkMarkup}
      </div>
    `;

    const selectButton = card.querySelector(".tms-select-button");
    selectButton.addEventListener("click", () => {
      if (state.selected.has(selectionKey)) {
        state.selected.delete(selectionKey);
      } else {
        state.selected.set(selectionKey, {
          id: item.id,
          type,
          title: item.title,
          source: item.journal || item.source || "",
          summary: item.abstract || item.summary || item.snippet || "",
          publicationDate: item.publication_date || item.published_date || "",
          url,
          tags: item.tags || [],
        });
      }

      renderHub(state, {
        ...documentTmsElements(),
        studyList: document.getElementById("studyList"),
        newsList: document.getElementById("newsList"),
        studyEmpty: document.getElementById("studyEmptyState"),
        newsEmpty: document.getElementById("newsEmptyState"),
        selectedCount: document.getElementById("tmsSelectedCount"),
      });
    });

    container.appendChild(card);
  });
}

function documentTmsElements() {
  return {
    search: document.getElementById("tmsSearch"),
    searchButton: document.getElementById("tmsSearchButton"),
    filterRow: document.getElementById("tmsFilterRow"),
    studySort: document.getElementById("studySort"),
    newsSort: document.getElementById("newsSort"),
    generatedDraft: document.getElementById("generatedDraft"),
    lastUpdated: document.getElementById("tmsLastUpdated"),
    statusBar: document.getElementById("tmsStatusBar"),
    generateDraftButton: document.getElementById("generateDraftButton"),
    clearSelectionsButton: document.getElementById("clearSelectionsButton"),
    copyDraftButton: document.getElementById("copyDraftButton"),
    downloadDraftButton: document.getElementById("downloadDraftButton"),
  };
}

function filterAndSortItems(items, query, activeFilter, sortOrder) {
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = items
    .map((item) => ({
      ...item,
      _relevance: computeRelevance(item, normalizedQuery, activeFilter),
    }))
    .filter((item) => {
      const tags = item.tags || [];
      const passesFilter =
        activeFilter === "All" ||
        tags.some((tag) => tag.toLowerCase() === activeFilter.toLowerCase()) ||
        (item.condition_category || "").toLowerCase() === activeFilter.toLowerCase();

      if (!passesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return item._relevance > 0;
    });

  return filtered.sort((a, b) => {
    if (sortOrder === "relevant") {
      return b._relevance - a._relevance || compareDatesDesc(a, b);
    }

    if (sortOrder === "oldest") {
      return compareDatesAsc(a, b);
    }

    return compareDatesDesc(a, b);
  });
}

function computeRelevance(item, query, activeFilter) {
  let score = 0;
  const haystack = [
    item.title,
    item.abstract,
    item.summary,
    item.journal,
    item.source,
    item.condition_category,
    ...(item.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!query) {
    score += 1;
  } else if (haystack.includes(query)) {
    score += 8;
    if ((item.title || "").toLowerCase().includes(query)) {
      score += 6;
    }
  }

  if (activeFilter !== "All") {
    const tags = (item.tags || []).map((tag) => tag.toLowerCase());
    if (tags.includes(activeFilter.toLowerCase())) {
      score += 4;
    }
  }

  return score;
}

function compareDatesDesc(a, b) {
  return new Date(getItemDate(b)).getTime() - new Date(getItemDate(a)).getTime();
}

function compareDatesAsc(a, b) {
  return new Date(getItemDate(a)).getTime() - new Date(getItemDate(b)).getTime();
}

function getItemDate(item) {
  return item.publication_date || item.published_date || item.date_added || "1970-01-01";
}

async function generateDraft(state, elements) {
  const selectedItems = Array.from(state.selected.values());
  if (!selectedItems.length) {
    setStatus(elements, "Select at least one study or article before generating a draft.");
    return;
  }

  // The API receives only selected source metadata and summaries so the generated
  // draft stays grounded in the chosen material and is easier to review.
  setStatus(elements, "Generating a draft from selected sources...");
  elements.generateDraftButton.disabled = true;

  try {
    const response = await fetch("/api/tms/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: document.getElementById("contentType").value,
        tone: document.getElementById("contentTone").value,
        items: selectedItems,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to generate draft.");
    }

    elements.generatedDraft.value = payload.draft || "";
    setStatus(elements, "Draft generated. Review carefully before publishing.");
  } catch (error) {
    console.error(error);
    setStatus(
      elements,
      "The draft could not be generated. Check the OpenAI key and try again."
    );
  } finally {
    elements.generateDraftButton.disabled = false;
  }
}

function updateSelectionCount(state, elements) {
  elements.selectedCount.textContent = String(state.selected.size);
}

function updateActiveChip(query) {
  document.querySelectorAll(".tms-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.chip === query);
  });
}

function setStatus(elements, message) {
  elements.statusBar.textContent = message;
}

function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
