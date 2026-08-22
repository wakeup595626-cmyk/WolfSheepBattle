import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
if (!outputDir) throw new Error('output directory is required');
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
        consoleProblems.push({ type: message.type(), text: message.text() });
    }
});
page.on('pageerror', (error) => consoleProblems.push({ type: 'pageerror', text: error.message }));
page.on('requestfailed', (request) => requestFailures.push({
    url: request.url(),
    failure: request.failure()?.errorText ?? 'unknown',
}));
page.on('response', (response) => {
    if (response.status() === 404) response404s.push(response.url());
});

await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(6500);
const canvas = page.locator('canvas').first();
const clickDesign = async (x, y, waitMs = 450) => {
    const box = await canvas.boundingBox();
    if (!box) throw new Error('preview canvas has no bounding box');
    await page.mouse.click(
        box.x + (x + 640) / 1280 * box.width,
        box.y + (360 - y) / 720 * box.height,
    );
    await page.waitForTimeout(waitMs);
};
await clickDesign(0, -118, 6000);
await clickDesign(0, -168, 900);

const state = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const controllerClass = cc.js.getClassByName('GameController');
    const controller = scene?.getComponentInChildren(controllerClass);
    if (!controller || !scene) throw new Error('GameController component is unavailable');
    controller.playerBaseHealth = 40;
    controller.aiBaseHealth = 65;
    controller.playerEnergy = 50;
    controller.aiEnergy = 75;
    controller.playerSupply = 3;
    controller.aiSupply = 2;
    controller.snapEnergyBarsToCurrentValues();
    controller.refreshHud();
    controller.refreshBaseBars();

    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        for (const child of node.children) visit(child);
    };
    visit(scene);
    const metric = (rootName, fillName) => {
        const root = nodes.find((node) => node.name === rootName);
        const fill = root?.getChildByName(fillName);
        const label = root?.getChildByName('Text')?.getComponent(cc.Label);
        return {
            fillScaleX: fill?.scale.x,
            label: label?.string,
            placeholderGraphicsEnabled: root?.getComponent(cc.Graphics)?.enabled ?? false,
        };
    };
    return {
        aiBase: metric('AIBaseBar', 'BaseFillArt'),
        playerBase: metric('PlayerBaseBar', 'BaseFillArt'),
        aiEnergy: metric('AIEnergyBar', 'Fill'),
        playerEnergy: metric('PlayerEnergyBar', 'Fill'),
        aiSupply: metric('AISupplyBadge', 'Unused'),
        playerSupply: metric('PlayerSupplyBadge', 'Unused'),
    };
});
await page.waitForTimeout(400);
await canvas.screenshot({ path: path.join(outputDir, 'dynamic_hud_values.png') });

const close = (left, right) => Math.abs(left - right) < 0.001;
const passed = close(state.aiBase.fillScaleX, 0.65)
    && close(state.playerBase.fillScaleX, 0.4)
    && close(state.aiEnergy.fillScaleX, 0.75)
    && close(state.playerEnergy.fillScaleX, 0.5)
    && state.aiSupply.label.includes('2 / 5')
    && state.playerSupply.label.includes('3 / 5')
    && Object.values(state).every((metric) => metric.placeholderGraphicsEnabled === false)
    && consoleProblems.length === 0 && requestFailures.length === 0 && response404s.length === 0;
const report = { passed, state, consoleProblems, requestFailures, response404s };
fs.writeFileSync(path.join(outputDir, 'dynamic_hud_validation.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (!passed) process.exitCode = 1;
