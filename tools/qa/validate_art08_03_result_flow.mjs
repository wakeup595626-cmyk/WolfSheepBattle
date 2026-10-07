import { chromium } from 'playwright';
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
let activeFlow = 'bootstrap';
page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
        consoleProblems.push({ flow: activeFlow, type: message.type(), text: message.text() });
    }
});
page.on('pageerror', (error) => consoleProblems.push({ flow: activeFlow, type: 'pageerror', text: error.message }));
page.on('requestfailed', (request) => requestFailures.push({
    flow: activeFlow,
    url: request.url(),
    failure: request.failure()?.errorText ?? 'unknown',
}));
page.on('response', (response) => {
    if (response.status() === 404) response404s.push({ flow: activeFlow, url: response.url() });
});

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
const enterBattle = async () => {
    await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(6500);
    await clickDesign(0, -118, 6000);
    await clickDesign(0, -168, 900);
};
const forceResult = async (playerWon) => page.evaluate(async (won) => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const controllerClass = cc.js.getClassByName('GameController');
    const controller = scene?.getComponentInChildren(controllerClass);
    if (!controller) throw new Error('GameController component is unavailable');
    controller.finishGame(won);
}, playerWon);
const inspectResult = async () => page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        for (const child of node.children) visit(child);
    };
    visit(scene);
    const panel = nodes.find((node) => node.name === 'ResultPanel');
    const labels = panel?.getComponentsInChildren(cc.Label).map((label) => label.string) ?? [];
    return { panelActive: panel?.active ?? false, labels };
});

const results = [];
for (const playerWon of [true, false]) {
    activeFlow = playerWon ? 'victory' : 'defeat';
    await enterBattle();
    await forceResult(playerWon);
    await page.waitForTimeout(1700);
    const state = await inspectResult();
    await canvas.screenshot({ path: path.join(outputDir, `result_${activeFlow}.png`) });
    const expectedTitle = playerWon ? '战斗胜利' : '战斗失败';
    results.push({
        flow: activeFlow,
        expectedTitle,
        ...state,
        passed: state.panelActive && state.labels.includes(expectedTitle),
    });
}

const passed = results.every((result) => result.passed)
    && consoleProblems.length === 0 && requestFailures.length === 0 && response404s.length === 0;
const report = { passed, results, consoleProblems, requestFailures, response404s };
fs.writeFileSync(path.join(outputDir, 'result_flow_validation.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (!passed) process.exitCode = 1;
