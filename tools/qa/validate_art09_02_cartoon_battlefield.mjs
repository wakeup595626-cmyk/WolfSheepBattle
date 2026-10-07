import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
if (!outputDir) throw new Error('output directory is required');
const baseUrl = process.argv[3] ?? 'http://127.0.0.1:7470';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
const consoleRecords = [];
const pendingConsole = [];
const requestFailures = [];
const response404s = [];
page.on('console', (message) => {
    const pending = Promise.all(message.args().map(async (argument) => {
        try { return await argument.jsonValue(); } catch { return argument.toString(); }
    })).then((args) => consoleRecords.push({ type: message.type(), text: message.text(), args }));
    pendingConsole.push(pending);
});
page.on('pageerror', (error) => consoleRecords.push({ type: 'pageerror', text: error.message, args: [] }));
page.on('requestfailed', (request) => requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
page.on('response', (response) => { if (response.status() === 404) response404s.push(response.url()); });

const getCanvas = async () => {
    await page.waitForSelector('canvas', { timeout: 30000 });
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas box unavailable');
    return { canvas, box };
};
const pointForDesign = (box, x, y) => {
    const scale = box.height / 720;
    return { x: box.x + box.width / 2 + x * scale, y: box.y + box.height / 2 - y * scale };
};
const clickDesign = async (x, y, delay = 150) => {
    const { box } = await getCanvas();
    const point = pointForDesign(box, x, y);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(delay);
};
const withController = async (callbackSource, argument) => page.evaluate(async ({ callbackSource, argument }) => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); for (const child of node.children) visit(child); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        typeof component.trySpawnPlayerUnit === 'function' && component.typeButtons instanceof Map);
    if (!controller) throw new Error('GameController unavailable');
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
    controller.playerEnergy = 999;
    controller.aiEnergy = 999;
    controller.refreshHud();
    return true;
});

const ratios = [];
for (const width of [1280, 1600]) {
    await page.setViewportSize({ width, height: 720 });
    await page.waitForTimeout(700);
    await withController((_cc, _scene, _nodes, controller) => {
        controller.clearBattleUnits();
        controller.playerEnergy = 999;
        controller.selectedSheepType = 'small';
        controller.aiDecisionCooldown = 99999;
        return true;
    });
    const beforeGrass = await withController((_cc, _scene, _nodes, controller) => controller.units.length);
    await clickDesign(-360, 80, 100);
    const afterGrass = await withController((_cc, _scene, _nodes, controller) => controller.units.length);
    for (const laneX of [-495, -225, 45, 315]) {
        await withController((_cc, _scene, _nodes, controller) => { controller.playerSpawnCooldown = 0; return true; });
        await clickDesign(laneX, 80, 80);
    }
    const audit = await withController((cc, _scene, _nodes, controller, width) => {
        const sizeOf = (node) => {
            const size = node?.getComponent(cc.UITransform)?.contentSize;
            return size ? [size.width, size.height] : undefined;
        };
        return {
            width,
            mode: controller.screenAdapter.getMetrics().mode,
            visible: [controller.screenAdapter.getMetrics().visibleWidth,
                controller.screenAdapter.getMetrics().visibleHeight],
            backgroundFrame: controller.battleBackgroundSprite?.spriteFrame?.name,
            backgroundSize: sizeOf(controller.battleBackgroundSlot),
            backgroundScale: [controller.battleBackgroundSlot.scale.x, controller.battleBackgroundSlot.scale.y],
            laneArtActive: controller.laneArtSlots.map((node) => node.active),
            hitAreas: controller.laneHitAreas.map((entry) => ({
                lane: entry.lane, parent: entry.node.parent?.name,
                position: [entry.node.position.x, entry.node.position.y], size: sizeOf(entry.node),
                graphicsCount: entry.node.getComponents(cc.Graphics).length,
            })),
            playerUnits: controller.units.filter((unit) => unit.team === 0).map((unit) => ({
                lane: unit.lane, type: unit.definition.type, x: unit.node.position.x, y: unit.node.position.y,
            })),
        };
    }, width);
    const { canvas } = await getCanvas();
    const screenshot = `cartoon_battle_${width}x720.png`;
    await canvas.screenshot({ path: path.join(outputDir, screenshot) });
    ratios.push({ ...audit, grassClickSpawnDelta: afterGrass - beforeGrass, screenshot });
}

await withController((_cc, _scene, _nodes, controller) => {
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
    return true;
});
await page.waitForTimeout(2600);
const eightUnits = await withController((cc, _scene, _nodes, controller) => {
    return controller.units.map((unit) => {
        const spriteSize = unit.artSprite?.node.getComponent(cc.UITransform)?.contentSize;
        return {
            team: unit.team, lane: unit.lane, type: unit.definition.type,
            x: unit.node.position.x,
            rootScale: [unit.node.scale.x, unit.node.scale.y],
            spriteSize: spriteSize ? [spriteSize.width, spriteSize.height] : undefined,
        };
    });
});
await (await getCanvas()).canvas.screenshot({ path: path.join(outputDir, 'cartoon_eight_units_1600x720.png') });

const tacticFlow = await withController((_cc, _scene, _nodes, controller) => {
    controller.playerSupply = 100;
    controller.playerShockUnlocked = true;
    const playerUnit = controller.units.find((unit) => unit.team === 0);
    if (playerUnit) playerUnit.health = Math.max(1, playerUnit.health - 1);
    const invadingAI = controller.units.find((unit) => unit.team === 1);
    if (invadingAI) invadingAI.node.setPosition(invadingAI.node.position.x, -80, 0);
    controller.tryUseSprint(0);
    controller.tryUseHeal(0);
    controller.tryUseShock(0);
    return {
        sprintRemaining: controller.playerSprintRemaining,
        healCooldown: controller.playerHealCooldown,
        shockUsed: controller.playerShockUsed,
    };
});
await (await getCanvas()).canvas.screenshot({ path: path.join(outputDir, 'cartoon_tactics_1600x720.png') });

const pauseBefore = await withController((_cc, _scene, _nodes, controller) => {
    controller.pauseGame();
    return { positions: controller.units.map((unit) => [unit.node.position.x, unit.node.position.y]),
        playerEnergy: controller.playerEnergy, aiEnergy: controller.aiEnergy };
});
await page.waitForTimeout(700);
const pauseAfter = await withController((_cc, _scene, _nodes, controller) => ({
    paused: controller.isPaused,
    positions: controller.units.map((unit) => [unit.node.position.x, unit.node.position.y]),
    playerEnergy: controller.playerEnergy, aiEnergy: controller.aiEnergy,
}));
await withController((_cc, _scene, _nodes, controller) => { controller.resumeGame(); return true; });
await withController((_cc, _scene, _nodes, controller) => { controller.finishGame(true); return true; });
await page.waitForTimeout(1400);
const resultFlow = await withController((_cc, _scene, _nodes, controller) => ({
    finished: controller.isFinished, resultActive: controller.resultPanel.active,
}));

await Promise.all(pendingConsole);
const seriousConsole = consoleRecords.filter((entry) => ['error', 'warning', 'pageerror'].includes(entry.type));
const bundleWarnings = consoleRecords.filter((entry) => /404|bundle|resource.*fail|资源加载失败/i.test(entry.text));
const report = { generatedAt: new Date().toISOString(), ratios, eightUnits, tacticFlow,
    pause: { before: pauseBefore, after: pauseAfter }, resultFlow,
    seriousConsole, bundleWarnings, requestFailures, response404s };
fs.writeFileSync(path.join(outputDir, 'cartoon_battlefield_validation.json'), JSON.stringify(report, null, 2));
await browser.close();

const failures = [];
for (const ratio of ratios) {
    if (ratio.mode !== 'FIXED_HEIGHT') failures.push(`${ratio.width}: policy changed`);
    if (!ratio.backgroundFrame?.includes('battle-background-cartoon')) failures.push(`${ratio.width}: cartoon frame missing`);
    if (ratio.laneArtActive.some(Boolean)) failures.push(`${ratio.width}: legacy road sprite active`);
    if (ratio.hitAreas.some((area, lane) => area.parent !== 'BattleInputLayer'
        || Math.abs(area.position[0] - [-495, -225, 45, 315][lane]) > 0.01
        || Math.abs(area.size[0] - 165) > 0.01 || area.graphicsCount !== 0)) failures.push(`${ratio.width}: hit area mismatch`);
    if (ratio.grassClickSpawnDelta !== 0) failures.push(`${ratio.width}: grass click spawned unit`);
    if (ratio.playerUnits.length !== 4 || ratio.playerUnits.some((unit) =>
        Math.abs(unit.x - [-495, -225, 45, 315][unit.lane]) > 0.01)) failures.push(`${ratio.width}: lane spawn mismatch`);
}
if (eightUnits.length !== 8 || eightUnits.some((unit) => unit.rootScale.some((value) => Math.abs(value - 1) > 0.001))) {
    failures.push('eight unit visual/root invariant failed');
}
const giants = eightUnits.filter((unit) => unit.type === 'giant');
if (giants.length !== 2 || giants.some((unit) => (unit.spriteSize?.[0] ?? 999) > 143)) failures.push('giant exceeds road width');
if (!(tacticFlow.sprintRemaining > 0) || !(tacticFlow.healCooldown > 0) || !tacticFlow.shockUsed) failures.push('tactic flow failed');
if (!pauseAfter.paused || JSON.stringify(pauseBefore.positions) !== JSON.stringify(pauseAfter.positions)
    || pauseBefore.playerEnergy !== pauseAfter.playerEnergy || pauseBefore.aiEnergy !== pauseAfter.aiEnergy) failures.push('pause freeze failed');
if (!resultFlow.finished || !resultFlow.resultActive) failures.push('victory flow failed');
if (seriousConsole.length || bundleWarnings.length || requestFailures.length || response404s.length) failures.push('runtime errors');
if (failures.length) throw new Error(`art09-02 validation failed: ${failures.join('; ')}`);
console.log(JSON.stringify({ ratios: ratios.length, eightUnits: eightUnits.length,
    giantWidths: giants.map((unit) => unit.spriteSize?.[0]), consoleErrors: seriousConsole.length, result: 'PASS' }));
