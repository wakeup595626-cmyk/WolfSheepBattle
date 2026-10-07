import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-tutorial05-ui09/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8785';
const SOURCE_PATH = path.join(PROJECT_ROOT, 'assets', 'scripts', 'GameController.ts');
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details) => checks.push({ passed: Boolean(passed), name, details });
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const methodBody = (name, nextName) => source.slice(source.indexOf(`private ${name}`), source.indexOf(`private ${nextName}`));

check(source.includes("const GAME_VERSION = 'v1.3.0-dev-tutorial05-ui09';")
    && source.includes("const DEVELOPMENT_BATCH = 'v1.3.0-dev-tutorial05-ui09';")
    && source.includes("const REQUESTED_TASK_ID = 'v1.3.0-dev-tutorial05-ui09';"), 'static/version-identity');
check(source.includes('const LEVEL_ONE_TUTORIAL_VERSION = 5;')
    && source.includes('completedLevels.has(1) ? LEVEL_ONE_TUTORIAL_VERSION'), 'static/tutorial05-safe-migration');
check(source.includes("'selected-insufficient'") && source.includes("'\\u9009\\u4E2D\\u7F3A\\u80FD'")
    && source.includes("'\\u6559\\u7A0B'"), 'static/compact-card-required-states');
check(source.includes("'UnitCardSidebar'") && source.includes('const UNIT_CARD_WIDTH = 48;')
    && source.includes('const UNIT_CARD_HEIGHT = 70;'), 'static/compact-vertical-sidebar');
const selectBody = methodBody('selectUnitType', 'isLevelOneTutorialUnitSelectionAllowed');
check(!selectBody.includes('this.selectedSheepType = undefined')
    && selectBody.includes('保持选中'), 'static/same-card-never-deselects');
const deployBody = methodBody('tryDeploySelectedUnit', 'trySpawnAIUnit');
check(!deployBody.includes('this.selectedSheepType = undefined')
    && deployBody.indexOf('this.playerEnergy < definition.cost') < deployBody.indexOf('this.playerEnergy -= definition.cost')
    && deployBody.includes('this.spawnUnit(Team.Player, lane, definition)'), 'static/deploy-retains-selection-and-real-path');
check(/private hasClearedMandatoryLevelOne\(\): boolean \{\s*return this\.completedLevels\.has\(1\);\s*\}/.test(source)
    && !methodBody('canChallengeLevel', 'enforceMandatoryLevelOneGateSelection').includes('levelOneTutorialCompleted'),
    'static/level-one-victory-is-sole-gate');
check(source.includes('{ type: SheepType.Small, lane: 0 }')
    && source.includes('{ type: SheepType.Medium, lane: 1 }')
    && source.includes('{ type: SheepType.Large, lane: 2 }')
    && source.includes('{ type: SheepType.Giant, lane: 3 }'), 'static/tutorial-four-lane-map');

const baseSave = (overrides = {}) => ({
    schemaVersion: 7,
    highestUnlockedLevel: 1,
    completedLevels: [],
    selectedLevelId: 1,
    specialRoadTutorialSeen: false,
    levelOneTutorialCompleted: false,
    levelOneTutorialVersion: 0,
    freezeUnlocked: false,
    selectedTactics: ['sprint', 'heal', 'shock'],
    selectedTacticsByLevel: {
        4: ['heal', 'shock', 'freeze'],
        5: ['sprint', 'heal', 'surge'],
        6: ['sprint', 'heal', 'supplyBoost'],
    },
    levelFiveTutorialSeen: false,
    bestResultsByLevel: {},
    ...overrides,
});

const browserProblems = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

const openPage = async ({ viewport = { width: 1280, height: 720 }, seed = baseSave({
    completedLevels: [1], levelOneTutorialCompleted: true, levelOneTutorialVersion: 5,
}) } = {}) => {
    const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1 });
    await context.addInitScript(({ key, saved }) => {
        localStorage.clear();
        localStorage.setItem(key, JSON.stringify(saved));
    }, { key: PROGRESS_KEY, saved: seed });
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
    await page.waitForTimeout(6500);
    browserProblems.push(...problems.map((problem) => ({ ...problem, viewport })));
    return { context, page, problems };
};

const inController = async (page, callbackSource) => page.evaluate(async (body) => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const c = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    if (!c) throw new Error('GameController not found');
    return Function('c', 'cc', `return (${body})(c, cc);`)(c, cc);
}, callbackSource);

const normal = await openPage();
const normalFlow = await inController(normal.page, `(c) => {
    c.currentLevel = 2;
    c.restartGame();
    c.startPanel.active = false;
    c.activateBattle();
    const startNone = c.selectedSheepType === undefined;
    c.selectUnitType('small');
    c.selectUnitType('small');
    const repeatSmall = c.selectedSheepType === 'small';
    c.selectUnitType('medium');
    c.selectUnitType('medium');
    const repeatMedium = c.selectedSheepType === 'medium';
    const beforeFirst = { energy: c.playerEnergy, units: c.units.length };
    const first = c.tryDeploySelectedUnit(0);
    const afterFirst = { energy: c.playerEnergy, units: c.units.length, selected: c.selectedSheepType };
    c.playerSpawnCooldown = 0;
    const second = c.tryDeploySelectedUnit(1);
    const afterSecond = { energy: c.playerEnergy, units: c.units.length, selected: c.selectedSheepType };
    c.playerEnergy = 0;
    c.playerSpawnCooldown = 0;
    const beforeInsufficient = { energy: c.playerEnergy, units: c.units.length };
    const insufficient = c.tryDeploySelectedUnit(2);
    const afterInsufficient = { energy: c.playerEnergy, units: c.units.length, selected: c.selectedSheepType,
        visual: c.typeButtons.get('medium').visualState };
    c.playerEnergy = 24;
    c.playerSpawnCooldown = 0;
    const recovered = c.tryDeploySelectedUnit(2);
    const afterRecovered = { energy: c.playerEnergy, units: c.units.length, selected: c.selectedSheepType };
    c.pauseGame();
    const pauseSelected = c.selectedSheepType;
    c.resumeGame();
    const resumeSelected = c.selectedSheepType;
    c.restartGame();
    const restartCleared = c.selectedSheepType === undefined;
    c.selectUnitType('giant');
    c.finishGame(false);
    const finishCleared = c.selectedSheepType === undefined;
    c.restartGame();
    c.selectUnitType('large');
    c.returnToTitle();
    const titleCleared = c.selectedSheepType === undefined;
    c.currentLevel = 3;
    c.restartGame();
    const levelSwitchCleared = c.selectedSheepType === undefined;
    return { startNone, repeatSmall, repeatMedium, beforeFirst, first, afterFirst, second, afterSecond,
        beforeInsufficient, insufficient, afterInsufficient, recovered, afterRecovered,
        pauseSelected, resumeSelected, restartCleared, finishCleared, titleCleared, levelSwitchCleared };
}`);
check(normalFlow.startNone && normalFlow.repeatSmall && normalFlow.repeatMedium,
    'runtime/single-select-lock-and-new-battle-none', normalFlow);
check(normalFlow.first && normalFlow.afterFirst.units === normalFlow.beforeFirst.units + 1
    && normalFlow.afterFirst.energy === normalFlow.beforeFirst.energy - 24
    && normalFlow.afterFirst.selected === 'medium'
    && normalFlow.second && normalFlow.afterSecond.units === normalFlow.afterFirst.units + 1
    && normalFlow.afterSecond.energy === normalFlow.afterFirst.energy - 24
    && normalFlow.afterSecond.selected === 'medium', 'runtime/repeat-real-deploy-no-double-charge', normalFlow);
check(!normalFlow.insufficient
    && normalFlow.afterInsufficient.units === normalFlow.beforeInsufficient.units
    && normalFlow.afterInsufficient.energy === normalFlow.beforeInsufficient.energy
    && normalFlow.afterInsufficient.selected === 'medium'
    && normalFlow.afterInsufficient.visual === 'selected-insufficient'
    && normalFlow.recovered && normalFlow.afterRecovered.selected === 'medium',
    'runtime/insufficient-retains-selection-and-recovery-needs-no-reselect', normalFlow);
check(normalFlow.pauseSelected === 'medium' && normalFlow.resumeSelected === 'medium'
    && normalFlow.restartCleared && normalFlow.finishCleared && normalFlow.titleCleared
    && normalFlow.levelSwitchCleared, 'runtime/pause-preserves-reset-boundaries-clear', normalFlow);

const laneTouchSetup = await inController(normal.page, `(c) => {
    c.currentLevel = 2;
    c.restartGame();
    c.startPanel.active = false;
    c.activateBattle();
    c.selectUnitType('small');
    return { beforeUnits: c.units.length, beforeEnergy: c.playerEnergy,
        visibleWidth: c.screenMetrics.visibleWidth, visibleHeight: c.screenMetrics.visibleHeight,
        lanes: [-495, -225, 45, 315] };
}`);
const canvasBox = await normal.page.locator('canvas').boundingBox();
for (const laneX of laneTouchSetup.lanes) {
    await inController(normal.page, `(c) => { c.playerSpawnCooldown = 0; return true; }`);
    await normal.page.touchscreen.tap(
        canvasBox.x + (laneX + laneTouchSetup.visibleWidth / 2) / laneTouchSetup.visibleWidth * canvasBox.width,
        canvasBox.y + 0.5 * canvasBox.height,
    );
    await normal.page.waitForTimeout(120);
}
const laneTouchResult = await inController(normal.page, `(c) => ({ units: c.units.length,
    energy: c.playerEnergy, selected: c.selectedSheepType,
    lanes: c.units.filter((unit) => unit.team === 0).map((unit) => unit.lane).sort() })`);
check(laneTouchResult.units === laneTouchSetup.beforeUnits + 4
    && laneTouchResult.energy >= laneTouchSetup.beforeEnergy - 48.1
    && laneTouchResult.energy < laneTouchSetup.beforeEnergy - 44
    && laneTouchResult.selected === 'small'
    && JSON.stringify(laneTouchResult.lanes) === JSON.stringify([0, 1, 2, 3]),
    'runtime/four-lane-real-touch-hit-areas', { laneTouchSetup, laneTouchResult });

const tutorial = await openPage({ seed: baseSave({ levelOneTutorialVersion: 4 }) });
const tutorialFlow = await inController(tutorial.page, `(c) => {
    c.currentLevel = 1;
    c.restartGame();
    c.startPanel.active = false;
    c.activateBattle();
    c.cleanupLevelOneTutorial(false);
    c.beginLevelOneTutorial();
    c.handleLevelOneTutorialNextAction();
    const wrongCardStart = c.selectUnitType('medium') ?? c.selectedSheepType === undefined;
    c.selectUnitType('small');
    c.selectUnitType('small');
    const repeatedFirst = c.selectedSheepType === 'small';
    const beforeWrongLane = { units: c.units.length, energy: c.playerEnergy, index: c.tutorialDeploymentIndex };
    const wrongLane = c.tryDeploySelectedUnit(1);
    const afterWrongLane = { units: c.units.length, energy: c.playerEnergy, index: c.tutorialDeploymentIndex };
    const records = [];
    for (const [type, lane] of [['small', 0], ['medium', 1], ['large', 2], ['giant', 3]]) {
        if (c.selectedSheepType !== type) c.selectUnitType(type);
        c.selectUnitType(type);
        const before = { units: c.units.length, energy: c.playerEnergy, page: c.tutorialVisiblePage,
            index: c.tutorialDeploymentIndex };
        const result = c.tryDeploySelectedUnit(lane);
        records.push({ type, lane, before, result, after: { units: c.units.length, energy: c.playerEnergy,
            page: c.tutorialVisiblePage, index: c.tutorialDeploymentIndex, selected: c.selectedSheepType } });
        if (type === 'small') c.selectUnitType('giant');
    }
    const afterFour = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        nextEnabled: c.isLevelOneTutorialNextEnabled(), selected: c.selectedSheepType,
        typeCount: c.tutorialCompletedDeploymentTypes.size, laneCount: c.tutorialCompletedDeploymentLanes.size,
        subsidies: [...c.tutorialEnergySubsidiesGranted], remaining: [...c.tutorialEnergySubsidiesRemaining.entries()] };
    const beforeBack = { units: c.units.length, energy: c.playerEnergy, index: c.tutorialDeploymentIndex };
    c.handleLevelOneTutorialPreviousAction();
    const afterBack = { units: c.units.length, energy: c.playerEnergy, index: c.tutorialDeploymentIndex };
    c.handleLevelOneTutorialNextAction();
    const afterReturn = { units: c.units.length, energy: c.playerEnergy, index: c.tutorialDeploymentIndex,
        page: c.tutorialVisiblePage };
    c.levelOneTutorialCompleted = true;
    c.levelOneTutorialVersion = 5;
    c.completedLevels.delete(1);
    const gateBeforeWin = c.canChallengeLevel(2);
    c.completedLevels.add(1);
    const gateAfterWin = c.canChallengeLevel(2);
    return { wrongCardStart, repeatedFirst, beforeWrongLane, wrongLane, afterWrongLane, records,
        afterFour, beforeBack, afterBack, afterReturn, gateBeforeWin, gateAfterWin };
}`);
check(tutorialFlow.wrongCardStart && tutorialFlow.repeatedFirst && !tutorialFlow.wrongLane
    && JSON.stringify(tutorialFlow.beforeWrongLane) === JSON.stringify(tutorialFlow.afterWrongLane),
    'tutorial/wrong-card-lane-do-not-progress-or-charge', tutorialFlow);
check(tutorialFlow.records.every((item, index) => item.result
    && item.after.units === item.before.units + 1 && item.after.index === index + 1
    && item.after.page === 1 && item.after.selected === item.type)
    && tutorialFlow.afterFour.typeCount === 4 && tutorialFlow.afterFour.laneCount === 4,
    'tutorial/four-real-deployments-retain-current-selection', tutorialFlow);
check(tutorialFlow.afterFour.progress === 'deploy-four-sheep-complete'
    && tutorialFlow.afterFour.page === 1 && tutorialFlow.afterFour.nextEnabled
    && tutorialFlow.afterFour.selected === 'giant'
    && tutorialFlow.afterFour.remaining.every(([, value]) => value === 0),
    'tutorial/manual-next-and-minimum-energy-subsidy', tutorialFlow.afterFour);
check(JSON.stringify(tutorialFlow.beforeBack) === JSON.stringify(tutorialFlow.afterBack)
    && JSON.stringify(tutorialFlow.beforeBack) === JSON.stringify({
        units: tutorialFlow.afterReturn.units, energy: tutorialFlow.afterReturn.energy,
        index: tutorialFlow.afterReturn.index,
    }) && !tutorialFlow.gateBeforeWin && tutorialFlow.gateAfterWin,
    'tutorial/back-does-not-rollback-and-victory-gate', tutorialFlow);
await tutorial.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-tutorial-four-lane.png') });

const viewports = [
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: 'wide-2400x1080', width: 2400, height: 1080 },
    { name: 'phone-2340x1080', width: 2340, height: 1080 },
];
for (const viewport of viewports) {
    const sample = await openPage({ viewport });
    const layout = await inController(sample.page, `(c) => {
        c.currentLevel = 6;
        c.restartGame();
        c.startPanel.active = false;
        c.activateBattle();
        const rect = (node) => {
            const box = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { x: box.x, y: box.y, width: box.width, height: box.height,
                left: box.x, right: box.x + box.width, bottom: box.y, top: box.y + box.height };
        };
        const cards = ['small', 'medium', 'large', 'giant'].map((type) => ({
            type, position: { x: c.typeButtons.get(type).node.position.x, y: c.typeButtons.get(type).node.position.y },
            rect: rect(c.typeButtons.get(type).node), state: c.typeButtons.get(type).stateLabel.string,
        }));
        const lane1 = rect(c.laneHitAreas[0].node);
        const hud = [rect(c.playerSupplyBadge), rect(c.playerBaseHudNode), rect(c.playerEnergyBar.node)];
        const sidebar = rect(c.unitCardSidebar);
        const hudBottom = Math.min(...hud.map((item) => item.bottom));
        const hudTop = Math.max(...hud.map((item) => item.top));
        return { cards, lane1, hud, sidebar, metrics: c.screenMetrics,
            laneClearance: lane1.left - Math.max(...cards.map((item) => item.rect.right)),
            sidebarHudClearance: sidebar.bottom - hudTop,
            hudBottomClearance: hudBottom - (c.screenMetrics.safeBottom + c.screenMetrics.visibleHeight / 2),
            cardNodeCount: c.unitCardSidebar.children.filter((node) => node.name.startsWith('TypeButton')).length };
    }`);
    check(layout.cards.length === 4 && layout.cardNodeCount === 4
        && layout.cards.every((item) => Math.abs(item.rect.width - 48) < 0.1 && Math.abs(item.rect.height - 70) < 0.1)
        && layout.cards.every((item, index) => index === 0 || item.position.y < layout.cards[index - 1].position.y),
        `layout/${viewport.name}/four-equal-vertical-cards`, layout);
    check(layout.laneClearance >= -0.01 && layout.sidebarHudClearance >= 11.99
        && layout.hudBottomClearance >= 11.99
        && Math.max(...layout.hud.map((item) => item.bottom + item.height / 2))
            - Math.min(...layout.hud.map((item) => item.bottom + item.height / 2)) < 0.1,
        `layout/${viewport.name}/lane-hud-safe-clearance`, layout);
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}-unit-sidebar.png`) });
    await sample.context.close();
}

const migrationOld = await openPage({ seed: baseSave({ levelOneTutorialCompleted: true, levelOneTutorialVersion: 4 }) });
const migrationOldState = await inController(migrationOld.page, `(c) => ({ completed: c.levelOneTutorialCompleted,
    version: c.levelOneTutorialVersion, won: c.completedLevels.has(1) })`);
check(!migrationOldState.completed && migrationOldState.version === 4 && !migrationOldState.won,
    'migration/non-winner-receives-revised-tutorial', migrationOldState);
const migrationWinner = await openPage({ seed: baseSave({ completedLevels: [1],
    levelOneTutorialCompleted: false, levelOneTutorialVersion: 4 }) });
const migrationWinnerState = await inController(migrationWinner.page, `(c) => ({ completed: c.levelOneTutorialCompleted,
    version: c.levelOneTutorialVersion, won: c.completedLevels.has(1) })`);
check(migrationWinnerState.completed && migrationWinnerState.version === 5 && migrationWinnerState.won,
    'migration/real-winner-not-forced-to-replay', migrationWinnerState);

await normal.context.close();
await tutorial.context.close();
await migrationOld.context.close();
await migrationWinner.context.close();
await browser.close();

check(browserProblems.length === 0, 'browser/no-page-console-or-request-errors', browserProblems);
const report = {
    version: 'v1.3.0-dev-tutorial05-ui09',
    previewUrl: PREVIEW_URL,
    generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.filter((item) => item.passed).length,
        failed: checks.filter((item) => !item.passed).length },
    checks,
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'tutorial05-ui09-browser-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary));
for (const item of checks.filter((candidate) => !candidate.passed)) {
    console.error(`FAIL ${item.name}`, JSON.stringify(item.details));
}
if (report.summary.failed > 0) process.exitCode = 1;
