import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-level06/mobile');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8776';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const cases = [
    { name: 'compact-844x390', width: 844, height: 390 },
    { name: 'wide-2400x1080', width: 2400, height: 1080 },
];
const results = [];

for (const testCase of cases) {
    const consoleProblems = [];
    const requestFailures = [];
    const context = await browser.newContext({
        viewport: { width: testCase.width, height: testCase.height },
        hasTouch: true,
    });
    await context.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
            selectedBgmId: 'cheerful_lighthearted', musicVolume: 0.5, sfxVolume: 0.75,
            musicMuted: true, sfxMuted: true, lastNonZeroMusicVolume: 0.5, lastNonZeroSfxVolume: 0.75,
        }));
    });
    const page = await context.newPage();
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
            consoleProblems.push({ type: message.type(), text: message.text() });
        }
    });
    page.on('pageerror', (error) => consoleProblems.push({ type: 'pageerror', text: error.message }));
    page.on('requestfailed', (request) => requestFailures.push({
        url: request.url(), failure: request.failure()?.errorText ?? 'unknown',
    }));

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForFunction(async () => {
        const cc = await System.import('cc');
        let scene = cc.director.getScene();
        for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            scene = cc.director.getScene();
        }
        if (!scene) return false;
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
        return Boolean(controller && controller.startPanel.active && !controller.artLoadingPanel?.active);
    }, { timeout: 60000 });
    // Let the asynchronous art pass settle before starting the responsive battle check.
    await page.waitForTimeout(8000);
    await page.waitForFunction(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        if (!scene) return false;
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
        return Boolean(controller && controller.startPanel.active && !controller.artLoadingPanel?.active);
    }, { timeout: 60000 });

    const runtime = await page.evaluate(async () => {
        const cc = await System.import('cc');
        let scene = cc.director.getScene();
        for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            scene = cc.director.getScene();
        }
        if (!scene) throw new Error('runtime scene unavailable');
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
        controller.currentLevel = 6;
        controller.selectedTactics = ['sprint', 'heal', 'supplyBoost'];
        controller.selectedTacticsByLevel.set(6, [...controller.selectedTactics]);
        controller.restartGame();
        controller.startPanel.active = false;
        controller.tacticDeckPanel.active = false;
        controller.activateBattle();
        controller.updateLevelSixGoldenSupply(12.1);
        await new Promise((resolve) => setTimeout(resolve, 100));

        const bounds = (node) => {
            const transform = node.getComponent(cc.UITransform);
            const position = node.worldPosition;
            const scale = node.worldScale;
            const width = transform.contentSize.width * Math.abs(scale.x);
            const height = transform.contentSize.height * Math.abs(scale.y);
            return {
                left: position.x - metrics.visibleWidth / 2 - width / 2,
                right: position.x - metrics.visibleWidth / 2 + width / 2,
                bottom: position.y - metrics.visibleHeight / 2 - height / 2,
                top: position.y - metrics.visibleHeight / 2 + height / 2,
            };
        };
        const metrics = controller.screenMetrics;
        const pauseBounds = bounds(controller.pauseButton.node);
        const goldenBounds = bounds(controller.goldenSupplyPanel);
        const cards = [controller.playerSprintCard, controller.playerHealCard, controller.playerShockCard,
            controller.playerFreezeCard, controller.playerSurgeCard, controller.playerSupplyBoostCard]
            .filter(Boolean)
            .filter((card) => card.node.activeInHierarchy)
            .map((card) => ({ name: card.node.name, ...bounds(card.node) }));
        return {
            metrics: {
                visibleWidth: metrics.visibleWidth, visibleHeight: metrics.visibleHeight,
                safeLeft: metrics.safeLeft, safeRight: metrics.safeRight,
                safeBottom: metrics.safeBottom, safeTop: metrics.safeTop,
            },
            pauseBounds,
            goldenBounds,
            cards,
            activeTacticCount: cards.length,
            levelText: `${controller.levelBadgeChapterLabel.string} ${controller.levelBadgeTitleLabel.string}`,
            goldenText: [controller.goldenSupplyLaneLabel.string,
                controller.goldenSupplyTimeLabel.string, controller.goldenSupplyOwnerLabel.string],
        };
    });
    await page.waitForFunction(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        if (!scene) return false;
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
        return Boolean(controller && !controller.artLoadingPanel?.active && controller.battlePanel?.active);
    }, { timeout: 60000 });
    await page.waitForTimeout(1000);
    await page.waitForFunction(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        if (!scene) return false;
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
        return Boolean(controller && !controller.artLoadingPanel?.active && controller.battlePanel?.active);
    }, { timeout: 60000 });
    const canvasRect = await page.locator('canvas').boundingBox();
    await page.screenshot({ path: path.join(outputDir, `${testCase.name}.png`), fullPage: true });
    const withinSafe = (rect) => rect.left >= runtime.metrics.safeLeft - 0.5
        && rect.right <= runtime.metrics.safeRight + 0.5
        && rect.bottom >= runtime.metrics.safeBottom - 0.5
        && rect.top <= runtime.metrics.safeTop + 0.5;
    const checks = [
        { pass: canvasRect && Math.abs(canvasRect.width - testCase.width) <= 1 && Math.abs(canvasRect.height - testCase.height) <= 1,
            message: 'canvas covers the physical viewport without black-edge sizing gaps', detail: canvasRect },
        { pass: withinSafe(runtime.pauseBounds), message: 'pause button remains inside the logical safe area', detail: runtime.pauseBounds },
        { pass: withinSafe(runtime.goldenBounds), message: 'golden-supply HUD remains inside the logical safe area', detail: runtime.goldenBounds },
        { pass: runtime.activeTacticCount === 3 && runtime.cards.every(withinSafe),
            message: 'three carried tactic cards remain inside the logical safe area', detail: runtime.cards },
        { pass: /\u7b2c\s*6\s*\u5173/.test(runtime.levelText)
            && runtime.levelText.includes('\u8865\u7ed9\u4e89\u593a\u6218'),
            message: 'level 6 identity text remains visible in battle', detail: runtime.levelText },
        { pass: runtime.goldenText.every((text) => text.length > 0),
            message: 'golden lane, countdown, and owner labels are populated', detail: runtime.goldenText },
        { pass: consoleProblems.length === 0 && requestFailures.length === 0,
            message: 'responsive preview has no runtime console or request failures', detail: { consoleProblems, requestFailures } },
    ];
    results.push({ testCase, passed: checks.every((entry) => entry.pass), checks, runtime, canvasRect });
    await context.close();
}

const report = {
    generatedAt: new Date().toISOString(), previewUrl,
    passed: results.every((entry) => entry.passed), results,
};
fs.writeFileSync(path.join(outputDir, 'level06_mobile_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed,
    results: results.map((entry) => ({ name: entry.testCase.name, passed: entry.passed,
        failed: entry.checks.filter((check) => !check.pass).map((check) => check.message) })) }, null, 2));
await browser.close();
if (!report.passed) process.exitCode = 1;
