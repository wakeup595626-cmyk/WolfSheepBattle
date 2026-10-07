import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
if (!outputDir) throw new Error('output directory is required');
fs.mkdirSync(outputDir, { recursive: true });

const laneX = [-495, -225, 45, 315];
const roadY = { upper: 160, middle: 20, lower: -190 };
const typeCardX = { small: -480, medium: -160, large: 160, giant: 480 };

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const consoleRecords = [];
const pendingConsoleRecords = [];
const requestFailures = [];
const response404s = [];
page.on('console', (message) => {
    const pending = Promise.all(message.args().map(async (argument) => {
        try {
            return await argument.jsonValue();
        } catch {
            return argument.toString();
        }
    })).then((args) => consoleRecords.push({ type: message.type(), text: message.text(), args }));
    pendingConsoleRecords.push(pending);
});
page.on('pageerror', (error) => consoleRecords.push({ type: 'pageerror', text: error.message, args: [] }));
page.on('requestfailed', (request) => requestFailures.push({
    url: request.url(),
    failure: request.failure()?.errorText ?? 'unknown',
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
const designToPage = (box, x, y) => ({
    x: box.x + (x + 640) / 1280 * box.width,
    y: box.y + (360 - y) / 720 * box.height,
});
const clickDesign = async (x, y, waitMs = 200) => {
    const { box } = await getCanvas();
    const point = designToPage(box, x, y);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(waitMs);
};
const dragDesign = async (startX, startY, endX, endY) => {
    const { box } = await getCanvas();
    const start = designToPage(box, startX, startY);
    const end = designToPage(box, endX, endY);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
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
    const callback = Function('cc', 'scene', 'nodes', 'controller', 'argument', `return (${callbackSource})(cc, scene, nodes, controller, argument);`);
    return callback(cc, scene, nodes, controller, argument);
}, { callbackSource: callbackSource.toString(), argument });

await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded', timeout: 30000 });
await getCanvas();
await page.waitForTimeout(8500);
await clickDesign(0, -118, 6000);
await clickDesign(0, -168, 1200);

await withController((_cc, _scene, _nodes, controller) => {
    controller.aiDecisionCooldown = 99999;
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.refreshHud();
    return true;
});

const { canvas } = await getCanvas();
await canvas.screenshot({ path: path.join(outputDir, 'after_battle_1280x720.png') });

const cardAudit = async () => withController((cc, _scene, _nodes, controller) => {
    const color = (value) => value ? [value.r, value.g, value.b, value.a] : undefined;
    return [...controller.typeButtons.entries()].map(([type, button]) => {
        const mainTransform = button.label.node.getComponent(cc.UITransform);
        const statusTransform = button.stateLabel.node.getComponent(cc.UITransform);
        const statusBackgroundTransform = button.statusBackgroundNode.getComponent(cc.UITransform);
        return {
            type,
            visualState: button.visualState,
            cardScale: [button.node.scale.x, button.node.scale.y, button.node.scale.z],
            mainText: button.label.string,
            mainCenter: [button.label.node.position.x, button.label.node.position.y],
            mainSize: mainTransform ? [mainTransform.contentSize.width, mainTransform.contentSize.height] : undefined,
            mainColor: color(button.label.color),
            statusText: button.stateLabel.string,
            statusCenter: [button.stateLabel.node.position.x, button.stateLabel.node.position.y],
            statusSize: statusTransform ? [statusTransform.contentSize.width, statusTransform.contentSize.height] : undefined,
            statusBackgroundCenter: [button.statusBackgroundNode.position.x, button.statusBackgroundNode.position.y],
            statusBackgroundSize: statusBackgroundTransform
                ? [statusBackgroundTransform.contentSize.width, statusBackgroundTransform.contentSize.height] : undefined,
            statusFill: color(button.statusBackgroundGraphics.fillColor),
            statusTextColor: color(button.stateLabel.color),
            yellowOverlayActive: button.artSelectionGraphics?.node.active ?? false,
        };
    });
});
const initialCardAudit = await cardAudit();

await clickDesign(typeCardX.medium, -330, 350);
await canvas.screenshot({ path: path.join(outputDir, 'selected_medium_yellow.png') });
const selectedMediumAudit = await cardAudit();

await clickDesign(typeCardX.giant, -330, 300);
const insufficientAudit = await withController((_cc, _scene, _nodes, controller) => {
    controller.playerEnergy = 0;
    controller.playerSpawnCooldown = 0;
    controller.refreshHud();
    const selectedBefore = controller.selectedSheepType;
    return { selectedBefore };
});
await clickDesign(typeCardX.small, -330, 250);
const insufficientAfterClick = await withController((_cc, _scene, _nodes, controller) => ({
    selectedAfter: controller.selectedSheepType,
    states: [...controller.typeButtons.entries()].map(([type, button]) => ({
        type,
        state: button.visualState,
        yellow: button.artSelectionGraphics?.node.active ?? false,
    })),
}));

const lockedAudit = await withController((_cc, _scene, _nodes, controller) => {
    const original = controller.isUnitTypeUnlocked;
    controller.isUnitTypeUnlocked = (type) => type !== 'large';
    controller.playerEnergy = 100;
    controller.refreshUnitTypeButtons();
    const large = controller.typeButtons.get('large');
    const result = {
        state: large.visualState,
        text: large.stateLabel.string,
        yellow: large.artSelectionGraphics?.node.active ?? false,
    };
    controller.isUnitTypeUnlocked = original;
    controller.refreshUnitTypeButtons();
    return result;
});

const clickMatrix = [];
for (let lane = 0; lane < laneX.length; lane += 1) {
    for (const [position, y] of Object.entries(roadY)) {
        await withController((_cc, _scene, _nodes, controller) => {
            controller.clearBattleUnits();
            controller.aiDecisionCooldown = 99999;
            controller.playerEnergy = 100;
            controller.playerSpawnCooldown = 0;
            controller.selectedSheepType = 'small';
            controller.refreshHud();
            return true;
        });
        await clickDesign(laneX[lane], y, 120);
        const runtime = await withController((_cc, _scene, _nodes, controller) => ({
            units: controller.units.filter((unit) => unit.team === 0).map((unit) => ({
                lane: unit.lane,
                x: unit.node.position.x,
                y: unit.node.position.y,
                scale: [unit.node.scale.x, unit.node.scale.y, unit.node.scale.z],
            })),
        }));
        clickMatrix.push({ lane: lane + 1, position, clickY: y, ...runtime });
    }
}

await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.selectedSheepType = 'small';
    controller.refreshHud();
    return true;
});
await clickDesign(-360, 20, 180);
const grassClickCount = await withController((_cc, _scene, _nodes, controller) =>
    controller.units.filter((unit) => unit.team === 0).length);

await clickDesign(typeCardX.medium, -330, 180);
const uiCardClickUnitCount = await withController((_cc, _scene, _nodes, controller) =>
    controller.units.filter((unit) => unit.team === 0).length);

await withController((_cc, _scene, _nodes, controller) => {
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.showStatusToast('公告条触摸穿透检查');
    return true;
});
await clickDesign(45, -148, 180);
const toastClickUnitCount = await withController((_cc, _scene, _nodes, controller) =>
    controller.units.filter((unit) => unit.team === 0).length);

await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.selectedSheepType = 'small';
    controller.refreshHud();
    return true;
});
await clickDesign(-495, 20, 180);
const singleClickUnitCount = await withController((_cc, _scene, _nodes, controller) =>
    controller.units.filter((unit) => unit.team === 0).length);

await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.refreshHud();
    return true;
});
await dragDesign(-225, 20, -225, 90);
const dragUnitCount = await withController((_cc, _scene, _nodes, controller) =>
    controller.units.filter((unit) => unit.team === 0).length);

await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.refreshHud();
    return true;
});
await clickDesign(538, 308, 250);
await clickDesign(45, 20, 200);
const pausedClickCount = await withController((_cc, _scene, _nodes, controller) =>
    controller.units.filter((unit) => unit.team === 0).length);
await clickDesign(-132, 170, 350);

const fullLaneAudit = await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.selectedSheepType = 'small';
    controller.refreshHud();
    return true;
});
void fullLaneAudit;
for (let index = 0; index < 4; index += 1) {
    await withController((_cc, _scene, _nodes, controller) => {
        controller.playerEnergy = 100;
        controller.playerSpawnCooldown = 0;
        controller.refreshHud();
        return true;
    });
    await clickDesign(-495, 20, 2600);
}
const laneFullCount = await withController((_cc, _scene, _nodes, controller) =>
    controller.units.filter((unit) => unit.team === 0 && unit.lane === 0).length);

const supplyAudit = await withController((cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.statusToast.active = false;
    const owners = [null, 0, 1, null];
    controller.supplyPoints.forEach((point, index) => {
        point.owner = owners[index];
        point.capturingTeam = null;
        point.captureTime = 0;
        controller.drawSupplyPoint(point);
    });
    return controller.supplyPoints.map((point) => ({
        lane: point.lane + 1,
        owner: point.owner,
        frameIndex: point.artStateIndex,
        factionActive: point.factionSilhouetteNode.active,
        factionPosition: [point.factionSilhouetteNode.position.x, point.factionSilhouetteNode.position.y],
        artPosition: point.artSprite ? [point.artSprite.node.position.x, point.artSprite.node.position.y] : undefined,
        artSize: point.artSprite
            ? (() => {
                const size = point.artSprite.node.getComponent(cc.UITransform)?.contentSize;
                return size ? [size.width, size.height] : undefined;
            })() : undefined,
    }));
});
await canvas.screenshot({ path: path.join(outputDir, 'supply_neutral_sheep_wolf.png') });

const layoutAudit = await withController((cc, _scene, nodes, controller) => {
    const gateOffset = { aiBody: -0.375 * 72 / 128, playerBody: 0 };
    const gates = [0, 1, 2, 3].map((lane) => {
        const laneCenter = [-495, -225, 45, 315][lane];
        const aiRoot = nodes.find((node) => node.name === `AISpawnGateRoot${lane + 1}`);
        const aiVisual = aiRoot?.getChildByName('GateVisual');
        const playerMarker = nodes.find((node) => node.name === `SpawnMarker${lane}`);
        const playerRoot = playerMarker?.getChildByName('PlayerSpawnGateRoot');
        const playerVisual = playerRoot?.getChildByName('GateVisual');
        // Cocos world UI coordinates use the Canvas bottom-left origin in preview;
        // convert back to the design-space centre origin before comparing with LANE_X.
        const aiVisualWorldX = (aiRoot?.worldPosition.x ?? NaN) - 640 + (aiVisual?.position.x ?? NaN);
        const playerVisualWorldX = (playerMarker?.worldPosition.x ?? NaN) - 640
            + (playerRoot?.position.x ?? NaN) + (playerVisual?.position.x ?? NaN);
        const aiBodyCenterX = aiVisualWorldX + gateOffset.aiBody;
        const playerBodyCenterX = playerVisualWorldX + gateOffset.playerBody;
        return {
            lane: lane + 1,
            laneCenter,
            aiRootWorldX: (aiRoot?.worldPosition.x ?? NaN) - 640,
            aiVisualWorldX,
            aiBodyCenterX,
            aiError: Math.abs(aiBodyCenterX - laneCenter),
            playerRootWorldX: (playerMarker?.worldPosition.x ?? NaN) - 640,
            playerVisualWorldX,
            playerBodyCenterX,
            playerError: Math.abs(playerBodyCenterX - laneCenter),
        };
    });
    const hitAreas = controller.laneHitAreas.map((entry) => {
        const size = entry.node.getComponent(cc.UITransform)?.contentSize;
        return {
            lane: entry.lane + 1,
            center: [entry.node.position.x, entry.node.position.y],
            size: size ? [size.width, size.height] : undefined,
        };
    });
    const levelSize = controller.levelBadge.getComponent(cc.UITransform)?.contentSize;
    return {
        gates,
        hitAreas,
        levelBadge: {
            center: [controller.levelBadge.position.x, controller.levelBadge.position.y],
            size: levelSize ? [levelSize.width, levelSize.height] : undefined,
            chapterText: controller.levelBadgeChapterLabel.string,
            titleText: controller.levelBadgeTitleLabel.string,
        },
    };
});

await page.setViewportSize({ width: 1800, height: 720 });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outputDir, 'after_battle_wide_1800x720.png') });
await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(300);

await Promise.all(pendingConsoleRecords);
const visualLogs = consoleRecords.filter((record) => record.text.includes('[VisualPolish04]'));
const consoleProblems = consoleRecords.filter((record) =>
    record.type === 'error' || record.type === 'warning' || record.type === 'pageerror');
const matrixPassed = clickMatrix.length === 12 && clickMatrix.every((entry) =>
    entry.units.length === 1
    && entry.units[0].lane === entry.lane - 1
    && Math.abs(entry.units[0].x - laneX[entry.lane - 1]) < 0.001
    && entry.units[0].y < -150
    && entry.units[0].scale.every((value) => Math.abs(value - 1) < 0.001));
const gatePassed = layoutAudit.gates.every((gate) => gate.aiError <= 2 && gate.playerError <= 2);
const cardLayoutPassed = initialCardAudit.every((card) => card.mainCenter[0] === -17 && card.mainCenter[1] === 0
    && card.statusCenter[0] === 95 && card.statusCenter[1] === 0
    && card.statusBackgroundCenter[0] === 95 && card.statusBackgroundCenter[1] === 0);
const selectedCards = selectedMediumAudit.filter((card) => card.yellowOverlayActive);
const selectedPassed = selectedCards.length === 1 && selectedCards[0].type === 'medium'
    && selectedCards[0].visualState === 'selected';
const insufficientPassed = insufficientAudit.selectedBefore === 'giant'
    && insufficientAfterClick.selectedAfter === 'giant'
    && insufficientAfterClick.states.every((entry) => entry.state === 'insufficient' && !entry.yellow);
const supplyPassed = supplyAudit[0].frameIndex === 0 && supplyAudit[1].frameIndex === 1
    && supplyAudit[2].frameIndex === 2 && !supplyAudit[0].factionActive
    && supplyAudit[1].factionActive && supplyAudit[2].factionActive;
const passed = cardLayoutPassed && selectedPassed && insufficientPassed
    && lockedAudit.state === 'locked' && !lockedAudit.yellow
    && supplyPassed && gatePassed && matrixPassed
    && grassClickCount === 0 && uiCardClickUnitCount === 0 && toastClickUnitCount === 0
    && singleClickUnitCount === 1 && dragUnitCount === 0 && pausedClickCount === 0 && laneFullCount === 3
    && consoleProblems.length === 0 && requestFailures.length === 0 && response404s.length === 0;

const report = {
    passed,
    cardLayoutPassed,
    selectedPassed,
    insufficientPassed,
    supplyPassed,
    gatePassed,
    matrixPassed,
    initialCardAudit,
    selectedMediumAudit,
    insufficientAudit,
    insufficientAfterClick,
    lockedAudit,
    supplyAudit,
    layoutAudit,
    clickMatrix,
    grassClickCount,
    uiCardClickUnitCount,
    toastClickUnitCount,
    singleClickUnitCount,
    dragUnitCount,
    pausedClickCount,
    laneFullCount,
    visualLogs,
    consoleProblems,
    requestFailures,
    response404s,
};
fs.writeFileSync(path.join(outputDir, 'visual_input_validation.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (!passed) process.exitCode = 1;
