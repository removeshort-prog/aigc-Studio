window.PORTFOLIO_DATA = {
  profile: {
    name: "removeshort AIGC Studio",
    nickname: "我思故汝永存",
    target: "AIGC Visual Playground",
    avatar: "./assets/profile/avatar.webp",
    summary:
      "整理二次元 AIGC 作品与可选画风，作为赞助和定制前的风格参考。",
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
      value: "不常用",
      url: "https://x.com/Removeshort",
      note: "不常用",
    },
    {
      kind: "mail",
      platform: "Contact",
      title: "联系方式",
      value: "Email",
      url: "mailto:2651173237@qq.com",
      note: "定制委托沟通",
    },
  ],

  directGroups: [
    {
      id: "anime",
      title: "二次元类",
      samples: [],
    },
    {
      id: "digital-art",
      title: "数字艺术类",
      cover: "./assets/images/digital-art/6aee006b-cd46-4684-b203-b173ad8b6dc7.webp",
      samples: [],
    },
    {
      id: "style-showcase",
      title: "画风展示",
      cover: "./assets/images/style-showcase/cover.png",
      samples: [],
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
      "本站用来集中展示 removeshort 的 AIGC 图片、赞助原图和定制说明。",
    intro:
      "个人长期自建本地图像生产环境，主要做二次元 AIGC 视觉、画风整理和 Lora / LyCORIS 训练。本站不是商业平台，只是个人作品和定制沟通入口。",
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
      "页面视觉参考阿里风格重新整理，内容和作品为个人站点用途。",
      "图片和定制说明会继续更新。",
      "如果页面排版、链接或图片加载有问题，可以通过 B 站私信反馈。",
    ],
  },

  custom: {
    promise: {
      label: "私定承诺",
      description: "所有定制均为私定，完成后的产物不会二次售卖。",
    },
    pricing: {
      label: "报价依据",
      title: "制作难度与最终耗时",
    },
    estimate: {
      types: [
        { value: "avatar", label: "简单头像", difficulty: 1, time: 2 },
        { value: "wallpaper", label: "全身壁纸", difficulty: 3, time: 4 },
        { value: "adult", label: "成人向图", difficulty: 4, time: 4 },
        { value: "story", label: "连续剧情", difficulty: 3, time: 7 },
        { value: "pillow", label: "抱枕图", difficulty: 3, time: 7 },
        { value: "case", label: "机箱贴图", difficulty: 7, time: 6 },
        { value: "other", label: "其他定制需求", difficulty: 3, time: 4 },
        { value: "style-lora", label: "画风 Lora", difficulty: 7, time: 8, kind: "lora" },
        { value: "character-lora", label: "角色 Lora", difficulty: 8, time: 9, kind: "lora" },
      ],
      popularity: [
        { value: "common", label: "常见角色", difficulty: 0, time: 0 },
        { value: "niche", label: "冷门角色", difficulty: 1.2, time: 0.25 },
      ],
      requirements: [
        { value: "action", label: "指定动作", difficulty: 0.8, time: 0.18 },
        { value: "clothing", label: "指定服饰", difficulty: 0.7, time: 0.16 },
        { value: "expression", label: "指定表情", difficulty: 0.5, time: 0.1 },
        { value: "background", label: "指定背景", difficulty: 0.9, time: 0.2 },
      ],
    },
  },

};
