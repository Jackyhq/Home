import { execFileSync } from 'node:child_process';
import { siteConfig } from '../config/site';

const commitPattern = /^[0-9a-f]{7,64}$/i;

const resolveCommitSha = () => {
  const environmentCandidates = [
    process.env.GITHUB_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.CF_PAGES_COMMIT_SHA,
    process.env.COMMIT_SHA,
  ];

  for (const candidate of environmentCandidates) {
    const normalized = candidate?.trim();

    if (normalized && commitPattern.test(normalized)) {
      return normalized.toLowerCase();
    }
  }

  try {
    const localCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (commitPattern.test(localCommit)) {
      return localCommit.toLowerCase();
    }
  } catch {
    // The explicit error below keeps an invalid commit link out of production.
  }

  throw new Error('Unable to resolve the source commit SHA for the site footer.');
};

const getShanghaiDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('zh-CN-u-nu-latn', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
  };
};

export const getBuildMetadata = (buildTime = new Date()) => {
  const commitSha = resolveCommitSha();
  const shortCommitSha = commitSha.slice(0, 6);
  const { year, month, day } = getShanghaiDateParts(buildTime);
  const buildDateIso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  return {
    buildYear: year,
    buildDateIso,
    buildDateLabel: `${year}年${month}月${day}日`,
    commitSha,
    shortCommitSha,
    commitUrl: `${siteConfig.repositoryUrl}/commit/${commitSha}`,
  };
};
