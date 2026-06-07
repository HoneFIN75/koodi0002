(function () {
  const DEFAULT_FEED =
    "https://112.fi/staattiset-rss-syotteet/-/asset_publisher/o7don5OvWPDS/rss";
  const DEFAULT_LIMIT = 6;

  const form = document.getElementById("configForm");
  const feedInput = document.getElementById("feedUrl");
  const limitInput = document.getElementById("itemLimit");
  const showDateInput = document.getElementById("showDate");
  const showDescriptionInput = document.getElementById("showDescription");
  const viewerUrlInput = document.getElementById("viewerUrl");
  const iframeSnippetInput = document.getElementById("iframeSnippet");
  const resetButton = document.getElementById("resetButton");

  hydrateFromQuery();
  updateOutput();

  form.addEventListener("input", updateOutput);
  form.addEventListener("submit", handleSubmit);
  resetButton.addEventListener("click", handleReset);

  function hydrateFromQuery() {
    const params = new URLSearchParams(window.location.search);
    feedInput.value = params.get("feed") || DEFAULT_FEED;
    limitInput.value = clampNumber(params.get("limit"), DEFAULT_LIMIT, 1, 20);
    showDateInput.checked = readBoolean(params.get("showDate"), true);
    showDescriptionInput.checked = readBoolean(params.get("showDescription"), true);
  }

  function updateOutput() {
    const viewerUrl = buildViewerUrl();
    viewerUrlInput.value = viewerUrl.toString();
    iframeSnippetInput.value =
      `<iframe src="${viewerUrl.toString()}" width="100%" height="720" style="border:0;" loading="lazy"></iframe>`;
  }

  function handleSubmit(event) {
    event.preventDefault();
    window.location.href = buildViewerUrl().toString();
  }

  function handleReset() {
    feedInput.value = DEFAULT_FEED;
    limitInput.value = DEFAULT_LIMIT;
    showDateInput.checked = true;
    showDescriptionInput.checked = true;
    updateOutput();
  }

  function buildViewerUrl() {
    const viewerUrl = new URL("rss.html", window.location.href);
    const limit = clampNumber(limitInput.value, DEFAULT_LIMIT, 1, 20);
    const feedUrl = sanitizeFeedUrl(feedInput.value) || DEFAULT_FEED;

    viewerUrl.searchParams.set("feed", feedUrl);
    viewerUrl.searchParams.set("limit", String(limit));
    viewerUrl.searchParams.set("showDate", showDateInput.checked ? "1" : "0");
    viewerUrl.searchParams.set("showDescription", showDescriptionInput.checked ? "1" : "0");

    return viewerUrl;
  }

  function sanitizeFeedUrl(value) {
    try {
      const parsedUrl = new URL(value.trim());
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return "";
      }
      return parsedUrl.toString();
    } catch (_error) {
      return "";
    }
  }

  function clampNumber(value, fallback, min, max) {
    const parsed = Number.parseInt(value || "", 10);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(parsed, min), max);
  }

  function readBoolean(value, fallback) {
    if (value === null) {
      return fallback;
    }

    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }

    return fallback;
  }
})();
