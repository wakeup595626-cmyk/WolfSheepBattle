import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/loading-hd-01/screenshots/runtime');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7482';
const baselineUrl = process.argv[4] ?? 'http://127.0.0.1:7481';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
const snapshots = { baseline: undefined, dpr: {} };
const check = (condition, message, detail = undefined) => {
    checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
};

const waitForController = async (page) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
        const ready = await page.evaluate(async () => {
            const cc = await System.import('cc');
            const scene = cc.director.getScene();
            if (!scene) return false;
            const nodes = [];
            const visit = (node) => {
                nodes.push(node);
                for (const child of node.children) visit(child);
            };
            visit(scene);
            return nodes.some((node) => node.components.some((component) => component
                && component.artLoadingPanel && component.startPanel
                && typeof component.resetArtLoadingProgress === 'function'));
        });
        if (ready) return;
        await page.waitForTimeout(80);
    }
    throw new Error('GameController loading panel was not available.');
};

const forceLoadingPanelAndRead = async (page) => page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        for (const child of node.children) visit(child);
    };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components).find((component) => component
        && component.artLoadingPanel && component.startPanel
        && typeof component.resetArtLoadingProgress === 'function');
    if (!controller) throw new Error('GameController was unavailable.');
    const panel = controller.artLoadingPanel;
    panel.active = true;
    panel.getComponent(cc.UIOpacity).opacity = 255;
    controller.resetArtLoadingProgress();
    const content = panel.getChildByName('LoadingContentRoot');
    const describeMascot = (name) => {
        const node = content.getChildByName(name);
        const transform = node.getComponent(cc.UITransform);
        const sprite = node.getComponent(cc.Sprite);
        const frame = sprite.spriteFrame;
        return {
            active: node.active,
            scale: [node.scale.x, node.scale.y, node.scale.z],
            position: [node.position.x, node.position.y],
            size: [transform.contentSize.width, transform.contentSize.height],
            originalSize: [frame.originalSize.width, frame.originalSize.height],
            rect: [frame.rect.width, frame.rect.height],
            textureSize: [frame.texture.width, frame.texture.height],
            spriteFrameName: frame.name,
        };
    };
    return {
        sheep: describeMascot('LoadingMascotSheep'),
        wolf: describeMascot('LoadingMascotWolf'),
        stageExists: !!content.getChildByName('LoadingMascotStage'),
        shadows: {
            sheep: content.getChildByName('LoadingSheepShadow')?.position.y,
            wolf: content.getChildByName('LoadingWolfShadow')?.position.y,
        },
        progressText: controller.artLoadingLabel?.string,
        tipText: controller.artLoadingTipLabel?.string,
    };
});

let browser;
let fatalError;
try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const capture = async (url, deviceScaleFactor, filename) => {
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor });
        page.on('console', (message) => {
            if (message.type() === 'error' || message.type() === 'warning') {
                consoleProblems.push({ url, type: message.type(), text: message.text() });
            }
        });
        page.on('pageerror', (error) => consoleProblems.push({ url, type: 'pageerror', text: error.message }));
        page.on('requestfailed', (request) => requestFailures.push({ url: request.url(), failure: request.failure()?.errorText ?? 'unknown' }));
        page.on('response', (response) => { if (response.status() === 404) response404s.push(response.url()); });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('canvas', { timeout: 30000 });
        await waitForController(page);
        const snapshot = await forceLoadingPanelAndRead(page);
        await page.waitForTimeout(120);
        await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
        await page.close();
        return snapshot;
    };
    snapshots.baseline = await capture(baselineUrl, 1, 'loading_before_1280x720_dpr1.png');
    for (const dpr of [1, 2, 3]) {
        snapshots.dpr[dpr] = await capture(previewUrl, dpr, `loading_after_1280x720_dpr${dpr}.png`);
    }

    // Loading mascots keep the existing subtle, uniform breathing tween.  Verify
    // that it remains proportional instead of incorrectly requiring scale === 1
    // at an arbitrary animation sample.
    const isHdAndSquare = (mascot) => mascot.active
        && mascot.originalSize[0] === 512 && mascot.originalSize[1] === 512
        && mascot.textureSize[0] === 512 && mascot.textureSize[1] === 512
        && mascot.size[0] === 236 && mascot.size[1] === 236
        && mascot.scale[0] > 0 && mascot.scale[1] > 0
        && Math.abs(mascot.scale[0] - mascot.scale[1]) < 0.000001;
    const after = snapshots.dpr[1];
    check(snapshots.baseline.sheep.originalSize[0] === 256 && snapshots.baseline.wolf.originalSize[0] === 256,
        'baseline loading mascots were the prior 256px assets', snapshots.baseline);
    check(isHdAndSquare(after.sheep) && isHdAndSquare(after.wolf),
        'loading uses two 512px high-definition SpriteFrames at equal 236px display sizes', after);
    check(!after.stageExists && after.shadows.sheep === -75 && after.shadows.wolf === -75,
        'large translucent mascot stage is removed while soft aligned shadows remain', after);
    check(Object.values(snapshots.dpr).every((snapshot) => isHdAndSquare(snapshot.sheep)
        && isHdAndSquare(snapshot.wolf) && !snapshot.stageExists),
    'DPR 1, 2, and 3 keep the same non-distorted high-definition loading layout', snapshots.dpr);
    check(typeof after.progressText === 'string' && after.progressText.length > 0
        && typeof after.tipText === 'string' && after.tipText.length > 0,
    'loading progress and tip text remain present', { progressText: after.progressText, tipText: after.tipText });
    check(consoleProblems.length === 0, 'runtime console has no errors or warnings', consoleProblems);
    check(requestFailures.length === 0, 'runtime has no failed requests', requestFailures);
    check(response404s.length === 0, 'runtime has no resource 404 responses', response404s);
} catch (error) {
    fatalError = error instanceof Error ? error.stack ?? error.message : String(error);
    checks.push({ pass: false, message: 'runtime validation did not complete', detail: fatalError });
} finally {
    if (browser) await browser.close();
}

const report = {
    passed: !fatalError && checks.every((entry) => entry.pass),
    fatalError,
    checks,
    snapshots,
    consoleProblems,
    requestFailures,
    response404s,
};
fs.writeFileSync(path.join(outputDir, 'loading_hd_01_runtime_audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
