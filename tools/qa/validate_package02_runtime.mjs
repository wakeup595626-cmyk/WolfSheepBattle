import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/package02/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7535';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
const check = (condition, message, detail = undefined) => {
    checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
};

let browser;
let fatalError;
const snapshots = {};
try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
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

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForFunction(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        if (!scene) return false;
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        return nodes.some((node) => node.components?.some((component) => component
            && component.startPanel && component.artLoadingPanel && component.artResourceManager));
    }, { timeout: 60000 });
    await page.waitForFunction(async () => {
        const cc = await System.import('cc');
        const scene = cc.director.getScene();
        if (!scene) return false;
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component
            && component.startPanel && component.artLoadingPanel && component.artResourceManager);
        return Boolean(controller?.startPanel.active && !controller?.artLoadingPanel.active);
    }, { timeout: 60000 });

    await page.evaluate(async () => {
        const cc = await System.import('cc');
        let scene = cc.director.getScene();
        for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            scene = cc.director.getScene();
        }
        if (!scene) throw new Error('runtime scene unavailable before loading screenshot');
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component
            && component.startPanel && component.artLoadingPanel && component.artResourceManager);
        controller.artLoadingPanel.active = true;
        controller.artLoadingPanel.getComponent(cc.UIOpacity).opacity = 255;
        controller.resetArtLoadingProgress();
    });
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(outputDir, 'package02_loading_1280x720.png') });

    snapshots.runtime = await page.evaluate(async () => {
        const cc = await System.import('cc');
        let scene = cc.director.getScene();
        for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            scene = cc.director.getScene();
        }
        if (!scene) throw new Error('runtime scene unavailable after readiness check');
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        const controller = nodes.flatMap((node) => node.components ?? []).find((component) => component
            && component.startPanel && component.artLoadingPanel && component.artResourceManager);
        if (!controller) throw new Error('GameController unavailable');

        const panel = controller.artLoadingPanel;
        panel.active = true;
        panel.getComponent(cc.UIOpacity).opacity = 255;
        controller.resetArtLoadingProgress();
        const content = panel.getChildByName('LoadingContentRoot');
        const describeMascot = (name) => {
            const node = content.getChildByName(name);
            const transform = node.getComponent(cc.UITransform);
            const frame = node.getComponent(cc.Sprite).spriteFrame;
            return {
                size: [transform.contentSize.width, transform.contentSize.height],
                originalSize: [frame.originalSize.width, frame.originalSize.height],
                textureSize: [frame.texture.width, frame.texture.height],
                scale: [node.scale.x, node.scale.y],
            };
        };
        const loading = {
            sheep: describeMascot('LoadingMascotSheep'),
            wolf: describeMascot('LoadingMascotWolf'),
            fontLoaded: Boolean(controller.loadingUiFont),
            progressText: controller.artLoadingLabel?.string,
            tipText: controller.artLoadingTipLabel?.string,
        };

        panel.active = false;
        controller.showLevelSelect();
        const levelSelections = [];
        for (let id = 1; id <= 5; id += 1) {
            controller.selectLevel(id);
            levelSelections.push({
                id,
                currentLevel: controller.currentLevel,
                panelActive: controller.levelSelectPanel.active,
                isStarted: controller.isStarted,
            });
        }
        controller.returnToStartPanel();

        await controller.artResourceManager.preloadGroups(['battle-core', 'unit-small', 'vfx-core']);
        controller.startPanel.active = false;
        controller.activateBattle();
        const battleStarted = controller.isStarted && !controller.isFinished;
        const tacticCount = [
            controller.playerSprintCard,
            controller.playerHealCard,
            controller.playerShockCard,
            controller.playerFreezeCard,
            controller.playerEnergySurgeCard,
        ].filter(Boolean).length;
        const tracks = controller.audioManager?.getAvailableBgmTracks?.() ?? [];
        controller.pauseGame();
        const paused = controller.isPaused && controller.pausePanel.active;
        controller.resumeGame();
        const resumed = !controller.isPaused && !controller.pausePanel.active;
        controller.finishGame(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const victoryVisible = controller.isFinished && controller.resultPanel.active;

        const bundleNames = [];
        cc.assetManager.bundles.forEach((bundle) => bundleNames.push(bundle.name));
        return {
            loading,
            levelSelections,
            battleStarted,
            tacticCount,
            audioTrackCount: tracks.length,
            paused,
            resumed,
            victoryVisible,
            bundles: bundleNames.sort(),
        };
    });

    await page.screenshot({ path: path.join(outputDir, 'package02_runtime_1280x720.png') });
    const loading = snapshots.runtime.loading;
    const mascotValid = (mascot) => mascot.originalSize[0] === 512 && mascot.originalSize[1] === 512
        && mascot.textureSize[0] === 512 && mascot.textureSize[1] === 512
        && mascot.size[0] === 236 && mascot.size[1] === 236
        && Math.abs(mascot.scale[0] - mascot.scale[1]) < 0.000001;
    check(mascotValid(loading.sheep) && mascotValid(loading.wolf),
        'loading mascots remain 512px assets at equal 236px display size', loading);
    check(loading.fontLoaded && loading.progressText?.length > 0 && loading.tipText?.length > 0,
        'loading font, progress text, and tip text remain available', loading);
    check(snapshots.runtime.levelSelections.every((entry) => entry.currentLevel === entry.id
        && entry.panelActive && !entry.isStarted),
    'all five level selections stay selectable without starting battle', snapshots.runtime.levelSelections);
    check(snapshots.runtime.battleStarted && snapshots.runtime.tacticCount >= 3,
        'battle and tactic UI initialize after optimized bundle loading', snapshots.runtime);
    check(snapshots.runtime.audioTrackCount === 2,
        'both configured BGM tracks remain registered', snapshots.runtime.audioTrackCount);
    check(snapshots.runtime.paused && snapshots.runtime.resumed,
        'pause and resume remain functional', snapshots.runtime);
    check(snapshots.runtime.victoryVisible,
        'victory result panel remains functional', snapshots.runtime);
    check(['art_battlefield', 'art_boot', 'art_ui', 'art_units', 'art_vfx'].every(
        (name) => snapshots.runtime.bundles.includes(name)),
    'all visual bundles loaded successfully', snapshots.runtime.bundles);

    const ignoredWarnings = /AudioContext was not allowed to start|Autoplay is only allowed|deoptimised the styling/i;
    const unexpectedConsole = consoleProblems.filter((entry) => !ignoredWarnings.test(entry.text));
    check(unexpectedConsole.length === 0, 'runtime console has no unexpected errors or warnings', unexpectedConsole);
    check(requestFailures.length === 0, 'runtime has no failed resource requests', requestFailures);
    check(response404s.length === 0, 'runtime has no resource 404 responses', response404s);
} catch (error) {
    fatalError = error instanceof Error ? error.stack ?? error.message : String(error);
    checks.push({ pass: false, message: 'runtime validation did not complete', detail: fatalError });
} finally {
    await browser?.close();
}

const report = {
    pass: !fatalError && checks.length > 0 && checks.every((entry) => entry.pass),
    fatalError,
    checks,
    snapshots,
    consoleProblems,
    requestFailures,
    response404s,
};
fs.writeFileSync(path.join(outputDir, 'package02_runtime_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
