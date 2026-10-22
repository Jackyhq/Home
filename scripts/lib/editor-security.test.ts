import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve('astro/package.json'));
const viteRequire = createRequire(astroRequire.resolve('vite/package.json'));
const bundle = readFileSync(path.join(path.dirname(viteRequire.resolve('vite')), 'chunks/node.js'), 'utf8');

// Vite embeds launch-editor instead of exposing it as an importable dependency.
// Execute its bundled helpers with platform substitutes; never launch an editor.
function editorHelper(file: string, factory: string, platform = 'win32') {
  const marker = `/node_modules/launch-editor/${file}\n`;
  const start = bundle.indexOf(marker);
  assert.ok(start >= 0, `Vite must include launch-editor/${file}`);
  const end = bundle.indexOf('//#endregion', start);
  assert.ok(end > start);
  const source = bundle.slice(start + marker.length, end);
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const cwd = platform === 'win32' ? 'C:\\project' : '/mnt/c/project';

  return runInNewContext(`${source}\n${factory}()`, {
    __commonJSMin: (initialize: (exports: object, module: { exports: unknown }) => void) => () => {
      const module = { exports: {} };
      initialize(module.exports, module);
      return module.exports;
    },
    __require: (name: string) => {
      if (name === 'path') return {
        ...paths,
        resolve: (...parts: string[]) => paths.resolve(cwd, ...parts),
        relative: (from: string, to: string) => paths.relative(from || cwd, to),
      };
      if (name === 'os') return { release: () => 'Microsoft WSL' };
      if (name === 'url') return { fileURLToPath: (value: string) => new URL(value).pathname.slice(1).replaceAll('/', '\\') };
      throw new Error(`Unexpected editor helper dependency: ${name}`);
    },
    process: { platform, env: {} },
  });
}

test('Vite bundled editor rejects Windows shell expansion and line breaks', () => {
  const command = editorHelper('construct-windows-launch-command.js', 'require_construct_windows_launch_command');

  for (const argument of ['C:\\project\\%PAYLOAD%.astro', '%PAYLOAD%&echo injected', 'file\r\ncommand']) {
    assert.throws(() => command('code', [argument]), /Cannot launch an editor/);
  }
  assert.equal(command('code', ['C:\\project\\photo album.astro']), 'code "C:\\project\\photo album.astro"');
});

test('Vite bundled editor normalizes Windows parent segments after extracting positions', () => {
  const parse = editorHelper('parse-file.js', 'require_parse_file');

  for (const input of ['C:\\project\\missing\\..:1:2', 'C:\\project\\%PAYLOAD%\\..:1:2']) {
    assert.deepEqual({ ...parse(input) }, { fileName: 'C:\\project', lineNumber: '1', columnNumber: '2' });
  }
  assert.deepEqual({ ...parse('C:\\project\\example.astro:12:3') }, {
    fileName: 'C:\\project\\example.astro', lineNumber: '12', columnNumber: '3',
  });
});

test('Vite bundled editor keeps WSL filenames separate from editor flags', () => {
  const args = editorHelper('get-args.js', 'require_get_args', 'linux');

  for (const editor of ['vim', 'emacs', 'notepad++']) {
    for (const file of ['+command.astro', '-command.astro']) {
      assert.equal(args(editor, file, '12', '3').at(-1), `./${file}`);
    }
  }
  assert.deepEqual([...args('vim', 'src/example.astro', '12', '3')], [
    '+call cursor(12, 3)', './src/example.astro',
  ]);
});
