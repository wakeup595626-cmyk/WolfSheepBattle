import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-tutorial01/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8776';
const GAME_VERSION = 'v1.3.0-dev-tutorial01';
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
const SOURCE_PATH = path.join(PROJECT_ROOT, 'assets', 'scripts', 'GameController.ts');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details = undefined) => {
    checks.push({ name, passed: Boolean(passed), details });
};
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const rectOverlap = (left, right) => Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x))
    * Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));

const source = fs.readFileSync(SOURCE_PATH, 'utf8');
check(source.includes("const GAME_VERSION = 'v1.3.0-dev-tutorial01';"), 'static/version-is-tutorial01');
check(source.includes('const LEVEL_PROGRESS_SCHEMA_VERSION = 5;'), 'static/progress-schema-is-5');
check(/type LevelOneTutorialStep = 'inactive'[\s\S]*'completed';/.test(source),
    'static/explicit-tutorial-state-machine');
check(source.includes('levelOneTutorialCompleted: boolean;')
    && source.includes('this.levelOneTutorialCompleted = this.completedLevels.has(1);'),
    'static/persistent-field-and-legacy-migration');
check(/private tryDeploySelectedUnit\(lane: number\): boolean/.test(source)
    && source.includes("this.advanceLevelOneTutorial('resource-explanation');"),
    'static/deploy-reuses-formal-entry-and-advances-after-success');
check((source.match(/new Node\('TutorialPanel'\)/g) ?? []).length === 1,
    'static/reuses-one-tutorial-panel');
check((source.match(/tutorialPanel\.on\(NodeEventType\.TOUCH_/g) ?? []).length === 4,
    'static/registers-one-persistent-overlay-touch-set');
check(!/\btutorialCompleted\b/.test(source), 'static/no-legacy-runtime-only-tutorial-flag');
check(!source.includes('director.pause(') && !source.includes('game.pause('),
    'static/does-not-use-global-pause-for-tutorial');
check(!source.includes('shareTimeline') && !source.includes('onShareTimeline'),
    'static/does-not-touch-sharing-code');
check(source.includes('getLevelOneTutorialCompactCardPosition')
    && source.includes('LEVEL_ONE_TUTORIAL_COMPACT_CARD_HEIGHT'),
    'static/deploy-instruction-uses-lane-clear-compact-layout');
check(/id: 1,[\s\S]{0,700}playerStartEnergy: ENERGY_MAX,[\s\S]{0,200}aiStartEnergy: 0,[\s\S]{0,200}aiInitialDecisionDelay: 8\.4,[\s\S]{0,500}aiAllowedUnitTypes: \[SheepType\.Small\],[\s\S]{0,120}aiMaxActiveUnits: 2,[\s\S]{0,120}allowAITactics: false/.test(source),
    'static/level-one-config-preserved');

const consoleProblems = [];
const requestFailures = [];

const getController = async (page) => page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        for (const child of node.children) visit(child);
    };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.beginLevelOneTutorial === 'function');
    if (!controller) throw new Error('GameController not found');
    return {
        currentLevel: controller.currentLevel,
        isStarted: controller.isStarted,
        step: controller.tutorialStep,
        flowActive: controller.tutorialFlowActive,
        frozen: controller.tutorialSimulationFrozen,
    };
});

const controllerSnapshot = async (page) => page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.beginLevelOneTutorial === 'function');
    if (!controller) throw new Error('GameController not found');
    const activePlayerUnits = controller.units.filter((unit) => unit.team === 0 && controller.isActiveBattleUnit(unit));
    const panelTransform = controller.tutorialPanel?.getComponent(cc.UITransform);
    const panelWorld = panelTransform?.convertToWorldSpaceAR(new cc.Vec3());
    const toPanelRect = (node) => {
        const transform = node?.getComponent(cc.UITransform);
        const world = transform?.convertToWorldSpaceAR(new cc.Vec3());
        const size = transform?.contentSize;
        if (!world || !panelWorld || !size) return undefined;
        const x = world.x - panelWorld.x;
        const y = world.y - panelWorld.y;
        return { x: x - size.width / 2, y: y - size.height / 2, width: size.width, height: size.height };
    };
    const cardRect = toPanelRect(controller.tutorialCard);
    const skipRect = toPanelRect(controller.tutorialSkipButton?.node);
    return {
        versionText: nodes.map((node) => node.getComponent?.(cc.Label)?.string ?? '')
            .find((text) => text.includes('羊狼四线战 v')) ?? '',
        currentLevel: controller.currentLevel,
        step: controller.tutorialStep,
        flowActive: controller.tutorialFlowActive,
        frozen: controller.tutorialSimulationFrozen,
        panelActive: Boolean(controller.tutorialPanel?.activeInHierarchy),
        selectedSheepType: controller.selectedSheepType,
        playerEnergy: controller.playerEnergy,
        aiEnergy: controller.aiEnergy,
        elapsed: controller.battleElapsedSeconds,
        aiDecisionCooldown: controller.aiDecisionCooldown,
        playerSpawnCooldown: controller.playerSpawnCooldown,
        playerUnitCount: activePlayerUnits.length,
        playerPositions: activePlayerUnits.map((unit) => ({ id: unit.id, y: unit.node.position.y })),
        tutorialCompleted: controller.levelOneTutorialCompleted,
        pauseActive: Boolean(controller.pausePanel?.activeInHierarchy),
        helpActive: Boolean(controller.helpPanel?.activeInHierarchy),
        replayConfirmActive: Boolean(controller.replayLevelOneTutorialConfirmPanel?.activeInHierarchy),
        replayButtonActive: Boolean(controller.replayLevelOneTutorialButton?.node?.activeInHierarchy),
        targetRectCount: controller.tutorialTargetRects.length,
        targetRects: controller.tutorialTargetRects.map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })),
        reservedRects: controller.getLevelOneTutorialReservedRects().map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })),
        cardRect,
        skipRect,
    };
});

const getTargetClientPoint = async (page, target) => page.evaluate(async (kind) => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.beginLevelOneTutorial === 'function');
    if (!controller) throw new Error('GameController not found');
    let node;
    if (kind === 'primary') node = controller.tutorialPrimaryButton?.node;
    if (kind === 'skip') node = controller.tutorialSkipButton?.node;
    if (kind === 'small') node = controller.typeButtons.get('small')?.node;
    if (kind === 'medium') node = controller.typeButtons.get('medium')?.node;
    if (kind.startsWith('lane:')) node = controller.laneHitAreas[Number(kind.slice(5))]?.node;
    if (!node?.isValid) throw new Error(`tutorial target unavailable: ${kind}`);
    const transform = node.getComponent(cc.UITransform);
    const world = transform.convertToWorldSpaceAR(new cc.Vec3());
    const panelTransform = controller.tutorialPanel.getComponent(cc.UITransform);
    const panelWorld = panelTransform.convertToWorldSpaceAR(new cc.Vec3());
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');
    const canvasRect = canvas.getBoundingClientRect();
    const visible = cc.view.getVisibleSize();
    const localX = world.x - panelWorld.x;
    const localY = world.y - panelWorld.y;
    return {
        x: canvasRect.left + (localX + visible.width / 2) / visible.width * canvasRect.width,
        y: canvasRect.top + (visible.height / 2 - localY) / visible.height * canvasRect.height,
        target: kind,
    };
}, target);

const tapTarget = async (page, target) => {
    const point = await getTargetClientPoint(page, target);
    await page.touchscreen.tap(point.x, point.y);
    await delay(180);
    return point;
};

const waitForTutorialStep = async (page, step, timeout = 45000) => {
    const deadline = Date.now() + timeout;
    let lastSnapshot;
    while (Date.now() < deadline) {
        lastSnapshot = await controllerSnapshot(page);
        if (lastSnapshot.step === step && lastSnapshot.flowActive) return;
        await delay(250);
    }
    throw new Error(`tutorial step timeout: expected=${step}, actual=${JSON.stringify(lastSnapshot)}`);
};

const findAndStartTutorial = async (page) => {
    await getController(page);
    await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.beginLevelOneTutorial === 'function');
        controller.currentLevel = 1;
        controller.levelOneTutorialCompleted = false;
        controller.restartGame();
        controller.isStarted = false;
        controller.startPanel.active = true;
        controller.startMenuActionLocked = false;
        controller.requestStartBattle();
    });
    await waitForTutorialStep(page, 'intro');
};

const invokeController = async (page, action, argument = undefined) => page.evaluate(async ({ actionName, actionArgument }) => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.beginLevelOneTutorial === 'function');
    if (!controller || typeof controller[actionName] !== 'function') {
        throw new Error(`controller method unavailable: ${actionName}`);
    }
    return controller[actionName](actionArgument);
}, { actionName: action, actionArgument: argument });

const createPage = async (browser, viewport, seedProgress = undefined) => {
    const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1 });
    await context.addInitScript(({ progressKey, seed }) => {
        localStorage.clear();
        if (seed) localStorage.setItem(progressKey, JSON.stringify(seed));
    }, { progressKey: PROGRESS_KEY, seed: seedProgress });
    const page = await context.newPage();
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
            consoleProblems.push({ type: message.type(), text: message.text() });
        }
    });
    page.on('pageerror', (error) => consoleProblems.push({ type: 'pageerror', text: error.message }));
    page.on('requestfailed', (request) => requestFailures.push({
        url: request.url(), failure: request.failure()?.errorText ?? 'unknown',
    }));
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForFunction(async () => {
        const cc = await System.import('cc');
        return Boolean(cc.director.getScene());
    }, undefined, { timeout: 30000 });
    await delay(6000);
    return { context, page };
};

const runtime = { functional: {}, skipCases: [], cleanup: {}, migration: {}, replay: {}, viewports: [] };
let browser;
try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const main = await createPage(browser, { width: 1280, height: 720 });
    const page = main.page;
    await findAndStartTutorial(page);
    const introBefore = await controllerSnapshot(page);
    await invokeController(page, 'update', 5);
    const introAfter = await controllerSnapshot(page);
    runtime.functional.intro = { before: introBefore, afterFiveSeconds: introAfter };
    await page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-intro.png') });
    check(introBefore.step === 'intro' && introBefore.frozen && introBefore.panelActive,
        'runtime/first-level-entry-shows-frozen-welcome', introBefore);
    check(introAfter.elapsed === introBefore.elapsed && introAfter.aiEnergy === introBefore.aiEnergy
        && introAfter.playerEnergy === introBefore.playerEnergy && introAfter.aiDecisionCooldown === introBefore.aiDecisionCooldown,
    'runtime/intro-freezes-timer-energy-and-ai-countdown', { introBefore, introAfter });

    await tapTarget(page, 'primary');
    const selectBeforeMedium = await controllerSnapshot(page);
    await tapTarget(page, 'medium');
    const selectAfterMedium = await controllerSnapshot(page);
    runtime.functional.select = { beforeMediumTap: selectBeforeMedium, afterMediumTap: selectAfterMedium };
    await page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-select-small.png') });
    check(selectBeforeMedium.step === 'select-small-sheep' && selectBeforeMedium.selectedSheepType === undefined,
        'runtime/start-button-enters-unselected-small-sheep-step', selectBeforeMedium);
    check(selectAfterMedium.step === 'select-small-sheep' && selectAfterMedium.selectedSheepType === undefined,
        'runtime/other-unit-card-is-blocked-during-small-sheep-step', selectAfterMedium);

    await tapTarget(page, 'small');
    const deployBeforeDrag = await controllerSnapshot(page);
    const dragPoint = await getTargetClientPoint(page, 'lane:1');
    await page.mouse.move(dragPoint.x, dragPoint.y);
    await page.mouse.down();
    await page.mouse.move(dragPoint.x + 48, dragPoint.y + 30, { steps: 3 });
    await page.mouse.up();
    await delay(180);
    const deployAfterDrag = await controllerSnapshot(page);
    runtime.functional.deploy = { beforeDrag: deployBeforeDrag, afterDrag: deployAfterDrag, dragPoint };
    await page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-deploy-lane.png') });
    check(deployBeforeDrag.step === 'deploy-to-lane' && deployBeforeDrag.selectedSheepType === 'small',
        'runtime/real-small-card-tap-enters-lane-step', deployBeforeDrag);
    check(Boolean(deployBeforeDrag.cardRect)
        && deployBeforeDrag.cardRect.width <= 96
        && deployBeforeDrag.cardRect.height <= 174
        && deployBeforeDrag.targetRects.every((target) => rectOverlap(deployBeforeDrag.cardRect, target) < 0.01)
        && deployBeforeDrag.reservedRects.every((reserved) => rectOverlap(deployBeforeDrag.cardRect, reserved) < 0.01)
        && Boolean(deployBeforeDrag.skipRect)
        && deployBeforeDrag.targetRects.every((target) => rectOverlap(deployBeforeDrag.skipRect, target) < 0.01)
        && deployBeforeDrag.reservedRects.every((reserved) => rectOverlap(deployBeforeDrag.skipRect, reserved) < 0.01),
    'runtime/deploy-instruction-card-clears-lanes-and-hud', deployBeforeDrag);
    check(deployAfterDrag.step === 'deploy-to-lane' && deployAfterDrag.playerUnitCount === deployBeforeDrag.playerUnitCount,
        'runtime/lane-drag-does-not-deploy-or-advance', { deployBeforeDrag, deployAfterDrag });

    const deployBeforeTap = await controllerSnapshot(page);
    await tapTarget(page, 'lane:1');
    const resourceStep = await controllerSnapshot(page);
    runtime.functional.resource = resourceStep;
    await page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-resource.png') });
    const smallCost = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        return controller.unitDefinitions?.small?.cost ?? 12;
    });
    check(resourceStep.step === 'resource-explanation'
        && resourceStep.playerUnitCount === deployBeforeTap.playerUnitCount + 1
        && Math.abs(resourceStep.playerEnergy - (deployBeforeTap.playerEnergy - smallCost)) < 0.001,
    'runtime/one-real-lane-tap-spawns-once-deducts-once-and-advances', { deployBeforeTap, resourceStep, smallCost });
    check(resourceStep.targetRectCount === 7, 'runtime/resource-step-highlights-energy-supply-points-and-tactics', resourceStep.targetRects);

    await tapTarget(page, 'primary');
    const goalStep = await controllerSnapshot(page);
    runtime.functional.goal = goalStep;
    await page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-goal.png') });
    check(goalStep.step === 'pause-and-goal-explanation' && goalStep.targetRectCount === 3,
        'runtime/next-button-enters-pause-and-goal-step', goalStep);
    await tapTarget(page, 'primary');
    await delay(120);
    const completed = await controllerSnapshot(page);
    await invokeController(page, 'update', 0.35);
    const resumed = await controllerSnapshot(page);
    runtime.functional.completed = { completed, resumed, save: await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY) };
    check(completed.step === 'completed' && !completed.flowActive && !completed.frozen && completed.tutorialCompleted,
        'runtime/completion-persists-and-clears-overlay', completed);
    check(resumed.elapsed > completed.elapsed && resumed.playerPositions.some((unit, index) =>
        Math.abs(unit.y - (completed.playerPositions[index]?.y ?? unit.y)) > 0.001),
    'runtime/completion-resumes-the-existing-sheep-without-respawn', { completed, resumed });

    const makeTutorialAt = async (step) => page.evaluate(async (wantedStep) => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        controller.currentLevel = 1;
        controller.levelOneTutorialCompleted = false;
        controller.isStarted = false;
        controller.restartGame();
        controller.activateBattle();
        controller.beginLevelOneTutorial();
        if (wantedStep === 'select-small-sheep') controller.handleLevelOneTutorialPrimaryAction();
        if (wantedStep === 'deploy-to-lane' || wantedStep === 'resource-explanation' || wantedStep === 'pause-and-goal-explanation') {
            controller.handleLevelOneTutorialPrimaryAction();
            controller.selectUnitType('small');
        }
        if (wantedStep === 'resource-explanation' || wantedStep === 'pause-and-goal-explanation') {
            controller.tryDeploySelectedUnit(0);
        }
        if (wantedStep === 'pause-and-goal-explanation') controller.handleLevelOneTutorialPrimaryAction();
    }, step);
    for (const step of ['intro', 'select-small-sheep', 'deploy-to-lane', 'resource-explanation', 'pause-and-goal-explanation']) {
        await makeTutorialAt(step);
        const beforeSkip = await controllerSnapshot(page);
        await invokeController(page, 'skipLevelOneTutorial');
        const afterSkip = await controllerSnapshot(page);
        runtime.skipCases.push({ step, beforeSkip, afterSkip });
        check(afterSkip.step === 'completed' && !afterSkip.flowActive && !afterSkip.frozen && !afterSkip.panelActive
            && afterSkip.playerUnitCount === beforeSkip.playerUnitCount
            && afterSkip.playerEnergy >= beforeSkip.playerEnergy - 0.001,
        `runtime/skip-cleans-without-extra-unit-or-energy-deduction/${step}`, { beforeSkip, afterSkip });
    }

    await makeTutorialAt('intro');
    await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        controller.handleLevelOneTutorialPrimaryAction();
        controller.handleLevelOneTutorialPrimaryAction();
        controller.selectUnitType('small');
        controller.selectUnitType('small');
        controller.tryDeploySelectedUnit(0);
        controller.tryDeploySelectedUnit(0);
    });
    const rapid = await controllerSnapshot(page);
    runtime.functional.rapid = rapid;
    check(rapid.step === 'resource-explanation' && rapid.playerUnitCount === 1,
        'runtime/rapid-actions-cannot-skip-steps-or-double-deploy', rapid);

    const cleanupResults = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        const start = () => {
            controller.currentLevel = 1;
            controller.levelOneTutorialCompleted = false;
            controller.isStarted = false;
            controller.restartGame();
            controller.activateBattle();
            controller.beginLevelOneTutorial();
        };
        const snapshot = () => ({ step: controller.tutorialStep, frozen: controller.tutorialSimulationFrozen,
            active: controller.tutorialPanel.activeInHierarchy, flow: controller.tutorialFlowActive });
        start();
        cc.game.emit(cc.Game.EVENT_HIDE);
        const hidden = snapshot();
        cc.game.emit(cc.Game.EVENT_SHOW);
        const shown = snapshot();
        controller.restartGame();
        const restart = snapshot();
        start();
        controller.returnToTitle();
        const title = snapshot();
        start();
        controller.leaveBattleToLevelSelect();
        const levelSelect = snapshot();
        return { hidden, shown, restart, title, levelSelect };
    });
    runtime.cleanup = cleanupResults;
    check(cleanupResults.hidden.step === 'intro' && cleanupResults.hidden.frozen
        && cleanupResults.shown.step === 'intro' && cleanupResults.shown.frozen,
    'runtime/background-foreground-retains-correct-frozen-step', cleanupResults);
    check(['restart', 'title', 'levelSelect'].every((key) => cleanupResults[key].step === 'inactive'
        && !cleanupResults[key].frozen && !cleanupResults[key].active && !cleanupResults[key].flow),
    'runtime/restart-title-and-level-select-clear-tutorial-freeze-and-input-layer', cleanupResults);

    const migration = await page.evaluate(async (key) => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        const base = {
            schemaVersion: 4, highestUnlockedLevel: 1, selectedLevelId: 1,
            specialRoadTutorialSeen: false, levelFiveTutorialSeen: false, freezeUnlocked: false,
            selectedTactics: ['sprint', 'heal', 'freeze'],
            selectedTacticsByLevel: { 4: ['sprint', 'heal', 'freeze'], 5: ['sprint', 'heal', 'surge'], 6: ['sprint', 'heal', 'supplyBoost'] },
            bestResultsByLevel: {},
        };
        localStorage.setItem(key, JSON.stringify({ ...base, completedLevels: [1] }));
        controller.loadLevelProgress();
        const completedLegacy = { value: controller.levelOneTutorialCompleted, save: JSON.parse(localStorage.getItem(key)) };
        localStorage.setItem(key, JSON.stringify({ ...base, completedLevels: [] }));
        controller.loadLevelProgress();
        const incompleteLegacy = { value: controller.levelOneTutorialCompleted, save: JSON.parse(localStorage.getItem(key)) };
        localStorage.setItem(key, JSON.stringify({ ...base, completedLevels: [1], levelOneTutorialCompleted: false }));
        controller.loadLevelProgress();
        const explicitFalse = { value: controller.levelOneTutorialCompleted, save: JSON.parse(localStorage.getItem(key)) };
        return { completedLegacy, incompleteLegacy, explicitFalse };
    }, PROGRESS_KEY);
    runtime.migration = migration;
    check(migration.completedLegacy.value === true && migration.completedLegacy.save.schemaVersion === 5
        && migration.completedLegacy.save.levelOneTutorialCompleted === true,
    'runtime/migration-completed-level-one-becomes-seen', migration.completedLegacy);
    check(migration.incompleteLegacy.value === false && migration.incompleteLegacy.save.levelOneTutorialCompleted === false,
        'runtime/migration-unfinished-level-one-remains-unseen', migration.incompleteLegacy);
    check(migration.explicitFalse.value === false,
        'runtime/migration-preserves-explicit-new-field-false', migration.explicitFalse);

    const replay = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
        controller.currentLevel = 1;
        controller.levelOneTutorialCompleted = true;
        controller.isStarted = false;
        controller.restartGame();
        controller.activateBattle();
        controller.pauseGame();
        controller.openHelpPanel();
        const help = { visible: controller.helpPanel.activeInHierarchy, replayVisible: controller.replayLevelOneTutorialButton.node.activeInHierarchy };
        controller.requestLevelOneTutorialReplay();
        const confirmVisible = controller.replayLevelOneTutorialConfirmPanel.activeInHierarchy;
        controller.cancelLevelOneTutorialReplay();
        const cancelled = { help: controller.helpPanel.activeInHierarchy, confirm: controller.replayLevelOneTutorialConfirmPanel.activeInHierarchy };
        controller.requestLevelOneTutorialReplay();
        controller.confirmLevelOneTutorialReplay();
        const confirmed = { step: controller.tutorialStep, frozen: controller.tutorialSimulationFrozen,
            completed: controller.levelOneTutorialCompleted, units: controller.units.length, energy: controller.playerEnergy };
        controller.skipLevelOneTutorial();
        controller.currentLevel = 2;
        controller.isStarted = false;
        controller.restartGame();
        controller.activateBattle();
        const levelTwo = { step: controller.tutorialStep, active: controller.tutorialFlowActive, frozen: controller.tutorialSimulationFrozen };
        return { help, confirmVisible, cancelled, confirmed, levelTwo };
    });
    runtime.replay = replay;
    check(replay.help.visible && replay.help.replayVisible && replay.confirmVisible
        && replay.cancelled.help && !replay.cancelled.confirm,
    'runtime/level-one-help-replay-confirm-and-cancel-flow', replay);
    check(replay.confirmed.step === 'intro' && replay.confirmed.frozen && replay.confirmed.completed
        && replay.confirmed.units === 0 && replay.confirmed.energy === 100,
    'runtime/replay-restarts-cleanly-without-clearing-seen-flag', replay.confirmed);
    check(replay.levelTwo.step === 'inactive' && !replay.levelTwo.active && !replay.levelTwo.frozen,
        'runtime/levels-two-through-six-do-not-auto-start-level-one-tutorial', replay.levelTwo);
    await main.context.close();

    for (const viewport of [{ width: 1920, height: 1080 }, { width: 1600, height: 720 }]) {
        const visual = await createPage(browser, viewport);
        await findAndStartTutorial(visual.page);
        const viewportAudit = await visual.page.evaluate(async () => {
            const cc = await System.import('cc');
            const scene = cc.director.getScene();
            const nodes = [];
            const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
            visit(scene);
            const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component?.startPanel);
            const transform = controller.tutorialCard.getComponent(cc.UITransform);
            const world = transform.convertToWorldSpaceAR(new cc.Vec3());
            const panelWorld = controller.tutorialPanel.getComponent(cc.UITransform)
                .convertToWorldSpaceAR(new cc.Vec3());
            const size = transform.contentSize;
            const metrics = controller.screenMetrics;
            const localX = world.x - panelWorld.x;
            const localY = world.y - panelWorld.y;
            const card = { left: localX - size.width / 2, right: localX + size.width / 2,
                bottom: localY - size.height / 2, top: localY + size.height / 2 };
            return { viewport: { width: window.innerWidth, height: window.innerHeight }, safe: {
                left: metrics.safeLeft, right: metrics.safeRight, bottom: metrics.safeBottom, top: metrics.safeTop },
                card, step: controller.tutorialStep, frozen: controller.tutorialSimulationFrozen };
        });
        await visual.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.width}x${viewport.height}-intro.png`) });
        await tapTarget(visual.page, 'primary');
        await tapTarget(visual.page, 'small');
        const deployAudit = await controllerSnapshot(visual.page);
        runtime.viewports.push({ intro: viewportAudit, deploy: deployAudit });
        check(viewportAudit.step === 'intro' && viewportAudit.frozen
            && viewportAudit.card.left >= viewportAudit.safe.left - 0.1
            && viewportAudit.card.right <= viewportAudit.safe.right + 0.1
            && viewportAudit.card.bottom >= viewportAudit.safe.bottom - 0.1
            && viewportAudit.card.top <= viewportAudit.safe.top + 0.1,
        `runtime/safe-card-layout-${viewport.width}x${viewport.height}`, viewportAudit);
        check(deployAudit.step === 'deploy-to-lane'
            && deployAudit.cardRect?.width <= 96
            && deployAudit.targetRects.every((target) => rectOverlap(deployAudit.cardRect, target) < 0.01)
            && deployAudit.reservedRects.every((reserved) => rectOverlap(deployAudit.cardRect, reserved) < 0.01)
            && Boolean(deployAudit.skipRect)
            && deployAudit.targetRects.every((target) => rectOverlap(deployAudit.skipRect, target) < 0.01)
            && deployAudit.reservedRects.every((reserved) => rectOverlap(deployAudit.skipRect, reserved) < 0.01),
        `runtime/deploy-card-clears-interactive-and-hud-regions-${viewport.width}x${viewport.height}`, deployAudit);
        await visual.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.width}x${viewport.height}-deploy-lane.png`) });
        await visual.context.close();
    }
} catch (error) {
    check(false, 'runtime/unhandled-validator-error', error instanceof Error ? error.stack : String(error));
} finally {
    if (browser) await browser.close();
}

const report = {
    generatedAt: new Date().toISOString(),
    previewUrl: PREVIEW_URL,
    gameVersion: GAME_VERSION,
    passed: checks.every((entry) => entry.passed),
    totals: {
        checks: checks.length,
        passed: checks.filter((entry) => entry.passed).length,
        failed: checks.filter((entry) => !entry.passed).length,
    },
    checks,
    runtime,
    consoleProblems,
    requestFailures,
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'tutorial01_browser_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
    passed: report.passed,
    totals: report.totals,
    failed: checks.filter((entry) => !entry.passed).map((entry) => entry.name),
    output: path.join(OUTPUT_DIR, 'tutorial01_browser_audit.json'),
}, null, 2));
if (!report.passed) process.exitCode = 1;
