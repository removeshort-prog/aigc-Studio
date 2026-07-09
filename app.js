const data = window.PORTFOLIO_DATA;
const generatedGallery = window.GENERATED_GALLERY || {};
const generatedRebuilds = window.GENERATED_REBUILDS || [];

const qs = (selector) => document.querySelector(selector);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function asEntry(input) {
  if (!input) return null;
  if (typeof input === "string") {
    return { src: input, width: 1, height: 1, orientation: "landscape" };
  }
  return input;
}

function imageFrame(input, fallback, className = "media-frame", options = {}) {
  const entry = asEntry(input);
  const frame = el("div", className);
  if (!entry?.src) {
    frame.appendChild(el("div", "placeholder", fallback || "Image Pending"));
    return frame;
  }

  const img = new Image();
  img.src = entry.src;
  img.alt = fallback || "";
  img.decoding = "async";
  img.loading = options.eager ? "eager" : "lazy";
  if (options.eager) img.fetchPriority = "high";
  img.addEventListener("error", () => {
    img.remove();
    frame.appendChild(el("div", "placeholder", fallback || "Image Pending"));
  });
  frame.appendChild(img);
  return frame;
}

function setNaturalRatio(button, entry) {
  if (entry?.width && entry?.height) {
    button.style.setProperty("--image-ratio", String(entry.width / entry.height));
    return;
  }
  const img = button.querySelector("img");
  if (!img) return;
  img.addEventListener("load", () => {
    if (img.naturalWidth && img.naturalHeight) {
      button.style.setProperty("--image-ratio", String(img.naturalWidth / img.naturalHeight));
    }
  });
}

function renderTags(tags = []) {
  const row = el("div", "tag-row");
  tags.forEach((tag) => row.appendChild(el("span", "tag", tag)));
  return row;
}

function initProfile() {
  qs("#profileName").textContent = data.profile.name;
  qs("#profileTarget").textContent = data.profile.target;
  qs("#profileNickname").textContent = data.profile.nickname || "";
  qs("#profileNickname").dataset.text = data.profile.nickname || "";
  qs("#profileSummary").textContent = data.profile.summary;
  initAvatar();
  renderPlatformLinks();
}

function initAvatar() {
  const avatarSrc = data.profile.avatar;
  ["#avatarHero"].forEach((selector) => {
    const img = qs(selector);
    if (!img || !avatarSrc) return;
    img.src = avatarSrc;
    img.alt = `${data.profile.name} avatar`;
    img.hidden = false;
    img.addEventListener("error", () => {
      img.hidden = true;
      img.removeAttribute("src");
    });
  });
}

function renderPlatformLinks() {
  const strip = qs("#platformLinks");
  if (!strip) return;
  strip.innerHTML = "";
  (data.platformLinks || []).forEach((item) => {
    const card = item.url ? document.createElement("a") : document.createElement("button");
    card.className = `platform-card is-${item.kind || "default"}`;
    if (item.url) {
      card.href = item.url;
      card.target = item.url.startsWith("mailto:") ? "" : "_blank";
      card.rel = item.url.startsWith("mailto:") ? "" : "noreferrer";
    } else {
      card.type = "button";
      card.disabled = true;
    }
    card.innerHTML = `<span>${item.platform}</span><strong>${item.title}</strong><small>${item.value}</small><em>${item.note}</em>`;
    strip.appendChild(card);
  });

  const infoButton = document.createElement("button");
  infoButton.className = "platform-card is-info";
  infoButton.type = "button";
  infoButton.id = "infoDialogOpen";
  infoButton.innerHTML = `<span>Info</span><strong>说明反馈</strong><small>About</small><em>本站说明 / GitHub 仓库</em>`;
  strip.appendChild(infoButton);
}

function initTheme() {
  const button = qs("#themeToggle");
  if (!button) return;
  const key = "aigc-portfolio-theme";
  const stored = localStorage.getItem(key);
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = stored ? stored === "dark" : Boolean(prefersDark);
  document.body.classList.toggle("is-dark", shouldUseDark);
  button.setAttribute("aria-pressed", String(shouldUseDark));

  button.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("is-dark");
    localStorage.setItem(key, isDark ? "dark" : "light");
    button.setAttribute("aria-pressed", String(isDark));
  });
}

function initQuickSearch() {
  const focusButton = qs("#focusPrompt");
  if (!focusButton) return;
  focusButton.addEventListener("click", () => {
    qs("#direct")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function initFeatureMotion() {
  const cards = [...document.querySelectorAll(".feature-card[href^='#']")];
  const sideLinks = [...document.querySelectorAll(".side-link[href^='#']")];
  if (!cards.length && !sideLinks.length) return;

  const setActive = (hash, pulse = false) => {
    cards.forEach((card) => {
      const active = card.getAttribute("href") === hash;
      card.classList.toggle("is-active", active);
      if (active && pulse) {
        card.classList.remove("is-pulsing");
        void card.offsetWidth;
        card.classList.add("is-pulsing");
        window.setTimeout(() => card.classList.remove("is-pulsing"), 720);
      }
    });
    document.querySelectorAll(".nav a[href^='#']").forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === hash);
    });
    sideLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === hash);
    });
  };

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      setActive(card.getAttribute("href"), true);
    });
  });

  const sectionLinks = [...cards, ...sideLinks];
  const sections = sectionLinks
    .map((card) => qs(card.getAttribute("href")))
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || !sections.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActive(`#${visible.target.id}`);
    },
    {
      rootMargin: "-35% 0px -45% 0px",
      threshold: [0.18, 0.32, 0.5],
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function initSideNavFilters() {
  document.querySelectorAll(".side-link[data-gallery-filter]").forEach((link) => {
    link.addEventListener("click", () => {
      const filter = link.dataset.galleryFilter;
      window.setTimeout(() => {
        qs(`.gallery-filter[data-filter="${filter}"]`)?.click();
      }, 180);
    });
  });
  document.querySelectorAll(".side-link[data-video-filter]").forEach((link) => {
    link.addEventListener("click", () => {
      const filter = link.dataset.videoFilter;
      window.setTimeout(() => {
        qs(`.category-filter[data-video-filter="${filter}"]`)?.click();
      }, 180);
    });
  });
  document.querySelectorAll(".side-link[data-production-filter]").forEach((link) => {
    link.addEventListener("click", () => {
      const filter = link.dataset.productionFilter;
      window.setTimeout(() => {
        qs(`.category-filter[data-production-filter="${filter}"]`)?.click();
      }, 180);
    });
  });
}

function normalizeGeneratedGroup(groupId) {
  const generated = generatedGallery[groupId];
  if (Array.isArray(generated)) {
    return { cover: null, samples: generated.map(asEntry).filter(Boolean) };
  }
  return {
    cover: asEntry(generated?.cover),
    samples: (generated?.samples || []).map(asEntry).filter(Boolean),
  };
}

function renderDirectGallery() {
  const gallery = qs("#directGallery");
  const filters = qs("#galleryFilters");
  const groups = data.directGroups || [];
  const entries = [];

  gallery.innerHTML = "";
  filters.innerHTML = "";

  groups.forEach((group) => {
    const generated = normalizeGeneratedGroup(group.id);
    const manualSamples = (group.samples || []).map(asEntry).filter(Boolean);
    const samples = [...manualSamples, ...generated.samples];
    const cover = generated.cover || asEntry(group.cover) || samples[0];
    const galleryEntries = cover?.src ? [cover, ...samples] : samples;
    galleryEntries.forEach((entry, index) => {
      entries.push({
        entry,
        group,
        index,
        isCover: index === 0 && entry.src === cover?.src,
      });
    });
  });

  const filterItems = [
    { id: "all", label: "全部", count: entries.length },
    ...groups.map((group) => ({
      id: group.id,
      label: group.title,
      count: entries.filter((item) => item.group.id === group.id).length,
    })),
  ];

  filterItems.forEach((item, index) => {
    const button = el("button", `gallery-filter${index === 0 ? " is-active" : ""}`);
    button.type = "button";
    button.dataset.filter = item.id;
    button.innerHTML = `<span>${item.label}</span><strong>${item.count}</strong>`;
    filters.appendChild(button);
  });

  if (!entries.length) {
    gallery.appendChild(el("div", "empty-gallery", "把图片放进 assets/images 对应文件夹后运行生成脚本，这里会显示瀑布流。"));
    return;
  }

  entries.forEach(({ entry, group, index, isCover }) => {
    const card = el("button", `masonry-card is-${entry.orientation || "landscape"}`);
    card.type = "button";
    card.dataset.group = group.id;
    card.appendChild(imageFrame(entry, `${group.title} ${index + 1}`, "masonry-frame"));

    const meta = el("span", "masonry-meta");
    meta.innerHTML = `<strong>${group.title}</strong><small>${isCover ? "Cover" : String(index).padStart(2, "0")}</small>`;
    card.appendChild(meta);
    card.addEventListener("click", () => openImage(entry, `${group.title} #${index + 1}`, group.summary, group.tags));
    gallery.appendChild(card);
  });

  filters.addEventListener("click", (event) => {
    const button = event.target.closest(".gallery-filter");
    if (!button) return;
    const filter = button.dataset.filter;
    filters.querySelectorAll(".gallery-filter").forEach((node) => node.classList.toggle("is-active", node === button));
    gallery.querySelectorAll(".masonry-card").forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.group !== filter;
    });
  });
}

function openImage(input, title, summary, tags = []) {
  const dialog = qs("#workDialog");
  const body = qs("#dialogBody");
  body.innerHTML = "";
  body.appendChild(imageFrame(input, title, "dialog-media"));
  dialog.showModal();
}

function renderRebuilds() {
  const grid = qs("#rebuildGrid");
  const rebuildItems = generatedRebuilds.length ? generatedRebuilds : data.rebuilds;
  rebuildItems.forEach((item, caseIndex) => {
    const beforeEntry = asEntry(item.before);
    const afterEntry = asEntry(item.after);
    const card = el("article", "rebuild-section");

    const beforeButton = el("button", "rebuild-before");
    beforeButton.type = "button";
    beforeButton.appendChild(imageFrame(beforeEntry, item.beforeFallback, "cover-frame"));
    beforeButton.appendChild(el("span", "compare-label", "Before"));
    beforeButton.addEventListener("click", () => openImage(beforeEntry, `${item.title} Before`, item.summary, item.tags));
    card.appendChild(beforeButton);

    const body = el("div", "rebuild-body");
    const header = el("div", "showcase-head");
    const copy = el("div");
    copy.appendChild(renderTags(item.tags));
    copy.appendChild(el("h3", "", item.title));
    copy.appendChild(el("p", "work-level", `案例 ${caseIndex + 1}`));
    copy.appendChild(el("p", "showcase-summary", item.summary));
    header.appendChild(copy);
    body.appendChild(header);

    const expand = el("button", "showcase-expand");
    expand.type = "button";
    expand.setAttribute("aria-expanded", "false");
    expand.innerHTML = `<span>查看重构后</span><strong>&rarr;</strong>`;
    body.appendChild(expand);

    const drawer = el("div", "rebuild-drawer");
    const collapse = el("button", "drawer-collapse", "收起");
    collapse.type = "button";
    drawer.appendChild(collapse);
    const scroller = el("div", "showcase-scroll");
    const track = el("div", "showcase-track");

    const compareEntries = [
      { label: "Before", entry: beforeEntry },
      { label: "After", entry: afterEntry },
    ];
    let compareMounted = false;
    const mountCompare = () => {
      if (compareMounted) return;
      compareMounted = true;
      compareEntries.forEach(({ label, entry }) => {
        const thumb = el("button", "showcase-thumb");
        thumb.type = "button";
        thumb.appendChild(imageFrame(entry, `${item.title} ${label}`, "thumb-frame"));
        thumb.appendChild(el("span", "compare-label", label));
        setNaturalRatio(thumb, entry);
        thumb.addEventListener("click", () => openImage(entry, `${item.title} ${label}`, item.summary, item.tags));
        track.appendChild(thumb);
      });
    };

    scroller.appendChild(track);
    drawer.appendChild(scroller);
    card.appendChild(body);
    card.appendChild(drawer);

    const setExpanded = (expanded) => {
      if (expanded) mountCompare();
      card.classList.toggle("is-expanded", expanded);
      expand.setAttribute("aria-expanded", String(expanded));
      expand.innerHTML = expanded ? `<span>收起对比</span><strong>&uarr;</strong>` : `<span>查看重构后</span><strong>&rarr;</strong>`;
      if (expanded) scroller.scrollTo({ left: 0, behavior: "smooth" });
    };

    expand.addEventListener("click", () => setExpanded(!card.classList.contains("is-expanded")));
    collapse.addEventListener("click", () => setExpanded(false));
    grid.appendChild(card);
  });
}

function videoPoster(item) {
  if (!item.poster) return null;
  return { src: item.poster, width: 16, height: 9, orientation: "landscape" };
}

function renderVideos() {
  const grid = qs("#videoGrid");
  const filters = qs("#videoCategories");
  const categories = data.videoCategories || [];
  const videos = data.videos || [];

  filters.innerHTML = "";
  const allButton = el("button", "category-filter is-active");
  allButton.type = "button";
  allButton.dataset.videoFilter = "all";
  allButton.innerHTML = `<strong>全部视频</strong><small>${videos.length || "待添加"}</small>`;
  filters.appendChild(allButton);
  categories.forEach((category) => {
    const button = el("button", "category-filter");
    button.type = "button";
    button.dataset.videoFilter = category.id;
    button.innerHTML = `<strong>${category.title}</strong><small>${category.summary}</small>`;
    filters.appendChild(button);
  });

  filters.addEventListener("click", (event) => {
    const button = event.target.closest(".category-filter");
    if (!button) return;
    const filter = button.dataset.videoFilter;
    filters.querySelectorAll(".category-filter").forEach((node) => node.classList.toggle("is-active", node === button));
    grid.querySelectorAll(".video-card").forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });

  if (!videos.length) {
    grid.appendChild(el("div", "empty-state", "视频样本待添加。木偶动画和长视频后续可以用本地 mp4/webm 或 B 站外链登记。"));
    return;
  }

  videos.forEach((item) => {
    const card = el("article", "video-card");
    card.dataset.category = item.category || "puppet";
    const media = el("div", "video-media");

    if (item.src) {
      const video = document.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      if (item.poster) video.poster = item.poster;
      const source = document.createElement("source");
      source.src = item.src;
      source.type = item.src.endsWith(".webm") ? "video/webm" : "video/mp4";
      video.appendChild(source);
      media.appendChild(video);
    } else if (item.url) {
      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.className = "video-link";
      link.appendChild(imageFrame(videoPoster(item), item.title, "video-poster"));
      link.appendChild(el("span", "video-play", "Play"));
      media.appendChild(link);
    } else {
      media.appendChild(imageFrame(videoPoster(item), item.title, "video-poster"));
    }

    const body = el("div", "video-body");
    body.appendChild(renderTags(item.tags || []));
    body.appendChild(el("h3", "", item.title));
    body.appendChild(el("p", "", item.summary));
    if (item.url && item.src) {
      const link = document.createElement("a");
      link.className = "video-open";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "打开外链";
      body.appendChild(link);
    }
    card.appendChild(media);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

function renderProduction() {
  const grid = qs("#productionGrid");
  const filters = qs("#productionFilters");
  if (!grid) return;

  const tools = data.productionTools || [];
  filters.innerHTML = "";
  const allButton = el("button", "category-filter is-active");
  allButton.type = "button";
  allButton.dataset.productionFilter = "all";
  allButton.innerHTML = `<strong>全部</strong><small>制作工具展示</small>`;
  filters.appendChild(allButton);
  tools.forEach((tool) => {
    const button = el("button", "category-filter");
    button.type = "button";
    button.dataset.productionFilter = tool.id;
    button.innerHTML = `<strong>${tool.title}</strong><small>${tool.label || ""}</small>`;
    filters.appendChild(button);
  });

  filters.addEventListener("click", (event) => {
    const button = event.target.closest(".category-filter");
    if (!button) return;
    const filter = button.dataset.productionFilter;
    filters.querySelectorAll(".category-filter").forEach((node) => node.classList.toggle("is-active", node === button));
    grid.querySelectorAll(".model-card").forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });

  tools.forEach((tool) => {
    const card = el("article", "tool-card model-card");
    card.dataset.category = tool.id;
    const body = el("div", "card-body");
    const head = el("div", "tool-head");
    head.appendChild(el("span", "", tool.label || "Tool"));
    body.appendChild(head);
    body.appendChild(el("h3", "", tool.title));
    body.appendChild(el("p", "", tool.summary));
    body.appendChild(renderTags(tool.tags));
    card.appendChild(body);
    grid.appendChild(card);
  });
}

function renderSponsor() {
  const sponsor = data.sponsor;
  const card = qs("#shopCard");
  if (!sponsor || !card) return;
  card.href = sponsor.url;
  card.querySelector("strong").textContent = sponsor.title;
  card.querySelector("small").textContent = sponsor.url;
  const summary = el("p", "", sponsor.summary);
  const tags = renderTags(sponsor.tags || []);
  card.appendChild(summary);
  card.appendChild(tags);
}

function renderCustom() {
  const grid = qs("#customGrid");
  const custom = data.custom;
  if (!grid || !custom) return;

  const notice = el("article", "custom-card");
  notice.appendChild(el("h3", "", "定制说明"));
  (custom.notice || []).forEach((line) => notice.appendChild(el("p", "", line)));

  const items = el("article", "custom-card");
  items.appendChild(el("h3", "", "可订内容"));
  const itemList = el("ul", "clean-list");
  (custom.items || []).forEach((line) => itemList.appendChild(el("li", "", line)));
  items.appendChild(itemList);

  const price = el("article", "custom-card custom-card-wide");
  price.appendChild(el("h3", "", "价格与沟通"));
  const priceList = el("ul", "clean-list");
  (custom.priceNotes || []).forEach((line) => priceList.appendChild(el("li", "", line)));
  price.appendChild(priceList);

  const teaching = el("article", "custom-card custom-card-wide");
  teaching.appendChild(el("h3", "", "教学方向"));
  (custom.teaching || []).forEach((line) => teaching.appendChild(el("p", "", line)));

  grid.appendChild(notice);
  grid.appendChild(items);
  grid.appendChild(price);
  grid.appendChild(teaching);
}

function initInfoDialog() {
  const dialog = qs("#infoDialog");
  const body = qs("#infoDialogBody");
  const openButton = qs("#infoDialogOpen");
  const closeButton = qs("#infoDialogClose");
  const info = data.siteInfo;
  if (!dialog || !body || !openButton || !info) return;

  body.innerHTML = "";
  body.appendChild(el("h2", "", info.title));
  body.appendChild(el("p", "info-lead", info.summary));
  body.appendChild(el("p", "info-copy", info.intro));

  const linksTitle = el("h3", "", "相关链接");
  body.appendChild(linksTitle);
  const links = el("div", "info-links");
  (info.links || []).forEach((item) => {
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.innerHTML = `<strong>${item.title}</strong><span>${item.note}</span><small>↗</small>`;
    links.appendChild(link);
  });
  body.appendChild(links);

  const notesTitle = el("h3", "", "说明");
  body.appendChild(notesTitle);
  const notes = el("ul", "info-notes");
  (info.notes || []).forEach((note) => notes.appendChild(el("li", "", note)));
  body.appendChild(notes);

  openButton.addEventListener("click", () => {
    dialog.showModal();
  });
  closeButton?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function closeWorkDialog() {
  const dialog = qs("#workDialog");
  if (!dialog?.open || dialog.classList.contains("is-closing")) return;
  dialog.classList.add("is-closing");
  window.setTimeout(() => {
    dialog.classList.remove("is-closing");
    dialog.close();
  }, 150);
}

qs("#dialogClose").addEventListener("click", closeWorkDialog);
qs("#workDialog").addEventListener("click", (event) => {
  if (event.target.id === "workDialog") closeWorkDialog();
});

initProfile();
initTheme();
initQuickSearch();
initSideNavFilters();
renderDirectGallery();
renderRebuilds();
renderVideos();
renderProduction();
renderSponsor();
renderCustom();
initInfoDialog();
initFeatureMotion();
