import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-polish03-ui13-audio04-tutorial07/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8793';
const VERSION = 'v1.3.0-dev-polish03-ui13-audio04-tutorial07';
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
const AUDIO_KEY = 'wolf-sheep-battle.audio-settings.v1';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details) => checks.push({ passed: Boolean(passed), name, details });
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const controllerSource = read('assets', 'scripts', 'GameController.ts');
const audioSource = read('assets', 'scripts', 'AudioManager.ts');
const artSource = read('assets', 'scripts', 'art', 'ArtPilotConfig.ts');

check(controllerSource.includes(`const GAME_VERSION = '${VERSION}';`)
    && controllerSource.includes(`const DEVELOPMENT_BATCH = '${VERSION}';`)
    && controllerSource.includes(`const REQUESTED_TASK_ID = '${VERSION}';`),
    'static/version-identity');
check(controllerSource.includes('const LEVEL_ONE_TUTORIAL_VERSION = 7;')
    && controllerSource.includes('completedLevels.has(1) ? LEVEL_ONE_TUTORIAL_VERSION'),
    'static/tutorial07-safe-migration');
check(controllerSource.includes('const UNIT_CARD_HEIGHT = 100;')
    && controllerSource.includes('const UNIT_CARD_GAP = 10;')
    && controllerSource.includes('const portraitWidth = Math.round(cardWidth * 0.4);')
    && controllerSource.includes('const statusWidth = Math.max(32, Math.min(52, Math.round(cardWidth * 0.24)));')
    && controllerSource.includes('button.label.horizontalAlign = HorizontalTextAlignment.LEFT;')
    && controllerSource.includes('button.tierBadgeNode.active = !button.artSprite;')
    && controllerSource.includes('`${tier.displayName.sheep}\\n${definition.cost}\\u80FD\\u91CF`'),
    'static/card-layout-and-copy');
check(controllerSource.includes("'UnitCardBackgroundSprite'")
    && controllerSource.includes('unitCardKeys[type]')
    && controllerSource.includes('cardSize.height,') && controllerSource.includes('false,')
    && controllerSource.includes('this.createButton(this.unitCardSidebar, `TypeButton${type}`'),
    'static/full-card-touch-and-simple-sprite');
check(controllerSource.includes('const PAUSE_ACTION_BUTTON_HEIGHT = 76;')
    && controllerSource.includes("'PauseTitle', '\\u6E38\\u620F\\u5DF2\\u6682\\u505C', 0, 291")
    && controllerSource.includes("'ResumeButton', '\\u7EE7\\u7EED\\u6218\\u6597', -PAUSE_ACTION_COLUMN_X, 195")
    && controllerSource.includes("'HelpButton', '\\u73A9\\u6CD5\\u8BF4\\u660E', -PAUSE_ACTION_COLUMN_X, 103")
    && controllerSource.includes('this.createBgmTrackSelector(this.pauseContentRoot, -46);')
    && controllerSource.includes("'MusicVolume',") && controllerSource.includes('-186,'),
    'static/pause-vertical-layout');
check(audioSource.includes('const AUDIO_SETTINGS_SCHEMA_VERSION = 3;')
    && audioSource.includes('const LEGACY_DEFAULT_VOLUME = 0.8;')
    && audioSource.includes('const DEFAULT_MUSIC_VOLUME = 1;')
    && audioSource.includes('const DEFAULT_SFX_VOLUME = 1;')
    && audioSource.includes('legacyDefaultVolumeMigrationApplied'), 'static/audio100-default-and-marker');
check(controllerSource.includes('新玩家音乐与音效初始均为100%')
    && controllerSource.includes('请点击当前未选中的另一张音乐卡')
    && controllerSource.includes('请点击音乐音量行的减号')
    && controllerSource.includes('this.musicVolumeControl.trackNode')
    && controllerSource.includes('return this.tutorialBgmSwitched && this.tutorialMusicVolumeAdjusted;'),
    'static/tutorial-audio-real-guidance');

const cardFiles = ['small', 'medium', 'large', 'giant'].map((type) => path.join(
    ROOT, 'assets', 'bundles', 'art_units', 'ui', 'unit_cards', type, `unit_card_${type}_runtime_v01.png`));
const pngInfo = cardFiles.map((file) => {
    const data = fs.readFileSync(file);
    return {
        file: path.relative(ROOT, file),
        width: data.readUInt32BE(16),
        height: data.readUInt32BE(20),
        bitDepth: data[24],
        colorType: data[25],
        bytes: data.length,
        sha256: crypto.createHash('sha256').update(data).digest('hex'),
    };
});
check(pngInfo.every((item) => item.width === 768 && [461, 462].includes(item.height)
    && item.bitDepth === 8 && item.colorType === 6), 'art/runtime-png-rgba-dimensions', pngInfo);
check(new Set(pngInfo.map((item) => item.sha256)).size === 4
    && pngInfo.every((item) => item.bytes > 100000), 'art/four-distinct-nontrivial-files', pngInfo);
check(["small/unit_card_small')", "medium/unit_card_medium')",
    "large/unit_card_large')", "giant/unit_card_giant')"]
    .every((fragment) => artSource.includes(fragment))
    && ['battle-core\', 768, 461', 'battle-core\', 768, 462'].every((fragment) => artSource.includes(fragment)),
    'static/art-config-runtime-paths-and-dimensions');

const baseProgress = (overrides = {}) => ({
    schemaVersion: 7,
    highestUnlockedLevel: 6,
    completedLevels: [1, 2, 3, 4, 5],
    selectedLevelId: 6,
    specialRoadTutorialSeen: true,
    levelOneTutorialCompleted: true,
    levelOneTutorialVersion: 7,
    freezeUnlocked: true,
    selectedTactics: ['sprint', 'heal', 'shock'],
    selectedTacticsByLevel: { 4: ['heal', 'shock', 'freeze'], 5: ['sprint', 'heal', 'surge'], 6: ['sprint', 'heal', 'supplyBoost'] },
    levelFiveTutorialSeen: true,
    bestResultsByLevel: {},
    ...overrides,
});

const browserProblems = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

const openPage = async ({ viewport = { width: 1280, height: 720 }, progress = baseProgress(), audio,
    capsule = false, waitMs = 4200 } = {}) => {
    const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1 });
    await context.addInitScript(({ progressKey, audioKey, savedProgress, savedAudio, mockCapsule }) => {
        localStorage.clear();
        localStorage.setItem(progressKey, JSON.stringify(savedProgress));
        if (savedAudio !== undefined) localStorage.setItem(audioKey, JSON.stringify(savedAudio));
        if (mockCapsule) {
            globalThis.wx = {
                getWindowInfo: () => ({ windowWidth: innerWidth, windowHeight: innerHeight }),
                getSystemInfoSync: () => ({ windowWidth: innerWidth, windowHeight: innerHeight }),
                getMenuButtonBoundingClientRect: () => ({
                    left: innerWidth - 136, right: innerWidth - 20, top: 12, bottom: 52, width: 116, height: 40,
                }),
            };
        }
    }, { progressKey: PROGRESS_KEY, audioKey: AUDIO_KEY, savedProgress: progress, savedAudio: audio, mockCapsule: capsule });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
        if (message.type() === 'error') problems.push({ type: 'console-error', text: message.text() });
    });
    page.on('requestfailed', (request) => problems.push({
        type: 'request-failed', url: request.url(), text: request.failure()?.errorText ?? 'unknown',
    }));
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(waitMs);
    browserProblems.push(...problems.map((problem) => ({ ...problem, viewport })));
    return { context, page, problems };
};

const inController = async (page, callbackSource) => page.evaluate(async (body) => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const c = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && component.typeButtons instanceof Map);
    if (!c) throw new Error('GameController not found');
    return Function('c', 'cc', `return (${body})(c, cc);`)(c, cc);
}, callbackSource);

const audioScenarios = [
    { name: 'fresh', seed: undefined, expect: { music: 1, sfx: 1, migrated: false } },
    { name: 'schema2-untouched-80', seed: { schemaVersion: 2, selectedBgmId: 'cheerful_lighthearted', musicVolume: 0.8,
        sfxVolume: 0.8, musicMuted: false, sfxMuted: false, lastNonZeroMusicVolume: 0.8, lastNonZeroSfxVolume: 0.8,
        userAdjustedMusicVolume: false, userAdjustedSfxVolume: false, userSelectedBgm: false,
        legacyZeroMigrationApplied: false }, expect: { music: 1, sfx: 1, migrated: true } },
    { name: 'schema2-custom', seed: { schemaVersion: 2, selectedBgmId: 'cyberwave_upbeat', musicVolume: 0.35,
        sfxVolume: 0.65, musicMuted: false, sfxMuted: false, lastNonZeroMusicVolume: 0.35, lastNonZeroSfxVolume: 0.65,
        userAdjustedMusicVolume: true, userAdjustedSfxVolume: true, userSelectedBgm: true,
        legacyZeroMigrationApplied: false }, expect: { music: 0.35, sfx: 0.65, migrated: false, bgm: 'cyberwave_upbeat' } },
    { name: 'schema2-muted', seed: { schemaVersion: 2, selectedBgmId: 'cheerful_lighthearted', musicVolume: 0,
        sfxVolume: 0, musicMuted: true, sfxMuted: true, lastNonZeroMusicVolume: 0.4, lastNonZeroSfxVolume: 0.6,
        userAdjustedMusicVolume: true, userAdjustedSfxVolume: true, userSelectedBgm: false,
        legacyZeroMigrationApplied: false }, expect: { music: 0, sfx: 0, migrated: false } },
    { name: 'schema1-ambiguous-80', seed: { schemaVersion: 1, selectedBgmId: 'cheerful_lighthearted', musicVolume: 0.8,
        sfxVolume: 0.8, musicMuted: false, sfxMuted: false, lastNonZeroMusicVolume: 0.8, lastNonZeroSfxVolume: 0.8 },
        expect: { music: 0.8, sfx: 0.8, migrated: false } },
    { name: 'schema2-buggy-zero', seed: { schemaVersion: 2, selectedBgmId: 'cheerful_lighthearted', musicVolume: 0,
        sfxVolume: 0, musicMuted: false, sfxMuted: false, lastNonZeroMusicVolume: 0.8, lastNonZeroSfxVolume: 0.8,
        userAdjustedMusicVolume: false, userAdjustedSfxVolume: false, userSelectedBgm: false,
        legacyZeroMigrationApplied: false }, expect: { music: 1, sfx: 1, zeroMigrated: true } },
];

for (const scenario of audioScenarios) {
    const sample = await openPage({ audio: scenario.seed, waitMs: 2600 });
    const state = await inController(sample.page, `(c) => ({
        music: c.audioManager.getMusicVolume(), sfx: c.audioManager.getSfxVolume(),
        bgm: c.audioManager.getSelectedBgmId(), managerNodeName: c.audioManager.node.name,
        bgmSourceValid: Boolean(c.audioManager.bgmSource?.isValid), sfxSlotCount: c.audioManager.sfxSlots.length,
        stored: JSON.parse(localStorage.getItem('${AUDIO_KEY}')),
    })`);
    const expected = scenario.expect;
    check(Math.abs(state.music - expected.music) < 0.0001 && Math.abs(state.sfx - expected.sfx) < 0.0001
        && state.stored.schemaVersion === 3
        && state.managerNodeName === 'GlobalAudioManager' && state.bgmSourceValid && state.sfxSlotCount === 6
        && (expected.bgm === undefined || state.bgm === expected.bgm)
        && (expected.migrated === undefined || state.stored.legacyDefaultVolumeMigrationApplied === expected.migrated)
        && (expected.zeroMigrated === undefined || state.stored.legacyZeroMigrationApplied === expected.zeroMigrated),
        `audio/${scenario.name}`, state);
    await sample.context.close();
}

const viewports = [
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: 'wide-2560x1080', width: 2560, height: 1080 },
    { name: 'fullscreen-capsule-2844x1280', width: 2844, height: 1280, capsule: true },
];
for (const viewport of viewports) {
    const sample = await openPage({ viewport, capsule: viewport.capsule });
    await inController(sample.page, `async (c) => {
        c.currentLevel = 6;
        c.restartGame();
        c.startPanel.active = false;
        c.activateBattle();
        await c.artResourceManager.preloadGroups(['battle-core']);
        c.applyPilotStaticArt();
        return true;
    }`);
    await sample.page.waitForTimeout(1800);
    const cardLayout = await inController(sample.page, `(c, cc) => {
        const rect = (node) => {
            const box = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { left: box.x, right: box.x + box.width, bottom: box.y, top: box.y + box.height,
                width: box.width, height: box.height };
        };
        c.selectUnitType('small');
        const selected = c.typeButtons.get('small').visualState;
        c.playerEnergy = 0;
        c.refreshUnitTypeButtons();
        const insufficient = c.typeButtons.get('small').visualState;
        const cards = ['small', 'medium', 'large', 'giant'].map((type) => {
            const view = c.typeButtons.get(type);
            const sprite = view.artSprite;
            return { type, rect: rect(view.node), label: view.label.string, state: view.stateLabel.string,
                badgeActive: view.tierBadgeNode.active, art: Boolean(sprite), spriteType: sprite?.type,
                childOrder: view.node.children.map((node) => node.name) };
        });
        const gaps = cards.slice(1).map((card, index) => cards[index].rect.bottom - card.rect.top);
        return { cards, gaps, selected, insufficient, metrics: c.screenMetrics,
            sidebar: rect(c.unitCardSidebar), pauseButton: rect(c.pauseButton.node) };
    }`);
    check(cardLayout.cards.length === 4 && cardLayout.cards.every((card) => card.art && card.spriteType === 0
        && !card.badgeActive && card.rect.height === 100 && card.label.includes('能量'))
        && cardLayout.gaps.every((gap) => Math.abs(gap - 10) < 0.1),
        `layout/${viewport.name}/four-art-cards-and-clear-gaps`, cardLayout);
    check(cardLayout.selected === 'selected' && cardLayout.insufficient === 'selected-insufficient',
        `layout/${viewport.name}/selected-and-insufficient-states`, cardLayout);

    await inController(sample.page, `(c) => { c.playerEnergy = 100; c.refreshUnitTypeButtons(); c.pauseGame(); return true; }`);
    await sample.page.waitForTimeout(1400);
    const pause = await inController(sample.page, `(c, cc) => {
        const rect = (node) => {
            const box = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { left: box.x, right: box.x + box.width, bottom: box.y, top: box.y + box.height,
                width: box.width, height: box.height };
        };
        const names = ['PauseTitle', 'PauseHint', 'ResumeButton', 'PauseRestartButton', 'HelpButton',
            'ReturnTitleButton', 'BgmSelector', 'MusicVolume', 'SfxVolume'];
        const nodes = Object.fromEntries(names.map((name) => {
            const node = c.pauseContentRoot.getChildByName(name);
            return [name, { position: { x: node.position.x, y: node.position.y }, rect: rect(node), active: node.active }];
        }));
        const art = c.pauseContent.getChildByName('PausePanelArt');
        return { paused: c.isPaused, panelActive: c.pausePanel.active, root: rect(c.pauseContentRoot), nodes,
            panelArt: Boolean(art), panelArtSibling: art?.getSiblingIndex(),
            resumeHandlers: c.pauseContentRoot.getChildByName('ResumeButton').hasEventListener(cc.Node.EventType.TOUCH_END),
            capsule: c.screenMetrics.capsule };
    }`);
    const actionNames = ['ResumeButton', 'PauseRestartButton', 'HelpButton', 'ReturnTitleButton'];
    const actionSizes = actionNames.every((name) => Math.abs(pause.nodes[name].rect.width - 184) < 0.1
        && Math.abs(pause.nodes[name].rect.height - 76) < 0.1);
    const rowGap = pause.nodes.ResumeButton.rect.bottom - pause.nodes.HelpButton.rect.top;
    const actionToBgm = pause.nodes.HelpButton.rect.bottom - pause.nodes.BgmSelector.rect.top;
    const bgmToVolume = pause.nodes.BgmSelector.rect.bottom - pause.nodes.MusicVolume.rect.top;
    check(pause.paused && pause.panelActive && actionSizes && rowGap >= 15.9
        && actionToBgm >= 9.9 && bgmToVolume >= 9.9 && pause.resumeHandlers,
        `layout/${viewport.name}/pause-rows-nonoverlap-and-clickable`, { pause, rowGap, actionToBgm, bgmToVolume });
    check(pause.panelArt && pause.panelArtSibling === 0,
        `layout/${viewport.name}/pause-art-behind-controls`, pause);
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}-cards-pause.png`), fullPage: true });
    await sample.context.close();
}

const tutorial = await openPage({
    progress: baseProgress({ highestUnlockedLevel: 1, completedLevels: [], selectedLevelId: 1,
        levelOneTutorialCompleted: false, levelOneTutorialVersion: 6 }),
    audio: undefined,
});
const tutorialState = await inController(tutorial.page, `(c, cc) => {
    c.currentLevel = 1;
    c.restartGame();
    c.startPanel.active = false;
    c.activateBattle();
    c.cleanupLevelOneTutorial(false);
    c.beginLevelOneTutorial();
    c.tutorialVisiblePage = 4;
    c.tutorialProgress = 'audio-settings';
    c.refreshLevelOneTutorialPresentation();
    const before = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        music: c.audioManager.getMusicVolume(), sfx: c.audioManager.getSfxVolume(),
        next: c.isLevelOneTutorialNextEnabled() };
    c.pauseGame();
    const alternate = c.getLevelOneTutorialAlternateBgmOption();
    c.selectBgmStyleFromUi(alternate.track);
    c.adjustAudioVolume('music', -5);
    c.refreshLevelOneTutorialPresentation();
    const after = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        music: c.audioManager.getMusicVolume(), sfx: c.audioManager.getSfxVolume(),
        next: c.isLevelOneTutorialNextEnabled(),
        bgm: c.audioManager.getSelectedBgmId(), stored: JSON.parse(localStorage.getItem('${AUDIO_KEY}')) };
    return { before, after, opened: c.tutorialAudioSettingsOpened };
}`);
check(tutorialState.before.music === 1 && tutorialState.before.sfx === 1 && !tutorialState.before.next
    && tutorialState.opened && tutorialState.after.music === 0.95 && tutorialState.after.sfx === 1
    && tutorialState.after.next && tutorialState.after.page === 4
    && tutorialState.after.stored.userAdjustedMusicVolume === true,
    'tutorial/audio-page-real-switch-adjust-save-manual-next', tutorialState);
await tutorial.page.waitForTimeout(1400);
await tutorial.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-tutorial-audio-settings.png'), fullPage: true });
await tutorial.context.close();

await browser.close();
check(browserProblems.length === 0, 'browser/no-page-console-or-request-errors', browserProblems);

const report = {
    version: VERSION,
    previewUrl: PREVIEW_URL,
    generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.filter((item) => item.passed).length,
        failed: checks.filter((item) => !item.passed).length },
    checks,
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
for (const item of checks.filter((entry) => !entry.passed)) console.error(`FAIL ${item.name}`, item.details ?? '');
if (report.summary.failed > 0) process.exitCode = 1;
