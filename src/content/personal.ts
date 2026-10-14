// Personal content; excluded from the code license. See NOTICE.md.
// Keep this module as data only so another site can replace it independently.
export const personalSite = {
  name: 'Jackywhq',
  analyticsId: 'G-5QBS0G1NGJ',
  email: 'i@jackyw.cn',
  repositoryUrl: 'https://github.com/Jackyhq/Home',
  photoArchiveUrl: 'https://photo.jackyw.cn',
  social: {
    github: 'https://github.com/Jackyhq',
    instagram: 'https://www.instagram.com/jackywhq/',
  },
  socialHandles: {
    github: '@jackyhq',
    instagram: '@jackywhq',
  },
  alternateNames: ['Jacky', 'Jackyw', 'Wang Haoquan', 'wanghaoquan', 'Haoquan'],
  knowsAbout: ['Industrial Design', 'Photography'],
  icpRecord: '粤ICP备2025447157号',
} as const;

export const personalLocaleSites = {
  'zh-CN': {
    title: 'Jackywhq | 个人主页',
    description:
      'Jackywhq 的个人主页。正在学习工业设计，关注物品与空间的日常体验，用摄影记录街头与旅途中值得多看一眼的细节。',
    url: 'https://jackyw.cn',
  },
  en: {
    title: 'Jackywhq | Personal Website',
    description:
      'Jackywhq’s personal website. An industrial design student sharing photographs and a closer look at everyday objects, city streets, and travels.',
    url: 'https://jackyw.uk',
  },
} as const;

export const personalContent = {
  'zh-CN': {
    welcome: {
      name: 'Jacky。',
      subtitle: '日常，值得多看一眼。',
    },
    about: {
      paragraphs: [
        '我是 Jacky，正在学习工业设计。我好奇怎样让物品用得顺手，也关心空间如何影响人的感受。',
        '摄影把这份好奇带向街头与旅途。我记录光影与形态，也留意那些匆忙间容易错过、却值得多看一眼的细节。',
      ],
      avatarAlt: 'Jacky 的黑白插画头像，黑色短发并戴着眼镜',
    },
  },
  en: {
    welcome: {
      name: 'Jacky.',
      subtitle: 'A closer look at the everyday.',
    },
    about: {
      paragraphs: [
        'I’m Jacky, an industrial design student. I’m curious about what makes everyday objects intuitive to use, and how spaces make us feel.',
        'Photography takes that curiosity into city streets and places I visit. I look for light, form, and small details worth a second glance.',
      ],
      avatarAlt: 'Black-and-white illustrated portrait of Jacky with short dark hair and glasses',
    },
  },
} as const;
