import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve('astro/package.json'));
const { parseYaml } = astroRequire('@astrojs/internal-helpers/yaml');
const { parseFrontmatter } = astroRequire('@astrojs/internal-helpers/frontmatter');
const unifontRequire = createRequire(astroRequire.resolve('unifont'));
const checkRequire = createRequire(require.resolve('@astrojs/check'));
const languageServerRequire = createRequire(checkRequire.resolve('@astrojs/language-server'));
const volarRequire = createRequire(languageServerRequire.resolve('volar-service-yaml'));
const yamlLanguageServerRequire = createRequire(volarRequire.resolve('yaml-language-server/package.json'));
const ajvRequire = createRequire(yamlLanguageServerRequire.resolve('ajv'));
const uri = ajvRequire('fast-uri');
const { MockAgent, interceptors } = unifontRequire('undici');

// Astro's file loader and frontmatter now share the internal YAML parser.
const consumers = [
  ['Astro content YAML parser', parseYaml],
  ['Astro frontmatter helper', (source: string) => parseFrontmatter(`---\n${source}---\n`).frontmatter],
] as const;

for (const [consumer, parse] of consumers) {
  test(`${consumer} bounds nested YAML sequence aliases`, () => {
    const source =
      'a: &a [x, x, x, x, x, x, x, x, x, x]\n' +
      `b: &b [${Array(10).fill('*a').join(',')}]\n` +
      `c: [${Array(10).fill('*b').join(',')}]\n`;

    assert.throws(() => parse(source), /Excessive alias count/);
  });

  test(`${consumer} bounds nested YAML merge aliases`, () => {
    const source =
      'a: &a {key: value}\n' +
      `b: &b {<<: [${Array(10).fill('*a').join(',')}]}\n` +
      `c: {<<: [${Array(10).fill('*b').join(',')}]}\n`;

    assert.throws(() => parse(source), /Excessive alias count/);
  });

  test(`${consumer} rejects malformed YAML`, () => {
    assert.throws(() => parse('items: [unterminated\n'), { name: 'YAMLParseError' });
  });

  test(`${consumer} preserves ordinary YAML merges and explicit overrides`, () => {
    const source =
      'defaults: &defaults {title: Still Noticing, locale: en}\n' +
      'page: {<<: *defaults, locale: zh-CN}\n';

    assert.deepEqual(parse(source), {
      defaults: { title: 'Still Noticing', locale: 'en' },
      page: { title: 'Still Noticing', locale: 'zh-CN' },
    });
  });
}

const remoteImages = () => import(pathToFileURL(
  astroRequire.resolve('./dist/assets/build/remote.js'),
).href);
const imageURL = 'https://dependency-test.invalid/photo.png';
const imageConfig = { domains: ['dependency-test.invalid'], remotePatterns: [] };

for (const [label, headers] of [
  ['private', { 'cache-control': 'private, max-age=3600' }],
  ['no-store', { 'cache-control': 'no-store, max-age=3600' }],
  ['no-cache', { 'cache-control': 'no-cache, max-age=3600' }],
  ['cookie', { 'set-cookie': 'session=example', 'cache-control': 'max-age=3600' }],
  ['proxy-revalidate', { 'cache-control': 'proxy-revalidate, max-age=0' }],
] as const) {
  test(`Astro remote images do not retain a reusable TTL for ${label} responses`, async () => {
    const { loadRemoteImage } = await remoteImages();
    const result = await loadRemoteImage(imageURL, async () => new Response('image', { headers }), imageConfig);

    assert.ok(result.expires <= Date.now());
    assert.equal(result.data.toString(), 'image');
  });
}

test('Astro remote images preserve ordinary public caching', async () => {
  const { loadRemoteImage } = await remoteImages();
  const started = Date.now();
  const result = await loadRemoteImage(imageURL, async () => new Response('image', {
    headers: { 'cache-control': 'public, max-age=3600', etag: '"photo"' },
  }), imageConfig);

  assert.ok(result.expires >= started + 3_590_000);
  assert.ok(result.expires <= Date.now() + 3_600_000);
  assert.equal(result.data.toString(), 'image');
  assert.equal(result.etag, '"photo"');
});

test('Astro remote image revalidation forwards only validators and preserves a 304 result', async () => {
  const { revalidateRemoteImage } = await remoteImages();
  const validators = { etag: '"photo"', lastModified: 'Wed, 21 Oct 2026 10:00:00 GMT' };
  let requests = 0;
  const result = await revalidateRemoteImage(imageURL, validators, async (request: Request) => {
    requests += 1;
    assert.equal(request.url, imageURL);
    assert.deepEqual(Object.fromEntries(request.headers), {
      'if-modified-since': validators.lastModified,
      'if-none-match': validators.etag,
    });
    return new Response(null, { status: 304, headers: { 'cache-control': 'public, max-age=3600' } });
  }, imageConfig);

  assert.equal(requests, 1);
  assert.equal(result.data, null);
  assert.equal(result.etag, validators.etag);
  assert.equal(result.lastModified, validators.lastModified);
});

test('AJV URI resolver rejects malformed bracket hosts during parsing and resolution', () => {
  for (const reference of ['http://[example.com/app', 'http://[127.0.0.1/app', '//[example.com/app']) {
    assert.equal(uri.parse(reference).error, 'URI host is malformed.');
    assert.throws(() => uri.resolve('https://trusted.example/', reference), /URI host is malformed/);
  }
});

test('AJV URI resolver rejects ports that inject a different authority', () => {
  for (const port of ['@127.0.0.1:8124', '80/redirect', '80?query']) {
    assert.throws(() => uri.serialize({
      scheme: 'http', host: 'trusted.example', port, path: '/app',
    }));
  }
});

test('AJV URI resolver normalizes encoded host case in scheme-relative references', () => {
  for (const reference of ['//%41.com/app', '//%61.COM/app']) {
    assert.equal(uri.parse(reference).host, 'a.com');
    assert.equal(uri.equal(reference, '//a.com/app'), true);
  }
});

test('AJV URI resolver preserves ordinary domains, IPv6 and numeric ports', () => {
  for (const host of ['trusted.example', '::1']) {
    const serialized = uri.serialize({ scheme: 'https', host, port: 8443, path: '/app' });
    assert.equal(uri.parse(serialized).host, host);
    assert.equal(uri.parse(serialized).port, 8443);
    assert.equal(uri.parse(serialized).error, undefined);
  }
});

for (const [label, payload, shouldReject] of [
  ['oversized', '123456', true],
  ['within limit', '123', false],
] as const) {
  test(`Unifont HTTP client handles ${label} chunked bodies without silent truncation`, async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    agent.get('https://dependency-test.invalid').intercept({ path: '/', method: 'GET' })
      .reply(200, payload, { headers: { 'transfer-encoding': 'chunked' } });
    const dispatcher = agent.compose(interceptors.dump({ maxSize: 4 }));
    const request = async () => {
      const { body } = await dispatcher.request({
        origin: 'https://dependency-test.invalid', path: '/', method: 'GET',
      });
      return body.text();
    };
    try {
      if (shouldReject) {
        await assert.rejects(request, { code: 'UND_ERR_ABORTED' });
      } else {
        // The dump interceptor intentionally discards a successfully bounded body.
        assert.equal(await request(), '');
      }
      agent.assertNoPendingInterceptors();
    } finally {
      await agent.close();
    }
  });
}

for (const serializer of ['stringify', 'uneval'] as const) {
  test(`Astro devalue ${serializer} excludes bytes outside a Node Buffer`, async () => {
    const devalue = await import(astroRequire.resolve('devalue'));
    const backing = new Uint8Array([99, 1, 2, 88]);
    const view = Buffer.from(backing.buffer, 1, 2);
    const serialized = devalue[serializer](view);
    const restored = serializer === 'stringify'
      ? devalue.parse(serialized)
      : runInNewContext(serialized);

    assert.deepEqual(Array.from(restored), [1, 2]);
    assert.deepEqual(Array.from(new Uint8Array(restored.buffer)), [1, 2]);
    assert.deepEqual(Array.from(backing), [99, 1, 2, 88]);
  });
}

test('Astro devalue preserves ordinary data and shared references', async () => {
  const { stringify, parse } = await import(astroRequire.resolve('devalue'));
  const shared = { title: 'Still Noticing', locale: 'zh-CN' };
  const source = { first: shared, second: shared, bytes: new Uint8Array([1, 2]) };
  const restored = parse(stringify(source));

  assert.deepEqual(restored, source);
  assert.equal(restored.first, restored.second);
});
