import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4179';
const devPort = new URL(baseURL).port || '4179';
const shouldStartWebServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : process.env.PW_VERBOSE
      ? 'list'
      : 'dot',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: 'mobile',
      grepInvert: /@desktop-only|@once/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: `node scripts/serve-dist.mjs ${devPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
