import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-level06/realtime-stress');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8776';
const durationSeconds = Number(process.argv[4] ?? 180);
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
        selectedBgmId: 'cheerful_lighthearted', musicVolume: 0.5, sfxVolume: 0.75,
        musicMuted: true, sfxMuted: true, lastNonZeroMusicVolume: 0.5, lastNonZeroSfxVolume: 0.75,
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
        component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
    return Boolean(controller && controller.startPanel.active && !controller.artLoadingPanel?.active);
}, { timeout: 60000 });

await page.evaluate(async ({ durationSeconds }) => {
    const cc = await System.import('cc');
    let scene = cc.director.getScene();
    for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        scene = cc.director.getScene();
    }
    if (!scene) throw new Error('runtime scene unavailable');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
    if (!controller) throw new Error('GameController not found');

    controller.currentLevel = 6;
    controller.selectedTactics = ['sprint', 'heal', 'supplyBoost'];
    controller.selectedTacticsByLevel.set(6, [...controller.selectedTactics]);
    controller.restartGame();
    controller.activateBattle();
    // Preserve a continuous 3-minute mechanics run without an early base result screen.
    controller.playerBaseHealth = 10000;
    controller.aiBaseHealth = 10000;

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
        maxNodes: 0,
        maxActiveUnits: 0,
        maxActiveVfx: 0,
        maxPlayerSupply: 0,
        maxAiSupply: 0,
        positionViolations: 0,
        orderViolations: 0,
        stalledLaneSamples: 0,
        seenUnitIds: new Set(),
        memorySamples: [],
        goldenActivations: [],
        lastGoldenRound: 0,
        duplicateRoundSamples: 0,
        intervalId: 0,
    };
    window.__level06Stress = state;

    const countNodes = () => {
        let count = 0;
        const scan = (node) => { count += 1; node.children.forEach(scan); };
        scan(scene);
        return count;
    };
    const sample = () => {
        state.maxActiveUnits = Math.max(state.maxActiveUnits, controller.units.length);
        state.maxActiveVfx = Math.max(state.maxActiveVfx, controller.activeBattleVfx.length);
        state.maxPlayerSupply = Math.max(state.maxPlayerSupply, controller.playerSupply);
        state.maxAiSupply = Math.max(state.maxAiSupply, controller.aiSupply);
        if (controller.goldenRoundId > state.lastGoldenRound) {
            if (controller.goldenRoundId !== state.lastGoldenRound + 1) state.duplicateRoundSamples += 1;
            state.lastGoldenRound = controller.goldenRoundId;
            state.goldenActivations.push({
                round: controller.goldenRoundId,
                lane: controller.goldenLane,
                battleSeconds: controller.battleElapsedSeconds,
                activeRemaining: controller.goldenActiveRemaining,
            });
        }
        for (const unit of controller.units) {
            if (!controller.isActiveBattleUnit(unit)) continue;
            state.seenUnitIds.add(unit.id);
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
            state.maxNodes = Math.max(state.maxNodes, countNodes());
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

    const unitTypes = ['small', 'medium', 'large', 'giant'];
    state.intervalId = setInterval(() => {
        if (!state.running) return;
        state.tick += 1;
        if (!controller.isPaused && controller.isStarted && !controller.isFinished) {
            controller.selectedSheepType = unitTypes[state.tick % unitTypes.length];
            controller.tryDeploySelectedUnit(state.tick % 4);
            state.deployAttempts += 1;
        }
        if (state.tick % 32 === 0 && !controller.isPaused) {
            const availability = controller.getPlayerTacticAvailability('supplyBoost');
            if (availability.enabled && controller.selectedTactics.includes('supplyBoost')) {
                controller.tryUseSupplyBoost();
                state.tacticAttempts += 1;
            }
        }
        if (state.tick % 80 === 0 && !controller.isPaused) {
            controller.pauseGame();
            state.pauseCycles += 1;
            setTimeout(() => state.running && controller.isPaused && controller.resumeGame(), 1000);
        }
        sample();
    }, 250);
}, { durationSeconds });

await page.waitForTimeout(durationSeconds * 1000);
const cdp = await context.newCDPSession(page);
await cdp.send('HeapProfiler.collectGarbage');
const metrics = await page.evaluate(() => {
    const state = window.__level06Stress;
    state.running = false;
    clearInterval(state.intervalId);
    const memoryAfterForcedGc = performance.memory?.usedJSHeapSize;
    const fps = state.fpsSamples;
    return {
        elapsedSeconds: (performance.now() - state.startedAt) / 1000,
        frames: state.frameCount,
        averageFps: fps.length ? fps.reduce((sum, value) => sum + value, 0) / fps.length : 0,
        minFpsWindow: fps.length ? Math.min(...fps) : 0,
        maxFpsWindow: fps.length ? Math.max(...fps) : 0,
        maxNodes: state.maxNodes,
        maxActiveUnits: state.maxActiveUnits,
        cumulativeUniqueUnits: state.seenUnitIds.size,
        maxActiveVfx: state.maxActiveVfx,
        maxPlayerSupply: state.maxPlayerSupply,
        maxAiSupply: state.maxAiSupply,
        positionViolations: state.positionViolations,
        orderViolations: state.orderViolations,
        stalledLaneSamples: state.stalledLaneSamples,
        deployAttempts: state.deployAttempts,
        tacticAttempts: state.tacticAttempts,
        pauseCycles: state.pauseCycles,
        goldenActivations: state.goldenActivations,
        duplicateRoundSamples: state.duplicateRoundSamples,
        memoryFirst: state.memorySamples[0],
        memoryLast: state.memorySamples[state.memorySamples.length - 1],
        memoryPeak: state.memorySamples.length ? Math.max(...state.memorySamples) : undefined,
        memoryAfterForcedGc,
    };
});

const runtimeState = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
    return {
        playerSupply: controller.playerSupply,
        aiSupply: controller.aiSupply,
        aiLaneDecisions: [...controller.levelSixAILaneDecisions],
        goldenLaneHistory: [...controller.goldenLaneHistory],
        activeGoldenNodes: nodes.filter((node) => node.name === 'GoldenOverlay' && node.activeInHierarchy).length,
        goldenPanelCount: nodes.filter((node) => node.name === 'GoldenSupplyPanel').length,
        goldenNoticeCount: nodes.filter((node) => node.name === 'GoldenSupplyNotice').length,
    };
});
await page.screenshot({ path: path.join(outputDir, 'level06_realtime_stress_final.png'), fullPage: true });

const lanes = new Set(metrics.goldenActivations.map((entry) => entry.lane));
const intervals = metrics.goldenActivations.slice(1).map((entry, index) =>
    entry.battleSeconds - metrics.goldenActivations[index].battleSeconds);
const checks = [
    { pass: metrics.elapsedSeconds >= durationSeconds, message: 'real-time run reached the requested duration', detail: metrics.elapsedSeconds },
    { pass: metrics.goldenActivations.length >= 8, message: 'multiple golden-supply rounds activated during the 3-minute run', detail: metrics.goldenActivations },
    { pass: lanes.size === 4, message: 'all four roads became golden-supply roads', detail: [...lanes] },
    { pass: metrics.goldenActivations.every((entry, index) => index === 0 || metrics.goldenActivations[index - 1].lane !== entry.lane), message: 'golden roads never repeated consecutively', detail: metrics.goldenActivations },
    { pass: intervals.every((value) => value >= 19.5 && value <= 20.5), message: 'golden activation intervals stayed at 20 active-game seconds through pause cycles', detail: intervals },
    { pass: metrics.duplicateRoundSamples === 0, message: 'round identifiers advanced exactly once per activation', detail: metrics.duplicateRoundSamples },
    { pass: metrics.maxPlayerSupply <= 5.0001 && metrics.maxAiSupply <= 5.0001 && runtimeState.playerSupply <= 5.0001 && runtimeState.aiSupply <= 5.0001, message: 'player and AI supply never exceeded 5', detail: { metrics, runtimeState } },
    { pass: metrics.positionViolations === 0 && metrics.orderViolations === 0 && metrics.stalledLaneSamples === 0, message: 'no road bounds, queue order, or persistent stall violations occurred', detail: metrics },
    { pass: runtimeState.aiLaneDecisions.filter((value) => value > 0).length >= 3, message: 'AI decisions remained distributed rather than permanently blocking one road', detail: runtimeState.aiLaneDecisions },
    { pass: runtimeState.goldenPanelCount === 1 && runtimeState.goldenNoticeCount === 1 && runtimeState.activeGoldenNodes <= 1, message: 'golden HUD and overlay nodes remained single-instance', detail: runtimeState },
    { pass: consoleProblems.length === 0 && requestFailures.length === 0, message: 'runtime produced no console or request failures', detail: { consoleProblems, requestFailures } },
];
const report = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    durationSeconds,
    passed: checks.every((entry) => entry.pass),
    totals: { checks: checks.length, passed: checks.filter((entry) => entry.pass).length, failed: checks.filter((entry) => !entry.pass).length },
    checks,
    metrics,
    runtimeState,
    consoleProblems,
    requestFailures,
};
fs.writeFileSync(path.join(outputDir, 'level06_realtime_stress_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, totals: report.totals, metrics, runtimeState,
    failed: checks.filter((entry) => !entry.pass).map((entry) => entry.message) }, null, 2));
await browser.close();
if (!report.passed) process.exitCode = 1;
