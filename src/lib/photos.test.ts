import assert from 'node:assert/strict';
import test from 'node:test';
import { featuredPhotosSchema, photoSchema } from './photo-schema';
import { featuredPhotos } from './photos';

const hasIssueAt = (issues: { path: PropertyKey[] }[], expectedPath: PropertyKey[]) =>
  issues.some(({ path }) => path.join('.') === expectedPath.join('.'));

test('accepts the committed featured-photo snapshot', () => {
  assert.equal(featuredPhotosSchema.safeParse(featuredPhotos).success, true);
  assert.equal(featuredPhotos.items.every(({ descriptionEn }) => descriptionEn.length > 20), true);
});

test('rejects thumbnail srcsets that leave the trusted photo origin', () => {
  const photo = {
    ...featuredPhotos.items[0],
    thumbnailWebpSrcSet: 'https://example.com/photo-360.webp 360w',
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

test('rejects a non-WebP default thumbnail', () => {
  const photo = {
    ...featuredPhotos.items[0],
    thumbnailUrl: 'https://photo.jackyw.cn/thumbnails/photo.jpg',
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

test('rejects a WebP default thumbnail without the 640w suffix', () => {
  const photo = {
    ...featuredPhotos.items[0],
    thumbnailUrl: 'https://photo.jackyw.cn/thumbnails/photo.webp',
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

test('rejects a default thumbnail that differs from the 640w srcset candidate', () => {
  const photo = {
    ...featuredPhotos.items[0],
    thumbnailUrl: 'https://photo.jackyw.cn/thumbnails/other-640.webp',
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

test('rejects responsive thumbnails that belong to another photograph', () => {
  const photo = {
    ...featuredPhotos.items[0],
    thumbnailWebpSrcSet: [
      'https://photo.jackyw.cn/thumbnails/different-photo-360.webp 360w',
      featuredPhotos.items[0].thumbnailUrl + ' 640w',
    ].join(', '),
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

test('rejects a detail URL that belongs to another photograph', () => {
  const photo = {
    ...featuredPhotos.items[0],
    photoUrl: 'https://photo.jackyw.cn/photos/different-photo/',
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

test('rejects thumbnail srcsets missing a required width', () => {
  const photo = {
    ...featuredPhotos.items[0],
    thumbnailWebpSrcSet: 'https://photo.jackyw.cn/thumbnails/photo-360.webp 360w',
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

test('rejects duplicate srcset width descriptors', () => {
  const photo = {
    ...featuredPhotos.items[0],
    thumbnailWebpSrcSet: [
      'https://photo.jackyw.cn/thumbnails/photo-a.webp 360w',
      'https://photo.jackyw.cn/thumbnails/photo-b.webp 360w',
      'https://photo.jackyw.cn/thumbnails/photo-c.webp 640w',
    ].join(', '),
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

for (const [name, candidate] of [
  ['an additional original-image width', 'https://photo.jackyw.cn/originals/unrelated-private.webp 1280w'],
  ['a zero-padded duplicate width', 'https://photo.jackyw.cn/thumbnails/different-photo-640.webp 0640w'],
]) {
  test(`rejects srcsets with ${name}`, () => {
    const photo = {
      ...featuredPhotos.items[0],
      thumbnailWebpSrcSet: `${featuredPhotos.items[0].thumbnailWebpSrcSet}, ${candidate}`,
    };
    const result = photoSchema.safeParse(photo);

    assert.equal(result.success, false);
    assert.equal(!result.success && hasIssueAt(result.error.issues, ['thumbnailWebpSrcSet']), true);
  });
}

test('rejects non-WebP srcset candidates', () => {
  const photo = {
    ...featuredPhotos.items[0],
    thumbnailWebpSrcSet: [
      'https://photo.jackyw.cn/thumbnails/photo-360.jpg 360w',
      'https://photo.jackyw.cn/thumbnails/photo-640.webp 640w',
    ].join(', '),
  };

  assert.equal(photoSchema.safeParse(photo).success, false);
});

test('rejects duplicate photo ids', () => {
  const snapshot = structuredClone(featuredPhotos);
  snapshot.items[1].id = snapshot.items[0].id;
  const result = featuredPhotosSchema.safeParse(snapshot);

  assert.equal(result.success, false);
  assert.equal(!result.success && hasIssueAt(result.error.issues, ['items', 1, 'id']), true);
});

test('rejects snapshots that are not sorted newest first', () => {
  const snapshot = structuredClone(featuredPhotos);
  [snapshot.items[0], snapshot.items[1]] = [snapshot.items[1], snapshot.items[0]];
  const result = featuredPhotosSchema.safeParse(snapshot);

  assert.equal(result.success, false);
  assert.equal(!result.success && hasIssueAt(result.error.issues, ['items', 1, 'takenAt']), true);
});

test('rejects totals smaller than the snapshot', () => {
  const snapshot = { ...featuredPhotos, totalPhotos: featuredPhotos.items.length - 1 };
  const result = featuredPhotosSchema.safeParse(snapshot);

  assert.equal(result.success, false);
  assert.equal(!result.success && hasIssueAt(result.error.issues, ['totalPhotos']), true);
});
