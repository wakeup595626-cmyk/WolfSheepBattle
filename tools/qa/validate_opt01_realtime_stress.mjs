import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-opt01/realtime-stress');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8765';
const durationSeconds = Number(process.argv[4] ?? 300);
fs.mkdirSync(outputDir, { recursive: true });

const consoleProblems = [];
const requestFailures = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
        selectedBgmId: 'cheerful_lighthearted',
        musicVolume: 0.5,
        sfxVolume: 0.75,
        musicMuted: true,
        sfxMuted: true,
        lastNonZeroMusicVolume: 0.5,
        lastNonZeroSfxVolume: 0.75,
    }));
});
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

await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    if (!scene) return false;
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.issueLevelFiveSmallDeployment === 'function');
    return Boolean(controller?.startPanel.active && !controller?.artLoadingPanel?.active);
}, { timeout: 60000 });

await page.evaluate(async ({ durationSeconds }) => {
    const cc = await System.import('cc');
    let scene = cc.director.getScene();
    for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        scene = cc.director.getScene();
    }
    if (!scene) throw new Error('runtime scene unavailable for stress setup');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.issueLevelFiveSmallDeployment === 'function');
    if (!controller) throw new Error('GameController unavailable for stress test');

    controller.currentLevel = 5;
    controller.levelFiveTutorialSeen = true;
    controller.selectedTactics = ['sprint', 'heal', 'surge'];
    controller.selectedTacticsByLevel.set(5, ['sprint', 'heal', 'surge']);
    controller.restartGame();
    controller.activateBattle();

    const state = {
        running: true,
        startedAt: performance.now(),
        durationSeconds,
        frameCount: 0,
        fpsSamples: [],
        lastFpsAt: performance.now(),
        lastFpsFrames: 0,
        tick: 0,
        deployAttempts: 0,
        tacticAttempts: 0,
        pauseCycles: 0,
        restartCycles: 0,
        menuCycles: 0,
        maxActiveUnits: 0,
        maxPending: 0,
        maxNodes: 0,
        maxActiveBattleVfx: 0,
        maxSmallUnitPool: 0,
        positionViolations: 0,
        orderViolations: 0,
        stalledLaneSamples: 0,
        seenIds: new Set(),
        laneSeenIds: [new Set(), new Set(), new Set(), new Set()],
        memorySamples: [],
        intervalId: 0,
    };
    window.__opt01RealtimeStress = state;

    const countSceneNodes = () => {
        let count = 0;
        const scan = (node) => { count += 1; node.children.forEach(scan); };
        scan(scene);
        return count;
    };
    const sample = () => {
        state.maxActiveUnits = Math.max(state.maxActiveUnits, controller.units.length);
        const pending = controller.pendingSmallDeployments.flat().reduce((sum, value) => sum + value, 0);
        state.maxPending = Math.max(state.maxPending, pending);
        state.maxActiveBattleVfx = Math.max(state.maxActiveBattleVfx, controller.activeBattleVfx.length);
        state.maxSmallUnitPool = Math.max(state.maxSmallUnitPool, controller.levelFiveSmallUnitPool.length);
        for (const unit of controller.units) {
            if (!controller.isActiveBattleUnit(unit)) continue;
            state.seenIds.add(unit.id);
            state.laneSeenIds[unit.lane].add(unit.id);
            const bounds = controller.getUnitRoadBounds(unit);
            const y = unit.node.position.y;
            if (!Number.isFinite(y) || y < bounds.minY - 0.01 || y > bounds.maxY + 0.01
                || Math.abs(unit.node.position.x - controller.getLaneCenterX(unit.lane)) > 0.01) {
                state.positionViolations += 1;
            }
        }
        for (let lane = 0; lane < 4; lane += 1) {
            for (const team of [0, 1]) {
                const formation = controller.getLaneFormation(team, lane);
                for (let index = 1; index < formation.length; index += 1) {
                    const front = formation[index - 1];
                    const rear = formation[index];
                    const required = controller.getUnitQueueSpacing(front, rear);
                    const gap = team === 0
                        ? front.node.position.y - rear.node.position.y
                        : rear.node.position.y - front.node.position.y;
                    if (gap < required - 0.05) state.orderViolations += 1;
                }
            }
            if (controller.laneRuntimeStates[lane]?.stalledSeconds > 2.05) state.stalledLaneSamples += 1;
        }
        if (state.tick % 20 === 0) {
            state.maxNodes = Math.max(state.maxNodes, countSceneNodes());
            const memory = performance.memory?.usedJSHeapSize;
            if (Number.isFinite(memory)) state.memorySamples.push(memory);
        }
    };

    const frame = (now) => {
        if (!state.running) return;
        state.frameCount += 1;
        if (now - state.lastFpsAt >= 5000) {
            state.fpsSamples.push((state.frameCount - state.lastFpsFrames) * 1000 / (now - state.lastFpsAt));
            state.lastFpsAt = now;
            state.lastFpsFrames = state.frameCount;
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    state.intervalId = setInterval(() => {
        if (!state.running) return;
        state.tick += 1;
        if (controller.isFinished) {
            controller.restartGame();
            controller.activateBattle();
            state.restartCycles += 1;
        }
        if (!controller.isPaused && controller.isStarted && !controller.isFinished) {
            controller.selectedSheepType = 'small';
            controller.tryDeploySelectedUnit(state.tick % 4);
            state.deployAttempts += 1;
        }
        if (state.tick % 40 === 0 && controller.isStarted && !controller.isFinished) {
            controller.playerSupply = 10;
            const tacticIndex = Math.floor(state.tick / 40) % 3;
            if (tacticIndex === 0) {
                controller.playerEnergySurgeCooldown = 0;
                controller.tryUseEnergySurge();
            } else if (tacticIndex === 1) {
                controller.playerSprintCooldown = 0;
                controller.tryUseSprint(0);
            } else {
                controller.playerHealCooldown = 0;
                controller.tryUseHeal(0);
            }
            state.tacticAttempts += 1;
        }
        if (state.tick % 240 === 0 && controller.isStarted && !controller.isFinished && !controller.isPaused) {
            controller.pauseGame();
            state.pauseCycles += 1;
            setTimeout(() => state.running && controller.isPaused && controller.resumeGame(), 750);
        }
        if (state.tick % 360 === 0) {
            controller.restartGame();
            controller.activateBattle();
            state.restartCycles += 1;
        }
        if (state.tick % 480 === 0) {
            controller.leaveBattleToLevelSelect();
            state.menuCycles += 1;
            setTimeout(() => {
                if (!state.running) return;
                controller.currentLevel = 5;
                controller.restartGame();
                controller.activateBattle();
            }, 750);
        }
        sample();
    }, 250);
}, { durationSeconds });

const cdp = await context.newCDPSession(page);
await cdp.send('HeapProfiler.collectGarbage');
await page.evaluate(() => {
    const state = window.__opt01RealtimeStress;
    state.memoryBaselineAfterForcedGc = performance.memory?.usedJSHeapSize;
});

await page.waitForTimeout(durationSeconds * 1000);

await cdp.send('HeapProfiler.collectGarbage');

const metrics = await page.evaluate(async () => {
    const state = window.__opt01RealtimeStress;
    state.running = false;
    clearInterval(state.intervalId);
    const elapsedSeconds = (performance.now() - state.startedAt) / 1000;
    const memoryFirst = state.memorySamples[0];
    const memoryLast = state.memorySamples[state.memorySamples.length - 1];
    const cc = await System.import('cc');
    const ccScene = cc.director.getScene();
    const countSceneNodes = () => {
        let count = 0;
        if (!ccScene) return count;
        const scan = (node) => { count += 1; node.children.forEach(scan); };
        scan(ccScene);
        return count;
    };
    const memoryAfterForcedGc = performance.memory?.usedJSHeapSize;
    return {
        elapsedSeconds,
        frameCount: state.frameCount,
        averageFps: state.frameCount / elapsedSeconds,
        minimumFiveSecondFps: state.fpsSamples.length ? Math.min(...state.fpsSamples) : 0,
        maximumFiveSecondFps: state.fpsSamples.length ? Math.max(...state.fpsSamples) : 0,
        memoryFirst,
        memoryLast,
        memoryDelta: Number.isFinite(memoryFirst) && Number.isFinite(memoryLast) ? memoryLast - memoryFirst : undefined,
        memoryPeak: state.memorySamples.length ? Math.max(...state.memorySamples) : undefined,
        memoryBaselineAfterForcedGc: state.memoryBaselineAfterForcedGc,
        memoryAfterForcedGc,
        memoryDeltaAfterForcedGc: Number.isFinite(state.memoryBaselineAfterForcedGc)
            && Number.isFinite(memoryAfterForcedGc)
            ? memoryAfterForcedGc - state.memoryBaselineAfterForcedGc : undefined,
        maxNodes: state.maxNodes,
        finalNodes: countSceneNodes(),
        maxActiveUnits: state.maxActiveUnits,
        cumulativeUniqueUnits: state.seenIds.size,
        cumulativeUniqueUnitsByLane: state.laneSeenIds.map((set) => set.size),
        maxPending: state.maxPending,
        maxActiveBattleVfx: state.maxActiveBattleVfx,
        maxSmallUnitPool: state.maxSmallUnitPool,
        deployAttempts: state.deployAttempts,
        tacticAttempts: state.tacticAttempts,
        pauseCycles: state.pauseCycles,
        restartCycles: state.restartCycles,
        menuCycles: state.menuCycles,
        positionViolations: state.positionViolations,
        orderViolations: state.orderViolations,
        stalledLaneSamples: state.stalledLaneSamples,
    };
});

await page.screenshot({ path: path.join(outputDir, 'opt01_realtime_stress_final.png'), fullPage: true });
await context.close();
await browser.close();

const checks = [
    { pass: metrics.elapsedSeconds >= durationSeconds - 1, message: 'requested real-time duration completed' },
    { pass: metrics.cumulativeUniqueUnits >= 80, message: 'at least 80 cumulative active units were observed' },
    { pass: metrics.cumulativeUniqueUnitsByLane.every((count) => count > 0), message: 'all four lanes continuously received units' },
    { pass: metrics.positionViolations === 0, message: 'no off-road, endpoint or invalid-position samples' },
    { pass: metrics.orderViolations === 0, message: 'no sampled same-team queue overlap/order violations' },
    { pass: metrics.stalledLaneSamples === 0, message: 'no lane remained stalled beyond the built-in threshold' },
    { pass: metrics.maxActiveBattleVfx <= 64 && metrics.maxSmallUnitPool <= 48,
        message: 'VFX and small-unit pools remained within explicit budgets' },
    { pass: metrics.pauseCycles >= Math.floor(durationSeconds / 60)
        && metrics.restartCycles >= Math.floor(durationSeconds / 90)
        && metrics.menuCycles >= Math.floor(durationSeconds / 120),
        message: 'pause/resume, restart and menu-return cycles were repeatedly exercised' },
    { pass: consoleProblems.length === 0 && requestFailures.length === 0,
        message: 'runtime console and resource requests stayed clean' },
];
const result = {
    generatedAt: new Date().toISOString(), previewUrl, durationSeconds,
    passed: checks.filter((item) => item.pass).length,
    failed: checks.filter((item) => !item.pass).length,
    checks, metrics, consoleProblems, requestFailures,
};
fs.writeFileSync(path.join(outputDir, 'opt01_realtime_stress_audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ passed: result.passed, failed: result.failed, metrics }, null, 2));
process.exitCode = result.failed === 0 ? 0 : 1;
