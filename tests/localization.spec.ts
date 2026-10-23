import { expect, test } from '@playwright/test';
import { mapSiteOrigin, mockExternalRequests } from './helpers/network';

const isEnglish = process.env.PLAYWRIGHT_SITE_LOCALE === 'en';
const expected = isEnglish
  ? {
      alternateHref: 'https://jackyw.cn/',
      alternateHreflang: 'zh-CN',
      canonical: 'https://jackyw.uk/',
      description:
        'Jackywhq’s personal website. An industrial design student sharing photographs and a closer look at everyday objects, city streets, and travels.',
      htmlLang: 'en',
      headingParts: ['Hello,', 'I’m Jacky.'],
      ogAlternateLocale: 'zh_CN',
      ogLocale: 'en_GB',
      robotsSitemap: 'https://jackyw.uk/sitemap-index.xml',
      socialImage: 'https://jackyw.uk/apple-touch-icon.png',
      socialImageAlt: 'Jackywhq personal homepage icon',
      title: 'Jackywhq | Personal Website',
    }
  : {
      alternateHref: 'https://jackyw.uk/',
      alternateHreflang: 'en',
      canonical: 'https://jackyw.cn/',
      description:
        'Jackywhq 的个人主页。正在学习工业设计，关注物品与空间的日常体验，用摄影记录街头与旅途中值得多看一眼的细节。',
      htmlLang: 'zh-CN',
      headingParts: ['Hello,', 'I’m Jacky.'],
      ogAlternateLocale: 'en_GB',
      ogLocale: 'zh_CN',
      robotsSitemap: 'https://jackyw.cn/sitemap-index.xml',
      socialImage: 'https://jackyw.cn/apple-touch-icon.png',
      socialImageAlt: 'Jackywhq 个人主页图标',
      title: 'Jackywhq | 个人主页',
    };

test.beforeEach(async ({ context }) => {
  await mockExternalRequests(context);
});

test('uses matching numbered headers for About and Photography', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-photo-story]')).toHaveAttribute('data-visible-count', /^\d+$/);

  const headers = page.locator('.about-heading, .recent .section-heading');
  await expect(headers).toHaveCount(2);
  await expect(headers.locator(':scope > .section-eyebrow')).toHaveText([
    '02 / About',
    '03 / Photography',
  ]);
  await expect(headers.locator(':scope > .section-eyebrow > span[lang="en"]')).toHaveText([
    'About',
    'Photography',
  ]);
  await expect(headers.locator(':scope > .section-eyebrow + h2')).toHaveCount(2);

  const geometry = await headers.evaluateAll((elements) => elements.map((element) => {
    const label = element.querySelector<HTMLElement>('.section-eyebrow')!;
    const title = element.querySelector<HTMLElement>('h2')!;
    const headerRect = element.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const recipe = (target: Element) => {
      const style = getComputedStyle(target);
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
      };
    };
    return {
      labelRecipe: recipe(label),
      titleRecipe: recipe(title),
      labelLeftInset: labelRect.left - headerRect.left,
      titleLeftInset: titleRect.left - headerRect.left,
      labelToTitle: titleRect.top - labelRect.bottom,
      titleToRule: headerRect.bottom - titleRect.bottom,
      titleOverflow: titleRect.right - headerRect.right,
      ruleWidth: getComputedStyle(element).borderBottomWidth,
      ruleStyle: getComputedStyle(element).borderBottomStyle,
    };
  }));

  expect(geometry[1].labelRecipe).toEqual(geometry[0].labelRecipe);
  expect(geometry[1].titleRecipe).toEqual(geometry[0].titleRecipe);
  for (const header of geometry) {
    expect(Math.abs(header.labelLeftInset)).toBeLessThanOrEqual(1);
    expect(Math.abs(header.titleLeftInset)).toBeLessThanOrEqual(1);
    expect(header.labelToTitle).toBeGreaterThan(0);
    expect(header.titleToRule).toBeGreaterThan(0);
    expect(header.titleOverflow).toBeLessThanOrEqual(1);
    expect(header.ruleWidth).toBe('1px');
    expect(header.ruleStyle).toBe('solid');
  }
});

test('keeps photography metadata and its archive action compact without an introduction', { tag: '@once' }, async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 821, height: 1024 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/#photography');
    await page.evaluate(() => document.fonts.ready);
    const story = page.locator('[data-photo-story]');
    await expect(story).toHaveAttribute('data-photo-mode', viewport.width <= 820 ? 'mobile' : 'desktop');
    await expect(story).toHaveAttribute('data-visible-count', /^\d+$/);
    const geometry = await story.evaluate((element) => {
      const get = (selector: string) => element.querySelector<HTMLElement>(selector)!;
      const intro = get('.recent-intro').getBoundingClientRect();
      const meta = get('[data-photo-selection-meta]').getBoundingClientRect();
      const archive = get('.photo-archive-link');
      const archiveRect = archive.getBoundingClientRect();
      const label = get('.photo-archive-primary').getBoundingClientRect();
      const arrow = get('.photo-archive-link svg').getBoundingClientRect();
      const picture = get('[data-photo-item]:not([hidden]) picture').getBoundingClientRect();
      return {
        introHeight: intro.height,
        centerDifference: Math.abs((meta.top + meta.bottom - label.top - label.bottom) / 2),
        arrowGap: arrow.left - label.right,
        archiveHeight: archiveRect.height,
        stageBorder: getComputedStyle(get('.photo-stage')).borderTopWidth,
        archiveBorder: getComputedStyle(archive).borderBottomWidth,
        metaToPicture: picture.top - meta.bottom,
        archiveAfterStage: archive.previousElementSibling?.matches('[data-photo-stage]'),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

    expect(geometry.stageBorder).toBe('0px');
    expect(geometry.archiveBorder).toBe('0px');
    expect(geometry.archiveHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.overflow).toBe(0);
    if (viewport.width > 820) {
      expect(geometry.introHeight).toBeLessThanOrEqual(68);
      expect(geometry.centerDifference).toBeLessThanOrEqual(1);
      expect(geometry.arrowGap).toBeGreaterThanOrEqual(12);
      expect(geometry.arrowGap).toBeLessThanOrEqual(20);
    } else {
      expect(geometry.introHeight).toBeLessThanOrEqual(48);
      expect(geometry.metaToPicture).toBeGreaterThanOrEqual(16);
      expect(geometry.metaToPicture).toBeLessThanOrEqual(26);
      expect(geometry.archiveAfterStage).toBe(true);
    }
  }
});

test('preserves visible spacing and alignment in footer build metadata', { tag: '@once' }, async ({ page }) => {
  for (const width of [1280, 627, 513]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#photography');
    await page.evaluate(() => document.fonts.ready);

    const buildLink = page.locator('.footer-build-link');
    await expect(buildLink).toBeVisible();
    const geometry = await buildLink.evaluate((element) => {
      const date = element.querySelector('time')!;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      const label = nodes.find((node) => !date.contains(node) && node.data.trim())!;
      const commit = nodes.find((node) => node.data.includes('('))!;
      const characterRect = (node: Text, offset: number) => {
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        return range.getBoundingClientRect();
      };
      const labelEnd = characterRect(label, label.data.trimEnd().length - 1);
      const commitStart = characterRect(commit, commit.data.indexOf('('));
      const dateRect = date.getBoundingClientRect();
      return {
        labelGap: dateRect.left - labelEnd.right,
        commitGap: commitStart.left - dateRect.right,
        labelBottom: labelEnd.bottom,
        dateBottom: dateRect.bottom,
        commitBottom: commitStart.bottom,
        linkHeight: element.getBoundingClientRect().height,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

    if (isEnglish) expect(geometry.labelGap).toBeGreaterThan(3);
    else expect(Math.abs(geometry.labelGap)).toBeLessThan(1);
    expect(geometry.commitGap).toBeGreaterThan(3);
    expect(Math.abs(geometry.labelBottom - geometry.dateBottom)).toBeLessThan(1);
    expect(Math.abs(geometry.commitBottom - geometry.dateBottom)).toBeLessThan(1);
    expect(geometry.linkHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.overflow).toBe(0);
  }

  await page.setViewportSize({ width: 512, height: 844 });
  await expect(page.locator('.footer-build-link')).toBeHidden();
});

test('verifies analytics on simulated canonical and preview hosts', { tag: '@once' }, async ({
  page,
  baseURL,
}) => {
  const analyticsRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://www.googletagmanager.com/')) {
      analyticsRequests.push(request.url());
    }
  });

  for (const [origin, expectedRequests] of [
    [new URL(expected.canonical).origin, 1],
    ['https://preview.home.test', 0],
  ] as const) {
    await mapSiteOrigin(page, baseURL!, origin);
    analyticsRequests.length = 0;
    await page.goto(`${origin}/`);
    expect(analyticsRequests).toHaveLength(expectedRequests);
  }
});

test('opens the authored photo archive URL with analytics blocked', async ({
  page,
  context,
  baseURL,
  isMobile,
}) => {
  // This offline test covers the authored link, not remote GA cross-domain settings.
  const origin = new URL(expected.canonical).origin;
  await mapSiteOrigin(page, baseURL!, origin);
  await context.route(/^https:\/\/photo\.jackyw\.cn\/(?:[?#].*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Photography</title>',
    }),
  );
  await page.goto(`${origin}/#photography`);
  const originalURL = page.url();
  const archiveLink = page.locator('.photo-archive-link');

  for (const activation of ['pointer', 'keyboard']) {
    const [archive] = await Promise.all([
      page.waitForEvent('popup'),
      activation === 'keyboard'
        ? archiveLink.press('Enter')
        : isMobile ? archiveLink.tap() : archiveLink.click(),
    ]);
    await expect(archive).toHaveURL('https://photo.jackyw.cn/');
    expect(page.url()).toBe(originalURL);
    await archive.close();
  }
});

test('keeps About contact links separate from the scroll cue on short landscape screens', { tag: '@once' }, async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 360 },
    { width: 844, height: 390 },
    { width: 1024, height: 460 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    if (viewport.height <= 480) {
      await expect.poll(() => page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        const avatar = document.querySelector('.avatar-frame')!.getBoundingClientRect();
        // Halfway between the documented reveal start (99%) and end (50.5%).
        window.scrollTo(0, window.scrollY + avatar.bottom - window.innerHeight * 0.7475);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        return Number.parseFloat(
          document.querySelector<HTMLElement>('#about')!.style.getPropertyValue('--about-progress'),
        );
      })).toBeCloseTo(50, 0);
    }

    // Observe actual click targets without opening social sites or the mail app.
    await page.evaluate(() => {
      document.addEventListener('click', (event) => {
        const link = event.target instanceof Element ? event.target.closest('a') : null;
        if (!link) return;
        event.preventDefault();
        document.documentElement.dataset.testClickedHref = link.getAttribute('href') ?? '';
      }, { capture: true });
    });

    const links = page.locator('.about-contact-links a');
    await expect(links).toHaveCount(3);
    for (const link of await links.all()) {
      await link.scrollIntoViewIfNeeded();
      const geometry = await link.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const cue = document.querySelector('.about-scroll-hint')!.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        return {
          x,
          y,
          bottom: rect.bottom,
          cueTop: cue.top,
          receivesClick: element.contains(document.elementFromPoint(x, y)),
        };
      });
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.cueTop);
      expect(geometry.receivesClick).toBe(true);
      await page.mouse.click(geometry.x, geometry.y);
      await expect(page.locator('html')).toHaveAttribute(
        'data-test-clicked-href',
        (await link.getAttribute('href'))!,
      );
    }

    const cue = page.locator('.about-scroll-hint');
    await cue.click();
    await expect(page.locator('html')).toHaveAttribute('data-test-clicked-href', '#photography');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  }
});

test('emits self-canonical localized metadata and reciprocal alternates', { tag: '@once' }, async ({
  page,
  request,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', expected.htmlLang);
  await expect(page).toHaveTitle(expected.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    expected.description,
  );
  await expect(page.locator('meta[name="author"]')).toHaveAttribute('content', 'Jackywhq');
  await expect(page.locator('meta[name="keywords"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    expected.canonical,
  );
  await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]')).toHaveAttribute(
    'href',
    'https://jackyw.cn/',
  );
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    'href',
    'https://jackyw.uk/',
  );
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
    'href',
    'https://jackyw.cn/',
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    'content',
    expected.ogLocale,
  );
  await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveAttribute(
    'content',
    expected.ogAlternateLocale,
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    'content',
    'Jackywhq',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    expected.title,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    expected.description,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    expected.canonical,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    expected.socialImage,
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    expected.socialImageAlt,
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    expected.title,
  );
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
    'content',
    expected.description,
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    expected.socialImage,
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    'content',
    expected.socialImageAlt,
  );

  const structuredData = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  );
  const graph = structuredData['@graph'] as Array<Record<string, unknown>>;
  const websiteSchema = graph.find((node) => node['@type'] === 'WebSite');
  const profilePageSchema = graph.find((node) => node['@type'] === 'ProfilePage');
  const personSchema = graph.find((node) => node['@type'] === 'Person');

  expect(websiteSchema?.name).toBe('Jackywhq');
  expect(websiteSchema?.description).toBe(expected.description);
  expect(websiteSchema?.url).toBe(expected.canonical.slice(0, -1));
  expect(websiteSchema?.inLanguage).toBe(expected.htmlLang);
  expect(profilePageSchema?.name).toBe(expected.title);
  expect(profilePageSchema?.description).toBe(expected.description);
  expect(profilePageSchema?.url).toBe(expected.canonical);
  expect(profilePageSchema?.inLanguage).toBe(expected.htmlLang);
  expect((profilePageSchema?.mainEntity as Record<string, unknown>)['@id']).toBe(
    personSchema?.['@id'],
  );
  expect(personSchema?.name).toBe('Jackywhq');
  expect(personSchema?.url).toBe(expected.canonical.slice(0, -1));
  expect(personSchema?.sameAs).toContain(expected.alternateHref.slice(0, -1));

  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${expected.robotsSitemap}`);

  const sitemapIndex = await request.get('/sitemap-index.xml');
  expect(sitemapIndex.ok()).toBe(true);
  expect(await sitemapIndex.text()).toContain(expected.canonical.slice(0, -1));
});

test('keeps the Chinese site bilingual and the English site English-only', async ({ page }) => {
  await page.goto('/');

  const scrollCues = page.locator('.scroll-cue');
  await expect(scrollCues).toHaveCount(2);
  for (const cue of await scrollCues.all()) {
    const geometry = await cue.evaluate((element) => {
      const arrow = element.querySelector('svg')!.getBoundingClientRect();
      const label = element.querySelector(':scope > span')!.getBoundingClientRect();
      return {
        leftInset: arrow.left - element.getBoundingClientRect().left,
        gap: label.left - arrow.right,
      };
    });
    expect(Math.abs(geometry.leftInset)).toBeLessThanOrEqual(1);
    expect(geometry.gap).toBeCloseTo(12, 0);
  }

  await expect(page.locator('.welcome h1 > span:not(.welcome-subtitle)')).toHaveText(
    expected.headingParts,
  );
  await expect(page.locator('.welcome-note')).toHaveCount(0);
  await expect(page.locator('.section-index')).toHaveCount(0);
  await expect(page.locator('.recent-intro-copy > p[lang]')).toHaveCount(0);
  await expect(page.locator('.recent-intro-primary, .recent-intro-en, .recent-intro-zh')).toHaveCount(0);
  await expect(page.locator('[data-photo-stage]')).toHaveAttribute('data-nosnippet', '');
  await expect(page.locator('[data-photo-item] img[alt]')).toHaveCount(30);
  const story = page.locator('[data-photo-story]');
  await expect(story).toHaveAttribute('data-visible-count', /^\d+$/);
  const visibleCount = Number(await story.getAttribute('data-visible-count'));
  const isMobile = (page.viewportSize()?.width ?? 0) <= 820;
  await expect(story.locator('[data-photo-item]:visible')).toHaveCount(visibleCount);
  expect(visibleCount).toBeGreaterThan(0);
  expect(visibleCount).toBeLessThanOrEqual(30);
  if (isMobile) expect(visibleCount).toBe(10);
  const englishSelection = `Through my lens · ${visibleCount} photographs`;
  const englishStatus = isMobile
    ? `Swipe left or right to browse ${visibleCount} photographs.`
    : `Showing ${visibleCount} photographs.`;
  await expect(story.locator('[data-photo-pool]')).toHaveAttribute(
    'aria-label',
    isEnglish ? englishSelection : `镜头所见 · ${visibleCount} 张相片`,
  );

  const languageSwitch = page.locator('.language-switch');
  const navigation = page.locator('[data-site-nav]');
  await expect(page.locator('[data-site-header] > .language-switch')).toHaveCount(1);
  await expect(navigation.locator('.language-switch')).toHaveCount(0);
  await expect(languageSwitch).toHaveAttribute('href', expected.alternateHref);
  await expect(languageSwitch).toHaveAttribute('hreflang', expected.alternateHreflang);
  await expect(languageSwitch).not.toHaveAttribute('target');
  await expect(page.locator('[data-photo-selection-meta] > svg')).toHaveAttribute(
    'data-icon',
    'ph:arrow-right',
  );
  await expect(page.locator('svg[data-icon="ph:arrows-horizontal"]')).toHaveCount(0);

  if (isMobile) {
    const languageSwitchBox = await languageSwitch.boundingBox();
    expect(languageSwitchBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(languageSwitchBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(languageSwitch).toBeVisible();
    await page.locator('[data-menu-toggle]').click();
    await expect(navigation).toBeVisible();
    await expect(navigation.locator('a[href^="#"]')).toHaveCount(3);
    await expect(languageSwitch).toBeVisible();
    await expect(page.locator('[data-photo-selection-meta] > svg')).toBeVisible();
    await page.locator('[data-menu-toggle]').click();
  }
  const githubContact = page.locator('.about-contact a[href^="https://github.com/"]');
  await expect(githubContact.locator(':scope > span')).toHaveText(['GitHub', '@jackyhq']);

  if (isEnglish) {
    await expect(page.locator('main [lang="zh-CN"]')).toHaveCount(0);
    await expect(languageSwitch).toHaveText(/Chinese/);
    await expect(languageSwitch).toHaveAttribute('lang', 'en');
    await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('data-menu-label', 'Menu');
    await expect(page.locator('[data-menu-toggle]')).toHaveAttribute(
      'data-menu-close-label',
      'Close menu',
    );
    await expect(page.locator('.primary-nav a[href^="#"] .nav-item-label')).toHaveText([
      'Home',
      'About',
      'Photography',
    ]);
    await expect(page.locator('.primary-nav .nav-item-zh')).toHaveCount(0);
    await expect(page.locator('.primary-nav .nav-item-en')).toHaveCount(0);
    await expect(page.locator('.primary-nav a[href^="#"] .nav-item-copy > span[lang]')).toHaveCount(
      3,
    );
    await expect(page.locator('.welcome-subtitle > span[lang="en"]')).toHaveText(
      'A closer look at the everyday.',
    );
    await expect(page.locator('#home > .scroll-cue > span > span[lang]')).toHaveText([
      'More about me',
    ]);
    await expect(page.locator('.about-scroll-hint > span > span[lang]')).toHaveText([
      'See my photographs',
    ]);
    await expect(page.locator('#about-title > .about-title-primary[lang="en"]')).toHaveText(
      'About me',
    );
    await expect(page.locator('#about-title .about-title-secondary')).toHaveCount(0);
    await expect(page.locator('.about-pair')).toHaveCount(2);
    await expect(page.locator('.about-pair > p[lang="en"]')).toHaveCount(2);
    await expect(page.locator('.about-pair > p[lang="zh-CN"]')).toHaveCount(0);
    await expect(page.locator('.about-pair-en')).toHaveCount(0);
    await expect(page.locator('.about-pair-zh')).toHaveCount(0);
    await expect(page.locator('.about-pair > p[lang="en"]')).toHaveText([
      'I’m Jacky, an industrial design student. I’m curious about what makes everyday objects intuitive to use, and how spaces make us feel.',
      'Photography takes that curiosity into city streets and places I visit. I look for light, form, and small details worth a second glance.',
    ]);
    await expect(page.locator('.about-contact > p > span[lang]')).toHaveText(['Contact']);
    await expect(page.locator('#recent-title > .recent-title-primary[lang="en"]')).toHaveText(
      'Photographs',
    );
    await expect(page.locator('#recent-title .recent-title-secondary')).toHaveCount(0);
    await expect(page.locator('.photo-title-primary[lang="en"]')).toHaveCount(30);
    await expect(page.locator('.photo-title-secondary')).toHaveCount(0);
    await expect(page.locator('.photo-title-primary').first()).toHaveCSS('font-weight', '520');
    await expect(page.locator('.photo-title > span[lang="en"]')).toHaveCount(30);
    await expect(page.locator('.photo-title > span[lang="zh-CN"]')).toHaveCount(0);
    await expect(page.locator('[data-photo-index="0"] .photo-title')).toHaveText('Curving Steps');
    await expect(page.locator('[data-photo-index="0"] img')).toHaveAttribute('alt', /^Photographed/);
    await expect(page.locator('[data-photo-selection-en]')).toHaveText(englishSelection);
    await expect(page.locator('[data-photo-selection-zh]')).toHaveCount(0);
    await expect(page.locator('[data-photo-selection-meta] > span[lang]')).toHaveCount(1);
    await expect(page.locator('[data-photo-status] span[lang="en"]')).toHaveText(englishStatus);
    await expect(page.locator('[data-photo-status] span[lang="zh-CN"]')).toHaveCount(0);
    const archiveLink = page.locator('.photo-archive-link');
    const archivePrimary = archiveLink.locator('.photo-archive-primary[lang="en"]');
    await expect(archiveLink).toBeVisible();
    await expect(archivePrimary).toHaveText('Explore the photo archive');
    await expect(archiveLink.locator('.photo-archive-copy > span[lang]')).toHaveCount(1);
    await expect(archiveLink.locator('.photo-archive-secondary')).toHaveCount(0);
    if (isMobile) {
      expect(
        await archiveLink.evaluate((element) => getComputedStyle(element).gridTemplateAreas),
      ).toContain('archive-primary archive-icon');
    } else {
      await expect(archivePrimary).toHaveCSS('text-decoration-line', 'none');
      await archiveLink.hover();
      await expect(archivePrimary).toHaveCSS('text-decoration-line', 'underline');
    }
    await expect(page.locator('.icp-record')).toHaveCount(0);
    await expect(page.locator('.footer-build-link')).toHaveText(
      /^Built on \d{1,2} [A-Za-z]{3,4} \d{4} \([0-9a-f]{6}\)$/,
    );
  } else {
    await expect(page.locator('[data-menu-toggle]')).toHaveAttribute(
      'data-menu-label',
      '菜单',
    );
    await expect(page.locator('[data-menu-toggle]')).toHaveAttribute(
      'data-menu-close-label',
      '关闭菜单',
    );
    await expect(page.locator('.welcome-kicker > span[lang]')).toHaveText(['欢迎', 'Welcome']);
    await expect(page.locator('.welcome-subtitle > span[lang]')).toHaveText([
      '日常，值得多看一眼。',
      'A closer look at the everyday.',
    ]);
    await expect(page.locator('#home > .scroll-cue > span > span[lang]')).toHaveText([
      '了解我',
    ]);
    await expect(page.locator('#home > .scroll-cue [lang="en"]')).toHaveCount(0);
    await expect(page.locator('#about-title [lang]')).toHaveText(['About me', '关于我']);
    await expect(page.locator('#about-title > .about-title-primary[lang="en"]')).toHaveText(
      'About me',
    );
    await expect(page.locator('#about-title .about-title-secondary[lang="zh-CN"]')).toHaveText(
      '关于我',
    );
    await expect(page.locator('.primary-nav .nav-item-zh')).toHaveText(['首页', '关于', '相片']);
    await expect(page.locator('.primary-nav .nav-item-en')).toHaveCount(0);
    await expect(page.locator('.primary-nav a[href^="#"] .nav-item-copy > span[lang]')).toHaveCount(
      3,
    );
    await expect(page.locator('.about-pair')).toHaveCount(2);
    await expect(page.locator('.about-pair > p')).toHaveCount(2);
    await expect(page.locator('.about-pair-en')).toHaveCount(0);
    await expect(page.locator('.about-pair-zh')).toHaveCount(2);
    expect(
      await page.locator('.about-pair > p[lang]').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('lang')),
      ),
    ).toEqual(['zh-CN', 'zh-CN']);
    await expect(page.locator('.about-pair > p[lang="zh-CN"]')).toHaveText([
      '我是 Jacky，正在学习工业设计。我好奇怎样让物品用得顺手，也关心空间如何影响人的感受。',
      '摄影把这份好奇带向街头与旅途。我记录光影与形态，也留意那些匆忙间容易错过、却值得多看一眼的细节。',
    ]);
    await expect(page.locator('.about-contact > p > span[lang]')).toHaveText([
      '联系方式',
      'Contact',
    ]);
    await expect(page.locator('.about-scroll-hint > span > span[lang]')).toHaveText(['看看我的相片']);
    await expect(page.locator('.about-scroll-hint [lang="en"]')).toHaveCount(0);
    await expect(page.locator('#recent-title [lang]')).toHaveText(['Photographs', '相片']);
    await expect(page.locator('#recent-title > .recent-title-primary[lang="en"]')).toHaveText(
      'Photographs',
    );
    await expect(page.locator('#recent-title .recent-title-secondary[lang="zh-CN"]')).toHaveText(
      '相片',
    );
    await expect(page.locator('.photo-title-primary[lang="zh-CN"]')).toHaveCount(30);
    await expect(page.locator('.photo-title-secondary')).toHaveCount(0);
    await expect(page.locator('.photo-title > span')).toHaveCount(30);
    await expect(page.locator('.photo-title > span[lang="zh-CN"]')).toHaveCount(30);
    await expect(page.locator('.photo-title > span[lang="en"]')).toHaveCount(0);
    await expect(
      page.locator('[data-photo-index="0"] .photo-title > span[lang="zh-CN"]'),
    ).toHaveText('弧形阶梯');
    await expect(
      page.locator('[data-photo-index="0"] .photo-title > span[lang="en"]'),
    ).toHaveCount(0);
    await expect(page.locator('[data-photo-index="0"] img')).toHaveAttribute('alt', /^拍摄于/);
    await expect(page.locator('[data-photo-selection-en]')).toHaveCount(0);
    await expect(page.locator('[data-photo-selection-zh]')).toHaveText(
      `镜头所见 · ${visibleCount} 张相片`,
    );
    expect(
      await page.locator('[data-photo-selection-meta] > span[lang]').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('lang')),
      ),
    ).toEqual(['zh-CN']);
    await expect(page.locator('[data-photo-status] span[lang="en"]')).toHaveText(englishStatus);
    await expect(page.locator('[data-photo-status] span[lang="zh-CN"]')).toHaveText(
      isMobile
        ? `左右滑动浏览 ${visibleCount} 张相片。`
        : `当前展示 ${visibleCount} 张相片。`,
    );
    expect(
      await page.locator('[data-photo-status] > span[lang]').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('lang')),
      ),
    ).toEqual(['zh-CN', 'en']);
    if (isMobile) {
      const archiveAreas = await page
        .locator('.photo-archive-link')
        .evaluate((element) => getComputedStyle(element).gridTemplateAreas);
      expect(archiveAreas).toContain('archive-primary archive-icon');
    }
    await expect(
      page.locator('.photo-archive-copy > span').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('lang')),
      ),
    ).resolves.toEqual(['zh-CN']);
    await expect(page.locator('.photo-archive-primary[lang="zh-CN"]')).toHaveText(
      '浏览摄影档案',
    );
    await expect(page.locator('.photo-archive-secondary')).toHaveCount(0);
    await expect(page.locator('.photo-archive-link [lang="en"]')).toHaveCount(0);
    await expect(page.locator('.icp-record')).toHaveText('粤ICP备2025447157号');
    await expect(page.locator('.footer-build-link')).toHaveText(
      /^构建于\d{4}年\d{1,2}月\d{1,2}日 \([0-9a-f]{6}\)$/,
    );
  }
});
