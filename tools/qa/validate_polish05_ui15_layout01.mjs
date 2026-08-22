import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2]
    ?? 'release_evidence/v1.3.0-dev-polish05-ui15-layout01/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8795';
const VERSION = 'v1.3.0-dev-polish05-ui15-layout01';
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details) => checks.push({ passed: Boolean(passed), name, details });
const source = fs.readFileSync(path.join(ROOT, 'assets', 'scripts', 'GameController.ts'), 'utf8');
check(source.includes(`const GAME_VERSION = '${VERSION}';`)
    && source.includes(`const DEVELOPMENT_BATCH = '${VERSION}';`)
    && source.includes(`const REQUESTED_TASK_ID = '${VERSION}';`), 'static/version-identity');
check(source.includes('const BATTLEFIELD_OFFSET_X = 80;')
    && source.includes('+ BATTLEFIELD_OFFSET_X;')
    && source.includes('const BATTLEFIELD_CONTENT_CENTER_X = BATTLEFIELD_CENTER_X + BATTLEFIELD_OFFSET_X;'),
    'static/single-battlefield-offset-source');
check(source.includes('const FUNCTION_SIDEBAR_WIDTH = 198;')
    && source.includes('const TACTIC_CARD_HEIGHT = 116;'), 'static/tactic-sidebar-reduced-within-target-range');
check(source.includes('const UNIT_CARD_HEIGHT = 90;')
    && source.includes('const UNIT_CARD_GAP = 10;')
    && source.includes('const UNIT_CARD_PORTRAIT_RATIO = 0.4;')
    && source.includes('const UNIT_CARD_TEXT_RATIO = 0.32;')
    && source.includes('const UNIT_CARD_LABEL_FONT_SIZE = 16;'), 'static/wide-card-three-zone-layout');
check(source.includes('FormalBattleBackgroundEdgeFill')
    && source.includes('this.battleBackgroundEdgeFillSlot.setScale(-1, 1, 1);'),
    'static/integrated-background-edge-fill');
check(source.includes('this.laneEffectVisuals[lane]?.setPosition(laneX, LANE_MID_Y, 0);')
    && source.includes('this.getLaneCenterX(lane), y, 118, 12'), 'static/lane-effects-follow-shared-axis');
check(source.includes('this.getLevelOneTutorialTargetRect(button.node)')
    && source.includes('this.getLevelOneTutorialTargetRect(this.laneSpawnMarkers[lane].node)')
    && source.includes('this.getLevelOneTutorialTargetRect(node)'), 'static/tutorial-targets-derived-from-live-nodes');

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

const openPage = async ({ width, height, capsule = false, progress = baseProgress }) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, deviceScaleFactor: 1 });
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
    page.on('console', (message) => {
        if (message.type() === 'error' || (message.type() === 'warning'
            && message.text().includes('[TacticCardBounds]'))) {
            problems.push({ type: `console-${message.type()}`, text: message.text() });
        }
    });
    page.on('requestfailed', (request) => problems.push({ type: 'request', url: request.url(),
        text: request.failure()?.errorText ?? 'unknown' }));
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(4200);
    browserProblems.push(...problems.map((item) => ({ ...item, viewport: `${width}x${height}` })));
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
    { name: 'wide-1600x720', width: 1600, height: 720 },
    { name: 'fullscreen-capsule-2400x1080', width: 2400, height: 1080, capsule: true },
];

for (const viewport of viewports) {
    const sample = await openPage(viewport);
    await inController(sample.page, `async (c) => {
        c.currentLevel = 6; c.restartGame(); c.startPanel.active = false; c.activateBattle();
        await c.artResourceManager.preloadGroups(['battle-core']); c.applyPilotStaticArt();
        c.refreshLaneAxisLayout(); c.applyResponsiveUnitCardLayout(c.screenMetrics); return true;
    }`);
    await sample.page.waitForTimeout(1600);
    const layout = await inController(sample.page, `(c, cc) => {
        const worldRect = (node) => { const box = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { left: box.x, right: box.x + box.width, bottom: box.y, top: box.y + box.height,
                width: box.width, height: box.height }; };
        const localRect = (node) => { const size = node.getComponent(cc.UITransform).contentSize;
            return { left: node.position.x - size.width / 2, right: node.position.x + size.width / 2,
                bottom: node.position.y - size.height / 2, top: node.position.y + size.height / 2,
                width: size.width, height: size.height }; };
        const cards = ['small', 'medium', 'large', 'giant'].map((type) => {
            const view = c.typeButtons.get(type); const portraitSize = view.portraitSprite.node.getComponent(cc.UITransform).contentSize;
            const sourceSize = view.portraitFrame.originalSize;
            return { type, card: worldRect(view.node), portrait: worldRect(view.portraitSprite.node),
                text: worldRect(view.label.node), status: worldRect(view.statusBackgroundNode), label: view.label.string,
                fontSize: view.label.fontSize, lineHeight: view.label.lineHeight,
                sourceAspect: sourceSize.width / sourceSize.height,
                displayAspect: portraitSize.width / portraitSize.height,
                portraitScale: view.portraitUniformScale, portraitScaleNode: [view.portraitSprite.node.scale.x,
                    view.portraitSprite.node.scale.y], cardSpriteType: view.artSprite.type };
        });
        const sidebar = localRect(c.rightControlBar);
        const unitSidebar = localRect(c.unitCardSidebar);
        const tactics = ['sprint', 'heal', 'supplyBoost'].map((kind) => {
            const card = c.getTacticCard(kind); return { kind, active: card.node.active,
                size: card.node.getComponent(cc.UITransform).contentSize, root: worldRect(card.node),
                title: card.titleLabel.string, condition: card.conditionLabel.string,
                effect: card.effectLabel.string, cost: card.costLabel.string,
                meta: card.metaLabel.string, state: card.stateLabel.string,
                violations: c.validateTacticCardTextBounds(card, false),
                titleRect: worldRect(card.titleLabel.node), textCell: worldRect(card.textCellNode),
                stateRect: worldRect(card.stateLabel.node), stateCell: worldRect(card.stateCellNode) }; });
        const ratios = [305.5, 574.5, 845, 1115.5].map((pixelX) => pixelX / 1600 - 0.5);
        const lanes = [0, 1, 2, 3].map((lane) => {
            const laneX = c.getLaneCenterX(lane); const aiRoot = c.aiSpawnGateSlots[lane];
            const aiVisual = c.aiSpawnGateSprites[lane]?.node;
            const playerRoot = c.laneSpawnMarkers[lane].node;
            const playerVisual = c.playerSpawnGateRoots[lane]?.getChildByName('GateVisual');
            const roadVisualX = c.battleBackgroundSlot.position.x + ratios[lane] * c.screenMetrics.visibleWidth;
            return { lane: lane + 1, laneX, roadVisualX, anchorX: c.laneCenterAnchors[lane].position.x,
                aiGateX: aiRoot.position.x + (aiVisual?.position.x ?? 0) - 0.375 * 72 / 128,
                aiSpawnLogicX: laneX, aiGateY: aiRoot.position.y,
                playerGateX: playerRoot.position.x + (playerVisual?.position.x ?? 0),
                playerSpawnLogicX: laneX, playerGateY: playerRoot.position.y,
                supplyX: c.supplyPoints[lane].node.position.x, supplyY: c.supplyPoints[lane].node.position.y,
                hitX: c.laneHitAreas[lane].node.position.x, hit: localRect(c.laneHitAreas[lane].node),
                laneNumberX: c.laneVisualsLayer.getChildByName('LaneNumber' + (lane + 1)).position.x,
                laneEffectX: c.laneEffectVisuals[lane].position.x,
                freezeHighlightX: c.freezeLaneHighlightNodes[lane].position.x };
        });
        const firstHit = lanes[0].hit; const fourthHit = lanes[3].hit;
        const errors = lanes.flatMap((lane) => [lane.roadVisualX, lane.anchorX, lane.aiGateX,
            lane.aiSpawnLogicX, lane.playerGateX, lane.playerSpawnLogicX, lane.supplyX, lane.hitX,
            lane.laneNumberX, lane.laneEffectX, lane.freezeHighlightX].map((x) => Math.abs(x - lane.laneX)));
        const background = { positionX: c.battleBackgroundSlot.position.x,
            size: c.battleBackgroundSlot.getComponent(cc.UITransform).contentSize,
            edgePositionX: c.battleBackgroundEdgeFillSlot.position.x,
            edgeScaleX: c.battleBackgroundEdgeFillSlot.scale.x,
            edgeActive: c.battleBackgroundEdgeFillSlot.active };
        return { visible: c.screenMetrics, cards, unitSidebar, sidebar, tactics, lanes,
            gaps: { leftToBattle: firstHit.left - unitSidebar.right,
                battleToRight: sidebar.left - fourthHit.right }, maxAxisError: Math.max(...errors),
            laneSpacings: lanes.slice(1).map((lane, index) => lane.laneX - lanes[index].laneX),
            pauseSize: c.pauseButton.node.getComponent(cc.UITransform).contentSize,
            pauseY: c.pauseButton.node.position.y, background,
            statusToastX: c.statusToast.position.x, freezeCancelX: c.freezeSelectionCancelButton.node.position.x,
            spriteSliced: cc.Sprite.Type.SLICED };
    }`);
    const expectedWidth = layout.visible.visibleWidth <= 1280.1 ? 206 : 240;
    check(layout.cards.every((card) => Math.abs(card.card.width - expectedWidth) < 1
        && Math.abs(card.card.height - 90) < 0.1), `layout/${viewport.name}/wide-equal-unit-cards`, layout.cards);
    check(layout.cards.every((card) => card.fontSize === 16 && card.lineHeight === 21
        && Math.abs(card.portraitScaleNode[0] - card.portraitScaleNode[1]) < 0.0001
        && card.portraitScale > 0 && Math.abs(card.sourceAspect - card.displayAspect) < 0.0001
        && card.cardSpriteType === layout.spriteSliced), `layout/${viewport.name}/card-content-proportional`, layout.cards);
    check(layout.cards.every((card) => card.text.left - card.portrait.right >= 5.9
        && card.status.left - card.text.right >= 5.9
        && card.portrait.left >= card.card.left - 0.1 && card.status.right <= card.card.right + 0.1),
    `layout/${viewport.name}/card-three-zones-no-overlap`, layout.cards);
    check(layout.gaps.leftToBattle >= 12 && layout.gaps.battleToRight >= 12,
        `layout/${viewport.name}/three-columns-12px-clearance`, layout.gaps);
    check(layout.sidebar.width === 198 && layout.tactics.every((card) => card.active
        && card.size.width === 198 && card.size.height === 116 && card.root.width >= 197.9),
    `layout/${viewport.name}/compact-readable-tactic-column`, layout.tactics);
    check(layout.tactics.every((card) => card.title && card.condition && card.effect && card.cost && card.meta && card.state
        && card.violations.length === 0
        && card.titleRect.left >= card.textCell.left - 0.1 && card.titleRect.right <= card.textCell.right + 0.1
        && card.stateRect.left >= card.stateCell.left - 0.1 && card.stateRect.right <= card.stateCell.right + 0.1),
    `layout/${viewport.name}/tactic-copy-inside-cells`, layout.tactics);
    check(layout.maxAxisError <= 1 && layout.laneSpacings.every((spacing) => spacing > 0)
        && Math.max(...layout.laneSpacings) - Math.min(...layout.laneSpacings) <= 2,
    `axis/${viewport.name}/visual-logic-error-at-most-1px`, { maxAxisError: layout.maxAxisError,
        spacings: layout.laneSpacings, lanes: layout.lanes });
    check(layout.background.positionX === 80 && layout.background.edgeScaleX === -1
        && layout.background.edgeActive && layout.background.size.width === layout.visible.visibleWidth,
    `background/${viewport.name}/translated-without-exposed-edge`, layout.background);
    check(layout.pauseSize.width === 198 && layout.pauseSize.height === 54
        && (!viewport.capsule || layout.pauseY + 27 <= layout.visible.capsule.bottom),
    `hud/${viewport.name}/pause-safe-and-aligned`, { pause: layout.pauseSize, y: layout.pauseY,
        capsule: layout.visible.capsule });
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}-layout.png`), fullPage: true });

    if (viewport.name === '1280x720') {
        const setup = await inController(sample.page, `(c, cc) => {
            c.selectedSheepType = undefined; c.playerEnergy = 1000; c.playerSupply = 100;
            c.playerSpawnCooldown = 0; c.playerSprintCooldown = 0; c.playerSprintRemaining = 0;
            c.refreshUnitTypeButtons(); c.refreshTacticCards(true);
            const pos = (node) => ({ x: node.worldPosition.x, y: node.worldPosition.y });
            return { visible: cc.view.getVisibleSize(), cards: ['small','medium','large','giant']
                .map((kind) => pos(c.typeButtons.get(kind).node)), lanes: [0, 3].map((lane) => pos(c.laneHitAreas[lane].node)),
                sprint: pos(c.playerSprintCard.node), pause: pos(c.pauseButton.node), beforeUnits: c.units.length };
        }`);
        const canvas = await sample.page.locator('canvas').boundingBox();
        const toPage = ({ x, y }) => ({ x: canvas.x + x / setup.visible.width * canvas.width,
            y: canvas.y + (setup.visible.height - y) / setup.visible.height * canvas.height });
        const selected = [];
        for (const point of setup.cards) {
            const pagePoint = toPage(point); await sample.page.touchscreen.tap(pagePoint.x, pagePoint.y);
            selected.push(await inController(sample.page, `(c) => c.selectedSheepType`));
        }
        const giantPoint = toPage(setup.cards[3]); await sample.page.touchscreen.tap(giantPoint.x, giantPoint.y);
        const repeated = await inController(sample.page, `(c) => c.selectedSheepType`);
        check(selected.join(',') === 'small,medium,large,giant' && repeated === 'giant',
            'interaction/four-card-selection-and-repeat-lock', { selected, repeated });
        await inController(sample.page, `(c) => { c.selectedSheepType = 'small'; c.playerEnergy = 1000;
            c.playerSpawnCooldown = 0; c.refreshUnitTypeButtons(); return c.units.length; }`);
        for (const point of setup.lanes) {
            const pagePoint = toPage(point); await sample.page.touchscreen.tap(pagePoint.x, pagePoint.y);
            await sample.page.waitForTimeout(120);
            await inController(sample.page, `(c) => { c.playerSpawnCooldown = 0; c.playerEnergy = 1000; return true; }`);
        }
        const deploy = await inController(sample.page, `(c) => ({ selected: c.selectedSheepType,
            lanes: c.units.filter((unit) => unit.team === 0).map((unit) => unit.lane), count: c.units.length })`);
        check(deploy.selected === 'small' && deploy.lanes.includes(0) && deploy.lanes.includes(3)
            && deploy.count >= setup.beforeUnits + 2, 'interaction/first-and-fourth-lane-touch', deploy);
        const sprintPoint = toPage(setup.sprint); await sample.page.touchscreen.tap(sprintPoint.x, sprintPoint.y);
        await sample.page.waitForTimeout(100);
        const sprint = await inController(sample.page, `(c) => ({ remaining: c.playerSprintRemaining,
            cooldown: c.playerSprintCooldown, supply: c.playerSupply })`);
        check(sprint.remaining > 0 && sprint.cooldown > 0 && sprint.supply < 100,
            'interaction/tactic-card-use-after-compaction', sprint);
        const pausePoint = toPage(setup.pause); await sample.page.touchscreen.tap(pausePoint.x, pausePoint.y);
        await sample.page.waitForTimeout(100);
        const paused = await inController(sample.page, `(c) => ({ paused: c.isPaused, panel: c.pausePanel.active,
            resume: c.pauseContentRoot.getChildByName('ResumeButton').worldPosition })`);
        const resumePoint = toPage(paused.resume); await sample.page.touchscreen.tap(resumePoint.x, resumePoint.y);
        await sample.page.waitForTimeout(100);
        const resumed = await inController(sample.page, `(c) => ({ paused: c.isPaused, panel: c.pausePanel.active })`);
        check(paused.paused && paused.panel && !resumed.paused && !resumed.panel,
            'interaction/pause-and-resume', { paused, resumed });
        const tacticDecks = await inController(sample.page, `(c) => {
            const result = []; const all = ['sprint','heal','shock','freeze','surge','supplyBoost'];
            const decks = { 4: ['heal','shock','freeze'], 5: ['sprint','heal','surge'],
                6: ['sprint','heal','supplyBoost'] };
            for (const level of [4, 5, 6]) {
                c.currentLevel = level; c.selectedTactics = [...decks[level]];
                c.applyCurrentTacticDeckLayout(); c.refreshTacticCards(true);
                result.push({ level, cards: all.map((kind) => { const card = c.getTacticCard(kind); return {
                    kind, active: card.node.active, title: card.titleLabel.string, condition: card.conditionLabel.string,
                    effect: card.effectLabel.string, cost: card.costLabel.string, meta: card.metaLabel.string,
                    state: card.stateLabel.string, violations: c.validateTacticCardTextBounds(card, false) }; }) });
            }
            return result;
        }`);
        const visibleTactics = tacticDecks.flatMap((deck) => deck.cards.filter((card) => card.active));
        check(new Set(visibleTactics.map((card) => card.kind)).size === 6
            && visibleTactics.every((card) => card.title && card.condition && card.effect && card.cost
                && card.meta && card.state && card.violations.length === 0),
            'interaction/all-six-tactics-display-without-overflow', tacticDecks);
        await sample.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-interactions.png'), fullPage: true });
    }
    await sample.context.close();
}

const tutorialProgress = { ...baseProgress, highestUnlockedLevel: 1, completedLevels: [], selectedLevelId: 1,
    levelOneTutorialCompleted: false, levelOneTutorialVersion: 6 };
const tutorial = await openPage({ width: 1280, height: 720, progress: tutorialProgress });
const tutorialResult = await inController(tutorial.page, `async (c) => {
    c.currentLevel = 1; c.restartGame(); c.startPanel.active = false; c.activateBattle();
    await c.artResourceManager.preloadGroups(['battle-core']); c.applyPilotStaticArt();
    c.cleanupLevelOneTutorial(false); c.beginLevelOneTutorial();
    const same = (a, b) => ['x','y','width','height'].every((key) => Math.abs(a[key] - b[key]) < 0.1);
    c.tutorialProgress = 'deploy-four-sheep'; c.tutorialVisiblePage = 1; c.tutorialHighestViewedPage = 1;
    c.tutorialDeploymentIndex = 3; c.selectedSheepType = undefined; c.refreshLevelOneTutorialPresentation();
    const cardTarget = c.tutorialTargetRects[0]; const cardExpected = c.getLevelOneTutorialTargetRect(c.typeButtons.get('giant').node);
    const laneTarget = c.tutorialTargetRects[1]; const laneExpected = c.getLevelOneTutorialTargetRect(c.laneSpawnMarkers[3].node);
    c.tutorialVisiblePage = 2; c.tutorialHighestViewedPage = 2; c.tutorialDeploymentLane = 0;
    c.tutorialProgress = 'capture-supply'; c.refreshLevelOneTutorialPresentation();
    const supplyTarget = c.tutorialTargetRects[0]; const supplyExpected = c.getLevelOneTutorialTargetRect(c.supplyPoints[0].node);
    return { card: same(cardTarget, cardExpected), lane: same(laneTarget, laneExpected),
        supply: same(supplyTarget, supplyExpected), cardTarget, laneTarget, supplyTarget };
}`);
check(tutorialResult.card && tutorialResult.lane && tutorialResult.supply,
    'tutorial/card-road-and-supply-highlights-follow-live-layout', tutorialResult);
await tutorial.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-tutorial-supply-highlight.png'), fullPage: true });
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
