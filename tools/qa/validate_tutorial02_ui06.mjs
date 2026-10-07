import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-tutorial02-ui06/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8778';
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
const LEGACY_PROGRESS_KEY = 'wolf-sheep-battle.v1.highest-unlocked-level';
const SOURCE_PATH = path.join(PROJECT_ROOT, 'assets', 'scripts', 'GameController.ts');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details = undefined) => checks.push({ passed: Boolean(passed), name, details });
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const functionBody = (name, nextName) => source.slice(source.indexOf(`private ${name}`), source.indexOf(`private ${nextName}`));

check(source.includes("const GAME_VERSION = 'v1.3.0-dev-tutorial02-ui06';")
    && source.includes("const DEVELOPMENT_BATCH = 'v1.3.0-dev-tutorial02-ui06';")
    && source.includes("const REQUESTED_TASK_ID = 'v1.3.0-dev-tutorial02-ui06';"), 'static/version-identity');
check(source.includes('const LEVEL_PROGRESS_SCHEMA_VERSION = 6;'), 'static/save-schema-6');
check(/private hasClearedMandatoryLevelOne\(\): boolean \{\s*return this\.completedLevels\.has\(1\);\s*\}/.test(source),
    'static/completed-level-one-is-sole-clear-proof');
check(!functionBody('canChallengeLevel', 'enforceMandatoryLevelOneGateSelection').includes('levelOneTutorialCompleted'),
    'static/tutorial-flag-not-used-by-gate');
const legacyMergeBody = source.slice(source.indexOf('const mergeLegacyProgress'), source.indexOf('let loadedStructuredSave'));
check(!legacyMergeBody.includes('completedLevels.add'),
    'static/legacy-high-water-does-not-forge-completion');
for (const entry of ['requestStartLevelSelect', 'requestStartBattle', 'confirmSelectedLevel', 'beginBattle',
    'enterBattleFlow', 'startNextLevel', 'enterNextLevelImmediately', 'playFormalLevelTransition', 'restartGame']) {
    const index = source.indexOf(`private ${entry}`);
    const body = source.slice(index, source.indexOf('\n    private ', index + 12));
    check(body.includes('canChallengeLevel') || body.includes('enforceMandatoryLevelOneGateSelection')
        || body.includes('prepareLevelSelection'),
        `static/gate-entry-${entry}`);
}
check(source.includes('ArtPilotResourceKey.LevelCardLocked')
    && source.includes('ArtPilotResourceKey.LevelStateLocked')
    && source.includes("visualState === 'locked' ? '通关第1关后解锁'"), 'static/formal-locked-art-and-copy');
check(source.includes('UNIT_CARD_VISIBLE_HALF_HEIGHT')
    && source.includes('this.playerHudY = unitCardY + UNIT_CARD_VISIBLE_HALF_HEIGHT')
    && source.includes('+ HUD_SAFE_MARGIN + PLAYER_HUD_VISIBLE_HALF_HEIGHT'), 'static/bottom-zones-derived-from-visible-bounds');
check((source.match(/auditBottomHudClearance\(metrics\)/g) ?? []).length === 1
    && !functionBody('update(deltaTime', 'buildGame').includes('auditBottomHudClearance'), 'static/no-per-frame-boundary-audit');

const browserProblems = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

const baseSave = (overrides = {}) => ({
    schemaVersion: 6,
    highestUnlockedLevel: 1,
    completedLevels: [],
    selectedLevelId: 1,
    specialRoadTutorialSeen: false,
    levelOneTutorialCompleted: false,
    freezeUnlocked: false,
    selectedTactics: ['sprint', 'heal', 'shock'],
    selectedTacticsByLevel: {
        4: ['sprint', 'heal', 'freeze'],
        5: ['sprint', 'heal', 'surge'],
        6: ['sprint', 'heal', 'supplyBoost'],
    },
    levelFiveTutorialSeen: false,
    bestResultsByLevel: {},
    ...overrides,
});

const openPage = async ({ viewport, seed, legacyHighest } = {}) => {
    const context = await browser.newContext({
        viewport: viewport ?? { width: 1280, height: 720 },
        hasTouch: true,
        deviceScaleFactor: 1,
    });
    await context.addInitScript(({ progressKey, legacyKey, saved, legacy }) => {
        localStorage.clear();
        if (saved) localStorage.setItem(progressKey, JSON.stringify(saved));
        if (legacy !== undefined) localStorage.setItem(legacyKey, `${legacy}`);
    }, { progressKey: PROGRESS_KEY, legacyKey: LEGACY_PROGRESS_KEY, saved: seed, legacy: legacyHighest });
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
    await page.waitForTimeout(5500);
    browserProblems.push(...problems.map((problem) => ({ ...problem, viewport: viewport ?? { width: 1280, height: 720 } })));
    return { context, page, problems };
};

const evaluateLayout = (page) => page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    if (!controller) throw new Error('GameController not found');
    controller.currentLevel = 1;
    controller.levelOneTutorialCompleted = true;
    controller.restartGame();
    controller.startPanel.active = false;
    controller.activateBattle();
    controller.applyResponsiveLandscapeLayout(controller.screenMetrics);
    const rect = (node) => {
        const value = controller.getLevelOneTutorialTargetRect(node);
        return value && { x: value.x, y: value.y, width: value.width, height: value.height,
            top: value.y + value.height, bottom: value.y };
    };
    const cards = [...controller.typeButtons.values()].map((button) => ({
        name: button.node.name,
        rect: rect(button.node),
        scale: button.node.scale.y,
        touch: button.node.getComponent(cc.UITransform).contentSize,
    }));
    const hud = [controller.playerSupplyBadge, controller.playerBaseHudNode, controller.playerEnergyBar.node]
        .map((node) => ({ name: node.name, y: node.position.y, rect: rect(node) }));
    const clearance = Math.min(...hud.map((item) => item.rect.bottom))
        - Math.max(...cards.map((item) => item.rect.top));

    controller.beginLevelOneTutorial();
    controller.advanceLevelOneTutorial('select-small-sheep');
    const smallTarget = controller.tutorialTargetRects[0];
    const smallCardRect = rect(controller.typeButtons.get('small').node);
    controller.advanceLevelOneTutorial('deploy-to-lane');
    const laneTargetCount = controller.tutorialTargetRects.length;
    controller.advanceLevelOneTutorial('resource-explanation');
    const resourceTargetCount = controller.tutorialTargetRects.length;
    const energyRect = rect(controller.playerEnergyBar.node);
    const resourceHasEnergyTarget = controller.tutorialTargetRects.some((target) =>
        Math.abs(target.x - energyRect.x) < 0.1 && Math.abs(target.y - energyRect.y) < 0.1
        && Math.abs(target.width - energyRect.width) < 0.1 && Math.abs(target.height - energyRect.height) < 0.1);
    controller.cleanupLevelOneTutorial(false);
    return {
        metrics: controller.screenMetrics,
        cards,
        hud,
        clearance,
        laneTargetCount,
        resourceTargetCount,
        resourceHasEnergyTarget,
        smallTargetMatchesCard: smallTarget && Math.abs(smallTarget.x - smallCardRect.x) < 0.1
            && Math.abs(smallTarget.y - smallCardRect.y) < 0.1
            && Math.abs(smallTarget.width - smallCardRect.width) < 0.1
            && Math.abs(smallTarget.height - smallCardRect.height) < 0.1,
    };
});

const layoutCases = [
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1024x720', width: 1024, height: 720 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: 'wide-2400x1080', width: 2400, height: 1080 },
];
const layoutResults = [];
for (const testCase of layoutCases) {
    const opened = await openPage({
        viewport: { width: testCase.width, height: testCase.height },
        seed: baseSave({ highestUnlockedLevel: 6, completedLevels: [1], levelOneTutorialCompleted: true }),
    });
    const state = await evaluateLayout(opened.page);
    await opened.page.screenshot({ path: path.join(OUTPUT_DIR, `${testCase.name}-battle.png`), fullPage: true });
    const passed = state.clearance >= 12 - 0.01
        && state.hud.every((item) => Math.abs(item.y - state.hud[0].y) < 0.01)
        && state.cards.every((item) => item.touch.width === 260 && item.touch.height === 40)
        && state.smallTargetMatchesCard && state.laneTargetCount === 4
        && state.resourceTargetCount === 7 && state.resourceHasEnergyTarget
        && opened.problems.length === 0;
    check(passed, `runtime/layout-${testCase.name}`, state);
    layoutResults.push({ testCase, passed, state, problems: opened.problems });
    await opened.context.close();
}

const fresh = await openPage();
const freshGate = await fresh.page.evaluate(async () => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    controller.showLevelSelect();
    const initial = {
        current: controller.currentLevel,
        pending: controller.pendingLevelSelection,
        challengeable: [1, 2, 3, 4, 5, 6].map((id) => controller.canChallengeLevel(id)),
        states: [1, 2, 3, 4, 5, 6].map((id) => controller.levelCards.get(id).visualState),
        stateText: [2, 3, 4, 5, 6].map((id) => controller.levelCards.get(id).stateLabel.string),
        startText: controller.startBattleButton.label.string,
    };
    controller.selectLevel(6);
    const afterLockedCard = { current: controller.currentLevel, pending: controller.pendingLevelSelection };
    return { initial, afterLockedCard };
});
await fresh.page.evaluate(async () => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    controller.startPanel.active = false;
    controller.prepareLevelSelection();
    controller.levelSelectPanel.active = true;
    controller.ensureOverlayLayerOrder();
    controller.refreshLevelSelectPanel('请先通关第1关教学');
});
await fresh.page.waitForTimeout(300);
await fresh.page.screenshot({ path: path.join(OUTPUT_DIR, 'fresh-progress-locked-level-select.png'), fullPage: true });
const freshBypass = await fresh.page.evaluate(async () => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    controller.levelOneTutorialCompleted = true;
    const skipStillLocked = !controller.canChallengeLevel(2);
    controller.pendingLevelSelection = 6;
    controller.confirmSelectedLevel();
    const confirmDidNotStartSix = controller.currentLevel === 1;
    controller.currentLevel = 6;
    controller.restartGame();
    const restartRepaired = controller.currentLevel === 1;
    controller.startNextLevel();
    const nextDidNotBypass = controller.currentLevel === 1;
    const saved = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2'));
    return { skipStillLocked, confirmDidNotStartSix,
        restartRepaired, nextDidNotBypass, savedSelected: saved.selectedLevelId };
});
check(freshGate.initial.current === 1 && freshGate.initial.pending === 1
    && freshGate.initial.challengeable.join(',') === 'true,false,false,false,false,false'
    && freshGate.initial.states.join(',') === 'selected,locked,locked,locked,locked,locked'
    && freshGate.initial.stateText.every((text) => text === '通关第1关后解锁')
    && freshGate.afterLockedCard.current === 1 && freshGate.afterLockedCard.pending === 1
    && freshBypass.skipStillLocked && freshBypass.confirmDidNotStartSix
    && freshBypass.restartRepaired && freshBypass.nextDidNotBypass && freshBypass.savedSelected === 1,
    'runtime/fresh-progress-and-bypass-gates', { freshGate, freshBypass });
await fresh.context.close();

const abnormal = await openPage({ seed: baseSave({
    highestUnlockedLevel: 6,
    completedLevels: [2, 4],
    selectedLevelId: 6,
    levelOneTutorialCompleted: true,
}) });
const abnormalState = await abnormal.page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2'));
    return { selectedLevelId: saved.selectedLevelId, completedLevels: saved.completedLevels,
        levelOneTutorialCompleted: saved.levelOneTutorialCompleted };
});
check(abnormalState.selectedLevelId === 1
    && abnormalState.completedLevels.join(',') === '2,4'
    && abnormalState.levelOneTutorialCompleted === true, 'runtime/abnormal-save-repaired-without-data-loss', abnormalState);
await abnormal.context.close();

const legacy = await openPage({ legacyHighest: 3 });
const legacyState = await legacy.page.evaluate(() => JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2')));
check(legacyState.selectedLevelId === 1 && legacyState.completedLevels.length === 0,
    'runtime/legacy-high-water-does-not-forge-level-one-win', legacyState);
await legacy.context.close();

const winner = await openPage();
const victoryState = await winner.page.evaluate(async () => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    controller.currentLevel = 1;
    controller.isStarted = true;
    controller.isFinished = false;
    controller.finishGame(true);
    const unlocked = [2, 3, 4, 5, 6].every((id) => controller.canChallengeLevel(id));
    const savedAfterVictory = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2'));
    controller.resetLocalProgress();
    const reset = {
        current: controller.currentLevel,
        pending: controller.pendingLevelSelection,
        tutorialCompleted: controller.levelOneTutorialCompleted,
        challengeable: [1, 2, 3, 4, 5, 6].map((id) => controller.canChallengeLevel(id)),
        completed: [...controller.completedLevels],
    };
    return { unlocked, savedAfterVictory, reset };
});
check(victoryState.unlocked
    && victoryState.savedAfterVictory.completedLevels.includes(1)
    && victoryState.savedAfterVictory.levelOneTutorialCompleted === true
    && victoryState.reset.current === 1 && victoryState.reset.pending === 1
    && victoryState.reset.tutorialCompleted === false && victoryState.reset.completed.length === 0
    && victoryState.reset.challengeable.join(',') === 'true,false,false,false,false,false',
    'runtime/victory-unlocks-all-and-reset-relocks', victoryState);
await winner.context.close();

const returning = await openPage({ seed: victoryState.savedAfterVictory });
const returningState = await returning.page.evaluate(async () => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    return { tutorialCompleted: controller.levelOneTutorialCompleted,
        unlocked: [2, 3, 4, 5, 6].every((id) => controller.canChallengeLevel(id)) };
});
check(returningState.tutorialCompleted && returningState.unlocked,
    'runtime/victory-persists-across-reload-without-forced-tutorial', returningState);
await returning.context.close();

check(browserProblems.length === 0, 'runtime/no-browser-errors-or-request-failures', browserProblems);
await browser.close();

const report = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_URL,
    passed: checks.every((entry) => entry.passed),
    checks,
    layoutResults,
    browserProblems,
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'tutorial02_ui06_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
    passed: report.passed,
    total: checks.length,
    failed: checks.filter((entry) => !entry.passed).map((entry) => entry.name),
    layout: layoutResults.map((entry) => ({ name: entry.testCase.name,
        passed: entry.passed, clearance: entry.state.clearance })),
}, null, 2));
if (!report.passed) process.exitCode = 1;
