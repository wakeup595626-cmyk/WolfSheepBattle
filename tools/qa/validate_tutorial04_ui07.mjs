import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-tutorial04-ui07/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8784';
const SOURCE_PATH = path.join(PROJECT_ROOT, 'assets', 'scripts', 'GameController.ts');
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
const LEGACY_KEY = 'wolf-sheep-battle.v1.highest-unlocked-level';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details = undefined) => checks.push({ passed: Boolean(passed), name, details });
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const methodBody = (name, nextName) => source.slice(source.indexOf(`private ${name}`), source.indexOf(`private ${nextName}`));

check(source.includes("const GAME_VERSION = 'v1.3.0-dev-tutorial04-ui07';")
    && source.includes("const DEVELOPMENT_BATCH = 'v1.3.0-dev-tutorial04-ui07';")
    && source.includes("const REQUESTED_TASK_ID = 'v1.3.0-dev-tutorial04-ui07';"), 'static/version-identity');
check(source.includes('const LEVEL_PROGRESS_SCHEMA_VERSION = 7;')
    && source.includes('const LEVEL_ONE_TUTORIAL_VERSION = 4;')
    && source.includes('levelOneTutorialVersion'), 'static/versioned-tutorial-migration');
check(source.includes('tutorialProgress') && source.includes('tutorialVisiblePage')
    && source.includes('tutorialHighestViewedPage'), 'static/progress-is-separate-from-visible-page');
check(!source.includes('TutorialSkipButton') && !source.includes('skipLevelOneTutorial')
    && !source.includes('跳过引导'), 'static/no-skip-node-callback-or-copy');
check(source.includes("'TutorialPreviousButton'") && source.includes("'TutorialNextButton'")
    && source.includes("'完成教学'"), 'static/fixed-navigation-buttons');
check(source.includes('const LEVEL_ONE_TUTORIAL_CARD_WIDTH = 560;')
    && source.includes('const LEVEL_ONE_TUTORIAL_CARD_HEIGHT = 280;')
    && !methodBody('positionLevelOneTutorialCard', 'handleLevelOneTutorialTouchStart').includes('xCandidates'),
    'static/fixed-card-size-and-position');
check(source.includes('{ type: SheepType.Small, lane: 0 }')
    && source.includes('{ type: SheepType.Medium, lane: 1 }')
    && source.includes('{ type: SheepType.Large, lane: 2 }')
    && source.includes('{ type: SheepType.Giant, lane: 3 }'), 'static/four-sheep-four-lane-map');
const deployBody = methodBody('tryDeploySelectedUnit', 'trySpawnAIUnit');
check(deployBody.includes('this.spawnUnit(Team.Player, lane, definition)')
    && deployBody.includes('this.playerEnergy -= definition.cost')
    && deployBody.includes('tutorialCompletedDeploymentTypes')
    && deployBody.includes('tutorialCompletedDeploymentLanes')
    && deployBody.includes("this.tutorialProgress = 'deploy-four-sheep-complete'"),
    'static/real-deploy-and-four-of-four-proof');
check(source.includes('tutorialEnergySubsidiesGranted')
    && source.includes('tutorialEnergySubsidiesRemaining')
    && source.includes('UNIT_DEFINITIONS[type].cost - this.playerEnergy')
    && source.includes('removeUnusedLevelOneTutorialEnergySubsidies'), 'static/exact-reversible-energy-subsidy');
const tutorialUpdateBody = methodBody('updateLevelOneTutorialSimulation', 'handleLevelOneTutorialSupplyCaptured');
check(tutorialUpdateBody.includes('this.updateUnits(deltaTime)')
    && tutorialUpdateBody.includes('this.updateSupplyPoints(deltaTime)')
    && !tutorialUpdateBody.includes('trySpawnAIUnit') && !tutorialUpdateBody.includes('tryUseAI'),
    'static/tutorial-update-whitelist-keeps-ai-frozen');
const captureBody = methodBody('handleLevelOneTutorialSupplyCaptured', 'grantLevelOneTutorialSprintSubsidy');
check(captureBody.includes('point.owner !== Team.Player')
    && captureBody.includes("this.tutorialProgress = 'capture-supply-complete'")
    && !captureBody.includes('tutorialVisiblePage'), 'static/real-capture-does-not-auto-page');
const sprintBody = methodBody('tryUseSprint', 'tryUseHeal');
check(sprintBody.includes('actuallyDeducted') && sprintBody.includes('actuallyApplied')
    && sprintBody.includes("this.tutorialProgress = 'use-sprint-complete'")
    && !sprintBody.includes('tutorialVisiblePage ='), 'static/real-sprint-does-not-auto-page');
check(/private hasClearedMandatoryLevelOne\(\): boolean \{\s*return this\.completedLevels\.has\(1\);\s*\}/.test(source)
    && !methodBody('canChallengeLevel', 'enforceMandatoryLevelOneGateSelection').includes('levelOneTutorialCompleted'),
    'static/level-one-victory-remains-sole-gate');
check((source.match(/auditBottomHudClearance\(metrics\)/g) ?? []).length === 1
    && !methodBody('update(deltaTime', 'buildGame').includes('auditBottomHudClearance'),
    'static/no-per-frame-fullscreen-layout-audit');

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

const openPage = async ({ viewport = { width: 1280, height: 720 }, seed, legacy } = {}) => {
    const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1 });
    await context.addInitScript(({ progressKey, legacyKey, saved, legacyValue }) => {
        localStorage.clear();
        if (saved) localStorage.setItem(progressKey, JSON.stringify(saved));
        if (legacyValue !== undefined) localStorage.setItem(legacyKey, `${legacyValue}`);
    }, { progressKey: PROGRESS_KEY, legacyKey: LEGACY_KEY, saved: seed, legacyValue: legacy });
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
    await page.waitForTimeout(5000);
    browserProblems.push(...problems.map((problem) => ({ ...problem, viewport })));
    return { context, page, problems };
};

const getController = async (page) => page.evaluate(async () => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    if (!controller) throw new Error('GameController not found');
    return true;
});

const tutorial = await openPage({ seed: baseSave() });
await getController(tutorial.page);
const flow = await tutorial.page.evaluate(async () => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const c = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.canChallengeLevel === 'function');
    c.currentLevel = 1;
    c.restartGame();
    c.startPanel.active = false;
    c.activateBattle();
    c.cleanupLevelOneTutorial(false);
    c.beginLevelOneTutorial();

    const initial = {
        progress: c.tutorialProgress,
        page: c.tutorialVisiblePage,
        previousVisible: c.tutorialPreviousButton.node.active,
        previousEnabled: c.tutorialVisiblePage > 0,
        nextEnabled: c.isLevelOneTutorialNextEnabled(),
        skipNodes: c.tutorialPanel.getComponentsInChildren(cc.UITransform)
            .filter((item) => item.node.name.toLowerCase().includes('skip')).length,
    };
    c.handleLevelOneTutorialNextAction();
    const operationStart = { progress: c.tutorialProgress, page: c.tutorialVisiblePage,
        nextEnabled: c.isLevelOneTutorialNextEnabled(), units: c.units.length };

    c.selectUnitType('medium');
    const wrongCardBlocked = c.selectedSheepType === undefined && c.units.length === 0;
    c.selectUnitType('small');
    const energyBeforeWrongLane = c.playerEnergy;
    const wrongLaneResult = c.tryDeploySelectedUnit(1);
    const wrongLaneBlocked = !wrongLaneResult && c.units.length === 0 && c.playerEnergy === energyBeforeWrongLane;

    const deployed = [];
    const assignments = [['small', 0], ['medium', 1], ['large', 2], ['giant', 3]];
    for (const [type, lane] of assignments) {
        if (c.selectedSheepType !== type) c.selectUnitType(type);
        const beforeEnergy = c.playerEnergy;
        const beforeUnits = c.units.length;
        const result = c.tryDeploySelectedUnit(lane);
        const unit = c.units.find((candidate) => candidate.id === c.tutorialDeploymentUnitIds.get(type));
        deployed.push({ type, lane, result, beforeEnergy, afterEnergy: c.playerEnergy,
            beforeUnits, afterUnits: c.units.length, unitType: unit?.definition?.type, unitLane: unit?.lane });
    }
    const afterFour = {
        progress: c.tutorialProgress,
        page: c.tutorialVisiblePage,
        nextEnabled: c.isLevelOneTutorialNextEnabled(),
        typeCount: c.tutorialCompletedDeploymentTypes.size,
        laneCount: c.tutorialCompletedDeploymentLanes.size,
        index: c.tutorialDeploymentIndex,
        taskStrings: c.tutorialTaskLabels.map((label) => label.string),
        taskColors: c.tutorialTaskLabels.map((label) => [label.color.r, label.color.g, label.color.b]),
        energySubsidies: [...c.tutorialEnergySubsidiesGranted],
        energyRemaining: [...c.tutorialEnergySubsidiesRemaining.entries()],
    };
    const beforeBack = { units: c.units.length, energy: c.playerEnergy, index: c.tutorialDeploymentIndex };
    c.handleLevelOneTutorialPreviousAction();
    const backState = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        units: c.units.length, energy: c.playerEnergy, index: c.tutorialDeploymentIndex };
    c.handleLevelOneTutorialNextAction();
    const returnedState = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        units: c.units.length, energy: c.playerEnergy, index: c.tutorialDeploymentIndex };
    c.handleLevelOneTutorialNextAction();
    const captureEntered = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        frozen: c.tutorialSimulationFrozen, supply: c.playerSupply };
    const point = c.supplyPoints[0];
    for (let index = 0; index < 900 && c.tutorialProgress === 'capture-supply'; index += 1) {
        c.updateLevelOneTutorialSimulation(0.1);
    }
    const captured = { page: c.tutorialVisiblePage, progress: c.tutorialProgress, owner: point.owner,
        supply: c.playerSupply, aiUnits: c.units.filter((unit) => unit.team === 1).length,
        aiSpawned: c.aiStats.unitsSpawned };
    c.handleLevelOneTutorialNextAction();
    const sprintEntered = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        supply: c.playerSupply, subsidy: c.tutorialSprintSubsidyRemaining };
    const beforeWrongTactic = { supply: c.playerSupply, healUses: c.playerStats.healUses };
    c.tryUseHeal(0);
    const wrongTacticBlocked = c.playerSupply === beforeWrongTactic.supply
        && c.playerStats.healUses === beforeWrongTactic.healUses;
    const readySupply = c.playerSupply;
    c.playerSupply = 0;
    c.tryUseSprint(0);
    const insufficientSprintBlocked = c.tutorialProgress === 'use-sprint'
        && c.playerStats.sprintUses === 0 && c.playerSprintRemaining === 0;
    c.playerSupply = readySupply;
    const beforeSprint = { supply: c.playerSupply, uses: c.playerStats.sprintUses };
    c.tryUseSprint(0);
    const afterSprint = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        supply: c.playerSupply, uses: c.playerStats.sprintUses, remaining: c.playerSprintRemaining,
        cooldown: c.playerSprintCooldown, subsidy: c.tutorialSprintSubsidyRemaining };
    c.tryUseSprint(0);
    const repeatedSprintBlocked = c.playerSupply === afterSprint.supply
        && c.playerStats.sprintUses === afterSprint.uses;
    c.handleLevelOneTutorialPreviousAction();
    const sprintBack = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        supply: c.playerSupply, uses: c.playerStats.sprintUses, remaining: c.playerSprintRemaining };
    c.handleLevelOneTutorialNextAction();
    c.handleLevelOneTutorialNextAction();
    c.handleLevelOneTutorialNextAction();
    const beforeComplete = { page: c.tutorialVisiblePage, progress: c.tutorialProgress,
        gateLocked: !c.canChallengeLevel(2) };
    c.handleLevelOneTutorialNextAction();
    const elapsedBefore = c.battleElapsedSeconds;
    c.update(0.1);
    const completed = { flag: c.levelOneTutorialCompleted, version: c.levelOneTutorialVersion,
        flow: c.tutorialFlowActive, frozen: c.tutorialSimulationFrozen, panel: c.tutorialPanel.active,
        gateLocked: !c.canChallengeLevel(2), simulationResumed: c.battleElapsedSeconds > elapsedBefore };
    return { initial, operationStart, wrongCardBlocked, wrongLaneBlocked, deployed, afterFour,
        beforeBack, backState, returnedState, captureEntered, captured, sprintEntered,
        wrongTacticBlocked, insufficientSprintBlocked, beforeSprint, afterSprint,
        repeatedSprintBlocked, sprintBack, beforeComplete, completed };
});

check(flow.initial.progress === 'welcome' && flow.initial.page === 0 && flow.initial.previousVisible
    && !flow.initial.previousEnabled && flow.initial.nextEnabled && flow.initial.skipNodes === 0,
    'runtime/first-page-fixed-controls-and-no-skip', flow.initial);
check(flow.operationStart.progress === 'deploy-four-sheep' && flow.operationStart.page === 1
    && !flow.operationStart.nextEnabled && flow.operationStart.units === 0
    && flow.wrongCardBlocked && flow.wrongLaneBlocked,
    'runtime/wrong-card-lane-and-early-next-blocked', flow);
check(flow.deployed.every((item, index) => item.result && item.afterUnits === item.beforeUnits + 1
    && item.unitType === item.type && item.unitLane === index)
    && flow.afterFour.typeCount === 4 && flow.afterFour.laneCount === 4 && flow.afterFour.index === 4,
    'runtime/four-real-unique-deployments', { deployed: flow.deployed, afterFour: flow.afterFour });
check(flow.afterFour.progress === 'deploy-four-sheep-complete' && flow.afterFour.page === 1
    && flow.afterFour.nextEnabled && flow.afterFour.taskStrings.every((value) => value.startsWith('✓'))
    && flow.afterFour.taskColors.every(([r, g]) => g > r),
    'runtime/four-of-four-lights-next-without-auto-page', flow.afterFour);
check(flow.afterFour.energySubsidies.length === 4
    && flow.afterFour.energyRemaining.every(([, remaining]) => remaining === 0)
    && flow.deployed[3].beforeEnergy < 70 && flow.deployed[3].afterEnergy === 0,
    'runtime/exact-energy-top-up-consumed-on-real-cost', { deployed: flow.deployed, afterFour: flow.afterFour });
check(flow.backState.page === 0 && flow.returnedState.page === 1
    && flow.backState.progress === 'deploy-four-sheep-complete'
    && flow.beforeBack.units === flow.backState.units && flow.backState.units === flow.returnedState.units
    && flow.beforeBack.energy === flow.backState.energy && flow.backState.energy === flow.returnedState.energy
    && flow.beforeBack.index === flow.backState.index && flow.backState.index === flow.returnedState.index,
    'runtime/previous-page-never-rolls-back-or-duplicates-state', { before: flow.beforeBack,
        back: flow.backState, returned: flow.returnedState });
check(flow.captureEntered.page === 2 && flow.captureEntered.progress === 'capture-supply'
    && flow.captureEntered.frozen && flow.captured.owner === 0
    && flow.captured.progress === 'capture-supply-complete' && flow.captured.page === 2
    && flow.captured.aiUnits === 0 && flow.captured.aiSpawned === 0,
    'runtime/real-capture-owner-and-ai-frozen-without-auto-page', { entered: flow.captureEntered, captured: flow.captured });
check(flow.sprintEntered.page === 3 && flow.sprintEntered.progress === 'use-sprint'
    && flow.sprintEntered.supply >= 2 && flow.wrongTacticBlocked && flow.insufficientSprintBlocked,
    'runtime/sprint-page-subsidy-and-invalid-actions-blocked', { entered: flow.sprintEntered,
        wrongTacticBlocked: flow.wrongTacticBlocked, insufficientSprintBlocked: flow.insufficientSprintBlocked });
check(flow.afterSprint.progress === 'use-sprint-complete' && flow.afterSprint.page === 3
    && flow.beforeSprint.supply - flow.afterSprint.supply === 2
    && flow.afterSprint.uses === flow.beforeSprint.uses + 1
    && flow.afterSprint.remaining > 0 && flow.afterSprint.cooldown > 0 && flow.afterSprint.subsidy === 0
    && flow.repeatedSprintBlocked,
    'runtime/real-sprint-deducts-two-applies-effect-and-does-not-auto-page', flow.afterSprint);
check(flow.sprintBack.page === 2 && flow.sprintBack.progress === 'use-sprint-complete'
    && flow.sprintBack.supply === flow.afterSprint.supply && flow.sprintBack.uses === flow.afterSprint.uses
    && flow.sprintBack.remaining === flow.afterSprint.remaining,
    'runtime/previous-after-sprint-keeps-effect-and-cost', flow.sprintBack);
check(flow.beforeComplete.page === 5 && flow.beforeComplete.progress === 'ready' && flow.beforeComplete.gateLocked
    && flow.completed.flag && flow.completed.version === 4 && !flow.completed.flow && !flow.completed.frozen
    && !flow.completed.panel && flow.completed.gateLocked && flow.completed.simulationResumed,
    'runtime/completion-resumes-simulation-but-does-not-unlock-levels', flow.completed);

const migrationCases = [];
for (const testCase of [
    { name: 'old-skipped-no-win', seed: baseSave({ schemaVersion: 6, levelOneTutorialCompleted: true,
        levelOneTutorialVersion: undefined }) },
    { name: 'old-real-winner', seed: baseSave({ schemaVersion: 6, highestUnlockedLevel: 6,
        completedLevels: [1], levelOneTutorialCompleted: true, levelOneTutorialVersion: undefined }) },
]) {
    const opened = await openPage({ seed: testCase.seed });
    const state = await opened.page.evaluate(() => {
        const scene = globalThis.cc?.director?.getScene?.();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        if (scene) visit(scene);
        return { fallback: true };
    }).catch(() => ({ fallback: true }));
    const actual = await opened.page.evaluate(async () => {
        const cc = await System.import('cc');
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(cc.director.getScene());
        const c = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        return { tutorialCompleted: c.levelOneTutorialCompleted, tutorialVersion: c.levelOneTutorialVersion,
            completedOne: c.completedLevels.has(1), canChallenge: [2, 3, 4, 5, 6].map((id) => c.canChallengeLevel(id)),
            saved: JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2')) };
    });
    migrationCases.push({ name: testCase.name, state, actual, problems: opened.problems });
    await opened.context.close();
}
check(!migrationCases[0].actual.tutorialCompleted && migrationCases[0].actual.tutorialVersion === 0
    && !migrationCases[0].actual.completedOne && migrationCases[0].actual.canChallenge.every((value) => !value),
    'runtime/old-skip-without-win-is-forced-through-new-tutorial', migrationCases[0]);
check(migrationCases[1].actual.tutorialCompleted && migrationCases[1].actual.tutorialVersion === 4
    && migrationCases[1].actual.completedOne && migrationCases[1].actual.canChallenge.every(Boolean),
    'runtime/old-real-winner-is-not-forced-and-keeps-unlocks', migrationCases[1]);

const layoutCases = [
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1024x720', width: 1024, height: 720 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: 'wide-2400x1080', width: 2400, height: 1080 },
];
const layoutResults = [];
for (const testCase of layoutCases) {
    const opened = await openPage({ viewport: { width: testCase.width, height: testCase.height },
        seed: baseSave({ highestUnlockedLevel: 6, completedLevels: [1],
            levelOneTutorialCompleted: true, levelOneTutorialVersion: 4 }) });
    const state = await opened.page.evaluate(async () => {
        const cc = await System.import('cc');
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(cc.director.getScene());
        const c = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        c.currentLevel = 1;
        c.restartGame();
        c.startPanel.active = false;
        c.activateBattle();
        c.cleanupLevelOneTutorial(false);
        c.beginLevelOneTutorial();
        const overlap = (left, right) => Math.max(0, Math.min(left.x + left.width, right.x + right.width)
            - Math.max(left.x, right.x)) * Math.max(0, Math.min(left.y + left.height, right.y + right.height)
            - Math.max(left.y, right.y));
        const pages = [];
        const progressByPage = ['welcome', 'deploy-four-sheep', 'capture-supply', 'use-sprint', 'battle-goal', 'ready'];
        c.tutorialDeploymentLane = 0;
        for (let index = 0; index < 6; index += 1) {
            c.tutorialVisiblePage = index;
            c.tutorialHighestViewedPage = 5;
            c.tutorialProgress = progressByPage[index];
            c.refreshLevelOneTutorialPresentation();
            const card = c.getLevelOneTutorialCardRect();
            const capsule = c.getLevelOneTutorialCapsuleRect();
            pages.push({ index, progressText: c.tutorialStepLabel.string,
                card: { x: card.x, y: card.y, width: card.width, height: card.height },
                previous: { x: c.tutorialPreviousButton.node.position.x, y: c.tutorialPreviousButton.node.position.y,
                    width: c.tutorialPreviousButton.node.getComponent(cc.UITransform).width },
                next: { x: c.tutorialNextButton.node.position.x, y: c.tutorialNextButton.node.position.y,
                    width: c.tutorialNextButton.node.getComponent(cc.UITransform).width },
                targetOverlap: c.tutorialTargetRects.reduce((total, rect) => total + overlap(card, rect), 0),
                capsuleOverlap: capsule ? overlap(card, capsule) : 0 });
        }
        const cardRects = [...c.typeButtons.values()].map((button) => c.getLevelOneTutorialTargetRect(button.node));
        const hudRects = [c.playerSupplyBadge, c.playerBaseHudNode, c.playerEnergyBar.node]
            .map((node) => c.getLevelOneTutorialTargetRect(node));
        const clearance = Math.min(...hudRects.map((rect) => rect.y))
            - Math.max(...cardRects.map((rect) => rect.y + rect.height));
        return { metrics: c.screenMetrics, pages, clearance };
    });
    await opened.page.screenshot({ path: path.join(OUTPUT_DIR, `${testCase.name}-tutorial-fixed-card.png`), fullPage: true });
    const first = state.pages[0].card;
    const passed = state.pages.every((item) => item.card.width === 560 && item.card.height === 280
        && Math.abs(item.card.x - first.x) < 0.01 && Math.abs(item.card.y - first.y) < 0.01
        && item.previous.width === 210 && item.next.width === 210
        && item.previous.x === -112 && item.next.x === 112 && item.previous.y === -108 && item.next.y === -108
        && item.progressText === `第${item.index + 1}步 / 共6步`
        && (item.index < 1 || item.index > 3 || item.targetOverlap < 0.01)
        && item.capsuleOverlap < 0.01)
        && first.x >= state.metrics.safeLeft - 0.01
        && first.x + first.width <= state.metrics.safeRight + 0.01
        && first.y >= state.metrics.safeBottom - 0.01
        && first.y + first.height <= state.metrics.safeTop + 0.01
        && state.clearance >= 12 - 0.01 && opened.problems.length === 0;
    check(passed, `runtime/layout-${testCase.name}`, state);
    layoutResults.push({ testCase, passed, state, problems: opened.problems });
    await opened.context.close();
}

await browser.close();
check(browserProblems.length === 0, 'runtime/no-browser-errors-or-request-failures', browserProblems);

const report = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_URL,
    passed: checks.every((item) => item.passed),
    summary: { passed: checks.filter((item) => item.passed).length, total: checks.length },
    checks,
    flow,
    migrationCases,
    layoutResults,
    browserProblems,
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'tutorial04_ui07_audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary));
if (!report.passed) process.exitCode = 1;
