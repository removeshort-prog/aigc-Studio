window.PORTFOLIO_DATA = {
  profile: {
    name: "removeshort AIGC Studio",
    nickname: "我思故汝永存",
    target: "AIGC Visual Playground",
    subtitle: "画风串站点 / AIGC 视觉仓库",
    avatar: "./assets/profile/avatar.webp",
    summary:
      "整理二次元 AIGC 作品、可选画风、图像重构、视频样本和自研小工具，作为定制前的风格参考。",
  },

  platformLinks: [
    {
      kind: "bilibili",
      platform: "Bilibili",
      title: "B 站",
      value: "1.9w 粉丝",
      url: "https://space.bilibili.com/651921014?spm_id_from=333.1007.0.0",
      note: "作品更新 / 私信反馈",
    },
    {
      kind: "pixiv",
      platform: "Pixiv",
      title: "P 站",
      value: "1w 粉丝",
      url: "https://www.pixiv.net/users/106312931",
      note: "图集与插画展示",
    },
    {
      kind: "x",
      platform: "X",
      title: "X",
      value: "待补充",
      url: "",
      note: "外链位置预留",
    },
    {
      kind: "mail",
      platform: "Contact",
      title: "联系方式",
      value: "Email",
      url: "mailto:2651173237@qq.com",
      note: "定制 / 教学沟通",
    },
  ],

  directGroups: [
    {
      id: "anime",
      title: "二次元类",
      difficulty: "难度最高",
      folderHint: "assets/images/anime",
      cover: "./assets/images/anime/cover.jpg",
      fallback: "二次元类封面，命名为 cover.jpg",
      summary:
        "用于展示多人站位、角色遮挡、动作差异、手部稳定、服装区分和画面中心控制。",
      judgePoints: ["多人关系", "站位遮挡", "手部稳定", "主体区分"],
      tags: ["图片类", "二次元", "高难度"],
      samples: [],
    },
    {
      id: "digital-art",
      title: "数字艺术类",
      difficulty: "基础完成度",
      folderHint: "assets/images/digital-art",
      cover: "./assets/images/digital-art/cover.jpg",
      fallback: "数字艺术类封面，命名为 cover.jpg",
      summary:
        "用于展示面部稳定、角色姿态、服装材质、光影控制和二次元角色审美。",
      judgePoints: ["面部稳定", "姿态动作", "服装材质", "光影控制"],
      tags: ["图片类", "数字艺术", "角色"],
      samples: [],
    },
    {
      id: "style-showcase",
      title: "画风展示",
      difficulty: "风格覆盖",
      folderHint: "assets/images/style-showcase",
      cover: "./assets/images/style-showcase/cover.jpg",
      fallback: "画风展示拼图作为封面，命名为 cover.jpg",
      summary:
        "用于展示本地模型画风收集、风格控制、色彩倾向和角色比例差异。",
      judgePoints: ["画风标签", "色彩倾向", "角色比例", "上色方式"],
      tags: ["直出", "画风", "集合"],
      samples: [],
    },
  ],

  rebuilds: [
    {
      title: "背景重构：从可用初稿到宣发完成度",
      before: "./assets/images/reconstruction/01-background/before.png",
      after: "./assets/images/reconstruction/01-background/after.jpg",
      beforeFallback: "SD 初稿",
      afterFallback: "Image2 / Banana2 重构后",
      summary:
        "保留主体方向，重构背景空间、环境光和镜头层次，减少 AI 味和背景杂乱。",
      tags: ["背景", "光影", "空间"],
    },
    {
      title: "主体强化：人物稳定与画面中心",
      before: "./assets/images/reconstruction/02-subject/before.png",
      after: "./assets/images/reconstruction/02-subject/after.png",
      beforeFallback: "原图",
      afterFallback: "重构后",
      summary:
        "针对主体漂移、服饰细节弱、视觉中心不明确的问题进行二次处理。",
      tags: ["主体", "细节", "构图"],
    },
  ],

  videoCategories: [
    {
      id: "puppet",
      title: "木偶动画",
      summary: "适合展示角色动作、镜头节奏、表情和轻量剧情片段。",
      tags: ["木偶动画", "角色动作", "短片"],
    },
    {
      id: "long",
      title: "长视频",
      summary: "适合展示连续叙事、场景切换、BGM 节奏和完整小剧场。",
      tags: ["长视频", "小剧场", "连续叙事"],
    },
  ],

  videos: [
    /*
    {
      title: "Wan2.2 角色动态测试",
      summary: "展示角色动作、镜头推进、光影连续性和画面节奏。",
      poster: "./assets/videos/puppet/wan22-demo-cover.webp",
      src: "./assets/videos/puppet/wan22-demo.mp4",
      url: "",
      tags: ["Wan2.2", "视频", "动态镜头"],
    },
    {
      title: "B站视频案例",
      summary: "外链视频可以只填 url，不上传本地 mp4。",
      poster: "./assets/videos/long/bilibili-case-cover.webp",
      url: "https://www.bilibili.com/video/xxxx",
      tags: ["B站", "视频", "案例"],
    },
    */
  ],

  productionTools: [
    {
      id: "base",
      label: "Base Model",
      title: "本地二次元模型",
      summary:
        "本地出图以 noob_v、anima_base_v1 等二次元模型为主，按题材切换模型、VAE、采样器和分辨率策略。",
      tags: ["底模", "noob_v", "anima_base_v1"],
    },
    {
      id: "lora",
      label: "Lora / LyCORIS",
      title: "Lora / LyCORIS 训练",
      summary:
        "以适配 ss 系训练器的改进 GUI 丹炉为基准，关注 dim、alpha、LR、分层学习率、触发词和素材清洗。",
      tags: ["Lora", "LyCORIS", "dim / LR"],
    },
    {
      id: "platform",
      label: "Platform",
      title: "Comfy / Forge 平台",
      summary:
        "长期自建本地图像生产环境，熟悉 ComfyUI、Forge、Forge Neo 的环境配置、模型管理、插件调试和工作流搭建。",
      tags: ["ComfyUI", "Forge", "工作流"],
    },
  ],

  sponsor: {
    title: "赞助原图 / 原尺寸内容",
    summary: "原图与赞助内容会在 B 站小店同步更新，适合需要收藏原图或支持本站的人。",
    url: "https://b23.tv/f1rIVkT",
    tags: ["B站小店", "原图", "同步更新"],
  },

  siteInfo: {
    title: "关于本站",
    summary:
      "本站参考阿里魔塔 AIGC 页面做了蓝紫科技感和侧边导航的视觉方向，用来集中展示 removeshort 的 AIGC 图片、视频、制作工具、赞助原图和定制说明。",
    intro:
      "个人长期自建本地图像生产环境，主要做二次元 AIGC 视觉、画风整理、图像重构、Lora / LyCORIS 训练和小剧场内容。本站不是商业平台，只是个人作品、工具记录和定制沟通入口。",
    links: [
      {
        title: "GitHub 仓库",
        note: "查看本站源码与页面结构",
        url: "https://github.com/removeshort-prog/aigc-portfolio",
      },
      {
        title: "B 站主页",
        note: "作品更新与私信反馈",
        url: "https://space.bilibili.com/651921014",
      },
      {
        title: "B 站小店",
        note: "赞助原图与原尺寸内容",
        url: "https://b23.tv/f1rIVkT",
      },
    ],
    notes: [
      "页面视觉参考阿里魔塔 AIGC 风格重新整理，内容和作品为个人站点用途。",
      "图片、视频、模型和定制说明会继续更新。",
      "如果页面排版、链接或图片加载有问题，可以通过 B 站私信反馈。",
    ],
  },

  custom: {
    notice: [
      "定制都是私定，不会把定制了的图二次售卖或公开展示。",
      "如果你希望公开展示，也可以提前说明。",
    ],
    items: [
      "手机 / 电脑壁纸类：单角色、多角色合照",
      "成人向图：按角色与需求沟通",
      "抱枕：看角色与尺寸，可能需要多版本修改",
      "痛车：按车身尺寸和展示用途沟通",
      "其他图像需求：基本都可以先聊",
      "画风丹 / 角色丹：按素材、目标风格和训练难度沟通",
    ],
    priceNotes: [
      "价格根据预算和需求决定，难度不同，制作时间也不同。",
      "简单头像价格会低一些；全身壁纸、抱枕、复杂多人图通常需要更多修复时间。",
      "请一定说明预算、用途、角色、尺寸、画风参考和禁忌点。",
      "如果暂时没有想法，会参考 P 站等热度较高的画作方向来整理方案。",
      "最终价格双方觉得可以后再开始制作。",
    ],
    teaching: [
      "可沟通 WebUI / ComfyUI / Forge / Forge Neo 基础环境、工作流整理和 Lora 入门。",
      "教学内容按你的当前水平、电脑配置和目标效果来定。",
    ],
  },

};
