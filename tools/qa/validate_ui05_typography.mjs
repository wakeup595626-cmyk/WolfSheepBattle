import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-ui05/browser-1280');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7465';
const viewportWidth = Number(process.argv[4] ?? 1280);
const viewportHeight = Number(process.argv[5] ?? 720);
const expectedFontUuid = '61237121-3cb1-4260-b41c-30f8c42bd7f0';
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
    localStorage.clear();
    localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
        schemaVersion: 4,
        highestUnlockedLevel: 6,
        completedLevels: [1, 2, 3, 4],
        selectedLevelId: 5,
        specialRoadTutorialSeen: true,
        levelFiveTutorialSeen: true,
        freezeUnlocked: true,
        tutorialCompleted: true,
        selectedTacticsByLevel: { 5: ['sprint', 'heal', 'freeze'] },
    }));
    localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
        selectedBgmId: 'cyberwave_upbeat',
        musicVolume: 0.69,
        sfxVolume: 0.70,
        musicMuted: false,
        sfxMuted: false,
        lastNonZeroMusicVolume: 0.69,
        lastNonZeroSfxVolume: 0.70,
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
    url: request.url(),
    failure: request.failure()?.errorText ?? 'unknown',
}));

await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(async (fontUuid) => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    if (!scene) return false;
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.levelCards && component?.bgmStyleOptions && component?.targetTypographyBindings);
    return (controller?.targetTypographyFont?._uuid ?? controller?.targetTypographyFont?.uuid) === fontUuid;
}, expectedFontUuid, { timeout: 60000 });
await page.waitForTimeout(1000);
await page.mouse.click(viewportWidth - 24, viewportHeight - 24);
await page.waitForTimeout(300);

const showLevelPage = async (pageIndex) => page.evaluate(async (targetPage) => {
    const findController = async () => {
        const cc = await System.import('cc');
        let scene = cc.director.getScene();
        for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            scene = cc.director.getScene();
        }
        if (!scene) throw new Error('Active scene not found');
        const nodes = [];
        const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
        visit(scene);
        return nodes.flatMap((node) => node.components ?? []).find((component) =>
            component?.levelCards && component?.bgmStyleOptions && component?.targetTypographyBindings);
    };
    const controller = await findController();
    controller.showLevelSelect();
    controller.levelSelectPage = targetPage;
    controller.refreshLevelSelectPanel();
    if (controller.audioUnlockHint) controller.audioUnlockHint.active = false;
    return controller.levelSelectPage;
}, pageIndex);

await showLevelPage(0);
await page.waitForTimeout(250);
await page.screenshot({
    path: path.join(outputDir, `${viewportWidth}x${viewportHeight}-level-page1.png`),
    fullPage: true,
});

await showLevelPage(1);
await page.waitForTimeout(250);
await page.screenshot({
    path: path.join(outputDir, `${viewportWidth}x${viewportHeight}-level-page2.png`),
    fullPage: true,
});

const openPausePanel = async () => page.evaluate(async () => {
    const cc = await System.import('cc');
    let scene = cc.director.getScene();
    for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        scene = cc.director.getScene();
    }
    if (!scene) throw new Error('Active scene not found');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.levelCards && component?.bgmStyleOptions && component?.targetTypographyBindings);
    controller.currentLevel = 5;
    controller.isStarted = false;
    controller.restartGame();
    controller.startPanel.active = false;
    controller.levelSelectPanel.active = false;
    controller.activateBattle();
    controller.pauseGame();
    controller.refreshBgmTrackSelector();
    controller.refreshAudioVolumeControls();
    if (controller.audioUnlockHint) controller.audioUnlockHint.active = false;
    return controller.isPaused;
});

await openPausePanel();
await page.waitForTimeout(500);
await page.screenshot({
    path: path.join(outputDir, `${viewportWidth}x${viewportHeight}-pause-bgm-panel.png`),
    fullPage: true,
});

const runtimeAudit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    let scene = cc.director.getScene();
    for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        scene = cc.director.getScene();
    }
    if (!scene) throw new Error('Active scene not found');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.levelCards && component?.bgmStyleOptions && component?.targetTypographyBindings);
    if (!controller) throw new Error('GameController not found');

    const rgba = (color) => ({ r: color.r, g: color.g, b: color.b, a: color.a });
    const labelState = (label) => ({
        text: label.string,
        fontUuid: label.font?._uuid ?? label.font?.uuid ?? '',
        fontName: label.font?.name ?? '',
        useSystemFont: label.useSystemFont,
        fontSize: label.fontSize,
        actualFontSize: label.actualFontSize,
        lineHeight: label.lineHeight,
        isBold: label.isBold,
        color: rgba(label.color),
        outline: {
            enabled: label.enableOutline,
            color: rgba(label.outlineColor),
            width: label.outlineWidth,
        },
        shadow: {
            enabled: label.enableShadow,
            color: rgba(label.shadowColor),
            offset: { x: label.shadowOffset.x, y: label.shadowOffset.y },
            blur: label.shadowBlur,
        },
        overflow: label.overflow,
        wrap: label.enableWrapText,
        horizontalAlign: label.horizontalAlign,
        verticalAlign: label.verticalAlign,
        nodeScale: { x: label.node.scale.x, y: label.node.scale.y, z: label.node.scale.z },
        size: (() => {
            const size = label.node.getComponent(cc.UITransform).contentSize;
            return { width: size.width, height: size.height };
        })(),
    });
    const signature = (label) => {
        const state = labelState(label);
        delete state.text;
        delete state.color;
        return JSON.stringify(state);
    };

    const titleArea = controller.levelSelectContent.getChildByName('TitleArea');
    const levelTitle = titleArea.getChildByName('TitleLabel').getComponent(cc.Label);
    const levelSubtitle = titleArea.getChildByName('SubtitleLabel').getComponent(cc.Label);
    const levelCards = [...controller.levelCards.values()].sort((a, b) => a.levelId - b.levelId);
    const bgmSelector = controller.pauseContentRoot.getChildByName('BgmSelector');
    const bgmOptions = [...controller.bgmStyleOptions.values()];
    const targetLabels = [
        levelTitle,
        levelSubtitle,
        ...levelCards.flatMap((card) => [card.titleLabel, card.descriptionLabel, card.stateLabel]),
        controller.levelSelectPreviousPageButton.label,
        controller.levelSelectNextPageButton.label,
        controller.levelSelectPageLabel,
        controller.levelSelectProgressLabel,
        controller.levelSelectHintLabel,
        controller.levelSelectBackButton.label,
        controller.levelSelectConfirmButton.label,
        bgmSelector.getChildByName('BgmTrackTitle').getComponent(cc.Label),
        bgmSelector.getChildByName('BgmTrackHint').getComponent(cc.Label),
        ...bgmOptions.flatMap((option) => [
            option.titleLabel,
            option.subtitleLabel,
            option.auxiliaryLabel,
            option.statusLabel,
            option.checkLabel,
        ]),
    ];
    for (const control of [controller.musicVolumeControl, controller.sfxVolumeControl]) {
        targetLabels.push(
            control.root.getChildByName(`${control.root.name}Title`).getComponent(cc.Label),
            control.percentLabel,
            control.root.getChildByName(`${control.root.name}Minus`).getChildByName('Text').getComponent(cc.Label),
            control.root.getChildByName(`${control.root.name}Plus`).getChildByName('Text').getComponent(cc.Label),
        );
    }
    const beforeRefresh = targetLabels.map(signature);
    for (let index = 0; index < 10; index += 1) {
        controller.refreshLevelSelectPanel();
        controller.refreshBgmTrackSelector();
        controller.refreshAudioVolumeControls();
    }
    const afterRefresh = targetLabels.map(signature);
    const allNodes = [];
    visit(controller.levelSelectPanel);
    controller.pausePanel.children.forEach(visit);

    const version = nodes.find((node) => node.name === 'VersionLabel')?.getComponent(cc.Label)?.string ?? '';
    return {
        version,
        targetTypographyFont: {
            uuid: controller.targetTypographyFont?._uuid ?? controller.targetTypographyFont?.uuid ?? '',
            name: controller.targetTypographyFont?.name ?? '',
        },
        bindingCount: controller.targetTypographyBindings.size,
        levelSelect: {
            title: labelState(levelTitle),
            subtitle: labelState(levelSubtitle),
            cards: levelCards.map((card) => ({
                levelId: card.levelId,
                title: labelState(card.titleLabel),
                description: labelState(card.descriptionLabel),
                state: labelState(card.stateLabel),
            })),
            pagination: {
                previous: labelState(controller.levelSelectPreviousPageButton.label),
                next: labelState(controller.levelSelectNextPageButton.label),
                page: labelState(controller.levelSelectPageLabel),
            },
            progress: labelState(controller.levelSelectProgressLabel),
            progressHint: labelState(controller.levelSelectHintLabel),
            back: labelState(controller.levelSelectBackButton.label),
            confirm: labelState(controller.levelSelectConfirmButton.label),
        },
        bgm: {
            title: labelState(bgmSelector.getChildByName('BgmTrackTitle').getComponent(cc.Label)),
            hint: labelState(bgmSelector.getChildByName('BgmTrackHint').getComponent(cc.Label)),
            cards: bgmOptions.map((option) => ({
                id: option.track.id,
                title: labelState(option.titleLabel),
                subtitle: labelState(option.subtitleLabel),
                auxiliary: labelState(option.auxiliaryLabel),
                status: labelState(option.statusLabel),
                check: labelState(option.checkLabel),
            })),
        },
        volume: [controller.musicVolumeControl, controller.sfxVolumeControl].map((control) => ({
            channel: control.channel,
            title: labelState(control.root.getChildByName(`${control.root.name}Title`).getComponent(cc.Label)),
            percent: labelState(control.percentLabel),
            minus: labelState(control.root.getChildByName(`${control.root.name}Minus`).getChildByName('Text').getComponent(cc.Label)),
            plus: labelState(control.root.getChildByName(`${control.root.name}Plus`).getChildByName('Text').getComponent(cc.Label)),
        })),
        refreshTypographyStable: beforeRefresh.every((value, index) => value === afterRefresh[index]),
        richTextCount: nodes.reduce((count, node) => count
            + (node.components ?? []).filter((component) => component.constructor?.name === 'RichText').length, 0),
        targetLabelCount: targetLabels.length,
        targetLabels: targetLabels.map(labelState),
    };
});

const sameStyle = (labels, expected) => labels.every((label) =>
    label.fontUuid === expectedFontUuid
    && label.useSystemFont === false
    && label.fontSize === expected.fontSize
    && label.actualFontSize === expected.fontSize
    && label.lineHeight === expected.lineHeight
    && label.isBold === expected.isBold
    && label.overflow === expected.overflow
    && label.wrap === expected.wrap
    && label.outline.enabled === (expected.outline ?? false)
    && label.shadow.enabled === (expected.shadow ?? false)
    && label.nodeScale.x === 1
    && label.nodeScale.y === 1
    && label.nodeScale.z === 1);

const levelCards = runtimeAudit.levelSelect.cards;
const bgmCards = runtimeAudit.bgm.cards;
const assertions = {
    runtimeVersion: runtimeAudit.version.includes('v1.3.0-dev-ui05'),
    targetFontLoaded: runtimeAudit.targetTypographyFont.uuid === expectedFontUuid,
    allTargetLabelsUseOneFormalFont: runtimeAudit.targetLabels.every((label) =>
        label.fontUuid === expectedFontUuid && label.useSystemFont === false),
    levelTitleRole: sameStyle([runtimeAudit.levelSelect.title], {
        fontSize: 36, lineHeight: 45, isBold: true, overflow: 1, wrap: false,
        outline: true, shadow: true,
    }),
    levelSubtitleRole: runtimeAudit.levelSelect.subtitle.text === '选择关卡后，点击下方按钮开始挑战'
        && sameStyle([runtimeAudit.levelSelect.subtitle], {
            fontSize: 16, lineHeight: 20, isBold: false, overflow: 2, wrap: false,
        }),
    sixLevelTitlesBold: levelCards.length === 6 && sameStyle(levelCards.map((card) => card.title), {
        fontSize: 22, lineHeight: 28, isBold: true, overflow: 2, wrap: false,
    }),
    sixLevelDescriptionsRegular: levelCards.length === 6
        && sameStyle(levelCards.map((card) => card.description), {
            fontSize: 15, lineHeight: 20, isBold: false, overflow: 1, wrap: true,
        }),
    sixLevelStatesBold: levelCards.length === 6 && sameStyle(levelCards.map((card) => card.state), {
        fontSize: 16, lineHeight: 20, isBold: true, overflow: 2, wrap: false,
    }),
    paginationUnified: sameStyle([
        runtimeAudit.levelSelect.pagination.previous,
        runtimeAudit.levelSelect.pagination.next,
        runtimeAudit.levelSelect.pagination.page,
    ], { fontSize: 18, lineHeight: 23, isBold: true, overflow: 2, wrap: false }),
    levelActionsStable: sameStyle([runtimeAudit.levelSelect.back], {
        fontSize: 22, lineHeight: 28, isBold: true, overflow: 2, wrap: false,
    }) && sameStyle([runtimeAudit.levelSelect.confirm], {
        fontSize: 24, lineHeight: 30, isBold: true, overflow: 2, wrap: false,
    }),
    bgmSectionRoles: sameStyle([runtimeAudit.bgm.title], {
        fontSize: 22, lineHeight: 27, isBold: true, overflow: 2, wrap: false,
    }) && sameStyle([runtimeAudit.bgm.hint], {
        fontSize: 14, lineHeight: 18, isBold: false, overflow: 2, wrap: false,
    }),
    bgmCardRoles: bgmCards.length === 2
        && sameStyle(bgmCards.map((card) => card.title), {
            fontSize: 18, lineHeight: 23, isBold: true, overflow: 1, wrap: false,
        })
        && sameStyle(bgmCards.map((card) => card.subtitle), {
            fontSize: 14, lineHeight: 18, isBold: false, overflow: 2, wrap: false,
        })
        && sameStyle(bgmCards.map((card) => card.auxiliary), {
            fontSize: 12, lineHeight: 15, isBold: false, overflow: 2, wrap: false,
        })
        && sameStyle(bgmCards.map((card) => card.status), {
            fontSize: 13, lineHeight: 16, isBold: true, overflow: 2, wrap: false,
        }),
    volumeRowsUnified: runtimeAudit.volume.length === 2
        && sameStyle(runtimeAudit.volume.map((row) => row.title), {
            fontSize: 18, lineHeight: 23, isBold: true, overflow: 2, wrap: false,
        })
        && sameStyle(runtimeAudit.volume.map((row) => row.percent), {
            fontSize: 18, lineHeight: 23, isBold: true, overflow: 2, wrap: false,
        })
        && sameStyle(runtimeAudit.volume.flatMap((row) => [row.minus, row.plus]), {
            fontSize: 20, lineHeight: 24, isBold: true, overflow: 2, wrap: false,
        }),
    refreshDoesNotChangeTypography: runtimeAudit.refreshTypographyStable,
    noRichText: runtimeAudit.richTextCount === 0,
};

const ignoredConsolePatterns = [
    /WebGL.*performance caveat/i,
    /The AudioContext was not allowed to start/i,
    /deprecated.*LabelOutline\.(?:color|width)/i,
];
const unexpectedConsoleProblems = consoleProblems.filter((problem) =>
    !ignoredConsolePatterns.some((pattern) => pattern.test(problem.text)));
assertions.noUnexpectedConsoleProblems = unexpectedConsoleProblems.length === 0;
assertions.noRequestFailures = requestFailures.length === 0;

const result = {
    batch: 'v1.3.0-dev-ui05',
    previewUrl,
    viewport: { width: viewportWidth, height: viewportHeight },
    runtimeAudit,
    assertions,
    consoleProblems,
    unexpectedConsoleProblems,
    requestFailures,
    passed: Object.values(assertions).every(Boolean),
};
fs.writeFileSync(
    path.join(outputDir, 'ui05_typography_runtime_audit.json'),
    `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify({
    passed: result.passed,
    assertions,
    unexpectedConsoleProblems,
    requestFailures,
}, null, 2));
await browser.close();
if (!result.passed) process.exitCode = 1;
