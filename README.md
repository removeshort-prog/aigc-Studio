# removeshort AIGC Studio

个人 AIGC 视觉展示站，用来集中展示图片作品、赞助原图入口和定制委托说明。

在线访问：

```text
https://removeshort-prog.github.io/aigc-Studio/#direct
```

## 页面内容

- **首页：** 头像、昵称、平台入口，以及千禧七大难题电子云交互预览。
- **图片类：** 二次元类、数字艺术类、画风展示。
- **赞助原图：** 跳转到 B 站小店。
- **定制委托：** 私定说明、需求估算和价格沟通方式。

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

## 本地预览

在项目目录启动静态服务器：

```powershell
python -m http.server 8000
```

然后打开：

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
- `portfolio-data.js`：站点文字、链接和定制说明。
- `generated-gallery.js`：由 `scripts/generate-gallery.js` 自动生成，不建议手改。
- `scripts/build-publish.py`：生成 `_site/` 并把图片压缩为 WebP。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署流程。
