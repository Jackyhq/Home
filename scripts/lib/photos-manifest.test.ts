import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFeaturedPhotosSnapshot,
  maximumFeaturedPhotosSnapshotBytes,
  serializeFeaturedPhotosSnapshot,
  supportedPhotosManifestVersion,
} from './photos-manifest';

const makePhoto = (index: number, overrides: Record<string, unknown> = {}) => {
  const id = `photo-${index.toString().padStart(3, '0')}`;
  const outputId = typeof overrides.id === 'string' ? overrides.id : id;
  const dateTaken = new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();
  const lastModified = new Date(Date.UTC(2026, 7, 30, 12, 0, index)).toISOString();

  return {
    id: outputId,
    mediaType: 'photo',
    dateTaken,
    thumbnailUrl: `/thumbnails/${outputId}-640.webp`,
    thumbnailWebpSrcSet: `/thumbnails/${outputId}-360.webp 360w, /thumbnails/${outputId}-640.webp 640w`,
    width: 4032,
    height: 3024,
    lastModified,
    titles: {
      'zh-CN': `相片 ${index}`,
      en: `Photo ${index}`,
    },
    descriptions: {
      'zh-CN': `第 ${index} 张测试相片。`,
      en: `Test photograph ${index}.`,
    },
    originalUrl: `https://private.example.com/${outputId}.jpeg`,
    exif: {
      GPSLatitude: 25.04,
      GPSLongitude: 121.56,
    },
    ...overrides,
  };
};

const makeManifest = (photoCount = 31) => ({
  version: supportedPhotosManifestVersion,
  cameras: {},
  lenses: {},
  data: [
    { id: 'video-001', mediaType: 'video', originalUrl: 'https://private.example.com/video.mp4' },
    ...Array.from({ length: photoCount }, (_, index) => makePhoto(index)),
  ],
});

test('converts manifest v9 into a sorted, privacy-minimized thirty-photo snapshot', () => {
  const snapshot = createFeaturedPhotosSnapshot(makeManifest());

  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.totalPhotos, 31);
  assert.equal(snapshot.items.length, 30);
  assert.equal(snapshot.items[0].id, 'photo-030');
  assert.equal(snapshot.items.at(-1)?.id, 'photo-001');
  assert.equal(snapshot.updatedAt, '2026-08-30T12:00:30.000Z');
  assert.equal(snapshot.items[0].title, '相片 30');
  assert.equal(snapshot.items[0].titleEn, 'Photo 30');
  assert.equal(snapshot.items[0].description, '第 30 张测试相片。');
  assert.equal(snapshot.items[0].descriptionEn, 'Test photograph 30.');
  assert.equal(snapshot.items[0].photoUrl, 'https://photo.jackyw.cn/photos/photo-030/');
  assert.equal(snapshot.items[0].thumbnailUrl, 'https://photo.jackyw.cn/thumbnails/photo-030-640.webp');
  assert.equal(
    snapshot.items[0].thumbnailWebpSrcSet,
    'https://photo.jackyw.cn/thumbnails/photo-030-360.webp 360w, https://photo.jackyw.cn/thumbnails/photo-030-640.webp 640w',
  );

  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes('GPSLatitude'), false);
  assert.equal(serialized.includes('private.example.com'), false);
  assert.equal(serialized.includes('video-001'), false);
});

test('rejects unsupported manifest versions', () => {
  const manifest = { ...makeManifest(), version: 'v10' };

  assert.throws(() => createFeaturedPhotosSnapshot(manifest));
});

test('rejects manifests with fewer than thirty photographs', () => {
  assert.throws(
    () => createFeaturedPhotosSnapshot(makeManifest(29)),
    /at least 30 photographs/,
  );
});

test('rejects duplicate photograph ids across the full manifest', () => {
  const manifest = makeManifest();
  manifest.data[2] = makePhoto(1, { id: 'photo-000' });

  assert.throws(() => createFeaturedPhotosSnapshot(manifest), /duplicate photograph id/);
});

test('rejects thumbnail URLs outside the photography origin', () => {
  const manifest = makeManifest();
  manifest.data[31] = makePhoto(30, {
    thumbnailUrl: 'https://example.com/photo-030-640.webp',
  });

  assert.throws(() => createFeaturedPhotosSnapshot(manifest));
});

test('uses photograph id as the deterministic tie-break for equal capture times', () => {
  const manifest = makeManifest();
  const sharedDate = '2026-08-30T12:00:00.000Z';
  manifest.data[30] = makePhoto(29, { id: 'photo-z', dateTaken: sharedDate });
  manifest.data[31] = makePhoto(30, { id: 'photo-a', dateTaken: sharedDate });

  const snapshot = createFeaturedPhotosSnapshot(manifest);
  assert.deepEqual(snapshot.items.slice(0, 2).map(({ id }) => id), ['photo-a', 'photo-z']);
});

test('rejects protocol-relative srcset candidates outside the photography origin', () => {
  const manifest = makeManifest();
  manifest.data[31] = makePhoto(30, {
    thumbnailWebpSrcSet:
      '//example.com/photo-030-360.webp 360w, /thumbnails/photo-030-640.webp 640w',
  });

  assert.throws(() => createFeaturedPhotosSnapshot(manifest));
});

for (const [name, candidate] of [
  ['an additional original-image width', '/originals/unrelated-private.webp 1280w'],
  ['a zero-padded duplicate width', '/thumbnails/different-photo-640.webp 0640w'],
]) {
  test(`rejects a selected manifest photograph with ${name}`, () => {
    const manifest = makeManifest();
    const photo = makePhoto(30);
    manifest.data[31] = {
      ...photo,
      thumbnailWebpSrcSet: `${photo.thumbnailWebpSrcSet}, ${candidate}`,
    };

    assert.throws(
      () => createFeaturedPhotosSnapshot(manifest),
      /thumbnailWebpSrcSet/,
    );
  });
}

test('uses the available language when one localized title is missing', () => {
  const manifest = makeManifest();
  manifest.data[31] = makePhoto(30, {
    title: '共享标题',
    titles: { 'zh-CN': '中文标题' },
  });

  const snapshot = createFeaturedPhotosSnapshot(manifest);
  assert.equal(snapshot.items[0].title, '中文标题');
  assert.equal(snapshot.items[0].titleEn, '共享标题');
});

test('uses the English title as a deterministic description fallback', () => {
  const manifest = makeManifest();
  manifest.data[31] = makePhoto(30, {
    description: '共享描述',
    descriptions: { 'zh-CN': '中文描述' },
  });

  const snapshot = createFeaturedPhotosSnapshot(manifest);
  assert.equal(snapshot.items[0].description, '中文描述');
  assert.equal(snapshot.items[0].descriptionEn, 'Photograph titled “Photo 30”.');
});

test('rejects a selected photograph that cannot produce non-empty copy', () => {
  const manifest = makeManifest();
  manifest.data[31] = makePhoto(30, {
    title: '',
    description: '',
    titles: {},
    descriptions: {},
  });

  assert.throws(() => createFeaturedPhotosSnapshot(manifest));
});

test('rejects a projected snapshot that exceeds the independent output budget', () => {
  const snapshot = createFeaturedPhotosSnapshot(makeManifest());
  snapshot.items[0].description = 'x'.repeat(maximumFeaturedPhotosSnapshotBytes);

  assert.throws(
    () => serializeFeaturedPhotosSnapshot(snapshot),
    /snapshot exceeds 65536 bytes/,
  );
});
