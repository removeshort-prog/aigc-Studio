const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const assetRoot = path.resolve(process.env.GALLERY_ASSET_ROOT || root);
const publicBaseUrl = (process.env.GALLERY_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const imageRoot = path.join(assetRoot, "assets", "images");
const outputFile = path.join(root, "generated-gallery.js");
const groups = [
  { id: "anime", folder: "anime" },
  { id: "digital-art", folder: "digital-art" },
  { id: "style-showcase", folder: "style-showcase" },
];
const extensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function encodeWebPath(webPath) {
  return webPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function toWebPath(filePath) {
  const base = publicBaseUrl ? assetRoot : root;
  const webPath = path.relative(base, filePath).split(path.sep).join("/");
  return publicBaseUrl ? `${publicBaseUrl}/${encodeWebPath(webPath)}` : `./${webPath}`;
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
  const dir = path.join(imageRoot, group.folder);
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

const gallery = Object.fromEntries(groups.map((group) => [group.id, scanGroup(group)]));
const output = `window.GENERATED_GALLERY = ${JSON.stringify(gallery, null, 2)};\n`;

fs.writeFileSync(outputFile, output, "utf8");

console.log("Generated gallery:");
console.log(`- asset root: ${assetRoot}`);
if (publicBaseUrl) console.log(`- public base: ${publicBaseUrl}`);
for (const group of groups) {
  const count = gallery[group.id].samples.length + (gallery[group.id].cover ? 1 : 0);
  console.log(`- ${group.id}: ${count} files`);
}
