import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/level05-01/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7505';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
const snapshots = {};
const check = (condition, message, detail = undefined) => {
    checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
};
const approximately = (actual, expected, tolerance = 0.04) =>
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;

let browser;
let fatalError;
try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    await page.addInitScript(() => {
        localStorage.removeItem('wolf-sheep-battle.progress.v2');
        localStorage.removeItem('wolf-sheep-battle.v1.highest-unlocked-level');
    });
    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
            consoleProblems.push({ type: message.type(), text: message.text() });
        }
    });
    page.on('pageerror', (error) => consoleProblems.push({ type: 'pageerror', text: error.message }));
    page.on('requestfailed', (request) => requestFailures.push({
        url: request.url(), failure: request.failure()?.errorText ?? 'unknown',
    }));
    page.on('response', (response) => {
        if (response.status() === 404) response404s.push(response.url());
    });
    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(4500);

    const withController = async (callback, argument = undefined) => page.evaluate(
        async ({ callbackSource, callbackArgument }) => {
            const cc = await System.import('cc');
            const scene = cc.director.getScene();
            if (!scene) throw new Error('runtime scene is unavailable');
            const nodes = [];
            const visit = (node) => {
                nodes.push(node);
                for (const child of node.children) visit(child);
            };
            visit(scene);
            const controller = nodes
                .flatMap((node) => node.components)
                .find((component) => component
                    && component.startPanel
                    && component.rightControlBar
                    && typeof component.processPendingSmallDeployments === 'function');
            if (!controller) throw new Error('GameController is unavailable');
            return new Function(
                'cc',
                'controller',
                'argument',
                `return (${callbackSource})(cc, controller, argument);`,
            )(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    snapshots.config = await withController((_cc, controller) => ({
        version: controller.constructor?.name,
        levels: [1, 2, 3, 4, 5].map((id) => {
            const level = controller.getLevelConfig(id);
            return {
                id: level.id,
                title: level.title,
                implemented: controller.isLevelImplemented(level),
                playerStartEnergy: level.playerStartEnergy,
                aiStartEnergy: level.aiStartEnergy,
                playerMultiplier: level.playerEnergyRecoveryMultiplier ?? 1,
                aiMultiplier: level.aiEnergyRecoveryMultiplier ?? 1,
                continuousSmall: level.continuousSmallUnitDeployment === true,
                laneTypes: [...level.laneTypes],
            };
        }),
        levelCardIds: [...controller.levelCards.keys()],
    }));
    const level5 = snapshots.config.levels.find((level) => level.id === 5);
    check(level5?.title === '无限火力' && level5.implemented, 'level 5 is implemented and freely selectable', level5);
    check(level5?.playerStartEnergy === 100 && level5?.aiStartEnergy === 80,
        'level 5 starts at player 100 / AI 80 energy', level5);
    check(approximately(level5?.playerMultiplier, 3) && approximately(level5?.aiMultiplier, 2.2),
        'level 5 energy multipliers are 3.0 / 2.2', level5);
    check(level5?.continuousSmall && snapshots.config.levelCardIds.includes(5),
        'level 5 exposes continuous small-unit commands and a selection card');
    check(snapshots.config.levels.slice(0, 4).every((level) => level.playerMultiplier === 1
        && level.aiMultiplier === 1 && !level.continuousSmall),
    'levels 1-4 keep the original energy and deployment rule path', snapshots.config.levels.slice(0, 4));

    await withController((_cc, controller) => {
        controller.currentLevel = 5;
        controller.levelFiveTutorialSeen = false;
        controller.restartGame();
        controller.isStarted = false;
        controller.beginBattle();
    });
    let tutorialVisible = false;
    for (let attempt = 0; attempt < 160; attempt += 1) {
        tutorialVisible = await withController((_cc, controller) => controller.levelFiveTutorialPanel.active);
        if (tutorialVisible) break;
        await page.waitForTimeout(250);
    }
    check(tutorialVisible, 'first level-5 entry opens the one-time illustrated tutorial');
    await page.screenshot({ path: path.join(outputDir, 'level05_tutorial_1280x720.png'), fullPage: true });

    snapshots.deck = await withController((cc, controller) => {
        const labels = [];
        const visit = (node) => {
            const label = node.getComponent(cc.Label);
            if (label) labels.push(label.string);
            for (const child of node.children) visit(child);
        };
        visit(controller.levelFiveTutorialPanel);
        controller.completeLevelFiveTutorial();
        const visibleOptions = [...controller.tacticDeckOptions.values()]
            .filter((option) => option.root.active)
            .map((option) => ({
                kind: option.kind,
                x: option.root.position.x,
                y: option.root.position.y,
                scaleX: option.root.scale.x,
                scaleY: option.root.scale.y,
            }));
        const defaultDeck = [...controller.pendingDeckSelection];
        controller.toggleTacticDeckOption('surge');
        const afterCancel = [...controller.pendingDeckSelection];
        controller.toggleTacticDeckOption('freeze');
        const afterReplacement = [...controller.pendingDeckSelection];
        controller.toggleTacticDeckOption('shock');
        const afterBlockedFourth = [...controller.pendingDeckSelection];
        return {
            labels,
            panelActive: controller.tacticDeckPanel.active,
            subtitle: controller.tacticDeckSubtitleLabel.string,
            visibleOptions,
            defaultDeck,
            afterCancel,
            afterReplacement,
            afterBlockedFourth,
        };
    });
    check(snapshots.deck.labels.some((text) => text.includes('小羊可以持续派出')),
        'level-5 tutorial explains continuous small-unit deployment', snapshots.deck.labels);
    check(snapshots.deck.panelActive && snapshots.deck.visibleOptions.length === 5
        && snapshots.deck.subtitle.includes('5张战术牌') && snapshots.deck.subtitle.includes('第5关'),
    'level-5 loadout shows five formal tactic choices', snapshots.deck);
    check(JSON.stringify(snapshots.deck.defaultDeck) === JSON.stringify(['sprint', 'heal', 'surge']),
        'level-5 first-entry fallback deck is safe and includes Energy Surge', snapshots.deck.defaultDeck);
    check(snapshots.deck.afterCancel.length === 2
        && snapshots.deck.afterReplacement.length === 3
        && JSON.stringify(snapshots.deck.afterReplacement) === JSON.stringify(snapshots.deck.afterBlockedFourth),
    'deck options can be cancelled and a fourth selection never replaces the chosen three', snapshots.deck);
    await page.screenshot({ path: path.join(outputDir, 'level05_tactic_loadout_1280x720.png'), fullPage: true });

    snapshots.energy = await withController((_cc, controller) => {
        controller.pendingDeckSelection = ['sprint', 'heal', 'surge'];
        controller.confirmTacticDeckSelection();
        controller.aiDecisionCooldown = 999999;
        controller.playerEnergy = 0;
        controller.aiEnergy = 0;
        controller.update(1);
        const normalTick = { player: controller.playerEnergy, ai: controller.aiEnergy };
        controller.playerSupply = 2;
        controller.tryUseEnergySurge();
        const afterCast = {
            supply: controller.playerSupply,
            remaining: controller.playerEnergySurgeRemaining,
            cooldown: controller.playerEnergySurgeCooldown,
            uses: controller.playerStats.surgeUses,
        };
        controller.playerEnergy = 0;
        controller.update(1);
        const surgeTick = controller.playerEnergy;
        controller.isPaused = true;
        const pausedBefore = {
            energy: controller.playerEnergy,
            remaining: controller.playerEnergySurgeRemaining,
            cooldown: controller.playerEnergySurgeCooldown,
        };
        controller.update(2);
        const pausedAfter = {
            energy: controller.playerEnergy,
            remaining: controller.playerEnergySurgeRemaining,
            cooldown: controller.playerEnergySurgeCooldown,
        };
        controller.isPaused = false;
        return { normalTick, afterCast, surgeTick, pausedBefore, pausedAfter };
    });
    check(approximately(snapshots.energy.normalTick.player, 12)
        && approximately(snapshots.energy.normalTick.ai, 8.8),
    'one simulated second restores player 12 / AI 8.8 energy', snapshots.energy.normalTick);
    check(snapshots.energy.afterCast.supply === 0
        && approximately(snapshots.energy.afterCast.remaining, 8)
        && approximately(snapshots.energy.afterCast.cooldown, 18)
        && snapshots.energy.afterCast.uses === 1,
    'Energy Surge costs 2 supply and starts 8s duration / 18s cooldown', snapshots.energy.afterCast);
    check(approximately(snapshots.energy.surgeTick, 24),
        'Energy Surge doubles the level-5 player recovery rate to 24 energy/s', snapshots.energy.surgeTick);
    check(JSON.stringify(snapshots.energy.pausedBefore) === JSON.stringify(snapshots.energy.pausedAfter),
        'pause freezes energy recovery, surge duration and cooldown', snapshots.energy);

    snapshots.commandStress = await withController((_cc, controller) => {
        controller.restartGame();
        controller.isStarted = true;
        controller.isPaused = false;
        controller.isFinished = false;
        controller.aiDecisionCooldown = 999999;
        controller.clearBattleUnits();
        let accepted = 0;
        for (let index = 0; index < 500; index += 1) {
            controller.playerEnergy = 100;
            if (controller.issueLevelFiveSmallDeployment(0, index % 4)) accepted += 1;
        }
        const active = controller.units.filter((unit) => unit.team === 0 && unit.definition.type === 'small');
        const pendingByLane = [...controller.pendingSmallDeployments[0]];
        const pendingTotal = pendingByLane.reduce((sum, value) => sum + value, 0);
        const positionsValid = active.every((unit) => unit.node.position.x === controller.getLaneCenterX(unit.lane)
            && unit.node.position.y <= -190 && unit.node.scale.x === 1 && unit.node.scale.y === 1);
        const beforeProcessTotal = active.length + pendingTotal;
        for (const unit of active) unit.node.setPosition(unit.node.position.x, unit.node.position.y + 70, 0);
        controller.processPendingSmallDeployments();
        const activeAfterProcess = controller.units.filter((unit) => unit.team === 0
            && unit.definition.type === 'small').length;
        const pendingAfterProcess = controller.pendingSmallDeployments[0].reduce((sum, value) => sum + value, 0);
        return {
            accepted,
            active: active.length,
            pendingByLane,
            pendingTotal,
            positionsValid,
            beforeProcessTotal,
            activeAfterProcess,
            pendingAfterProcess,
            afterProcessTotal: activeAfterProcess + pendingAfterProcess,
            playerEnergy: controller.playerEnergy,
        };
    });
    check(snapshots.commandStress.accepted === 500
        && snapshots.commandStress.beforeProcessTotal === 500,
    '500 successful small-unit commands are represented by active units plus lightweight FIFO counts', snapshots.commandStress);
    check(snapshots.commandStress.pendingByLane.every((count) => count >= 120),
        'single-lane and four-lane rapid commands queue without a visible hard-cap rejection', snapshots.commandStress);
    check(snapshots.commandStress.positionsValid, 'all immediately created units use their own lane and base-side spawn endpoint');
    check(snapshots.commandStress.afterProcessTotal === snapshots.commandStress.beforeProcessTotal,
        'safe-spawn processing conserves every accepted command', snapshots.commandStress);

    snapshots.poolAndReset = await withController((_cc, controller) => {
        const unit = controller.units.find((candidate) => candidate.team === 0 && candidate.definition.type === 'small');
        const recycledNode = unit.node;
        const poolBefore = controller.levelFiveSmallUnitPool.length;
        controller.removeUnit(unit);
        const poolAfterRecycle = controller.levelFiveSmallUnitPool.length;
        const lane = unit.lane;
        const definition = unit.definition;
        const formation = controller.getLaneFormation(0, lane);
        for (const active of formation) active.node.setPosition(active.node.position.x, active.node.position.y + 80, 0);
        const respawned = controller.spawnUnit(0, lane, definition);
        const reused = controller.units.some((candidate) => candidate.node === recycledNode);
        controller.restartGame();
        return {
            poolBefore,
            poolAfterRecycle,
            respawned,
            reused,
            activeAfterRestart: controller.units.length,
            dyingAfterRestart: controller.dyingUnits.length,
            pendingAfterRestart: controller.pendingSmallDeployments.flat().reduce((sum, value) => sum + value, 0),
            pooledNodesActive: controller.levelFiveSmallUnitPool.filter((candidate) => candidate.node.active).length,
            surgeRemaining: controller.playerEnergySurgeRemaining,
            surgeCooldown: controller.playerEnergySurgeCooldown,
        };
    });
    check(snapshots.poolAndReset.poolAfterRecycle === snapshots.poolAndReset.poolBefore + 1
        && snapshots.poolAndReset.respawned && snapshots.poolAndReset.reused,
    'level-5 small units reuse a reset node instead of allocating on every deployment', snapshots.poolAndReset);
    check(snapshots.poolAndReset.activeAfterRestart === 0
        && snapshots.poolAndReset.dyingAfterRestart === 0
        && snapshots.poolAndReset.pendingAfterRestart === 0
        && snapshots.poolAndReset.pooledNodesActive === 0
        && snapshots.poolAndReset.surgeRemaining === 0
        && snapshots.poolAndReset.surgeCooldown === 0,
    'restart clears active units, pending commands, tactic timers and leaves only inactive reset pool nodes', snapshots.poolAndReset);

    snapshots.longRun = await withController((_cc, controller) => {
        controller.currentLevel = 5;
        controller.restartGame();
        controller.isStarted = true;
        controller.isPaused = false;
        controller.isFinished = false;
        controller.aiDecisionCooldown = 999999;
        controller.playerBaseHealth = 1000000000;
        controller.aiBaseHealth = 1000000000;
        for (let index = 0; index < 320; index += 1) {
            controller.playerEnergy = 100;
            controller.issueLevelFiveSmallDeployment(0, index % 4);
            controller.aiEnergy = 100;
            controller.issueLevelFiveSmallDeployment(1, (index + 2) % 4);
        }
        const memoryBefore = performance.memory?.usedJSHeapSize ?? 0;
        const start = performance.now();
        for (let frame = 0; frame < 9000; frame += 1) controller.update(1 / 30);
        const elapsedMs = performance.now() - start;
        const memoryAfter = performance.memory?.usedJSHeapSize ?? 0;
        const activeUnits = controller.units.filter((unit) => controller.isActiveBattleUnit(unit));
        const pending = controller.pendingSmallDeployments.flat().reduce((sum, value) => sum + value, 0);
        const laneBudgetViolations = [0, 1, 2, 3].filter((lane) =>
            controller.getLaneCombinedActiveUnitCount(lane) > 20);
        const rootViolations = activeUnits.filter((unit) => unit.node.scale.x !== 1 || unit.node.scale.y !== 1
            || unit.node.position.x !== controller.getLaneCenterX(unit.lane)
            || unit.node.position.y < -245 || unit.node.position.y > 245).length;
        const stalledLanes = controller.laneRuntimeStates.filter((state) => state.stalledSeconds > 2.05).length;
        return {
            virtualSeconds: 300,
            simulatedFrames: 9000,
            elapsedMs,
            estimatedFps: 9000 / Math.max(0.001, elapsedMs / 1000),
            memoryBefore,
            memoryAfter,
            memoryDelta: memoryAfter && memoryBefore ? memoryAfter - memoryBefore : null,
            activeUnits: activeUnits.length,
            pending,
            poolSize: controller.levelFiveSmallUnitPool.length,
            activeBattleVfx: controller.activeBattleVfx.length,
            laneBudgetViolations,
            rootViolations,
            stalledLanes,
            finished: controller.isFinished,
        };
    });
    check(snapshots.longRun.virtualSeconds === 300 && snapshots.longRun.simulatedFrames === 9000,
        'level 5 completed a five-minute accelerated runtime simulation', snapshots.longRun);
    check(snapshots.longRun.laneBudgetViolations.length === 0
        && snapshots.longRun.rootViolations === 0
        && snapshots.longRun.stalledLanes === 0,
    'long run has no lane-budget, root-coordinate, boundary or >2s stall violations', snapshots.longRun);
    check(snapshots.longRun.activeBattleVfx <= 64 && snapshots.longRun.poolSize <= 48,
        'VFX and small-unit pool remain within their explicit limits', snapshots.longRun);

    await page.screenshot({ path: path.join(outputDir, 'level05_runtime_after_stress_1280x720.png'), fullPage: true });
    check(consoleProblems.length === 0, 'browser console has no new warnings or errors', consoleProblems);
    check(requestFailures.length === 0, 'browser preview has no failed resource requests', requestFailures);
    check(response404s.length === 0, 'browser preview has no resource 404 responses', response404s);
} catch (error) {
    fatalError = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
} finally {
    if (browser) await browser.close();
}

const result = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    passed: checks.filter((item) => item.pass).length,
    failed: checks.filter((item) => !item.pass).length,
    checks,
    snapshots,
    consoleProblems,
    requestFailures,
    response404s,
    fatalError,
};
fs.writeFileSync(path.join(outputDir, 'level05_01_runtime_audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ passed: result.passed, failed: result.failed, fatalError }, null, 2));
if (fatalError || result.failed > 0) process.exitCode = 1;
