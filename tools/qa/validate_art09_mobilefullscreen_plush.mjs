import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
if (!outputDir) throw new Error('output directory is required');
const baseUrl = process.argv[3] ?? 'http://localhost:7456';
fs.mkdirSync(outputDir, { recursive: true });

const widths = [1280, 1440, 1560, 1600, 1680];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.addInitScript(() => {
    globalThis.wx = {
        getWindowInfo: () => ({ windowWidth: innerWidth, windowHeight: innerHeight }),
        getMenuButtonBoundingClientRect: () => ({
            left: innerWidth - 118,
            right: innerWidth - 18,
            top: 12,
            bottom: 50,
            width: 100,
            height: 38,
        }),
    };
});
await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
const consoleRecords = [];
const pendingConsoleRecords = [];
const requestFailures = [];
const response404s = [];
page.on('console', (message) => {
    const pending = Promise.all(message.args().map(async (argument) => {
        try { return await argument.jsonValue(); } catch { return argument.toString(); }
    })).then((args) => consoleRecords.push({ type: message.type(), text: message.text(), args }));
    pendingConsoleRecords.push(pending);
});
page.on('pageerror', (error) => consoleRecords.push({ type: 'pageerror', text: error.message, args: [] }));
page.on('requestfailed', (request) => requestFailures.push({
    url: request.url(), failure: request.failure()?.errorText ?? 'unknown',
}));
page.on('response', (response) => {
    if (response.status() === 404) response404s.push(response.url());
});

const getCanvas = async () => {
    await page.waitForSelector('canvas', { timeout: 30000 });
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('preview canvas has no bounding box');
    return { canvas, box };
};
const designToPage = (box, x, y) => {
    const scale = box.height / 720;
    return { x: box.x + box.width / 2 + x * scale, y: box.y + box.height / 2 - y * scale };
};
const clickDesign = async (x, y, waitMs = 180) => {
    const { box } = await getCanvas();
    const point = designToPage(box, x, y);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(waitMs);
};
const withController = async (callbackSource, argument) => page.evaluate(async ({ callbackSource, argument }) => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    if (!scene) throw new Error('runtime scene is unavailable');
    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        for (const child of node.children) visit(child);
    };
    visit(scene);
    const components = nodes.flatMap((node) => node.components ?? []);
    const controller = components.find((component) => typeof component.trySpawnPlayerUnit === 'function'
        && component.typeButtons instanceof Map);
    if (!controller) throw new Error('GameController component was not found');
    const callback = Function('cc', 'scene', 'nodes', 'controller', 'argument',
        `return (${callbackSource})(cc, scene, nodes, controller, argument);`);
    return callback(cc, scene, nodes, controller, argument);
}, { callbackSource: callbackSource.toString(), argument });

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await getCanvas();
await page.waitForTimeout(9000);
await clickDesign(0, -118, 6500);
await clickDesign(0, -168, 1200);
await withController((_cc, _scene, _nodes, controller) => {
    controller.aiDecisionCooldown = 99999;
    controller.playerEnergy = 100;
    controller.aiEnergy = 100;
    controller.refreshHud();
    return true;
});

const ratios = [];
for (const width of widths) {
    await page.setViewportSize({ width, height: 720 });
    await page.waitForTimeout(750);
    const beforeSideClick = await withController((_cc, _scene, _nodes, controller) => controller.units.length);
    const layout = await withController((cc, _scene, _nodes, controller, width) => {
        const sizeOf = (node) => {
            const size = node?.getComponent(cc.UITransform)?.contentSize;
            return size ? [size.width, size.height] : undefined;
        };
        const positionOf = (node) => node ? [node.position.x, node.position.y] : undefined;
        const backdrop = controller.pausePanel.getChildByName('FullscreenBackdrop');
        const background = controller.battleBackgroundSlot;
        return {
            width,
            metrics: controller.screenAdapter.getMetrics(),
            canvasSize: sizeOf(controller.node),
            fullscreenBackgroundSize: sizeOf(controller.fullscreenBackgroundRoot),
            coreSize: sizeOf(controller.gameLayer),
            safeUiSize: sizeOf(controller.safeUiRoot),
            modalSize: sizeOf(controller.modalLayer),
            modalBackdropSize: sizeOf(backdrop),
            backgroundSize: sizeOf(background),
            backgroundScale: background ? [background.scale.x, background.scale.y] : undefined,
            backgroundFrame: controller.battleBackgroundSprite?.spriteFrame?.name,
            boardGraphicsEnabled: controller.battlefieldBackgroundLayer.getChildByName('Board')
                ?.getComponent(cc.Graphics)?.enabled,
            laneArtActive: controller.laneArtSlots.map((node) => node.active),
            laneCenters: controller.laneCenterAnchors.map(positionOf),
            hitAreas: controller.laneHitAreas.map((entry) => ({
                position: positionOf(entry.node), size: sizeOf(entry.node), parent: entry.node.parent?.name,
            })),
            levelBadge: { position: positionOf(controller.levelBadge), size: sizeOf(controller.levelBadge) },
            pauseButton: { position: positionOf(controller.pauseButton.node), size: sizeOf(controller.pauseButton.node) },
            tacticHeader: {
                position: positionOf(controller.hudLayer.getChildByName('TacticSidebarHeader')),
                size: sizeOf(controller.hudLayer.getChildByName('TacticSidebarHeader')),
            },
            unitCards: [...controller.typeButtons.values()].map((button) => ({
                position: positionOf(button.node), size: sizeOf(button.node),
            })),
            capsuleExclusion: controller.capsuleExclusion ? {
                active: controller.capsuleExclusion.active,
                position: positionOf(controller.capsuleExclusion),
                size: sizeOf(controller.capsuleExclusion),
            } : undefined,
        };
    }, width);

    await clickDesign(layout.metrics.safeLeft + 24, 40, 120);
    const afterSideClick = await withController((_cc, _scene, _nodes, controller) => controller.units.length);

    await withController((_cc, _scene, _nodes, controller) => {
        controller.clearBattleUnits();
        controller.playerEnergy = 999;
        controller.selectedSheepType = 'small';
        controller.aiDecisionCooldown = 99999;
        return true;
    });
    for (const laneX of [-495, -225, 45, 315]) {
        await withController((_cc, _scene, _nodes, controller) => { controller.playerSpawnCooldown = 0; return true; });
        await clickDesign(laneX, 80, 90);
    }
    const laneClickResult = await withController((_cc, _scene, _nodes, controller) => ({
        count: controller.units.filter((unit) => unit.team === 0).length,
        units: controller.units.filter((unit) => unit.team === 0).map((unit) => ({
            lane: unit.lane, x: unit.node.position.x, y: unit.node.position.y,
        })),
    }));
    const { canvas } = await getCanvas();
    const screenshotName = `battle_${width}x720.png`;
    await canvas.screenshot({ path: path.join(outputDir, screenshotName) });
    ratios.push({ ...layout, sideGrassSpawnDelta: afterSideClick - beforeSideClick, laneClickResult, screenshotName });
}

await page.setViewportSize({ width: 1600, height: 720 });
await page.waitForTimeout(600);
const eightUnitAudit = await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.playerEnergy = 999;
    const types = ['small', 'medium', 'large', 'giant'];
    for (let lane = 0; lane < 4; lane += 1) {
        controller.selectedSheepType = types[lane];
        controller.playerSpawnCooldown = 0;
        controller.trySpawnPlayerUnit(lane);
    }
    const definitions = Object.fromEntries(controller.units.map((unit) => [unit.definition.type, unit.definition]));
    for (let lane = 0; lane < 4; lane += 1) controller.spawnUnit(1, lane, definitions[types[lane]]);
    return controller.units.map((unit) => ({
        team: unit.team, lane: unit.lane, type: unit.definition.type,
        x: unit.node.position.x, visualParent: unit.visualNode.parent?.name,
        rootScale: [unit.node.scale.x, unit.node.scale.y],
    }));
});
await (await getCanvas()).canvas.screenshot({ path: path.join(outputDir, 'eight_units_1600x720.png') });

const pressureStart = await withController((_cc, _scene, _nodes, controller) => {
    const definitions = Object.fromEntries(controller.units.map((unit) => [unit.definition.type, unit.definition]));
    controller.clearBattleUnits();
    for (let lane = 0; lane < 4; lane += 1) {
        const types = ['small', 'medium', 'large'];
        for (let index = 0; index < types.length; index += 1) {
            const type = types[index];
            controller.spawnUnit(0, lane, definitions[type]);
            const player = controller.units.filter((unit) => unit.lane === lane && unit.team === 0).at(-1);
            if (player) player.node.setPosition(player.node.position.x, -20 - index * 90, 0);
            controller.spawnUnit(1, lane, definitions[type]);
            const ai = controller.units.filter((unit) => unit.lane === lane && unit.team === 1).at(-1);
            if (ai) ai.node.setPosition(ai.node.position.x, 20 + index * 90, 0);
        }
    }
    controller.aiDecisionCooldown = 99999;
    controller.playerSupply = 100;
    controller.playerShockUnlocked = true;
    controller.tryUseSprint(0);
    controller.tryUseHeal(0);
    controller.tryUseShock(0);
    return { count: controller.units.length };
});
await page.waitForTimeout(3500);
const pressureEnd = await withController((_cc, _scene, _nodes, controller) => ({
    count: controller.units.length,
    invalid: controller.units.filter((unit) => !Number.isFinite(unit.node.position.x)
        || !Number.isFinite(unit.node.position.y) || Math.abs(unit.node.position.x - [-495, -225, 45, 315][unit.lane]) > 0.01)
        .map((unit) => ({ team: unit.team, lane: unit.lane, x: unit.node.position.x, y: unit.node.position.y })),
    laneCounts: [0, 1, 2, 3].map((lane) => ({
        lane,
        player: controller.units.filter((unit) => unit.lane === lane && unit.team === 0).length,
        ai: controller.units.filter((unit) => unit.lane === lane && unit.team === 1).length,
    })),
}));
await (await getCanvas()).canvas.screenshot({ path: path.join(outputDir, 'pressure_24_units_1600x720.png') });

const pauseBefore = await withController((_cc, _scene, _nodes, controller) => {
    controller.pauseGame();
    return {
        positions: controller.units.map((unit) => [unit.node.position.x, unit.node.position.y]),
        playerEnergy: controller.playerEnergy,
        aiEnergy: controller.aiEnergy,
    };
});
await page.waitForTimeout(800);
const pauseAfter = await withController((cc, _scene, _nodes, controller) => {
    const backdrop = controller.pausePanel.getChildByName('FullscreenBackdrop');
    const size = backdrop?.getComponent(cc.UITransform)?.contentSize;
    return {
        paused: controller.isPaused,
        positions: controller.units.map((unit) => [unit.node.position.x, unit.node.position.y]),
        playerEnergy: controller.playerEnergy,
        aiEnergy: controller.aiEnergy,
        backdropSize: size ? [size.width, size.height] : undefined,
        pauseContentPosition: [controller.pauseContent.position.x, controller.pauseContent.position.y],
    };
});
await (await getCanvas()).canvas.screenshot({ path: path.join(outputDir, 'pause_modal_1600x720.png') });
await withController((_cc, _scene, _nodes, controller) => { controller.resumeGame(); return true; });

await withController((_cc, _scene, _nodes, controller) => { controller.finishGame(true); return true; });
await page.waitForTimeout(1500);
const resultAudit = await withController((cc, _scene, _nodes, controller) => {
    const backdrop = controller.resultPanel.getChildByName('ResultBackdrop');
    const size = backdrop?.getComponent(cc.UITransform)?.contentSize;
    return {
        finished: controller.isFinished,
        panelActive: controller.resultPanel.active,
        backdropSize: size ? [size.width, size.height] : undefined,
        resultCardPosition: [controller.resultCard.position.x, controller.resultCard.position.y],
    };
});
await (await getCanvas()).canvas.screenshot({ path: path.join(outputDir, 'victory_modal_1600x720.png') });

await Promise.all(pendingConsoleRecords);
const seriousConsole = consoleRecords.filter((entry) => ['error', 'warning', 'pageerror'].includes(entry.type));
const bundleWarnings = consoleRecords.filter((entry) => /404|bundle|resource.*fail|资源加载失败/i.test(entry.text));
const report = {
    generatedAt: new Date().toISOString(),
    ratios,
    eightUnitAudit,
    pressure: { start: pressureStart, end: pressureEnd },
    pause: { before: pauseBefore, after: pauseAfter },
    resultAudit,
    seriousConsole,
    bundleWarnings,
    requestFailures,
    response404s,
};
fs.writeFileSync(path.join(outputDir, 'mobilefullscreen_plush_validation.json'),
    JSON.stringify(report, null, 2));
await browser.close();

const failures = [];
for (const ratio of ratios) {
    if (ratio.metrics.mode !== 'FIXED_HEIGHT') failures.push(`${ratio.width}: wrong policy`);
    if (Math.abs(ratio.metrics.visibleWidth - ratio.width) > 1 || Math.abs(ratio.metrics.visibleHeight - 720) > 1) {
        failures.push(`${ratio.width}: visible size mismatch`);
    }
    if (ratio.backgroundScale?.some((value) => Math.abs(value - 1) > 0.001)) failures.push(`${ratio.width}: background scaled`);
    if (ratio.laneArtActive.some(Boolean)) failures.push(`${ratio.width}: legacy lane sprite active`);
    if (ratio.sideGrassSpawnDelta !== 0) failures.push(`${ratio.width}: side grass spawned a unit`);
    if (ratio.laneClickResult.count !== 4 || ratio.laneClickResult.units.some((unit) =>
        Math.abs(unit.x - [-495, -225, 45, 315][unit.lane]) > 0.01)) failures.push(`${ratio.width}: lane input failed`);
    if (ratio.modalBackdropSize?.some((value, index) => Math.abs(value - [ratio.metrics.visibleWidth, 720][index]) > 1)) {
        failures.push(`${ratio.width}: modal backdrop mismatch`);
    }
}
if (eightUnitAudit.length !== 8) failures.push('eight-unit visual coverage failed');
if (eightUnitAudit.some((unit) => unit.rootScale.some((value) => Math.abs(value - 1) > 0.001))) failures.push('unit root scale changed');
if (pressureStart.count !== 24 || pressureEnd.invalid.length) failures.push('24-unit pressure invariant failed');
if (!pauseAfter.paused || JSON.stringify(pauseBefore.positions) !== JSON.stringify(pauseAfter.positions)
    || pauseBefore.playerEnergy !== pauseAfter.playerEnergy || pauseBefore.aiEnergy !== pauseAfter.aiEnergy) {
    failures.push('pause freeze failed');
}
if (!resultAudit.finished || !resultAudit.panelActive) failures.push('victory flow failed');
if (seriousConsole.length || requestFailures.length || response404s.length || bundleWarnings.length) failures.push('runtime console/network errors');
if (failures.length) throw new Error(`art09 validation failed: ${failures.join('; ')}`);
console.log(JSON.stringify({ ratios: ratios.length, eightUnits: eightUnitAudit.length,
    pressure: pressureEnd.count, consoleErrors: seriousConsole.length, result: 'PASS' }));
