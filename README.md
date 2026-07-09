# removeshort AIGC Studio

个人 AIGC 视觉展示站，用来集中展示图片作品、重构案例、视频样本、制作工具记录、赞助原图入口，以及定制 / 教学说明。

在线访问：

```text
https://removeshort-prog.github.io/aigc-portfolio/
```

## 页面内容

- **首页：** 头像、昵称、平台入口，以及千禧七大难题电子云交互预览。
- **图片类：** 二次元类、数字艺术类、画风展示、重构整理。
- **视频类：** 木偶动画、长视频，支持本地视频或 B 站外链。
- **制作工具展示：** 底模、Lora / LyCORIS、Comfy / Forge 等生产环境记录。
- **赞助原图：** 跳转到 B 站小店。
- **定制 / 教学：** 私定说明、可订内容、价格沟通方式。

## 常用维护

### 更新图片

把图片上传到对应文件夹后提交到 `main` 分支即可。GitHub Actions 会自动扫描图片、生成图集数据、压缩为 WebP 并部署到 GitHub Pages。

```text
assets/images/anime/           二次元类
assets/images/digital-art/     数字艺术类
assets/images/style-showcase/  画风展示
```

每个文件夹可以放一张封面图，命名为：

```text
cover.jpg
cover.png
cover.webp
```

没有封面时，会自动使用文件夹里的第一张图片。

### 更新重构案例

每个案例一个文件夹：

```text
assets/images/reconstruction/案例名称/before.jpg
assets/images/reconstruction/案例名称/after.jpg
```

也支持中文命名：

```text
原图.jpg
初稿.jpg
重构.jpg
成品.jpg
```

如果要自定义标题、说明和标签，可以在同一个文件夹里加 `meta.json`：

```json
{
  "title": "背景重构案例",
  "summary": "保留角色主体，重新整理背景空间、光影和画面层次。",
  "tags": ["Before", "After", "背景"]
}
```

### 添加视频

本地视频放在：

```text
assets/videos/puppet/  木偶动画
assets/videos/long/    长视频
```

然后在 `portfolio-data.js` 的 `videos` 数组里添加：

```js
{
  category: "puppet",
  title: "Wan2.2 角色动态测试",
  summary: "展示角色动作、镜头推进、光影连续性和画面节奏。",
  poster: "./assets/videos/puppet/wan22-demo-cover.webp",
  src: "./assets/videos/puppet/wan22-demo.mp4",
  tags: ["Wan2.2", "视频", "动态镜头"]
}
```

如果视频已经发在 B 站，可以只放封面图并填写外链：

```js
{
  category: "long",
  title: "B 站视频案例",
  summary: "展示长视频或小剧场内容。",
  poster: "./assets/videos/long/bilibili-case-cover.webp",
  url: "https://www.bilibili.com/video/xxxx",
  tags: ["B站", "视频", "案例"]
}
```

## 本地预览

双击 `start-preview.bat`，然后打开：

```text
http://127.0.0.1:8000/
```

也可以手动生成发布目录：

```powershell
node scripts\generate-gallery.js
python scripts\build-publish.py
```

`_site/` 是自动生成目录，不需要手动上传或编辑。

## 文件说明

- `index.html`：页面结构。
- `styles.css`：页面样式。
- `app.js`：图集、弹窗、筛选、主题切换等主要交互。
- `millennium.js`：首页千禧七大难题电子云动画。
- `portfolio-data.js`：站点文字、链接、视频、制作工具和定制说明。
- `generated-gallery.js`：由 `scripts/generate-gallery.js` 自动生成，不建议手改。
- `scripts/build-publish.py`：生成 `_site/` 并把图片压缩为 WebP。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署流程。
