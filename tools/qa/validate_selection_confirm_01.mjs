import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/selection-confirm-01/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7481';
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

try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
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
                .find((component) => typeof component.selectUnitType === 'function'
                    && typeof component.tryDeploySelectedUnit === 'function'
                    && typeof component.confirmSelectedLevel === 'function');
            if (!controller) throw new Error('updated GameController component was not found');
            return Function('cc', 'controller', 'argument',
                `return (${callbackSource})(cc, controller, argument);`)(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(5000);

    snapshots.lowEnergySelection = await withController((cc, controller) => {
        controller.restartGame();
        controller.isStarted = true;
        controller.isPaused = false;
        controller.isFinished = false;
        controller.startPanel.active = false;
        controller.levelSelectPanel.active = false;
        controller.clearBattleUnits();
        controller.playerEnergy = 10;
        controller.selectedSheepType = undefined;
        controller.refreshHud();
        const selections = [];
        for (const type of ['small', 'medium', 'large', 'giant']) {
            const node = controller.typeButtons.get(type).node;
            node.emit(cc.Node.EventType.TOUCH_START);
            node.emit(cc.Node.EventType.TOUCH_END);
            selections.push({
                type,
                selected: controller.selectedSheepType,
                energy: controller.playerEnergy,
                selectedCards: [...controller.typeButtons.entries()]
                    .filter(([, view]) => view.visualState === 'selected')
                    .map(([key]) => key),
                visualState: controller.typeButtons.get(type).visualState,
                status: controller.typeButtons.get(type).stateLabel.string,
                statusColor: [
                    controller.typeButtons.get(type).stateLabel.color.r,
                    controller.typeButtons.get(type).stateLabel.color.g,
                    controller.typeButtons.get(type).stateLabel.color.b,
                ],
                selectionVisible: controller.typeButtons.get(type).artSelectionGraphics?.node.active ?? false,
            });
        }
        return { selections };
    });
    check(snapshots.lowEnergySelection.selections.every((entry) => entry.selected === entry.type
        && entry.energy === 10 && entry.selectedCards.length === 1
        && entry.selectedCards[0] === entry.type && entry.visualState === 'selected'),
    'all four unit cards can be selected at 10 energy and selection remains exclusive',
    snapshots.lowEnergySelection);
    check(snapshots.lowEnergySelection.selections.slice(1).every((entry) => entry.status === '能量不足'
        && entry.statusColor[0] > entry.statusColor[1]),
    'selected unaffordable cards keep the yellow selection state while showing an orange-red energy warning',
    snapshots.lowEnergySelection.selections);
    await page.screenshot({ path: path.join(outputDir, 'giant_selected_at_10_energy_1280x720.png'), fullPage: true });

    snapshots.deployGuard = await withController((_cc, controller) => {
        controller.clearBattleUnits();
        controller.playerEnergy = 10;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'giant';
        controller.refreshHud();
        const before = {
            energy: controller.playerEnergy,
            units: controller.units.length,
            laneCounts: [0, 1, 2, 3].map((lane) => controller.getLaneUnitCount(0, lane)),
        };
        const attempts = [];
        for (let lane = 0; lane < 4; lane += 1) {
            controller.playerSpawnCooldown = 0;
            controller.tryDeploySelectedUnit(lane);
            attempts.push({
                lane,
                energy: controller.playerEnergy,
                units: controller.units.length,
                laneCount: controller.getLaneUnitCount(0, lane),
                status: controller.statusMessage,
                selected: controller.selectedSheepType,
            });
        }
        controller.playerEnergy = 70;
        controller.refreshHud();
        const ready = {
            selected: controller.selectedSheepType,
            visualState: controller.typeButtons.get('giant').visualState,
            status: controller.typeButtons.get('giant').stateLabel.string,
        };
        controller.playerSpawnCooldown = 0;
        controller.tryDeploySelectedUnit(0);
        const afterSuccess = {
            energy: controller.playerEnergy,
            units: controller.units.length,
            laneCount: controller.getLaneUnitCount(0, 0),
            selected: controller.selectedSheepType,
        };
        return { before, attempts, ready, afterSuccess };
    });
    check(snapshots.deployGuard.attempts.every((entry) => entry.energy === 10
        && entry.units === 0 && entry.laneCount === 0
        && entry.status === '能量不足，还差60点' && entry.selected === 'giant'),
    'four insufficient-energy lane attempts do not spend energy, spawn units, or leave queue occupants',
    snapshots.deployGuard.attempts);
    check(snapshots.deployGuard.ready.selected === 'giant'
        && snapshots.deployGuard.ready.visualState === 'selected'
        && snapshots.deployGuard.ready.status === '可用',
    'energy recovery changes availability automatically without clearing the giant selection',
    snapshots.deployGuard.ready);
    check(snapshots.deployGuard.afterSuccess.energy === 0
        && snapshots.deployGuard.afterSuccess.units === 1
        && snapshots.deployGuard.afterSuccess.laneCount === 1
        && snapshots.deployGuard.afterSuccess.selected === 'giant',
    'successful deployment spends the configured cost and preserves the selected unit type',
    snapshots.deployGuard.afterSuccess);

    snapshots.toggle = await withController((cc, controller) => {
        controller.clearBattleUnits();
        controller.playerEnergy = 10;
        controller.selectedSheepType = undefined;
        controller.refreshHud();
        const states = [];
        const tap = (type) => {
            const node = controller.typeButtons.get(type).node;
            node.emit(cc.Node.EventType.TOUCH_END);
            states.push(controller.selectedSheepType ?? null);
        };
        tap('small');
        tap('small');
        tap('medium');
        tap('large');
        return { states, selectedCount: [...controller.typeButtons.values()]
            .filter((view) => view.visualState === 'selected').length };
    });
    check(JSON.stringify(snapshots.toggle.states) === JSON.stringify(['small', null, 'medium', 'large'])
        && snapshots.toggle.selectedCount === 1,
    're-tapping cancels selection and tapping another card switches selection without energy gating',
    snapshots.toggle);

    snapshots.levelSelection = await withController((cc, controller) => {
        controller.isStarted = false;
        controller.isPaused = false;
        controller.currentLevel = 1;
        controller.showLevelSelect();
        const rows = [];
        for (const levelId of [1, 2, 3, 4]) {
            controller.levelCards.get(levelId).touchArea.emit(cc.Node.EventType.TOUCH_START);
            controller.levelCards.get(levelId).touchArea.emit(cc.Node.EventType.TOUCH_END);
            rows.push({
                levelId,
                currentLevel: controller.currentLevel,
                pendingLevel: controller.pendingLevelSelection,
                panelActive: controller.levelSelectPanel.active,
                isStarted: controller.isStarted,
                confirmText: controller.levelSelectConfirmButton.label.string,
                selectedCards: [...controller.levelCards.values()]
                    .filter((card) => card.visualState === 'selected')
                    .map((card) => card.levelId),
                stateLabel: controller.levelCards.get(levelId).stateLabel.string,
            });
        }
        return { rows };
    });
    check(snapshots.levelSelection.rows.every((row) => row.currentLevel === 1
        && row.pendingLevel === row.levelId && row.panelActive && !row.isStarted
        && row.confirmText === `开始挑战第${row.levelId}关`
        && row.selectedCards.length === 1 && row.selectedCards[0] === row.levelId
        && row.stateLabel === '当前选择'),
    'level 1-4 taps only change the pending highlighted selection and update the confirmation label',
    snapshots.levelSelection.rows);
    await page.screenshot({ path: path.join(outputDir, 'level_select_confirm_level4_1280x720.png'), fullPage: true });

    snapshots.confirmLock = await withController((_cc, controller) => {
        const originalRestart = controller.restartGame.bind(controller);
        const originalBegin = controller.beginBattle.bind(controller);
        const results = [];
        for (const levelId of [1, 2, 3, 4]) {
            let restartCalls = 0;
            let beginCalls = 0;
            controller.pendingLevelSelection = levelId;
            controller.levelSelectStartLocked = false;
            controller.levelSelectPanel.active = true;
            controller.restartGame = () => { restartCalls += 1; };
            controller.beginBattle = () => { beginCalls += 1; };
            controller.confirmSelectedLevel();
            controller.confirmSelectedLevel();
            results.push({
                levelId,
                currentLevel: controller.currentLevel,
                restartCalls,
                beginCalls,
                locked: controller.levelSelectStartLocked,
                panelActive: controller.levelSelectPanel.active,
            });
        }
        controller.restartGame = originalRestart;
        controller.beginBattle = originalBegin;
        return { results };
    });
    check(snapshots.confirmLock.results.every((result) => result.currentLevel === result.levelId
        && result.restartCalls === 1 && result.beginCalls === 1
        && result.locked && !result.panelActive),
    'confirmation applies the pending level once and rejects a repeated activation', snapshots.confirmLock);

    check(consoleProblems.length === 0, 'runtime console has no new errors or warnings', consoleProblems);
    check(requestFailures.length === 0, 'runtime has no failed network requests', requestFailures);
    check(response404s.length === 0, 'runtime has no HTTP 404 resources', response404s);
} catch (error) {
    fatalError = error instanceof Error ? `${error.stack ?? error.message}` : String(error);
} finally {
    if (browser) await browser.close();
}

const result = {
    previewUrl,
    generatedAt: new Date().toISOString(),
    passed: !fatalError && checks.every((item) => item.pass),
    fatalError,
    checks,
    consoleProblems,
    requestFailures,
    response404s,
    snapshots,
};
fs.writeFileSync(path.join(outputDir, 'selection_confirm_runtime_audit.json'),
    `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
    passed: result.passed,
    checks: checks.length,
    failed: checks.filter((item) => !item.pass).map((item) => item.message),
    fatalError,
}, null, 2));
if (!result.passed) process.exitCode = 1;
