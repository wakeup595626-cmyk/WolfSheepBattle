import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..', '..');
const officialAppId = 'wxfbd176abc5b3911c';
const retiredAppIds = new Set([
  'wx2e96cd6c921411a9',
  'wx6ac3f5090a6b99c5',
]);

function readJson(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function collectAppIds(value, result = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectAppIds(item, result);
    return result;
  }
  if (!value || typeof value !== 'object') return result;

  for (const [key, item] of Object.entries(value)) {
    if (/^appid$/i.test(key) && typeof item === 'string') {
      result.push(item);
    } else {
      collectAppIds(item, result);
    }
  }
  return result;
}

function parseBgmStatuses(markdown) {
  return markdown
    .split(/^##\s+/m)
    .filter((section) => /^\d+\.\s/.test(section))
    .map((section) => {
      const heading = section.match(/^([^\r\n]+)/)?.[1]?.trim() ?? '未命名曲目';
      const id = section.match(/^- 曲目ID：`?([^`\r\n]+)`?\s*$/m)?.[1]?.trim();
      const status = section.match(/^- RELEASE STATUS：([A-Z_]+)\s*$/m)?.[1]?.trim();
      return { heading, id: id ?? null, status: status ?? null };
    });
}

const identity = readJson('tools/release/release_identity.json');
const projectConfig = readJson('project.config.json');
const wechatProfile = readJson('profiles/v2/packages/wechatgame.json');
const audioRecord = fs.readFileSync(
  path.join(projectRoot, 'THIRD_PARTY_AUDIO.md'),
  'utf8',
);

const activeAppIds = [
  ...collectAppIds(projectConfig),
  ...collectAppIds(wechatProfile),
];
const bgmTracks = parseBgmStatuses(audioRecord);
const expectedBgmIds = new Set(['cheerful_lighthearted', 'cyberwave_upbeat']);
const checks = [
  {
    name: 'release_identity_official_appid',
    passed: identity.officialAppId === officialAppId,
    detail: identity.officialAppId,
  },
  {
    name: 'active_configs_use_official_appid',
    passed:
      activeAppIds.length > 0 &&
      activeAppIds.every((appId) => appId === officialAppId),
    detail: activeAppIds,
  },
  {
    name: 'active_configs_exclude_retired_appids',
    passed: activeAppIds.every((appId) => !retiredAppIds.has(appId)),
    detail: [...retiredAppIds],
  },
  {
    name: 'formal_bgm_inventory_complete',
    passed:
      bgmTracks.length === expectedBgmIds.size &&
      bgmTracks.every((track) => track.id && expectedBgmIds.has(track.id)),
    detail: bgmTracks,
  },
  {
    name: 'all_formal_bgm_verified',
    passed:
      bgmTracks.length > 0 &&
      bgmTracks.every((track) => track.status === 'VERIFIED'),
    detail: bgmTracks,
  },
];

const failedChecks = checks.filter((check) => !check.passed);
const result = {
  status: failedChecks.length === 0 ? 'READY' : 'BLOCKED',
  checkedAt: new Date().toISOString(),
  identity: {
    gameName: identity.gameName,
    developmentVersion: identity.developmentVersion,
    auditBatch: identity.auditBatch,
    officialAppId: identity.officialAppId,
  },
  activeAppIds,
  bgmTracks,
  checks,
  failedChecks: failedChecks.map((check) => check.name),
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = failedChecks.length === 0 ? 0 : 1;
