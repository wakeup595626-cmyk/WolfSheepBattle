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
    })).then((args) => {
        consoleRecords.push({ type: message.type(), text: message.text(), args });
    });
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

await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(10000);
const canvas = page.locator('canvas').first();
const initialBox = await canvas.boundingBox();
if (!initialBox) throw new Error('preview canvas has no bounding box');

const designToPage = (box, x, y) => ({
    x: box.x + (x + 640) / 1280 * box.width,
    y: box.y + (360 - y) / 720 * box.height,
});
const clickDesign = async (x, y, waitMs = 450) => {
    const box = await canvas.boundingBox();
    if (!box) throw new Error('preview canvas disappeared');
    const point = designToPage(box, x, y);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(waitMs);
};

await clickDesign(0, -118, 6000);
await canvas.screenshot({ path: path.join(outputDir, 'after_tutorial_1280x720.png') });
await clickDesign(0, -168, 1800);
await canvas.screenshot({ path: path.join(outputDir, 'after_battle_1280x720.png') });
const runtimeVisualAudit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    if (!scene) throw new Error('runtime scene is unavailable');
    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        for (const child of node.children) visit(child);
    };
    visit(scene);
    const targetNames = [
        'AISupplyBadge', 'AIBaseBar', 'AIEnergyBar',
        'PlayerSupplyBadge', 'PlayerBaseBar', 'PlayerEnergyBar',
        'TypeButtonsmall', 'TypeButtonmedium', 'TypeButtonlarge', 'TypeButtongiant',
        'PauseButton', 'TacticSidebarHeader',
        'PlayerSprintCard', 'PlayerHealCard', 'PlayerShockCard',
        'StatusToast', 'TacticNotice',
    ];
    return targetNames.map((name) => {
        const node = nodes.find((candidate) => candidate.name === name);
        if (!node) return { name, missing: true };
        const rootGraphics = node.getComponent(cc.Graphics);
        const descendants = [];
        const visitDescendants = (parent) => {
            for (const child of parent.children) {
                descendants.push(child);
                visitDescendants(child);
            }
        };
        visitDescendants(node);
        return {
            name,
            active: node.active,
            rootGraphicsEnabled: rootGraphics?.enabled ?? false,
            spriteChildren: node.children.filter((child) => child.getComponent(cc.Sprite)).map((child) => ({
                name: child.name,
                active: child.active,
                hasFrame: !!child.getComponent(cc.Sprite)?.spriteFrame,
            })),
            enabledGraphicsChildren: node.children.filter((child) => child.active && child.getComponent(cc.Graphics)?.enabled)
                .map((child) => child.name),
            activeGraphicsDescendants: descendants.filter((child) =>
                child.activeInHierarchy && child.getComponent(cc.Graphics)?.enabled).map((child) => child.name),
            activeSpriteDescendants: descendants.filter((child) =>
                child.activeInHierarchy && child.getComponent(cc.Sprite)?.spriteFrame).map((child) => child.name),
            labelChildren: node.children.filter((child) => child.getComponent(cc.Label)).map((child) => child.name),
        };
    });
});

for (const laneX of [-495, -225, 45, 315]) {
    await clickDesign(laneX, -216, 900);
}
await page.waitForTimeout(500);
await canvas.screenshot({ path: path.join(outputDir, 'after_four_lane_spawn_1280x720.png') });

await clickDesign(538, 308, 1100);
await canvas.screenshot({ path: path.join(outputDir, 'after_pause_1280x720.png') });
await clickDesign(-132, 170, 500);

await page.setViewportSize({ width: 1800, height: 720 });
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(outputDir, 'after_battle_wide_1800x720.png') });
await Promise.all(pendingConsoleRecords);

const auditRecords = consoleRecords.filter((record) => record.text.includes('[VisualPolish03]'));
const consoleProblems = consoleRecords.filter((record) =>
    record.type === 'error' || record.type === 'warning' || record.type === 'pageerror');
const result = {
    initialCanvas: initialBox,
    auditRecords,
    runtimeVisualAudit,
    consoleProblems,
    requestFailures,
    response404s,
};
fs.writeFileSync(path.join(outputDir, 'preview_audit.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
await browser.close();

if (consoleProblems.length > 0 || requestFailures.length > 0 || response404s.length > 0) {
    process.exitCode = 1;
}
