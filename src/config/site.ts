import {
  alternateSite,
  currentLocale,
  localeSite,
} from '../i18n/config';
import { personalSite } from '../content/personal';

export const siteConfig = {
  ...personalSite,
  locale: currentLocale,
  htmlLang: localeSite.htmlLang,
  ogLocale: localeSite.ogLocale,
  ogAlternateLocale: localeSite.ogAlternateLocale,
  title: localeSite.title,
  description: localeSite.description,
  url: localeSite.url,
  hostname: localeSite.hostname,
  alternate: {
    url: alternateSite.url,
  },
} as const;
