import { localizedContent } from './content';
import { currentLocale } from './config';

export {
  alternateLocale,
  alternateSite,
  currentLocale,
  isEnglish,
  languageSwitchUrl,
  localeSite,
  localeSites,
  resolveSiteLocale,
  supportedLocales,
} from './config';
export type { LocaleSiteConfig, SiteLocale } from './config';
export { localizedContent } from './content';
export type { SiteContent } from './content';

export const siteContent = localizedContent[currentLocale];
