import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7458';
if (!outputDir) throw new Error('output directory is required');
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
const consoleRecords = [];
const requestFailures = [];
const response404s = [];
page.on('console', (message) => consoleRecords.push({ type: message.type(), text: message.text() }));
page.on('pageerror', (error) => consoleRecords.push({ type: 'pageerror', text: error.message }));
page.on('requestfailed', (request) => requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
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
const designToPage = (box, x, y) => ({
    x: box.x + (x + 640) / 1280 * box.width,
    y: box.y + (360 - y) / 720 * box.height,
});
const clickDesign = async (x, y, waitMs = 250) => {
    const { box } = await getCanvas();
    const point = designToPage(box, x, y);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(waitMs);
};
const pressDesign = async (x, y, inspect) => {
    const { box } = await getCanvas();
    const point = designToPage(box, x, y);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForTimeout(120);
    const whileDown = await inspect();
    await page.mouse.up();
    await page.waitForTimeout(180);
    const afterUp = await inspect();
    return { whileDown, afterUp };
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
    const controller = nodes.flatMap((node) => node.components ?? [])
        .find((component) => typeof component.getPlayerTacticAvailability === 'function');
    if (!controller) throw new Error('GameController component was not found');
    const callback = Function('cc', 'scene', 'nodes', 'controller', 'argument',
        `return (${callbackSource})(cc, scene, nodes, controller, argument);`);
    return callback(cc, scene, nodes, controller, argument);
}, { callbackSource: callbackSource.toString(), argument });

await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await getCanvas();
await page.waitForTimeout(8500);
await clickDesign(0, -118, 5500);
await clickDesign(0, -168, 1300);

const stateAudit = await withController((cc, _scene, _nodes, controller) => {
    const cards = {
        sprint: controller.playerSprintCard,
        heal: controller.playerHealCard,
        shock: controller.playerShockCard,
    };
    const color = (value) => [value.r, value.g, value.b, value.a];
    const labelMetric = (label) => {
        const transform = label.node.getComponent(cc.UITransform);
        return {
            name: label.node.name,
            position: [label.node.position.x, label.node.position.y],
            size: [transform.contentSize.width, transform.contentSize.height],
            fontSize: label.fontSize,
            lineHeight: label.lineHeight,
            horizontalAlign: label.horizontalAlign,
            verticalAlign: label.verticalAlign,
            overflow: label.overflow,
            wrap: label.enableWrapText,
            text: label.string,
            color: color(label.color),
        };
    };
    const snapshots = [];
    const snapshot = (kind) => {
        controller.refreshTacticCards();
        const availability = controller.getPlayerTacticAvailability(kind);
        const card = cards[kind];
        const transform = card.node.getComponent(cc.UITransform);
        snapshots.push({
            kind,
            state: availability.state,
            availabilityEnabled: availability.enabled,
            cardEnabled: card.enabled,
            cardState: card.availabilityState,
            cardSize: [transform.contentSize.width, transform.contentSize.height],
            cardPosition: [card.node.position.x, card.node.position.y],
            cardScale: [card.node.scale.x, card.node.scale.y],
            cardTint: color(card.artSprite.color),
            borderColor: color(card.stateFrameGraphics.strokeColor),
            textPanelColor: color(card.textPanelGraphics.fillColor),
            iconOpacity: card.iconOpacity.opacity,
            stateBarColor: color(card.stateBarGraphics.fillColor),
            pressActive: card.pressOverlay.active,
            title: labelMetric(card.titleLabel),
            rules: labelMetric(card.rulesLabel),
            status: labelMetric(card.statusLabel),
            stateBarPosition: [card.stateBarNode.position.x, card.stateBarNode.position.y],
            stateBarSize: (() => {
                const size = card.stateBarNode.getComponent(cc.UITransform).contentSize;
                return [size.width, size.height];
            })(),
            boundaryViolations: [...controller.validateTacticCardTextBounds(card, false)],
            formalSliced: card.artSprite?.type === cc.Sprite.Type.SLICED,
        });
    };
    const makeFake = (team, health, maxHealth, y = 0) => {
        const node = new cc.Node(`TacticQAFake-${team}-${controller.units.length}`);
        node.setParent(controller.unitsAndVfxLayer);
        node.setPosition(0, y, 0);
        controller.units.push({ team, lane: 0, health, definition: { maxHealth }, node });
    };
    const reset = () => {
        for (const unit of controller.units) unit.node.destroy();
        controller.units.length = 0;
        controller.isStarted = true;
        controller.isFinished = false;
        controller.isPaused = false;
        controller.playerSupply = 5;
        controller.playerSprintRemaining = 0;
        controller.playerSprintCooldown = 0;
        controller.playerHealCooldown = 0;
        controller.playerShockUnlocked = false;
        controller.playerShockUsed = false;
    };

    reset(); controller.playerSupply = 0; snapshot('sprint');
    reset(); snapshot('sprint');
    reset(); makeFake(0, 100, 100); snapshot('sprint');
    controller.playerSupply = 0; controller.playerSprintRemaining = 3.2; controller.playerSprintCooldown = 8; snapshot('sprint');
    controller.playerSprintRemaining = 0; controller.playerSprintCooldown = 4.2; snapshot('sprint');

    reset(); controller.playerSupply = 0; snapshot('heal');
    reset(); makeFake(0, 100, 100); snapshot('heal');
    controller.units[0].health = 50; snapshot('heal');
    controller.playerSupply = 0; controller.playerHealCooldown = 4.2; snapshot('heal');

    reset(); snapshot('shock');
    controller.playerShockUnlocked = true; snapshot('shock');
    makeFake(1, 100, 100, -100); snapshot('shock');
    controller.playerShockUnlocked = false; controller.playerShockUsed = true; snapshot('shock');

    reset();
    controller.refreshTacticCards();
    return snapshots;
});

const cardCenters = { sprint: [523, 156], heal: [523, 47], shock: [523, -62] };
await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.isStarted = true;
    controller.isFinished = false;
    controller.isPaused = false;
    controller.playerSupply = 5;
    controller.playerSprintRemaining = 0;
    controller.playerSprintCooldown = 0;
    controller.playerHealCooldown = 0;
    controller.playerShockUnlocked = false;
    controller.playerShockUsed = false;
    controller.__tacticQaAudioCalls = [];
    controller.__tacticQaOriginalPlaySfx = controller.audioManager.playSfx;
    controller.audioManager.playSfx = (name) => controller.__tacticQaAudioCalls.push(name);
    controller.refreshTacticCards();
});
const inspectPointerState = (kind) => withController((_cc, _scene, _nodes, controller, targetKind) => {
    const card = targetKind === 'sprint' ? controller.playerSprintCard
        : targetKind === 'heal' ? controller.playerHealCard : controller.playerShockCard;
    return {
        scale: [card.node.scale.x, card.node.scale.y],
        pressActive: card.pressOverlay.active,
        enabled: card.enabled,
        state: card.availabilityState,
        playerSupply: controller.playerSupply,
        sprintRemaining: controller.playerSprintRemaining,
        healCooldown: controller.playerHealCooldown,
        shockUsed: controller.playerShockUsed,
        audioCalls: [...controller.__tacticQaAudioCalls],
    };
}, kind);
const disabledPointerAudit = {};
for (const kind of ['sprint', 'heal', 'shock']) {
    const [x, y] = cardCenters[kind];
    disabledPointerAudit[kind] = await pressDesign(x, y, () => inspectPointerState(kind));
}
await withController((_cc, _scene, _nodes, controller) => {
    controller.audioManager.playSfx = controller.__tacticQaOriginalPlaySfx;
    delete controller.__tacticQaOriginalPlaySfx;
    delete controller.__tacticQaAudioCalls;
});

await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.selectedSheepType = 'small';
    controller.playerSupply = 5;
    controller.playerSprintRemaining = 0;
    controller.playerSprintCooldown = 0;
    controller.playerHealCooldown = 0;
    controller.playerShockUnlocked = true;
    controller.playerShockUsed = false;
    controller.trySpawnPlayerUnit(0);
    const player = controller.units.find((unit) => unit.team === 0);
    player.health = Math.max(1, Math.floor(player.definition.maxHealth / 2));
    controller.spawnUnit(1, 1, player.definition);
    const enemy = controller.units.find((unit) => unit.team === 1);
    enemy.node.setPosition(enemy.node.position.x, -100, 0);
    controller.__tacticQaAudioCalls = [];
    controller.__tacticQaOriginalPlaySfx = controller.audioManager.playSfx;
    controller.audioManager.playSfx = (name) => controller.__tacticQaAudioCalls.push(name);
    controller.refreshTacticCards();
});
const { canvas } = await getCanvas();
await canvas.screenshot({ path: path.join(outputDir, 'tactic_cards_available_1280x720.png') });
const availablePointerAudit = await pressDesign(cardCenters.sprint[0], cardCenters.sprint[1], () => inspectPointerState('sprint'));
await withController((_cc, _scene, _nodes, controller) => {
    controller.audioManager.playSfx = controller.__tacticQaOriginalPlaySfx;
    delete controller.__tacticQaOriginalPlaySfx;
    delete controller.__tacticQaAudioCalls;
});

await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.playerSupply = 0;
    controller.playerSprintRemaining = 0;
    controller.playerSprintCooldown = 0;
    controller.playerHealCooldown = 4.2;
    controller.playerShockUnlocked = false;
    controller.playerShockUsed = false;
    controller.refreshTacticCards();
});
await canvas.screenshot({ path: path.join(outputDir, 'tactic_cards_disabled_1280x720.png') });

await page.setViewportSize({ width: 1600, height: 720 });
await page.waitForTimeout(900);
const wideCanvas = (await getCanvas()).canvas;
await wideCanvas.screenshot({ path: path.join(outputDir, 'tactic_cards_wechat_landscape_sim_1600x720.png') });
const wideLayoutAudit = await withController((cc, _scene, _nodes, controller) => {
    const card = controller.playerSprintCard;
    const size = card.node.getComponent(cc.UITransform).contentSize;
    return {
        cardPosition: [card.node.position.x, card.node.position.y],
        cardSize: [size.width, size.height],
        screenMetrics: controller.screenMetrics,
        boundaryViolations: [...controller.validateTacticCardTextBounds(card, false)],
    };
});

const result = {
    previewUrl,
    stateAudit,
    disabledPointerAudit,
    availablePointerAudit,
    wideLayoutAudit,
    requestFailures,
    response404s,
    consoleErrors: consoleRecords.filter((entry) => entry.type === 'error' || entry.type === 'pageerror'),
    consoleWarnings: consoleRecords.filter((entry) => entry.type === 'warning'),
};
fs.writeFileSync(path.join(outputDir, 'tactic_card_runtime_audit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
