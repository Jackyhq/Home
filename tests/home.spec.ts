import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockExternalRequests } from './helpers/network';

const alignPhotographyToViewport = async (page: Page) => {
  const story = page.locator('[data-photo-story]');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const previousScrollBehavior = await page.evaluate(() => {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    return previous;
  });
  await expect
    .poll(() =>
      story.evaluate((element) => {
        const top = element.getBoundingClientRect().top;
        if (Math.abs(top) >= 1) window.scrollBy(0, top);
        return Math.abs(element.getBoundingClientRect().top);
      }),
    )
    .toBeLessThan(1);
  await page.evaluate((previous) => {
    document.documentElement.style.scrollBehavior = previous;
  }, previousScrollBehavior);

  const viewport = page.viewportSize();
  if (viewport) {
    await expect(story).toHaveAttribute(
      'data-photo-mode',
      viewport.width <= 820 ? 'mobile' : 'desktop',
    );
  }
};

test.beforeEach(async ({ context }) => {
  await mockExternalRequests(context);
});

test('loads analytics only when visiting the canonical hostname', { tag: '@once' }, async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://www.googletagmanager.com/')) {
      analyticsRequests.push(request.url());
    }
  });

  await page.goto('/');
  expect(analyticsRequests).toHaveLength(new URL(page.url()).hostname === 'jackyw.cn' ? 1 : 0);
});

test('renders the homepage and primary links', async ({ page }) => {
  await page.goto('/');

  const expectedDescription =
    'Jackywhq 的个人主页。正在学习工业设计，关注物品与空间的日常体验，用摄影记录街头与旅途中值得多看一眼的细节。';

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page).toHaveTitle('Jackywhq | 个人主页');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    expectedDescription,
  );
  await expect(page.locator('meta[name="keywords"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    expectedDescription,
  );
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
    'content',
    expectedDescription,
  );
  const structuredData = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  );
  const personSchema = structuredData['@graph'].find(
    (node: Record<string, unknown>) => node['@type'] === 'Person',
  );
  expect(personSchema.alternateName).toEqual([
    'Jacky',
    'Jackyw',
    'Wang Haoquan',
    'wanghaoquan',
    'Haoquan',
  ]);

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Jacky.');
  await expect(page.getByRole('link', { name: /了解我/ })).toHaveAttribute('href', '#about');
  const heroWave = page.locator('.hero-pixel-wave');
  const heroCanvas = heroWave.locator('.hero-pixel-wave__canvas');
  await expect(heroWave).toHaveCount(1);
  await expect(heroWave).toHaveAttribute('aria-hidden', 'true');
  await expect(heroWave).toHaveAttribute('data-renderer', /^(webgl2|canvas2d)$/);
  expect(await heroWave.getAttribute('data-pointer-effect')).toBeNull();
  await expect(heroWave).toHaveCSS('pointer-events', 'none');
  await expect(heroCanvas).toHaveCount(1);
  await expect(heroCanvas).toHaveCSS('pointer-events', 'none');
  expect(await heroWave.evaluate((element) => element.tabIndex)).toBe(-1);
  expect(await heroCanvas.evaluate((element) => element.tabIndex)).toBe(-1);
  await expect(page.locator('#about')).toBeVisible();
  await expect(page.locator('#about img')).toHaveCount(2);
  await expect(page.locator('#about img').first()).toHaveAttribute('src', /avatar-monochrome/);
  await expect(page.locator('.welcome h1 > span:not(.welcome-subtitle)')).toHaveText([
    'Hello,',
    'I’m Jacky.',
  ]);
  await expect(page.locator('.welcome-kicker > span[lang]')).toHaveText(['欢迎', 'Welcome']);
  await expect(page.locator('.welcome-subtitle > span[lang]')).toHaveText([
    '日常，值得多看一眼。',
    'A closer look at the everyday.',
  ]);
  await expect(page.locator('.welcome-subtitle > span[lang="en"]')).toHaveText(
    'A closer look at the everyday.',
  );
  await expect(page.locator('.welcome-subtitle > span[lang="zh-CN"]')).toHaveText(
    '日常，值得多看一眼。',
  );
  await expect(page.locator('.welcome-note')).toHaveCount(0);
  await expect(page.locator('#home > .scroll-cue > span > span[lang]')).toHaveText([
    '了解我',
  ]);
  await expect(page.locator('#home > .scroll-cue [lang="en"]')).toHaveCount(0);
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute(
    'data-menu-label',
    '菜单',
  );
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute(
    'data-menu-close-label',
    '关闭菜单',
  );
  await expect(page.locator('#about-title [lang]')).toHaveText(['About me', '关于我']);
  await expect(page.locator('#about-title > .about-title-primary[lang="en"]')).toHaveText(
    'About me',
  );
  await expect(page.locator('#about-title .about-title-secondary[lang="zh-CN"]')).toHaveText(
    '关于我',
  );
  await expect(page.locator('.about-pair')).toHaveCount(2);
  await expect(page.locator('.about-pair > p')).toHaveCount(2);
  await expect(page.locator('.about-pair-en')).toHaveCount(0);
  await expect(page.locator('.about-pair-zh')).toHaveCount(2);
  await expect(page.locator('.about-pair > p[lang="zh-CN"]')).toHaveText([
    '我是 Jacky，正在学习工业设计。我好奇怎样让物品用得顺手，也关心空间如何影响人的感受。',
    '摄影把这份好奇带向街头与旅途。我记录光影与形态，也留意那些匆忙间容易错过、却值得多看一眼的细节。',
  ]);
  await expect(page.locator('.about-pair > p[lang="en"]')).toHaveCount(0);
  await expect(page.locator('.about-contact > p > span[lang]')).toHaveText([
    '联系方式',
    'Contact',
  ]);
  await expect(page.locator('.about-scroll-hint > span > span[lang]')).toHaveText(['看看我的相片']);
  await expect(page.locator('.about-scroll-hint [lang="en"]')).toHaveCount(0);
  await expect(page.locator('.primary-nav .nav-item-zh')).toHaveText(['首页', '关于', '相片']);
  await expect(page.locator('.primary-nav .nav-item-en')).toHaveCount(0);
  await expect(page.locator('.primary-nav a[href^="#"] .nav-item-copy > span[lang]')).toHaveCount(
    3,
  );
  await expect(page.locator('.language-switch .nav-item-label')).toHaveText('English');
  await expect(page.locator('.language-switch')).toHaveAttribute('href', 'https://jackyw.uk/');
  await expect(page.locator('.language-switch')).toHaveAttribute('hreflang', 'en');
  await expect(page.locator('main [lang="en"]').first()).toBeVisible();
  await expect(page.locator('main [lang="zh-CN"]').first()).toBeVisible();
  await expect(page.locator('.primary-nav').getByRole('link', { name: 'GitHub' })).toHaveCount(0);
  await expect(page.locator('.site-footer').getByRole('link', { name: 'GitHub' })).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  const githubContact = page.locator('.about-contact a[href^="https://github.com/"]');
  await expect(githubContact).toHaveAttribute(
    'href',
    'https://github.com/Jackyhq',
  );
  await expect(githubContact.locator(':scope > span')).toHaveText(['GitHub', '@jackyhq']);
  await expect(page.locator('.about-contact').getByRole('link', { name: /Instagram/ })).toHaveAttribute(
    'href',
    'https://www.instagram.com/jackywhq/',
  );
  await expect(page.locator('.about-contact').getByRole('link', { name: /Email/ })).toHaveAttribute(
    'href',
    'mailto:i@jackyw.cn',
  );
  await expect(page.locator('.about-contact > p')).toContainText('Contact');
  await expect(page.locator('.about-contact > p')).toContainText('联系方式');
  await expect(page.locator('.site-footer > p')).toHaveText(/\s*©\s+\d{4}\s+Jackywhq\s*$/);
  await expect(
    page.locator('.site-footer').getByRole('link', { name: 'Jackywhq', exact: true }),
  ).toHaveAttribute('href', 'https://jackyw.cn/');
  await expect(page.locator('.icp-record')).toHaveText('粤ICP备2025447157号');
  await expect(page.locator('.icp-record')).toHaveAttribute('href', 'https://beian.miit.gov.cn/');
  const footerBuildLink = page.locator('.footer-build-link');
  await expect(footerBuildLink).toHaveText(
    /^构建于\d{4}年\d{1,2}月\d{1,2}日 \([0-9a-f]{6}\)$/,
  );
  await expect(footerBuildLink).toHaveAttribute(
    'href',
    /^https:\/\/github\.com\/Jackyhq\/Home\/commit\/[0-9a-f]{7,64}$/,
  );
  await expect(footerBuildLink.locator('time')).toHaveAttribute(
    'datetime',
    /^\d{4}-\d{2}-\d{2}$/,
  );
  await expect(page.locator('.photo-archive-link')).toHaveAttribute(
    'href',
    'https://photo.jackyw.cn',
  );
  await expect(page.locator('.photo-archive-link')).toBeVisible();
  await expect(page.locator('.photo-archive-copy > span[lang]')).toHaveText([
    '浏览摄影档案',
  ]);
  await expect(page.locator('.photo-archive-primary[lang="zh-CN"]')).toHaveCount(1);
  await expect(page.locator('.photo-archive-link [lang="en"]')).toHaveCount(0);
  await expect(page.locator('.photo-archive-secondary')).toHaveCount(0);
  await expect(page.locator('[data-photo-item]')).toHaveCount(30);
  await expect(page.locator('[data-photo-item] img[loading="lazy"]')).toHaveCount(30);
  await expect(page.locator('[data-photo-item] > a')).toHaveCount(30);
  await expect(page.locator('[data-photo-item] > a').first()).toHaveAttribute(
    'href',
    /^https:\/\/photo\.jackyw\.cn\/photos\//,
  );
  await expect(page.locator('.photo-title')).toHaveCount(30);
  await expect(page.locator('.photo-title > span')).toHaveCount(30);
  await expect(page.locator('.photo-title > span[lang="zh-CN"]')).toHaveCount(30);
  await expect(page.locator('.photo-title > span[lang="en"]')).toHaveCount(0);
  await expect(page.locator('.photo-title-secondary')).toHaveCount(0);
  await expect(page.locator('[data-photo-stage]')).toHaveAttribute('data-nosnippet', '');
  await expect(page.locator('[data-photo-stage] img[alt]')).toHaveCount(30);
  await expect(page.locator('#recent-title')).toContainText('Photographs');
  await expect(page.locator('#recent-title')).toContainText('相片');
  await expect(page.locator('#recent-title')).not.toContainText('/');
  await expect(page.locator('#recent-title [lang]')).toHaveText(['Photographs', '相片']);
  await expect(page.locator('#recent-title > .recent-title-primary[lang="en"]')).toHaveText(
    'Photographs',
  );
  await expect(page.locator('#recent-title .recent-title-secondary[lang="zh-CN"]')).toHaveText(
    '相片',
  );
  await expect(page.locator('.section-index')).toHaveCount(0);
  await expect(page.locator('.recent-intro-copy > p[lang]')).toHaveCount(0);
  await expect(page.locator('.photo-selection-meta > span[lang]')).toHaveText([
    /^镜头所见 · \d+ 张相片$/,
  ]);
  await expect(page.locator('[data-photo-selection-en]')).toHaveCount(0);
  await expect(page.locator('[data-photo-selection-zh]')).toHaveCount(1);
  await expect(page.locator('.recent-intro-primary, .recent-intro-en, .recent-intro-zh')).toHaveCount(0);
  const taipeiAlleyTitle = page.locator(
    'a[href$="/20260822035105/"] .photo-title > span[lang="zh-CN"]',
  );
  if (await taipeiAlleyTitle.count()) {
    await expect(taipeiAlleyTitle).toHaveText('信义巷里的台北101');
  }

  const jadeiteCabbageTitle = page.locator('a[href$="/20260819052221/"] .photo-title');
  if (await jadeiteCabbageTitle.count()) {
    await expect(jadeiteCabbageTitle.locator('span[lang="zh-CN"]')).toHaveText(
      '台北故宫里的翠玉白菜',
    );
    await expect(jadeiteCabbageTitle.locator('span[lang="en"]')).toHaveCount(0);
  }
});

test(
  'keeps size tokens and confirmed typography recipes consistent across responsive layouts',
  { tag: '@once' },
  async ({ page }) => {
    const viewports = [
      { width: 1440, height: 1100 },
      { width: 627, height: 849 },
      { width: 569, height: 812 },
      { width: 390, height: 844 },
      { width: 1024, height: 720 },
      { width: 1024, height: 460 },
    ];

    const expectFontSizes = async (
      selector: string,
      expectedCount: number,
      expectedSize: string,
    ) => {
      const locator = page.locator(selector);
      await expect(locator).toHaveCount(expectedCount);
      await expect
        .poll(() =>
          locator.evaluateAll((elements) =>
            elements.map((element) => getComputedStyle(element).fontSize),
          ),
        )
        .toEqual(Array(expectedCount).fill(expectedSize));
    };

    const expectSharedRecipe = async (selector: string, expectedCount: number) => {
      const locator = page.locator(selector);
      await expect(locator).toHaveCount(expectedCount);

      const recipes = await locator.evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);

          return {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
          };
        }),
      );

      expect(new Set(recipes.map((recipe) => JSON.stringify(recipe))).size).toBe(1);
    };

    const expectAlignedScrollCues = async () => {
      const cues = page.locator('.scroll-cue');
      await expect(cues).toHaveCount(2);

      const geometries = await cues.evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          const text = element.querySelector<HTMLElement>(':scope > span')!.getBoundingClientRect();
          const icon = element.querySelector<SVGElement>(':scope > svg')!.getBoundingClientRect();
          const style = getComputedStyle(element);

          return {
            alignItems: style.alignItems,
            display: style.display,
            justifyContent: style.justifyContent,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            textLeft: text.left,
            iconLeft: icon.left,
            iconRight: icon.right,
          };
        }),
      );

      expect(Math.abs(geometries[0].left - geometries[1].left)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometries[0].right - geometries[1].right)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometries[0].width - geometries[1].width)).toBeLessThanOrEqual(1);
      geometries.forEach((geometry) => {
        expect(geometry.display).toBe('flex');
        expect(geometry.alignItems).toBe('center');
        expect(geometry.justifyContent).toBe('flex-start');
        expect(Math.abs(geometry.iconLeft - geometry.left)).toBeLessThanOrEqual(1);
        expect(geometry.textLeft - geometry.iconRight).toBeCloseTo(12, 0);
      });

      const aboutContrast = await page.locator('#about .scroll-cue').evaluate((element) => {
        const parseRgb = (value: string) =>
          (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const luminance = (rgb: number[]) =>
          rgb
            .map((channel) => channel / 255)
            .map((channel) =>
              channel <= 0.04045
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4,
            )
            .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
        const foreground = luminance(parseRgb(getComputedStyle(element).color));
        const background = luminance(
          parseRgb(getComputedStyle(element.closest('.about-sticky')!).backgroundColor),
        );

        return (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05);
      });
      expect(aboutContrast).toBeGreaterThanOrEqual(4.5);
    };

    const expectDisplaySpacing = async (
      selector: string,
      expectedCount: number,
      expectedLetterSpacing: number,
      expectedLineHeight: number,
    ) => {
      const locator = page.locator(selector);
      await expect(locator).toHaveCount(expectedCount);

      const metrics = await locator.evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          const fontSize = Number.parseFloat(style.fontSize);

          return {
            letterSpacing: Number.parseFloat(style.letterSpacing) / fontSize,
            lineHeight: Number.parseFloat(style.lineHeight) / fontSize,
          };
        }),
      );

      metrics.forEach((metric) => {
        expect(metric.letterSpacing).toBeCloseTo(expectedLetterSpacing, 3);
        expect(metric.lineHeight).toBeCloseTo(expectedLineHeight, 3);
      });
    };

    for (const viewport of viewports) {
      await test.step(`${viewport.width} × ${viewport.height}`, async () => {
        await page.setViewportSize(viewport);
        await page.goto('/');

        await expectFontSizes('.about-pair-zh', 2, '20px');
        await expectFontSizes('.about-contact > p', 1, '20px');
        await expectFontSizes('.about-contact-links a > span:first-child', 3, '16px');
        await expectFontSizes('.about-contact-links a > span:last-child', 3, '12px');
        await expectFontSizes('.photo-selection-meta', 1, '10px');
        await expectFontSizes('.photo-archive-primary[lang="zh-CN"]', 1, '16px');
        await expectFontSizes('.scroll-cue', 2, '12px');

        await expectSharedRecipe('.about-heading h2, .section-heading h2', 2);
        await expectSharedRecipe('.about-title-primary, .recent-title-primary', 2);
        await expectSharedRecipe('.welcome-kicker, .section-eyebrow', 3);
        await expectSharedRecipe('.about-contact-links a > span:first-child', 3);
        await expectSharedRecipe('.about-contact-links a > span:last-child', 3);
        await expectSharedRecipe('.scroll-cue', 2);
        await expectAlignedScrollCues();

        await expectDisplaySpacing('.welcome h1', 1, -0.025, 0.92);
        await expectDisplaySpacing(
          '.about-heading h2, .section-heading h2',
          2,
          -0.02,
          0.94,
        );
      });
    }
  },
);

test('opens outbound web links in new tabs while keeping local links in place', { tag: '@once' }, async ({
  page,
}) => {
  await page.goto('/');

  const outboundLinks = page.locator('a[href^="https://"][target="_blank"]');
  const outboundAttributes = await outboundLinks.evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute('href'),
      target: link.getAttribute('target'),
      rel: link.getAttribute('rel')?.split(/\s+/).filter(Boolean) ?? [],
    })),
  );

  expect(outboundAttributes.length).toBeGreaterThan(0);
  outboundAttributes.forEach(({ href, target, rel }) => {
    expect(href).toMatch(/^https:\/\//);
    expect(target).toBe('_blank');
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  await expect(page.locator('.language-switch')).not.toHaveAttribute('target');
  await expect(page.locator('.site-footer > p a')).not.toHaveAttribute('target');

  for (const profileLink of [
    page.locator('.about-contact a[href^="https://github.com/"]'),
    page.locator('.about-contact a[href^="https://www.instagram.com/"]'),
  ]) {
    await expect(profileLink).toHaveAttribute('rel', /(?:^|\s)me(?:\s|$)/);
  }

  await page.context().route('https://photo.jackyw.cn/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Photography</title>',
    }),
  );
  const originalUrl = page.url();
  const [newTab] = await Promise.all([
    page.waitForEvent('popup'),
    page.locator('.photo-archive-link').click(),
  ]);
  await expect(newTab).toHaveURL('https://photo.jackyw.cn/');
  expect(page.url()).toBe(originalUrl);
  await newTab.close();

  const currentPageLinks = page.locator('a[href^="#"], a[href^="mailto:"]');
  const currentPageTargets = await currentPageLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute('target')),
  );
  expect(currentPageTargets.every((target) => target === null)).toBe(true);
});

test('shows Chinese navigation labels and an independent desktop language switch', { tag: '@desktop-only' }, async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');

  const navigation = page.locator('[data-site-nav]');
  const homeLink = navigation.locator('a[href="#top"]');
  const chineseLabels = navigation.locator('.nav-item-zh');
  const languageSwitch = page.locator('[data-site-header] > .language-switch');
  const languageSwitchLabel = languageSwitch.locator('.nav-item-label');

  await expect(navigation).toBeVisible();
  await expect(chineseLabels).toHaveText(['首页', '关于', '相片']);
  await expect(navigation.locator('.nav-item-en')).toHaveCount(0);
  await expect(navigation.locator('a[href^="#"] .nav-item-copy > span[lang]')).toHaveCount(3);
  await expect(navigation.locator('.language-switch')).toHaveCount(0);
  await expect(languageSwitch).toHaveCount(1);
  await expect(languageSwitchLabel).toHaveText('English');
  await expect(chineseLabels.first()).toBeVisible();
  await expect(languageSwitchLabel).toBeVisible();
  await expect(navigation.locator('.nav-divider')).toHaveCount(3);
  await expect(navigation.locator('.nav-divider').first()).toBeVisible();
  await expect(navigation.locator('.nav-item-index').first()).toBeHidden();
  await expect(navigation.locator('.nav-item-arrow').first()).toBeHidden();

  const geometry = await page.evaluate(() => {
    const headerRect = document.querySelector<HTMLElement>('[data-site-header]')!.getBoundingClientRect();
    const navRect = document.querySelector<HTMLElement>('[data-site-nav]')!.getBoundingClientRect();
    const languageSwitchRect = document
      .querySelector<HTMLElement>('[data-site-header] > .language-switch')!
      .getBoundingClientRect();
    const labels = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.nav-item-zh, .language-switch .nav-item-label',
      ),
    );
    return {
      headerRight: headerRect.right,
      navLeft: navRect.left,
      navRight: navRect.right,
      languageSwitchLeft: languageSwitchRect.left,
      languageSwitchRight: languageSwitchRect.right,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      labelWhiteSpace: labels.map((label) => getComputedStyle(label).whiteSpace),
    };
  });

  expect(geometry.navLeft).toBeGreaterThan(0);
  expect(geometry.navRight).toBeLessThanOrEqual(geometry.languageSwitchLeft + 1);
  expect(geometry.languageSwitchRight).toBeLessThanOrEqual(geometry.headerRight + 1);
  expect(geometry.scrollWidth).toBe(geometry.clientWidth);
  expect(geometry.labelWhiteSpace).toEqual(Array(4).fill('nowrap'));

  await homeLink.hover();
  await expect(homeLink.locator('.nav-item-zh')).toHaveCSS('text-decoration-line', 'underline');
});

test('opens a Chinese mobile menu and closes it through each interaction path', { tag: ['@once', '@smoke'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');

  const header = page.locator('[data-site-header]');
  const menuButton = page.locator('[data-menu-toggle]');
  const navigation = page.locator('[data-site-nav]');
  const languageSwitch = page.locator('[data-site-header] > .language-switch');
  const closedLabel = menuButton.locator('.menu-toggle-label--closed');
  const openLabel = menuButton.locator('.menu-toggle-label--open');
  const readOpenMenuCoverage = () =>
    page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-site-header]')!;
      const navigation = document.querySelector<HTMLElement>('[data-site-nav]')!;
      const headerRect = header.getBoundingClientRect();
      const navigationRect = navigation.getBoundingClientRect();

      return {
        headerLeft: headerRect.left,
        headerRight: headerRect.right,
        headerTop: headerRect.top,
        headerBottom: headerRect.bottom,
        headerBackground: getComputedStyle(header).backgroundColor,
        navigationLeft: navigationRect.left,
        navigationRight: navigationRect.right,
        navigationTop: navigationRect.top,
        navigationBackground: getComputedStyle(navigation).backgroundColor,
        navigationOpacity: getComputedStyle(navigation).opacity,
        viewportWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
  const expectFullWidthOpaqueCoverage = (coverage: Awaited<ReturnType<typeof readOpenMenuCoverage>>) => {
    expect(Math.abs(coverage.headerLeft)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coverage.headerRight - coverage.viewportWidth)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coverage.headerTop)).toBeLessThanOrEqual(0.5);
    expect(coverage.headerBackground).toBe('rgb(17, 26, 43)');
    expect(Math.abs(coverage.navigationLeft)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coverage.navigationRight - coverage.viewportWidth)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coverage.navigationTop - coverage.headerBottom)).toBeLessThanOrEqual(1);
    expect(coverage.navigationBackground).toBe('rgb(17, 26, 43)');
    expect(coverage.navigationOpacity).toBe('1');
    expect(coverage.scrollWidth).toBe(coverage.clientWidth);
  };
  const expectFullyClosed = async () => {
    await expect(header).not.toHaveAttribute('data-menu-open');
    await expect(header).not.toHaveAttribute('data-menu-closing');
    await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton).toHaveAttribute('aria-label', '菜单');
    await expect(navigation).toHaveAttribute('inert', '');
    await expect(navigation).toHaveCSS('visibility', 'hidden');
  };

  await expect(header).toHaveAttribute('data-menu-ready', '');
  await expect(header).not.toHaveAttribute('data-menu-open');
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-label', '菜单');
  await expect(closedLabel).toHaveText('菜单');
  await expect(openLabel).toHaveText('关闭菜单');
  await expect(menuButton.locator(':scope [lang="en"]')).toHaveCount(0);
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(closedLabel).toHaveCSS('opacity', '1');
  await expect(openLabel).toHaveCSS('opacity', '0');
  await expect(navigation).toHaveAttribute('inert', '');
  await expect(navigation).toHaveCSS('visibility', 'hidden');
  await expect(navigation.locator('.language-switch')).toHaveCount(0);
  await expect(languageSwitch).toBeVisible();
  await expect(languageSwitch.locator('.nav-item-label')).toHaveText('English');

  await menuButton.click();

  await expect(header).toHaveAttribute('data-menu-open', '');
  await expect(header).toHaveCSS('background-color', 'rgb(17, 26, 43)');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(menuButton).toHaveAttribute('aria-label', '关闭菜单');
  await expect(closedLabel).toHaveCSS('opacity', '0');
  await expect(openLabel).toHaveCSS('opacity', '1');
  await expect(navigation).not.toHaveAttribute('inert');
  await expect(navigation).toHaveCSS('visibility', 'visible');
  await expect(navigation).toHaveCSS('opacity', '1');
  await expect(navigation.locator('.nav-item-zh')).toHaveText(['首页', '关于', '相片']);
  await expect(navigation.locator('.nav-item-en')).toHaveCount(0);
  await expect(navigation.locator('a[href^="#"] .nav-item-copy > span[lang]')).toHaveCount(3);
  await expect(navigation.locator('.language-switch')).toHaveCount(0);
  await expect(languageSwitch).toBeVisible();

  expectFullWidthOpaqueCoverage(await readOpenMenuCoverage());

  await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const button = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const navigation = document.querySelector<HTMLElement>('[data-site-nav]')!;

    button.addEventListener(
      'click',
      () => {
        const headerRect = header.getBoundingClientRect();
        const navigationRect = navigation.getBoundingClientRect();
        const navigationStyle = getComputedStyle(navigation);

        header.dataset.menuClosingTestState = JSON.stringify({
          ariaExpanded: button.getAttribute('aria-expanded'),
          closingHitIsHeader:
            document.elementFromPoint(navigationRect.left + 1, navigationRect.top + 1) === header,
          headerBackground: getComputedStyle(header).backgroundColor,
          headerLeft: headerRect.left,
          headerRight: headerRect.right,
          inert: navigation.hasAttribute('inert'),
          isClosing: header.hasAttribute('data-menu-closing'),
          isOpen: header.hasAttribute('data-menu-open'),
          navigationBackground: navigationStyle.backgroundColor,
          navigationLeft: navigationRect.left,
          navigationRight: navigationRect.right,
          pointerEvents: navigationStyle.pointerEvents,
          shieldHeight: Number.parseFloat(
            header.style.getPropertyValue('--mobile-menu-closing-height'),
          ),
          animationDuration: navigationStyle.animationDuration,
          animationName: navigationStyle.animationName,
          viewportWidth: window.innerWidth,
          visibility: navigationStyle.visibility,
        });
      },
      { once: true },
    );
  });
  await menuButton.click();
  const closingState = await header.evaluate((element) => {
    const state = JSON.parse(element.dataset.menuClosingTestState ?? '{}');
    delete element.dataset.menuClosingTestState;
    return state;
  });

  expect(closingState).toMatchObject({
    ariaExpanded: 'false',
    animationDuration: '0.28s',
    animationName: 'mobile-menu-close',
    headerBackground: 'rgb(17, 26, 43)',
    closingHitIsHeader: true,
    inert: true,
    isClosing: true,
    isOpen: false,
    navigationBackground: 'rgb(17, 26, 43)',
    pointerEvents: 'none',
    visibility: 'visible',
  });
  expect(Math.abs(closingState.headerLeft)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(closingState.headerRight - closingState.viewportWidth)).toBeLessThanOrEqual(
    0.5,
  );
  expect(Math.abs(closingState.navigationLeft)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(closingState.navigationRight - closingState.viewportWidth)).toBeLessThanOrEqual(
    0.5,
  );
  expect(closingState.shieldHeight).toBeGreaterThan(0);

  await expectFullyClosed();

  await menuButton.click();
  const rapidReopenState = await page.evaluate(async () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const button = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const navigation = document.querySelector<HTMLElement>('[data-site-nav]')!;

    button.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const animationStarted = navigation
      .getAnimations()
      .some(
        (animation) =>
          animation instanceof CSSAnimation && animation.animationName === 'mobile-menu-close',
      );
    button.click();

    return {
      animationStarted,
      ariaExpanded: button.getAttribute('aria-expanded'),
      inert: navigation.hasAttribute('inert'),
      isClosing: header.hasAttribute('data-menu-closing'),
      isOpen: header.hasAttribute('data-menu-open'),
      visibility: getComputedStyle(navigation).visibility,
    };
  });

  expect(rapidReopenState).toEqual({
    animationStarted: true,
    ariaExpanded: 'true',
    inert: false,
    isClosing: false,
    isOpen: true,
    visibility: 'visible',
  });
  await page.waitForTimeout(420);
  await expect(header).toHaveAttribute('data-menu-open', '');
  await expect(header).not.toHaveAttribute('data-menu-closing');
  await expect(navigation).not.toHaveAttribute('inert');

  await page.keyboard.press('Escape');

  await expect(menuButton).toBeFocused();
  await expectFullyClosed();

  await menuButton.click();
  await navigation.getByRole('link', { name: /关于/ }).click();

  await expect(page).toHaveURL(/#about$/);
  await expect(header).not.toHaveAttribute('data-menu-open');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toHaveAttribute('aria-label', '菜单');
  await expect(navigation).toHaveAttribute('inert', '');
  await expectFullyClosed();

  await menuButton.click();
  await page.mouse.click(10, 500);
  await expectFullyClosed();

  await page.setViewportSize({ width: 820, height: 852 });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(header).toHaveAttribute('data-menu-open', '');
  expectFullWidthOpaqueCoverage(await readOpenMenuCoverage());

  await page.setViewportSize({ width: 900, height: 852 });
  await expect(header).not.toHaveAttribute('data-menu-open');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toHaveAttribute('aria-label', '菜单');
  await expect(navigation).not.toHaveAttribute('inert');
  await expect(navigation).toHaveCSS('visibility', 'visible');
});

test(
  'hides the mobile navigation before its controller is ready and fails open safely',
  { tag: '@once' },
  async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.addInitScript(() => {
      const originalQuerySelector = document.querySelector.bind(document);
      document.querySelector = ((selectors: string) => {
        if (selectors === '[data-site-header]') return null;
        return originalQuerySelector(selectors);
      }) as typeof document.querySelector;

      document.addEventListener(
        'readystatechange',
        () => {
          if (document.readyState !== 'interactive') return;

          const header = document.getElementById('top');
          const navigation = document.getElementById('primary-navigation');
          const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
          if (!header || !navigation || !menuButton) return;

          // `interactive` can precede render-blocking stylesheet application, so this
          // snapshot checks only the synchronous marker. Loaded CSS is verified below.
          (window as Window & { __menuBootSnapshot?: Record<string, unknown> }).__menuBootSnapshot = {
            menuPending: document.documentElement.hasAttribute('data-menu-pending'),
            menuReady: header.hasAttribute('data-menu-ready'),
          };
        },
        { once: true },
      );
    });

    await page.goto('/');

    const bootSnapshot = await page.evaluate(
      () =>
        (window as Window & { __menuBootSnapshot?: Record<string, unknown> }).__menuBootSnapshot,
    );
    expect(bootSnapshot).toEqual({
      menuPending: true,
      menuReady: false,
    });

    const header = page.locator('[data-site-header]');
    const navigation = page.locator('[data-site-nav]');
    const menuButton = page.locator('[data-menu-toggle]');
    await expect(page.locator('html')).not.toHaveAttribute('data-menu-pending');
    await expect(header).not.toHaveAttribute('data-menu-ready');
    await expect(navigation).toBeVisible();
    await expect(menuButton).toBeHidden();

    await page.evaluate(() => document.documentElement.setAttribute('data-menu-pending', ''));
    await expect(navigation).toHaveCSS('display', 'none');
    await expect(navigation).toHaveCSS('pointer-events', 'none');
    await expect(navigation).toHaveCSS('visibility', 'hidden');
    await expect(menuButton).toBeHidden();

    await page.evaluate(() => document.documentElement.removeAttribute('data-menu-pending'));
    await expect(navigation).toBeVisible();
  },
);

test(
  'zooms photography images inside their frames and underlines linked text on hover and keyboard focus',
  { tag: ['@desktop-only', '@photography'] },
  async ({ page }) => {
    await page.goto('/#photography');
    await alignPhotographyToViewport(page);

    const archiveLink = page.locator('.photo-archive-link');
    const archivePrimary = archiveLink.locator('.photo-archive-primary[lang="zh-CN"]');
    const firstPhotoLink = page.locator('[data-photo-item]:visible').first().locator('a');
    const firstPhotoPicture = firstPhotoLink.locator('picture');
    const firstPhotoImage = firstPhotoPicture.locator('img');
    const photoTitle = firstPhotoLink.locator('.photo-title > span[lang="zh-CN"]');
    const imageScale = () =>
      firstPhotoImage.evaluate((image) => {
        const transform = getComputedStyle(image).transform;
        return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
      });

    await expect(archivePrimary).toHaveCSS('text-decoration-line', 'none');
    await expect(archiveLink.locator('.photo-archive-secondary')).toHaveCount(0);
    await expect(archiveLink.locator('[lang="en"]')).toHaveCount(0);
    await archiveLink.hover();
    await expect(archivePrimary).toHaveCSS('text-decoration-line', 'underline');

    const frameBeforeHover = await firstPhotoPicture.boundingBox();
    await expect.poll(imageScale).toBeCloseTo(1, 3);
    await firstPhotoPicture.hover();
    await expect.poll(imageScale).toBeGreaterThan(1.04);
    await expect(photoTitle).toHaveCSS('text-decoration-line', 'underline');
    const frameDuringHover = await firstPhotoPicture.boundingBox();
    expect(frameDuringHover?.width).toBeCloseTo(frameBeforeHover?.width ?? 0, 2);
    expect(frameDuringHover?.height).toBeCloseTo(frameBeforeHover?.height ?? 0, 2);

    await page.locator('.recent .section-heading').hover();
    await expect.poll(imageScale).toBeCloseTo(1, 3);

    await archiveLink.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(archiveLink).toBeFocused();
    await expect.poll(() => archiveLink.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    await expect(archivePrimary).toHaveCSS('text-decoration-line', 'underline');

    await firstPhotoLink.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(firstPhotoLink).toBeFocused();
    await expect.poll(() => firstPhotoLink.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    await expect(photoTitle).toHaveCSS('text-decoration-line', 'underline');
  },
);

test('scroll cues lead through the homepage sections', async ({ page }) => {
  await page.goto('/');

  const homeCue = page.locator('#home').getByRole('link', { name: /了解我/ });
  const aboutCue = page
    .locator('#about')
    .getByRole('link', { name: '看看我的相片' });

  await expect(homeCue).toHaveAttribute('href', '#about');
  await expect(aboutCue).toHaveAttribute('href', '#photography');
  expect(await aboutCue.getAttribute('aria-hidden')).toBeNull();
  await expect(aboutCue.locator('svg')).toHaveAttribute('aria-hidden', 'true');

  await homeCue.click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.getByRole('heading', { level: 2, name: '关于我' })).toBeInViewport();

  await aboutCue.scrollIntoViewIfNeeded();
  await expect(aboutCue).toBeInViewport();
  await expect(aboutCue).toHaveCSS('opacity', '1');
  await aboutCue.focus();
  await expect(aboutCue).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/#photography$/);
  await expect(page.getByRole('heading', { level: 2, name: '相片' })).toBeInViewport();
});

test('home navigation returns to the first screen', async ({ page }) => {
  await page.goto('/');
  await page.locator('#photography').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page
    .locator('.primary-nav a[href="#top"]')
    .evaluate((element) => (element as HTMLAnchorElement).click());

  await expect(page).toHaveURL(/#top$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('sizes the hero wave without causing horizontal page overflow', async ({ page }) => {
  await page.goto('/');

  const heroWave = page.locator('.hero-pixel-wave');
  await expect(heroWave).toHaveAttribute('data-grid-pitch', '7');
  expect(Number(await heroWave.getAttribute('data-grid-points'))).toBeLessThanOrEqual(120_000);

  const dimensions = await page.evaluate(() => {
    const heroRect = document.querySelector<HTMLElement>('.welcome')!.getBoundingClientRect();
    const waveRect = document
      .querySelector<HTMLElement>('.hero-pixel-wave')!
      .getBoundingClientRect();
    const canvasRect = document
      .querySelector<HTMLCanvasElement>('.hero-pixel-wave__canvas')!
      .getBoundingClientRect();

    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      hero: {
        left: heroRect.left,
        right: heroRect.right,
        width: heroRect.width,
        height: heroRect.height,
      },
      wave: {
        left: waveRect.left,
        right: waveRect.right,
        width: waveRect.width,
        height: waveRect.height,
      },
      canvas: {
        left: canvasRect.left,
        right: canvasRect.right,
        width: canvasRect.width,
        height: canvasRect.height,
      },
    };
  });

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(dimensions.wave.width).toBeGreaterThan(0);
  expect(dimensions.wave.height).toBeGreaterThan(0);
  expect(dimensions.canvas.width).toBeGreaterThan(0);
  expect(dimensions.canvas.height).toBeGreaterThan(0);
  expect(Math.abs(dimensions.wave.left - dimensions.hero.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.wave.right - dimensions.hero.right)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.wave.width - dimensions.hero.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.wave.height - dimensions.hero.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.canvas.left - dimensions.wave.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.canvas.right - dimensions.wave.right)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.canvas.width - dimensions.wave.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.canvas.height - dimensions.wave.height)).toBeLessThanOrEqual(1);
  expect(dimensions.wave.left).toBeGreaterThanOrEqual(-1);
  expect(dimensions.wave.right).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
});

test(
  'bounds the hero wave grid for oversized viewports',
  { tag: '@desktop-only' },
  async ({ page }) => {
    await page.goto('/');

    const heroWave = page.locator('.hero-pixel-wave');
    await page.locator('.welcome').evaluate((element) => {
      element.style.width = '3000px';
      element.style.height = '2000px';
      element.style.minHeight = '0';
    });

    await expect.poll(async () => Number(await heroWave.getAttribute('data-grid-pitch'))).toBeGreaterThan(7);
    expect(Number(await heroWave.getAttribute('data-grid-points'))).toBeLessThanOrEqual(120_000);
  },
);

test(
  'shows responsive photo lanes on desktop and manual horizontal swiping on mobile',
  { tag: ['@photography', '@smoke'] },
  async ({ page }) => {
    await page.goto('/');

    const story = page.locator('[data-photo-story]');
    const selectionMeta = story.locator('[data-photo-selection-meta]');
    const viewport = page.viewportSize()!;
    await expect(selectionMeta).toHaveCount(1);
    await expect(story.locator('.recent-intro-copy > [data-photo-selection-meta]')).toHaveCount(1);

    if (viewport.width <= 820) {
      await expect(story).toHaveAttribute('data-photo-mode', 'mobile');
      await expect(story).toHaveAttribute('data-lane-count', '1');
      await expect(story).toHaveAttribute('data-visible-count', '10');
      await expect(story.locator('[data-photo-pool]')).toBeHidden();
      await expect(story.locator('[data-photo-lane]')).toHaveCount(1);
      await expect(story.locator('[data-photo-item]:visible')).toHaveCount(10);
      await expect(story.locator('.photo-title:visible')).toHaveCount(10);
      await expect(story.locator('.photo-archive-link')).toBeVisible();
      await expect(story.locator('[data-photo-stage] + .photo-archive-link')).toHaveCount(1);
      await expect(selectionMeta).toBeVisible();
      await expect(selectionMeta.locator('[data-photo-selection-en]')).toHaveCount(0);
      await expect(selectionMeta.locator('[data-photo-selection-zh]')).toHaveText(
        '镜头所见 · 10 张相片',
      );
      await expect(selectionMeta.locator(':scope > span[lang]')).toHaveCount(1);

      const archiveChinese = story.locator('.photo-archive-copy > span[lang="zh-CN"]');
      await expect(story.locator('.photo-archive-copy > span[lang="en"]')).toHaveCount(0);
      const archiveChineseMetrics = await archiveChinese.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
        whiteSpace: getComputedStyle(element).whiteSpace,
      }));
      expect(archiveChineseMetrics.whiteSpace).toBe('nowrap');
      expect(archiveChineseMetrics.height).toBeLessThanOrEqual(
        archiveChineseMetrics.lineHeight + 1,
      );

      const pictureMetrics = await story.locator('[data-photo-lane] .photo-item').evaluateAll((items) =>
        items.map((item) => {
          const picture = item.querySelector('picture')!;
          const image = item.querySelector('img')!;
          const rect = picture.getBoundingClientRect();
          return {
            height: Math.round(rect.height),
            renderedRatio: rect.width / rect.height,
            sourceRatio: Number(image.getAttribute('width')) / Number(image.getAttribute('height')),
            objectFit: getComputedStyle(image).objectFit,
          };
        }),
      );
      const pictureHeights = pictureMetrics.map(({ height }) => height);
      expect(new Set(pictureHeights).size).toBe(1);
      pictureMetrics.forEach(({ renderedRatio, sourceRatio, objectFit }) => {
        expect(renderedRatio).toBeCloseTo(sourceRatio, 2);
        expect(objectFit).toBe('contain');
      });

      const laneFlow = await story.locator('[data-photo-lane]').evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          display: style.display,
          direction: style.flexDirection,
          wrap: style.flexWrap,
        };
      });
      expect(laneFlow).toEqual({
        display: 'flex',
        direction: 'row',
        wrap: 'nowrap',
      });

      const archiveTop = await story
        .locator('.photo-archive-link')
        .evaluate((element) => element.getBoundingClientRect().top);
      const railBottom = await story
        .locator('[data-photo-stage]')
        .evaluate((element) => element.getBoundingClientRect().bottom);
      expect(archiveTop).toBeGreaterThanOrEqual(railBottom);

      const rail = story.locator('[data-photo-stage]');
      const horizontalMetrics = await rail.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(horizontalMetrics.scrollWidth).toBeGreaterThan(horizontalMetrics.clientWidth);

      await rail.evaluate((element) => {
        element.scrollLeft = element.clientWidth;
      });
      await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

      const footerHeight = await page
        .locator('.site-footer')
        .evaluate((element) => element.getBoundingClientRect().height);
      expect(footerHeight).toBeLessThan(60);

      const sectionHeight = await story.evaluate((element) => element.getBoundingClientRect().height);
      expect(sectionHeight).toBeGreaterThan(page.viewportSize()!.height);
      return;
    }

    await expect(story).toHaveAttribute('data-photo-mode', 'desktop');
    await expect(story).toHaveAttribute('data-lane-count', '2');
    await expect(story.locator('[data-photo-lane]')).toHaveCount(2);
    const desktopVisibleCount = Number(await story.getAttribute('data-visible-count'));
    expect(desktopVisibleCount).toBeGreaterThan(0);
    expect(desktopVisibleCount).toBeLessThanOrEqual(20);
    await expect(story.locator('[data-photo-item]:visible')).toHaveCount(desktopVisibleCount);
    await expect(story.locator('.photo-title:visible')).toHaveCount(desktopVisibleCount);
    await expect(story.locator('.photo-archive-link')).toBeVisible();
    await expect(story.locator('.recent-intro > .photo-archive-link')).toHaveCount(1);
    await expect(selectionMeta).toBeVisible();
    await expect(selectionMeta.locator('[data-photo-selection-en]')).toHaveCount(0);
    await expect(selectionMeta.locator('[data-photo-selection-zh]')).toHaveText(
      `镜头所见 · ${desktopVisibleCount} 张相片`,
    );
    await expect(selectionMeta.locator(':scope > span[lang]')).toHaveCount(1);

    const footer = page.locator('.site-footer');
    await expect(footer).toHaveCSS('position', 'fixed');
    await alignPhotographyToViewport(page);

    await expect(footer).toBeInViewport();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight - window.scrollY))
      .toBeLessThan(1);
  },
);

test('scales the mobile photography rail with the available viewport height', { tag: '@once' }, async ({ page }) => {
  const cases = [
    { width: 320, height: 568 },
    { width: 393, height: 667 },
    { width: 393, height: 852 },
    { width: 430, height: 932 },
  ];
  const measuredHeights = new Map<string, number>();

  for (const viewport of cases) {
    await page.setViewportSize(viewport);
    await page.goto('/#photography');

    const story = page.locator('[data-photo-story]');
    await expect(story).toHaveAttribute('data-photo-mode', 'mobile');
    await expect(story.locator('.recent-intro-en')).toHaveCount(0);

    const geometry = await story.evaluate((element) => {
      const picture = element.querySelector<HTMLElement>('[data-photo-lane] picture')!;
      const image = picture.querySelector<HTMLImageElement>('img')!;
      const stage = element.querySelector<HTMLElement>('[data-photo-stage]')!;
      const archive = element.querySelector<HTMLElement>('.photo-archive-link')!;
      const footer = document.querySelector<HTMLElement>('.site-footer')!;
      const pictureRect = picture.getBoundingClientRect();

      return {
        pictureHeight: pictureRect.height,
        renderedRatio: pictureRect.width / pictureRect.height,
        sourceRatio: Number(image.getAttribute('width')) / Number(image.getAttribute('height')),
        archiveTop: archive.getBoundingClientRect().top,
        stageBottom: stage.getBoundingClientRect().bottom,
        archiveBottom: archive.getBoundingClientRect().bottom,
        footerTop: footer.getBoundingClientRect().top,
        documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    const expectedHeight = Math.min(
      24 * 16,
      Math.max(12.5 * 16, Math.min(viewport.width * 0.88, viewport.height - 27 * 16)),
    );

    expect(geometry.pictureHeight).toBeCloseTo(expectedHeight, 0);
    expect(geometry.renderedRatio).toBeCloseTo(geometry.sourceRatio, 2);
    expect(geometry.archiveTop).toBeGreaterThanOrEqual(geometry.stageBottom);
    expect(geometry.archiveBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
    expect(geometry.documentOverflow).toBe(0);
    measuredHeights.set(`${viewport.width}x${viewport.height}`, geometry.pictureHeight);
  }

  expect(measuredHeights.get('393x852')!).toBeGreaterThan(
    measuredHeights.get('393x667')! + 80,
  );
});

test('keeps the welcome content and full menu usable on a short phone landscape', { tag: '@once' }, async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto('/');

  const welcome = page.locator('.welcome');
  const scrollCue = welcome.locator('.scroll-cue');
  await expect(welcome.locator('.welcome-subtitle')).toBeVisible();
  await expect(scrollCue).toBeInViewport();

  const welcomeHeight = await welcome.evaluate((element) => element.getBoundingClientRect().height);
  expect(welcomeHeight).toBeLessThanOrEqual(322);

  await page.getByRole('button', { name: '菜单' }).click();
  const navigation = page.locator('[data-site-nav]');
  await expect(navigation).toBeVisible();
  const navigationMetrics = await navigation.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  });
  expect(navigationMetrics.top).toBeGreaterThanOrEqual(0);
  expect(navigationMetrics.bottom).toBeLessThanOrEqual(321);
  expect(navigationMetrics.scrollHeight).toBeLessThanOrEqual(navigationMetrics.clientHeight + 1);
  await expect(navigation.getByRole('link')).toHaveCount(3);
  await expect(page.getByRole('link', { name: '切换到英文版本' })).toBeInViewport();
  await expect(navigation.getByRole('link', { name: '切换到英文版本' })).toHaveCount(0);
});

test('keeps the mobile footer on one line with progressive hiding', { tag: '@once' }, async ({ page }) => {

  const cases = [
    { width: 627, copyright: true, buildMetadata: true },
    { width: 512, copyright: true, buildMetadata: false },
    { width: 390, copyright: true, buildMetadata: false },
    { width: 340, copyright: false, buildMetadata: false },
  ];

  for (const viewportCase of cases) {
    await page.setViewportSize({ width: viewportCase.width, height: 753 });
    await page.goto('/#photography');

    const footer = page.locator('.site-footer');
    await expect(footer.locator('.icp-record')).toBeVisible();
    await expect(footer.locator(':scope > p:visible')).toHaveCount(viewportCase.copyright ? 1 : 0);
    await expect(footer.locator('.footer-links:visible')).toHaveCount(
      viewportCase.buildMetadata ? 1 : 0,
    );
    const metrics = await footer.evaluate((element) => {
      const copyright = element.querySelector('p')?.getBoundingClientRect();
      const record = element.querySelector('.icp-record')?.getBoundingClientRect();
      const buildMetadata = element.querySelector('.footer-links')?.getBoundingClientRect();

      const tapTargetHeights = Array.from(element.querySelectorAll('a'))
        .filter((link) => link.getClientRects().length > 0)
        .map((link) => link.getBoundingClientRect().height);

      return {
        height: element.getBoundingClientRect().height,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        copyrightLeft: copyright?.left ?? 0,
        copyrightRight: copyright?.right ?? 0,
        recordLeft: record?.left ?? 0,
        recordRight: record?.right ?? 0,
        buildMetadataLeft: buildMetadata?.left ?? 0,
        tapTargetHeights,
      };
    });

    expect(metrics.height).toBeLessThan(60);
    expect(metrics.overflow).toBe(0);
    expect(metrics.tapTargetHeights.every((height) => height >= 44)).toBe(true);

    if (viewportCase.buildMetadata) {
      expect(metrics.copyrightRight).toBeLessThanOrEqual(metrics.recordLeft + 1);
      expect(metrics.recordRight).toBeLessThanOrEqual(metrics.buildMetadataLeft + 1);
    } else if (viewportCase.copyright) {
      const visibleGroupCenter = (metrics.copyrightLeft + metrics.recordRight) / 2;
      expect(Math.abs(visibleGroupCenter - viewportCase.width / 2)).toBeLessThanOrEqual(1);
      expect(metrics.recordLeft - metrics.copyrightRight).toBeGreaterThanOrEqual(16);
      expect(metrics.recordLeft - metrics.copyrightRight).toBeLessThanOrEqual(40);
    }
  }
});

test('keeps the desktop footer fixed and naturally reveals it with photography', { tag: '@desktop-only' }, async ({ page }) => {

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');

  const story = page.locator('[data-photo-story]');
  const footer = page.getByRole('contentinfo');

  const coveredLandingState = await footer.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      position: getComputedStyle(element).position,
      isHitTarget: hit === element || element.contains(hit),
      inert: element.hasAttribute('inert'),
    };
  });
  expect(coveredLandingState.position).toBe('fixed');
  expect(coveredLandingState.isHitTarget).toBe(false);
  expect(coveredLandingState.inert).toBe(true);

  await page.goto('/#photography');
  await expect.poll(() => story.evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
  await expect(story).toHaveAttribute('data-photo-mode', 'desktop');
  await expect(footer).toBeInViewport();
  await expect(footer).toHaveCSS('position', 'fixed');
  await expect(footer).not.toHaveAttribute('aria-hidden');
  await expect(footer).not.toHaveAttribute('inert');
  await expect(footer.getByRole('link', { name: '粤ICP备2025447157号' })).toBeVisible();

  const geometry = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.photo-stage')!.getBoundingClientRect();
    const footerRect = document.querySelector<HTMLElement>('.site-footer')!.getBoundingClientRect();
    return {
      stageBottom: stage.bottom,
      footerTop: footerRect.top,
      footerBottom: footerRect.bottom,
      footerHeight: footerRect.height,
      viewportHeight: window.innerHeight,
    };
  });
  expect(geometry.stageBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
  expect(Math.abs(geometry.footerBottom - geometry.viewportHeight)).toBeLessThan(2);
  expect(geometry.footerHeight).toBeLessThanOrEqual(60);
});

test('keeps a static hero wave visible when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const heroWave = page.locator('.hero-pixel-wave');
  const heroCanvas = heroWave.locator('.hero-pixel-wave__canvas');
  await expect(heroWave).toHaveAttribute('data-motion', 'reduced');
  await expect(heroWave).toBeVisible();
  await expect(heroCanvas).toBeVisible();

  const about = page.locator('[data-about-reveal]');
  const aboutCue = about.locator('.scroll-cue');
  await expect(about).toHaveAttribute('data-reveal-state', 'complete');
  await expect(aboutCue).toHaveAttribute('href', '#photography');
  await expect(aboutCue).toHaveCSS('display', 'flex');
  await expect(aboutCue).toHaveCSS('opacity', '1');
});

test(
  'settles the mobile menu close immediately when reduced motion is requested',
  { tag: '@once' },
  async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const header = page.locator('[data-site-header]');
    const menuButton = page.locator('[data-menu-toggle]');
    const navigation = page.locator('[data-site-nav]');

    await menuButton.click();
    await expect(header).toHaveAttribute('data-menu-open', '');

    await menuButton.click();
    await expect(header).not.toHaveAttribute('data-menu-open');
    await expect(header).not.toHaveAttribute('data-menu-closing');
    await expect(navigation).toHaveAttribute('inert', '');
    await expect(navigation).toHaveCSS('visibility', 'hidden');
  },
);

test(
  'limits animated WebGL hero draws to about 30 frames per second',
  { tag: '@desktop-only' },
  async ({ page }) => {
    await page.addInitScript(() => {
      const originalDrawArrays = WebGL2RenderingContext.prototype.drawArrays;
      const windowWithDrawTimes = window as Window & { __heroDrawTimes?: number[] };
      windowWithDrawTimes.__heroDrawTimes = [];
      WebGL2RenderingContext.prototype.drawArrays = function drawArrays(mode, first, count) {
        if (mode === this.POINTS) windowWithDrawTimes.__heroDrawTimes?.push(performance.now());
        return originalDrawArrays.call(this, mode, first, count);
      };
    });
    await page.goto('/');

    const heroWave = page.locator('.hero-pixel-wave');
    test.skip(await heroWave.getAttribute('data-renderer') !== 'webgl2', 'WebGL2 is unavailable.');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const drawTimes = (window as Window & { __heroDrawTimes?: number[] }).__heroDrawTimes;
      if (drawTimes) drawTimes.length = 0;
    });
    await page.locator('.welcome').evaluate(async (element) => {
      const startedAt = performance.now();
      await new Promise<void>((resolve) => {
        const resizeEveryFrame = () => {
          element.style.width = Math.floor(performance.now() / 16) % 2 === 0
            ? 'calc(100% - 1px)'
            : '100%';
          if (performance.now() - startedAt < 350) requestAnimationFrame(resizeEveryFrame);
          else resolve();
        };
        requestAnimationFrame(resizeEveryFrame);
      });
    });

    const drawTimes = await page.evaluate(
      () => (window as Window & { __heroDrawTimes?: number[] }).__heroDrawTimes ?? [],
    );
    expect(drawTimes.length).toBeGreaterThanOrEqual(5);
    const intervals = drawTimes.slice(1).map((time, index) => time - drawTimes[index]);
    expect(Math.min(...intervals)).toBeGreaterThanOrEqual(30);
  },
);

test(
  'rebuilds WebGL resources after context restoration',
  { tag: '@desktop-only' },
  async ({ page }) => {
    await page.addInitScript(() => {
      const originalDrawArrays = WebGL2RenderingContext.prototype.drawArrays;
      const windowWithDrawTimes = window as Window & { __heroRestoreDrawTimes?: number[] };
      windowWithDrawTimes.__heroRestoreDrawTimes = [];
      WebGL2RenderingContext.prototype.drawArrays = function drawArrays(mode, first, count) {
        if (mode === this.POINTS) {
          windowWithDrawTimes.__heroRestoreDrawTimes?.push(performance.now());
        }
        return originalDrawArrays.call(this, mode, first, count);
      };
    });
    await page.goto('/');

    const heroWave = page.locator('.hero-pixel-wave');
    const heroCanvas = heroWave.locator('.hero-pixel-wave__canvas');
    test.skip(await heroWave.getAttribute('data-renderer') !== 'webgl2', 'WebGL2 is unavailable.');
    await page.locator('#photography').scrollIntoViewIfNeeded();
    await expect.poll(() => heroWave.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
    await page.waitForTimeout(50);

    const canLoseContext = await heroCanvas.evaluate((canvas) => {
      const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      (window as Window & { __heroContextLoss?: WEBGL_lose_context }).__heroContextLoss = extension;
      extension.loseContext();
      return true;
    });
    test.skip(!canLoseContext, 'WEBGL_lose_context is unavailable.');

    await expect(heroWave).toHaveAttribute('data-context', 'lost');
    await expect(heroWave).toHaveAttribute('data-motion', 'paused');
    await page.evaluate(() => {
      const drawTimes = (window as Window & { __heroRestoreDrawTimes?: number[] }).__heroRestoreDrawTimes;
      if (drawTimes) drawTimes.length = 0;
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      (window as Window & { __heroContextLoss?: WEBGL_lose_context }).__heroContextLoss?.restoreContext();
    });

    await expect(heroWave).toHaveAttribute('data-context', 'active');
    await expect(heroWave).toHaveAttribute('data-renderer', 'webgl2');
    await expect(heroWave).toHaveAttribute('data-motion', 'animated');
    await page.waitForTimeout(150);
    expect(await page.evaluate(
      () => (window as Window & { __heroRestoreDrawTimes?: number[] }).__heroRestoreDrawTimes ?? [],
    )).toEqual([]);

    await page.locator('.welcome').scrollIntoViewIfNeeded();
    await expect.poll(() => heroCanvas.evaluate((canvas) => {
      const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
      return Boolean(gl?.getParameter(gl.CURRENT_PROGRAM));
    })).toBe(true);
    await expect.poll(() => page.evaluate(
      () => (window as Window & { __heroRestoreDrawTimes?: number[] }).__heroRestoreDrawTimes?.length ?? 0,
    )).toBeGreaterThan(0);
  },
);

test('keeps the hero wave independent of pointer input', async ({ page }) => {
  await page.goto('/');

  const heroWave = page.locator('.hero-pixel-wave');
  const heroCanvas = heroWave.locator('.hero-pixel-wave__canvas');
  await expect(heroWave).toHaveAttribute('data-renderer', /^(webgl2|canvas2d)$/);
  await expect(heroWave).toHaveCSS('pointer-events', 'none');
  await expect(heroCanvas).toHaveCSS('pointer-events', 'none');
  expect(await heroWave.getAttribute('data-pointer-effect')).toBeNull();
  const bounds = await heroWave.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width * 0.72, bounds!.y + bounds!.height * 0.52);
  expect(await heroWave.getAttribute('data-pointer-effect')).toBeNull();
});

test('shows a static photo grid when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const story = page.locator('[data-photo-story]');
  const visibleCount = Number(await story.getAttribute('data-visible-count'));
  expect(visibleCount).toBeGreaterThan(0);
  expect(visibleCount).toBeLessThanOrEqual(page.viewportSize()!.width <= 820 ? 10 : 30);
  await expect(story.locator('[data-photo-item]:visible')).toHaveCount(visibleCount);

  if (page.viewportSize()!.width <= 820) {
    await expect(story).toHaveAttribute('data-photo-mode', 'mobile');
    await expect(story.locator('[data-photo-lane]')).toHaveCount(1);
  } else {
    await expect(story).toHaveAttribute('data-photo-mode', 'static');
    await expect(story).toHaveAttribute('data-lane-count', '0');
    await expect(story.locator('[data-photo-pool]')).toBeVisible();
    await expect(story.locator('[data-photo-lane]')).toHaveCount(0);

    const firstPhotoPicture = story.locator('[data-photo-item]:visible picture').first();
    const firstPhotoImage = firstPhotoPicture.locator('img');
    await firstPhotoPicture.hover();
    await expect
      .poll(() =>
        firstPhotoImage.evaluate((image) => {
          const transform = getComputedStyle(image).transform;
          return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
        }),
      )
      .toBe(1);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const staticBottomGeometry = await page.evaluate(() => {
      const visibleItems = Array.from(
        document.querySelectorAll<HTMLElement>('[data-photo-item]:not([hidden])'),
      );
      const footer = document.querySelector<HTMLElement>('.site-footer')!.getBoundingClientRect();

      return {
        lastItemBottom: Math.max(...visibleItems.map((item) => item.getBoundingClientRect().bottom)),
        footerTop: footer.top,
      };
    });
    expect(staticBottomGeometry.lastItemBottom).toBeLessThanOrEqual(staticBottomGeometry.footerTop + 1);
  }
});

test('adapts desktop photo count without exceeding the thirty-photo total', { tag: '@desktop-only' }, async ({ page }) => {

  const viewports = [
    { width: 1024, height: 1100 },
    { width: 1280, height: 1100 },
    { width: 1440, height: 1100 },
    { width: 1920, height: 1100 },
    { width: 1920, height: 800 },
    { width: 1920, height: 1440 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const story = page.locator('[data-photo-story]');
    const laneCount = Number(await story.getAttribute('data-lane-count'));
    const photoCount = Number(await story.getAttribute('data-visible-count'));
    expect(laneCount).toBeGreaterThanOrEqual(2);
    expect(laneCount).toBeLessThanOrEqual(3);
    expect(photoCount).toBeGreaterThan(0);
    expect(photoCount).toBeLessThanOrEqual(30);
    await expect(story.locator('[data-photo-item]:visible')).toHaveCount(photoCount);
  }
});

test('caps the photography frame on ultrawide desktop screens', { tag: '@desktop-only' }, async ({ page }) => {

  for (const viewport of [
    { width: 2560, height: 1440 },
    { width: 3440, height: 1440 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/#photography');

    const geometry = await page.locator('.recent-inner').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        left: rect.left,
        right: window.innerWidth - rect.right,
      };
    });

    expect(geometry.width).toBeLessThanOrEqual(1505);
    expect(Math.abs(geometry.left - geometry.right)).toBeLessThanOrEqual(1);
  }
});

test('keeps short desktop photo rows legible instead of collapsing into slivers', { tag: '@desktop-only' }, async ({ page }) => {

  await page.setViewportSize({ width: 1024, height: 360 });
  await page.goto('/#photography');

  const story = page.locator('[data-photo-story]');
  await expect(story).toHaveAttribute('data-photo-mode', 'desktop');
  await expect(story).toHaveAttribute('data-lane-count', '1');
  await alignPhotographyToViewport(page);

  const visibleCount = Number(await story.getAttribute('data-visible-count'));
  const geometry = await story.evaluate((element) => {
    const pictures = Array.from(
      element.querySelectorAll<HTMLElement>('[data-photo-item]:not([hidden]) picture'),
    ).map((picture) => {
      const rect = picture.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    const stage = element.querySelector<HTMLElement>('.photo-stage')!.getBoundingClientRect();
    const lane = element.querySelector<HTMLElement>('[data-photo-lane]')!;
    const gap = Number.parseFloat(getComputedStyle(lane).columnGap || '0');
    const footer = document.querySelector<HTMLElement>('.site-footer')!.getBoundingClientRect();

    return {
      pictures,
      rowFill:
        (pictures.reduce((total, picture) => total + picture.width, 0) +
          gap * Math.max(0, pictures.length - 1)) /
        stage.width,
      stageBottom: stage.bottom,
      footerTop: footer.top,
    };
  });

  expect(visibleCount).toBeGreaterThan(0);
  expect(visibleCount).toBeLessThanOrEqual(30);
  expect(geometry.pictures).toHaveLength(visibleCount);
  expect(Math.min(...geometry.pictures.map(({ width }) => width))).toBeGreaterThan(40);
  expect(Math.min(...geometry.pictures.map(({ height }) => height))).toBeGreaterThan(60);
  expect(geometry.rowFill).toBeGreaterThanOrEqual(0.985);
  expect(geometry.rowFill).toBeLessThanOrEqual(1.002);
  expect(geometry.stageBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
});

test('keeps the photography hierarchy stable across responsive breakpoints', { tag: '@desktop-only' }, async ({ page }) => {

  const viewports = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 820, height: 1024 },
    { width: 821, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/#photography');
    await alignPhotographyToViewport(page);

    const story = page.locator('[data-photo-story]');
    const metrics = await story.evaluate((element) => {
      const rect = (selector: string) =>
        element.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      const heading = rect('.section-heading');
      const intro = rect('.recent-intro');
      const stage = rect('.photo-stage');
      const title = rect('.recent-title-primary');
      const archive = element.querySelector<HTMLAnchorElement>('.photo-archive-link')!;
      const archiveRect = archive.getBoundingClientRect();
      const footer = document.querySelector<HTMLElement>('.site-footer')!.getBoundingClientRect();
      const frame = rect('.recent-inner');
      const titleStyle = getComputedStyle(element.querySelector('.recent-title-primary')!);
      const mobile = window.innerWidth <= 820;
      const laneVisibleWidths = Array.from(
        element.querySelectorAll<HTMLElement>('[data-photo-lane]'),
      ).map((lane) =>
        Array.from(lane.querySelectorAll<HTMLElement>('[data-photo-item]:not([hidden])')).reduce(
          (total, item) => {
            const itemRect = item.getBoundingClientRect();
            const left = Math.max(itemRect.left, stage.left);
            const right = Math.min(itemRect.right, stage.right);
            return total + Math.max(0, right - left);
          },
          0,
        ),
      );

      return {
        mode: element.dataset.photoMode,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        storyHeight: element.getBoundingClientRect().height,
        frameWidth: frame.width,
        frameLeft: frame.left,
        frameRight: frame.right,
        headingBottom: heading.bottom,
        introTop: intro.top,
        introBottom: intro.bottom,
        stageTop: stage.top,
        stageBottom: stage.bottom,
        footerTop: footer.top,
        titleRight: title.right,
        titleSize: Number.parseFloat(titleStyle.fontSize),
        archiveHeight: archiveRect.height,
        archiveBottom: archiveRect.bottom,
        archiveAfterStage: archive.previousElementSibling?.classList.contains('photo-stage') ?? false,
        laneVisibleWidths,
        mobile,
      };
    });

    expect(metrics.overflow).toBe(0);
    expect(metrics.frameWidth).toBeLessThanOrEqual(1505);
    expect(metrics.titleRight).toBeLessThanOrEqual(metrics.frameRight + 1);
    expect(metrics.headingBottom).toBeLessThanOrEqual(metrics.introTop + 1);
    expect(metrics.introBottom).toBeLessThanOrEqual(metrics.stageTop + 1);
    expect(metrics.titleSize).toBeGreaterThan(40);
    expect(metrics.archiveHeight).toBeGreaterThanOrEqual(40);

    if (metrics.mobile) {
      expect(metrics.mode).toBe('mobile');
      expect(metrics.storyHeight).toBeGreaterThan(viewport.height);
      expect(metrics.archiveAfterStage).toBe(true);
      expect(metrics.archiveBottom).toBeLessThanOrEqual(metrics.footerTop + 1);
    } else {
      expect(metrics.mode).toBe('desktop');
      expect(metrics.archiveAfterStage).toBe(false);
      expect(metrics.stageBottom).toBeLessThanOrEqual(metrics.footerTop + 1);
      expect(metrics.laneVisibleWidths.length).toBeGreaterThan(0);
      metrics.laneVisibleWidths.forEach((visibleWidth) => {
        expect(visibleWidth).toBeGreaterThan(20);
      });
    }
  }
});

test('preserves a safe keyboard focus target when desktop photo lanes are rebuilt', { tag: '@desktop-only' }, async ({ page }) => {

  await page.setViewportSize({ width: 1920, height: 1440 });
  await page.goto('/#photography');
  await alignPhotographyToViewport(page);
  await expect(page.locator('[data-photo-story]')).toHaveAttribute('data-lane-count', '3');

  const firstPhotoLink = page.locator('[data-photo-item]:visible').first().locator('a');
  await firstPhotoLink.focus();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.activeElement
            ?.closest<HTMLElement>('[data-photo-item]')
            ?.dataset.photoIndex ?? null,
      ),
    )
    .toBe('0');

  await page.setViewportSize({ width: 1920, height: 1440 });
  await page.goto('/#photography');
  await alignPhotographyToViewport(page);
  await expect(page.locator('[data-photo-story]')).toHaveAttribute('data-lane-count', '3');
  const lastVisiblePhoto = page.locator('[data-photo-item]:visible').last();
  const lastVisibleIndex = Number(await lastVisiblePhoto.getAttribute('data-photo-index'));
  await lastVisiblePhoto.locator('a').focus();

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect
    .poll(async () =>
      Number(await page.locator('[data-photo-story]').getAttribute('data-visible-count')),
    )
    .toBeLessThan(lastVisibleIndex + 1);
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.classList.contains('photo-archive-link') ?? false),
    )
    .toBe(true);
});

test('preserves archive focus while crossing the mobile breakpoint', { tag: '@desktop-only' }, async ({ page }) => {

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/#photography');
  await alignPhotographyToViewport(page);

  const archiveLink = page.locator('.photo-archive-link');
  const status = page.locator('[data-photo-status]');
  const story = page.locator('[data-photo-story]');
  await archiveLink.focus();

  await page.setViewportSize({ width: 820, height: 844 });
  await expect(story).toHaveAttribute('data-photo-mode', 'mobile');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.classList.contains('photo-archive-link') ?? false))
    .toBe(true);
  await expect(status).toContainText(`10 张相片`);
  await expect(status.locator('span[lang="zh-CN"]')).toContainText('10 张相片');
  await expect(status.locator('span[lang="en"]')).toHaveText(
    'Swipe left or right to browse 10 photographs.',
  );
  await expect(story.locator('[data-photo-item]:visible')).toHaveCount(10);
  await expect(story.locator('[data-photo-selection-zh]')).toHaveText('镜头所见 · 10 张相片');

  await page.setViewportSize({ width: 821, height: 844 });
  await expect(story).toHaveAttribute('data-photo-mode', 'desktop');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.classList.contains('photo-archive-link') ?? false))
    .toBe(true);
  await expect
    .poll(async () => {
      const visibleCount = await story.getAttribute('data-visible-count');
      return (await status.textContent())?.includes(`${visibleCount} 张相片`) ?? false;
    })
    .toBe(true);
  const desktopVisibleCount = await story.getAttribute('data-visible-count');
  await expect(story.locator('[data-photo-item]:visible')).toHaveCount(Number(desktopVisibleCount));
  await expect(story.locator('[data-photo-selection-zh]')).toHaveText(
    `镜头所见 · ${desktopVisibleCount} 张相片`,
  );
  await expect(status.locator('span[lang="en"]')).toHaveText(
    `Showing ${desktopVisibleCount} photographs.`,
  );
});

test('keeps primary content visible without JavaScript', { tag: '@once' }, async ({ browser }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const { thumbnailRequests } = await mockExternalRequests(context);
  const page = await context.newPage();

  try {
    await page.goto('/');
    expect(thumbnailRequests).toHaveLength(30);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Jacky.');
    await expect(page.locator('.welcome-subtitle > span')).toHaveCount(2);
    await expect(page.locator('.welcome-subtitle > span').first()).toBeVisible();
    const scrollCue = page.getByRole('link', { name: /了解我/ });
    await expect(scrollCue).toHaveAttribute('href', '#about');
    await expect(scrollCue).toBeVisible();

    const navigation = page.getByRole('navigation', {
      name: /主要导航/,
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-menu-pending');
    await expect(navigation).toBeVisible();
    await expect(navigation).not.toHaveAttribute('inert');
    await expect(navigation).not.toHaveAttribute('aria-hidden');
    await expect(page.locator('[data-menu-toggle]')).toBeHidden();
    await expect(navigation.getByRole('link')).toHaveCount(3);
    await expect(navigation.getByRole('link').nth(0)).toHaveAttribute('href', '#top');
    await expect(navigation.getByRole('link').nth(1)).toHaveAttribute('href', '#about');
    await expect(navigation.getByRole('link').nth(2)).toHaveAttribute('href', '#photography');
    await expect(page.getByRole('link', { name: '切换到英文版本' })).toHaveAttribute(
      'href',
      'https://jackyw.uk/',
    );
    await expect(navigation.getByRole('link', { name: '切换到英文版本' })).toHaveCount(0);

    const photos = page.locator('[data-photo-item]');
    await expect(photos).toHaveCount(30);
    await expect(photos.first()).toBeVisible();
    await expect(photos.first().locator('.photo-title')).toBeVisible();
    await expect(photos.first().locator('.photo-title > span')).toHaveCount(1);
    await expect(photos.first().locator('.photo-title > span[lang="zh-CN"]')).toBeVisible();
    await expect(photos.first().locator('.photo-title > span[lang="en"]')).toHaveCount(0);
    await expect(photos.first().locator('a')).toHaveAccessibleName(/.+/);
    await expect(photos.first()).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-photo-stage]')).toHaveAttribute('data-nosnippet', '');
    await expect(page.locator('[data-photo-pool]')).toHaveAttribute('aria-label', '镜头所见 · 30 张相片');
    await expect(page.locator('[data-photo-selection-meta]')).toBeHidden();

    await navigation.getByRole('link', { name: /关于/ }).click();
    await expect(page).toHaveURL(/#about$/);
    await expect(page.locator('#about')).toBeInViewport();
  } finally {
    await context.close();
  }
});

test('fills and edge-aligns ordered desktop photo lanes', { tag: ['@desktop-only', '@photography'] }, async ({ page }) => {

  const cases = [
    { viewport: { width: 1024, height: 768 }, laneCount: 2 },
    { viewport: { width: 1280, height: 800 }, laneCount: 2 },
    { viewport: { width: 1440, height: 900 }, laneCount: 2 },
    { viewport: { width: 1920, height: 1080 }, laneCount: 2 },
    { viewport: { width: 1920, height: 1440 }, laneCount: 3 },
    { viewport: { width: 2560, height: 1440 }, laneCount: 2 },
  ];

  for (const testCase of cases) {
    await page.setViewportSize(testCase.viewport);
    await page.goto('/#photography');

    const story = page.locator('[data-photo-story]');
    await alignPhotographyToViewport(page);
    await expect(story).toHaveAttribute('data-lane-count', String(testCase.laneCount));
    const readMetrics = () =>
      story.evaluate((element) => {
        const stage = element.querySelector<HTMLElement>('[data-photo-stage]')!;
        const stageRect = stage.getBoundingClientRect();
        const frameRect = element.querySelector<HTMLElement>('.recent-inner')!.getBoundingClientRect();
        const introRect = element.querySelector<HTMLElement>('.recent-intro')!.getBoundingClientRect();
        const lanes = Array.from(element.querySelectorAll<HTMLElement>('[data-photo-lane]'));

        return {
          stageBottom: stageRect.bottom,
          stageFrameLeftDelta: Math.abs(stageRect.left - frameRect.left),
          stageFrameRightDelta: Math.abs(stageRect.right - frameRect.right),
          stageIntroLeftDelta: Math.abs(stageRect.left - introRect.left),
          stageIntroRightDelta: Math.abs(stageRect.right - introRect.right),
          laneSizes: lanes.map((lane) => lane.querySelectorAll('[data-photo-item]').length),
          indexes: lanes.flatMap((lane) =>
            Array.from(lane.querySelectorAll<HTMLElement>('[data-photo-item]')).map((item) =>
              Number(item.dataset.photoIndex),
            ),
          ),
          laneEdges: lanes.map((lane) => {
            const items = Array.from(lane.querySelectorAll<HTMLElement>('[data-photo-item]'));
            const gap = Number.parseFloat(getComputedStyle(lane).columnGap || '0');
            const contentWidth =
              items.reduce((total, item) => total + item.getBoundingClientRect().width, 0) +
              gap * Math.max(0, items.length - 1);
            const itemRects = items.map((item) => item.getBoundingClientRect());
            const contentLeft = Math.min(...itemRects.map((rect) => rect.left));
            const contentRight = Math.max(...itemRects.map((rect) => rect.right));
            return {
              fill: contentWidth / stageRect.width,
              leftInset: contentLeft - stageRect.left,
              rightInset: stageRect.right - contentRight,
            };
          }),
          maxItemBottom: Math.max(
            ...lanes.flatMap((lane) =>
              Array.from(lane.querySelectorAll<HTMLElement>('[data-photo-item]')).map(
                (item) => item.getBoundingClientRect().bottom,
              ),
            ),
          ),
          pictures: lanes.flatMap((lane) =>
            Array.from(lane.querySelectorAll<HTMLElement>('[data-photo-item]')).map((item) => {
              const picture = item.querySelector('picture')!.getBoundingClientRect();
              const image = item.querySelector('img')!;
              return {
                renderedRatio: picture.width / picture.height,
                sourceRatio:
                  Number(image.getAttribute('width')) / Number(image.getAttribute('height')),
                titleCount: item.querySelectorAll('.photo-title > span').length,
              };
            }),
          ),
        };
      });

    await expect
      .poll(
        async () => {
          const metrics = await readMetrics();
          return (
            metrics.laneSizes.length === testCase.laneCount &&
            metrics.laneSizes.every((laneSize) => laneSize > 0) &&
            metrics.laneEdges.every(
              ({ fill, leftInset, rightInset }) =>
                fill >= 0.985 &&
                fill <= 1.002 &&
                leftInset >= -1 &&
                rightInset >= -1 &&
                leftInset <= 8 &&
                rightInset <= 8,
            )
          );
        },
        { message: 'wait for desktop photo lanes to finish resizing' },
      )
      .toBe(true);

    const metrics = await readMetrics();

    expect(metrics.laneSizes).toHaveLength(testCase.laneCount);
    metrics.laneSizes.forEach((laneSize) => {
      expect(laneSize).toBeGreaterThan(0);
    });
    expect(metrics.laneSizes.reduce((total, laneSize) => total + laneSize, 0)).toBeLessThanOrEqual(30);
    expect(metrics.indexes).toEqual(Array.from({ length: metrics.indexes.length }, (_, index) => index));
    expect(metrics.stageFrameLeftDelta).toBeLessThanOrEqual(1);
    expect(metrics.stageFrameRightDelta).toBeLessThanOrEqual(1);
    expect(metrics.stageIntroLeftDelta).toBeLessThanOrEqual(1);
    expect(metrics.stageIntroRightDelta).toBeLessThanOrEqual(1);
    metrics.laneEdges.forEach(({ fill, leftInset, rightInset }) => {
      expect(fill).toBeGreaterThanOrEqual(0.985);
      expect(fill).toBeLessThanOrEqual(1.002);
      expect(leftInset).toBeGreaterThanOrEqual(-1);
      expect(rightInset).toBeGreaterThanOrEqual(-1);
      expect(leftInset).toBeLessThanOrEqual(8);
      expect(rightInset).toBeLessThanOrEqual(8);
    });
    expect(metrics.maxItemBottom).toBeLessThanOrEqual(metrics.stageBottom + 1);
    metrics.pictures.forEach(({ renderedRatio, sourceRatio, titleCount }) => {
      expect(renderedRatio).toBeCloseTo(sourceRatio, 2);
      expect(titleCount).toBe(1);
    });
  }
});

test('does not emit browser errors while scrolling the photo story', async ({ page }) => {
  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/');
  const story = page.locator('[data-photo-story]');
  await story.scrollIntoViewIfNeeded();

  if (page.viewportSize()!.width <= 820) {
    await story.locator('[data-photo-stage]').evaluate((element) => {
      element.scrollLeft = element.clientWidth;
    });
  } else {
    await alignPhotographyToViewport(page);
  }

  await expect(story.locator('.photo-archive-link')).toBeVisible();

  expect(browserErrors).toEqual([]);
});

test('stacks the mobile about content while the avatar changes from monochrome to colour', { tag: '@once' }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const about = page.locator('[data-about-reveal]');
  const avatarFrame = about.locator('.avatar-frame');

  await expect(about.locator('.about-sticky')).toHaveCSS('position', 'relative');

  const contentOrder = await about.evaluate((element) => {
    const copy = element.querySelector('.about-copy')!.getBoundingClientRect();
    const avatar = element.querySelector('.avatar-stage')!.getBoundingClientRect();

    return {
      avatarBeforeCopy: avatar.bottom < copy.top,
    };
  });

  expect(contentOrder).toEqual({ avatarBeforeCopy: true });

  const frameDocumentBottom = await avatarFrame.evaluate(
    (element) => element.getBoundingClientRect().bottom + window.scrollY,
  );
  const scrollFrameBottomToViewportRatio = async (ratio: number) => {
    await page.evaluate(
      ({ frameBottom, targetRatio }) => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, frameBottom - window.innerHeight * targetRatio);
      },
      { frameBottom: frameDocumentBottom, targetRatio: ratio },
    );
  };

  await scrollFrameBottomToViewportRatio(1.05);

  await expect.poll(async () => page.locator('.avatar-progress-value').textContent()).toBe('000%');

  await scrollFrameBottomToViewportRatio(0.99);

  await expect.poll(async () => page.locator('.avatar-progress-value').textContent()).toMatch(/00[01]%/);
  await expect.poll(async () => about.getAttribute('data-reveal-state')).toBe('start');

  await scrollFrameBottomToViewportRatio((0.99 + 0.505) / 2);

  await expect.poll(async () => about.getAttribute('data-reveal-state')).toBe('revealing');
  await expect.poll(async () => page.locator('.avatar-progress-value').textContent()).toMatch(/0(4|5)\d%/);

  await scrollFrameBottomToViewportRatio(0.505);

  await expect.poll(async () => about.getAttribute('data-reveal-state')).toBe('complete');
  await expect(page.locator('.avatar-progress-value')).toHaveText('100%');
  await expect(about.locator('.avatar-scanline')).toHaveCSS('opacity', '0');
});

test('keeps all three mobile contact links on one row', { tag: '@once' }, async ({ page }) => {
  for (const width of [393, 360, 320]) {
    await page.setViewportSize({ width, height: 852 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const metrics = await page.locator('.about-contact-links').evaluate((container) => {
      const bounds = container.getBoundingClientRect();
      const links = Array.from(container.querySelectorAll('a')).map((link) => {
        const rect = link.getBoundingClientRect();
        const spans = Array.from(link.querySelectorAll('span')).map((span) => {
          const spanRect = span.getBoundingClientRect();
          return {
            height: spanRect.height,
            lineHeight: Number.parseFloat(getComputedStyle(span).lineHeight),
          };
        });

        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          spans,
        };
      });

      return {
        containerLeft: bounds.left,
        containerRight: bounds.right,
        links,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

    expect(new Set(metrics.links.map(({ top }) => Math.round(top))).size).toBe(1);
    expect(metrics.links).toHaveLength(3);
    expect(metrics.links[0].left).toBeGreaterThanOrEqual(metrics.containerLeft - 1);
    expect(metrics.links[2].right).toBeLessThanOrEqual(metrics.containerRight + 1);
    expect(metrics.links[0].right).toBeLessThanOrEqual(metrics.links[1].left);
    expect(metrics.links[1].right).toBeLessThanOrEqual(metrics.links[2].left);
    metrics.links.flatMap(({ spans }) => spans).forEach(({ height, lineHeight }) => {
      expect(height).toBeLessThanOrEqual(lineHeight + 1);
    });
    expect(metrics.overflow).toBeLessThanOrEqual(0);
  }
});

test('keeps the desktop avatar reveal tied to the sticky About track', { tag: '@desktop-only' }, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');

  const about = page.locator('[data-about-reveal]');
  const metrics = await about.evaluate((element) => ({
    height: (element as HTMLElement).offsetHeight,
    top: element.getBoundingClientRect().top + window.scrollY,
  }));

  await page.evaluate(({ height, top }) => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, top + (height - window.innerHeight) * 0.5);
  }, metrics);

  await expect.poll(async () => about.getAttribute('data-reveal-state')).toBe('revealing');
  await expect.poll(async () => page.locator('.avatar-progress-value').textContent()).toMatch(/0(4|5)\d%/);
});
