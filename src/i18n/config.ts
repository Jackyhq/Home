import { personalLocaleSites } from '../content/personal';

export const supportedLocales = ['zh-CN', 'en'] as const;

export type SiteLocale = (typeof supportedLocales)[number];

export interface LocaleSiteConfig {
  locale: SiteLocale;
  htmlLang: string;
  ogLocale: string;
  ogAlternateLocale: string;
  title: string;
  description: string;
  url: string;
  hostname: string;
}

const createLocaleSite = (
  config: Omit<LocaleSiteConfig, 'hostname'>,
): LocaleSiteConfig => ({
  ...config,
  hostname: new URL(config.url).hostname,
});

export const localeSites = {
  'zh-CN': createLocaleSite({
    locale: 'zh-CN',
    htmlLang: 'zh-CN',
    ogLocale: 'zh_CN',
    ogAlternateLocale: 'en_GB',
    ...personalLocaleSites['zh-CN'],
  }),
  en: createLocaleSite({
    locale: 'en',
    htmlLang: 'en',
    ogLocale: 'en_GB',
    ogAlternateLocale: 'zh_CN',
    ...personalLocaleSites.en,
  }),
} as const satisfies Record<SiteLocale, LocaleSiteConfig>;

export const resolveSiteLocale = (value: string | undefined): SiteLocale => {
  if (!value || value === 'zh' || value === 'zh-CN') return 'zh-CN';
  if (value === 'en' || value === 'en-GB') return 'en';

  throw new Error(
    `Unsupported SITE_LOCALE "${value}". Expected one of: zh-CN, zh, en, en-GB.`,
  );
};

export const currentLocale = resolveSiteLocale(process.env.SITE_LOCALE);
export const alternateLocale: SiteLocale = currentLocale === 'en' ? 'zh-CN' : 'en';
export const localeSite = localeSites[currentLocale];
export const alternateSite = localeSites[alternateLocale];
export const languageSwitchUrl = `${alternateSite.url}/`;
export const isEnglish = currentLocale === 'en';
