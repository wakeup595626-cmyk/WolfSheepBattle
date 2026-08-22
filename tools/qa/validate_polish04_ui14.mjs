import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-polish04-ui14/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8794';
const VERSION = 'v1.3.0-dev-polish04-ui14';
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details) => checks.push({ passed: Boolean(passed), name, details });
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const source = read('assets', 'scripts', 'GameController.ts');

check(source.includes(`const GAME_VERSION = '${VERSION}';`)
    && source.includes(`const DEVELOPMENT_BATCH = '${VERSION}';`)
    && source.includes(`const REQUESTED_TASK_ID = '${VERSION}';`), 'static/version-identity');
check(source.includes('const UNIT_CARD_HEIGHT = 90;')
    && source.includes('const UNIT_CARD_GAP = 10;')
    && source.includes('const UNIT_CARD_PORTRAIT_RATIO = 0.42;')
    && source.includes('const UNIT_CARD_TEXT_RATIO = 0.28;'), 'static/card-height-gap-and-three-zones');
check(source.includes('button.label.fontSize = UNIT_CARD_LABEL_FONT_SIZE;')
    && source.includes('const UNIT_CARD_LABEL_FONT_SIZE = 15;')
    && source.includes('const UNIT_CARD_LABEL_LINE_HEIGHT = 20;')
    && source.includes('button.label.overflow = Label.Overflow.CLAMP;')
    && source.includes('`${tier.displayName.sheep}\\n${definition.cost}\\n\\u80FD\\u91CF`'),
    'static/three-line-fixed-copy-no-shrink');
check(source.includes('Math.min(availableWidth / sourceSize.width, availableHeight / sourceSize.height)')
    && source.includes("'UnitCardPortraitSprite'")
    && source.includes('button.portraitSprite.type = Sprite.Type.SIMPLE;')
    && source.includes('UNIT_CARD_ART_SLICE_INSET'), 'static/proportional-portrait-and-sliced-frame');
check(source.includes('this.getLevelOneTutorialTargetRect(button.node)')
    && source.includes('this.tutorialTargetRects.push(...targetRects);'), 'static/tutorial-highlight-derived-from-card-node');

const cardFiles = ['small', 'medium', 'large', 'giant'].map((type) => path.join(
    ROOT, 'assets', 'bundles', 'art_units', 'ui', 'unit_cards', type, `unit_card_${type}_runtime_v01.png`));
const pngInfo = cardFiles.map((file) => {
    const data = fs.readFileSync(file);
    return { file: path.relative(ROOT, file), width: data.readUInt32BE(16), height: data.readUInt32BE(20),
        bitDepth: data[24], colorType: data[25], bytes: data.length,
        sha256: crypto.createHash('sha256').update(data).digest('hex') };
});
check(pngInfo.every((item) => item.width === 768 && [461, 462].includes(item.height)
    && item.bitDepth === 8 && item.colorType === 6 && item.bytes > 100000),
    'art/original-four-rgba-pngs-retained', pngInfo);
const importInfo = cardFiles.map((file) => {
    const meta = JSON.parse(fs.readFileSync(`${file}.meta`, 'utf8'));
    const texture = Object.values(meta.subMetas).find((item) => item.importer === 'texture');
    const frame = Object.values(meta.subMetas).find((item) => item.importer === 'sprite-frame');
    return { file: path.relative(ROOT, `${file}.meta`), hasAlpha: meta.userData?.hasAlpha,
        minfilter: texture?.userData?.minfilter, magfilter: texture?.userData?.magfilter,
        mipfilter: texture?.userData?.mipfilter, rawWidth: frame?.userData?.rawWidth,
        rawHeight: frame?.userData?.rawHeight, rotated: frame?.userData?.rotated };
});
check(importInfo.every((item) => item.hasAlpha === true && item.minfilter === 'linear'
    && item.magfilter === 'linear' && item.mipfilter === 'none' && item.rawWidth === 768
    && [461, 462].includes(item.rawHeight) && item.rotated === false),
    'art/texture-import-settings-retained', importInfo);

const baseProgress = {
    schemaVersion: 7, highestUnlockedLevel: 6, completedLevels: [1, 2, 3, 4, 5], selectedLevelId: 6,
    specialRoadTutorialSeen: true, levelOneTutorialCompleted: true, levelOneTutorialVersion: 7,
    freezeUnlocked: true, selectedTactics: ['sprint', 'heal', 'shock'],
    selectedTacticsByLevel: { 4: ['heal', 'shock', 'freeze'], 5: ['sprint', 'heal', 'surge'],
        6: ['sprint', 'heal', 'supplyBoost'] }, levelFiveTutorialSeen: true, bestResultsByLevel: {},
};
const browserProblems = [];
const browser = await chromium.launch({ headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });

const openPage = async ({ viewport, capsule = false, progress = baseProgress } = {}) => {
    const context = await browser.newContext({ viewport: viewport ?? { width: 1280, height: 720 },
        hasTouch: true, deviceScaleFactor: 1 });
    await context.addInitScript(({ key, value, mockCapsule }) => {
        localStorage.clear();
        localStorage.setItem(key, JSON.stringify(value));
        if (mockCapsule) globalThis.wx = {
            getWindowInfo: () => ({ windowWidth: innerWidth, windowHeight: innerHeight }),
            getSystemInfoSync: () => ({ windowWidth: innerWidth, windowHeight: innerHeight }),
            getMenuButtonBoundingClientRect: () => ({ left: innerWidth - 136, right: innerWidth - 20,
                top: 12, bottom: 52, width: 116, height: 40 }),
        };
    }, { key: PROGRESS_KEY, value: progress, mockCapsule: capsule });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => { if (message.type() === 'error') problems.push({ type: 'console', text: message.text() }); });
    page.on('requestfailed', (request) => problems.push({ type: 'request', url: request.url(),
        text: request.failure()?.errorText ?? 'unknown' }));
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(4200);
    browserProblems.push(...problems.map((item) => ({ ...item, viewport })));
    return { context, page };
};

const inController = async (page, callbackSource) => page.evaluate(async (body) => {
    const cc = await System.import('cc');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(cc.director.getScene());
    const c = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && component.typeButtons instanceof Map);
    if (!c) throw new Error('GameController not found');
    return Function('c', 'cc', `return (${body})(c, cc);`)(c, cc);
}, callbackSource);

const viewports = [
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: 'wide-2560x1080', width: 2560, height: 1080 },
    { name: 'fullscreen-capsule-2844x1280', width: 2844, height: 1280, capsule: true },
];

for (const viewport of viewports) {
    const sample = await openPage({ viewport, capsule: viewport.capsule });
    await inController(sample.page, `async (c) => {
        c.currentLevel = 6; c.restartGame(); c.startPanel.active = false; c.activateBattle();
        await c.artResourceManager.preloadGroups(['battle-core']); c.applyPilotStaticArt(); return true;
    }`);
    await sample.page.waitForTimeout(1800);
    const layout = await inController(sample.page, `(c, cc) => {
        const rect = (node) => { const box = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { left: box.x, right: box.x + box.width, bottom: box.y, top: box.y + box.height,
                width: box.width, height: box.height }; };
        const cards = ['small', 'medium', 'large', 'giant'].map((type) => {
            const view = c.typeButtons.get(type); const portraitSize = view.portraitSprite.node.getComponent(cc.UITransform).contentSize;
            const sourceSize = view.portraitFrame.originalSize; const cardRect = rect(view.node);
            const portraitRect = rect(view.portraitSprite.node); const textRect = rect(view.label.node);
            const statusRect = rect(view.statusBackgroundNode);
            return { type, cardRect, portraitRect, textRect, statusRect, label: view.label.string,
                fontSize: view.label.fontSize, lineHeight: view.label.lineHeight, overflow: view.label.overflow,
                wrap: view.label.enableWrapText, backgroundType: view.artSprite.type,
                portraitType: view.portraitSprite.type, portraitScale: view.portraitUniformScale,
                sourceAspect: sourceSize.width / sourceSize.height, displayAspect: portraitSize.width / portraitSize.height,
                backdropActive: view.portraitBackdropNode.active, portraitActive: view.portraitSprite.node.active,
                state: view.stateLabel.string };
        });
        return { cards, gaps: cards.slice(1).map((card, index) => cards[index].cardRect.bottom - card.cardRect.top),
            spriteSliced: cc.Sprite.Type.SLICED, spriteSimple: cc.Sprite.Type.SIMPLE, clamp: cc.Label.Overflow.CLAMP,
            visible: cc.view.getVisibleSize(), capsule: c.screenMetrics.capsule };
    }`);
    const copy = { small: '小羊\n12\n能量', medium: '中羊\n24\n能量', large: '大羊\n42\n能量', giant: '巨羊\n70\n能量' };
    check(layout.cards.every((card) => Math.abs(card.cardRect.height - 90) < 0.1)
        && layout.gaps.every((gap) => Math.abs(gap - 10) < 0.1),
        `layout/${viewport.name}/four-cards-90-high-10-gap`, layout);
    check(layout.cards.every((card) => card.label === copy[card.type] && card.fontSize === 15
        && card.lineHeight === 20 && card.overflow === layout.clamp && !card.wrap),
        `layout/${viewport.name}/fixed-three-line-copy`, layout.cards);
    check(layout.cards.every((card) => card.backgroundType === layout.spriteSliced
        && card.portraitType === layout.spriteSimple && card.backdropActive && card.portraitActive
        && card.portraitScale > 0 && Math.abs(card.sourceAspect - card.displayAspect) < 0.0001),
        `layout/${viewport.name}/portrait-uniform-scale-no-deformation`, layout.cards);
    check(layout.cards.every((card) => card.textRect.left - card.portraitRect.right >= 5.9
        && card.statusRect.left - card.textRect.right >= 5.9
        && card.portraitRect.left >= card.cardRect.left - 0.1 && card.statusRect.right <= card.cardRect.right + 0.1),
        `layout/${viewport.name}/portrait-text-status-no-overlap`, layout.cards);
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}-cards.png`), fullPage: true });

    if (viewport.name === '1280x720') {
        const tapSetup = await inController(sample.page, `(c, cc) => {
            c.selectedSheepType = undefined; c.playerEnergy = 100; c.playerSpawnCooldown = 0; c.refreshUnitTypeButtons();
            const visible = cc.view.getVisibleSize(); const card = c.typeButtons.get('small').node.worldPosition;
            const lane = c.laneSpawnMarkers[0].node.worldPosition;
            return { visible, card: { x: card.x, y: card.y }, lane: { x: lane.x, y: lane.y },
                beforeUnits: c.units.filter((unit) => unit.team === 0).length };
        }`);
        const canvas = await sample.page.locator('canvas').boundingBox();
        const toPage = (x, y) => ({ x: canvas.x + x / tapSetup.visible.width * canvas.width,
            y: canvas.y + (tapSetup.visible.height - y) / tapSetup.visible.height * canvas.height });
        const cardPoint = toPage(tapSetup.card.x, tapSetup.card.y);
        await sample.page.touchscreen.tap(cardPoint.x, cardPoint.y);
        await sample.page.touchscreen.tap(cardPoint.x, cardPoint.y);
        const repeated = await inController(sample.page, `(c) => c.selectedSheepType`);
        await inController(sample.page, `(c) => { c.playerSpawnCooldown = 0; c.playerEnergy = 100; return true; }`);
        const lanePoint = toPage(tapSetup.lane.x, tapSetup.lane.y);
        await sample.page.touchscreen.tap(lanePoint.x, lanePoint.y);
        await sample.page.waitForTimeout(200);
        const deployed = await inController(sample.page, `(c) => { const card = c.typeButtons.get('small'); return {
            selected: c.selectedSheepType, units: c.units.filter((unit) => unit.team === 0).length,
            state: card.stateLabel.string, selectionActive: card.artSelectionGraphics.node.active }; }`);
        check(repeated === 'small' && deployed.selected === 'small' && deployed.units === tapSetup.beforeUnits + 1
            && deployed.state === '已选' && deployed.selectionActive,
            'interaction/full-card-repeat-selection-and-first-lane-touch', { tapSetup, repeated, deployed });
        await sample.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-selected-card.png'), fullPage: true });
    }
    await sample.context.close();
}

const tutorialProgress = { ...baseProgress, highestUnlockedLevel: 1, completedLevels: [], selectedLevelId: 1,
    levelOneTutorialCompleted: false, levelOneTutorialVersion: 6 };
const tutorial = await openPage({ progress: tutorialProgress });
const tutorialResult = await inController(tutorial.page, `async (c, cc) => {
    c.currentLevel = 1; c.restartGame(); c.startPanel.active = false; c.activateBattle();
    await c.artResourceManager.preloadGroups(['battle-core']); c.applyPilotStaticArt();
    c.cleanupLevelOneTutorial(false); c.beginLevelOneTutorial();
    c.tutorialProgress = 'deploy-four-sheep'; c.tutorialVisiblePage = 1; c.tutorialHighestViewedPage = 1;
    c.tutorialDeploymentIndex = 0; c.selectedSheepType = undefined; c.refreshLevelOneTutorialPresentation();
    const target = c.tutorialTargetRects[0]; const expected = c.getLevelOneTutorialTargetRect(c.typeButtons.get('small').node);
    const pointer = c.getLevelOneTutorialPointerTarget(target.x + target.width / 2, target.y + target.height / 2);
    return { target: { x: target.x, y: target.y, width: target.width, height: target.height },
        expected: { x: expected.x, y: expected.y, width: expected.width, height: expected.height }, pointer,
        count: c.tutorialTargetRects.length };
}`);
check(tutorialResult.count === 2 && tutorialResult.pointer === 'small'
    && ['x', 'y', 'width', 'height'].every((key) => Math.abs(tutorialResult.target[key] - tutorialResult.expected[key]) < 0.1)
    && Math.abs(tutorialResult.target.height - 90) < 0.1,
    'tutorial/highlight-and-touch-region-follow-90px-card', tutorialResult);
await tutorial.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-tutorial-card-highlight.png'), fullPage: true });
await tutorial.context.close();

await browser.close();
check(browserProblems.length === 0, 'browser/no-page-console-or-request-errors', browserProblems);
const report = { version: VERSION, previewUrl: PREVIEW_URL, generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.filter((item) => item.passed).length,
        failed: checks.filter((item) => !item.passed).length }, checks };
fs.writeFileSync(path.join(OUTPUT_DIR, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
for (const item of checks.filter((entry) => !entry.passed)) console.error(`FAIL ${item.name}`, item.details ?? '');
if (report.summary.failed > 0) process.exitCode = 1;
