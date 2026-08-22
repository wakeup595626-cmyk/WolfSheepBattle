import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-ui02/responsive');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8777';
fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const cases = [{ name: 'compact-844x390', width: 844, height: 390 },
    { name: 'wide-2400x1080', width: 2400, height: 1080 }];
const results = [];

for (const testCase of cases) {
    const consoleProblems = [];
    const requestFailures = [];
    const context = await browser.newContext({ viewport: { width: testCase.width, height: testCase.height }, hasTouch: true });
    await context.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
            schemaVersion: 4, highestUnlockedLevel: 6, completedLevels: [1, 2, 3, 4, 5], selectedLevelId: 6,
            specialRoadTutorialSeen: true, levelFiveTutorialSeen: true, freezeUnlocked: true,
            tutorialCompleted: true, selectedTacticsByLevel: { 6: ['sprint', 'heal', 'supplyBoost'] },
        }));
        localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
            selectedBgmId: 'cyberwave_upbeat', musicVolume: 0.5, sfxVolume: 0.75,
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
    await page.waitForTimeout(10000);
    const levelState = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.getLevelSelectTotalPages === 'function');
        controller.showLevelSelect();
        controller.refreshLevelSelectPanel();
        const metrics = controller.screenMetrics;
        const toLogicalBounds = (node) => {
            const transform = node.getComponent(cc.UITransform);
            const pos = node.worldPosition;
            const scale = node.worldScale;
            const width = transform.contentSize.width * Math.abs(scale.x);
            const height = transform.contentSize.height * Math.abs(scale.y);
            return { left: pos.x - metrics.visibleWidth / 2 - width / 2,
                right: pos.x - metrics.visibleWidth / 2 + width / 2,
                bottom: pos.y - metrics.visibleHeight / 2 - height / 2,
                top: pos.y - metrics.visibleHeight / 2 + height / 2 };
        };
        return {
            metrics: { safeLeft: metrics.safeLeft, safeRight: metrics.safeRight,
                safeBottom: metrics.safeBottom, safeTop: metrics.safeTop },
            panel: toLogicalBounds(controller.levelSelectContent),
            visibleCards: [...controller.levelCards.values()].filter((card) => card.root.active).map((card) => ({
                id: card.levelId, bounds: toLogicalBounds(card.root), touchHeight: card.touchArea.getComponent(cc.UITransform).contentSize.height,
            })),
            pageLabel: controller.levelSelectPageLabel.string,
            pageButtonHeights: [controller.levelSelectPreviousPageButton, controller.levelSelectNextPageButton]
                .map((button) => button.node.getComponent(cc.UITransform).contentSize.height),
            actionButtonHeights: [controller.levelSelectBackButton, controller.levelSelectConfirmButton]
                .map((button) => button.node.getComponent(cc.UITransform).contentSize.height),
        };
    });
    await page.screenshot({ path: path.join(outputDir, `${testCase.name}-level-select.png`), fullPage: true });
    const pauseState = await page.evaluate(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.startPanel && typeof component.getLevelSelectTotalPages === 'function');
        controller.levelSelectPanel.active = false;
        controller.currentLevel = 6;
        controller.isStarted = false;
        controller.restartGame();
        controller.startPanel.active = false;
        controller.activateBattle();
        controller.pauseGame();
        controller.refreshBgmTrackSelector();
        const metrics = controller.screenMetrics;
        const bounds = (node) => {
            const transform = node.getComponent(cc.UITransform);
            const pos = node.worldPosition;
            const scale = node.worldScale;
            const width = transform.contentSize.width * Math.abs(scale.x);
            const height = transform.contentSize.height * Math.abs(scale.y);
            return { left: pos.x - metrics.visibleWidth / 2 - width / 2,
                right: pos.x - metrics.visibleWidth / 2 + width / 2,
                bottom: pos.y - metrics.visibleHeight / 2 - height / 2,
                top: pos.y - metrics.visibleHeight / 2 + height / 2 };
        };
        return { metrics: { safeLeft: metrics.safeLeft, safeRight: metrics.safeRight,
            safeBottom: metrics.safeBottom, safeTop: metrics.safeTop },
        pausePanel: bounds(controller.pauseContent),
        options: [...controller.bgmStyleOptions.values()].map((option) => ({
            id: option.track.id, bounds: bounds(option.root), touchHeight: option.touchArea.getComponent(cc.UITransform).contentSize.height,
        })) };
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, `${testCase.name}-pause-bgm.png`), fullPage: true });
    const within = (rect, metrics) => rect.left >= metrics.safeLeft - 0.5 && rect.right <= metrics.safeRight + 0.5
        && rect.bottom >= metrics.safeBottom - 0.5 && rect.top <= metrics.safeTop + 0.5;
    const checks = [
        { pass: levelState.pageLabel === '第2/2页' && levelState.visibleCards.map((card) => card.id).join(',') === '4,5,6',
            message: 'selected level 6 opens page 2 with exactly three cards', detail: levelState },
        { pass: within(levelState.panel, levelState.metrics) && levelState.visibleCards.every((card) => within(card.bounds, levelState.metrics)),
            message: 'level panel and visible cards remain in the logical safe area', detail: levelState },
        { pass: levelState.visibleCards.every((card) => card.touchHeight >= 44)
            && levelState.pageButtonHeights.every((height) => height >= 44)
            && levelState.actionButtonHeights.every((height) => height >= 44),
            message: 'card, page, and action touch targets are at least 44 logical pixels', detail: levelState },
        { pass: within(pauseState.pausePanel, pauseState.metrics) && pauseState.options.length === 2
            && pauseState.options.every((option) => option.touchHeight >= 44),
            message: 'pause panel exposes two BGM options with safe, mobile-sized touch targets', detail: pauseState },
        { pass: consoleProblems.length === 0 && requestFailures.length === 0,
            message: 'responsive runtime has no console or request failures', detail: { consoleProblems, requestFailures } },
    ];
    results.push({ testCase, passed: checks.every((entry) => entry.pass), checks, levelState, pauseState });
    await context.close();
}

const report = { generatedAt: new Date().toISOString(), previewUrl,
    passed: results.every((entry) => entry.passed), results };
fs.writeFileSync(path.join(outputDir, 'ui02_responsive_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, results: results.map((entry) => ({
    name: entry.testCase.name, passed: entry.passed,
    failed: entry.checks.filter((check) => !check.pass).map((check) => check.message),
})) }, null, 2));
await browser.close();
if (!report.passed) process.exitCode = 1;
