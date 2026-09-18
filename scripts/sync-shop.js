const fs = require("node:fs");
const path = require("node:path");

const output = path.join(__dirname, "..", "generated-shop.js");
const shopMid = "651921014";
const api = "https://mall.bilibili.com/community-hub/small_shop";

async function request(endpoint, body) {
  const response = await fetch(`${api}/${endpoint}`, {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      Referer: "https://mall.bilibili.com/",
      scene: "decorate",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Shop request failed: ${response.status}`);
  const result = await response.json();
  if (result.code !== 0 || !result.data) throw new Error(result.message || "Missing shop data");
  return result.data;
}

async function fetchItems(sortType, requestFeed = request) {
  const items = new Map();
  let searchAfter = 0;
  let expectedTotal = null;
  const cursors = new Set([String(searchAfter)]);
  for (let page = 0; page < 30; page += 1) {
    const result = await requestFeed("feed/item", {
      upMid: shopMid,
      msource: `cps_showcase_${shopMid}`,
      sortType,
      sortOrder: "",
      searchAfter,
      pageSize: 20,
      activityFilter: false,
      keyword: "",
      jxsFilter: false,
      drawGoodsMachineFilter: false,
      clickHideButton: false,
    });
    const rows = result.data || [];
    if (!Array.isArray(rows)) throw new Error(`Invalid ${sortType} feed`);
    if (Number.isInteger(result.totalNum) && result.totalNum >= 0) {
      if (sortType === "sale" && expectedTotal !== null && expectedTotal !== result.totalNum) {
        throw new Error("Shop changed during pagination; keeping the previous snapshot");
      }
      expectedTotal = result.totalNum;
    }
    rows.forEach((item) => {
      if (item.contentId == null || !String(item.contentId).trim()) throw new Error("Missing product ID");
      items.set(String(item.contentId), item);
    });
    if (!result.haveNextPage) {
      if (sortType === "sale" && expectedTotal !== null && items.size !== expectedTotal) {
        throw new Error(`Incomplete shop feed: received ${items.size} of ${expectedTotal} products`);
      }
      return [...items.values()];
    }
    if (!rows.length || result.nextSearchAfter == null || cursors.has(String(result.nextSearchAfter))) {
      // Bilibili's recommendation feed can be empty outside its app.
      if (sortType === "total_rank" && !items.size) return [];
      throw new Error(`Incomplete ${sortType} feed; keeping the previous snapshot`);
    }
    searchAfter = result.nextSearchAfter;
    cursors.add(String(searchAfter));
  }
  throw new Error("Shop pagination exceeded its limit");
}

function cleanLink(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !/(^|\.)bilibili\.com$/.test(url.hostname)) throw new Error("Invalid product link");
  url.searchParams.delete("track_id");
  const hash = new URLSearchParams(url.hash.slice(1));
  hash.delete("track_id");
  url.hash = hash.toString();
  return url.href;
}

function normalizeItem(item) {
  const title = String(item.title || "").trim();
  const cover = item.cover?.url || "";
  if (!title || !/^https:\/\//.test(cover)) throw new Error(`Incomplete product ${item.contentId}`);
  return {
    id: String(item.contentId),
    title,
    cover,
    url: cleanLink(item.cardUrl),
  };
}

async function syncShop({ outputFile = output, requestFeed = request } = {}) {
  const [salesResult, recommendationResult] = await Promise.allSettled([
    fetchItems("sale", requestFeed),
    fetchItems("total_rank", requestFeed),
  ]);
  if (salesResult.status === "rejected") throw salesResult.reason;
  const sales = salesResult.value;
  const recommendations = recommendationResult.status === "fulfilled" ? recommendationResult.value : [];
  if (!recommendations.length) console.warn("Recommendation feed unavailable; using Bilibili sales order");
  if (!sales.length) {
    // Confirm an empty shop separately before removing the last cached products.
    const info = await requestFeed("home/info", { smallShopMid: shopMid, msource: `cps_showcase_${shopMid}` });
    if (String(info.smallShopItems) !== "0") throw new Error("Empty feed not confirmed by shop info");
  }
  const products = sales.map(normalizeItem);
  const ids = new Set(products.map((item) => item.id));
  const order = recommendations.map((item) => String(item.contentId));
  const snapshot = {
    featured: [...new Set([...order, ...products.map((item) => item.id)])].filter((id) => ids.has(id)),
    products,
  };
  if (fs.existsSync(outputFile)) {
    const previous = JSON.parse(fs.readFileSync(outputFile, "utf8").replace(/^window\.GENERATED_SHOP\s*=\s*/, "").replace(/;\s*$/, ""));
    delete previous.updatedAt;
    if (JSON.stringify(previous) === JSON.stringify(snapshot)) {
      console.log(`Shop unchanged: ${products.length} products`);
      return;
    }
  }
  snapshot.updatedAt = new Date().toISOString();
  fs.writeFileSync(outputFile, `window.GENERATED_SHOP = ${JSON.stringify(snapshot, null, 2)};\n`, "utf8");
  console.log(`Shop saved: ${products.length} product previews`);
}

if (require.main === module) {
  syncShop().catch((error) => {
    console.error(`Shop sync failed; keeping the existing snapshot: ${error.message}`);
    if (process.argv.includes("--strict") || !fs.existsSync(output)) process.exitCode = 1;
  });
}

module.exports = { fetchItems, syncShop };
