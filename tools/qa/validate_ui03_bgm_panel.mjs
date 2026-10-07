import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-ui03/browser');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7456';
const viewportWidth = Number(process.argv[4] ?? 1280);
const viewportHeight = Number(process.argv[5] ?? 720);
fs.mkdirSync(outputDir, { recursive: true });

const consoleProblems = [];
const requestFailures = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    hasTouch: true,
});
await context.addInitScript(() => {
    if (sessionStorage.getItem('ui03-qa-seeded') === '1') return;
    localStorage.clear();
    localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
        schemaVersion: 4,
        highestUnlockedLevel: 6,
        completedLevels: [1, 2, 3, 4, 5],
        selectedLevelId: 6,
        specialRoadTutorialSeen: true,
        levelFiveTutorialSeen: true,
        freezeUnlocked: true,
        tutorialCompleted: true,
        selectedTacticsByLevel: { 6: ['sprint', 'heal', 'supplyBoost'] },
    }));
    localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
        selectedBgmId: 'cheerful_lighthearted',
        musicVolume: 0.42,
        sfxVolume: 0.68,
        musicMuted: false,
        sfxMuted: false,
        lastNonZeroMusicVolume: 0.42,
        lastNonZeroSfxVolume: 0.68,
    }));
    sessionStorage.setItem('ui03-qa-seeded', '1');
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
    url: request.url(),
    failure: request.failure()?.errorText ?? 'unknown',
}));

await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(9000);
await page.mouse.click(viewportWidth - 20, viewportHeight - 20);

const setup = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && component?.pausePanel && component?.bgmStyleOptions);
    if (!controller) throw new Error('GameController not found');
    controller.currentLevel = 6;
    controller.isStarted = false;
    controller.restartGame();
    controller.startPanel.active = false;
    controller.levelSelectPanel.active = false;
    controller.activateBattle();
    controller.pauseGame();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    controller.refreshBgmTrackSelector();
    const version = nodes.find((node) => node.name === 'VersionLabel')?.getComponent(cc.Label)?.string ?? '';
    return { version, paused: controller.isPaused };
});

await page.screenshot({
    path: path.join(outputDir, `${viewportWidth}x${viewportHeight}-pause-bgm-panel.png`),
    fullPage: true,
});

const panelAudit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && component?.pausePanel && component?.bgmStyleOptions);
    const selector = controller.pauseContentRoot.getChildByName('BgmSelector');
    const container = selector?.getChildByName('BgmStyleCards');
    const cards = [...controller.bgmStyleOptions.values()];
    const allSelectorNodes = [];
    const collect = (node) => { allSelectorNodes.push(node); node.children.forEach(collect); };
    collect(selector);
    const componentCountByName = (name) => allSelectorNodes.reduce((sum, node) => sum
        + (node.components ?? []).filter((component) => component.constructor?.name === name).length, 0);
    const labelState = (label) => ({
        text: label.string,
        fontUuid: label.font?._uuid ?? label.font?.uuid ?? '',
        fontName: label.font?.name ?? '',
        useSystemFont: label.useSystemFont,
        fontSize: label.fontSize,
        actualFontSize: label.actualFontSize,
        lineHeight: label.lineHeight,
        isBold: label.isBold,
        wrap: label.enableWrapText,
        overflow: label.overflow,
        align: label.horizontalAlign,
        size: { width: label.node.getComponent(cc.UITransform).contentSize.width,
            height: label.node.getComponent(cc.UITransform).contentSize.height },
    });
    const cardState = cards.map((option) => {
        const rootSize = option.root.getComponent(cc.UITransform).contentSize;
        const touchSize = option.touchArea.getComponent(cc.UITransform).contentSize;
        return {
            id: option.track.id,
            parent: option.root.parent?.name,
            position: { x: option.root.position.x, y: option.root.position.y },
            rootSize: { width: rootSize.width, height: rootSize.height },
            touchSize: { width: touchSize.width, height: touchSize.height },
            touchPosition: { x: option.touchArea.position.x, y: option.touchArea.position.y },
            childNames: option.root.children.map((node) => node.name),
            title: labelState(option.titleLabel),
            subtitle: labelState(option.subtitleLabel),
            auxiliary: labelState(option.auxiliaryLabel),
            status: labelState(option.statusLabel),
            selected: option.checkNode.active,
        };
    });
    const title = selector.getChildByName('BgmTrackTitle').getComponent(cc.Label);
    const hint = selector.getChildByName('BgmTrackHint').getComponent(cc.Label);
    const legacyNames = ['BgmSelectorPanelArt', 'BgmPreviousButton', 'BgmNextButton', 'BgmCurrentTrack'];
    return {
        selectorChildren: selector.children.map((node) => node.name),
        containerChildren: container?.children.map((node) => node.name) ?? [],
        legacyNodes: legacyNames.filter((name) => selector.getChildByName(name)),
        cardCount: cards.length,
        gap: cards.length === 2
            ? Math.abs(cards[0].root.position.y - cards[1].root.position.y)
                - cards[0].root.getComponent(cc.UITransform).contentSize.height
            : null,
        richTextCount: componentCountByName('RichText'),
        buttonCount: componentCountByName('Button'),
        blockInputCount: componentCountByName('BlockInputEvents'),
        spriteCount: componentCountByName('Sprite'),
        touchAreaCount: allSelectorNodes.filter((node) => node.name === 'TouchArea').length,
        labelOutlineCount: componentCountByName('LabelOutline'),
        labelShadowCount: componentCountByName('LabelShadow'),
        title: labelState(title),
        hint: labelState(hint),
        cards: cardState,
    };
});

const interactionAudit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && component?.pausePanel && component?.bgmStyleOptions);
    const audio = controller.audioManager;
    const cycleCounts = [];
    for (let i = 0; i < 10; i += 1) {
        if (!controller.isPaused) controller.pauseGame();
        controller.refreshBgmTrackSelector();
        const selector = controller.pauseContentRoot.getChildByName('BgmSelector');
        const allNodes = [];
        const collect = (node) => { allNodes.push(node); node.children.forEach(collect); };
        collect(selector);
        cycleCounts.push({
            iteration: i + 1,
            cardCount: controller.bgmStyleOptions.size,
            containerCount: selector.children.filter((node) => node.name === 'BgmStyleCards').length,
            touchAreaCount: allNodes.filter((node) => node.name === 'TouchArea').length,
            legacyCount: allNodes.filter((node) => node.name === 'BgmSelectorPanelArt').length,
        });
        controller.resumeGame();
    }
    controller.pauseGame();
    const originalSelect = audio.selectBgmTrack.bind(audio);
    let selectCallCount = 0;
    audio.selectBgmTrack = (id) => { selectCallCount += 1; return originalSelect(id); };
    const selections = [];
    for (let i = 0; i < 20; i += 1) {
        const id = i % 2 === 0 ? 'cheerful_lighthearted' : 'cyberwave_upbeat';
        controller.bgmStyleOptions.get(id).touchArea.emit(cc.NodeEventType.TOUCH_END);
        selections.push(audio.getSelectedBgmId());
        await new Promise((resolve) => setTimeout(resolve, 80));
    }
    audio.selectBgmTrack = originalSelect;
    await new Promise((resolve) => setTimeout(resolve, 1800));
    controller.refreshBgmTrackSelector();
    const afterSwitches = {
        selectCallCount,
        selected: audio.getSelectedBgmId(),
        desired: audio.desiredBgm,
        current: audio.currentBgm,
        sourceCount: audio.node.children.filter((node) => node.name === 'BgmAudioSource').length,
        activeSourceCount: audio.node.children.filter((node) =>
            node.name === 'BgmAudioSource' && node.getComponent(cc.AudioSource)?.playing).length,
        stored: JSON.parse(localStorage.getItem('wolf-sheep-battle.audio-settings.v1')),
        statuses: [...controller.bgmStyleOptions.values()].map((option) => ({
            id: option.track.id,
            status: option.statusLabel.string,
            checked: option.checkNode.active,
        })),
    };
    controller.resumeGame();
    controller.restartGame();
    const afterRestart = audio.getSelectedBgmId();
    controller.returnToTitle();
    const afterTitle = audio.getSelectedBgmId();
    controller.showLevelSelect();
    const afterLevelSelect = audio.getSelectedBgmId();
    return { cycleCounts, selections, afterSwitches, afterRestart, afterTitle, afterLevelSelect };
});

await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(8500);
const reloadAudit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && component?.pausePanel && component?.bgmStyleOptions);
    return {
        selected: controller.audioManager.getSelectedBgmId(),
        musicVolume: controller.audioManager.getMusicVolume(),
        sfxVolume: controller.audioManager.getSfxVolume(),
        stored: JSON.parse(localStorage.getItem('wolf-sheep-battle.audio-settings.v1')),
        sourceCount: controller.audioManager.node.children.filter((node) => node.name === 'BgmAudioSource').length,
    };
});

const ignoredConsolePatterns = [
    /WebGL.*performance caveat/i,
    /The AudioContext was not allowed to start/i,
    /deprecated.*LabelOutline\.(?:color|width)/i,
];
const unexpectedConsoleProblems = consoleProblems.filter((problem) =>
    !ignoredConsolePatterns.some((pattern) => pattern.test(problem.text)));
const expectedFontUuid = '4a8bd7ac-693c-4775-b88f-16536c37f7cb';
const labels = [panelAudit.title, panelAudit.hint,
    ...panelAudit.cards.flatMap((card) => [card.title, card.subtitle, card.auxiliary, card.status])];
const assertions = {
    runtimeVersion: setup.version.includes('v1.3.0-dev-ui03'),
    pauseOpened: setup.paused === true,
    noLegacyNodes: panelAudit.legacyNodes.length === 0,
    dedicatedContainer: panelAudit.selectorChildren.includes('BgmStyleCards')
        && panelAudit.containerChildren.length === 2,
    twoEqualCards: panelAudit.cardCount === 2 && panelAudit.cards.every((card) =>
        card.parent === 'BgmStyleCards' && card.rootSize.width === 400 && card.rootSize.height === 54),
    cardGap12: panelAudit.gap === 12,
    exactTouchBounds: panelAudit.cards.every((card) =>
        card.touchSize.width === card.rootSize.width && card.touchSize.height === card.rootSize.height
        && card.touchPosition.x === 0 && card.touchPosition.y === 0),
    noInvisibleInterceptors: panelAudit.buttonCount === 0 && panelAudit.blockInputCount === 0
        && panelAudit.touchAreaCount === 2,
    noLegacySprite: panelAudit.spriteCount === 0,
    noRichTextOrEffects: panelAudit.richTextCount === 0 && panelAudit.labelOutlineCount === 0
        && panelAudit.labelShadowCount === 0,
    unifiedFormalFont: labels.every((label) => label.fontUuid === expectedFontUuid
        && label.useSystemFont === false),
    noSyntheticMixedWeight: labels.every((label) => label.isBold === false),
    semanticSizes: panelAudit.title.fontSize === 22 && panelAudit.hint.fontSize === 13
        && panelAudit.cards.every((card) => card.title.fontSize === 19
            && card.subtitle.fontSize === 14 && card.auxiliary.fontSize === 12
            && card.status.fontSize === 13),
    exactTexts: panelAudit.cards[0]?.title.text === '轻松欢快'
        && panelAudit.cards[0]?.subtitle.text === '温暖、治愈、轻松的草原旋律'
        && panelAudit.cards[0]?.auxiliary.text === 'Ear0 · 欢乐'
        && panelAudit.cards[1]?.title.text === '热血对战'
        && panelAudit.cards[1]?.subtitle.text === '节奏明快、适合激烈对抗'
        && panelAudit.cards[1]?.auxiliary.text === 'Pixabay · Fun Game',
    tenPauseCyclesStable: interactionAudit.cycleCounts.length === 10
        && interactionAudit.cycleCounts.every((item) => item.cardCount === 2
            && item.containerCount === 1 && item.touchAreaCount === 2 && item.legacyCount === 0),
    twentyCardEventsExactlyOnce: interactionAudit.afterSwitches.selectCallCount === 20,
    oneBgmSource: interactionAudit.afterSwitches.sourceCount === 1
        && interactionAudit.afterSwitches.activeSourceCount <= 1 && reloadAudit.sourceCount === 1,
    switchAndSave: interactionAudit.afterSwitches.selected === 'cyberwave_upbeat'
        && interactionAudit.afterSwitches.desired === 'cyberwave_upbeat'
        && interactionAudit.afterSwitches.current === 'cyberwave_upbeat'
        && interactionAudit.afterSwitches.stored.selectedBgmId === 'cyberwave_upbeat',
    stableStatusArea: interactionAudit.afterSwitches.statuses.some((item) =>
        item.id === 'cyberwave_upbeat' && item.status === '当前使用' && item.checked)
        && interactionAudit.afterSwitches.statuses.some((item) =>
            item.id === 'cheerful_lighthearted' && item.status === '点击试听' && !item.checked),
    navigationKeepsSelection: interactionAudit.afterRestart === 'cyberwave_upbeat'
        && interactionAudit.afterTitle === 'cyberwave_upbeat'
        && interactionAudit.afterLevelSelect === 'cyberwave_upbeat',
    reloadKeepsSelectionAndVolumes: reloadAudit.selected === 'cyberwave_upbeat'
        && reloadAudit.musicVolume === 0.42 && reloadAudit.sfxVolume === 0.68,
    noUnexpectedConsoleProblems: unexpectedConsoleProblems.length === 0,
    noRequestFailures: requestFailures.length === 0,
};

const result = {
    batch: 'v1.3.0-dev-ui03',
    previewUrl,
    viewport: { width: viewportWidth, height: viewportHeight },
    setup,
    panelAudit,
    interactionAudit,
    reloadAudit,
    consoleProblems,
    unexpectedConsoleProblems,
    requestFailures,
    assertions,
    passed: Object.values(assertions).every(Boolean),
};
fs.writeFileSync(path.join(outputDir, 'ui03_bgm_panel_audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ passed: result.passed, assertions, unexpectedConsoleProblems, requestFailures }, null, 2));
await browser.close();
if (!result.passed) process.exitCode = 1;
