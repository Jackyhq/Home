import { z } from 'zod';
import { siteConfig } from '../config/site';

const isTrustedPhotoUrl = (value: string) => {
  try {
    return new URL(value).origin === siteConfig.photoArchiveUrl;
  } catch {
    return false;
  }
};

const trustedPhotoUrlSchema = z.url().refine(isTrustedPhotoUrl, {
  message: `URL must use ${siteConfig.photoArchiveUrl}`,
});

const expectedPhotoUrl = (id: string) =>
  new URL(`/photos/${encodeURIComponent(id)}/`, siteConfig.photoArchiveUrl).href;

const expectedThumbnailUrl = (id: string, width: 360 | 640) =>
  new URL(`/thumbnails/${encodeURIComponent(id)}-${width}.webp`, siteConfig.photoArchiveUrl).href;

const thumbnailUrlSchema = trustedPhotoUrlSchema.refine(
  (value) => /-640\.webp$/i.test(new URL(value).pathname),
  { message: 'thumbnailUrl must point to a 640w WebP image' },
);

const thumbnailWebpSrcSetSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      const descriptors = new Set<string>();
      const candidates = value.split(',').map((candidate) => candidate.trim());

      return (
        candidates.length === 2 &&
        candidates.every((candidate) => {
          const [urlValue, descriptor, ...extra] = candidate.split(/\s+/);
          if (
            !urlValue ||
            extra.length > 0 ||
            (descriptor !== '360w' && descriptor !== '640w')
          ) {
            return false;
          }

          if (descriptors.has(descriptor) || !isTrustedPhotoUrl(urlValue)) {
            return false;
          }

          descriptors.add(descriptor);
          return new URL(urlValue).pathname.endsWith('.webp');
        }) &&
        descriptors.has('360w') &&
        descriptors.has('640w')
      );
    },
    {
      message: `srcset must contain exactly one 360w and one 640w WebP candidate from ${siteConfig.photoArchiveUrl}`,
    },
  );

export const photoSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    titleEn: z.string().min(1),
    description: z.string().min(1),
    descriptionEn: z.string().min(1),
    photoUrl: trustedPhotoUrlSchema,
    thumbnailUrl: thumbnailUrlSchema,
    thumbnailWebpSrcSet: thumbnailWebpSrcSetSchema,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    takenAt: z.iso.datetime(),
  })
  .superRefine(({ id, photoUrl, thumbnailUrl, thumbnailWebpSrcSet }, context) => {
    const candidates = new Map(
      thumbnailWebpSrcSet
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/))
      .filter((candidate): candidate is [string, string] => candidate.length === 2)
      .map(([url, descriptor]) => [descriptor, url]),
    );

    if (photoUrl !== expectedPhotoUrl(id)) {
      context.addIssue({
        code: 'custom',
        message: 'photoUrl must match the photograph id',
        path: ['photoUrl'],
      });
    }

    for (const width of [360, 640] as const) {
      if (candidates.get(`${width}w`) !== expectedThumbnailUrl(id, width)) {
        context.addIssue({
          code: 'custom',
          message: `${width}w srcset candidate must match the photograph id`,
          path: ['thumbnailWebpSrcSet'],
        });
      }
    }

    if (candidates.get('640w') !== thumbnailUrl) {
      context.addIssue({
        code: 'custom',
        message: 'thumbnailUrl must match the 640w srcset candidate',
        path: ['thumbnailUrl'],
      });
    }
  });

export const featuredPhotosSchema = z
  .object({
    version: z.literal(2),
    updatedAt: z.iso.datetime(),
    totalPhotos: z.number().int().nonnegative(),
    items: z.array(photoSchema).length(30),
  })
  .superRefine(({ items, totalPhotos }, context) => {
    if (totalPhotos < items.length) {
      context.addIssue({
        code: 'custom',
        message: 'totalPhotos cannot be smaller than the snapshot item count',
        path: ['totalPhotos'],
      });
    }

    const seenIds = new Set<string>();

    items.forEach((photo, index) => {
      if (seenIds.has(photo.id)) {
        context.addIssue({
          code: 'custom',
          message: `duplicate photo id: ${photo.id}`,
          path: ['items', index, 'id'],
        });
      }
      seenIds.add(photo.id);

      if (index > 0 && Date.parse(photo.takenAt) > Date.parse(items[index - 1].takenAt)) {
        context.addIssue({
          code: 'custom',
          message: 'items must be sorted newest first',
          path: ['items', index, 'takenAt'],
        });
      }
    });
  });

export type FeaturedPhoto = z.infer<typeof photoSchema>;
export type FeaturedPhotos = z.infer<typeof featuredPhotosSchema>;
