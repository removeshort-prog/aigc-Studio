const fs = require("fs/promises");
const path = require("path");

const root = path.resolve(__dirname, "..");
const space = process.env.HF_SPACE || "removeshort/removeshort-AIGC-Studio";
const revision = process.env.HF_REVISION || "main";
const outputFile = path.resolve(process.env.HF_GALLERY_OUTPUT || path.join(root, "generated-gallery.js"));
const extensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const groups = ["anime", "digital-art", "style-showcase"];
const retries = 3;

function encodePath(filePath) {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "aigc-studio-pages-build" } });
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries) await wait(attempt * 1_500);
  }
  throw lastError;
}

async function fetchFiles() {
  const url = `https://huggingface.co/api/spaces/${space}/tree/${revision}/assets/images?recursive=true&expand=false&limit=1000`;
  const response = await fetchWithRetry(url);
  if (!response.ok) throw new Error(`Unable to list Hugging Face assets: ${response.status} ${response.statusText}`);
  const entries = await response.json();
  if (!Array.isArray(entries)) throw new Error("Hugging Face assets response was not a file list.");

  return entries
    .map((entry) => entry.path)
    .filter((filePath) => extensions.has(path.extname(filePath).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function parseFile(filePath) {
  const match = /^assets\/images\/(anime|digital-art|style-showcase)(?:\/(sfw|nsfw))?\/.+$/.exec(filePath);
  if (!match) return null;
  return { group: match[1], rating: match[2] || "legacy", filePath };
}

function entry(filePath, rating) {
  return {
    src: `https://huggingface.co/spaces/${space}/resolve/${revision}/${encodePath(filePath)}`,
    // Gallery layout remains stable without fetching image binaries in Actions.
    orientation: "portrait",
    rating,
  };
}

function buildGroup(group, files) {
  const parsed = files.map(parseFile).filter((item) => item?.group === group);
  const sfw = parsed.filter((item) => item.rating === "sfw");
  const legacy = parsed.filter((item) => item.rating === "legacy");
  const sourceSfw = sfw.length ? sfw : legacy;
  const nsfw = parsed.filter((item) => item.rating === "nsfw");
  const coverFile = sourceSfw.find((item) => path.basename(item.filePath, path.extname(item.filePath)).toLowerCase() === "cover") || sourceSfw[0];
  const cover = coverFile ? entry(coverFile.filePath, "sfw") : null;
  const samples = [...sourceSfw.filter((item) => item !== coverFile), ...nsfw]
    .map((item) => entry(item.filePath, item.rating === "nsfw" ? "nsfw" : "sfw"));
  return { cover, samples };
}

async function main() {
  const files = await fetchFiles();
  const gallery = Object.fromEntries(groups.map((group) => [group, buildGroup(group, files)]));
  const sfwCount = groups.reduce((total, group) => total + (gallery[group].cover ? 1 : 0) + gallery[group].samples.filter((item) => item.rating === "sfw").length, 0);
  if (!sfwCount) throw new Error("No SFW images were found in Hugging Face.");
  await fs.writeFile(outputFile, `window.GENERATED_GALLERY = ${JSON.stringify(gallery, null, 2)};\n`, "utf8");
  console.log(`Generated Hugging Face gallery index with ${sfwCount} SFW image(s).`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
