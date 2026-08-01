const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputFile = path.join(root, "generated-social-stats.js");
const defaults = {
  bilibili: { followers: 19596, live: true },
  pixiv: { followers: 10000, live: false },
  bilibiliShop: { items: 31, live: true },
};

function loadPreviousStats() {
  if (!fs.existsSync(outputFile)) return structuredClone(defaults);
  const text = fs.readFileSync(outputFile, "utf8");
  const match = text.match(/window\.GENERATED_SOCIAL_STATS\s*=\s*([\s\S]+);\s*$/);
  if (!match) return structuredClone(defaults);
  try {
    return { ...structuredClone(defaults), ...JSON.parse(match[1]) };
  } catch {
    return structuredClone(defaults);
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Accept-Language": "en-US,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; removeshort-AIGC-Studio/1.0)",
        ...options.headers,
      },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function findFollowerCount(value) {
  if (!value || typeof value !== "object") return null;
  for (const name of ["follower", "followers", "followerCount", "totalFollowers"]) {
    const number = Number(value[name]);
    if (Number.isFinite(number) && number > 0) return number;
  }
  for (const [key, child] of Object.entries(value)) {
    if (/follow/i.test(key) && !/^is/i.test(key)) {
      const number = Number(child);
      if (Number.isFinite(number) && number > 0) return number;
    }
    const nested = findFollowerCount(child);
    if (nested) return nested;
  }
  return null;
}

async function getBilibiliFollowers() {
  const response = await fetchWithTimeout("https://api.bilibili.com/x/relation/stat?vmid=651921014");
  const payload = await response.json();
  const followers = Number(payload?.data?.follower);
  if (!Number.isFinite(followers) || followers < 1) throw new Error("Bilibili follower count missing");
  return followers;
}

async function getBilibiliShopItems() {
  const response = await fetchWithTimeout("https://mall.bilibili.com/community-hub/small_shop/home/info", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://mall.bilibili.com/",
      scene: "decorate",
    },
    body: JSON.stringify({
      smallShopMid: "651921014",
      msource: "cps_showcase_651921014",
    }),
  });
  const payload = await response.json();
  const items = Number(payload?.data?.smallShopItems);
  if (!Number.isFinite(items) || items < 0) throw new Error("Bilibili shop item count missing");
  return items;
}

async function getPixivFollowers() {
  const apiResponse = await fetchWithTimeout("https://www.pixiv.net/ajax/user/106312931?full=1&lang=en", {
    headers: { Referer: "https://www.pixiv.net/" },
  });
  const payload = await apiResponse.json();
  const followers = findFollowerCount(payload?.body);
  if (!followers) throw new Error("Pixiv follower count missing");
  return followers;
}

async function main() {
  const stats = loadPreviousStats();
  let successfulSources = 0;

  try {
    stats.bilibili = { followers: await getBilibiliFollowers(), live: true };
    successfulSources += 1;
  } catch (error) {
    console.warn(`Bilibili sync skipped: ${error.message}`);
  }

  try {
    stats.bilibiliShop = { items: await getBilibiliShopItems(), live: true };
    successfulSources += 1;
  } catch (error) {
    console.warn(`Bilibili shop sync skipped: ${error.message}`);
  }

  try {
    stats.pixiv = { followers: await getPixivFollowers(), live: true };
    successfulSources += 1;
  } catch (error) {
    console.warn(`Pixiv sync skipped: ${error.message}`);
  }

  if (!successfulSources) throw new Error("No social stats could be refreshed");
  fs.writeFileSync(outputFile, `window.GENERATED_SOCIAL_STATS = ${JSON.stringify(stats, null, 2)};\n`, "utf8");
  Object.entries(stats).forEach(([name, item]) => console.log(`${name}: ${item.followers ?? item.items}`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
