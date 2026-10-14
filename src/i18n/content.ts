import type { SiteLocale } from './config';
import { personalContent } from '../content/personal';

export interface SiteContent {
  layout: {
    skipLink: string;
    siteIcon: string;
  };
  navigation: {
    menu: string;
    closeMenu: string;
    primaryLabel: string;
    home: string;
    about: string;
    photography: string;
    languageSwitchAria: string;
  };
  welcome: {
    kicker: string;
    hello: string;
    nameLead: string;
    name: string;
    subtitle: string;
    scroll: string;
  };
  about: {
    eyebrow: string;
    title: string;
    paragraphs: readonly [string, string];
    contact: string;
    email: string;
    avatarAlt: string;
    scroll: string;
  };
  footer: {
    buildLabel: string;
    commitTitle: string;
  };
}

export const localizedContent = {
  'zh-CN': {
    layout: {
      skipLink: '跳到主要内容',
      siteIcon: '个人主页图标',
    },
    navigation: {
      menu: '菜单',
      closeMenu: '关闭菜单',
      primaryLabel: '主要导航',
      home: '首页',
      about: '关于',
      photography: '相片',
      languageSwitchAria: '切换到英文版本',
    },
    welcome: {
      kicker: '欢迎',
      hello: '你好，',
      nameLead: '我是',
      ...personalContent['zh-CN'].welcome,
      scroll: '了解我',
    },
    about: {
      eyebrow: '关于',
      title: '关于我',
      ...personalContent['zh-CN'].about,
      contact: '联系方式',
      email: '邮件',
      scroll: '看看我的相片',
    },
    footer: {
      buildLabel: '构建于',
      commitTitle: '查看提交',
    },
  },
  en: {
    layout: {
      skipLink: 'Skip to content',
      siteIcon: 'personal homepage icon',
    },
    navigation: {
      menu: 'Menu',
      closeMenu: 'Close menu',
      primaryLabel: 'Primary navigation',
      home: 'Home',
      about: 'About',
      photography: 'Photography',
      languageSwitchAria: 'Switch to the Chinese version',
    },
    welcome: {
      kicker: 'Welcome',
      hello: 'Hello,',
      nameLead: 'I’m',
      ...personalContent.en.welcome,
      scroll: 'More about me',
    },
    about: {
      eyebrow: 'About',
      title: 'About me',
      ...personalContent.en.about,
      contact: 'Contact',
      email: 'Email',
      scroll: 'See my photographs',
    },
    footer: {
      buildLabel: 'Built on',
      commitTitle: 'View commit',
    },
  },
} as const satisfies Record<SiteLocale, SiteContent>;
