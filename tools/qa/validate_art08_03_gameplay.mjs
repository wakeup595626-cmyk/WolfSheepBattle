import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
if (!outputDir) throw new Error('output directory is required');
fs.mkdirSync(outputDir, { recursive: true });

const laneX = [-495, -225, 45, 315];
const typeCardX = { small: -480, medium: -160, large: 160, giant: 480 };
const scenarios = [
    { name: 'small-four-lanes', type: 'small', lanes: [0, 1, 2, 3] },
    { name: 'medium-four-lanes', type: 'medium', lanes: [0, 1, 2, 3] },
    { name: 'large-lanes-1-2', type: 'large', lanes: [0, 1] },
    { name: 'large-lanes-3-4', type: 'large', lanes: [2, 3] },
    { name: 'giant-lane-1', type: 'giant', lanes: [0] },
    { name: 'giant-lane-2', type: 'giant', lanes: [1] },
    { name: 'giant-lane-3', type: 'giant', lanes: [2] },
    { name: 'giant-lane-4', type: 'giant', lanes: [3] },
];

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
let activeScenario = 'bootstrap';
page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
        consoleProblems.push({ scenario: activeScenario, type: message.type(), text: message.text() });
    }
});
page.on('pageerror', (error) => consoleProblems.push({
    scenario: activeScenario,
    type: 'pageerror',
    text: error.message,
}));
page.on('requestfailed', (request) => requestFailures.push({
    scenario: activeScenario,
    url: request.url(),
    failure: request.failure()?.errorText ?? 'unknown',
}));
page.on('response', (response) => {
    if (response.status() === 404) response404s.push({ scenario: activeScenario, url: response.url() });
});

const getCanvas = async () => {
    await page.waitForSelector('canvas', { timeout: 30000 });
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('preview canvas has no bounding box');
    return { canvas, box };
};
const clickDesign = async (x, y, waitMs = 450) => {
    const { box } = await getCanvas();
    await page.mouse.click(
        box.x + (x + 640) / 1280 * box.width,
        box.y + (360 - y) / 720 * box.height,
    );
    await page.waitForTimeout(waitMs);
};
const enterBattle = async () => {
    await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await getCanvas();
    await page.waitForTimeout(6500);
    await clickDesign(0, -118, 6000);
    await clickDesign(0, -168, 900);
};
const inspectRuntime = async () => page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    if (!scene) throw new Error('runtime scene is unavailable');
    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        for (const child of node.children) visit(child);
    };
    visit(scene);
    const sheep = nodes.filter((node) => /^Sheep_/.test(node.name)).map((node) => ({
        name: node.name,
        x: node.position.x,
        y: node.position.y,
        scale: [node.scale.x, node.scale.y, node.scale.z],
    }));
    const energyRoot = nodes.find((node) => node.name === 'PlayerEnergyBar');
    const energyLabel = energyRoot?.getChildByName('Text')?.getComponent(cc.Label);
    const playerBaseRoot = nodes.find((node) => node.name === 'PlayerBaseBar');
    const playerBaseLabel = playerBaseRoot?.getChildByName('Text')?.getComponent(cc.Label);
    return {
        sheep,
        playerEnergyText: energyLabel?.string ?? '',
        playerBaseText: playerBaseLabel?.string ?? '',
    };
});

const results = [];
for (const scenario of scenarios) {
    activeScenario = scenario.name;
    await enterBattle();
    await clickDesign(typeCardX[scenario.type], -330, 250);
    for (const lane of scenario.lanes) {
        await clickDesign(laneX[lane], -216, 900);
    }
    await page.waitForTimeout(300);
    const runtime = await inspectRuntime();
    const typeUnits = runtime.sheep.filter((unit) => unit.name.startsWith(`Sheep_${scenario.type}_`));
    const actualLaneX = typeUnits.map((unit) => unit.x).sort((left, right) => left - right);
    const expectedLaneX = scenario.lanes.map((lane) => laneX[lane]).sort((left, right) => left - right);
    const passed = actualLaneX.length === expectedLaneX.length
        && actualLaneX.every((x, index) => Math.abs(x - expectedLaneX[index]) < 0.001)
        && typeUnits.every((unit) => unit.scale.every((value) => Math.abs(value - 1) < 0.001));
    results.push({
        ...scenario,
        expectedLaneX,
        actualLaneX,
        playerEnergyText: runtime.playerEnergyText,
        playerBaseText: runtime.playerBaseText,
        units: typeUnits,
        passed,
    });
    if (scenario.name === 'small-four-lanes') {
        const { canvas } = await getCanvas();
        await canvas.screenshot({ path: path.join(outputDir, 'gameplay_small_four_lanes.png') });
        await clickDesign(538, 170, 300);
        await clickDesign(538, 308, 500);
        await clickDesign(-132, 170, 400);
    }
}

const coverage = Object.fromEntries(laneX.map((x, lane) => [lane + 1, {
    laneX: x,
    types: ['small', 'medium', 'large', 'giant'].filter((type) => results.some((result) =>
        result.type === type && result.actualLaneX.some((actualX) => Math.abs(actualX - x) < 0.001))),
}]));
const passed = results.every((result) => result.passed)
    && Object.values(coverage).every((entry) => entry.types.length === 4)
    && consoleProblems.length === 0
    && requestFailures.length === 0
    && response404s.length === 0;
const report = { passed, results, coverage, consoleProblems, requestFailures, response404s };
fs.writeFileSync(path.join(outputDir, 'gameplay_validation.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (!passed) process.exitCode = 1;
