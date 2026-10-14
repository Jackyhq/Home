import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve('astro/package.json'));
const frontmatterRequire = createRequire(
  astroRequire.resolve('@astrojs/internal-helpers/frontmatter'),
);
const unifontRequire = createRequire(astroRequire.resolve('unifont'));
const checkRequire = createRequire(require.resolve('@astrojs/check'));
const languageServerRequire = createRequire(checkRequire.resolve('@astrojs/language-server'));
const volarRequire = createRequire(languageServerRequire.resolve('volar-service-yaml'));
const yamlLanguageServerRequire = createRequire(volarRequire.resolve('yaml-language-server/package.json'));
const ajvRequire = createRequire(yamlLanguageServerRequire.resolve('ajv'));
const uri = ajvRequire('fast-uri');
const { MockAgent, interceptors } = unifontRequire('undici');

// Exercise the parser resolved by each consumer, including duplicate copies.
const consumers = [
  ['Astro content loader', astroRequire],
  ['Astro frontmatter helper', frontmatterRequire],
] as const;

for (const [consumer, resolveDependency] of consumers) {
  const { load } = resolveDependency('js-yaml') as {
    load: (source: string) => unknown;
  };

  test(`${consumer} bounds repeated sequences of empty YAML merge sources`, () => {
    // 32 × 320 = 10,240 empty merges exceeds the default 10,000-unit budget.
    const source =
      `sources: &sources [${Array(32).fill('{}').join(',')}]\n` +
      'targets:\n' + '  - <<: *sources\n'.repeat(320);

    assert.throws(() => load(source), /maxTotalMergeKeys/);
  });

  test(`${consumer} bounds repeated direct empty YAML merge aliases`, () => {
    const source = 'source: &source {}\ntargets:\n' + '  - <<: *source\n'.repeat(10_001);

    assert.throws(() => load(source), /maxTotalMergeKeys/);
  });

  test(`${consumer} preserves ordinary YAML merges and explicit overrides`, () => {
    const source =
      'defaults: &defaults {title: Still Noticing, locale: en}\n' +
      'page: {<<: *defaults, locale: zh-CN}\n';

    assert.deepEqual(load(source), {
      defaults: { title: 'Still Noticing', locale: 'en' },
      page: { title: 'Still Noticing', locale: 'zh-CN' },
    });
  });
}

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
