import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'tmp/battle01-ui10/runtime');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8791';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const check = (pass, name, details = undefined) => checks.push({ pass: Boolean(pass), name, details });
const browserProblems = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

const progress = {
    schemaVersion: 7,
    highestUnlockedLevel: 6,
    completedLevels: [1],
    selectedLevelId: 1,
    specialRoadTutorialSeen: true,
    levelOneTutorialCompleted: true,
    levelOneTutorialVersion: 5,
    freezeUnlocked: true,
    selectedTactics: ['sprint', 'heal', 'shock'],
    selectedTacticsByLevel: {
        4: ['heal', 'shock', 'freeze'],
        5: ['sprint', 'heal', 'surge'],
        6: ['sprint', 'heal', 'supplyBoost'],
    },
    levelFiveTutorialSeen: true,
    bestResultsByLevel: {},
};

const openPage = async (viewport, capsule = false) => {
    const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1 });
    await context.addInitScript(({ savedProgress, mockCapsule }) => {
        localStorage.clear();
        localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify(savedProgress));
        localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
            selectedBgmId: 'cheerful_lighthearted',
            musicVolume: 0.5,
            sfxVolume: 0.75,
            musicMuted: true,
            sfxMuted: true,
            lastNonZeroMusicVolume: 0.5,
            lastNonZeroSfxVolume: 0.75,
        }));
        if (mockCapsule) {
            globalThis.wx = {
                getWindowInfo: () => ({ windowWidth: innerWidth, windowHeight: innerHeight }),
                getSystemInfoSync: () => ({ windowWidth: innerWidth, windowHeight: innerHeight }),
                getMenuButtonBoundingClientRect: () => ({
                    left: innerWidth - 136,
                    right: innerWidth - 20,
                    top: 12,
                    bottom: 52,
                    width: 116,
                    height: 40,
                }),
            };
        }
    }, { savedProgress: progress, mockCapsule: capsule });
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
    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await waitForBattleArtReady(page);
    browserProblems.push(...problems.map((problem) => ({ ...problem, viewport })));
    return { context, page, problems };
};

const waitForBattleArtReady = async (page) => {
    let stableSamples = 0;
    let lastState;
    for (let attempt = 0; attempt < 600; attempt += 1) {
        lastState = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        if (!scene) return { ready: false, reason: 'no-scene' };
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.getBattleFlowDiagnostics === 'function');
        const ready = Boolean(controller?.artLoadingPanel
            && controller.artPilotLoadGeneration > 0
            && controller.artLoadingVisualProgress >= 0.999
            && !controller.battleArtPreparing
            && !controller.artLoadingCompletionPending && !controller.artLoadingPanel.active);
        return {
            ready,
            scene: scene.uuid,
            controller: controller?.node?.uuid,
            generation: controller?.artPilotLoadGeneration,
            preparing: controller?.battleArtPreparing,
            completionPending: controller?.artLoadingCompletionPending,
            panelActive: controller?.artLoadingPanel?.active,
            visual: controller?.artLoadingVisualProgress,
        };
        });
        stableSamples = lastState.ready ? stableSamples + 1 : 0;
        if (stableSamples >= 8) return;
        await page.waitForTimeout(100);
    }
    throw new Error(`battle art did not remain ready: ${JSON.stringify(lastState)}`);
};

const inController = async (page, callbackSource, argument = undefined) => page.evaluate(async ({ body, argument }) => {
    const cc = await System.import('cc');
    let controller;
    for (let attempt = 0; !controller && attempt < 120; attempt += 1) {
        const scene = cc.director.getScene();
        if (scene) {
            const nodes = [];
            const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
            visit(scene);
            controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
                component?.startPanel && typeof component.getBattleFlowDiagnostics === 'function');
        }
        if (!controller) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!controller) throw new Error('GameController not found');
    return Function('c', 'cc', 'argument', `return (${body})(c, cc, argument);`)(controller, cc, argument);
}, { body: callbackSource, argument });

const prepareBattleSource = `
    c.currentLevel = argument.level;
    c.specialRoadTutorialSeen = true;
    c.levelFiveTutorialSeen = true;
    c.restartGame();
    c.startPanel.active = false;
    c.levelSelectPanel.active = false;
    c.tacticDeckPanel.active = false;
    c.activateBattle();
    c.aiDecisionCooldown = 999999;
`;

const main = await openPage({ width: 1280, height: 720 });

const sameLane = await inController(main.page, `(c, cc, argument) => {
    ${prepareBattleSource}
    c.playerEnergy = 1000;
    c.selectedSheepType = 'small';
    const beforeEnergy = c.playerEnergy;
    const accepted = [];
    for (let index = 0; index < 20; index += 1) accepted.push(c.tryDeploySelectedUnit(0));
    const afterIssue = c.getBattleFlowDiagnostics();
    const queue = c.pendingDeployments[0][0];
    const queuedIds = queue.map((request) => request.id);
    const drainOrder = [];
    while (queue.length > 0) {
        for (const unit of [...c.units]) {
            if (unit.team === 0 && unit.lane === 0) c.startUnitDeath(unit);
        }
        c.updateUnitVisuals(1);
        const expectedHead = queue[0].id;
        c.processPendingDeployments();
        if (!queue.some((request) => request.id === expectedHead)) drainOrder.push(expectedHead);
        else break;
    }
    const afterDrain = c.getBattleFlowDiagnostics();
    return {
        beforeEnergy,
        afterEnergy: c.playerEnergy,
        accepted,
        afterIssue,
        afterDrain,
        queuedIds,
        drainOrder,
        remainingQueue: queue.length,
    };
}`, { level: 2 });
check(sameLane.accepted.every(Boolean) && sameLane.afterIssue.accepted === 20
    && sameLane.afterIssue.active.player === 1 && sameLane.afterIssue.pending.total === 19,
    'queue/20-same-lane-requests-accepted', sameLane);
check(sameLane.beforeEnergy - sameLane.afterEnergy === 20 * 12
    && sameLane.afterDrain.energySpent.player === 20 * 12
    && sameLane.afterDrain.materialized === 20,
    'queue/accepted-request-charged-exactly-once', sameLane);
check(sameLane.remainingQueue === 0
    && JSON.stringify(sameLane.queuedIds) === JSON.stringify(sameLane.drainOrder),
    'queue/FIFO-drain-order', sameLane);

const pauseAndCleanup = await inController(main.page, `(c, cc, argument) => {
    const prepare = (level = 2) => {
        c.currentLevel = level;
        c.restartGame();
        c.startPanel.active = false;
        c.levelSelectPanel.active = false;
        c.activateBattle();
        c.aiDecisionCooldown = 999999;
        c.playerEnergy = 1000;
        c.selectedSheepType = 'small';
    };
    const enqueue = () => {
        for (let index = 0; index < 5; index += 1) c.tryDeploySelectedUnit(0);
        return c.getBattleFlowDiagnostics().pending.total;
    };
    prepare();
    const pauseBefore = enqueue();
    const pausePositions = c.units.map((unit) => [unit.id, unit.node.position.y]);
    c.isPaused = true;
    c.processPendingDeployments();
    const pauseAfter = c.getBattleFlowDiagnostics().pending.total;
    const pausedPositionsAfter = c.units.map((unit) => [unit.id, unit.node.position.y]);
    c.isPaused = false;

    prepare();
    enqueue();
    c.restartGame();
    const restartPending = c.getBattleFlowDiagnostics().pending.total;
    const restartUnits = c.units.length;

    prepare();
    enqueue();
    c.returnToTitle();
    const titlePending = c.getBattleFlowDiagnostics().pending.total;
    const titleUnits = c.units.length;

    prepare();
    enqueue();
    c.currentLevel = 3;
    c.restartGame();
    const levelPending = c.getBattleFlowDiagnostics().pending.total;
    const levelUnits = c.units.length;

    prepare();
    enqueue();
    c.finishGame(false);
    const finishPending = c.getBattleFlowDiagnostics().pending.total;
    return {
        pauseBefore, pauseAfter, pausePositions, pausedPositionsAfter,
        restartPending, restartUnits, titlePending, titleUnits,
        levelPending, levelUnits, finishPending,
    };
}`);
check(pauseAndCleanup.pauseBefore === pauseAndCleanup.pauseAfter
    && JSON.stringify(pauseAndCleanup.pausePositions) === JSON.stringify(pauseAndCleanup.pausedPositionsAfter),
    'queue/pause-freezes-pending-and-units', pauseAndCleanup);
check(pauseAndCleanup.restartPending === 0 && pauseAndCleanup.restartUnits === 0
    && pauseAndCleanup.titlePending === 0 && pauseAndCleanup.titleUnits === 0
    && pauseAndCleanup.levelPending === 0 && pauseAndCleanup.levelUnits === 0
    && pauseAndCleanup.finishPending === 0,
    'queue/restart-title-level-finish-cleanup', pauseAndCleanup);

const mixed60 = await inController(main.page, `(c, cc, argument) => {
    ${prepareBattleSource}
    c.playerEnergy = 5000;
    c.aiEnergy = 5000;
    const types = ['small', 'medium', 'large', 'giant'];
    for (let index = 0; index < 30; index += 1) {
        c.selectedSheepType = types[index % types.length];
        c.tryDeploySelectedUnit(index % 4);
        c.trySpawnAIUnit();
    }
    const diagnostics = c.getBattleFlowDiagnostics();
    const playerCommitted = diagnostics.active.player
        + diagnostics.pending.byLane.reduce((sum, lane) => sum + lane.player, 0);
    const aiCommitted = diagnostics.active.ai
        + diagnostics.pending.byLane.reduce((sum, lane) => sum + lane.ai, 0);
    const exactOverlaps = [];
    for (let left = 0; left < c.units.length; left += 1) {
        for (let right = left + 1; right < c.units.length; right += 1) {
            const a = c.units[left];
            const b = c.units[right];
            if (a.lane === b.lane && a.team === b.team
                && Math.abs(a.node.position.y - b.node.position.y) < 0.001) exactOverlaps.push([a.id, b.id]);
        }
    }
    return { diagnostics, playerCommitted, aiCommitted, exactOverlaps };
}`, { level: 5 });
check(mixed60.diagnostics.accepted === 60 && mixed60.diagnostics.committedLoad === 60
    && mixed60.playerCommitted === 30 && mixed60.aiCommitted === 30,
    'queue/four-lane-mixed-60-effective-requests', mixed60);
check(mixed60.playerCommitted > 8 && mixed60.aiCommitted > 8
    && mixed60.diagnostics.rejectedByEmergencyLoad === 0,
    'limits/both-factions-exceed-eight', mixed60);
check(mixed60.exactOverlaps.length === 0, 'spawn/no-exact-same-team-overlap', mixed60.exactOverlaps);

const emergency = await inController(main.page, `(c, cc, argument) => {
    ${prepareBattleSource}
    c.playerEnergy = 100000;
    c.aiEnergy = 100000;
    c.selectedSheepType = 'small';
    c.tryDeploySelectedUnit(0);
    const definition = c.units[0].definition;
    for (let index = 1; index < 128; index += 1) {
        c.issueDeploymentRequest(index % 2, index % 4, definition);
    }
    const atLimit = c.getBattleFlowDiagnostics();
    const playerBefore = c.playerEnergy;
    const aiBefore = c.aiEnergy;
    const playerRejected = c.issueDeploymentRequest(0, 0, definition);
    const aiRejected = c.issueDeploymentRequest(1, 0, definition);
    const after = c.getBattleFlowDiagnostics();
    return {
        atLimit,
        playerBefore,
        playerAfter: c.playerEnergy,
        aiBefore,
        aiAfter: c.aiEnergy,
        playerRejected,
        aiRejected,
        after,
    };
}`, { level: 5 });
check(emergency.atLimit.emergencyActiveUnitLimit === 128
    && emergency.atLimit.committedLoad === 128
    && !emergency.playerRejected.accepted && !emergency.aiRejected.accepted,
    'safety/technical-limit-boundary-is-128', emergency);
check(emergency.playerBefore === emergency.playerAfter && emergency.aiBefore === emergency.aiAfter
    && emergency.after.committedLoad === 128 && emergency.after.rejectedByEmergencyLoad === 2,
    'safety/rejection-is-symmetric-and-never-charges', emergency);

const levelFive = await inController(main.page, `(c, cc, argument) => {
    ${prepareBattleSource}
    c.playerEnergy = 3000;
    c.aiEnergy = 3000;
    c.selectedSheepType = 'small';
    for (let index = 0; index < 20; index += 1) c.tryDeploySelectedUnit(2);
    for (let index = 0; index < 20; index += 1) c.trySpawnAIUnit();
    const beforeRecycle = c.getBattleFlowDiagnostics();
    const recyclable = [...c.units];
    for (const unit of recyclable) c.startUnitDeath(unit);
    c.updateUnitVisuals(1);
    const poolAfterDeath = c.levelFiveSmallUnitPool.length;
    for (let index = 0; index < 8; index += 1) c.processPendingDeployments();
    const reused = c.units.some((unit) => recyclable.includes(unit));
    return {
        beforeRecycle,
        poolAfterDeath,
        poolAfterReuse: c.levelFiveSmallUnitPool.length,
        reused,
    };
}`, { level: 5 });
check(levelFive.beforeRecycle.accepted === 40 && levelFive.beforeRecycle.committedLoad === 40,
    'level5/high-frequency-40-requests-without-low-cap', levelFive);
check(levelFive.poolAfterDeath > 0 && levelFive.poolAfterReuse < levelFive.poolAfterDeath,
    'level5/small-unit-pool-recycles-and-reuses', levelFive);

const tutorial = await inController(main.page, `(c, cc) => {
    c.currentLevel = 1;
    c.restartGame();
    c.startPanel.active = false;
    c.activateBattle();
    c.cleanupLevelOneTutorial(false);
    c.beginLevelOneTutorial();
    c.handleLevelOneTutorialNextAction();
    const firstTargets = c.tutorialTargetRects.map((rect) => ({
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
    }));
    const deployments = [];
    for (const [type, lane] of [['small', 0], ['medium', 1], ['large', 2], ['giant', 3]]) {
        c.selectUnitType(type);
        deployments.push(c.tryDeploySelectedUnit(lane));
    }
    const afterFour = {
        progress: c.tutorialProgress,
        index: c.tutorialDeploymentIndex,
        types: c.tutorialCompletedDeploymentTypes.size,
        lanes: c.tutorialCompletedDeploymentLanes.size,
        materialized: c.getBattleFlowDiagnostics().materialized,
    };
    c.handleLevelOneTutorialNextAction();
    const captureTargets = c.tutorialTargetRects.map((rect) => ({
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
    }));
    const supplyY = c.supplyPoints[0].node.position.y;
    const midpointY = c.getLaneSupplyPointY(0);
    c.levelOneTutorialCompleted = true;
    c.completedLevels.delete(1);
    const gateBeforeVictory = c.canChallengeLevel(2);
    c.completedLevels.add(1);
    const gateAfterVictory = c.canChallengeLevel(2);
    return {
        firstTargets, deployments, afterFour, captureTargets, supplyY, midpointY,
        gateBeforeVictory, gateAfterVictory,
    };
}`);
check(tutorial.firstTargets.length === 2
    && Math.abs(tutorial.firstTargets[0].width - 96) < 0.1
    && Math.abs(tutorial.firstTargets[0].height - 40) < 0.1
    && Math.abs(tutorial.firstTargets[1].width - 164) < 0.1
    && Math.abs(tutorial.firstTargets[1].height - 52) < 0.1,
    'tutorial/live-card-and-road-target-rectangles', tutorial);
check(tutorial.deployments.every(Boolean) && tutorial.afterFour.progress === 'deploy-four-sheep-complete'
    && tutorial.afterFour.index === 4 && tutorial.afterFour.types === 4
    && tutorial.afterFour.lanes === 4 && tutorial.afterFour.materialized === 4,
    'tutorial/four-real-deployments-materialize', tutorial);
check(tutorial.captureTargets.length === 2 && Math.abs(tutorial.supplyY - tutorial.midpointY) <= 1,
    'tutorial/supply-highlight-follows-real-midpoint', tutorial);
check(!tutorial.gateBeforeVictory && tutorial.gateAfterVictory,
    'tutorial/level-one-victory-remains-sole-progression-gate', tutorial);

const touchSample = await openPage({ width: 1280, height: 720 });
const canvasBox = await touchSample.page.locator('canvas').boundingBox();
const touchCoordinates = await inController(touchSample.page, `(c) => {
    c.cleanupLevelOneTutorial(false);
    c.currentLevel = 2;
    c.restartGame();
    c.startPanel.active = true;
    c.startMenuActionLocked = false;
    c.requestStartBattle();
    return {
        beforeAccepted: c.getBattleFlowDiagnostics().accepted,
        visibleWidth: c.screenMetrics.visibleWidth,
        visibleHeight: c.screenMetrics.visibleHeight,
        laneX: c.laneHitAreas[0].node.position.x,
        laneY: c.laneHitAreas[0].node.position.y,
    };
}`);
await waitForBattleArtReady(touchSample.page);
const touchSetup = await inController(touchSample.page, `(c, cc, coordinates) => {
    c.playerEnergy = 100;
    c.selectUnitType('small');
    window.__battle01LaneTouchCalls = [];
    const originalDeploy = c.tryDeploySelectedUnit.bind(c);
    c.tryDeploySelectedUnit = (lane) => {
        window.__battle01LaneTouchCalls.push(lane);
        return originalDeploy(lane);
    };
    return {
        ...coordinates,
        beforeAccepted: c.getBattleFlowDiagnostics().accepted,
        canHandle: c.canHandleLaneSpawnTouch(),
        blockingModal: c.isBlockingModalVisible(),
        state: {
            isStarted: c.isStarted,
            isPaused: c.isPaused,
            isFinished: c.isFinished,
            artLoading: c.artLoadingPanel?.active,
            start: c.startPanel.active,
            result: c.resultPanel.active,
            tutorial: c.tutorialPanel.active,
            help: c.helpPanel.active,
            pause: c.pausePanel.active,
            preparing: c.battleArtPreparing,
            completionPending: c.artLoadingCompletionPending,
            loadingVisual: c.artLoadingVisualProgress,
            loadingTarget: c.artLoadingTargetProgress,
            loadingLabel: c.artLoadingLabel?.string,
            scene: cc.director.getScene()?.uuid,
            controller: c.node?.uuid,
        },
    };
}`, touchCoordinates);
await touchSample.page.waitForTimeout(250);
await touchSample.page.touchscreen.tap(
    canvasBox.x + (touchSetup.laneX + touchSetup.visibleWidth / 2) / touchSetup.visibleWidth * canvasBox.width,
    canvasBox.y + (touchSetup.visibleHeight / 2 - touchSetup.laneY) / touchSetup.visibleHeight * canvasBox.height,
);
await touchSample.page.waitForTimeout(150);
const touchResult = await inController(touchSample.page, `(c) => ({
    accepted: c.getBattleFlowDiagnostics().accepted,
    playerUnits: c.units.filter((unit) => unit.team === 0).length,
    calls: window.__battle01LaneTouchCalls,
})`);
check(touchSetup.canHandle && !touchSetup.blockingModal
    && touchResult.accepted === touchSetup.beforeAccepted + 1 && touchResult.playerUnits === 1
    && JSON.stringify(touchResult.calls) === JSON.stringify([0]),
    'input/first-lane-remains-clickable-by-real-touch', { touchSetup, touchResult });
await touchSample.context.close();

const viewports = [
    { name: '1280x720', width: 1280, height: 720, capsule: false },
    { name: '1920x1080', width: 1920, height: 1080, capsule: false },
    { name: 'wide-2400x1080', width: 2400, height: 1080, capsule: false },
    { name: 'phone-2340x1080-capsule', width: 2340, height: 1080, capsule: true },
];
const layouts = [];
for (const viewport of viewports) {
    const sample = viewport.name === '1280x720' ? main : await openPage(
        { width: viewport.width, height: viewport.height }, viewport.capsule);
    const layout = await inController(sample.page, `(c, cc) => {
        c.currentLevel = 6;
        c.restartGame();
        c.startPanel.active = false;
        c.activateBattle();
        const rect = (node) => {
            const box = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { left: box.x, right: box.x + box.width, bottom: box.y,
                top: box.y + box.height, width: box.width, height: box.height };
        };
        const cards = ['small', 'medium', 'large', 'giant'].map((type) => {
            const button = c.typeButtons.get(type);
            return {
                type,
                rect: rect(button.node),
                text: button.label.string,
                status: button.stateLabel.string,
                tier: button.tierBadgeLabel.string,
            };
        });
        const gaps = cards.slice(0, -1).map((card, index) => card.rect.bottom - cards[index + 1].rect.top);
        const lane1 = rect(c.laneHitAreas[0].node);
        const playerGates = c.playerSpawnGateRoots.map((node) => ({ y: node.position.y, rect: rect(node) }));
        const playerHud = [rect(c.playerSupplyBadge), rect(c.playerBaseHudNode), rect(c.playerEnergyBar.node)];
        const hudTop = Math.max(...playerHud.map((item) => item.top));
        const supply = c.supplyPoints.map((point) => ({ lane: point.lane, x: point.node.position.x,
            y: point.node.position.y, expectedY: c.getLaneSupplyPointY(point.lane) }));
        const roadEffects = c.laneEffectVisuals.map((node) => ({
            y: node.position.y,
            height: node.getComponent(cc.UITransform)?.height ?? 0,
        })) ?? [];
        const capsuleRect = c.screenMetrics.capsule;
        const pause = rect(c.pauseButton.node);
        return {
            cards, gaps, lane1, playerGates, playerHud, hudTop, supply, roadEffects, pause,
            capsuleRect, metrics: c.screenMetrics,
            cardLaneClearance: lane1.left - Math.max(...cards.map((card) => card.rect.right)),
            gateHudClearance: Math.min(...playerGates.map((gate) => gate.rect.bottom)) - hudTop,
            sidebar: rect(c.unitCardSidebar),
        };
    }`);
    layouts.push({ viewport, layout });
    check(layout.cards.length === 4
        && layout.cards.every((card) => Math.abs(card.rect.width - 96) < 0.1
            && Math.abs(card.rect.height - 40) < 0.1
            && card.text.length > 0 && card.status.length > 0 && card.tier.length > 0)
        && layout.gaps.every((gap) => gap >= 9.9),
        `layout/${viewport.name}/four-readable-horizontal-cards`, layout);
    check(layout.cardLaneClearance >= 7.9
        && layout.playerGates.every((gate) => Math.abs(gate.y - layout.playerGates[0].y) < 0.1)
        && layout.gateHudClearance >= 11.9,
        `layout/${viewport.name}/lane-and-bottom-hud-clearance`, layout);
    check(layout.supply.every((point) => Math.abs(point.y - point.expectedY) <= 1),
        `layout/${viewport.name}/supply-visual-logical-midpoint`, layout.supply);
    if (viewport.capsule) {
        const capsuleBottomWorld = layout.capsuleRect
            ? layout.capsuleRect.bottom + layout.metrics.visibleHeight / 2 : Number.NEGATIVE_INFINITY;
        check(Boolean(layout.capsuleRect) && layout.pause.top <= capsuleBottomWorld - 7.9,
            `layout/${viewport.name}/wechat-capsule-clearance`, layout);
    }
    await waitForBattleArtReady(sample.page);
    await sample.page.waitForTimeout(250);
    await sample.page.screenshot({ path: path.join(outputDir, `${viewport.name}.png`) });
    if (sample !== main) await sample.context.close();
}

await main.context.close();
await browser.close();
check(browserProblems.length === 0, 'browser/no-page-console-or-request-errors', browserProblems);

const failed = checks.filter((item) => !item.pass);
const report = {
    version: 'v1.3.0-dev-battle01-ui10',
    generatedAt: new Date().toISOString(),
    previewUrl,
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
    layouts,
    browserProblems,
};
fs.writeFileSync(path.join(outputDir, 'battle01-ui10-runtime-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
for (const item of failed) console.error(`FAIL ${item.name}`, JSON.stringify(item.details));
if (failed.length > 0) process.exitCode = 1;
