import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2]
    ?? 'release_evidence/v1.3.0-dev-polish06-ui16/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8806';
const VERSION = 'v1.3.0-dev-polish06-ui16';
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (passed, name, details) => checks.push({ passed: Boolean(passed), name, details });
const source = fs.readFileSync(path.join(ROOT, 'assets', 'scripts', 'GameController.ts'), 'utf8');
const audioSource = fs.readFileSync(path.join(ROOT, 'assets', 'scripts', 'AudioManager.ts'), 'utf8');
check(source.includes(`const GAME_VERSION = '${VERSION}';`)
    && source.includes(`const DEVELOPMENT_BATCH = '${VERSION}';`)
    && source.includes(`const REQUESTED_TASK_ID = '${VERSION}';`), 'static/version-identity');
check(source.includes("'UnitCardDividers'") && source.includes('ArtPilotResourceKey.UnitCardShell')
    && !source.includes("'StatusBackground'") && !source.includes("'UnitCardPortraitBackdrop'"),
    'static/unit-card-redundant-frames-removed');
check(source.includes("new Node('FillClip')") && source.includes('fillMask.type = Mask.Type.GRAPHICS_RECT')
    && source.includes('trackGraphics.fillColor = new Color(66, 56, 46, 255)'),
    'static/shared-energy-mask-and-warm-track');
check(!source.includes("createLabel(root, 'Auxiliary'") && !source.includes("| 'BgmCardSource'")
    && audioSource.includes("auxiliaryName: 'Ear0 · 欢乐'")
    && audioSource.includes("auxiliaryName: 'Pixabay · Fun Game'"),
    'static/runtime-source-label-removed-license-metadata-retained');

const progress = {
    schemaVersion: 7, highestUnlockedLevel: 6, completedLevels: [1, 2, 3, 4, 5], selectedLevelId: 6,
    specialRoadTutorialSeen: true, levelOneTutorialCompleted: true, levelOneTutorialVersion: 7,
    freezeUnlocked: true, selectedTactics: ['sprint', 'heal', 'shock'],
    selectedTacticsByLevel: { 4: ['heal', 'shock', 'freeze'], 5: ['sprint', 'heal', 'surge'],
        6: ['sprint', 'heal', 'supplyBoost'] }, levelFiveTutorialSeen: true, bestResultsByLevel: {},
};
const browserProblems = [];
const browser = await chromium.launch({ headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });

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
    { name: 'fullscreen-capsule-2400x1080', width: 2400, height: 1080, capsule: true },
];

for (const viewport of viewports) {
    const sample = await openPage(viewport);
    await startBattle(sample.page);
    const battle = await inController(sample.page, `(c, cc) => {
        const rect = (node) => { const box = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { left: box.x, right: box.x + box.width, bottom: box.y, top: box.y + box.height,
                width: box.width, height: box.height }; };
        const cards = ['small', 'medium', 'large', 'giant'].map((type) => {
            const view = c.typeButtons.get(type); const sourceSize = view.portraitFrame.originalSize;
            const portraitSize = view.portraitSprite.node.getComponent(cc.UITransform).contentSize;
            return { type, card: rect(view.node), portrait: rect(view.portraitSprite.node), text: rect(view.label.node),
                state: rect(view.stateLabel.node), badge: rect(view.tierBadgeNode), label: view.label.string,
                fontSize: view.label.fontSize, lineHeight: view.label.lineHeight, stateText: view.stateLabel.string,
                portraitScale: view.portraitUniformScale, sourceAspect: sourceSize.width / sourceSize.height,
                displayAspect: portraitSize.width / portraitSize.height,
                children: view.node.children.map((node) => node.name), selectionActive: view.artSelectionGraphics.node.active };
        });
        c.selectedSheepType = 'giant'; c.playerEnergy = 40; c.refreshUnitTypeButtons();
        const selected = c.typeButtons.get('giant');
        const ratios = [0, 1, 25, 40, 50, 75, 99, 100].map((value) => {
            c.aiEnergy = value; c.snapEnergyBarsToCurrentValues();
            return { value, scale: c.aiEnergyBar.fillNode.scale.x, active: c.aiEnergyBar.fillNode.active };
        });
        const energy = (bar) => ({ root: bar.node.getComponent(cc.UITransform).contentSize,
            track: bar.trackNode.getComponent(cc.UITransform).contentSize,
            clip: bar.fillClipNode.getComponent(cc.UITransform).contentSize,
            fill: bar.fillNode.getComponent(cc.UITransform).contentSize,
            fillParent: bar.fillNode.parent.name, hasMask: !!bar.fillClipNode.getComponent(cc.Mask),
            children: bar.node.children.map((node) => node.name) });
        return { cards, selected: { stateText: selected.stateLabel.string,
            selectionActive: selected.artSelectionGraphics.node.active }, ratios,
            playerEnergy: energy(c.playerEnergyBar), aiEnergy: energy(c.aiEnergyBar),
            firstLane: rect(c.laneHitAreas[0].node), unitSidebar: rect(c.unitCardSidebar) };
    }`);
    check(battle.cards.every((card) => card.card.height === 90 && card.card.width === battle.cards[0].card.width),
        `cards/${viewport.name}/equal-outer-size`, battle.cards);
    check(battle.cards.every((card) => !card.children.includes('StatusBackground')
        && !card.children.includes('UnitCardPortraitBackdrop') && card.children.includes('UnitCardDividers')
        && card.children.filter((name) => name === 'TierBadge').length === 1),
        `cards/${viewport.name}/single-shell-single-badge`, battle.cards);
    check(battle.cards.every((card) => card.portrait.left >= card.card.left && card.portrait.right <= card.card.right
        && card.text.left >= card.portrait.right && card.state.left >= card.text.right
        && Math.abs(card.sourceAspect - card.displayAspect) < 0.0001 && card.portraitScale > 0
        && card.fontSize === 16 && card.lineHeight === 21),
        `cards/${viewport.name}/contained-proportional-three-zone-layout`, battle.cards);
    check(battle.unitSidebar.right + 12 <= battle.firstLane.left,
        `cards/${viewport.name}/first-lane-clearance`, { sidebar: battle.unitSidebar, lane: battle.firstLane });
    check(battle.selected.stateText === '已选\n缺能' && battle.selected.selectionActive,
        `cards/${viewport.name}/selected-insufficient-combined-state`, battle.selected);
    const energyGeometry = (bar) => ({ root: bar.root, track: bar.track, clip: bar.clip, fill: bar.fill,
        fillParent: bar.fillParent, hasMask: bar.hasMask,
        structuralChildren: bar.children.filter((name) => !name.includes('LevelFiveEnergyFx')) });
    check(JSON.stringify(energyGeometry(battle.playerEnergy)) === JSON.stringify(energyGeometry(battle.aiEnergy))
        && battle.aiEnergy.hasMask && battle.aiEnergy.fillParent === 'FillClip',
        `energy/${viewport.name}/identical-node-geometry`, { player: battle.playerEnergy, ai: battle.aiEnergy });
    check(battle.ratios.every((item) => Math.abs(item.scale - item.value / 100) < 0.0001
        && item.active === (item.value > 0)), `energy/${viewport.name}/exact-0-to-100-mapping`, battle.ratios);
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}-battle.png`), fullPage: true });

    const pause = await inController(sample.page, `async (c, cc) => {
        c.aiEnergy = 40; c.snapEnergyBarsToCurrentValues(); c.isStarted = true; c.isPaused = false;
        await c.preparePauseArt(); c.pauseGame(); await c.preparePauseArt();
        const local = (node) => { const size = node.getComponent(cc.UITransform).contentSize;
            return { x: node.position.x, y: node.position.y, left: node.position.x - size.width / 2,
                right: node.position.x + size.width / 2, bottom: node.position.y - size.height / 2,
                top: node.position.y + size.height / 2, width: size.width, height: size.height }; };
        const names = ['ResumeButton','PauseRestartButton','HelpButton','ReturnTitleButton'];
        const buttons = names.map((name) => { const node = c.pauseContentRoot.getChildByName(name);
            return { name, ...local(node), art: node.getChildByName('ButtonArt')?.getComponent(cc.Sprite)?.spriteFrame?.name ?? '' }; });
        const selector = c.pauseContentRoot.getChildByName('BgmSelector');
        const cards = Array.from(c.bgmStyleOptions.values()).map((option) => ({
            name: option.root.name, ...local(option.root), title: option.titleLabel.string,
            subtitle: option.subtitleLabel.string, status: option.statusLabel.string,
            children: option.root.children.map((node) => node.name) }));
        const title = local(c.pauseContentRoot.getChildByName('PauseTitle'));
        const hint = local(c.pauseContentRoot.getChildByName('PauseHint'));
        const music = local(c.musicVolumeControl.root); const sfx = local(c.sfxVolumeControl.root);
        const childCount = c.pauseContentRoot.children.length; c.resumeGame(); c.pauseGame();
        const reopenedChildCount = c.pauseContentRoot.children.length;
        return { panel: local(c.pauseContent), title, hint, buttons, selector: local(selector), cards,
            music, sfx, childCount, reopenedChildCount, optionCount: c.bgmStyleOptions.size,
            panelChildren: c.pauseContent.children.map((node) => node.name) };
    }`);
    const panelInnerTop = pause.panel.height / 2 - 58 * pause.panel.height / 768;
    const titleInset = panelInnerTop - pause.title.top;
    check(titleInset >= 18 && titleInset <= 28 && pause.title.bottom - pause.hint.top >= 8
        && pause.title.bottom - pause.hint.top <= 12,
        `pause/${viewport.name}/header-inside-formal-panel`, { titleInset, title: pause.title, hint: pause.hint });
    check(pause.buttons.every((button) => button.width === 196 && button.height === 96
        && button.art === pause.buttons[0].art && button.art.length > 0)
        && pause.buttons[1].left - pause.buttons[0].right === 20
        && pause.buttons[2].top - pause.buttons[0].bottom === -14,
        `pause/${viewport.name}/equal-tall-action-buttons`, pause.buttons);
    check(pause.cards.length === 2 && pause.cards.every((card) => card.width === 400 && card.height === 60
        && !card.children.includes('Auxiliary')) && pause.cards[0].bottom - pause.cards[1].top === 14,
        `pause/${viewport.name}/two-line-bgm-cards-no-source-node`, pause.cards);
    check(pause.cards[0].title === '轻松欢快'
        && pause.cards[0].subtitle === '温暖、治愈、轻松的草原旋律'
        && pause.cards[1].title === '热血对战'
        && pause.cards[1].subtitle === '节奏明快、适合激烈对抗',
        `pause/${viewport.name}/final-bgm-copy`, pause.cards);
    check(pause.music.y === -253 && pause.sfx.y === -253 && pause.music.width === pause.sfx.width
        && pause.music.height === pause.sfx.height && pause.music.y - (-186) === -67,
        `pause/${viewport.name}/volume-controls-aligned-and-lowered`, { music: pause.music, sfx: pause.sfx });
    check(pause.childCount === pause.reopenedChildCount && pause.optionCount === 2,
        `pause/${viewport.name}/reopen-does-not-duplicate-nodes`, pause);
    check(pause.panelChildren.includes('PausePanelArt'),
        `pause/${viewport.name}/formal-panel-art-loaded`, pause.panelChildren);
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, `${viewport.name}-pause.png`), fullPage: true });

    if (viewport.name === '1280x720') {
        const interactions = await inController(sample.page, `(c) => {
            c.resumeGame(); c.playerEnergy = 1000; c.selectedSheepType = undefined; c.refreshUnitTypeButtons();
            const selected = []; for (const type of ['small','medium','large','giant']) {
                c.selectUnitType(type); selected.push(c.selectedSheepType); }
            c.selectUnitType('giant'); const repeated = c.selectedSheepType;
            c.selectUnitType('small');
            const deployResults = [0, 1, 2, 3].map((lane) => c.tryDeploySelectedUnit(lane));
            const selectedAfterDeploy = c.selectedSheepType;
            const beforeMusic = c.audioManager.getMusicVolume(); c.adjustAudioVolume('music', -5);
            const loweredMusic = c.audioManager.getMusicVolume(); c.adjustAudioVolume('music', 5);
            const restoredMusic = c.audioManager.getMusicVolume();
            const savedAudioSettings = Object.fromEntries(Object.keys(localStorage)
                .filter((key) => key.toLowerCase().includes('audio'))
                .map((key) => [key, localStorage.getItem(key)]));
            const originalBgm = c.audioManager.getSelectedBgmId();
            const alternateBgm = c.audioManager.getAvailableBgmTracks().find((track) => track.id !== originalBgm);
            if (alternateBgm) c.selectBgmStyleFromUi(alternateBgm);
            const switchedBgm = c.audioManager.getSelectedBgmId();
            const switchedStatuses = Array.from(c.bgmStyleOptions.values()).map((option) => ({
                id: option.track.id, status: option.statusLabel.string, selected: option.checkNode.active,
            }));
            const originalTrack = c.audioManager.getAvailableBgmTracks().find((track) => track.id === originalBgm);
            if (originalTrack) c.selectBgmStyleFromUi(originalTrack);
            const restoredBgm = c.audioManager.getSelectedBgmId();
            c.pauseGame(); c.openHelpPanel(); const helpOpened = c.helpPanel.active; c.closeHelpPanel();
            const pauseRestored = c.pausePanel.active; c.resumeGame();
            const resumed = !c.isPaused && !c.pausePanel.active;
            c.restartGame(); const restarted = c.isStarted && !c.isPaused && !c.isFinished && !c.pausePanel.active;
            c.returnToTitle(); const returnedToTitle = !c.isStarted && c.startPanel.active
                && !c.pausePanel.active && !c.pauseButton.node.active;
            return { selected, repeated, deployResults, selectedAfterDeploy,
                beforeMusic, loweredMusic, restoredMusic, savedAudioSettings,
                originalBgm, switchedBgm, switchedStatuses, restoredBgm,
                helpOpened, pauseRestored, resumed, restarted, returnedToTitle };
        }`);
        check(interactions.selected.join(',') === 'small,medium,large,giant' && interactions.repeated === 'giant',
            'interaction/four-card-single-selection-and-repeat-lock', interactions);
        check(interactions.loweredMusic < interactions.beforeMusic
            && Math.abs(interactions.restoredMusic - interactions.beforeMusic) < 0.001,
            'interaction/music-volume-adjust-and-restore', interactions);
        check(interactions.deployResults.every(Boolean) && interactions.selectedAfterDeploy === 'small',
            'interaction/real-deployment-path-all-four-lanes-selection-persists', interactions);
        check(interactions.originalBgm !== interactions.switchedBgm
            && interactions.switchedStatuses.filter((entry) => entry.selected).length === 1
            && interactions.switchedStatuses.find((entry) => entry.selected)?.id === interactions.switchedBgm
            && interactions.restoredBgm === interactions.originalBgm,
            'interaction/bgm-switch-status-and-restore', interactions);
        check(Object.keys(interactions.savedAudioSettings).length > 0,
            'interaction/audio-settings-persisted-to-local-storage', interactions.savedAudioSettings);
        check(interactions.helpOpened && interactions.pauseRestored && interactions.resumed,
            'interaction/pause-help-close-resume', interactions);
        check(interactions.restarted && interactions.returnedToTitle,
            'interaction/restart-and-return-to-title', interactions);
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
