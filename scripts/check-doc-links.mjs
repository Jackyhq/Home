import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const documentationRoots = [
  'README.md',
  'AGENTS.md',
  'NOTICE.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs',
];

const collectMarkdownFiles = async (path) => {
  const absolutePath = resolve(repositoryRoot, path);
  if (extname(absolutePath) === '.md') return [absolutePath];

  const entries = await readdir(absolutePath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? collectMarkdownFiles(resolve(path, entry.name))
        : extname(entry.name) === '.md'
          ? [resolve(absolutePath, entry.name)]
          : [],
    ),
  );
  return nested.flat();
};

const files = (await Promise.all(documentationRoots.map(collectMarkdownFiles))).flat();
const failures = [];
const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const file of files) {
  const contents = await readFile(file, 'utf8');

  for (const match of contents.matchAll(markdownLink)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '').split(/\s+["']/)[0];
    if (!rawTarget || rawTarget.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(rawTarget)) continue;

    const localTarget = decodeURIComponent(rawTarget.split('#')[0].split('?')[0]);
    const absoluteTarget = resolve(dirname(file), localTarget);

    try {
      await access(absoluteTarget);
    } catch {
      failures.push(`${file.slice(repositoryRoot.length + 1)} -> ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Broken local documentation links:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} Markdown files; all local links resolve.`);
}
