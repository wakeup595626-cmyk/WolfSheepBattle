import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-polish09-ui19-perf01-loading01/browser');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8819';
const phase = process.argv[4] ?? 'final';
const scenarioSeconds = Number(process.argv[5] ?? 6);
fs.mkdirSync(outputDir, { recursive: true });

const problems = [];
const checks = [];
const check = (passed, name, details = undefined) => checks.push({ passed: Boolean(passed), name, details });
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

const createContext = async (width, height) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
            selectedBgmId: 'cheerful_lighthearted', musicVolume: 0.5, sfxVolume: 0.75,
            musicMuted: true, sfxMuted: true, lastNonZeroMusicVolume: 0.5, lastNonZeroSfxVolume: 0.75,
        }));
        localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
            schemaVersion: 7, highestUnlockedLevel: 6, completedLevels: [1, 2, 3, 4, 5],
            selectedLevelId: 5, specialRoadTutorialSeen: true, levelOneTutorialCompleted: true,
            levelOneTutorialVersion: 7, freezeUnlocked: true, selectedTactics: ['sprint', 'heal', 'surge'],
            selectedTacticsByLevel: { 5: ['sprint', 'heal', 'surge'] }, levelFiveTutorialSeen: true,
            bestResultsByLevel: {},
        }));
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => problems.push({ type: 'pageerror', text: error.message, phase }));
    page.on('console', (message) => {
        if (message.type() === 'error') problems.push({ type: 'console-error', text: message.text(), phase });
    });
    page.on('requestfailed', (request) => problems.push({
        type: 'request', url: request.url(), text: request.failure()?.errorText ?? 'unknown', phase,
    }));
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    return { context, page };
};

const findControllerBody = `async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    if (!scene) return undefined;
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    return nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && component.typeButtons instanceof Map);
}`;
const waitForController = async (page) => {
    await page.waitForFunction(async (body) => {
        const controller = await Function(`return (${body})`)()();
        return Boolean(controller?.artLoadingPanel && controller?.pausePanel && controller?.typeButtons?.size === 4);
    }, findControllerBody,
        { timeout: 60000 });
};
const inController = async (page, body) => page.evaluate(async ({ finder, callback }) => {
    const cc = await System.import('cc');
    const controller = await Function(`return (${finder})`)()();
    if (!controller) throw new Error('GameController not found');
    return Function('c', 'cc', `return (${callback})(c, cc)`)(controller, cc);
}, { finder: findControllerBody, callback: body });

const captureRealLoadingTimeline = async (page, label) => {
    const timeline = await page.evaluate(async (finder) => {
        const startedAt = performance.now();
        let controller;
        while (!controller?.artLoadingPanel && performance.now() - startedAt < 30000) {
            controller = await Function(`return (${finder})`)()();
            if (!controller?.artLoadingPanel) await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        if (!controller?.artLoadingPanel) return { found: false, samples: [] };
        const samples = [];
        let lastText = '';
        while (performance.now() - startedAt < 30000) {
            const panelActive = Boolean(controller.artLoadingPanel?.active);
            const text = controller.artLoadingLabel?.string ?? '';
            const scaleX = controller.artLoadingFillFallback?.scale?.x ?? 0;
            if (text !== lastText || !panelActive) {
                samples.push({ atMs: performance.now() - startedAt, panelActive, text, scaleX });
                lastText = text;
            }
            if (!panelActive) break;
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        return { found: true, samples };
    }, findControllerBody);
    fs.writeFileSync(path.join(outputDir, `${label}-loading-timeline.json`), `${JSON.stringify(timeline, null, 2)}\n`);
    return timeline;
};

const main = await createContext(1280, 720);
await main.page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await main.page.waitForSelector('canvas', { timeout: 30000 });
const coldTimeline = await captureRealLoadingTimeline(main.page, `${phase}-cold`);
await waitForController(main.page);
await main.page.waitForTimeout(500);
await main.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await main.page.waitForSelector('canvas', { timeout: 30000 });
const cachedTimeline = await captureRealLoadingTimeline(main.page, `${phase}-cached`);
await waitForController(main.page);
await main.page.waitForTimeout(500);

check(coldTimeline.found && coldTimeline.samples.length > 0, 'loading/cold-launch-timeline-captured', coldTimeline);
check(cachedTimeline.found && cachedTimeline.samples.length > 0, 'loading/cached-launch-timeline-captured', cachedTimeline);

const loadingSteps = await inController(main.page, `async (c, cc) => {
    c.artLoadingPanel.active = true;
    c.artLoadingPanel.getComponent(cc.UIOpacity).opacity = 255;
    c.resetArtLoadingProgress();
    const values = [0, 10, 25, 50, 75, 98, 100];
    const rows = [];
    for (const value of values) {
        c.updateArtLoadingProgress(value, 100);
        if (value === 100) c.artLoadingTargetProgress = 1;
        for (let frame = 0; frame < 240 && Math.abs(c.artLoadingVisualProgress - c.artLoadingTargetProgress) > 0.001; frame += 1) {
            c.updateArtLoadingPresentation(1 / 60);
        }
        if (value === 0) c.applyArtLoadingVisualProgress(0);
        if (value === 100) { c.artLoadingVisualProgress = 1; c.applyArtLoadingVisualProgress(1); }
        const fill = c.artLoadingFillFallback;
        const frame = c.pausePanel?.parent?.getChildByName?.('unused');
        const transform = fill.getComponent(cc.UITransform);
        const world = transform.getBoundingBoxToWorld();
        rows.push({ value, text: c.artLoadingLabel.string, scaleX: fill.scale.x,
            visibleWidth: transform.contentSize.width * fill.scale.x,
            left: world.x, right: world.x + world.width, active: fill.active,
            siblingIndex: fill.siblingIndex, parentChildren: fill.parent.children.map((node) => node.name) });
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    c.artLoadingFailed = true;
    c.artLoadingLabel.string = '有 1 项资源未能加载';
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const failure = { text: c.artLoadingLabel.string, scaleX: c.artLoadingFillFallback.scale.x };
    c.resetArtLoadingProgress();
    c.updateArtLoadingProgress(1, 4);
    c.updateArtLoadingPresentation(1 / 60);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const retry = { text: c.artLoadingLabel.string, scaleX: c.artLoadingFillFallback.scale.x };
    return { rows, failure, retry };
}`);
for (const row of loadingSteps.rows) {
    await inController(main.page, `(c) => {
        c.artLoadingPanel.active = true; c.artLoadingFailed = false;
        c.artLoadingCompletionPending = false; c.artLoadingFadeStarted = false;
        c.artLoadingTargetProgress = ${row.value / 100}; c.artLoadingVisualProgress = ${row.value / 100};
        c.applyArtLoadingVisualProgress(${row.value / 100});
        return true;
    }`);
    await main.page.screenshot({ path: path.join(outputDir, `${phase}-loading-${String(row.value).padStart(3, '0')}.png`) });
}
const fullLoadingWidth = loadingSteps.rows.at(-1)?.visibleWidth ?? 0;
check(loadingSteps.rows.every((row, index) => row.active
    && Math.abs(row.scaleX - row.value / 100) <= 0.002
    && Math.abs(row.visibleWidth - fullLoadingWidth * row.value / 100) <= 1.2
    && (index === 0 || row.left === loadingSteps.rows[0].left)),
    'loading/0-10-25-50-75-98-100-width-and-left-edge', loadingSteps.rows);
check(loadingSteps.retry.scaleX > 0 && loadingSteps.retry.text.includes('%'),
    'loading/failure-retry-first-progress-visible', loadingSteps);

const pauseSnapshot = async (trackId, suffix) => {
    const result = await inController(main.page, `async (c, cc) => {
        c.artLoadingPanel.active = false;
        c.currentLevel = 5; c.restartGame(); c.startPanel.active = false; c.activateBattle();
        if (!c.isPaused) c.pauseGame();
        await c.preparePauseArt();
        const track = c.audioManager.getAvailableBgmTracks().find((item) => item.id === '${trackId}');
        c.selectBgmStyleFromUi(track); c.refreshBgmTrackSelector();
        await new Promise((resolve) => setTimeout(resolve, 2100));
        const options = [...c.bgmStyleOptions.values()].map((option) => ({
            id: option.track.id, selected: option.checkNode.active,
            title: { text: option.titleLabel.string, size: option.titleLabel.fontSize,
                lineHeight: option.titleLabel.lineHeight, bold: option.titleLabel.isBold,
                overflow: option.titleLabel.overflow, font: option.titleLabel.font?.name ?? '' },
            body: { text: option.subtitleLabel.string, size: option.subtitleLabel.fontSize,
                lineHeight: option.subtitleLabel.lineHeight, bold: option.subtitleLabel.isBold,
                overflow: option.subtitleLabel.overflow, font: option.subtitleLabel.font?.name ?? '' },
            state: { text: option.statusLabel.string, size: option.statusLabel.fontSize,
                lineHeight: option.statusLabel.lineHeight, bold: option.statusLabel.isBold,
                overflow: option.statusLabel.overflow, font: option.statusLabel.font?.name ?? '' },
            positions: { titleX: option.titleLabel.node.position.x, bodyX: option.subtitleLabel.node.position.x,
                stateX: option.statusLabel.node.position.x, checkX: option.checkNode.position.x },
        }));
        return { selectedId: c.audioManager.getSelectedBgmId(), options,
            panelChildren: c.pausePanel.children.map((node) => node.name),
            contentChildren: c.pauseContent.children.map((node) => node.name),
            fullBackdrop: Boolean(c.pausePanel.getChildByName('FullscreenBackdrop')),
            panelArt: Boolean(c.pauseContent.getChildByName('PausePanelArt')) };
    }`);
    await main.page.screenshot({ path: path.join(outputDir, `${phase}-pause-${suffix}.png`) });
    return result;
};
const cheerful = await pauseSnapshot('cheerful_lighthearted', 'cheerful');
const cyber = await pauseSnapshot('cyberwave_upbeat', 'cyberwave-after-2s');
for (const snapshot of [cheerful, cyber]) {
    const allFonts = snapshot.options.flatMap((option) => [option.title.font, option.body.font, option.state.font]);
    check(snapshot.fullBackdrop && snapshot.panelArt
        && !snapshot.panelChildren.includes('PausePanelShadow')
        && !snapshot.contentChildren.includes('PausePanelFinish'),
        'pause/no-programmatic-ghost-frame-before-or-after-async-art', snapshot);
    check(snapshot.options.length === 2 && new Set(allFonts).size === 1
        && snapshot.options.every((option) => option.title.size === 18 && option.title.bold
            && option.body.size === 14 && !option.body.bold && option.state.size === 13 && option.state.bold
            && option.title.positions?.titleX === undefined),
        'pause/bgm-card-font-size-weight-and-single-font', snapshot.options);
    check(snapshot.options[0].positions.titleX === snapshot.options[1].positions.titleX
        && snapshot.options[0].positions.bodyX === snapshot.options[1].positions.bodyX
        && snapshot.options[0].positions.stateX === snapshot.options[1].positions.stateX,
        'pause/two-cards-share-identical-layout', snapshot.options);
}

const definitions = {
    small: { type: 'small', name: '小羊', cost: 12, maxHealth: 48, damage: 8, speed: 22,
        attackInterval: 0.52, baseDamage: 9, battlePower: 22, radius: 17, color: [239, 241, 223] },
    medium: { type: 'medium', name: '中羊', cost: 24, maxHealth: 76, damage: 11, speed: 17,
        attackInterval: 0.58, baseDamage: 13, battlePower: 38, radius: 22, color: [231, 220, 182] },
    large: { type: 'large', name: '大羊', cost: 42, maxHealth: 116, damage: 19, speed: 14,
        attackInterval: 0.7, baseDamage: 21, battlePower: 72, radius: 28, color: [201, 229, 211] },
    giant: { type: 'giant', name: '巨羊', cost: 70, maxHealth: 200, damage: 33, speed: 12,
        attackInterval: 0.9, baseDamage: 35, battlePower: 130, radius: 35, color: [208, 202, 244] },
};

const runScenario = async (name, level, perTeamPerLane, typeMode) => inController(main.page, `async (c) => {
    c.artLoadingPanel.active = false; if (c.isPaused) c.resumeGame();
    c.currentLevel = ${level}; c.restartGame(); c.startPanel.active = false; c.activateBattle();
    c.aiDecisionCooldown = 9999;
    const definitions = ${JSON.stringify(definitions)};
    const types = ['small', 'medium', 'large', 'giant'];
    await c.artResourceManager.preloadGroups(['battle-core']);
    for (const type of types) await c.ensureUnitArtLoaded(type);
    c.applyPilotStaticArt();
    const spawned = [];
    for (let lane = 0; lane < 4; lane += 1) {
        for (let team = 0; team < 2; team += 1) {
            for (let index = 0; index < ${perTeamPerLane}; index += 1) {
                const type = '${typeMode}' === 'mixed' ? types[(lane + team + index) % types.length] : '${typeMode}';
                const ok = c.spawnUnit(team, lane, definitions[type]);
                if (!ok) continue;
                const unit = c.units[c.units.length - 1];
                const step = 40;
                const y = team === 0 ? -5 - index * step : 5 + index * step;
                c.setUnitLogicY(unit, y);
                spawned.push(unit);
            }
        }
    }
    c.laneFormationCacheDirty = true; c.repairAllLaneInvariants();
    const counters = { healthScaleWrites: 0, siblingIndexWrites: 0 };
    for (const unit of spawned) {
        const setScale = unit.healthFillNode.setScale.bind(unit.healthFillNode);
        unit.healthFillNode.setScale = (...args) => { counters.healthScaleWrites += 1; return setScale(...args); };
        const setSiblingIndex = unit.node.setSiblingIndex.bind(unit.node);
        unit.node.setSiblingIndex = (...args) => { counters.siblingIndexWrites += 1; return setSiblingIndex(...args); };
    }
    for (let warmup = 0; warmup < 3; warmup += 1) await new Promise((resolve) => requestAnimationFrame(resolve));
    const frameTimes = []; const oneSecondFps = []; let bucketStart = performance.now(); let bucketFrames = 0;
    let previous = performance.now(); let maxActive = c.units.length; let maxDying = 0; let maxPending = 0;
    const endAt = performance.now() + ${scenarioSeconds} * 1000;
    while (performance.now() < endAt) {
        const now = await new Promise((resolve) => requestAnimationFrame(resolve));
        const dt = now - previous; previous = now; if (dt > 0 && dt < 1000) frameTimes.push(dt);
        bucketFrames += 1;
        if (now - bucketStart >= 1000) { oneSecondFps.push(bucketFrames * 1000 / (now - bucketStart)); bucketFrames = 0; bucketStart = now; }
        maxActive = Math.max(maxActive, c.units.length); maxDying = Math.max(maxDying, c.dyingUnits.length);
        maxPending = Math.max(maxPending, c.getBattleFlowDiagnostics().pending.total);
        c.aiDecisionCooldown = 9999;
    }
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
    const elapsedMs = frameTimes.reduce((sum, value) => sum + value, 0);
    return { name: '${name}', requestedUnits: ${perTeamPerLane} * 8, spawned: spawned.length,
        averageFps: elapsedMs > 0 ? frameTimes.length * 1000 / elapsedMs : 0,
        minimumOneSecondFps: oneSecondFps.length ? Math.min(...oneSecondFps) : 0,
        p95FrameMs: percentile(0.95), p99FrameMs: percentile(0.99),
        over50ms: frameTimes.filter((value) => value > 50).length,
        over100ms: frameTimes.filter((value) => value > 100).length,
        maxActive, maxDying, maxPending, finalActive: c.units.length, finalDying: c.dyingUnits.length,
        finalPending: c.getBattleFlowDiagnostics().pending.total, ...counters };
}`);

const performanceResults = [];
performanceResults.push(await runScenario('normal-24', 4, 3, 'mixed'));
performanceResults.push(await runScenario('stress-40', 4, 5, 'small'));
performanceResults.push(await runScenario('level5-dense-48', 5, 6, 'small'));
fs.writeFileSync(path.join(outputDir, `${phase}-performance.json`), `${JSON.stringify(performanceResults, null, 2)}\n`);
check(performanceResults.every((item) => item.spawned >= item.requestedUnits * 0.9),
    'performance/24-40-level5-dense-scenarios-populated', performanceResults);
if (phase === 'final') {
    check(performanceResults[0].p95FrameMs <= 33.4 && performanceResults[0].over100ms === 0,
        'performance/normal-p95-and-long-frame-target', performanceResults[0]);
}

const trajectory = await inController(main.page, `async (c) => {
    c.currentLevel = 4; c.restartGame(); c.startPanel.active = false; c.activateBattle(); c.aiDecisionCooldown = 9999;
    const definitions = ${JSON.stringify(definitions)}; const types = ['small','medium','large','giant'];
    const tracked = [];
    for (let lane = 0; lane < 4; lane += 1) {
        c.spawnUnit(1, lane, definitions[types[lane]]); const unit = c.units[c.units.length - 1];
        c.setUnitLogicY(unit, 175); tracked.push(unit);
    }
    const samples = tracked.map(() => []);
    for (let frame = 0; frame < 150; frame += 1) {
        if (frame === 55) c.pauseGame(); if (frame === 75) c.resumeGame();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        tracked.forEach((unit, index) => samples[index].push({ frame, paused: c.isPaused,
            rootY: unit.node.worldPosition.y, healthY: unit.healthNode.worldPosition.y,
            offset: unit.healthNode.worldPosition.y - unit.node.worldPosition.y }));
        c.aiDecisionCooldown = 9999;
    }
    return tracked.map((unit, index) => {
        const rows = samples[index]; let staleWhileRootMoved = 0; let maxStaticRun = 0; let run = 0;
        for (let i = 1; i < rows.length; i += 1) {
            const rootMoved = Math.abs(rows[i].rootY - rows[i - 1].rootY) > 0.001;
            const healthMoved = Math.abs(rows[i].healthY - rows[i - 1].healthY) > 0.001;
            if (rootMoved && !healthMoved) { staleWhileRootMoved += 1; run += 1; maxStaticRun = Math.max(maxStaticRun, run); }
            else run = 0;
        }
        const offsets = rows.map((row) => row.offset);
        return { type: unit.definition.type, lane: unit.lane + 1, samples: rows,
            offsetRange: Math.max(...offsets) - Math.min(...offsets), staleWhileRootMoved, maxStaticRun };
    });
}`);
fs.writeFileSync(path.join(outputDir, `${phase}-health-trajectory.json`), `${JSON.stringify(trajectory, null, 2)}\n`);
check(trajectory.every((item) => item.offsetRange <= 0.001 && item.staleWhileRootMoved === 0 && item.maxStaticRun < 2),
    'trajectory/four-wolf-tiers-root-and-health-ui-same-frame-fixed-offset', trajectory.map((item) => ({
        type: item.type, lane: item.lane, offsetRange: item.offsetRange,
        staleWhileRootMoved: item.staleWhileRootMoved, maxStaticRun: item.maxStaticRun,
    })));

const healthTransitions = await inController(main.page, `async (c) => {
    const unit = c.units.find((item) => item.node.isValid && !item.isDying);
    const collect = async (frames) => { const values = [];
        for (let frame = 0; frame < frames && unit.node.isValid; frame += 1) {
            await new Promise((resolve) => requestAnimationFrame(resolve)); values.push(unit.healthFillNode.scale.x);
        } return values; };
    unit.health = unit.definition.maxHealth * 0.35; const damage = await collect(45);
    unit.health = unit.definition.maxHealth; const heal = await collect(45);
    c.startUnitDeath(unit); const death = await collect(90);
    const monotonic = (values, direction) => values.every((value, index) => index === 0
        || direction * (value - values[index - 1]) >= -0.0002);
    return { damage, heal, death, damageMonotonic: monotonic(damage, -1),
        healMonotonic: monotonic(heal, 1), deathMonotonic: monotonic(death, -1),
        destroyed: !unit.node.isValid || !c.units.includes(unit) };
}`);
check(healthTransitions.damageMonotonic && healthTransitions.healMonotonic && healthTransitions.deathMonotonic
    && healthTransitions.damage.at(-1) < healthTransitions.damage[0]
    && healthTransitions.heal.at(-1) > healthTransitions.heal[0] && healthTransitions.destroyed,
    'health/damage-heal-death-smoothing-remains-continuous', {
        damageStart: healthTransitions.damage[0], damageEnd: healthTransitions.damage.at(-1),
        healStart: healthTransitions.heal[0], healEnd: healthTransitions.heal.at(-1),
        deathStart: healthTransitions.death[0], deathEnd: healthTransitions.death.at(-1),
        destroyed: healthTransitions.destroyed,
    });

const threeWayTierColor = await inController(main.page, `async (c, cc) => {
    if (c.isPaused) c.resumeGame(); c.helpPanel.active = false; c.pausePanel.active = false;
    c.currentLevel = 5; c.restartGame(); c.startPanel.active = false; c.activateBattle(); c.aiDecisionCooldown = 9999;
    const definitions = ${JSON.stringify(definitions)}; const types = ['small','medium','large','giant'];
    for (let lane = 0; lane < 4; lane += 1) {
        c.spawnUnit(0, lane, definitions[types[lane]]); c.setUnitLogicY(c.units[c.units.length - 1], -70 + lane * 14);
        c.spawnUnit(1, lane, definitions[types[lane]]); c.setUnitLogicY(c.units[c.units.length - 1], 90 + lane * 14);
    }
    c.playerEnergy = 1000; c.refreshUnitTypeButtons(); c.pauseGame(); c.openHelpPanel();
    c.helpContent.setPosition(180, 0, 0);
    c.units.filter((unit) => unit.team === 0).forEach((unit, index) =>
        unit.node.setPosition(-300, 155 - index * 92, 0));
    const rgba = (color) => [color.r, color.g, color.b, color.a];
    const cards = [...c.typeButtons.entries()].map(([type, view]) => ({
        type, accent: rgba(view.tierAccentGraphics.strokeColor), children: view.node.children.map((node) => node.name),
    }));
    const badges = c.units.filter((unit) => unit.team === 0).map((unit) => ({
        type: unit.definition.type, accent: rgba(unit.tierBadgeGraphics.fillColor), text: unit.tierBadgeLabel.string,
    }));
    const legend = types.map((type) => {
        const node = c.helpContentRoot.getChildByName('TierLegend' + type);
        return { type, accent: rgba(node.getComponent(cc.Graphics)?.strokeColor ?? c.typeButtons.get(type).tierAccentGraphics.strokeColor) };
    });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return { cards, badges, legend };
}`);
await main.page.screenshot({ path: path.join(outputDir, `${phase}-tier-colors-cards-badges-help.png`) });
const expectedTierRgb = { small: [74,177,238], medium: [54,190,134], large: [161,99,224], giant: [239,174,47] };
check(threeWayTierColor.cards.every((item) => item.accent.slice(0, 3).join(',') === expectedTierRgb[item.type].join(','))
    && threeWayTierColor.badges.every((item) => item.accent.slice(0, 3).join(',') === expectedTierRgb[item.type].join(','))
    && threeWayTierColor.legend.every((item) => item.accent.slice(0, 3).join(',') === expectedTierRgb[item.type].join(',')),
    'tier-color/cards-health-badges-help-legend-share-frozen-rgb-source', threeWayTierColor);
const interactionRegression = await inController(main.page, `(c) => {
    c.helpContent.setPosition(0, 0, 0); c.closeHelpPanel();
    const helpReturned = c.pausePanel.active && c.isPaused;
    c.resumeGame(); const resumed = !c.isPaused && !c.pausePanel.active;
    c.playerEnergy = 1000; c.selectUnitType('small'); c.playerSpawnCooldown = 0;
    const first = c.tryDeploySelectedUnit(0); c.playerSpawnCooldown = 0;
    const second = c.tryDeploySelectedUnit(0); c.playerSpawnCooldown = 0;
    const third = c.tryDeploySelectedUnit(0);
    const queued = c.getBattleFlowDiagnostics().pending.total > 0;
    c.pauseGame(); const paused = c.isPaused && c.pausePanel.active;
    c.restartGame(); const restarted = c.isStarted && !c.isPaused && !c.isFinished;
    c.pauseGame(); c.returnToTitle();
    const returnedTitle = !c.isStarted && c.startPanel.active && !c.pausePanel.active && !c.helpPanel.active;
    return { helpReturned, resumed, first, second, third, queued, paused, restarted, returnedTitle };
}`);
check(Object.values(interactionRegression).every(Boolean),
    'regression/pause-help-resume-queued-deployment-restart-return-title', interactionRegression);
await main.page.screenshot({ path: path.join(outputDir, `${phase}-battle-final.png`) });
await main.context.close();

const wide = await createContext(1600, 720);
await wide.page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await wide.page.waitForSelector('canvas', { timeout: 30000 });
await waitForController(wide.page);
await wide.page.waitForTimeout(4500);
await inController(wide.page, `async (c) => {
    c.artLoadingPanel.active = false; c.currentLevel = 5; c.restartGame(); c.startPanel.active = false; c.activateBattle();
    c.pauseGame(); await c.preparePauseArt(); await new Promise((resolve) => setTimeout(resolve, 2100)); return true;
}`);
await wide.page.screenshot({ path: path.join(outputDir, `${phase}-1600x720-pause-after-2s.png`) });
await wide.context.close();

await browser.close();
check(problems.length === 0, 'browser/no-page-console-or-request-errors', problems);
const report = { phase, previewUrl, generatedAt: new Date().toISOString(), scenarioSeconds,
    summary: { total: checks.length, passed: checks.filter((item) => item.passed).length,
        failed: checks.filter((item) => !item.passed).length },
    checks, performanceResults, trajectorySummary: trajectory.map(({ samples, ...item }) => item), problems };
fs.writeFileSync(path.join(outputDir, `${phase}-browser-validation-report.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
for (const item of checks.filter((entry) => !entry.passed)) console.error(`FAIL ${item.name}`, item.details ?? '');
if (report.summary.failed > 0) process.exitCode = 1;
