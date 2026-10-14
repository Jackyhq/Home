export const localizedPhotographyContent = {
  'zh-CN': {
    title: '相片',
    selection: (count: number) => `镜头所见 · ${count} 张相片`,
    archiveLink: '浏览摄影档案',
    status: (count: number) => `当前展示 ${count} 张相片。`,
    swipeStatus: (count: number) => `左右滑动浏览 ${count} 张相片。`,
  },
  en: {
    title: 'Photographs',
    selection: (count: number) => `Through my lens · ${count} photographs`,
    archiveLink: 'Explore the photo archive',
    status: (count: number) => `Showing ${count} photographs.`,
    swipeStatus: (count: number) => `Swipe left or right to browse ${count} photographs.`,
  },
} as const;
