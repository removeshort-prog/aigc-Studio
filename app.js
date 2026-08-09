const data = window.PORTFOLIO_DATA;
const generatedGallery = window.GENERATED_GALLERY || {};
const generatedSocialStats = window.GENERATED_SOCIAL_STATS || {};

// Local-only preview: append one masked card without changing gallery data.
function initNsfwDemo() {
  if (!new URLSearchParams(window.location.search).has("demo-nsfw")) return;
  const demo = {
    src: "./assets/images/hero-wall/hero-01.webp",
    width: 16,
    height: 9,
    orientation: "landscape",
    rating: "nsfw",
  };
  const anime = generatedGallery.anime;
  if (!anime) return;
  if (Array.isArray(anime)) {
    if (!anime.some((entry) => entry?.src === demo.src && entry?.rating === "nsfw")) anime.push(demo);
    return;
  }
  anime.samples = [...(anime.samples || []), demo];
}

initNsfwDemo();

const qs = (selector) => document.querySelector(selector);
const clampRange = (value, min, max) => Math.min(max, Math.max(min, value));
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function asEntry(input) {
  if (!input) return null;
  if (typeof input === "string") {
    return { src: input, width: 1, height: 1, orientation: "landscape", rating: "sfw" };
  }
  return input;
}

function isNsfwEntry(entry) {
  return asEntry(entry)?.rating === "nsfw";
}

function hasNsfwWarningAcknowledgement() {
  try {
    return sessionStorage.getItem("aigc-nsfw-warning-ack") === "true";
  } catch {
    return false;
  }
}

function setNsfwWarningAcknowledgement() {
  try {
    sessionStorage.setItem("aigc-nsfw-warning-ack", "true");
  } catch {}
}

function showNsfwWarning() {
  const dialog = qs("#nsfwWarningDialog");
  if (!dialog) return Promise.resolve(false);
  const confirm = qs("#nsfwWarningConfirm");
  const cancel = qs("#nsfwWarningCancel");
  const countdown = qs("#nsfwWarningCountdown");
  if (!confirm || !cancel || !countdown) return Promise.resolve(false);

  return new Promise((resolve) => {
    let remaining = 3;
    let settled = false;
    let timer = 0;
    const finish = (accepted) => {
      if (settled) return;
      settled = true;
      window.clearInterval(timer);
      dialog.removeEventListener("close", onClose);
      if (accepted) setNsfwWarningAcknowledgement();
      resolve(accepted);
    };
    const onClose = () => finish(dialog.returnValue === "confirm");

    confirm.disabled = true;
    confirm.textContent = "请等待 3 秒";
    countdown.textContent = "警告确认将在 3 秒后可用";
    dialog.addEventListener("close", onClose, { once: false });
    cancel.onclick = () => {
      dialog.returnValue = "cancel";
      dialog.close();
    };
    confirm.onclick = () => {
      if (confirm.disabled) return;
      dialog.returnValue = "confirm";
      dialog.close();
    };
    timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        confirm.textContent = `请等待 ${remaining} 秒`;
        countdown.textContent = `警告确认将在 ${remaining} 秒后可用`;
        return;
      }
      window.clearInterval(timer);
      confirm.disabled = false;
      confirm.textContent = "我已了解，继续";
      countdown.textContent = "可以确认后按住按钮查看";
    }, 1000);
    dialog.showModal();
  });
}

async function beginNsfwReveal(card, button) {
  if (!hasNsfwWarningAcknowledgement()) {
    const accepted = await showNsfwWarning();
    if (!accepted || button.dataset.nsfwHolding !== "true") return;
  }
  card.classList.add("is-nsfw-revealed");
}

function endNsfwReveal(card) {
  card.classList.remove("is-nsfw-revealed");
}

function bindNsfwReveal(card, button) {
  const start = (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.dataset.nsfwHolding = "true";
    if (event.pointerId !== undefined) {
      try { button.setPointerCapture(event.pointerId); } catch {}
    }
    beginNsfwReveal(card, button);
  };
  const end = (event) => {
    event?.stopPropagation();
    delete button.dataset.nsfwHolding;
    endNsfwReveal(card);
  };
  button.addEventListener("pointerdown", start);
  ["pointerup", "pointercancel", "pointerleave", "lostpointercapture", "blur"].forEach((name) => {
    button.addEventListener(name, end);
  });
  button.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key) || event.repeat) return;
    start(event);
  });
  button.addEventListener("keyup", (event) => {
    if (["Enter", " "].includes(event.key)) end(event);
  });
  window.addEventListener("blur", () => end());
}

function imageFrame(input, fallback, className) {
  const entry = asEntry(input);
  const frame = el("div", className);
  if (!entry?.src) {
    frame.appendChild(el("div", "placeholder", fallback || "Image Pending"));
    return frame;
  }

  const img = new Image();
  img.alt = fallback || "";
  img.decoding = "async";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.addEventListener("error", () => {
    img.remove();
    frame.appendChild(el("div", "placeholder", fallback || "Image Pending"));
  });
  img.src = entry.src;
  frame.appendChild(img);
  return frame;
}

function renderTags(tags = []) {
  const row = el("div", "tag-row");
  tags.forEach((tag) => row.appendChild(el("span", "tag", tag)));
  return row;
}

function initProfile() {
  const name = qs("#profileName");
  const target = qs("#profileTarget");
  const nickname = qs("#profileNickname");
  const summary = qs("#profileSummary");
  if (name) name.textContent = data.profile.name;
  if (target) target.textContent = data.profile.target;
  if (nickname) {
    nickname.textContent = data.profile.nickname || "";
    nickname.dataset.text = data.profile.nickname || "";
  }
  if (summary) summary.textContent = data.profile.summary;
  renderPlatformLinks();
}

function initAvatar() {
  const avatarSrc = data.profile.avatar;
  const img = qs("#avatarHero");
  if (!img || !avatarSrc) return;
  img.src = avatarSrc;
  img.alt = `${data.profile.name} avatar`;
  img.hidden = false;
  img.addEventListener("error", () => {
    img.hidden = true;
    img.removeAttribute("src");
  });
}

function getGalleryProbeUrls() {
  const urls = [];
  Object.values(generatedGallery).forEach((group) => {
    // `generate-gallery.js` selects the first SFW image as the logical cover
    // when no explicitly named cover file exists.
    const items = Array.isArray(group) ? group : [group?.cover, ...(group?.samples || [])];
    const entry = items.map(asEntry).find((item) => item?.src && item?.rating !== "nsfw");
    if (entry?.src && !urls.includes(entry.src)) urls.push(entry.src);
  });
  return urls.slice(0, 3);
}

function probeGalleryImage(url, timeout = 12000) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    const timer = window.setTimeout(() => finish("slow"), timeout);
    image.onload = () => finish("loaded");
    image.onerror = () => finish("failed");
    image.referrerPolicy = "no-referrer";
    image.src = url;
  });
}

function initEntryGate(onEnter) {
  const gate = qs("#entryGate");
  const button = qs("#entryButton");
  const progressBar = qs("#entryProgressBar");
  const progressValue = qs("#entryProgressValue");
  const statusTitle = qs("#entryStatusTitle");
  const statusDetail = qs("#entryStatusDetail");
  if (!gate || !button || !progressBar || !progressValue || !statusTitle || !statusDetail) {
    document.body.classList.remove("is-entry-locked");
    onEnter?.();
    return;
  }

  const pageNodes = [...document.body.children].filter(
    (node) => node !== gate && node.tagName !== "SCRIPT"
  );
  pageNodes.forEach((node) => { node.inert = true; });

  let exitTimer;
  const enterSite = () => {
    if (gate.classList.contains("is-leaving")) return;
    window.clearTimeout(exitTimer);
    gate.classList.add("is-leaving");
    pageNodes.forEach((node) => { node.inert = false; });
    document.body.classList.remove("is-entry-locked");
    onEnter?.();
    window.setTimeout(() => gate.remove(), 620);
  };

  let progress = 8;
  const setProgress = (value) => {
    progress = Math.max(progress, Math.min(100, value));
    progressBar.style.width = `${progress}%`;
    progressValue.textContent = `${String(Math.round(progress)).padStart(2, "0")}%`;
  };

  const startedAt = performance.now();
  const progressTimer = window.setInterval(() => {
    if (progress < 76) setProgress(progress + Math.max(1, Math.round((78 - progress) * 0.08)));
  }, 180);

  const statusTimers = [
    window.setTimeout(() => {
      statusTitle.textContent = "正在连接远程图库";
      statusDetail.textContent = "检查展示图片访问状态";
      setProgress(34);
    }, 420),
    window.setTimeout(() => {
      statusTitle.textContent = "正在校验展示资源";
      statusDetail.textContent = "等待图库返回首张作品";
      setProgress(62);
    }, 1050),
  ];

  const finish = (state) => {
    const isReachable = state === "ready";
    window.clearInterval(progressTimer);
    statusTimers.forEach(window.clearTimeout);
    setProgress(100);
    gate.dataset.state = state;
    gate.setAttribute("aria-busy", "false");
    statusTitle.textContent = isReachable
      ? "图库连接完成"
      : state === "slow"
        ? "图库响应较慢"
        : "图库链接暂不可用";
    statusDetail.textContent = isReachable
      ? "展示图片已就绪，即将进入"
      : state === "slow"
        ? "可先进入浏览，展示图片会继续加载"
        : "请稍后重试，或在图库同步完成后刷新页面";
    button.hidden = false;
    button.disabled = false;
    window.setTimeout(() => button.focus({ preventScroll: true }), 180);
    exitTimer = window.setTimeout(enterSite, isReachable ? 1200 : state === "slow" ? 2200 : 3600);
  };

  const probeUrls = getGalleryProbeUrls();
  const probePromise = probeUrls.length
    ? Promise.all(probeUrls.map((url) => probeGalleryImage(url))).then((results) => {
      if (results.includes("loaded")) return "ready";
      return results.includes("slow") ? "slow" : "offline";
    })
    : Promise.resolve("offline");

  probePromise.then((state) => {
    const remaining = Math.max(0, 1500 - (performance.now() - startedAt));
    window.setTimeout(() => finish(state), remaining);
  });

  button.addEventListener("click", () => {
    if (!button.disabled) enterSite();
  });
}

function renderPlatformLinks() {
  const strip = qs("#platformLinks");
  if (!strip) return;
  strip.innerHTML = "";
  (data.platformLinks || []).filter((item) => ["bilibili", "pixiv"].includes(item.kind)).forEach((item) => {
    const card = document.createElement("a");
    card.className = `hero-platform-link is-${item.kind || "default"}`;
    card.href = item.url;
    card.target = "_blank";
    card.rel = "noreferrer";
    const followers = Number(generatedSocialStats[item.kind]?.followers);
    const hasFollowers = Number.isFinite(followers) && followers > 0;
    const value = hasFollowers
      ? `<strong class="platform-live-count" data-count-target="${followers}" data-count-suffix=" 粉丝">0</strong>`
      : `<strong>${item.value}</strong>`;
    const isLive = hasFollowers && generatedSocialStats[item.kind]?.live === true;
    const liveMark = isLive ? `<i class="platform-live-dot" aria-hidden="true"></i>` : "";
    card.innerHTML = `<span>${liveMark}${item.title}</span>${value}`;
    strip.appendChild(card);
  });

  const infoButton = document.createElement("button");
  infoButton.className = "hero-platform-link is-info";
  infoButton.type = "button";
  infoButton.id = "infoDialogOpen";
  infoButton.innerHTML = `<span>INFO</span><strong>说明</strong>`;
  strip.appendChild(infoButton);
}

function animateMetric(node) {
  const target = Number(node.dataset.countTarget);
  if (!Number.isFinite(target)) return;

  const prefix = node.dataset.countPrefix || "";
  const suffix = node.dataset.countSuffix || "";
  const format = new Intl.NumberFormat("zh-CN");
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    node.textContent = `${prefix}${format.format(target)}${suffix}`;
    return;
  }

  const duration = 760;
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    node.textContent = `${prefix}${format.format(Math.round(target * eased))}${suffix}`;
    if (progress < 1) window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

function animateMetrics(root = document) {
  root.querySelectorAll?.("[data-count-target]").forEach(animateMetric);
}

function setGalleryCounts(count, groupCounts = {}) {
  const targets = [
    [qs("#galleryCount"), count],
    [qs("#heroVideoCount"), groupCounts.anime || 0],
    [qs("#heroStyleCount"), groupCounts["style-showcase"] || 0],
  ];
  targets.forEach(([node, value]) => {
    if (!node) return;
    node.dataset.countTarget = String(value);
    node.textContent = "0";
  });
}

function favoriteKey(source) {
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 33);
  }
  return `removeshort-aigc-img-${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function favoriteStorageKey(key) {
  return `aigc-image-favorite:${key}`;
}

function setFavoriteCount(button, value) {
  const count = button.querySelector("strong");
  const number = Number(value);
  if (!count || !Number.isFinite(number)) return;
  count.textContent = new Intl.NumberFormat("zh-CN").format(number);
  button.dataset.favoriteCount = String(number);
}

function loadImageFavorite(button) {
  const key = button.dataset.favoriteKey;
  if (!key || button.dataset.favoriteLoaded === "true") return;
  button.dataset.favoriteLoaded = "true";
  fetch(`https://countapi.mileshilliard.com/api/v1/get/${encodeURIComponent(key)}`)
    .then((response) => (response.status === 404 ? { value: 0 } : response.ok ? response.json() : Promise.reject(new Error("Favorite count unavailable"))))
    .then((payload) => setFavoriteCount(button, payload.value))
    .catch(() => {
      const count = button.querySelector("strong");
      if (count) count.textContent = "--";
    });
}

function favoriteImage(button) {
  const key = button.dataset.favoriteKey;
  if (!key || button.dataset.favoritePending === "true") return;
  try {
    if (localStorage.getItem(favoriteStorageKey(key)) === "true") return;
  } catch {
    return;
  }

  button.dataset.favoritePending = "true";
  fetch(`https://countapi.mileshilliard.com/api/v1/hit/${encodeURIComponent(key)}`)
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Favorite update unavailable"))))
    .then((payload) => {
      localStorage.setItem(favoriteStorageKey(key), "true");
      button.classList.add("is-favorited");
      button.classList.remove("is-animating");
      void button.offsetWidth;
      button.classList.add("is-animating");
      button.setAttribute("aria-pressed", "true");
      button.setAttribute("aria-label", button.getAttribute("aria-label").replace(/^收藏/, "已收藏"));
      setFavoriteCount(button, payload.value);
      window.setTimeout(() => button.classList.remove("is-animating"), 520);
    })
    .catch(() => {})
    .finally(() => {
      delete button.dataset.favoritePending;
    });
}

function initImageFavoriteCounters(gallery) {
  const buttons = [...gallery.querySelectorAll(".masonry-favorite")];
  if (!("IntersectionObserver" in window)) {
    buttons.forEach(loadImageFavorite);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        loadImageFavorite(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "420px 0px" }
  );
  buttons.forEach((button) => observer.observe(button));
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

function initHeroMarquee() {
  const hero = qs(".hero-cover");
  const pin = qs(".hero-cover-pin");
  const stage = qs(".hero-motion-stage");
  if (!hero || !pin || !stage || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    const topbarHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar-h")) || 0;
    const scrollStart = hero.getBoundingClientRect().top + window.scrollY - topbarHeight;
    const scrollRange = Math.max(hero.offsetHeight - pin.offsetHeight, 1);
    const progress = clampRange((window.scrollY - scrollStart) / scrollRange, 0, 1);
    stage.style.setProperty("--hero-works-size", `${(72 - progress * 48).toFixed(2)}%`);
    stage.style.setProperty("--hero-styles-size", `${(24 + progress * 48).toFixed(2)}%`);
    stage.style.setProperty("--hero-works-opacity", (0.92 - progress * 0.56).toFixed(3));
    stage.style.setProperty("--hero-styles-opacity", (0.32 + progress * 0.6).toFixed(3));
  };
  const requestUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
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

function directGroupEntries(group) {
  const generated = normalizeGeneratedGroup(group.id);
  const manualSamples = (group.samples || []).map(asEntry).filter(Boolean);
  const samples = [...manualSamples, ...generated.samples].sort((a, b) => {
    const aNsfw = isNsfwEntry(a) ? 1 : 0;
    const bNsfw = isNsfwEntry(b) ? 1 : 0;
    return aNsfw - bNsfw;
  });
  const cover = generated.cover || asEntry(group.cover) || samples[0];
  return cover?.src ? [cover, ...samples] : samples;
}

function sampleMarqueeEntries(items, count = 6) {
  if (items.length <= count) return items;
  return Array.from({ length: count }, (_, index) => {
    const position = index * (items.length - 1) / (count - 1);
    return items[Math.round(position)];
  });
}

function renderHeroMarquees(entries) {
  const worksTrack = qs("#heroWorksTrack");
  const stylesTrack = qs("#heroStylesTrack");
  if (!worksTrack || !stylesTrack) return;

  const localFallbacks = {
    works: ["hero-01.webp", "hero-02.webp", "hero-03.webp", "hero-05.webp", "hero-04.webp", "hero-07.webp"],
    styles: ["hero-08.webp", "hero-06.webp", "hero-05.webp", "hero-01.webp", "hero-04.webp", "hero-03.webp"],
  };
  const renderTrack = (track, groupId, kind) => {
    const selected = sampleMarqueeEntries(
      entries.filter((item) => item.group.id === groupId && !isNsfwEntry(item.entry))
    );
    track.replaceChildren();
    const buildSet = (isDuplicate) => {
      const set = el("div", "hero-marquee-set");
      if (isDuplicate) set.setAttribute("aria-hidden", "true");
      selected.forEach(({ entry }, index) => {
        const orientation = entry.orientation || (entry.height > entry.width ? "portrait" : "landscape");
        const variant = kind === "works"
          ? index === 2 ? "is-focus" : orientation === "landscape" ? (index % 2 ? "is-wide" : "is-landscape") : "is-portrait"
          : `is-${orientation}`;
        const figure = el("figure", `${kind === "works" ? "hero-work-card" : "hero-style-card"} ${variant}`);
        const image = new Image();
        image.alt = isDuplicate ? "" : `${kind === "works" ? "视频作品" : "画风展示"} ${index + 1}`;
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => {
          if (image.dataset.fallback === "true") return;
          image.dataset.fallback = "true";
          image.src = `./assets/images/hero-wall/${localFallbacks[kind][index % localFallbacks[kind].length]}`;
        });
        image.src = entry.src;
        figure.appendChild(image);
        set.appendChild(figure);
      });
      return set;
    };
    track.append(buildSet(false), buildSet(true));
  };

  renderTrack(worksTrack, "anime", "works");
  renderTrack(stylesTrack, "style-showcase", "styles");
}

function renderDirectGallery() {
  const gallery = qs("#directGallery");
  const filters = qs("#galleryFilters");
  const groups = data.directGroups || [];
  const entries = [];

  gallery.innerHTML = "";
  if (filters) filters.innerHTML = "";

  groups.forEach((group) => {
    const galleryEntries = directGroupEntries(group);
    const cover = galleryEntries[0];
    galleryEntries.forEach((entry, index) => {
      entries.push({
        entry,
        group,
        index,
        isCover: index === 0 && entry.src === cover?.src,
      });
    });
  });

  const groupCounts = Object.fromEntries(groups.map((group) => [
    group.id,
    entries.filter((item) => item.group.id === group.id).length,
  ]));
  setGalleryCounts(entries.length, groupCounts);
  renderHeroMarquees(entries);

  if (filters) {
    groups.forEach((group, index) => {
      const count = entries.filter((item) => item.group.id === group.id).length;
      const button = el("button", `gallery-filter${index === 0 ? " is-active" : ""}`);
      button.type = "button";
      button.dataset.filter = group.id;
      button.innerHTML = `<span>${group.title}</span><strong>${count}</strong>`;
      filters.appendChild(button);
    });
  }

  if (!entries.length) {
    gallery.appendChild(el("div", "empty-gallery", "把图片放进 assets/images 对应文件夹后运行生成脚本，这里会显示瀑布流。"));
    return;
  }

  const sfwGallery = el("div", "masonry-gallery-sfw");
  const nsfwSection = el("section", "nsfw-gallery-section");
  const nsfwHeading = el("div", "nsfw-gallery-heading");
  nsfwHeading.appendChild(el("strong", "", "NSFW 内容"));
  nsfwHeading.appendChild(el("span", "", "按住显示，松开隐藏"));
  const nsfwGallery = el("div", "nsfw-gallery-list");
  nsfwSection.append(nsfwHeading, nsfwGallery);
  gallery.append(sfwGallery, nsfwSection);

  entries.forEach(({ entry, group, index, isCover }) => {
    const title = `${group.title} #${index + 1}`;
    const nsfw = isNsfwEntry(entry);
    const card = el("article", `masonry-card is-${entry.orientation || "landscape"}${nsfw ? " is-nsfw" : ""}`);
    card.dataset.group = group.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看 ${title}`);
    const frame = imageFrame(entry, `${group.title} ${index + 1}`, `masonry-frame${nsfw ? " nsfw-frame" : ""}`);
    if (nsfw) {
      const shield = el("div", "nsfw-shield");
      shield.appendChild(el("strong", "nsfw-mark", "!"));
      const shieldCopy = el("span", "nsfw-shield-copy");
      shieldCopy.appendChild(el("b", "", "NSFW 内容"));
      shieldCopy.appendChild(el("small", "", "按住显示，松开隐藏"));
      shield.appendChild(shieldCopy);
      const revealButton = el("button", "nsfw-reveal-button", "按住显示");
      revealButton.type = "button";
      revealButton.setAttribute("aria-label", `${title}：按住显示成人内容`);
      bindNsfwReveal(card, revealButton);
      shield.appendChild(revealButton);
      frame.appendChild(shield);
    }
    card.appendChild(frame);

    const meta = el("span", "masonry-meta");
    meta.innerHTML = `<strong>${group.title}</strong><small>${isCover ? "Cover" : String(index).padStart(2, "0")}</small>`;
    card.appendChild(meta);
    const favorite = document.createElement("button");
    const key = favoriteKey(entry.src);
    favorite.type = "button";
    favorite.className = "masonry-favorite";
    favorite.dataset.favoriteKey = key;
    favorite.setAttribute("aria-label", `收藏 ${title}`);
    let isFavorited = false;
    try {
      isFavorited = localStorage.getItem(favoriteStorageKey(key)) === "true";
    } catch {}
    favorite.setAttribute("aria-pressed", String(isFavorited));
    if (isFavorited) favorite.setAttribute("aria-label", `已收藏 ${title}`);
    favorite.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21C10.8 19.8 3 15.5 3 9.6C3 6.5 5.25 4.2 8.1 4.2C9.85 4.2 11.2 5.1 12 6.4C12.8 5.1 14.15 4.2 15.9 4.2C18.75 4.2 21 6.5 21 9.6C21 15.5 13.2 19.8 12 21Z"></path></svg><strong>--</strong>`;
    if (favorite.getAttribute("aria-pressed") === "true") favorite.classList.add("is-favorited");
    favorite.addEventListener("click", (event) => {
      event.stopPropagation();
      favoriteImage(favorite);
    });
    card.appendChild(favorite);
    card.addEventListener("click", () => {
      if (!nsfw) openImage(entry, title);
    });
    card.addEventListener("keydown", (event) => {
      if (event.target !== card || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      if (!nsfw) openImage(entry, title);
    });
    (nsfw ? nsfwGallery : sfwGallery).appendChild(card);
  });
  if (!nsfwGallery.children.length) nsfwSection.remove();

  const applyGalleryFilter = (filterId) => {
    gallery.querySelectorAll(".masonry-card").forEach((card) => {
      card.hidden = card.dataset.group !== filterId;
    });
    if (nsfwSection.isConnected) {
      nsfwSection.hidden = ![...nsfwGallery.children].some((card) => !card.hidden);
    }
  };
  const initialFilter = groups[0]?.id;
  if (initialFilter) {
    applyGalleryFilter(initialFilter);
  }
  filters?.addEventListener("click", (event) => {
    const button = event.target.closest(".gallery-filter");
    if (!button) return;
    filters.querySelectorAll(".gallery-filter").forEach((node) => node.classList.toggle("is-active", node === button));
    applyGalleryFilter(button.dataset.filter);
  });
  const styleNavLink = qs("#styleNavLink");
  if (styleNavLink && filters) {
    styleNavLink.onclick = () => {
      const styleFilter = filters.querySelector('[data-filter="style-showcase"]');
      window.setTimeout(() => styleFilter?.click(), 0);
    };
  }
  initImageFavoriteCounters(gallery);
}

function openImage(input, title) {
  if (isNsfwEntry(input)) return;
  const dialog = qs("#workDialog");
  const body = qs("#dialogBody");
  body.innerHTML = "";
  body.appendChild(imageFrame(input, title, "dialog-media"));
  dialog.showModal();
}

function renderSponsor() {
  const sponsor = data.sponsor;
  const card = qs("#shopCard");
  if (!sponsor || !card) return;
  const itemCount = Number(generatedSocialStats.bilibiliShop?.items);
  if (Number.isFinite(itemCount) && itemCount >= 0) {
    [qs("#featureShopCount"), qs("#shopItemCount")].filter(Boolean).forEach((node) => {
      node.dataset.countTarget = String(itemCount);
      node.textContent = "0";
    });
  }
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

  grid.replaceChildren();

  const estimate = custom.estimate || {};
  const typeOptions = estimate.types || [];
  const popularityOptions = estimate.popularity || [];
  const requirementOptions = estimate.requirements || [];
  const estimator = el("div", "custom-estimator");
  const form = el("form", "custom-estimator-form");
  form.noValidate = true;

  const privateNote = el("div", "custom-private-note");
  const privateCopy = el("div", "");
  privateCopy.appendChild(el("span", "custom-kicker", custom.promise.label));
  privateCopy.appendChild(el("strong", "", custom.promise.description));
  const pricingCopy = el("div", "custom-private-pricing");
  pricingCopy.appendChild(el("span", "", custom.pricing.label));
  pricingCopy.appendChild(el("strong", "", custom.pricing.title));
  privateNote.appendChild(privateCopy);
  privateNote.appendChild(pricingCopy);

  const formHeader = el("div", "custom-form-header");
  formHeader.appendChild(el("span", "custom-kicker", "需求估算表"));
  formHeader.appendChild(el("h3", "", "创作需求工作台"));
  const formHint = el("p", "", "分四步整理画面，右侧估算会随选择即时更新。");
  formHeader.appendChild(formHint);
  form.appendChild(formHeader);

  const stepDefinitions = [
    { number: "01", label: "基础需求" },
    { number: "02", label: "角色设定" },
    { number: "03", label: "画面细节" },
    { number: "04", label: "参考资料" },
  ];
  const stepNav = el("div", "custom-step-nav");
  stepNav.setAttribute("role", "tablist");
  stepNav.setAttribute("aria-label", "定制需求步骤");
  const stepButtons = stepDefinitions.map((step, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-step-tab";
    button.id = `custom-step-tab-${index + 1}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `custom-step-panel-${index + 1}`);
    button.innerHTML = `<small>${step.number}</small><span>${step.label}</span>`;
    stepNav.appendChild(button);
    return button;
  });
  form.appendChild(stepNav);

  const makeField = (legend, hint) => {
    const field = el("fieldset", "custom-field");
    field.appendChild(el("legend", "", legend));
    if (hint) field.appendChild(el("p", "custom-field-hint", hint));
    return field;
  };
  const makeChoice = (name, option, type = "radio") => {
    const label = el("label", "custom-choice");
    const input = document.createElement("input");
    input.type = type;
    input.name = name;
    input.value = option.value;
    if (option.checked) input.checked = true;
    label.appendChild(input);
    label.appendChild(el("span", "", option.label));
    return label;
  };
  const makeTextInput = (name, labelText, placeholder) => {
    const group = el("label", "custom-input-group");
    group.appendChild(el("span", "", labelText));
    const input = document.createElement("input");
    input.type = "text";
    input.name = name;
    input.className = "custom-text-input";
    input.placeholder = placeholder;
    input.autocomplete = "off";
    group.appendChild(input);
    return { group, input };
  };

  const typeField = makeField("定制类型", "先选一个最接近的类型，之后仍可在私信里补充。");
  const typeSelect = document.createElement("select");
  typeSelect.name = "projectType";
  typeSelect.className = "custom-select";
  typeOptions.forEach((option, index) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    if (index === 0) item.selected = true;
    typeSelect.appendChild(item);
  });
  typeField.appendChild(typeSelect);
  form.appendChild(typeField);

  const popularityField = makeField("角色是否冷门？", "冷门角色资料较少，会适当增大识别与还原难度。");
  const popularityChoices = el("div", "custom-choice-grid custom-choice-grid-2");
  popularityOptions.forEach((option, index) => popularityChoices.appendChild(makeChoice("popularity", { ...option, checked: index === 0 })));
  popularityField.appendChild(popularityChoices);
  const characterProfile = el("div", "custom-detail-panel custom-character-profile");
  const characterNameField = makeTextInput("characterName", "角色名", "例如：初音未来；多人可用顿号分隔");
  const characterVariantField = makeTextInput("characterVariant", "皮肤 / 装甲", "例如：原版皮肤、终焉装甲");
  characterProfile.appendChild(characterNameField.group);
  characterProfile.appendChild(characterVariantField.group);
  popularityField.appendChild(characterProfile);
  form.appendChild(popularityField);

  const characterField = makeField("同一张图片的角色数量？", "角色越多，关系、遮挡和细节检查越复杂。");
  const characterStepper = el("div", "custom-stepper");
  const decrease = document.createElement("button");
  decrease.type = "button";
  decrease.className = "custom-stepper-button";
  decrease.textContent = "−";
  decrease.setAttribute("aria-label", "减少角色数量");
  const characterCount = document.createElement("input");
  characterCount.type = "number";
  characterCount.name = "characterCount";
  characterCount.min = "1";
  characterCount.max = "8";
  characterCount.value = "1";
  characterCount.setAttribute("aria-label", "角色数量");
  const increase = document.createElement("button");
  increase.type = "button";
  increase.className = "custom-stepper-button";
  increase.textContent = "+";
  increase.setAttribute("aria-label", "增加角色数量");
  characterStepper.appendChild(decrease);
  characterStepper.appendChild(characterCount);
  characterStepper.appendChild(increase);
  characterField.appendChild(characterStepper);
  const characterMultiplier = el("p", "custom-multiplier-note", "当前多人耗时倍率：×1");
  characterField.appendChild(characterMultiplier);
  form.appendChild(characterField);

  const requirementsField = makeField("需要指定哪些细节？", "勾选需要指定的项目，再填写具体要求；指定得越多，修复和检查工作越多。");
  const requirementList = el("div", "custom-requirement-list");
  const requirementInputs = new Map();
  requirementOptions.forEach((option) => {
    const row = el("div", "custom-requirement-row");
    const choice = makeChoice("requirements", option, "checkbox");
    const checkbox = choice.querySelector("input");
    const detail = document.createElement("input");
    detail.type = "text";
    detail.name = `requirement-${option.value}`;
    detail.className = "custom-text-input";
    detail.placeholder = `例如：${option.example}`;
    detail.setAttribute("aria-label", `填写${option.label}`);
    detail.disabled = true;
    checkbox.addEventListener("change", () => {
      detail.disabled = !checkbox.checked;
      row.classList.toggle("is-active", checkbox.checked);
      if (checkbox.checked) detail.focus();
    });
    row.appendChild(choice);
    row.appendChild(detail);
    requirementInputs.set(option.value, { checkbox, detail, row });
    requirementList.appendChild(row);
  });
  requirementsField.appendChild(requirementList);
  form.appendChild(requirementsField);

  const referenceField = makeField("是否有参考？", "参考可以减少方向摸索；要求的还原程度越高，细节对齐与复核越多，最终估算费用越高。");
  const referenceToggle = makeChoice("hasReference", { value: "yes", label: "有参考，会在请求中一并提供", checked: false }, "checkbox");
  referenceField.appendChild(referenceToggle);
  const referencePanel = el("div", "custom-reference-panel");
  referencePanel.hidden = true;
  const referenceAspectField = makeTextInput("referenceAspect", "具体参考的是哪个方面？", "例如：画风、构图、服饰、动作或色彩氛围");
  referencePanel.appendChild(referenceAspectField.group);
  const referenceLabel = el("label", "custom-range-label");
  referenceLabel.appendChild(el("span", "", "参考程度"));
  const referenceValue = el("output", "custom-range-value", "60% · 平衡参考");
  referenceLabel.appendChild(referenceValue);
  referencePanel.appendChild(referenceLabel);
  const referenceRange = document.createElement("input");
  referenceRange.type = "range";
  referenceRange.name = "referenceDegree";
  referenceRange.min = "0";
  referenceRange.max = "100";
  referenceRange.value = "60";
  referenceRange.className = "custom-range";
  referenceRange.setAttribute("aria-label", "参考程度");
  referencePanel.appendChild(referenceRange);
  const freedomChoice = makeChoice("authorFreedom", { value: "yes", label: "允许作者发挥，保留创作空间", checked: true }, "checkbox");
  referencePanel.appendChild(freedomChoice);
  referenceField.appendChild(referencePanel);
  form.appendChild(referenceField);

  const imageField = makeField("图片数量？", "图片越多，总工作量和最终估算费用越高。");
  const imageStepper = el("div", "custom-stepper");
  const imageDecrease = document.createElement("button");
  imageDecrease.type = "button";
  imageDecrease.className = "custom-stepper-button";
  imageDecrease.textContent = "−";
  imageDecrease.setAttribute("aria-label", "减少图片数量");
  const imageCount = document.createElement("input");
  imageCount.type = "number";
  imageCount.name = "imageCount";
  imageCount.min = "1";
  imageCount.max = "30";
  imageCount.value = "1";
  imageCount.setAttribute("aria-label", "图片数量");
  const imageIncrease = document.createElement("button");
  imageIncrease.type = "button";
  imageIncrease.className = "custom-stepper-button";
  imageIncrease.textContent = "+";
  imageIncrease.setAttribute("aria-label", "增加图片数量");
  imageStepper.appendChild(imageDecrease);
  imageStepper.appendChild(imageCount);
  imageStepper.appendChild(imageIncrease);
  imageField.appendChild(imageStepper);
  form.appendChild(imageField);

  const trainingField = makeField("训练图数量？", "训练图越多，素材检查、打标和训练耗时越高。");
  trainingField.hidden = true;
  const trainingStepper = el("div", "custom-stepper");
  const trainingDecrease = document.createElement("button");
  trainingDecrease.type = "button";
  trainingDecrease.className = "custom-stepper-button";
  trainingDecrease.textContent = "−";
  trainingDecrease.setAttribute("aria-label", "减少训练图数量");
  const trainingCount = document.createElement("input");
  trainingCount.type = "number";
  trainingCount.name = "trainingCount";
  trainingCount.min = "20";
  trainingCount.max = "300";
  trainingCount.step = "10";
  trainingCount.value = "50";
  trainingCount.setAttribute("aria-label", "训练图数量");
  const trainingIncrease = document.createElement("button");
  trainingIncrease.type = "button";
  trainingIncrease.className = "custom-stepper-button";
  trainingIncrease.textContent = "+";
  trainingIncrease.setAttribute("aria-label", "增加训练图数量");
  trainingStepper.appendChild(trainingDecrease);
  trainingStepper.appendChild(trainingCount);
  trainingStepper.appendChild(trainingIncrease);
  trainingField.appendChild(trainingStepper);
  form.appendChild(trainingField);

  const stepStage = el("div", "custom-step-stage");
  const stepPanels = stepDefinitions.map((step, index) => {
    const panel = el("section", "custom-step-panel");
    panel.id = `custom-step-panel-${index + 1}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `custom-step-tab-${index + 1}`);
    const heading = el("div", "custom-step-heading");
    heading.appendChild(el("span", "", step.number));
    heading.appendChild(el("h4", "", step.label));
    panel.appendChild(heading);
    stepStage.appendChild(panel);
    return panel;
  });
  stepPanels[0].append(typeField, imageField, trainingField);
  stepPanels[1].append(popularityField, characterField);
  stepPanels[2].append(requirementsField);
  stepPanels[3].append(referenceField);

  const stepControls = el("div", "custom-step-controls");
  const previousStep = document.createElement("button");
  previousStep.type = "button";
  previousStep.className = "custom-step-control is-previous";
  previousStep.textContent = "← 上一步";
  const stepPosition = el("span", "custom-step-position", "1 / 4");
  const nextStep = document.createElement("button");
  nextStep.type = "button";
  nextStep.className = "custom-step-control is-next";
  nextStep.textContent = "下一步 →";
  stepControls.append(previousStep, stepPosition, nextStep);
  form.append(stepStage, stepControls);

  const result = el("aside", "custom-estimator-result");
  result.setAttribute("aria-live", "polite");
  result.appendChild(el("span", "custom-kicker", "即时估算"));
  const resultTitle = el("h3", "", "需求还没填完");
  result.appendChild(resultTitle);
  const resultLead = el("p", "custom-result-lead", "完成左侧表格后，这里会显示当前估算。");
  result.appendChild(resultLead);
  const recipe = el("p", "custom-recipe", "正在整理画面配方…");
  recipe.setAttribute("aria-label", "当前画面配方");
  result.appendChild(recipe);
  const budgetStat = el("div", "custom-final-cost");
  budgetStat.appendChild(el("span", "", "最终估算费用"));
  const budgetValue = el("strong", "", "--");
  budgetValue.className = "custom-budget-value";
  budgetStat.appendChild(budgetValue);
  result.appendChild(budgetStat);
  const makeScoreMeter = (label) => {
    const block = el("div", "custom-score-meter");
    const head = el("div", "custom-score-head");
    head.appendChild(el("span", "", label));
    const value = el("strong", "", "--");
    const unit = el("small", "", "/10");
    value.appendChild(unit);
    head.appendChild(value);
    block.appendChild(head);
    const segments = el("div", "custom-score-segments");
    const segmentNodes = Array.from({ length: 10 }, (_, index) => {
      const segment = el("span", "");
      segment.style.setProperty("--segment", String(index));
      segments.appendChild(segment);
      return segment;
    });
    block.appendChild(segments);
    return { block, value, segmentNodes };
  };
  const scoreGrid = el("div", "custom-score-grid");
  const difficultyMeter = makeScoreMeter("制作难度");
  const timeMeter = makeScoreMeter("耗时评分");
  scoreGrid.appendChild(difficultyMeter.block);
  scoreGrid.appendChild(timeMeter.block);
  result.appendChild(scoreGrid);
  const factors = el("ul", "custom-estimate-factors");
  result.appendChild(factors);
  const actions = el("div", "custom-estimate-actions");
  const bilibili = (data.platformLinks || []).find((link) => link.kind === "bilibili");
  const send = el("a", "custom-contact-primary", "B站私信");
  if (bilibili) {
    send.href = bilibili.url;
    send.target = "_blank";
    send.rel = "noreferrer";
  }
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "custom-contact-secondary";
  copy.textContent = "复制需求摘要";
  actions.appendChild(send);
  actions.appendChild(copy);
  result.appendChild(actions);
  const resultNote = el("p", "custom-result-note", "仅为预估参考，请以实际沟通确认结果为准。复制摘要后，可以直接粘贴到 B 站私信。");
  result.appendChild(resultNote);

  estimator.appendChild(form);
  estimator.appendChild(result);
  grid.appendChild(privateNote);
  grid.appendChild(estimator);

  let activeStep = 0;
  const syncSteps = (isLora = false) => {
    const availableSteps = isLora ? [0] : stepDefinitions.map((_, index) => index);
    if (!availableSteps.includes(activeStep)) activeStep = 0;
    form.classList.toggle("is-lora", isLora);
    formHint.textContent = isLora
      ? "Lora 仅按训练类型与训练图数量估算，不包含普通画面委托要求。"
      : "分四步整理画面，右侧估算会随选择即时更新。";
    const firstStepNumber = stepPanels[0].querySelector(".custom-step-heading span");
    const firstStepTitle = stepPanels[0].querySelector(".custom-step-heading h4");
    if (firstStepNumber) firstStepNumber.textContent = isLora ? "LORA" : "01";
    if (firstStepTitle) firstStepTitle.textContent = isLora ? "训练需求" : "基础需求";
    stepButtons.forEach((button, index) => {
      const isAvailable = availableSteps.includes(index);
      const isActive = index === activeStep;
      button.hidden = !isAvailable;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      stepPanels[index].hidden = !isActive;
    });
    const activePosition = availableSteps.indexOf(activeStep);
    previousStep.disabled = activePosition <= 0;
    nextStep.disabled = activePosition >= availableSteps.length - 1;
    stepPosition.textContent = `${activePosition + 1} / ${availableSteps.length}`;
    stepNav.classList.toggle("is-lora", isLora);
    stepControls.classList.toggle("is-lora", isLora);
  };
  const moveStep = (direction) => {
    const isLora = (typeOptions.find((option) => option.value === typeSelect.value) || typeOptions[0])?.kind === "lora";
    const availableSteps = isLora ? [0] : stepDefinitions.map((_, index) => index);
    const nextIndex = availableSteps.indexOf(activeStep) + direction;
    if (nextIndex < 0 || nextIndex >= availableSteps.length) return;
    activeStep = availableSteps[nextIndex];
    syncSteps(isLora);
  };
  stepButtons.forEach((button, index) => button.addEventListener("click", () => {
    activeStep = index;
    syncSteps(false);
  }));
  stepNav.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    moveStep(event.key === "ArrowRight" ? 1 : -1);
    stepButtons[activeStep]?.focus();
  });
  previousStep.addEventListener("click", () => moveStep(-1));
  nextStep.addEventListener("click", () => moveStep(1));

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const rangeCopy = (value) => {
    if (value < 34) return `${value}% · 灵感参考`;
    if (value < 68) return `${value}% · 平衡参考`;
    return `${value}% · 尽量还原`;
  };
  const readForm = () => {
    const type = typeOptions.find((option) => option.value === typeSelect.value) || typeOptions[0];
    const popularity = popularityOptions.find((option) => option.value === form.querySelector("input[name='popularity']:checked")?.value) || popularityOptions[0];
    const requirements = requirementOptions.filter((option) => form.querySelector(`input[name='requirements'][value='${option.value}']`)?.checked);
    const requirementDetails = Object.fromEntries(requirementOptions.map((option) => [option.value, requirementInputs.get(option.value)?.detail.value.trim() || ""]));
    const hasReference = form.querySelector("input[name='hasReference']")?.checked;
    const referenceDegree = Number(referenceRange.value);
    const referenceAspect = referenceAspectField.input.value.trim();
    const freedom = form.querySelector("input[name='authorFreedom']")?.checked;
    const characterName = characterNameField.input.value.trim();
    const characterVariant = characterVariantField.input.value.trim();
    const characters = clamp(Number(characterCount.value) || 1, 1, 8);
    const images = clamp(Number(imageCount.value) || 1, 1, 30);
    const trainingImages = clamp(Number(trainingCount.value) || 50, 20, 300);
    characterCount.value = String(characters);
    imageCount.value = String(images);
    trainingCount.value = String(trainingImages);
    return { type, popularity, requirements, requirementDetails, hasReference, referenceDegree, referenceAspect, freedom, characterName, characterVariant, characters, images, trainingImages };
  };
  const buildEstimate = () => {
    const values = readForm();
    const isLora = values.type.kind === "lora";
    syncSteps(isLora);
    [popularityField, characterField, requirementsField, referenceField, imageField].forEach((field) => { field.hidden = isLora; });
    trainingField.hidden = !isLora;
    characterVariantField.group.hidden = values.popularity.value !== "common";
    requirementInputs.forEach(({ checkbox, detail, row }) => {
      detail.disabled = !checkbox.checked;
      row.classList.toggle("is-active", checkbox.checked);
    });

    let difficulty;
    let timeScore;
    let peopleMultiplier = 1;
    let factorLabels;
    if (isLora) {
      const materialPenalty = values.trainingImages < 50 ? 1 : 0;
      difficulty = clamp(Math.round(values.type.difficulty + materialPenalty), 1, 10);
      timeScore = clamp(Math.round(values.type.time + Math.log2(values.trainingImages / 50) * 1.2), 1, 10);
      factorLabels = [`${values.trainingImages} 张训练图`, values.trainingImages < 50 ? "素材量偏少" : "按训练图规模估算"];
      resultTitle.textContent = `${values.type.label} · ${values.trainingImages} 张训练图`;
      resultLead.textContent = "耗时评分按训练图的检查、打标和训练规模计算。";
    } else {
      const requirementDifficulty = values.requirements.reduce((total, option) => total + option.difficulty, 0);
      const requirementTimeMultiplier = values.requirements.reduce((total, option) => total * (1 + option.time), 1);
      const referenceDifficulty = values.hasReference ? -0.4 + values.referenceDegree / 100 * 2.4 : 0;
      const referenceTimeMultiplier = values.hasReference ? 0.95 + values.referenceDegree / 100 * 0.55 : 1.15;
      const freedomDifficulty = values.hasReference && values.freedom ? -0.7 : 0;
      const freedomTimeMultiplier = values.hasReference && values.freedom ? 0.88 : 1;
      peopleMultiplier = Math.pow(2, values.characters - 1);
      const calculatedDifficulty = Math.round(values.type.difficulty + values.popularity.difficulty + requirementDifficulty + referenceDifficulty + freedomDifficulty);
      difficulty = clamp(values.characters > 4 ? Math.max(6, calculatedDifficulty) : calculatedDifficulty, 1, 10);
      const imageWorkMultiplier = values.images;
      const totalWorkMultiplier = peopleMultiplier * requirementTimeMultiplier * referenceTimeMultiplier * freedomTimeMultiplier * imageWorkMultiplier;
      timeScore = clamp(Math.round(values.type.time + Math.log2(Math.max(1, totalWorkMultiplier)) * 1.12 + values.popularity.time), 1, 10);
      factorLabels = [values.popularity.label, `${values.characters} 个角色`, ...values.requirements.map((item) => item.label)];
      if (values.hasReference) factorLabels.push(`${rangeCopy(values.referenceDegree).split(" · ")[1]}`);
      else factorLabels.push("暂无参考，需先摸索");
      if (values.freedom && values.hasReference) factorLabels.push("允许作者发挥");
      resultTitle.textContent = `${values.type.label} · ${values.images} 张`;
      resultLead.textContent = `基于 ${values.type.label} 的参考分与当前需求计算。`;
    }
    const referenceCostBoost = !isLora && values.hasReference ? values.referenceDegree / 100 * 1.3 : 0;
    const combinedScore = difficulty * 0.48 + timeScore * 0.52 + referenceCostBoost;
    const budget = combinedScore < 3.2 ? "基础" : combinedScore < 5.6 ? "中等" : combinedScore < 7.8 ? "较高" : "高";
    const budgetLevel = budget === "基础" ? "basic" : budget === "中等" ? "medium" : budget === "较高" ? "elevated" : "high";
    const updateMeter = (meter, score) => {
      meter.value.replaceChildren(document.createTextNode(String(score)), el("small", "", "/10"));
      meter.segmentNodes.forEach((segment, index) => segment.classList.toggle("is-active", index < score));
    };
    updateMeter(difficultyMeter, difficulty);
    updateMeter(timeMeter, timeScore);
    budgetValue.textContent = budget;
    budgetValue.dataset.level = budgetLevel;
    recipe.textContent = isLora
      ? `${values.type.label} · ${values.trainingImages} 张训练图`
      : `${values.type.label} · ${values.popularity.label} · ${values.characters} 人 · ${values.hasReference ? rangeCopy(values.referenceDegree).split(" · ")[1] : "暂无参考"}`;
    characterMultiplier.textContent = `当前多人耗时倍率：×${peopleMultiplier}`;
    factors.replaceChildren();
    factorLabels.forEach((label) => factors.appendChild(el("li", "", label)));
    referencePanel.hidden = !values.hasReference;
    referenceValue.textContent = rangeCopy(values.referenceDegree);
    const requirementSummary = values.requirements.map((item) => {
      const detail = values.requirementDetails[item.value];
      return detail ? `${item.label}：${detail}` : item.label;
    });
    const requestDetails = isLora ? [
      `训练图数量：${values.trainingImages} 张`,
    ] : [
      `图片数量：${values.images} 张`,
      `角色数量：${values.characters} 个`,
      `角色热度：${values.popularity.label}`,
      `角色名：${values.characterName || "未填写"}`,
      ...(values.popularity.value === "common" ? [`皮肤 / 装甲：${values.characterVariant || "未填写"}`] : []),
      `指定细节：${requirementSummary.length ? requirementSummary.join("；") : "暂无"}`,
      `参考：${values.hasReference ? `${rangeCopy(values.referenceDegree)}；参考方面：${values.referenceAspect || "未填写"}` : "暂无参考"}`,
      `允许作者发挥：${values.freedom && values.hasReference ? "是" : "否"}`,
    ];
    const summary = [
      "定制需求摘要",
      `类型：${values.type.label}`,
      ...requestDetails,
    ].join("\n");
    copy.dataset.summary = summary;
  };
  [typeSelect, referenceRange, characterCount, imageCount, trainingCount, form].forEach((control) => control.addEventListener("input", buildEstimate));
  form.addEventListener("change", buildEstimate);
  const bindStepper = (button, input, direction, step = 1) => button.addEventListener("click", () => {
    input.value = String(clamp(Number(input.value || input.min) + direction * step, Number(input.min), Number(input.max)));
    buildEstimate();
  });
  bindStepper(decrease, characterCount, -1);
  bindStepper(increase, characterCount, 1);
  bindStepper(imageDecrease, imageCount, -1);
  bindStepper(imageIncrease, imageCount, 1);
  bindStepper(trainingDecrease, trainingCount, -1, 10);
  bindStepper(trainingIncrease, trainingCount, 1, 10);
  copy.addEventListener("click", async () => {
    const summary = copy.dataset.summary || "";
    try {
      await navigator.clipboard.writeText(summary);
      copy.textContent = "已复制摘要";
      window.setTimeout(() => { copy.textContent = "复制需求摘要"; }, 1600);
    } catch {
      copy.textContent = "请手动复制需求摘要";
    }
  });
  buildEstimate();
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
initHeroMarquee();
renderSponsor();
renderCustom();
initInfoDialog();
initEntryGate(() => {
  document.body.classList.add("is-entered");
  renderDirectGallery();
  animateMetrics();
});
