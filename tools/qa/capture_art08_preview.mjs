import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
if (!outputDir) throw new Error('output directory is required');

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
        consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(10000);
const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
if (!box) throw new Error('preview canvas has no bounding box');

const designToPage = (x, y) => ({
    x: box.x + (x + 640) / 1280 * box.width,
    y: box.y + (360 - y) / 720 * box.height,
});
const clickDesign = async (x, y) => {
    const point = designToPage(x, y);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(500);
};

await canvas.screenshot({ path: path.join(outputDir, 'after_title_1280x720.png') });
await clickDesign(0, -118);
await page.waitForTimeout(5000);
await clickDesign(0, -168);
await page.waitForTimeout(1800);
await canvas.screenshot({ path: path.join(outputDir, 'after_battle_1280x720.png') });

await clickDesign(480, -330);
await clickDesign(315, -216);
await page.waitForTimeout(1000);
await canvas.screenshot({ path: path.join(outputDir, 'after_spawn_toast_1280x720.png') });
await clickDesign(480, -330);
await page.waitForTimeout(350);
await canvas.screenshot({ path: path.join(outputDir, 'after_insufficient_1280x720.png') });
await page.waitForTimeout(6000);
await canvas.screenshot({ path: path.join(outputDir, 'after_unit_shadow_1280x720.png') });

await clickDesign(550, 308);
await page.waitForTimeout(1200);
await canvas.screenshot({ path: path.join(outputDir, 'after_pause_1280x720.png') });

await clickDesign(-132, 170);
await page.setViewportSize({ width: 1800, height: 720 });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(outputDir, 'after_battle_wide_1800x720.png') });

console.log(JSON.stringify({ canvas: box, consoleErrors }, null, 2));
await browser.close();
