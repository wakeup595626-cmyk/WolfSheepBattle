import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7457';
if (!outputDir) throw new Error('output directory is required');
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const consoleRecords = [];
const requestFailures = [];
const response404s = [];
await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
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
await clickDesign(0, -168, 1400);

const supplyAudit = await withController((cc, _scene, _nodes, controller) => {
    controller.isStarted = true;
    controller.isFinished = false;
    controller.isPaused = false;
    controller.aiDecisionCooldown = 99999;
    controller.clearBattleUnits();
    for (const point of controller.supplyPoints) {
        point.owner = null;
        point.capturingTeam = null;
        point.captureTime = 0;
        controller.drawSupplyPoint(point);
    }
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.selectedSheepType = 'small';
    controller.trySpawnPlayerUnit(0);
    const definition = controller.units.find((unit) => unit.team === 0).definition;
    controller.clearBattleUnits();
    const cycles = [];
    for (let index = 0; index < 10; index += 1) {
        const team = index % 2 === 0 ? 0 : 1;
        controller.clearBattleUnits();
        if (!controller.spawnUnit(team, 0, definition)) throw new Error(`supply test spawn failed at ${index}`);
        const unit = controller.units.find((entry) => entry.team === team);
        unit.node.setPosition(unit.node.position.x, 0, 0);
        controller.updateSupplyPoints(1.8);
        const point = controller.supplyPoints[0];
        cycles.push({
            cycle: index + 1,
            expectedOwner: team,
            owner: point.owner,
            capturingTeam: point.capturingTeam,
            artStateIndex: point.artStateIndex,
            playerIncome: controller.getSupplyIncome(0),
            aiIncome: controller.getSupplyIncome(1),
        });
    }
    controller.clearBattleUnits();
    const display = controller.supplyPoints;
    display[0].owner = null;
    display[0].capturingTeam = null;
    display[0].captureTime = 0;
    display[1].owner = 0;
    display[1].capturingTeam = null;
    display[1].captureTime = 0;
    display[2].owner = 1;
    display[2].capturingTeam = null;
    display[2].captureTime = 0;
    display[3].owner = null;
    display[3].capturingTeam = 0;
    display[3].captureTime = 0.85;
    for (const point of display) controller.drawSupplyPoint(point);
    return {
        cycles,
        displayed: display.map((point) => ({
            lane: point.lane + 1,
            owner: point.owner,
            capturingTeam: point.capturingTeam,
            artStateIndex: point.artStateIndex,
            artActive: point.artSprite?.node.active ?? false,
            fallbackGraphics: point.graphics.enabled,
            silhouetteActive: point.factionSilhouetteNode.active,
        })),
    };
});
const { canvas } = await getCanvas();
await canvas.screenshot({ path: path.join(outputDir, 'supply_four_states_1280x720.png') });

const tacticStateAudit = await withController((cc, _scene, _nodes, controller) => {
    controller.isStarted = true;
    controller.isFinished = false;
    controller.isPaused = false;
    controller.clearBattleUnits();
    const cards = {
        sprint: controller.playerSprintCard,
        heal: controller.playerHealCard,
        shock: controller.playerShockCard,
    };
    const snapshots = [];
    const snapshot = (kind) => {
        controller.refreshTacticCards();
        const availability = controller.getPlayerTacticAvailability(kind);
        const card = cards[kind];
        snapshots.push({
            kind,
            state: availability.state,
            enabled: availability.enabled,
            cardEnabled: card.enabled,
            cardState: card.availabilityState,
            title: card.titleLabel.string,
            rules: card.rulesLabel.string,
            status: card.statusLabel.string,
        });
    };
    const makeFake = (team, health, maxHealth, y = 0) => {
        const node = new cc.Node(`QAFake-${team}-${controller.units.length}`);
        node.setParent(controller.unitsAndVfxLayer);
        node.setPosition(0, y, 0);
        controller.units.push({ team, lane: 0, health, definition: { maxHealth }, node });
        return node;
    };
    const reset = () => {
        for (const unit of controller.units) unit.node.destroy();
        controller.units.length = 0;
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
    controller.playerSprintRemaining = 3.2; snapshot('sprint');
    controller.playerSprintRemaining = 0; controller.playerSprintCooldown = 4.2; snapshot('sprint');

    reset(); controller.playerSupply = 0; snapshot('heal');
    reset(); makeFake(0, 100, 100); snapshot('heal');
    controller.units[0].health = 50; snapshot('heal');
    controller.playerHealCooldown = 4.2; snapshot('heal');

    reset(); snapshot('shock');
    controller.playerShockUnlocked = true; snapshot('shock');
    makeFake(1, 100, 100, -100); snapshot('shock');
    controller.playerShockUsed = true; snapshot('shock');

    reset(); controller.isStarted = false; snapshot('sprint');
    controller.isStarted = true; controller.isPaused = true; snapshot('sprint');
    controller.isPaused = false; controller.isFinished = true; snapshot('sprint');
    controller.isFinished = false;
    for (const unit of controller.units) unit.node.destroy();
    controller.units.length = 0;
    controller.refreshTacticCards();
    return snapshots;
});
await canvas.screenshot({ path: path.join(outputDir, 'tactic_cards_full_layout_1280x720.png') });

const tacticUseAudit = await withController((_cc, _scene, _nodes, controller) => {
    controller.clearBattleUnits();
    controller.isStarted = true;
    controller.isFinished = false;
    controller.isPaused = false;
    controller.playerEnergy = 100;
    controller.playerSpawnCooldown = 0;
    controller.selectedSheepType = 'small';
    controller.trySpawnPlayerUnit(0);
    const player = controller.units.find((unit) => unit.team === 0);
    const definition = player.definition;
    controller.playerSupply = 5;
    controller.playerSprintRemaining = 0;
    controller.playerSprintCooldown = 0;
    const sprintBefore = controller.playerSupply;
    controller.tryUseSprint(0);
    const sprint = {
        supplySpent: sprintBefore - controller.playerSupply,
        remaining: controller.playerSprintRemaining,
        cooldown: controller.playerSprintCooldown,
    };
    controller.playerSprintRemaining = 0;
    controller.playerSprintCooldown = 0;
    controller.playerHealCooldown = 0;
    controller.playerSupply = 5;
    player.health = Math.floor(definition.maxHealth * 0.2);
    const healBefore = player.health;
    controller.tryUseHeal(0);
    const heal = {
        before: healBefore,
        after: player.health,
        maxHealth: definition.maxHealth,
        supply: controller.playerSupply,
        cooldown: controller.playerHealCooldown,
    };
    controller.spawnUnit(1, 1, definition);
    const enemy = controller.units.find((unit) => unit.team === 1);
    enemy.node.setPosition(enemy.node.position.x, -100, 0);
    controller.playerBaseHealth = 49;
    controller.playerShockUnlocked = false;
    controller.playerShockUsed = false;
    controller.unlockShockIfNeeded(0);
    const shockSupplyBefore = controller.playerSupply;
    controller.tryUseShock(0);
    const shock = {
        used: controller.playerShockUsed,
        supplySpent: shockSupplyBefore - controller.playerSupply,
        enemyHealth: enemy.health,
    };
    controller.clearBattleUnits();
    return { sprint, heal, shock };
});

await clickDesign(538, 308, 1400);
const volumeAudit = await withController((cc, _scene, _nodes, controller) => {
    const inspect = (control) => ({
        rootPosition: [control.root.position.x, control.root.position.y],
        titlePosition: (() => {
            const label = control.root.getChildByName(`${control.root.name}Title`);
            return [label.position.x, label.position.y];
        })(),
        mutePosition: [control.muteButton.node.position.x, control.muteButton.node.position.y],
        minusPosition: [control.root.getChildByName(`${control.root.name}Minus`).position.x, 0],
        trackPosition: [control.trackNode.position.x, control.trackNode.position.y],
        plusPosition: [control.root.getChildByName(`${control.root.name}Plus`).position.x, 0],
        percentPosition: [control.percentLabel.node.position.x, control.percentLabel.node.position.y],
        percent: control.percentLabel.string,
        fillScale: control.fillNode.scale.x,
        knobX: control.knobNode.position.x,
        expectedKnobRange: [-control.valueWidth / 2, control.valueWidth / 2],
        trackArtSize: (() => {
            const node = control.trackNode.getChildByName('SliderTrackArt');
            const size = node?.getComponent(cc.UITransform)?.contentSize;
            return size ? [size.width, size.height] : null;
        })(),
        trackGraphicsEnabled: control.trackGraphics.enabled,
        knobGraphicsEnabled: control.knobGraphics.enabled,
        muteGraphicsEnabled: control.muteButton.graphics.enabled,
        muteText: control.muteButton.label.string,
        formalIcon: control.formalIconReady,
        formalTrack: control.formalTrackReady,
        formalKnob: control.formalKnobReady,
    });
    const states = [];
    for (const value of [0, 50, 100]) {
        controller.setAudioVolume('music', value);
        controller.setAudioVolume('sfx', value);
        states.push({ value, music: inspect(controller.musicVolumeControl), sfx: inspect(controller.sfxVolumeControl) });
    }
    controller.setAudioVolume('music', 50);
    controller.setAudioVolume('sfx', 75);
    const selector = controller.pauseContentRoot.getChildByName('BgmSelector');
    const panel = selector.getChildByName('BgmSelectorPanelArt');
    const labels = controller.node.getComponentsInChildren(cc.Label);
    return {
        states,
        selector: {
            panelActive: panel?.active ?? false,
            fallbackGraphics: selector.getComponent(cc.Graphics)?.enabled ?? false,
            previousText: controller.bgmPreviousButton.label.string,
            nextText: controller.bgmNextButton.label.string,
        },
        font: {
            totalLabels: labels.length,
            formalFontLoaded: !!controller.formalUiFont,
            labelsUsingFormalFont: labels.filter((label) => label.font === controller.formalUiFont).length,
            mismatchedNodes: labels.filter((label) => label.font !== controller.formalUiFont).map((label) => label.node.name),
        },
        persisted: JSON.parse(localStorage.getItem('wolf-sheep-battle.audio-settings.v1') ?? 'null'),
    };
});
await canvas.screenshot({ path: path.join(outputDir, 'pause_audio_controls_1280x720.png') });

const result = {
    previewUrl,
    supplyAudit,
    tacticStateAudit,
    tacticUseAudit,
    volumeAudit,
    requestFailures,
    response404s,
    consoleErrors: consoleRecords.filter((entry) => entry.type === 'error' || entry.type === 'pageerror'),
    consoleWarnings: consoleRecords.filter((entry) => entry.type === 'warning'),
};
fs.writeFileSync(path.join(outputDir, 'runtime_audit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
