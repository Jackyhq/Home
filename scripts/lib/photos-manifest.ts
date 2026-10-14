import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { siteConfig } from '../../src/config/site';
import { featuredPhotosSchema, type FeaturedPhotos } from '../../src/lib/photo-schema';

export const supportedPhotosManifestVersion = 'v9' as const;
export const maximumFeaturedPhotosSnapshotBytes = 64 * 1024;

const manifestRecordSchema = z.looseObject({
  mediaType: z.string(),
});

const photosManifestSchema = z.object({
  version: z.literal(supportedPhotosManifestVersion),
  data: z.array(manifestRecordSchema),
});

const manifestPhotoIndexSchema = z.looseObject({
  id: z.string().trim().min(1),
  mediaType: z.literal('photo'),
  dateTaken: z.iso.datetime(),
  lastModified: z.iso.datetime(),
});

const manifestPhotoSchema = z.object({
  id: z.string().trim().min(1),
  mediaType: z.literal('photo'),
  title: z.string().optional(),
  description: z.string().optional(),
  dateTaken: z.iso.datetime(),
  thumbnailUrl: z.string().trim().min(1),
  thumbnailWebpSrcSet: z.string().trim().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  lastModified: z.iso.datetime(),
  titles: z
    .object({
      'zh-CN': z.string().optional(),
      en: z.string().optional(),
    })
    .optional(),
  descriptions: z
    .object({
      'zh-CN': z.string().optional(),
      en: z.string().optional(),
    })
    .optional(),
});

const toArchiveUrl = (value: string) => new URL(value, `${siteConfig.photoArchiveUrl}/`).href;

const toAbsoluteSrcSet = (value: string) =>
  value
    .split(',')
    .map((candidate) => {
      const [urlValue, descriptor, ...extra] = candidate.trim().split(/\s+/);
      if (!urlValue || !descriptor || extra.length > 0) {
        throw new Error(`Invalid thumbnail srcset candidate: ${candidate}`);
      }

      return `${toArchiveUrl(urlValue)} ${descriptor}`;
    })
    .join(', ');

const firstNonEmpty = (...values: Array<string | undefined>) =>
  values.map((value) => value?.trim()).find((value): value is string => Boolean(value));

export const createFeaturedPhotosSnapshot = (input: unknown): FeaturedPhotos => {
  const manifest = photosManifestSchema.parse(input);
  const photos = manifest.data
    .filter((record) => record.mediaType === 'photo')
    .map((record) => manifestPhotoIndexSchema.parse(record));

  if (photos.length < 30) {
    throw new Error(`Photos manifest must contain at least 30 photographs; received ${photos.length}.`);
  }

  const photoIds = new Set<string>();
  for (const photo of photos) {
    if (photoIds.has(photo.id)) {
      throw new Error(`Photos manifest contains a duplicate photograph id: ${photo.id}.`);
    }
    photoIds.add(photo.id);
  }

  const latestPhotos = [...photos]
    .sort((left, right) => {
      const dateDifference = Date.parse(right.dateTaken) - Date.parse(left.dateTaken);
      if (dateDifference) return dateDifference;
      if (left.id < right.id) return -1;
      if (left.id > right.id) return 1;
      return 0;
    })
    .slice(0, 30)
    .map((photo) => manifestPhotoSchema.parse(photo));

  const updatedAt = new Date(
    Math.max(...photos.map((photo) => Date.parse(photo.lastModified))),
  ).toISOString();

  return featuredPhotosSchema.parse({
    version: 2,
    updatedAt,
    totalPhotos: photos.length,
    items: latestPhotos.map((photo) => {
      const title = firstNonEmpty(photo.titles?.['zh-CN'], photo.title, photo.titles?.en);
      const titleEn = firstNonEmpty(photo.titles?.en, photo.title, photo.titles?.['zh-CN']);

      return {
        id: photo.id,
        title,
        titleEn,
        description: firstNonEmpty(
          photo.descriptions?.['zh-CN'],
          photo.description,
          photo.descriptions?.en,
          title,
        ),
        descriptionEn:
          firstNonEmpty(photo.descriptions?.en) ??
          (titleEn ? `Photograph titled “${titleEn}”.` : undefined),
        photoUrl: new URL(`/photos/${encodeURIComponent(photo.id)}/`, siteConfig.photoArchiveUrl).href,
        thumbnailUrl: toArchiveUrl(photo.thumbnailUrl),
        thumbnailWebpSrcSet: toAbsoluteSrcSet(photo.thumbnailWebpSrcSet),
        width: photo.width,
        height: photo.height,
        takenAt: photo.dateTaken,
      };
    }),
  });
};

export const serializeFeaturedPhotosSnapshot = (input: unknown) => {
  const snapshot = featuredPhotosSchema.parse(input);
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  const byteLength = Buffer.byteLength(serialized, 'utf8');

  if (byteLength > maximumFeaturedPhotosSnapshotBytes) {
    throw new Error(
      `Featured photos snapshot exceeds ${maximumFeaturedPhotosSnapshotBytes} bytes; received ${byteLength}.`,
    );
  }

  return serialized;
};
