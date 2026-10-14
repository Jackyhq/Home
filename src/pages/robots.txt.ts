import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${siteConfig.url}/sitemap-index.xml`,
      '',
    ].join('\n'),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  );
