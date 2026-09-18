const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { syncShop } = require("./sync-shop");

function item(id, title = `Product ${id}`) {
  return {
    contentId: id,
    title,
    cover: { url: `https://i0.hdslb.com/bfs/mall/${id}.png` },
    cardUrl: `https://mall.bilibili.com/detail.html?itemsId=${id}&track_id=temporary#msource=shop&track_id=temporary`,
    netPrice: { netPrice: "30" },
  };
}

function snapshot(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aigc-shop-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const outputFile = path.join(directory, "generated-shop.js");
  const old = 'window.GENERATED_SHOP = {"featured":["old"],"products":[{"id":"old"}],"updatedAt":"previous"};\n';
  fs.writeFileSync(outputFile, old);
  return {
    outputFile,
    old,
    read: () => JSON.parse(fs.readFileSync(outputFile, "utf8").replace(/^window\.GENERATED_SHOP = /, "").replace(/;\s*$/, "")),
    bytes: () => fs.readFileSync(outputFile, "utf8"),
  };
}

const noRecommendations = { data: [], haveNextPage: true, nextSearchAfter: 0 };

test("sync replaces removed products, updates names and covers, and includes every page", async (t) => {
  const target = snapshot(t);
  const renamed = item("1", "Updated name");
  renamed.cover.url = "https://i0.hdslb.com/bfs/mall/new-cover.png";
  const calls = [];
  await syncShop({
    outputFile: target.outputFile,
    requestFeed: async (_, body) => {
      if (body.sortType === "total_rank") return { data: [item("3"), item("removed")], haveNextPage: false };
      calls.push(body.searchAfter);
      return body.searchAfter === 0
        ? { data: [renamed, item("2")], haveNextPage: true, nextSearchAfter: 2, totalNum: 3 }
        : { data: [item("3")], haveNextPage: false, totalNum: 3 };
    },
  });
  const current = target.read();
  assert.deepEqual(calls, [0, 2]);
  assert.deepEqual(current.products.map((product) => product.id), ["1", "2", "3"]);
  assert.deepEqual(current.featured, ["3", "1", "2"]);
  assert.equal(current.products[0].title, "Updated name");
  assert.equal(current.products[0].cover, renamed.cover.url);
  assert.deepEqual(Object.keys(current.products[0]).sort(), ["cover", "id", "title", "url"]);
  assert.equal(current.products[0].url, "https://mall.bilibili.com/detail.html?itemsId=1#msource=shop");
});

for (const recommendation of ["empty", "failed"]) {
  test(`${recommendation} recommendations use the current Bilibili sales order`, async (t) => {
    const target = snapshot(t);
    const requestFeed = async (_, body) => {
      if (body.sortType === "total_rank") {
        if (recommendation === "failed") throw new Error("Recommendation API unavailable");
        return noRecommendations;
      }
      return { data: [item("new"), item("41271430")], totalNum: 2, haveNextPage: false };
    };
    await syncShop({ outputFile: target.outputFile, requestFeed });
    assert.deepEqual(target.read().featured, ["new", "41271430"]);
    const saved = target.bytes();
    await syncShop({ outputFile: target.outputFile, requestFeed });
    assert.equal(target.bytes(), saved, "Unchanged products must not create a new timestamp or commit");
  });
}

for (const problem of ["short page", "repeated cursor", "changed total", "invalid product", "request failure"]) {
  test(`${problem} preserves the last complete snapshot`, async (t) => {
    const target = snapshot(t);
    await assert.rejects(syncShop({
      outputFile: target.outputFile,
      requestFeed: async (_, body) => {
        if (body.sortType === "total_rank") return noRecommendations;
        if (problem === "request failure") throw new Error("API unavailable");
        if (problem === "short page") return { data: [item("1")], totalNum: 2, haveNextPage: false };
        if (problem === "repeated cursor") return { data: [item("1")], haveNextPage: true, nextSearchAfter: "0" };
        if (problem === "changed total") return body.searchAfter === 0
          ? { data: [item("1")], totalNum: 2, haveNextPage: true, nextSearchAfter: 1 }
          : { data: [item("2")], totalNum: 3, haveNextPage: false };
        return { data: [{ ...item("1"), title: "" }], totalNum: 1, haveNextPage: false };
      },
    }));
    assert.equal(target.bytes(), target.old);
  });
}

test("removing the last product requires an empty shop confirmation", async (t) => {
  const target = snapshot(t);
  let total = "1";
  const requestFeed = async (endpoint, body) => {
    if (endpoint === "home/info") return { smallShopItems: total };
    return body.sortType === "total_rank" ? noRecommendations : { data: [], totalNum: 0, haveNextPage: false };
  };
  await assert.rejects(syncShop({ outputFile: target.outputFile, requestFeed }), /not confirmed/);
  assert.equal(target.bytes(), target.old);
  total = "0";
  await syncShop({ outputFile: target.outputFile, requestFeed });
  assert.deepEqual(target.read().products, []);
  assert.deepEqual(target.read().featured, []);
});
