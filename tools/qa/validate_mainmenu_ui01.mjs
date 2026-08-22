import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/mainmenu-ui01/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7521';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
const snapshots = {};
const check = (condition, message, detail = undefined) => {
    checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
};

let browser;
let fatalError;

const inspectPage = async (page) => {
    const withController = async (callback, argument = undefined) => page.evaluate(
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
                .find((component) => typeof component.refreshStartPanel === 'function'
                    && typeof component.showLevelSelect === 'function');
            if (!controller) throw new Error('updated GameController component was not found');
            return Function('cc', 'controller', 'argument',
                `return (${callbackSource})(cc, controller, argument);`)(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(6500);
    for (let attempt = 0; attempt < 30; attempt += 1) {
        const ready = await withController((_cc, controller) => Boolean(
            controller.startPanel?.active
            && controller.formalUiFont
            && (!controller.artLoadingPanel || !controller.artLoadingPanel.active),
        ));
        if (ready) break;
        await page.waitForTimeout(250);
    }
    // The attention animation intentionally runs for 3 x 0.7s after the menu becomes visible.
    await page.waitForTimeout(2300);

    const snapshot = await withController((cc, controller) => {
        const rect = (node) => {
            const value = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { xMin: value.xMin, xMax: value.xMax, yMin: value.yMin, yMax: value.yMax };
        };
        const labelInfo = (label) => ({
            text: label.string,
            fontSize: label.fontSize,
            useSystemFont: label.useSystemFont,
            fontName: label.font?.name ?? label.font?._name ?? '',
        });
        const buttonInfo = (view) => {
            const size = view.node.getComponent(cc.UITransform).contentSize;
            return {
                size: { width: size.width, height: size.height },
                position: { x: view.node.position.x, y: view.node.position.y },
                scale: { x: view.node.scale.x, y: view.node.scale.y },
                rect: rect(view.node),
                role: view.role,
                label: labelInfo(view.label),
            };
        };
        return {
            startPanelActive: controller.startPanel.active,
            caption: labelInfo(controller.startCurrentLevelCaptionLabel),
            selectedLevel: labelInfo(controller.startSelectedLevelLabel),
            selectButton: buttonInfo(controller.startLevelSelectButton),
            selectSubtitle: labelInfo(controller.startLevelSelectSubtitleLabel),
            battleButton: buttonInfo(controller.startBattleButton),
            pulsePlayed: controller.startLevelSelectPulsePlayed,
            actionLocked: controller.startMenuActionLocked,
        };
    });

    return { withController, snapshot };
};

try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const context = await browser.newContext();
    const page = await context.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
        localStorage.removeItem('wolf-sheep-battle.progress.v2');
        localStorage.removeItem('wolf-sheep-battle.v1.highest-unlocked-level');
    });
    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
            consoleProblems.push({ type: message.type(), text: message.text() });
        }
    });
    page.on('pageerror', (error) => consoleProblems.push({ type: 'pageerror', text: error.message }));
    page.on('requestfailed', (request) => requestFailures.push({
        url: request.url(), failure: request.failure()?.errorText ?? 'unknown',
    }));
    page.on('response', (response) => {
        if (response.status() === 404) response404s.push(response.url());
    });

    const initial = await inspectPage(page);
    snapshots.initial1280 = initial.snapshot;
    await page.screenshot({ path: path.join(outputDir, 'mainmenu_hierarchy_1280x720.png') });

    const select = initial.snapshot.selectButton;
    const battle = initial.snapshot.battleButton;
    const verticalGap = select.rect.yMin - battle.rect.yMax;
    check(initial.snapshot.startPanelActive, 'main menu is visible after loading');
    check(initial.snapshot.caption.text === '当前关卡', 'current-level caption is separate');
    check(initial.snapshot.selectedLevel.text === '第1关 · 教学节奏', 'fresh save shows the first selected level');
    check(select.label.text === '选择／切换关卡', 'primary entry uses the requested label');
    check(initial.snapshot.selectSubtitle.text === '查看全部关卡', 'primary entry shows its helper label');
    check(battle.label.text === '开始挑战', 'challenge button no longer repeats a level number');
    check(select.size.width === 380 && select.size.height === 70, 'level-select button is 380x70');
    check(battle.size.width === 340 && battle.size.height === 58, 'challenge button is 340x58');
    check(select.role === 'primary' && battle.role === 'secondary', 'visual hierarchy assigns primary role to level select');
    check(select.position.y > battle.position.y && verticalGap >= 14 && verticalGap <= 18,
        'buttons are ordered with a 14-18px vertical gap', { verticalGap });
    check(select.size.width > battle.size.width && select.size.height > battle.size.height,
        'level-select entry is visibly larger than challenge');
    check(initial.snapshot.pulsePlayed && select.scale.x === 1 && select.scale.y === 1,
        'three-cycle attention pulse finishes at scale 1');
    for (const [name, label] of Object.entries({
        caption: initial.snapshot.caption,
        selectedLevel: initial.snapshot.selectedLevel,
        selectTitle: select.label,
        selectSubtitle: initial.snapshot.selectSubtitle,
        challenge: battle.label,
    })) {
        check(!label.useSystemFont && label.fontName.includes('ui_font_cn_subset_runtime_v02'),
            `${name} uses the unified formal Chinese font`, label);
    }

    snapshots.repeatLocks = await initial.withController((_cc, controller) => {
        const originalShow = controller.showLevelSelect;
        const originalBegin = controller.beginBattle;
        let showCalls = 0;
        let battleCalls = 0;
        controller.startPanel.active = true;
        controller.startMenuActionLocked = false;
        controller.showLevelSelect = () => { showCalls += 1; };
        controller.requestStartLevelSelect();
        controller.requestStartLevelSelect();
        controller.showLevelSelect = originalShow;
        controller.startMenuActionLocked = false;
        controller.beginBattle = () => { battleCalls += 1; };
        controller.requestStartBattle();
        controller.requestStartBattle();
        controller.beginBattle = originalBegin;
        controller.startMenuActionLocked = false;
        return { showCalls, battleCalls };
    });
    check(snapshots.repeatLocks.showCalls === 1, 'rapid level-select taps create only one modal request');
    check(snapshots.repeatLocks.battleCalls === 1, 'rapid challenge taps start only one battle request');

    snapshots.levelSelection = await initial.withController((_cc, controller) => {
        controller.showLevelSelect();
        controller.selectLevel(5);
        const duringSelection = {
            levelSelectActive: controller.levelSelectPanel.active,
            startPanelActive: controller.startPanel.active,
            currentLevel: controller.currentLevel,
            isStarted: controller.isStarted,
        };
        controller.returnToStartPanel();
        const saved = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2') ?? '{}');
        return {
            duringSelection,
            afterReturn: {
                levelSelectActive: controller.levelSelectPanel.active,
                startPanelActive: controller.startPanel.active,
                selectedText: controller.startSelectedLevelLabel.string,
                currentLevel: controller.currentLevel,
                savedLevelId: saved.selectedLevelId,
            },
        };
    });
    check(snapshots.levelSelection.duringSelection.levelSelectActive
        && !snapshots.levelSelection.duringSelection.isStarted,
    'selecting a level keeps the selection panel open and does not start battle');
    check(snapshots.levelSelection.afterReturn.selectedText === '第5关 · 无限火力',
        'returning to main menu shows the selected level immediately');
    check(snapshots.levelSelection.afterReturn.savedLevelId === 5,
        'selected level persists in the existing v2 save object');
    await page.screenshot({ path: path.join(outputDir, 'mainmenu_level05_selected_1280x720.png') });

    const widePage = await context.newPage({ viewport: { width: 1600, height: 720 }, deviceScaleFactor: 1 });
    widePage.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
            consoleProblems.push({ type: message.type(), text: message.text() });
        }
    });
    widePage.on('pageerror', (error) => consoleProblems.push({ type: 'pageerror', text: error.message }));
    const wide = await inspectPage(widePage);
    snapshots.wide1600 = wide.snapshot;
    await widePage.screenshot({ path: path.join(outputDir, 'mainmenu_hierarchy_1600x720.png') });
    check(wide.snapshot.selectButton.size.width === 380 && wide.snapshot.battleButton.size.width === 340,
        '20:9 landscape keeps button proportions');
    check(wide.snapshot.selectedLevel.text === '第5关 · 无限火力',
        'wide layout restores the persisted selected level');

    const ignoredWarnings = /The AudioContext was not allowed to start|Autoplay is only allowed/i;
    const unexpectedConsoleProblems = consoleProblems.filter((item) => !ignoredWarnings.test(item.text));
    check(unexpectedConsoleProblems.length === 0, 'runtime console has no new error or warning', unexpectedConsoleProblems);
    check(requestFailures.length === 0, 'runtime has no failed requests', requestFailures);
    check(response404s.length === 0, 'runtime has no resource 404', response404s);
} catch (error) {
    fatalError = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
} finally {
    await browser?.close();
}

const result = {
    batch: 'v1.2.0-dev-mainmenu-ui01',
    previewUrl,
    checks,
    snapshots,
    consoleProblems,
    requestFailures,
    response404s,
    fatalError,
    pass: !fatalError && checks.length > 0 && checks.every((item) => item.pass),
};
fs.writeFileSync(path.join(outputDir, 'mainmenu_ui01_runtime_audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
