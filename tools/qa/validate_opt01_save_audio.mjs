import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-opt01/save-audio');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8765';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const check = (pass, message, detail) => checks.push({ pass: Boolean(pass), message, detail });
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

const openScenario = async (seed) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
    await context.addInitScript((entries) => {
        localStorage.clear();
        for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, seed);
    const page = await context.newPage();
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForFunction(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        if (!scene) return false;
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        return nodes.some((node) => node.components?.some((component) =>
            component?.startPanel && typeof component.loadLevelProgress === 'function'));
    }, { timeout: 60000 });
    await page.waitForTimeout(2500);
    return { context, page };
};

const snapshot = (page) => page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.loadLevelProgress === 'function');
    const audio = nodes.flatMap((node) => node.components ?? []).find((component) =>
        typeof component.requestMenuBgm === 'function' && typeof component.getMusicVolume === 'function');
    const storedProgress = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2') ?? 'null');
    const storedAudio = JSON.parse(localStorage.getItem('wolf-sheep-battle.audio-settings.v1') ?? 'null');
    return {
        currentLevel: controller.currentLevel,
        completed: [...controller.completedLevels].sort((a, b) => a - b),
        highest: controller.highestUnlockedLevel,
        specialRoadTutorialSeen: controller.specialRoadTutorialSeen,
        levelFiveTutorialSeen: controller.levelFiveTutorialSeen,
        freezeUnlocked: controller.freezeUnlocked,
        levelFiveDeck: [...(controller.selectedTacticsByLevel.get(5) ?? [])],
        levelIds: [1, 2, 3, 4, 5, 6].filter((id) => controller.getLevelConfig(id)).map((id) => id),
        storedProgress,
        audio: {
            activated: audio.isAudioActivated(),
            playbackConfirmed: audio.isBgmPlaybackConfirmed(),
            requested: audio.getRequestedBgmTrack()?.id,
            selected: audio.getSelectedBgmId(),
            musicVolume: audio.getMusicVolume(),
            sfxVolume: audio.getSfxVolume(),
            musicEnabled: audio.isMusicEnabled(),
            sfxEnabled: audio.isSfxEnabled(),
        },
        storedAudio,
    };
});

const validProgress = {
    schemaVersion: 2,
    highestUnlockedLevel: 5,
    completedLevels: [1, 3, 5],
    selectedLevelId: 5,
    specialRoadTutorialSeen: true,
    freezeUnlocked: true,
    selectedTactics: ['heal', 'shock', 'freeze'],
    selectedTacticsByLevel: { 4: ['heal', 'shock', 'freeze'], 5: ['surge', 'heal', 'sprint'] },
    levelFiveTutorialSeen: true,
};
const validAudio = {
    selectedBgmId: 'cyberwave_upbeat',
    musicVolume: 0.37,
    sfxVolume: 0.62,
    musicMuted: true,
    sfxMuted: false,
    lastNonZeroMusicVolume: 0.37,
    lastNonZeroSfxVolume: 0.62,
};

{
    const { context, page } = await openScenario({
        'wolf-sheep-battle.progress.v2': JSON.stringify(validProgress),
        'wolf-sheep-battle.v1.highest-unlocked-level': '3',
        'wolf-sheep-battle.audio-settings.v1': JSON.stringify(validAudio),
    });
    const value = await snapshot(page);
    check(value.currentLevel === 5 && value.completed.includes(1) && value.completed.includes(3)
        && value.completed.includes(5), 'valid v2 level progress is preserved', value);
    check(value.levelFiveTutorialSeen && value.specialRoadTutorialSeen && value.freezeUnlocked,
        'tutorial and settings flags survive schema migration', value);
    check(JSON.stringify(value.levelFiveDeck) === JSON.stringify(['surge', 'heal', 'sprint']),
        'level-five tactic selection is preserved', value.levelFiveDeck);
    check(value.storedProgress.schemaVersion === 3, 'v2 progress migrates in place to schema 3', value.storedProgress);
    check(value.audio.selected === 'cyberwave_upbeat' && value.audio.musicVolume === 0
        && Math.abs(value.audio.sfxVolume - 0.62) < 0.001 && !value.audio.musicEnabled,
    'valid BGM selection, volumes and mute state are preserved', value.audio);
    await context.close();
}

{
    const corrupted = {
        schemaVersion: 2,
        highestUnlockedLevel: 'broken',
        completedLevels: 'broken',
        selectedLevelId: 6,
        specialRoadTutorialSeen: 'yes',
        freezeUnlocked: 'yes',
        selectedTactics: 'broken',
        selectedTacticsByLevel: 'broken',
        levelFiveTutorialSeen: 1,
    };
    const corruptAudio = {
        selectedBgmId: 'unknown', musicVolume: 'loud', sfxVolume: null,
        musicMuted: 'false', sfxMuted: 1,
        lastNonZeroMusicVolume: 'bad', lastNonZeroSfxVolume: {},
    };
    const { context, page } = await openScenario({
        'wolf-sheep-battle.progress.v2': JSON.stringify(corrupted),
        'wolf-sheep-battle.v1.highest-unlocked-level': '3',
        'wolf-sheep-battle.audio-settings.v1': JSON.stringify(corruptAudio),
    });
    const value = await snapshot(page);
    check(value.currentLevel === 1 && value.highest >= 4
        && [1, 2, 3].every((id) => value.completed.includes(id)),
    'corrupted structured progress safely falls back to the legacy high-water mark', value);
    check(value.storedProgress.schemaVersion === 3 && Array.isArray(value.storedProgress.completedLevels),
        'corrupted progress is rewritten as a valid schema without black-screening', value.storedProgress);
    check(value.audio.selected === 'cheerful_lighthearted'
        && Math.abs(value.audio.musicVolume - 0.5) < 0.001
        && Math.abs(value.audio.sfxVolume - 0.75) < 0.001,
    'corrupted audio fields fall back to first-install defaults', value.audio);
    check(JSON.stringify(value.levelIds) === JSON.stringify([1, 2, 3, 4, 5]),
        'levels 1-5 exist and no level 6 configuration exists', value.levelIds);
    await context.close();
}

{
    const { context, page } = await openScenario({});
    const before = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        const audio = nodes.flatMap((node) => node.components ?? []).find((component) =>
            typeof component.requestMenuBgm === 'function');
        return { activated: audio.isAudioActivated(), hint: controller.audioUnlockHint.active,
            token: audio.bgmRequestToken, desired: audio.desiredBgm };
    });
    await page.locator('canvas').click({ position: { x: 640, y: 360 } });
    await page.touchscreen.tap(640, 360);
    const playwrightPointerActivated = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const audio = nodes.flatMap((node) => node.components ?? []).find((component) =>
            typeof component.requestMenuBgm === 'function');
        return audio.isAudioActivated();
    });
    await page.evaluate(async () => {
        const cc = await System.import('cc');
        const eventTarget = cc.input._eventTarget;
        if (!eventTarget || typeof eventTarget.emit !== 'function') {
            throw new Error(`Cocos input event target unavailable: ${Object.keys(cc.input).join(',')}`);
        }
        eventTarget.emit(cc.Input.EventType.MOUSE_DOWN, {});
    });
    await page.waitForTimeout(1800);
    const lifecycle = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        const audio = nodes.flatMap((node) => node.components ?? []).find((component) =>
            typeof component.requestMenuBgm === 'function');
        const tokenBeforeLevelSelect = audio.bgmRequestToken;
        controller.showLevelSelect();
        const tokenAfterLevelSelect = audio.bgmRequestToken;
        for (let index = 0; index < 5; index += 1) {
            audio.requestBattleBgm();
            audio.requestMenuBgm();
        }
        audio.requestBattleBgm();
        const managerRoots = nodes.filter((node) => node.name === 'GlobalAudioManager');
        const bgmSources = managerRoots.flatMap((node) => node.children)
            .filter((node) => node.name === 'BgmAudioSource' && node.getComponent(cc.AudioSource));
        return {
            activated: audio.isAudioActivated(),
            desired: audio.desiredBgm,
            tokenBeforeLevelSelect,
            tokenAfterLevelSelect,
            managerRoots: managerRoots.length,
            bgmSources: bgmSources.length,
        };
    });
    check(!before.activated && before.hint && before.desired === 'cheerful_lighthearted',
        'fresh start waits for the first user interaction and shows the music hint', before);
    check(lifecycle.activated, 'the first Cocos valid-click event unlocks audio without a music-button click', {
        ...lifecycle,
        playwrightPointerActivated,
    });
    check(lifecycle.tokenBeforeLevelSelect === lifecycle.tokenAfterLevelSelect,
        'opening level select keeps menu BGM without restarting it', lifecycle);
    check(lifecycle.managerRoots === 1 && lifecycle.bgmSources === 1,
        'five rapid menu/battle cycles retain one manager and one BGM source', lifecycle);
    check(lifecycle.desired === 'cyberwave_upbeat', 'battle context requests the battle BGM', lifecycle);
    await context.close();
}

await browser.close();
const result = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    passed: checks.filter((item) => item.pass).length,
    failed: checks.filter((item) => !item.pass).length,
    checks,
};
fs.writeFileSync(path.join(outputDir, 'opt01_save_audio_audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ passed: result.passed, failed: result.failed }, null, 2));
process.exitCode = result.failed === 0 ? 0 : 1;
