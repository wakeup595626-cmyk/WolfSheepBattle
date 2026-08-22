import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2]
    ?? 'release_evidence/v1.3.0-dev-polish07-ui17-card02/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8817';
const VERSION = 'v1.3.0-dev-polish07-ui17-card02';
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details) => checks.push({ passed: Boolean(passed), name, details });
const source = fs.readFileSync(path.join(ROOT, 'assets', 'scripts', 'GameController.ts'), 'utf8');
const artConfig = fs.readFileSync(path.join(ROOT, 'assets', 'scripts', 'art', 'ArtPilotConfig.ts'), 'utf8');
check(source.includes(`const GAME_VERSION = '${VERSION}';`)
    && source.includes(`const DEVELOPMENT_BATCH = '${VERSION}';`)
    && source.includes(`const REQUESTED_TASK_ID = '${VERSION}';`), 'static/version-identity');
check(source.includes("'UnitCardMainArt'") && source.includes('Sprite.Type.SIMPLE')
    && !source.includes("'UnitCardPortraitSprite'") && !source.includes("'UnitCardBackgroundSprite'")
    && !source.includes("'UnitCardDividers'") && !source.includes('ArtPilotResourceKey.UnitCardShell'),
    'static/legacy-nested-unit-card-nodes-removed');
check(source.includes('this.typeButtons.get(target)?.node')
    && source.includes('this.typeButtons.get(expected.type)?.node'), 'static/tutorial-targets-real-card-root');
check(['small', 'medium', 'large', 'giant'].every((type) =>
    artConfig.includes(`ui/unit_cards/${type}/unit_card_${type}_integrated_runtime_v02`))
    && artConfig.includes('pause_panel_leaf_free_runtime_v02')
    && artConfig.includes('button_secondary_compact_runtime_v02'), 'static/new-runtime-art-routes');

const progress = {
    schemaVersion: 7, highestUnlockedLevel: 6, completedLevels: [1, 2, 3, 4, 5], selectedLevelId: 6,
    specialRoadTutorialSeen: true, levelOneTutorialCompleted: true, levelOneTutorialVersion: 7,
    freezeUnlocked: true, selectedTactics: ['sprint', 'heal', 'shock'],
    selectedTacticsByLevel: { 4: ['heal', 'shock', 'freeze'], 5: ['sprint', 'heal', 'surge'],
        6: ['sprint', 'heal', 'supplyBoost'] }, levelFiveTutorialSeen: true, bestResultsByLevel: {},
};
const browserProblems = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

const openPage = async ({ width, height, capsule = false }) => {
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
        if (message.type() === 'error') problems.push({ type: 'console-error', text: message.text() });
    });
    page.on('requestfailed', (request) => problems.push({ type: 'request', url: request.url(),
        text: request.failure()?.errorText ?? 'unknown' }));
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(4500);
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

const startBattle = async (page) => {
    await inController(page, `async (c) => {
        c.currentLevel = 6; c.restartGame(); c.startPanel.active = false; c.activateBattle();
        await c.artResourceManager.preloadGroups(['battle-core']); c.applyPilotStaticArt();
        c.refreshLaneAxisLayout(); c.applyResponsiveUnitCardLayout(c.screenMetrics); c.refreshHud(); return true;
    }`);
    await page.waitForTimeout(1200);
};

const viewports = [
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: 'wide-1600x720', width: 1600, height: 720 },
    { name: 'phone-844x390', width: 844, height: 390 },
    { name: 'fullscreen-capsule-2400x1080', width: 2400, height: 1080, capsule: true },
];

for (const viewport of viewports) {
    const sample = await openPage(viewport);
    await startBattle(sample.page);
    const battle = await inController(sample.page, `(c, cc) => {
        const local = (node) => { const size = node.getComponent(cc.UITransform).contentSize;
            return { x: node.position.x, y: node.position.y, left: node.position.x - size.width / 2,
                right: node.position.x + size.width / 2, bottom: node.position.y - size.height / 2,
                top: node.position.y + size.height / 2, width: size.width, height: size.height }; };
        const world = (node) => { const box = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { left: box.x, right: box.x + box.width, bottom: box.y, top: box.y + box.height,
                width: box.width, height: box.height }; };
        c.playerEnergy = 1000; c.selectedSheepType = undefined; c.refreshUnitTypeButtons();
        const availableTexts = ['small','medium','large','giant'].map((type) => c.typeButtons.get(type).stateLabel.string);
        c.selectedSheepType = 'medium'; c.refreshUnitTypeButtons();
        const selectedText = c.typeButtons.get('medium').stateLabel.string;
        c.playerEnergy = 0; c.refreshUnitTypeButtons();
        const insufficientText = c.typeButtons.get('large').stateLabel.string;
        const selectedInsufficient = c.typeButtons.get('medium').stateLabel.string;
        const cards = ['small', 'medium', 'large', 'giant'].map((type) => {
            const view = c.typeButtons.get(type); const art = view.artSprite;
            const artSize = art.node.getComponent(cc.UITransform).contentSize;
            const sourceSize = art.spriteFrame.originalSize;
            return { type, card: local(view.node), world: world(view.node), text: local(view.label.node),
                state: local(view.stateLabel.node), label: view.label.string, stateText: view.stateLabel.string,
                fontSize: view.label.fontSize, lineHeight: view.label.lineHeight,
                children: view.node.children.map((node) => node.name), hasRootGraphics: !!view.node.getComponent(cc.Graphics),
                artName: art.spriteFrame.name, artType: art.type, artSize: { width: artSize.width, height: artSize.height },
                sourceSize: { width: sourceSize.width, height: sourceSize.height },
                selectionActive: view.artSelectionGraphics.node.active };
        });
        return { cards, availableTexts, selectedText, insufficientText, selectedInsufficient,
            firstLane: world(c.laneHitAreas[0].node), sidebar: world(c.unitCardSidebar) };
    }`);
    check(battle.cards.every((card) => Math.abs(card.card.width / card.card.height - 1030 / 450) < 0.0001
        && card.artSize.width === card.card.width && card.artSize.height === card.card.height
        && card.sourceSize.width === 1030 && card.sourceSize.height === 450),
        `cards/${viewport.name}/fixed-aspect-simple-main-art`, battle.cards);
    check(new Set(battle.cards.map((card) => card.artName)).size === 4
        && battle.cards.every((card) => card.children.join(',') === 'UnitCardMainArt,UnitCardSelection,Text,UnitCardState'
            && !card.hasRootGraphics && card.artType === 0),
        `cards/${viewport.name}/four-distinct-artworks-no-legacy-nodes`, battle.cards);
    check(battle.cards.every((card) => card.text.left > -card.card.width / 2 && card.text.right < card.state.left
        && card.state.right < card.card.width / 2 && card.text.bottom > -card.card.height / 2
        && card.text.top < card.card.height / 2
        && card.fontSize === battle.cards[0].fontSize && card.lineHeight === battle.cards[0].lineHeight),
        `cards/${viewport.name}/runtime-text-and-state-contained`, battle.cards);
    const localGap = battle.cards[0].card.bottom - battle.cards[1].card.top;
    check(localGap >= 8 && localGap <= 12 && battle.sidebar.right + 12 <= battle.firstLane.left,
        `cards/${viewport.name}/vertical-gap-and-first-lane-clearance`, { localGap, sidebar: battle.sidebar, lane: battle.firstLane });
    check(battle.availableTexts.every((text) => text === '可用') && battle.selectedText === '已选'
        && battle.insufficientText === '缺能' && battle.selectedInsufficient === '已选\n缺能',
        `cards/${viewport.name}/available-selected-insufficient-states`, battle);

    if (viewport.name === '1280x720') {
        await inController(sample.page, `(c) => { c.playerEnergy = 1000; c.selectedSheepType = undefined;
            c.refreshUnitTypeButtons(); }`);
        await sample.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-available.png'), fullPage: true });
        await inController(sample.page, `(c) => { c.selectedSheepType = 'large'; c.refreshUnitTypeButtons(); }`);
        await sample.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-selected.png'), fullPage: true });
        await inController(sample.page, `(c) => { c.playerEnergy = 0; c.refreshUnitTypeButtons(); }`);
        await sample.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-insufficient.png'), fullPage: true });
    } else {
        await sample.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}-battle.png`), fullPage: true });
    }

    const pause = await inController(sample.page, `async (c, cc) => {
        c.playerEnergy = 100; c.isStarted = true; c.isPaused = false;
        await c.preparePauseArt(); c.pauseGame(); await c.preparePauseArt();
        const local = (node) => { const size = node.getComponent(cc.UITransform).contentSize;
            return { x: node.position.x, y: node.position.y, left: node.position.x - size.width / 2,
                right: node.position.x + size.width / 2, bottom: node.position.y - size.height / 2,
                top: node.position.y + size.height / 2, width: size.width, height: size.height }; };
        const buttons = ['ResumeButton','PauseRestartButton','HelpButton','ReturnTitleButton'].map((name) => {
            const node = c.pauseContentRoot.getChildByName(name); const art = node.getChildByName('ButtonArt');
            return { name, ...local(node), artName: art?.getComponent(cc.Sprite)?.spriteFrame?.name ?? '',
                artSize: art ? local(art) : null }; });
        const selector = c.pauseContentRoot.getChildByName('BgmSelector');
        const music = local(c.musicVolumeControl.root); const sfx = local(c.sfxVolumeControl.root);
        const childCount = c.pauseContentRoot.children.length; c.resumeGame(); c.pauseGame();
        const reopenedChildCount = c.pauseContentRoot.children.length;
        return { buttons, selector: local(selector), music, sfx, childCount, reopenedChildCount,
            optionCount: c.bgmStyleOptions.size, panelArt: c.pauseContent.getChildByName('PausePanelArt')
                ?.getComponent(cc.Sprite)?.spriteFrame?.name ?? '' };
    }`);
    const horizontalGap = pause.buttons[1].left - pause.buttons[0].right;
    const verticalGap = pause.buttons[0].bottom - pause.buttons[2].top;
    const hintBottom = 204 - 12;
    const firstRowTop = pause.buttons[0].top;
    const selectorGap = pause.buttons[2].bottom - pause.selector.top;
    check(pause.buttons.every((button) => button.width === 196 && button.height === 96
        && button.artSize?.width === 196 && button.artSize?.height === 96
        && button.artName.includes('pause-action-button-compact'))
        && horizontalGap >= 20 && horizontalGap <= 28 && verticalGap >= 14 && verticalGap <= 20
        && hintBottom - firstRowTop >= 14 && hintBottom - firstRowTop <= 20
        && selectorGap >= 16 && selectorGap <= 22,
        `pause/${viewport.name}/compact-2x2-visible-button-group`,
        { buttons: pause.buttons, horizontalGap, verticalGap, hintGap: hintBottom - firstRowTop, selectorGap });
    const inner = { left: -228, right: 228, bottom: -294 };
    check(pause.music.left >= inner.left + 12 && pause.sfx.right <= inner.right - 12
        && pause.sfx.left - pause.music.right >= 10 && pause.sfx.left - pause.music.right <= 16
        && pause.music.bottom - inner.bottom >= 14 && pause.music.bottom - inner.bottom <= 20
        && pause.music.y === pause.sfx.y && pause.music.width === pause.sfx.width
        && pause.music.height === pause.sfx.height && pause.panelArt.includes('pause-panel'),
        `pause/${viewport.name}/audio-controls-contained-with-safe-margins`, { inner, music: pause.music, sfx: pause.sfx });
    check(pause.childCount === pause.reopenedChildCount && pause.optionCount === 2,
        `pause/${viewport.name}/reopen-does-not-duplicate-nodes`, pause);
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}-pause.png`), fullPage: true });

    if (viewport.name === '1280x720') {
        const interactions = await inController(sample.page, `(c) => {
            c.resumeGame(); c.playerEnergy = 1000; c.selectedSheepType = undefined; c.refreshUnitTypeButtons();
            const selected = []; for (const type of ['small','medium','large','giant']) {
                c.selectUnitType(type); selected.push(c.selectedSheepType); }
            c.selectUnitType('small'); c.playerSpawnCooldown = 0;
            const deployResults = [0,1,2,3].map((lane) => { c.playerSpawnCooldown = 0;
                return c.tryDeploySelectedUnit(lane); });
            c.playerSpawnCooldown = 0; const sameLaneFirst = c.tryDeploySelectedUnit(0);
            c.playerSpawnCooldown = 0; const sameLaneSecond = c.tryDeploySelectedUnit(0);
            const selectedAfterDeploy = c.selectedSheepType;
            const musicBefore = c.audioManager.getMusicVolume(); c.adjustAudioVolume('music', -5);
            const musicLower = c.audioManager.getMusicVolume(); c.adjustAudioVolume('music', 5);
            const musicRestored = c.audioManager.getMusicVolume();
            const sfxBefore = c.audioManager.getSfxVolume(); c.adjustAudioVolume('sfx', -5);
            const sfxLower = c.audioManager.getSfxVolume(); c.adjustAudioVolume('sfx', 5);
            const sfxRestored = c.audioManager.getSfxVolume();
            const originalBgm = c.audioManager.getSelectedBgmId();
            const alternate = c.audioManager.getAvailableBgmTracks().find((track) => track.id !== originalBgm);
            if (alternate) c.selectBgmStyleFromUi(alternate); const switchedBgm = c.audioManager.getSelectedBgmId();
            const original = c.audioManager.getAvailableBgmTracks().find((track) => track.id === originalBgm);
            if (original) c.selectBgmStyleFromUi(original); const restoredBgm = c.audioManager.getSelectedBgmId();
            c.pauseGame(); c.openHelpPanel(); const helpOpened = c.helpPanel.active; c.closeHelpPanel();
            const pauseRestored = c.pausePanel.active; c.resumeGame(); const resumed = !c.isPaused && !c.pausePanel.active;
            c.restartGame(); const restarted = c.isStarted && !c.isPaused && !c.isFinished;
            c.returnToTitle(); const returned = !c.isStarted && c.startPanel.active && !c.pausePanel.active;
            return { selected, deployResults, sameLaneFirst, sameLaneSecond, selectedAfterDeploy,
                musicBefore, musicLower, musicRestored, sfxBefore, sfxLower, sfxRestored,
                originalBgm, switchedBgm, restoredBgm, helpOpened, pauseRestored, resumed, restarted, returned };
        }`);
        check(interactions.selected.join(',') === 'small,medium,large,giant'
            && interactions.deployResults.every(Boolean) && interactions.sameLaneFirst && interactions.sameLaneSecond
            && interactions.selectedAfterDeploy === 'small', 'interaction/card-selection-four-lanes-and-repeat-deploy', interactions);
        check(interactions.musicLower < interactions.musicBefore
            && interactions.musicRestored === interactions.musicBefore
            && interactions.sfxLower < interactions.sfxBefore && interactions.sfxRestored === interactions.sfxBefore,
            'interaction/music-and-sfx-volume-adjust-and-restore', interactions);
        check(interactions.originalBgm !== interactions.switchedBgm && interactions.restoredBgm === interactions.originalBgm,
            'interaction/two-bgm-switch-and-restore', interactions);
        check(interactions.helpOpened && interactions.pauseRestored && interactions.resumed
            && interactions.restarted && interactions.returned, 'interaction/pause-actions-retain-function', interactions);
    }
    await sample.context.close();
}

await browser.close();
check(browserProblems.length === 0, 'browser/no-page-console-or-request-errors', browserProblems);
const report = { version: VERSION, previewUrl: PREVIEW_URL, generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.filter((item) => item.passed).length,
        failed: checks.filter((item) => !item.passed).length }, checks };
fs.writeFileSync(path.join(OUTPUT_DIR, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
for (const item of checks.filter((entry) => !entry.passed)) console.error(`FAIL ${item.name}`, item.details ?? '');
if (report.summary.failed > 0) process.exitCode = 1;
