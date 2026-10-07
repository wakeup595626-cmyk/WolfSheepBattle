import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'tmp/battle01-ui10/realtime-stress');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8791';
const durationSeconds = Number(process.argv[4] ?? 60);
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
    localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
        schemaVersion: 7,
        highestUnlockedLevel: 6,
        completedLevels: [1],
        selectedLevelId: 5,
        specialRoadTutorialSeen: true,
        levelOneTutorialCompleted: true,
        levelOneTutorialVersion: 5,
        freezeUnlocked: true,
        selectedTactics: ['sprint', 'heal', 'surge'],
        selectedTacticsByLevel: { 5: ['sprint', 'heal', 'surge'] },
        levelFiveTutorialSeen: true,
        bestResultsByLevel: {},
    }));
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
page.on('pageerror', (error) => consoleProblems.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
    if (message.type() === 'error') consoleProblems.push({ type: 'console-error', text: message.text() });
});
page.on('requestfailed', (request) => requestFailures.push({
    url: request.url(), failure: request.failure()?.errorText ?? 'unknown',
}));

await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
let initialArtStableSamples = 0;
let initialArtState;
for (let attempt = 0; attempt < 600; attempt += 1) {
    initialArtState = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        if (!scene) return { ready: false, reason: 'no-scene' };
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const c = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.getBattleFlowDiagnostics === 'function');
        return {
            ready: Boolean(c?.artLoadingPanel && c.artPilotLoadGeneration > 0
                && c.artLoadingVisualProgress >= 0.999 && !c.battleArtPreparing
                && !c.artLoadingCompletionPending && !c.artLoadingPanel.active),
            generation: c?.artPilotLoadGeneration,
            visual: c?.artLoadingVisualProgress,
            panelActive: c?.artLoadingPanel?.active,
            preparing: c?.battleArtPreparing,
        };
    });
    initialArtStableSamples = initialArtState.ready ? initialArtStableSamples + 1 : 0;
    if (initialArtStableSamples >= 8) break;
    await page.waitForTimeout(100);
}
if (initialArtStableSamples < 8) {
    throw new Error(`initial art did not remain ready: ${JSON.stringify(initialArtState)}`);
}

const cdp = await context.newCDPSession(page);
await cdp.send('HeapProfiler.collectGarbage');

await page.evaluate(async ({ durationSeconds }) => {
    const cc = await System.import('cc');
    let c;
    for (let attempt = 0; !c && attempt < 120; attempt += 1) {
        const scene = cc.director.getScene();
        if (scene) {
            const nodes = [];
            const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
            visit(scene);
            c = nodes.flatMap((node) => node.components ?? []).find((component) =>
                component?.startPanel && typeof component.getBattleFlowDiagnostics === 'function');
        }
        if (!c) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!c) throw new Error('GameController not found');

    const prepare = () => {
        c.currentLevel = 5;
        c.levelFiveTutorialSeen = true;
        c.restartGame();
        c.startPanel.active = false;
        c.levelSelectPanel.active = false;
        c.tacticDeckPanel.active = false;
        c.activateBattle();
        c.aiDecisionCooldown = 999999;
    };
    const issueOne = (team, index) => {
        if (team === 0) {
            c.playerEnergy = 10000;
            c.selectedSheepType = 'small';
            return c.tryDeploySelectedUnit(index % 4);
        }
        const before = c.getBattleFlowDiagnostics().accepted;
        c.aiEnergy = 10000;
        c.trySpawnAIUnit();
        return c.getBattleFlowDiagnostics().accepted === before + 1;
    };
    const issueUntilCommitted = (target, state) => {
        let guard = 0;
        while (c.getBattleFlowDiagnostics().committedLoad < target && guard < target * 4) {
            const accepted = issueOne(guard % 2, guard);
            state.deployAttempts += 1;
            if (accepted) state.acceptedAttempts += 1;
            guard += 1;
        }
        state.milestones[target] = c.getBattleFlowDiagnostics();
    };
    const countNodes = () => {
        let count = 0;
        const scan = (node) => { count += 1; node.children.forEach(scan); };
        scan(cc.director.getScene());
        return count;
    };

    prepare();
    await new Promise((resolve) => setTimeout(resolve, 350));
    for (let attempt = 0; (c.battleArtPreparing || c.artLoadingCompletionPending
        || c.artLoadingPanel?.active) && attempt < 1200; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (c.battleArtPreparing || c.artLoadingCompletionPending || c.artLoadingPanel?.active) {
        throw new Error('battle art preload did not settle before stress setup');
    }
    const state = {
        running: true,
        durationSeconds,
        startedAt: performance.now(),
        frameCount: 0,
        lastFrameAt: 0,
        fpsWindowStartedAt: performance.now(),
        fpsWindowFrames: 0,
        fpsSamples: [],
        longFramesOver50Ms: 0,
        longFramesOver100Ms: 0,
        worstFrameMs: 0,
        deployAttempts: 0,
        acceptedAttempts: 0,
        maxCommitted: 0,
        maxActive: 0,
        maxActivePlayer: 0,
        maxActiveAI: 0,
        maxPending: 0,
        maxDying: 0,
        maxNodes: 0,
        minNodes: Number.POSITIVE_INFINITY,
        maxPool: 0,
        maxVfx: 0,
        uniqueUnitIds: new Set(),
        positionViolations: 0,
        sameTeamOverlapViolations: 0,
        largeMotionViolations: 0,
        previousPositions: new Map(),
        memorySamples: [],
        milestones: {},
        pause: { exercised: false, frozen: false },
        recycle: { exercised: false, poolAfterDeath: 0, reused: false },
        restart: { exercised: false, pendingAfter: null, unitsAfter: null },
        title: { exercised: false, pendingAfter: null, unitsAfter: null },
        levelSwitch: { exercised: false, pendingAfter: null, unitsAfter: null },
        actionFlags: {},
        intervalId: 0,
    };
    window.__battle01RealtimeStress = state;
    issueUntilCommitted(20, state);
    issueUntilCommitted(40, state);
    issueUntilCommitted(60, state);
    state.memoryBaseline = performance.memory?.usedJSHeapSize;

    const sample = () => {
        const diagnostics = c.getBattleFlowDiagnostics();
        state.maxCommitted = Math.max(state.maxCommitted, diagnostics.committedLoad);
        state.maxActive = Math.max(state.maxActive, diagnostics.active.total);
        state.maxActivePlayer = Math.max(state.maxActivePlayer, diagnostics.active.player);
        state.maxActiveAI = Math.max(state.maxActiveAI, diagnostics.active.ai);
        state.maxPending = Math.max(state.maxPending, diagnostics.pending.total);
        state.maxDying = Math.max(state.maxDying, diagnostics.dying);
        state.maxPool = Math.max(state.maxPool, c.levelFiveSmallUnitPool.length);
        state.maxVfx = Math.max(state.maxVfx, c.activeBattleVfx.length);
        const nodeCount = countNodes();
        state.maxNodes = Math.max(state.maxNodes, nodeCount);
        state.minNodes = Math.min(state.minNodes, nodeCount);
        const memory = performance.memory?.usedJSHeapSize;
        if (Number.isFinite(memory)) state.memorySamples.push(memory);

        const currentPositions = new Map();
        for (const unit of c.units) {
            if (!c.isActiveBattleUnit(unit)) continue;
            state.uniqueUnitIds.add(unit.id);
            const bounds = c.getUnitRoadBounds(unit);
            const x = unit.node.position.x;
            const y = unit.node.position.y;
            if (!Number.isFinite(x) || !Number.isFinite(y)
                || y < bounds.minY - 0.01 || y > bounds.maxY + 0.01
                || Math.abs(x - c.getLaneCenterX(unit.lane)) > 0.01) state.positionViolations += 1;
            const previous = state.previousPositions.get(unit.id);
            if (previous !== undefined && Math.abs(y - previous) > 85) state.largeMotionViolations += 1;
            currentPositions.set(unit.id, y);
        }
        state.previousPositions = currentPositions;
        for (let lane = 0; lane < 4; lane += 1) {
            for (const team of [0, 1]) {
                const formation = c.getLaneFormation(team, lane);
                for (let index = 1; index < formation.length; index += 1) {
                    const front = formation[index - 1];
                    const rear = formation[index];
                    const gap = team === 0
                        ? front.node.position.y - rear.node.position.y
                        : rear.node.position.y - front.node.position.y;
                    if (gap < c.getUnitQueueSpacing(front, rear) - 0.05) {
                        state.sameTeamOverlapViolations += 1;
                    }
                }
            }
        }
        for (const target of [96, 120, 128]) {
            if (!state.milestones[target] && diagnostics.committedLoad >= target) {
                state.milestones[target] = diagnostics;
            }
        }
    };

    const frame = (now) => {
        if (!state.running) return;
        state.frameCount += 1;
        state.fpsWindowFrames += 1;
        if (state.lastFrameAt > 0) {
            const delta = now - state.lastFrameAt;
            state.worstFrameMs = Math.max(state.worstFrameMs, delta);
            if (delta > 50) state.longFramesOver50Ms += 1;
            if (delta > 100) state.longFramesOver100Ms += 1;
        }
        state.lastFrameAt = now;
        if (now - state.fpsWindowStartedAt >= 1000) {
            state.fpsSamples.push(state.fpsWindowFrames * 1000 / (now - state.fpsWindowStartedAt));
            state.fpsWindowStartedAt = now;
            state.fpsWindowFrames = 0;
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    state.intervalId = setInterval(() => {
        if (!state.running) return;
        const elapsed = (performance.now() - state.startedAt) / 1000;
        if (c.isStarted && !c.isPaused && !c.isFinished
            && c.getBattleFlowDiagnostics().committedLoad < 128) {
            for (const team of [0, 1]) {
                const accepted = issueOne(team, state.deployAttempts);
                state.deployAttempts += 1;
                if (accepted) state.acceptedAttempts += 1;
            }
        }
        if (elapsed >= 10 && !state.actionFlags.pause) {
            state.actionFlags.pause = true;
            const before = c.getBattleFlowDiagnostics();
            const positions = c.units.map((unit) => [unit.id, unit.node.position.y]);
            c.pauseGame();
            setTimeout(() => {
                const after = c.getBattleFlowDiagnostics();
                const afterPositions = c.units.map((unit) => [unit.id, unit.node.position.y]);
                state.pause = {
                    exercised: true,
                    frozen: before.pending.total === after.pending.total
                        && JSON.stringify(positions) === JSON.stringify(afterPositions),
                    before,
                    after,
                };
                if (c.isPaused) c.resumeGame();
            }, 850);
        }
        if (elapsed >= 20 && !state.actionFlags.recycle) {
            state.actionFlags.recycle = true;
            const candidates = c.units.filter((unit) => unit.definition.type === 'small').slice(0, 8);
            const nodeIds = candidates.map((unit) => unit.node.uuid);
            for (const unit of candidates) c.startUnitDeath(unit);
            setTimeout(() => {
                state.recycle.poolAfterDeath = c.levelFiveSmallUnitPool.length;
                c.playerEnergy = 10000;
                c.selectedSheepType = 'small';
                c.tryDeploySelectedUnit(0);
                state.recycle = {
                    exercised: true,
                    poolAfterDeath: state.recycle.poolAfterDeath,
                    reused: c.units.some((unit) => nodeIds.includes(unit.node.uuid)),
                };
            }, 1000);
        }
        if (elapsed >= 35 && !state.actionFlags.restart) {
            state.actionFlags.restart = true;
            c.restartGame();
            const diagnostics = c.getBattleFlowDiagnostics();
            state.restart = { exercised: true, pendingAfter: diagnostics.pending.total, unitsAfter: c.units.length };
            c.startPanel.active = false;
            c.activateBattle();
            issueUntilCommitted(60, state);
        }
        if (elapsed >= 45 && !state.actionFlags.title) {
            state.actionFlags.title = true;
            c.returnToTitle();
            const diagnostics = c.getBattleFlowDiagnostics();
            state.title = { exercised: true, pendingAfter: diagnostics.pending.total, unitsAfter: c.units.length };
            setTimeout(() => {
                prepare();
                issueUntilCommitted(40, state);
            }, 500);
        }
        if (elapsed >= 53 && !state.actionFlags.levelSwitch) {
            state.actionFlags.levelSwitch = true;
            c.currentLevel = 4;
            c.restartGame();
            const diagnostics = c.getBattleFlowDiagnostics();
            state.levelSwitch = {
                exercised: true,
                pendingAfter: diagnostics.pending.total,
                unitsAfter: c.units.length,
            };
            c.currentLevel = 5;
            c.restartGame();
            c.startPanel.active = false;
            c.activateBattle();
            issueUntilCommitted(40, state);
        }
        sample();
    }, 250);
}, { durationSeconds });

await page.waitForTimeout(durationSeconds * 1000);
await cdp.send('HeapProfiler.collectGarbage');

const metrics = await page.evaluate(async () => {
    const state = window.__battle01RealtimeStress;
    state.running = false;
    clearInterval(state.intervalId);
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const c = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.getBattleFlowDiagnostics === 'function');
    const countNodes = () => {
        let count = 0;
        const scan = (node) => { count += 1; node.children.forEach(scan); };
        scan(cc.director.getScene());
        return count;
    };
    const elapsedSeconds = (performance.now() - state.startedAt) / 1000;
    const memoryBeforeFinalCleanup = performance.memory?.usedJSHeapSize;
    const nodesBeforeFinalCleanup = countNodes();
    c.currentLevel = 2;
    c.restartGame();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const nodesAfterFinalCleanup = countNodes();
    return {
        elapsedSeconds,
        frameCount: state.frameCount,
        averageFps: state.frameCount / elapsedSeconds,
        minimumOneSecondFps: state.fpsSamples.length ? Math.min(...state.fpsSamples) : 0,
        maximumOneSecondFps: state.fpsSamples.length ? Math.max(...state.fpsSamples) : 0,
        fpsSamples: state.fpsSamples,
        longFramesOver50Ms: state.longFramesOver50Ms,
        longFramesOver100Ms: state.longFramesOver100Ms,
        longFrameRatio: state.frameCount > 0 ? state.longFramesOver50Ms / state.frameCount : 1,
        worstFrameMs: state.worstFrameMs,
        deployAttempts: state.deployAttempts,
        acceptedAttempts: state.acceptedAttempts,
        maxCommitted: state.maxCommitted,
        maxActive: state.maxActive,
        maxActivePlayer: state.maxActivePlayer,
        maxActiveAI: state.maxActiveAI,
        simultaneousActive60Reached: state.maxActive >= 60,
        maxPending: state.maxPending,
        maxDying: state.maxDying,
        maxNodes: state.maxNodes,
        minNodes: state.minNodes,
        nodesBeforeFinalCleanup,
        nodesAfterFinalCleanup,
        maxPool: state.maxPool,
        maxVfx: state.maxVfx,
        cumulativeUniqueUnits: state.uniqueUnitIds.size,
        positionViolations: state.positionViolations,
        sameTeamOverlapViolations: state.sameTeamOverlapViolations,
        largeMotionViolations: state.largeMotionViolations,
        memoryBaseline: state.memoryBaseline,
        memoryFirst: state.memorySamples[0],
        memoryLast: state.memorySamples.at(-1),
        memoryPeak: state.memorySamples.length ? Math.max(...state.memorySamples) : undefined,
        memoryBeforeFinalCleanup,
        milestones: state.milestones,
        pause: state.pause,
        recycle: state.recycle,
        restart: state.restart,
        title: state.title,
        levelSwitch: state.levelSwitch,
    };
});

await cdp.send('HeapProfiler.collectGarbage');
metrics.memoryAfterFinalGc = await page.evaluate(() => performance.memory?.usedJSHeapSize);
metrics.memoryDeltaAfterFinalGc = Number.isFinite(metrics.memoryBaseline)
    && Number.isFinite(metrics.memoryAfterFinalGc)
    ? metrics.memoryAfterFinalGc - metrics.memoryBaseline : undefined;

await page.screenshot({ path: path.join(outputDir, 'battle01-ui10-realtime-stress-final.png') });
await context.close();
await browser.close();

const checks = [
    { pass: metrics.elapsedSeconds >= durationSeconds - 1, message: 'requested real-time duration completed' },
    { pass: [20, 40, 60, 96, 120].every((target) => metrics.milestones[target]?.committedLoad >= target),
        message: '20, 40, 60, 96 and 120 committed-request milestones were exercised' },
    { pass: metrics.maxCommitted === 128, message: 'browser stress reached the 128 technical boundary' },
    { pass: metrics.averageFps >= 30 && metrics.minimumOneSecondFps >= 25,
        message: 'browser frame rate stayed above the 30 FPS average target' },
    { pass: metrics.longFrameRatio <= 0.05,
        message: 'frames over 50 ms stayed below five percent' },
    { pass: metrics.positionViolations === 0 && metrics.sameTeamOverlapViolations === 0
        && metrics.largeMotionViolations === 0,
        message: 'no off-road, same-team overlap or large-motion violation was sampled' },
    { pass: metrics.maxPool <= 48 && metrics.maxVfx <= 64,
        message: 'unit and VFX pools stayed within their technical budgets' },
    { pass: metrics.pause.exercised && metrics.pause.frozen,
        message: 'pause froze both pending requests and unit positions' },
    { pass: metrics.restart.exercised && metrics.restart.pendingAfter === 0 && metrics.restart.unitsAfter === 0
        && metrics.title.exercised && metrics.title.pendingAfter === 0 && metrics.title.unitsAfter === 0
        && metrics.levelSwitch.exercised && metrics.levelSwitch.pendingAfter === 0
        && metrics.levelSwitch.unitsAfter === 0,
        message: 'restart, title return and level switch cleared units and pending requests' },
    { pass: metrics.recycle.exercised && metrics.recycle.poolAfterDeath > 0,
        message: 'level-five death flow populated the small-unit pool' },
    { pass: metrics.nodesAfterFinalCleanup < metrics.maxNodes,
        message: 'scene node count fell after final unit and pool cleanup' },
    { pass: !Number.isFinite(metrics.memoryDeltaAfterFinalGc)
        || metrics.memoryDeltaAfterFinalGc < 64 * 1024 * 1024,
        message: 'post-GC browser heap growth stayed below 64 MiB' },
    { pass: consoleProblems.length === 0 && requestFailures.length === 0,
        message: 'runtime console and resource requests stayed clean' },
];

const result = {
    version: 'v1.3.0-dev-battle01-ui10',
    generatedAt: new Date().toISOString(),
    previewUrl,
    durationSeconds,
    passed: checks.filter((item) => item.pass).length,
    failed: checks.filter((item) => !item.pass).length,
    checks,
    metrics,
    consoleProblems,
    requestFailures,
    interpretation: {
        committedLoad: 'active + dying + accepted FIFO requests',
        active60: metrics.simultaneousActive60Reached
            ? 'reached' : 'not reached; report separately from the 60-request milestone',
        platformBoundary: 'browser evidence only; WeChat DevTools and devices require separate validation',
    },
};
fs.writeFileSync(path.join(outputDir, 'battle01-ui10-realtime-stress-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ passed: result.passed, failed: result.failed, metrics }, null, 2));
if (result.failed > 0) process.exitCode = 1;
