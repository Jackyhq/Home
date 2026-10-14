import type { BrowserContext, Page } from '@playwright/test';

const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X9W0WQAAAABJRU5ErkJggg==',
  'base64',
);

export const mockExternalRequests = async (context: BrowserContext) => {
  const thumbnailRequests: string[] = [];
  const analyticsRequests: string[] = [];

  await context.route('https://photo.jackyw.cn/thumbnails/**', async (route) => {
    thumbnailRequests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPixel });
  });
  await context.route('https://www.googletagmanager.com/**', async (route) => {
    analyticsRequests.push(route.request().url());
    await route.abort();
  });

  return { thumbnailRequests, analyticsRequests };
};

// Keep the simulated hostname in the browser while serving its assets from the test server.
export const mapSiteOrigin = async (page: Page, sourceBaseURL: string, targetOrigin: string) => {
  await page.route(`${targetOrigin}/**`, async (route) => {
    const requestedURL = new URL(route.request().url());
    const sourceURL = new URL(`${requestedURL.pathname}${requestedURL.search}`, sourceBaseURL);
    const response = await route.fetch({ url: sourceURL.href });
    await route.fulfill({ response });
  });
};
