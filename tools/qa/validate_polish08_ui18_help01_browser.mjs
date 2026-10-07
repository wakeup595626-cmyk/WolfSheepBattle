import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2]
    ?? 'release_evidence/v1.3.0-dev-polish08-ui18-help01/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:8818';
const VERSION = 'v1.3.0-dev-polish08-ui18-help01';
const PROGRESS_KEY = 'wolf-sheep-battle.progress.v2';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const progress = {
    schemaVersion: 7,
    highestUnlockedLevel: 6,
    completedLevels: [1, 2, 3, 4, 5],
    selectedLevelId: 6,
    specialRoadTutorialSeen: true,
    levelOneTutorialCompleted: true,
    levelOneTutorialVersion: 7,
    freezeUnlocked: true,
    selectedTactics: ['sprint', 'heal', 'shock'],
    selectedTacticsByLevel: {
        4: ['heal', 'shock', 'freeze'],
        5: ['sprint', 'heal', 'surge'],
        6: ['sprint', 'heal', 'supplyBoost'],
    },
    levelFiveTutorialSeen: true,
    bestResultsByLevel: {},
};
const checks = [];
const browserProblems = [];
const check = (passed, name, details = undefined) => checks.push({ passed: Boolean(passed), name, details });
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
            getMenuButtonBoundingClientRect: () => ({
                left: innerWidth - 136,
                right: innerWidth - 20,
                top: 12,
                bottom: 52,
                width: 116,
                height: 40,
            }),
        };
    }, { key: PROGRESS_KEY, value: progress, mockCapsule: capsule });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
        if (message.type() === 'error') problems.push({ type: 'console-error', text: message.text() });
    });
    page.on('requestfailed', (request) => problems.push({
        type: 'request',
        url: request.url(),
        text: request.failure()?.errorText ?? 'unknown',
    }));
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

const startBattle = async (page, level = 6) => {
    await inController(page, `async (c) => {
        c.currentLevel = ${level};
        c.restartGame();
        c.startPanel.active = false;
        c.activateBattle();
        await c.artResourceManager.preloadGroups(['battle-core', 'pause']);
        c.applyPilotStaticArt();
        c.refreshLaneAxisLayout();
        c.applyResponsiveUnitCardLayout(c.screenMetrics);
        c.refreshHud();
        return true;
    }`);
    await page.waitForTimeout(1200);
};

const sample = await openPage({ width: 1280, height: 720 });
await startBattle(sample.page, 6);
const deployed = await inController(sample.page, `(c) => {
    c.playerEnergy = 1000;
    const results = [];
    for (const [lane, type] of ['small', 'medium', 'large', 'giant'].entries()) {
        c.selectUnitType(type);
        c.playerSpawnCooldown = 0;
        results.push({ lane, type, accepted: c.tryDeploySelectedUnit(lane) });
    }
    c.refreshUnitTypeButtons();
    return results;
}`);
await sample.page.waitForTimeout(900);
const colorEvidence = await inController(sample.page, `(c) => {
    const expected = { small: [74,177,238], medium: [54,190,134], large: [161,99,224], giant: [239,174,47] };
    const rgba = (color) => [color.r, color.g, color.b, color.a];
    const cards = [...c.typeButtons.entries()].map(([type, view]) => ({
        type,
        accent: rgba(view.tierAccentGraphics.strokeColor),
        state: view.stateLabel.string,
        children: view.node.children.map((node) => node.name),
    }));
    const units = c.units.map((unit) => ({
        team: unit.team,
        type: unit.definition.type,
        lane: unit.lane,
        badgeFill: rgba(unit.tierBadgeGraphics.fillColor),
        badgeText: unit.tierBadgeLabel.string,
    }));
    return { expected, cards, units };
}`);
check(deployed.every((item) => item.accepted), 'battle/four-types-deployed-through-real-paths', deployed);
check(colorEvidence.cards.every((card) => card.accent.slice(0, 3).join(',')
    === colorEvidence.expected[card.type].join(','))
    && colorEvidence.units.length >= 4
    && ['small', 'medium', 'large', 'giant'].every((type) => colorEvidence.units.some((unit) =>
        unit.type === type && unit.badgeFill.slice(0, 3).join(',') === colorEvidence.expected[type].join(','))),
    'battle/card-and-health-badge-rgb-match-at-runtime', colorEvidence);
check(colorEvidence.cards.every((card) => card.children.includes('UnitCardTierAccent')
    && card.children.includes('UnitCardMainArt') && card.children.includes('UnitCardSelection')),
    'battle/accent-layer-preserves-formal-card-and-selection-layers', colorEvidence.cards);
await sample.page.screenshot({
    path: path.join(OUTPUT_DIR, '1280x720-battle-four-types-four-lanes.png'),
    fullPage: true,
});

const pauseSnapshot = async (trackId, fileName) => {
    const result = await inController(sample.page, `async (c, cc) => {
        if (!c.isPaused) c.pauseGame();
        await c.preparePauseArt();
        const track = c.audioManager.getAvailableBgmTracks().find((item) => item.id === '${trackId}');
        if (track) c.selectBgmStyleFromUi(track);
        c.refreshBgmTrackSelector();
        const local = (node) => { const size = node.getComponent(cc.UITransform).contentSize; return {
            x: node.position.x, y: node.position.y, width: size.width, height: size.height,
            left: node.position.x - size.width / 2, right: node.position.x + size.width / 2,
            bottom: node.position.y - size.height / 2, top: node.position.y + size.height / 2 }; };
        const options = [...c.bgmStyleOptions.values()].map((option) => ({
            id: option.track.id,
            selected: option.checkNode.active,
            root: local(option.root),
            title: { ...local(option.titleLabel.node), text: option.titleLabel.string,
                fontSize: option.titleLabel.fontSize, lineHeight: option.titleLabel.lineHeight,
                overflow: option.titleLabel.overflow },
            body: { ...local(option.subtitleLabel.node), text: option.subtitleLabel.string,
                fontSize: option.subtitleLabel.fontSize, lineHeight: option.subtitleLabel.lineHeight,
                overflow: option.subtitleLabel.overflow },
            status: { ...local(option.statusLabel.node), text: option.statusLabel.string,
                fontSize: option.statusLabel.fontSize, lineHeight: option.statusLabel.lineHeight,
                overflow: option.statusLabel.overflow },
            check: local(option.checkNode),
        }));
        return { selectedId: c.audioManager.getSelectedBgmId(), options,
            overflowClamp: cc.Label.Overflow.CLAMP,
            panelArt: c.pauseContent.getChildByName('PausePanelArt')?.getComponent(cc.Sprite)?.spriteFrame?.name ?? '',
            panelChildren: c.pausePanel.children.map((node) => node.name) };
    }`);
    await sample.page.waitForTimeout(300);
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage: true });
    return result;
};
const cheerfulPause = await pauseSnapshot('cheerful_lighthearted', '1280x720-pause-cheerful-selected.png');
const cyberPause = await pauseSnapshot('cyberwave_upbeat', '1280x720-pause-cyberwave-selected.png');
for (const [name, pause] of [['cheerful', cheerfulPause], ['cyberwave', cyberPause]]) {
    const [first, second] = pause.options;
    check(pause.selectedId === (name === 'cheerful' ? 'cheerful_lighthearted' : 'cyberwave_upbeat')
        && pause.options.filter((option) => option.selected).length === 1
        && first.root.width === second.root.width && first.root.height === second.root.height
        && first.title.fontSize === second.title.fontSize && first.title.lineHeight === second.title.lineHeight
        && first.body.fontSize === second.body.fontSize && first.body.lineHeight === second.body.lineHeight
        && first.status.fontSize === second.status.fontSize && first.status.lineHeight === second.status.lineHeight,
        `pause/${name}/two-card-typography-and-layout-identical`, pause);
    check(pause.options.every((option) => option.title.left > -148 && option.title.right < 112
        && option.body.left > -148 && option.body.right < 112
        && option.status.left >= 112 && option.status.right < 194
        && option.check.right <= 192 && option.check.top <= 28
        && option.title.overflow === pause.overflowClamp
        && option.body.overflow === pause.overflowClamp
        && option.status.overflow === pause.overflowClamp),
        `pause/${name}/text-and-check-contained`, pause.options);
}

const captureHelp = async (level, fileName) => {
    const result = await inController(sample.page, `(c, cc) => {
        c.currentLevel = ${level};
        c.refreshBattleLevelBadge();
        if (!c.isPaused) c.pauseGame();
        c.openHelpPanel();
        const sizeOf = (node) => { const size = node.getComponent(cc.UITransform).contentSize; return {
            x: node.position.x, y: node.position.y, width: size.width, height: size.height,
            left: node.position.x - size.width / 2, right: node.position.x + size.width / 2,
            bottom: node.position.y - size.height / 2, top: node.position.y + size.height / 2 }; };
        const tierCards = ['small','medium','large','giant'].map((type) => {
            const node = c.helpContentRoot.getChildByName('TierLegend' + type);
            return { type, ...sizeOf(node), children: node.children.map((child) => child.name) }; });
        return { level: c.currentLevel, paused: c.isPaused, helpActive: c.helpPanel.active,
            pauseActive: c.pausePanel.active, text: c.helpTextLabel.string,
            textBox: sizeOf(c.helpTextLabel.node), fontSize: c.helpTextLabel.fontSize,
            lineHeight: c.helpTextLabel.lineHeight, replayActive: c.replayLevelOneTutorialButton.node.active,
            back: sizeOf(c.helpBackButton.node), tierCards,
            panelArt: c.helpContent.getChildByName('HelpPanelArt')?.getComponent(cc.Sprite)?.spriteFrame?.name ?? '' };
    }`);
    await sample.page.waitForTimeout(300);
    await sample.page.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage: true });
    return result;
};
const level1Help = await captureHelp(1, '1280x720-help-level1.png');
check(level1Help.paused && level1Help.helpActive && !level1Help.pauseActive
    && level1Help.replayActive && level1Help.back.x === 145 && level1Help.panelArt.includes('level-select-panel'),
    'help/level1-replay-visible-and-battle-remains-paused', level1Help);
const level6Help = await captureHelp(6, '1280x720-help-level6.png');
check(level6Help.paused && level6Help.helpActive && !level6Help.pauseActive
    && !level6Help.replayActive && level6Help.back.x === 0
    && level6Help.text.includes('黄金补给线12秒首次出现')
    && level6Help.text.includes('补给强化：下一次黄金占领与守点奖励各额外+1。')
    && level6Help.fontSize === 17 && level6Help.lineHeight === 21,
    'help/level6-long-copy-complete-and-back-centered', level6Help);
check(level6Help.tierCards.every((card) => card.width === 326 && card.height === 74
    && card.children.includes('TierBadge') && card.children.includes('TierName')
    && card.children.includes('Description'))
    && new Set(level6Help.tierCards.map((card) => `${card.width}x${card.height}`)).size === 1,
    'help/four-tier-cards-equal-and-structured', level6Help.tierCards);
const confirmVisual = await inController(sample.page, `(c, cc) => {
    c.currentLevel = 1; c.refreshBattleLevelBadge(); c.refreshHelpText(); c.refreshLevelOneTutorialReplayButton();
    if (!c.helpPanel.active) c.openHelpPanel(); c.requestLevelOneTutorialReplay();
    return { active: c.replayLevelOneTutorialConfirmPanel.active,
        panelArt: c.replayLevelOneTutorialConfirmContent.getChildByName('ReplayTutorialConfirmPanelArt')
            ?.getComponent(cc.Sprite)?.spriteFrame?.name ?? '',
        cancelButton: !!c.replayLevelOneTutorialConfirmContent.getChildByName('ReplayTutorialCancelButton'),
        confirmButton: !!c.replayLevelOneTutorialConfirmContent.getChildByName('ReplayTutorialConfirmButton') };
}`);
await sample.page.waitForTimeout(200);
await sample.page.screenshot({ path: path.join(OUTPUT_DIR, '1280x720-help-replay-confirm.png'), fullPage: true });
check(confirmVisual.active && confirmVisual.panelArt.includes('level-select-panel')
    && confirmVisual.cancelButton && confirmVisual.confirmButton,
    'help/replay-confirm-uses-formal-paper-art-and-two-actions', confirmVisual);
const helpInteraction = await inController(sample.page, `(c) => {
    const confirmOpened = c.replayLevelOneTutorialConfirmPanel.active;
    c.cancelLevelOneTutorialReplay(); const cancelReturned = c.helpPanel.active && c.isPaused;
    c.closeHelpPanel(); const returnedToPause = c.pausePanel.active && c.isPaused;
    c.openHelpPanel(); c.requestLevelOneTutorialReplay(); c.confirmLevelOneTutorialReplay();
    return { confirmOpened, cancelReturned, returnedToPause,
        confirmRestartedTutorial: c.tutorialFlowActive && !c.isPaused && !c.helpPanel.active
            && !c.replayLevelOneTutorialConfirmPanel.active };
}`);
check(Object.values(helpInteraction).every(Boolean), 'help/return-cancel-confirm-interaction-regression', helpInteraction);
await sample.context.close();

const regression = await openPage({ width: 1280, height: 720 });
await startBattle(regression.page, 6);
const regressionResult = await inController(regression.page, `(c) => {
    c.playerEnergy = 1000; c.selectedSheepType = undefined; c.refreshUnitTypeButtons();
    const available = [...c.typeButtons.values()].map((view) => view.stateLabel.string);
    c.selectUnitType('medium'); const selected = c.typeButtons.get('medium').stateLabel.string;
    c.playerEnergy = 0; c.refreshUnitTypeButtons();
    const insufficient = c.typeButtons.get('large').stateLabel.string;
    const selectedInsufficient = c.typeButtons.get('medium').stateLabel.string;
    c.playerEnergy = 1000; c.selectUnitType('small'); c.playerSpawnCooldown = 0;
    const repeatFirst = c.tryDeploySelectedUnit(0); c.playerSpawnCooldown = 0;
    const repeatSecond = c.tryDeploySelectedUnit(0); const selectionPersisted = c.selectedSheepType === 'small';
    const musicBefore = c.audioManager.getMusicVolume(); c.adjustAudioVolume('music', -5);
    const musicLower = c.audioManager.getMusicVolume(); c.adjustAudioVolume('music', 5);
    const musicRestored = c.audioManager.getMusicVolume();
    const sfxBefore = c.audioManager.getSfxVolume(); c.adjustAudioVolume('sfx', -5);
    const sfxLower = c.audioManager.getSfxVolume(); c.adjustAudioVolume('sfx', 5);
    const sfxRestored = c.audioManager.getSfxVolume();
    c.pauseGame(); const paused = c.isPaused && c.pausePanel.active;
    c.openHelpPanel(); const helpOpenedPaused = c.helpPanel.active && c.isPaused && !c.pausePanel.active;
    c.closeHelpPanel(); const helpReturned = c.pausePanel.active && c.isPaused;
    const alternate = c.audioManager.getAvailableBgmTracks().find((track) =>
        track.id !== c.audioManager.getSelectedBgmId());
    if (alternate) c.selectBgmStyleFromUi(alternate);
    const selectedBgm = c.audioManager.getSelectedBgmId();
    const storedAudio = JSON.parse(localStorage.getItem('wolf-sheep-battle.audio-settings.v1') ?? '{}');
    c.resumeGame(); const resumed = !c.isPaused && !c.pausePanel.active;
    c.restartGame(); const restarted = c.isStarted && !c.isPaused && !c.isFinished;
    c.returnToTitle(); const returned = !c.isStarted && c.startPanel.active && !c.pausePanel.active
        && !c.helpPanel.active;
    return { available, selected, insufficient, selectedInsufficient, repeatFirst, repeatSecond,
        selectionPersisted, musicBefore, musicLower, musicRestored, sfxBefore, sfxLower, sfxRestored,
        paused, helpOpenedPaused, helpReturned, selectedBgm, storedBgm: storedAudio.selectedBgmId,
        resumed, restarted, returned };
}`);
check(regressionResult.available.every((value) => value === '可用')
    && regressionResult.selected === '已选' && regressionResult.insufficient === '缺能'
    && regressionResult.selectedInsufficient === '已选\n缺能'
    && regressionResult.repeatFirst && regressionResult.repeatSecond && regressionResult.selectionPersisted,
    'regression/card-states-and-continuous-deployment-retained', regressionResult);
check(regressionResult.musicLower < regressionResult.musicBefore
    && regressionResult.musicRestored === regressionResult.musicBefore
    && regressionResult.sfxLower < regressionResult.sfxBefore
    && regressionResult.sfxRestored === regressionResult.sfxBefore
    && regressionResult.selectedBgm === regressionResult.storedBgm,
    'regression/bgm-immediate-save-and-volume-controls-retained', regressionResult);
check(regressionResult.paused && regressionResult.helpOpenedPaused && regressionResult.helpReturned
    && regressionResult.resumed && regressionResult.restarted && regressionResult.returned,
    'regression/pause-help-resume-restart-return-title-retained', regressionResult);
await regression.context.close();

const wide = await openPage({ width: 1600, height: 720, capsule: true });
await startBattle(wide.page, 6);
const wideLayout = await inController(wide.page, `async (c, cc) => {
    c.pauseGame(); await c.preparePauseArt(); c.openHelpPanel();
    const box = (node) => { const rect = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
        return { left: rect.x, right: rect.x + rect.width, bottom: rect.y, top: rect.y + rect.height }; };
    return { help: box(c.helpContent), capsule: c.capsuleExclusion?.active ? box(c.capsuleExclusion) : null,
        visibleWidth: c.screenMetrics.visibleWidth, visibleHeight: c.screenMetrics.visibleHeight };
}`);
await wide.page.waitForTimeout(300);
await wide.page.screenshot({ path: path.join(OUTPUT_DIR, '1600x720-help-level6-capsule.png'), fullPage: true });
check(wideLayout.help.left >= 0 && wideLayout.help.right <= 1600
    && wideLayout.help.bottom >= 0 && wideLayout.help.top <= 720
    && (!wideLayout.capsule || wideLayout.help.right < wideLayout.capsule.left),
    'responsive/wide-help-contained-and-capsule-clear', wideLayout);
await wide.context.close();

await browser.close();
check(browserProblems.length === 0, 'browser/no-page-console-or-request-errors', browserProblems);
const report = {
    version: VERSION,
    previewUrl: PREVIEW_URL,
    generatedAt: new Date().toISOString(),
    summary: {
        total: checks.length,
        passed: checks.filter((item) => item.passed).length,
        failed: checks.filter((item) => !item.passed).length,
    },
    checks,
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'browser-validation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
for (const item of checks.filter((entry) => !entry.passed)) console.error(`FAIL ${item.name}`, item.details ?? '');
if (report.summary.failed > 0) process.exitCode = 1;
