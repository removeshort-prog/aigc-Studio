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

async function fetchItems(sortType) {
  const items = new Map();
  let searchAfter = 0;
  for (let page = 0; page < 30; page += 1) {
    const result = await request("feed/item", {
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
    rows.forEach((item) => items.set(String(item.contentId), item));
    if (!result.haveNextPage) return [...items.values()];
    if (!rows.length || result.nextSearchAfter == null || result.nextSearchAfter === searchAfter) {
      // Bilibili's recommendation feed can be empty outside its app.
      if (sortType === "total_rank" && !items.size) return [];
      throw new Error(`Incomplete ${sortType} feed; keeping the previous snapshot`);
    }
    searchAfter = result.nextSearchAfter;
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
  return {
    id: String(item.contentId),
    title: String(item.title || "").trim(),
    cover: item.cover?.url || "",
    url: cleanLink(item.cardUrl),
  };
}

async function main() {
  const [sales, recommendations] = await Promise.all([
    fetchItems("sale"),
    fetchItems("total_rank"),
  ]);
  if (!sales.length) throw new Error("No shop products returned");
  // Match the owner's featured row when the public recommendation feed is empty.
  const featuredIds = ["41271430", "41803388", "41678379", "41362324"];
  const products = sales.map(normalizeItem);
  const ids = new Set(products.map((item) => item.id));
  const order = recommendations.length ? recommendations.map((item) => String(item.contentId)) : featuredIds;
  const snapshot = {
    featured: [...new Set([...order, ...products.map((item) => item.id)])].filter((id) => ids.has(id)),
    products,
  };
  if (fs.existsSync(output)) {
    const previous = JSON.parse(fs.readFileSync(output, "utf8").replace(/^window\.GENERATED_SHOP\s*=\s*/, "").replace(/;\s*$/, ""));
    delete previous.updatedAt;
    if (JSON.stringify(previous) === JSON.stringify(snapshot)) {
      console.log(`Shop unchanged: ${products.length} products`);
      return;
    }
  }
  snapshot.updatedAt = new Date().toISOString();
  fs.writeFileSync(output, `window.GENERATED_SHOP = ${JSON.stringify(snapshot, null, 2)};\n`, "utf8");
  console.log(`Shop saved: ${products.length} product previews`);
}

main().catch((error) => {
  if (fs.existsSync(output)) {
    console.warn(`Shop sync skipped; using the existing snapshot: ${error.message}`);
  } else {
    console.error(error);
    process.exitCode = 1;
  }
});
