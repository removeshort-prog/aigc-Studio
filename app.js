const data = window.PORTFOLIO_DATA;
const generatedGallery = window.GENERATED_GALLERY || {};
const generatedSocialStats = window.GENERATED_SOCIAL_STATS || {};

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
    const items = Array.isArray(group) ? group : [group?.cover, ...(group?.samples || [])];
    const entry = items.map(asEntry).find((item) => item?.src?.includes("huggingface.co"));
    if (entry?.src && !urls.includes(entry.src)) urls.push(entry.src);
  });
  return urls.slice(0, 3);
}

function probeGalleryImage(url, timeout = 7000) {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => finish(false), timeout);
    const finish = (loaded) => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
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

  const finish = (isReachable) => {
    window.clearInterval(progressTimer);
    statusTimers.forEach(window.clearTimeout);
    setProgress(100);
    gate.dataset.state = isReachable ? "ready" : "offline";
    gate.setAttribute("aria-busy", "false");
    statusTitle.textContent = isReachable ? "图库连接完成" : "图库连接受限";
    statusDetail.textContent = isReachable
      ? "展示图片已就绪，即将进入"
      : "请检查网络配置以查看展示图片";
    button.hidden = false;
    button.disabled = false;
    window.setTimeout(() => button.focus({ preventScroll: true }), 180);
    exitTimer = window.setTimeout(enterSite, isReachable ? 1200 : 3600);
  };

  const probeUrls = getGalleryProbeUrls();
  const probePromise = probeUrls.length
    ? Promise.all(probeUrls.map((url) => probeGalleryImage(url))).then((results) => results.some(Boolean))
    : Promise.resolve(false);

  probePromise.then((isReachable) => {
    const remaining = Math.max(0, 1500 - (performance.now() - startedAt));
    window.setTimeout(() => finish(isReachable), remaining);
  });

  button.addEventListener("click", () => {
    if (!button.disabled) enterSite();
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
    const followers = Number(generatedSocialStats[item.kind]?.followers);
    const hasFollowers = Number.isFinite(followers) && followers > 0;
    const value = hasFollowers
      ? `<small class="platform-live-count" data-count-target="${followers}" data-count-suffix=" 粉丝">0</small>`
      : `<small>${item.value}</small>`;
    const isLive = hasFollowers && generatedSocialStats[item.kind]?.live === true;
    const note = hasFollowers
      ? isLive
        ? `<em><i class="platform-live-dot" aria-hidden="true"></i>实时粉丝数</em>`
        : `<em class="platform-sync-note">暂用上次数据</em>`
      : `<em>${item.note}</em>`;
    card.innerHTML = `<span>${item.platform}</span><strong>${item.title}</strong>${value}${note}`;
    strip.appendChild(card);
  });

  const infoButton = document.createElement("button");
  infoButton.className = "platform-card is-info";
  infoButton.type = "button";
  infoButton.id = "infoDialogOpen";
  infoButton.innerHTML = `<span>Info</span><strong>说明反馈</strong><small>About</small><em>本站说明 / GitHub 仓库</em>`;
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

function setGalleryCounts(count) {
  [qs("#featureGalleryCount"), qs("#galleryCount")].filter(Boolean).forEach((node) => {
    node.dataset.countTarget = String(count);
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

function initFeatureMotion() {
  const cards = [...document.querySelectorAll(".feature-card[href^='#']")];
  if (!cards.length) return;

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
  };

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      setActive(card.getAttribute("href"), true);
    });
  });

  const sections = cards
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
  if (filters) filters.innerHTML = "";

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

  setGalleryCounts(entries.length);

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

  entries.forEach(({ entry, group, index, isCover }) => {
    const title = `${group.title} #${index + 1}`;
    const card = el("article", `masonry-card is-${entry.orientation || "landscape"}`);
    card.dataset.group = group.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看 ${title}`);
    card.appendChild(imageFrame(entry, `${group.title} ${index + 1}`, "masonry-frame"));

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
    card.addEventListener("click", () => openImage(entry, title));
    card.addEventListener("keydown", (event) => {
      if (event.target !== card || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      openImage(entry, title);
    });
    gallery.appendChild(card);
  });
  const initialFilter = groups[0]?.id;
  if (initialFilter) {
    gallery.querySelectorAll(".masonry-card").forEach((card) => {
      card.hidden = card.dataset.group !== initialFilter;
    });
  }
  filters?.addEventListener("click", (event) => {
    const button = event.target.closest(".gallery-filter");
    if (!button) return;
    filters.querySelectorAll(".gallery-filter").forEach((node) => node.classList.toggle("is-active", node === button));
    gallery.querySelectorAll(".masonry-card").forEach((card) => {
      card.hidden = card.dataset.group !== button.dataset.filter;
    });
  });
  initImageFavoriteCounters(gallery);
}

function openImage(input, title) {
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
  formHeader.appendChild(el("h3", "", "把想法拆成可评估的要求"));
  form.appendChild(formHeader);

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

  const result = el("aside", "custom-estimator-result");
  result.setAttribute("aria-live", "polite");
  result.appendChild(el("span", "custom-kicker", "即时估算"));
  const resultTitle = el("h3", "", "需求还没填完");
  result.appendChild(resultTitle);
  const resultLead = el("p", "custom-result-lead", "完成左侧表格后，这里会显示当前估算。");
  result.appendChild(resultLead);
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
  const budgetStat = el("div", "custom-final-cost");
  budgetStat.appendChild(el("span", "", "最终估算费用"));
  const budgetValue = el("strong", "", "--");
  budgetValue.className = "custom-budget-value";
  budgetStat.appendChild(budgetValue);
  result.appendChild(budgetStat);
  const factors = el("ul", "custom-estimate-factors");
  result.appendChild(factors);
  const actions = el("div", "custom-estimate-actions");
  const mail = (data.platformLinks || []).find((link) => link.kind === "mail");
  const send = el("a", "custom-contact-primary", "发送定制请求");
  if (mail) send.href = mail.url;
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "custom-contact-secondary";
  copy.textContent = "复制需求摘要";
  actions.appendChild(send);
  actions.appendChild(copy);
  result.appendChild(actions);
  const resultNote = el("p", "custom-result-note", "仅为预估参考，请以实际沟通确认结果为准。复制摘要后，也可以直接粘贴到 B 站私信。 ");
  const bilibili = (data.platformLinks || []).find((link) => link.kind === "bilibili");
  if (bilibili) {
    const link = el("a", "custom-result-link", "打开 B 站");
    link.href = bilibili.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    resultNote.appendChild(link);
  }
  result.appendChild(resultNote);

  estimator.appendChild(form);
  estimator.appendChild(result);
  grid.appendChild(privateNote);
  grid.appendChild(estimator);

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
    if (mail) send.href = `${mail.url}?subject=${encodeURIComponent("定制请求 · " + values.type.label)}&body=${encodeURIComponent(summary)}`;
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
      copy.textContent = "请手动复制邮件内容";
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
renderSponsor();
renderCustom();
initInfoDialog();
initFeatureMotion();
initEntryGate(() => {
  renderDirectGallery();
  animateMetrics();
});
