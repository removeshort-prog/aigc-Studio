const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const directRoot = path.join(root, "assets", "works", "direct");
const rebuildRoot = path.join(root, "assets", "works", "rebuild");
const outputFile = path.join(root, "generated-gallery.js");
const groups = ["group", "single", "styles"];
const extensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toWebPath(filePath) {
  return `./${path.relative(root, filePath).split(path.sep).join("/")}`;
}

function getImageSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer.toString("ascii", 1, 4) === "PNG";
  const isWebp = buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";

  if (isJpeg || ext === ".jpg" || ext === ".jpeg") {
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
        };
      }
      offset += 2 + length;
    }
  }

  if (isPng || ext === ".png") {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (isWebp || ext === ".webp") {
    const type = buffer.toString("ascii", 12, 16);
    if (type === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
    if (type === "VP8 ") {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    }
  }

  return { width: 1, height: 1 };
}

function imageEntry(filePath) {
  const size = getImageSize(filePath);
  return {
    src: toWebPath(filePath),
    width: size.width,
    height: size.height,
    orientation: size.width >= size.height ? "landscape" : "portrait",
  };
}

function scanGroup(group) {
  const dir = path.join(directRoot, group);
  ensureDir(dir);

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dir, entry.name))
    .filter((filePath) => extensions.has(path.extname(filePath).toLowerCase()))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), "zh-Hans-CN"));

  const cover =
    files.find((filePath) => path.basename(filePath, path.extname(filePath)).toLowerCase() === "cover") ||
    files[0] ||
    "";

  const samples = files.filter((filePath) => filePath !== cover);
  return {
    cover: cover ? imageEntry(cover) : null,
    samples: samples.map(imageEntry),
  };
}

function titleFromFolder(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/^\d+\s*/, "")
    .trim() || name;
}

function findNamedImage(files, names) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  return files.find((filePath) => {
    const base = path.basename(filePath, path.extname(filePath)).toLowerCase();
    return normalizedNames.includes(base);
  });
}

function scanRebuilds() {
  ensureDir(rebuildRoot);
  const dirs = fs
    .readdirSync(rebuildRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rebuildRoot, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), "zh-Hans-CN"));

  return dirs
    .map((dir, index) => {
      const files = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(dir, entry.name))
        .filter((filePath) => extensions.has(path.extname(filePath).toLowerCase()))
        .sort((a, b) => path.basename(a).localeCompare(path.basename(b), "zh-Hans-CN"));

      const before = findNamedImage(files, ["before", "原图", "初稿"]) || files[0];
      const after = findNamedImage(files, ["after", "重构", "成品"]) || files.find((filePath) => filePath !== before);
      if (!before || !after) return null;

      const folderName = path.basename(dir);
      return {
        title: titleFromFolder(folderName) || `重构案例 ${index + 1}`,
        before: imageEntry(before),
        after: imageEntry(after),
        beforeFallback: "Before",
        afterFallback: "After",
        summary: "展示从初稿到重构后的画面完成度提升。",
        tags: ["Before", "After", "重构"],
      };
    })
    .filter(Boolean);
}

const gallery = Object.fromEntries(groups.map((group) => [group, scanGroup(group)]));
const rebuilds = scanRebuilds();
const output = `window.GENERATED_GALLERY = ${JSON.stringify(gallery, null, 2)};\nwindow.GENERATED_REBUILDS = ${JSON.stringify(rebuilds, null, 2)};\n`;

fs.writeFileSync(outputFile, output, "utf8");

console.log("Generated gallery:");
for (const group of groups) {
  const count = gallery[group].samples.length + (gallery[group].cover ? 1 : 0);
  console.log(`- ${group}: ${count} files`);
}
console.log(`- rebuild cases: ${rebuilds.length}`);
