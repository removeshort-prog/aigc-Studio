# removeshort AIGC Studio

个人 AIGC 视觉展示站，用来集中展示图片作品、赞助原图入口和定制委托说明。

在线访问：

```text
https://removeshort-prog.github.io/aigc-Studio/#direct
```

## 页面内容

- **首页：** 头像、昵称、平台入口，以及千禧七大难题电子云交互预览。
- **图片类：** 二次元类、数字艺术类、画风展示。
- **赞助原图：** 粉色商品展示区，仅保留商品名和预览图，点击图片或名称直达对应 B 站商品详情页，支持展开更多商品。
- **定制委托：** 私定说明、需求估算和价格沟通方式。

## NSFW 浏览开关

包含 NSFW 作品的分类会显示模块开关，默认关闭，图片保留灰色高斯模糊预览。开启时先显示预览警告，确认年满 18 岁后去掉模糊，即可连续浏览并点击作品查看大图；取消或按 Escape 会保持模糊。关闭开关立即恢复灰色模糊，再次开启需重新确认。

开关状态保存在当前标签页的会话中，刷新页面后保留。关闭时缩略图仍会加载用于模糊预览，卡片不可操作，也无法打开清晰大图；浏览器禁用会话存储时，开关仍可使用，但刷新后恢复模糊。

本地使用 `/?demo-nsfw` 可用一张普通示例图检查开关和警告流程。

## 常用维护

### 更新小店商品

```powershell
node scripts/sync-shop.js
```

`generated-shop.js` 仅保存商品名称、封面、详情链接和展示顺序。现有的社交统计同步工作流和发布构建会更新商品数据；接口临时不可用时保留上次成功的数据，不依赖浏览器跨域请求。展示顺序优先使用 B 站推荐结果；公开推荐接口为空时，使用截图中四件商品作为首排，其余沿用商品接口顺序。

小店位于原「赞助原图」板块，采用粉色背景和商品卡片，支持亮暗主题；桌面四列、手机两列。默认展示八件，点击「展开更多商品」继续浏览。卡片不展示价格、销量和优惠标签，板块不展示店铺资料、统计数据、排序或搜索。

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
