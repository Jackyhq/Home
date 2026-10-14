import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import copyOverrides from '../src/data/featured-photo-copy-overrides.json';
import { siteConfig } from '../src/config/site';
import { featuredPhotosSchema } from '../src/lib/photo-schema';
import { readTextBodyWithLimit, ResponseSizeError } from './lib/read-limited-response';
import {
  createFeaturedPhotosSnapshot,
  serializeFeaturedPhotosSnapshot,
} from './lib/photos-manifest';

const defaultSourceUrl = `${siteConfig.photoArchiveUrl}/photos-manifest.json`;
const sourceUrl = process.env.PHOTOS_MANIFEST_URL?.trim() || defaultSourceUrl;
const destination = resolve('src/data/featured-photos.json');
const temporary = `${destination}.tmp`;
const requestTimeoutMs = 20_000;
const maximumResponseBytes = 5 * 1024 * 1024;
const photoCopyOverrides: Record<
  string,
  { title?: string; titleEn?: string; description?: string; descriptionEn?: string }
> = copyOverrides;

const parsedSourceUrl = new URL(sourceUrl);
if (parsedSourceUrl.protocol !== 'https:') {
  throw new Error('Photo sync failed: PHOTOS_MANIFEST_URL must use HTTPS.');
}

const response = await fetch(sourceUrl, {
  headers: { accept: 'application/json' },
  signal: AbortSignal.timeout(requestTimeoutMs),
}).catch((error: unknown) => {
  throw new Error(`Photo sync failed: unable to download ${sourceUrl}.`, { cause: error });
});

if (!response.ok) {
  throw new Error(`Photo sync failed: ${response.status} ${response.statusText}`);
}

if (new URL(response.url).protocol !== 'https:') {
  throw new Error('Photo sync failed: the final response URL must use HTTPS.');
}

const contentType = response.headers.get('content-type') ?? '';
if (!/^application\/(?:[\w.+-]*\+)?json(?:\s*;|$)/i.test(contentType)) {
  throw new Error(`Photo sync failed: expected JSON but received ${contentType || 'no Content-Type'}.`);
}

let responseText: string;
try {
  responseText = await readTextBodyWithLimit(response, maximumResponseBytes);
} catch (error) {
  if (error instanceof ResponseSizeError) {
    throw new Error(`Photo sync failed: response exceeds ${maximumResponseBytes} bytes.`, {
      cause: error,
    });
  }
  throw new Error('Photo sync failed: unable to read the response body.', { cause: error });
}

let downloaded: ReturnType<typeof featuredPhotosSchema.parse>;
try {
  const json = JSON.parse(responseText);
  downloaded = createFeaturedPhotosSnapshot(json);
} catch (error) {
  throw new Error('Photo sync failed: the photos manifest cannot produce a valid featured snapshot.', {
    cause: error,
  });
}

let appliedOverrideCount = 0;
const parsed = featuredPhotosSchema.parse({
  ...downloaded,
  items: downloaded.items.map((photo) => {
    const override = photoCopyOverrides[photo.id];
    if (!override) return photo;

    appliedOverrideCount += 1;
    return { ...photo, ...override };
  }),
});

const downloadedIds = new Set(downloaded.items.map(({ id }) => id));
const staleOverrideIds = Object.keys(photoCopyOverrides).filter((id) => !downloadedIds.has(id));
if (staleOverrideIds.length > 0) {
  console.warn(`Photo sync warning: ${staleOverrideIds.length} copy override(s) did not match: ${staleOverrideIds.join(', ')}`);
}

let serializedSnapshot: string;
try {
  serializedSnapshot = serializeFeaturedPhotosSnapshot(parsed);
} catch (error) {
  throw new Error('Photo sync failed: the projected snapshot exceeds its output contract.', {
    cause: error,
  });
}

await mkdir(dirname(destination), { recursive: true });
try {
  await writeFile(temporary, serializedSnapshot, 'utf8');
  await rename(temporary, destination);
} catch (error) {
  await rm(temporary, { force: true });
  throw error;
}

console.log(
  `Synced ${parsed.items.length} photographs from ${sourceUrl} to ${destination}; applied ${appliedOverrideCount} copy override(s).`,
);
