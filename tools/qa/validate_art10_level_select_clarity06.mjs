import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/art10-ui-clarity06/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7466';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const check = (condition, message, detail = undefined) => {
    checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
};
const approximately = (actual, expected, tolerance = 0.01) =>
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;

let browser;
let fatalError;
const consoleRecords = [];
const requestFailures = [];
const response404s = [];
const snapshots = {};

try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    page.on('console', (message) => consoleRecords.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', (error) => consoleRecords.push({ type: 'pageerror', text: error.message }));
    page.on('requestfailed', (request) => requestFailures.push({
        url: request.url(),
        error: request.failure()?.errorText,
    }));
    page.on('response', (response) => {
        if (response.status() === 404) response404s.push(response.url());
    });

    const withController = async (callback, argument) => page.evaluate(
        async ({ callbackSource, callbackArgument }) => {
            const cc = await System.import('cc');
            const scene = cc.director.getScene();
            if (!scene) throw new Error('runtime scene is unavailable');
            const nodes = [];
            const visit = (node) => {
                nodes.push(node);
                for (const child of node.children) visit(child);
            };
            visit(scene);
            const controller = nodes.flatMap((node) => node.components ?? [])
                .find((component) => typeof component.showLevelSelect === 'function');
            if (!controller) throw new Error('GameController component was not found');
            return Function(
                'cc',
                'controller',
                'argument',
                `return (${callbackSource})(cc, controller, argument);`,
            )(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    const audit = (cc, controller) => {
        const nodeRect = (node) => {
            const size = node.getComponent(cc.UITransform)?.contentSize;
            return size ? {
                x: node.position.x,
                y: node.position.y,
                width: size.width,
                height: size.height,
                left: node.position.x - size.width / 2,
                right: node.position.x + size.width / 2,
                bottom: node.position.y - size.height / 2,
                top: node.position.y + size.height / 2,
            } : undefined;
        };
        const labelAudit = (label) => ({
            text: label.string,
            color: [label.color.r, label.color.g, label.color.b, label.color.a],
            fontSize: label.fontSize,
            actualFontSize: typeof label.actualFontSize === 'number' ? label.actualFontSize : label.fontSize,
            overflow: label.overflow,
            wrap: label.enableWrapText,
            align: label.horizontalAlign,
            rect: nodeRect(label.node),
            replacementGlyph: label.string.includes('\uFFFD'),
            formalFont: Boolean(controller.formalUiFont) && label.font === controller.formalUiFont,
        });
        const cards = Array.from(controller.levelCards.values()).map((card) => {
            const sprite = card.root.getChildByName('CardBackgroundSprite')?.getComponent(cc.Sprite);
            const badgeSprite = card.numberBadgeNode.getChildByName('NumberBadgeSprite')?.getComponent(cc.Sprite);
            const stateSprite = card.stateIconFallbackNode.getChildByName('StateIconSprite')?.getComponent(cc.Sprite);
            return {
                id: card.levelId,
                visualState: card.visualState,
                completed: card.completed,
                root: nodeRect(card.root),
                scale: [card.root.scale.x, card.root.scale.y],
                backgroundFormal: Boolean(sprite?.spriteFrame),
                backgroundSliced: sprite?.type === cc.Sprite.Type.SLICED,
                fallbackEnabled: card.backgroundGraphics.enabled,
                numberBadgeFormal: Boolean(badgeSprite?.spriteFrame),
                numberBadgeSliced: badgeSprite?.type === cc.Sprite.Type.SLICED,
                stateIconFormal: Boolean(stateSprite?.spriteFrame),
                number: labelAudit(card.numberLabel),
                title: labelAudit(card.titleLabel),
                description: labelAudit(card.descriptionLabel),
                state: labelAudit(card.stateLabel),
                stateArea: nodeRect(card.stateArea),
                touchArea: nodeRect(card.touchArea),
                completionBadgeActive: card.completionBadgeNode.active,
            };
        });
        const panelSprite = controller.levelSelectContent.getChildByName('PanelBackgroundSprite')
            ?.getComponent(cc.Sprite);
        const progressSprite = controller.levelSelectProgressArea.getChildByName('ProgressBackgroundSprite')
            ?.getComponent(cc.Sprite);
        const overlaySprite = controller.levelSelectDimBackground.getChildByName('OverlaySprite')
            ?.getComponent(cc.Sprite);
        return {
            cards,
            currentLevel: controller.currentLevel,
            highestUnlockedLevel: controller.highestUnlockedLevel,
            panelActive: controller.levelSelectPanel.active,
            startActive: controller.startPanel.active,
            overlayName: controller.levelSelectPanel.name,
            overlayBlocksInput: Boolean(controller.levelSelectPanel.getComponent(cc.BlockInputEvents)),
            dimName: controller.levelSelectDimBackground.name,
            dimColor: controller.fullscreenBackdropColors.has(controller.levelSelectDimBackground),
            overlayFormal: Boolean(overlaySprite?.spriteFrame),
            overlaySliced: overlaySprite?.type === cc.Sprite.Type.SLICED,
            panel: nodeRect(controller.levelSelectContent),
            panelFormal: Boolean(panelSprite?.spriteFrame),
            panelSliced: panelSprite?.type === cc.Sprite.Type.SLICED,
            panelFallbackEnabled: controller.levelSelectPanelFallbackGraphics.enabled,
            progress: nodeRect(controller.levelSelectProgressArea),
            progressFormal: Boolean(progressSprite?.spriteFrame),
            progressSliced: progressSprite?.type === cc.Sprite.Type.SLICED,
            progressFallbackEnabled: controller.levelSelectProgressFallbackGraphics.enabled,
            progressText: controller.levelSelectProgressLabel.string,
            hintText: controller.levelSelectHintLabel.string,
            backButton: {
                rect: nodeRect(controller.levelSelectBackButton.node),
                text: controller.levelSelectBackButton.label.string,
                x: controller.levelSelectBackButton.node.position.x,
                formal: Boolean(controller.levelSelectBackButton.node.getChildByName('BackButtonSprite')
                    ?.getComponent(cc.Sprite)?.spriteFrame),
                genericArtActive: controller.levelSelectBackButton.node.getChildByName('ButtonArt')?.active ?? false,
            },
            debugResetExists: Boolean(controller.levelSelectDebugResetButton),
            debugResetNodeExists: Boolean(controller.levelSelectContent.getChildByName('BottomButtons')
                ?.getChildByName('DebugResetButton')),
            debugConfirmNodeExists: Boolean(controller.levelSelectContent.getChildByName('DebugResetConfirmPanel')),
            visible: [controller.screenMetrics.visibleWidth, controller.screenMetrics.visibleHeight],
        };
    };

    await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(3500);

    await withController((_cc, controller) => {
        controller.highestUnlockedLevel = 1;
        controller.currentLevel = 1;
        controller.showLevelSelect();
    });
    await page.waitForTimeout(250);
    snapshots.locked = await withController(audit);
    await page.screenshot({
        path: path.join(outputDir, 'level_select_locked_1280x720.png'),
        fullPage: true,
    });

    check(snapshots.locked.overlayName === 'LevelSelectOverlay', 'uses dedicated LevelSelectOverlay root');
    check(snapshots.locked.overlayBlocksInput, 'modal blocks underlying battle input');
    check(snapshots.locked.dimName === 'DimBackground' && snapshots.locked.dimColor,
        'uses dedicated green dim background');
    check(snapshots.locked.overlayFormal && snapshots.locked.overlaySliced,
        'formal sliced green overlay is active');
    check(approximately(snapshots.locked.panel.width, 780)
        && approximately(snapshots.locked.panel.height, 520), 'panel is 780x520');
    check(snapshots.locked.panelFormal && snapshots.locked.panelSliced
        && !snapshots.locked.panelFallbackEnabled, 'formal panel replaces fallback Graphics');
    check(snapshots.locked.progressFormal && snapshots.locked.progressSliced
        && !snapshots.locked.progressFallbackEnabled, 'formal progress panel replaces fallback Graphics');
    check(snapshots.locked.cards.length === 3, 'three level cards are present');
    check(snapshots.locked.cards.every((card) => approximately(card.root.width, 650)
        && approximately(card.root.height, 82)), 'all cards are 650x82');
    check(snapshots.locked.cards[0].root.y - snapshots.locked.cards[1].root.y === 92
        && snapshots.locked.cards[1].root.y - snapshots.locked.cards[2].root.y === 92,
    'cards use an even 10px gap');
    check(snapshots.locked.cards.every((card) => card.backgroundFormal && card.backgroundSliced
        && !card.fallbackEnabled), 'all cards use sliced formal art without double Graphics');
    check(snapshots.locked.cards.every((card) => card.numberBadgeFormal && card.numberBadgeSliced
        && card.stateIconFormal), 'all cards use formal number badges and state icons');
    check(snapshots.locked.cards.every((card) => card.title.text.startsWith(`第${card.id}关 · `)),
        'all titles are separate dynamic labels');
    check(snapshots.locked.cards.every((card) => !/[·]\s*(当前选择|可挑战|已通关|未解锁)/u
        .test(card.description.text)), 'state text is not appended to description');
    check(snapshots.locked.cards.every((card) => !card.title.replacementGlyph
        && !card.description.replacementGlyph && !card.state.replacementGlyph),
    'no replacement glyphs appear in level cards');
    check(snapshots.locked.cards.every((card) => card.title.formalFont
        && card.description.formalFont && card.state.formalFont),
    'all card text uses formal Chinese UI font');
    check(snapshots.locked.cards.every((card) => !card.title.wrap && !card.description.wrap
        && !card.state.wrap), 'all card labels are single-line');
    check(snapshots.locked.progressText === '关卡进度  1/3', 'progress reads current stored unlock value');
    check(snapshots.locked.backButton.text === '返回主菜单'
        && approximately(snapshots.locked.backButton.x, 0), 'formal back button is centered');
    check(snapshots.locked.backButton.formal && !snapshots.locked.backButton.genericArtActive,
        'back button uses only dedicated v06 art');
    check(!snapshots.locked.debugResetExists && !snapshots.locked.debugResetNodeExists
        && !snapshots.locked.debugConfirmNodeExists, 'formal build hides debug reset controls');
    check(snapshots.locked.cards.map((card) => card.visualState).join(',')
        === 'selected,locked,locked', 'locked progression state map is correct');

    const lockedInteraction = await withController((_cc, controller) => {
        const before = controller.currentLevel;
        controller.selectLevel(3);
        return {
            before,
            after: controller.currentLevel,
            panelActive: controller.levelSelectPanel.active,
            hint: controller.levelSelectHintLabel.string,
            scale: [
                controller.levelCards.get(3).root.scale.x,
                controller.levelCards.get(3).root.scale.y,
            ],
        };
    });
    check(lockedInteraction.before === 1 && lockedInteraction.after === 1,
        'locked card cannot change current level');
    check(lockedInteraction.panelActive && lockedInteraction.hint === '请先通关上一关',
        'locked card stays in modal and shows requested hint');
    check(lockedInteraction.scale[0] === 1 && lockedInteraction.scale[1] === 1,
        'locked card does not retain a bright/pressed scale');

    await withController((_cc, controller) => {
        controller.highestUnlockedLevel = 2;
        controller.currentLevel = 1;
        controller.showLevelSelect();
        controller.refreshLevelSelectPanel();
    });
    await page.waitForTimeout(100);
    snapshots.mixed = await withController(audit);
    await page.screenshot({
        path: path.join(outputDir, 'level_select_selected_unlocked_locked_1280x720.png'),
        fullPage: true,
    });
    check(snapshots.mixed.cards.map((card) => card.visualState).join(',')
        === 'selected,unlocked,locked', 'selected/unlocked/locked states render together');
    check(snapshots.mixed.cards[0].completionBadgeActive,
        'selected completed card keeps a small completion check');
    check(snapshots.mixed.progressText === '关卡进度  2/3', '2/3 progress is live');

    await withController((_cc, controller) => {
        controller.highestUnlockedLevel = 3;
        controller.currentLevel = 2;
        controller.showLevelSelect();
        controller.refreshLevelSelectPanel();
    });
    await page.waitForTimeout(100);
    snapshots.completed = await withController(audit);
    await page.screenshot({
        path: path.join(outputDir, 'level_select_completed_selected_available_1280x720.png'),
        fullPage: true,
    });
    check(snapshots.completed.cards.map((card) => card.visualState).join(',')
        === 'completed,selected,unlocked', 'completed/selected/unlocked states render together');
    check(snapshots.completed.cards[1].completionBadgeActive,
        'selected completed level retains completion check');
    check(snapshots.completed.progressText === '关卡进度  3/3', '3/3 progress is live');

    const selectInteraction = await withController((_cc, controller) => {
        controller.highestUnlockedLevel = 3;
        controller.currentLevel = 1;
        controller.showLevelSelect();
        controller.selectLevel(3);
        return {
            current: controller.currentLevel,
            panelActive: controller.levelSelectPanel.active,
            startActive: controller.startPanel.active,
        };
    });
    check(selectInteraction.current === 3 && !selectInteraction.panelActive
        && selectInteraction.startActive, 'unlocked selection preserves original return-to-menu flow');

    const backInteraction = await withController((_cc, controller) => {
        controller.showLevelSelect();
        controller.returnToStartPanel();
        return {
            panelActive: controller.levelSelectPanel.active,
            startActive: controller.startPanel.active,
        };
    });
    check(!backInteraction.panelActive && backInteraction.startActive, 'return to main menu works');

    const storageAudit = await withController((cc, controller) => {
        const key = 'wolf-sheep-battle.v1.highest-unlocked-level';
        const previous = cc.sys.localStorage.getItem(key);
        cc.sys.localStorage.setItem(key, '2');
        controller.highestUnlockedLevel = 1;
        controller.currentLevel = 3;
        controller.loadLevelProgress();
        const loaded = [controller.highestUnlockedLevel, controller.currentLevel];
        if (previous === null) cc.sys.localStorage.removeItem(key);
        else cc.sys.localStorage.setItem(key, previous);
        return { key, loaded };
    });
    check(storageAudit.key === 'wolf-sheep-battle.v1.highest-unlocked-level'
        && storageAudit.loaded[0] === 2 && storageAudit.loaded[1] === 2,
    'existing progress storage key and clamp behavior are preserved');

    await page.setViewportSize({ width: 1600, height: 720 });
    await page.waitForTimeout(400);
    await withController((_cc, controller) => {
        controller.highestUnlockedLevel = 2;
        controller.currentLevel = 1;
        controller.showLevelSelect();
        controller.refreshLevelSelectPanel();
    });
    snapshots.wide = await withController(audit);
    await page.screenshot({
        path: path.join(outputDir, 'level_select_wechat_landscape_sim_1600x720.png'),
        fullPage: true,
    });
    check(approximately(snapshots.wide.panel.width, 780)
        && approximately(snapshots.wide.panel.height, 520), 'wide landscape keeps fixed safe panel size');
    check(snapshots.wide.cards.every((card) => card.title.actualFontSize >= 17
        && card.description.actualFontSize >= 12), 'wide landscape keeps readable card text');

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    snapshots.mobile = await withController(audit);
    await page.screenshot({
        path: path.join(outputDir, 'level_select_mobile_landscape_sim_844x390.png'),
        fullPage: true,
    });
    check(snapshots.mobile.panelActive, 'mobile landscape simulation keeps modal active');
    check(snapshots.mobile.cards.every((card) => card.touchArea.width === 650
        && card.touchArea.height === 82), 'mobile simulation preserves full-card touch targets');

    const errorRecords = consoleRecords.filter((record) =>
        record.type === 'error' || record.type === 'pageerror');
    check(errorRecords.length === 0, 'browser console has no errors', errorRecords);
    check(requestFailures.length === 0, 'browser has no failed requests', requestFailures);
    check(response404s.length === 0, 'browser has no resource 404 responses', response404s);
} catch (error) {
    fatalError = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
} finally {
    if (browser) await browser.close();
}

const failedChecks = checks.filter((item) => !item.pass);
const result = {
    batch: 'v1.2.0-dev-art10-ui-clarity06',
    previewUrl,
    outputDir,
    summary: {
        total: checks.length,
        passed: checks.length - failedChecks.length,
        failed: failedChecks.length,
    },
    checks,
    snapshots,
    consoleRecords,
    requestFailures,
    response404s,
    fatalError,
};
const reportPath = path.join(outputDir, 'level_select_runtime_audit.json');
fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ reportPath, summary: result.summary, fatalError }, null, 2));
if (fatalError || failedChecks.length > 0) process.exitCode = 1;
