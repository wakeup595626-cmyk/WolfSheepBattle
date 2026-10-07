import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-ui02/functional');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8777';
fs.mkdirSync(outputDir, { recursive: true });
const consoleProblems = [];
const requestFailures = [];
const browser = await chromium.launch({ headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
await context.addInitScript(() => {
    if (localStorage.getItem('ui02-qa-seeded') === '1') return;
    localStorage.clear();
    localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
        schemaVersion: 4, highestUnlockedLevel: 6, completedLevels: [1, 3, 5], selectedLevelId: 5,
        specialRoadTutorialSeen: true, levelFiveTutorialSeen: true, freezeUnlocked: true,
        tutorialCompleted: true,
        selectedTacticsByLevel: {
            4: ['sprint', 'heal', 'freeze'], 5: ['sprint', 'heal', 'surge'],
            6: ['sprint', 'heal', 'supplyBoost'],
        },
    }));
    localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
        selectedBgmId: 'cheerful_lighthearted', musicVolume: 0.42, sfxVolume: 0.68,
        musicMuted: false, sfxMuted: false, lastNonZeroMusicVolume: 0.42, lastNonZeroSfxVolume: 0.68,
    }));
    localStorage.setItem('ui02-qa-seeded', '1');
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
await page.mouse.click(20, 20);

const openPageTwo = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.getLevelSelectTotalPages === 'function');
    if (!controller) throw new Error('GameController not found');
    controller.showLevelSelect();
    controller.refreshLevelSelectPanel();
    const visible = [...controller.levelCards.values()].filter((card) => card.root.active).map((card) => card.levelId);
    return { page: controller.levelSelectPage, total: controller.getLevelSelectTotalPages(),
        pageLabel: controller.levelSelectPageLabel.string, visible,
        selected: controller.pendingLevelSelection,
        title: controller.levelSelectContent.getChildByName('TitleArea')?.getChildByName('TitleLabel')?.getComponent(cc.Label)?.string,
        subtitle: controller.levelSelectContent.getChildByName('TitleArea')?.getChildByName('SubtitleLabel')?.getComponent(cc.Label)?.string };
});
await page.screenshot({ path: path.join(outputDir, 'level-select-page-2.png'), fullPage: true });

const levelAudit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.getLevelSelectTotalPages === 'function');
    const pageTwoSelection = controller.pendingLevelSelection;
    controller.changeLevelSelectPage(-1);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const pageOneVisible = [...controller.levelCards.values()].filter((card) => card.root.active).map((card) => card.levelId);
    const firstPageLabel = controller.levelSelectPageLabel.string;
    controller.changeLevelSelectPage(-1);
    const firstBoundaryPage = controller.levelSelectPage;
    controller.selectLevel(2);
    const selectedWithoutStart = {
        selected: controller.pendingLevelSelection,
        currentLevel: controller.currentLevel,
        levelPanelActive: controller.levelSelectPanel.active,
        isStarted: controller.isStarted,
    };
    controller.changeLevelSelectPage(1);
    const selectionAfterPageChange = controller.pendingLevelSelection;
    controller.prepareLevelSelection();
    const reopenedPageForLevel2 = controller.levelSelectPage;
    const freeSelections = [];
    for (let level = 1; level <= 6; level += 1) {
        controller.selectLevel(level);
        freeSelections.push(controller.pendingLevelSelection);
    }
    controller.prepareLevelSelection();
    const pageForLevel6 = controller.levelSelectPage;
    let beginCount = 0;
    let capturedLevel = 0;
    const originalBeginBattle = controller.beginBattle;
    controller.beginBattle = () => { beginCount += 1; capturedLevel = controller.currentLevel; };
    controller.confirmSelectedLevel();
    controller.confirmSelectedLevel();
    controller.beginBattle = originalBeginBattle;
    controller.levelSelectStartLocked = false;
    controller.levelSelectPanel.active = true;
    const cards = [...controller.levelCards.values()].map((card) => ({
        id: card.levelId,
        title: card.titleLabel.string,
        description: card.descriptionLabel.string,
        wrap: card.descriptionLabel.enableWrapText,
        overflow: card.descriptionLabel.overflow,
        titleAlign: card.titleLabel.horizontalAlign,
        descriptionAlign: card.descriptionLabel.horizontalAlign,
        touchHeight: card.touchArea.getComponent(cc.UITransform).contentSize.height,
    }));
    controller.changeLevelSelectPage(-1);
    await new Promise((resolve) => setTimeout(resolve, 220));
    return {
        pageTwoSelection, pageOneVisible, firstPageLabel, firstBoundaryPage,
        selectedWithoutStart, selectionAfterPageChange, reopenedPageForLevel2,
        freeSelections, pageForLevel6, beginCount, capturedLevel, cards,
        pageAfterReturningFromLast: controller.levelSelectPage,
        selectedAfterReturningFromLast: controller.pendingLevelSelection,
    };
});
await page.screenshot({ path: path.join(outputDir, 'level-select-page-1.png'), fullPage: true });

await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.getLevelSelectTotalPages === 'function');
    controller.currentLevel = 6;
    controller.isStarted = false;
    controller.restartGame();
    controller.startPanel.active = false;
    controller.levelSelectPanel.active = false;
    controller.activateBattle();
    controller.pauseGame();
    controller.refreshBgmTrackSelector();
});
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(outputDir, 'pause-bgm-selector.png'), fullPage: true });

const audioAudit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.getLevelSelectTotalPages === 'function');
    const audio = controller.audioManager;
    audio.activateAudio();
    const initial = {
        selected: audio.getSelectedBgmId(), desired: audio.desiredBgm,
        musicVolume: audio.getMusicVolume(), sfxVolume: audio.getSfxVolume(),
        optionCount: controller.bgmStyleOptions.size,
        sourceCount: audio.node.children.filter((node) => node.name === 'BgmAudioSource').length,
    };
    audio.selectBgmTrack('cyberwave_upbeat');
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const switchedToBattle = { selected: audio.getSelectedBgmId(), desired: audio.desiredBgm,
        current: audio.currentBgm, sourceCount: audio.node.children.filter((node) => node.name === 'BgmAudioSource').length };
    audio.selectBgmTrack('cheerful_lighthearted');
    audio.selectBgmTrack('cyberwave_upbeat');
    audio.selectBgmTrack('cheerful_lighthearted');
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const rapidFinal = { selected: audio.getSelectedBgmId(), desired: audio.desiredBgm,
        current: audio.currentBgm, sourceCount: audio.node.children.filter((node) => node.name === 'BgmAudioSource').length };
    audio.setMusicVolume(0.37);
    audio.setSfxVolume(0.63);
    audio.requestMenuBgm();
    const menuTrack = audio.desiredBgm;
    audio.requestBattleBgm();
    const battleTrack = audio.desiredBgm;
    audio.handleGameHide();
    const hidden = { lifecyclePaused: audio.lifecyclePaused, desired: audio.desiredBgm };
    audio.handleGameShow();
    const shown = { lifecyclePaused: audio.lifecyclePaused, desired: audio.desiredBgm,
        sourceCount: audio.node.children.filter((node) => node.name === 'BgmAudioSource').length };
    audio.selectBgmTrack('cyberwave_upbeat');
    await new Promise((resolve) => setTimeout(resolve, 800));
    audio.failedBgmTracks.clear();
    const failureToken = ++audio.bgmRequestToken;
    audio.handleBgmLoadFailure('cyberwave_upbeat', failureToken);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const fallback = { selected: audio.getSelectedBgmId(), desired: audio.desiredBgm,
        current: audio.currentBgm };
    const secondFailureToken = ++audio.bgmRequestToken;
    audio.handleBgmLoadFailure('cheerful_lighthearted', secondFailureToken);
    const allUnavailable = { desired: audio.desiredBgm, current: audio.currentBgm,
        warningShown: audio.allBgmUnavailableWarningShown };
    const repeatedFailureToken = ++audio.bgmRequestToken;
    audio.handleBgmLoadFailure('cheerful_lighthearted', repeatedFailureToken);
    audio.failedBgmTracks.clear();
    audio.selectBgmTrack('cyberwave_upbeat');
    audio.setMusicVolume(0.37);
    audio.setSfxVolume(0.63);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    controller.refreshBgmTrackSelector();
    const optionStates = [...controller.bgmStyleOptions.values()].map((option) => ({
        id: option.track.id, title: option.titleLabel.string, subtitle: option.subtitleLabel.string,
        auxiliary: option.auxiliaryLabel.string, selected: option.checkNode.active,
        status: option.statusLabel.string,
        touchHeight: option.touchArea.getComponent(cc.UITransform).contentSize.height,
    }));
    const stored = JSON.parse(localStorage.getItem('wolf-sheep-battle.audio-settings.v1'));
    return { initial, switchedToBattle, rapidFinal, menuTrack, battleTrack, hidden, shown,
        fallback, allUnavailable, optionStates, stored, isPaused: controller.isPaused,
        bgmSourceCount: audio.node.children.filter((node) => node.name === 'BgmAudioSource').length,
        activeBgmSourceCount: audio.node.children.filter((node) =>
            node.name === 'BgmAudioSource' && node.getComponent(cc.AudioSource)?.playing).length };
});
await page.screenshot({ path: path.join(outputDir, 'pause-bgm-selector-battle-selected.png'), fullPage: true });
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(10000);
await page.mouse.click(20, 20);
const restoredAfterReload = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.getLevelSelectTotalPages === 'function');
    const audio = controller.audioManager;
    return { selected: audio.getSelectedBgmId(), desired: audio.desiredBgm,
        musicVolume: audio.getMusicVolume(), sfxVolume: audio.getSfxVolume(),
        sourceCount: audio.node.children.filter((node) => node.name === 'BgmAudioSource').length };
});

const expectedDescriptions = [
    '小狼缓慢出兵，熟悉选兵、四线部署与补给争夺。',
    '小狼与中狼交替出兵，练习多路线判断与基础对抗。',
    '完整兵种与战术登场，考验补给、能量与路线调度。',
    '特殊道路改变移速，合理利用道路冻结突破防线。',
    '能量高速恢复，小型单位可持续部署，体验高频对抗。',
    '黄金补给线定时转移，围绕限时占领争夺额外补给。',
];
const expectedAllUnavailableWarnings = consoleProblems.filter((problem) =>
    problem.text.includes('Both BGM tracks are unavailable'));
const unexpectedConsoleProblems = consoleProblems.filter((problem) =>
    !problem.text.includes('Both BGM tracks are unavailable'));
const checks = [
    { pass: openPageTwo.total === 2 && openPageTwo.page === 1
        && JSON.stringify(openPageTwo.visible) === JSON.stringify([4, 5, 6])
        && openPageTwo.pageLabel === '第2/2页' && openPageTwo.selected === 5,
    message: 'six levels dynamically paginate into two pages and reopen on the selected level page', detail: openPageTwo },
    { pass: openPageTwo.title === '关卡选择' && openPageTwo.subtitle === '选择关卡后，点击下方按钮开始挑战',
        message: 'level-select heading and instructional subtitle match the UI02 specification', detail: openPageTwo },
    { pass: JSON.stringify(levelAudit.pageOneVisible) === JSON.stringify([1, 2, 3])
        && levelAudit.firstPageLabel === '第1/2页' && levelAudit.firstBoundaryPage === 0,
    message: 'previous-page boundary is disabled and page one shows exactly levels 1-3', detail: levelAudit },
    { pass: levelAudit.selectedWithoutStart.selected === 2 && levelAudit.selectedWithoutStart.levelPanelActive
        && !levelAudit.selectedWithoutStart.isStarted && levelAudit.selectionAfterPageChange === 2
        && levelAudit.reopenedPageForLevel2 === 0,
    message: 'card taps only select; selection survives page changes and reopen locates its page', detail: levelAudit },
    { pass: JSON.stringify(levelAudit.freeSelections) === JSON.stringify([1, 2, 3, 4, 5, 6])
        && levelAudit.pageForLevel6 === 1 && levelAudit.beginCount === 1 && levelAudit.capturedLevel === 6,
    message: 'all six levels are freely selectable and rapid confirm enters level 6 only once', detail: levelAudit },
    { pass: levelAudit.cards.every((card, index) => card.description === expectedDescriptions[index]
        && card.wrap && card.touchHeight >= 44),
    message: 'all six final descriptions use two-line clamped labels and >=44px touch areas', detail: levelAudit.cards },
    { pass: audioAudit.initial.selected === 'cheerful_lighthearted' && audioAudit.initial.optionCount === 2
        && audioAudit.initial.sourceCount === 1,
    message: 'stored cheerful style loads into two-option UI with one persistent BGM source', detail: audioAudit.initial },
    { pass: audioAudit.switchedToBattle.selected === 'cyberwave_upbeat'
        && audioAudit.switchedToBattle.desired === 'cyberwave_upbeat'
        && audioAudit.switchedToBattle.sourceCount === 1,
    message: 'cheerful-to-battle selection switches immediately without creating another source', detail: audioAudit.switchedToBattle },
    { pass: audioAudit.rapidFinal.selected === 'cheerful_lighthearted'
        && audioAudit.rapidFinal.desired === 'cheerful_lighthearted'
        && audioAudit.rapidFinal.sourceCount === 1,
    message: 'rapid alternating selections retain only the final request and one source', detail: audioAudit.rapidFinal },
    { pass: audioAudit.menuTrack === 'cheerful_lighthearted' && audioAudit.battleTrack === 'cheerful_lighthearted'
        && audioAudit.shown.desired === 'cheerful_lighthearted' && audioAudit.shown.sourceCount === 1,
    message: 'menu, battle, hide, and show preserve the player-selected style', detail: audioAudit },
    { pass: audioAudit.fallback.selected === 'cheerful_lighthearted'
        && audioAudit.fallback.desired === 'cheerful_lighthearted',
    message: 'a failed selected BGM falls back to the other available track without blocking gameplay', detail: audioAudit.fallback },
    { pass: audioAudit.allUnavailable.desired === undefined
        && audioAudit.allUnavailable.current === undefined
        && audioAudit.allUnavailable.warningShown && expectedAllUnavailableWarnings.length === 1,
    message: 'when both tracks fail the game continues silently and emits one explicit warning',
    detail: { state: audioAudit.allUnavailable, warnings: expectedAllUnavailableWarnings } },
    { pass: audioAudit.stored.selectedBgmId === 'cyberwave_upbeat'
        && Math.abs(audioAudit.stored.musicVolume - 0.37) < 0.001
        && Math.abs(audioAudit.stored.sfxVolume - 0.63) < 0.001,
    message: 'selected BGM and independent music/SFX volumes persist in the existing settings object', detail: audioAudit.stored },
    { pass: restoredAfterReload.selected === 'cyberwave_upbeat'
        && restoredAfterReload.desired === 'cyberwave_upbeat'
        && Math.abs(restoredAfterReload.musicVolume - 0.37) < 0.001
        && Math.abs(restoredAfterReload.sfxVolume - 0.63) < 0.001
        && restoredAfterReload.sourceCount === 1,
    message: 'a full page reload restores the chosen BGM and both volume channels', detail: restoredAfterReload },
    { pass: audioAudit.optionStates.length === 2 && audioAudit.optionStates.filter((option) => option.selected).length === 1
        && audioAudit.optionStates.find((option) => option.id === 'cyberwave_upbeat')?.status === '当前使用'
        && audioAudit.optionStates.every((option) => option.touchHeight >= 44),
    message: 'pause selector has two large cards and one unambiguous selected state', detail: audioAudit.optionStates },
    { pass: audioAudit.isPaused && audioAudit.bgmSourceCount === 1 && audioAudit.activeBgmSourceCount <= 1,
    message: 'switching while paused does not alter game pause state or overlap BGM players', detail: audioAudit },
    { pass: unexpectedConsoleProblems.length === 0 && requestFailures.length === 0,
    message: 'browser runtime produced no unexpected console warnings/errors or failed requests',
    detail: { unexpectedConsoleProblems, expectedAllUnavailableWarnings, requestFailures } },
];
const report = {
    generatedAt: new Date().toISOString(), previewUrl,
    passed: checks.every((entry) => entry.pass),
    totals: { checks: checks.length, passed: checks.filter((entry) => entry.pass).length,
        failed: checks.filter((entry) => !entry.pass).length },
    checks, openPageTwo, levelAudit, audioAudit, restoredAfterReload, consoleProblems, requestFailures,
};
fs.writeFileSync(path.join(outputDir, 'ui02_functional_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, totals: report.totals,
    failed: checks.filter((entry) => !entry.pass).map((entry) => entry.message) }, null, 2));
await browser.close();
if (!report.passed) process.exitCode = 1;
