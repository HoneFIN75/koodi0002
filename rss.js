(function () {
  const DEFAULT_FEED =
    "https://112.fi/staattiset-rss-syotteet/-/asset_publisher/o7don5OvWPDS/rss";
  const DEFAULT_LIMIT = 6;
  const MAX_LIMIT = 20;

  const statusElement = document.getElementById("status");
  const summaryElement = document.getElementById("settingsSummary");
  const queryExampleElement = document.getElementById("queryExample");
  const feedHeadingElement = document.getElementById("feedHeading");
  const feedMetaElement = document.getElementById("feedMeta");
  const feedItemsElement = document.getElementById("feedItems");

  const settings = readSettings();
  renderSettingsSummary(settings);
  queryExampleElement.textContent = buildExampleQuery(settings);
  loadFeed(settings);

  function readSettings() {
    const params = new URLSearchParams(window.location.search);
    const feed = readFeedUrl(params.get("feed")) || DEFAULT_FEED;
    const limit = clampNumber(params.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);

    return {
      feed,
      limit,
      showDate: readBoolean(params.get("showDate"), true),
      showDescription: readBoolean(params.get("showDescription"), true),
    };
  }

  function renderSettingsSummary(currentSettings) {
    const lines = [
      `Feed URL: ${currentSettings.feed}`,
      `Item limit: ${currentSettings.limit}`,
      `Show publish date: ${currentSettings.showDate ? "Yes" : "No"}`,
      `Show description: ${currentSettings.showDescription ? "Yes" : "No"}`,
    ];

    summaryElement.innerHTML = "";
    const list = document.createElement("ul");
    list.className = "inline-list";

    lines.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    });

    summaryElement.appendChild(list);
  }

  async function loadFeed(currentSettings) {
    updateStatus("loading", "Loading feed…");

    try {
      const result = await fetchFeedXml(currentSettings.feed);
      const parsedFeed = parseFeedXml(result.xmlText);

      if (!parsedFeed.items.length) {
        feedHeadingElement.textContent = parsedFeed.title || "Feed entries";
        feedMetaElement.textContent = "";
        feedItemsElement.innerHTML = "";
        updateStatus("warning", "The feed loaded successfully but did not contain any entries.");
        return;
      }

      const items = parsedFeed.items.slice(0, currentSettings.limit);
      renderItems(items, currentSettings);

      feedHeadingElement.textContent = parsedFeed.title || "Feed entries";
      feedMetaElement.textContent = buildMetaLine(parsedFeed, result);
      updateStatus(
        result.viaProxy ? "warning" : "success",
        result.viaProxy
          ? "Direct browser fetching was blocked or unavailable, so the feed was loaded through rss-proxy.php."
          : "Feed loaded directly in the browser."
      );
    } catch (error) {
      feedItemsElement.innerHTML = "";
      feedMetaElement.textContent = "";
      updateStatus(
        "error",
        "Unable to load the RSS feed. If direct fetching is blocked by CORS, make sure rss-proxy.php is deployed on the same server."
      );
      const details = document.createElement("p");
      details.className = "text-muted";
      details.textContent = error instanceof Error ? error.message : String(error);
      statusElement.appendChild(details);
    }
  }

  async function fetchFeedXml(feedUrl) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
        },
      });

      if (!response.ok) {
        throw new Error(`Feed request failed with HTTP ${response.status}.`);
      }

      return {
        xmlText: await response.text(),
        viaProxy: false,
      };
    } catch (directFetchError) {
      const proxyUrl = new URL("rss-proxy.php", window.location.href);
      proxyUrl.searchParams.set("feed", feedUrl);

      const proxyResponse = await fetch(proxyUrl.toString(), {
        headers: {
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
        },
      });

      if (!proxyResponse.ok) {
        const proxyMessage = await readProxyError(proxyResponse);
        throw new Error(
          `Direct fetch failed and the proxy fallback also failed. ${proxyMessage || directFetchError}`
        );
      }

      return {
        xmlText: await proxyResponse.text(),
        viaProxy: true,
      };
    }
  }

  async function readProxyError(response) {
    try {
      const body = await response.json();
      return body.error || `Proxy request failed with HTTP ${response.status}.`;
    } catch (_error) {
      return `Proxy request failed with HTTP ${response.status}.`;
    }
  }

  function parseFeedXml(xmlText) {
    const parser = new DOMParser();
    const xmlDocument = parser.parseFromString(xmlText, "text/xml");
    const parseError = xmlDocument.querySelector("parsererror");

    if (parseError) {
      throw new Error("The response could not be parsed as XML.");
    }

    const channel = xmlDocument.querySelector("channel");
    const atomFeed = xmlDocument.querySelector("feed");
    const title = getChildText(channel || atomFeed, ["title"]) || "Feed entries";
    const description = getChildText(channel || atomFeed, ["description", "subtitle"]);
    const itemNodes = [
      ...xmlDocument.querySelectorAll("channel > item"),
      ...xmlDocument.querySelectorAll("feed > entry"),
    ];

    return {
      title,
      description,
      items: itemNodes
        .map((node) => ({
          title: getChildText(node, ["title"]) || "Untitled entry",
          link: getItemLink(node),
          description: getItemDescription(node),
          publishedAt: getChildText(node, ["pubDate", "published", "updated", "dc\\:date"]),
        }))
        .filter((item) => item.link),
    };
  }

  function renderItems(items, currentSettings) {
    feedItemsElement.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "feed-card";

      const meta = document.createElement("div");
      meta.className = "feed-meta";

      const sourceTag = document.createElement("span");
      sourceTag.className = "tag";
      sourceTag.textContent = "RSS item";
      meta.appendChild(sourceTag);

      if (currentSettings.showDate && item.publishedAt) {
        const dateTag = document.createElement("span");
        dateTag.className = "tag";
        dateTag.textContent = formatDate(item.publishedAt);
        meta.appendChild(dateTag);
      }

      const title = document.createElement("h3");
      const link = document.createElement("a");
      link.href = item.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.title;
      title.appendChild(link);

      card.appendChild(meta);
      card.appendChild(title);

      if (currentSettings.showDescription && item.description) {
        const description = document.createElement("p");
        description.className = "description";
        description.textContent = item.description;
        card.appendChild(description);
      }

      feedItemsElement.appendChild(card);
    });
  }

  function buildMetaLine(parsedFeed, result) {
    const parts = [];

    if (parsedFeed.description) {
      parts.push(parsedFeed.description);
    }

    parts.push(result.viaProxy ? "Loaded through proxy fallback" : "Loaded directly");
    return parts.join(" • ");
  }

  function updateStatus(kind, message) {
    statusElement.className = `status status-${kind}`;
    statusElement.innerHTML = "";

    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    statusElement.appendChild(messageElement);
  }

  function buildExampleQuery(currentSettings) {
    const exampleUrl = new URL("rss.html", window.location.href);
    exampleUrl.searchParams.set("feed", currentSettings.feed);
    exampleUrl.searchParams.set("limit", String(currentSettings.limit));
    exampleUrl.searchParams.set("showDate", currentSettings.showDate ? "1" : "0");
    exampleUrl.searchParams.set("showDescription", currentSettings.showDescription ? "1" : "0");

    return `${exampleUrl.pathname}${exampleUrl.search}`;
  }

  function getItemLink(node) {
    const directLink = getChildText(node, ["link"]);

    if (directLink && readFeedUrl(directLink)) {
      return directLink;
    }

    const atomLink = node.querySelector("link[href]");
    const atomHref = atomLink ? atomLink.getAttribute("href") : "";
    return readFeedUrl(atomHref);
  }

  function getItemDescription(node) {
    const rawDescription =
      getChildText(node, ["description", "summary", "content"]) ||
      getChildText(node, ["content\\:encoded"]);

    if (!rawDescription) {
      return "";
    }

    const descriptionDocument = new DOMParser().parseFromString(
      `<body>${rawDescription}</body>`,
      "text/html"
    );

    return (descriptionDocument.body.textContent || "").trim();
  }

  function getChildText(element, selectors) {
    if (!element) {
      return "";
    }

    for (const selector of selectors) {
      const node = element.querySelector(selector);

      if (node && node.textContent) {
        return node.textContent.trim();
      }
    }

    return "";
  }

  function readFeedUrl(value) {
    if (!value) {
      return "";
    }

    try {
      const parsedUrl = new URL(value, window.location.href);
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

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
})();
