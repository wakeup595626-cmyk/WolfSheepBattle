import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/level04-02/screenshots/level04');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7477';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
const snapshots = {};
const check = (condition, message, detail = undefined) => {
    checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
};
const approximately = (actual, expected, tolerance = 0.035) =>
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;

let browser;
let fatalError;

try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
        localStorage.removeItem('wolf-sheep-battle.progress.v2');
        localStorage.setItem('wolf-sheep-battle.v1.highest-unlocked-level', '3');
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
    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(4200);

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
            const controller = nodes.flatMap((node) => node.components).find((component) => component
                && component.startPanel && component.rightControlBar
                && typeof component.getUnitMovementDistance === 'function');
            if (!controller) throw new Error('GameController is unavailable');
            return new Function('cc', 'controller', 'argument',
                `return (${callbackSource})(cc, controller, argument);`)(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    await withController((_cc, controller) => {
        controller.currentLevel = 4;
        controller.specialRoadTutorialSeen = true;
        controller.freezeUnlocked = true;
        controller.selectedTactics = ['sprint', 'heal', 'shock'];
        controller.beginBattle();
    });
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const deckVisible = await withController((_cc, controller) => controller.tacticDeckPanel.active);
        if (deckVisible) break;
        await page.waitForTimeout(120);
    }

    snapshots.deckToggle = await withController((_cc, controller) => {
        const initial = [...controller.pendingDeckSelection];
        controller.toggleTacticDeckOption('sprint');
        const afterCancel = {
            selected: [...controller.pendingDeckSelection],
            hint: controller.tacticDeckHintLabel.string,
            scale: [controller.tacticDeckOptions.get('sprint').root.scale.x,
                controller.tacticDeckOptions.get('sprint').root.scale.y],
        };
        controller.toggleTacticDeckOption('freeze');
        const afterAdd = {
            selected: [...controller.pendingDeckSelection],
            hint: controller.tacticDeckHintLabel.string,
            freezeScale: [controller.tacticDeckOptions.get('freeze').root.scale.x,
                controller.tacticDeckOptions.get('freeze').root.scale.y],
            check: controller.tacticDeckOptions.get('freeze').checkLabel.string,
        };
        controller.toggleTacticDeckOption('sprint');
        const full = [...controller.pendingDeckSelection];
        controller.toggleTacticDeckOption('sprint');
        const maxBlocked = {
            selected: [...controller.pendingDeckSelection],
            hint: controller.tacticDeckHintLabel.string,
        };
        controller.toggleTacticDeckOption('freeze');
        const afterSecondCancel = [...controller.pendingDeckSelection];
        controller.confirmTacticDeckSelection();
        const blockedAtTwo = controller.tacticDeckPanel.active && !controller.isStarted;
        controller.toggleTacticDeckOption('freeze');
        controller.confirmTacticDeckSelection();
        return {
            initial,
            afterCancel,
            afterAdd,
            full,
            maxBlocked,
            afterSecondCancel,
            blockedAtTwo,
            selectedTactics: [...controller.selectedTactics],
            persisted: JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2') ?? 'null'),
            deckActive: controller.tacticDeckPanel.active,
            isStarted: controller.isStarted,
        };
    });
    check(snapshots.deckToggle.afterCancel.selected.length === 2
        && snapshots.deckToggle.afterCancel.hint.includes('还需选择 1 张')
        && snapshots.deckToggle.afterCancel.scale.every((value) => approximately(value, 1, 0.001)),
    'selected deck card toggles off and immediately reports the remaining selection count', snapshots.deckToggle.afterCancel);
    check(snapshots.deckToggle.afterAdd.selected.length === 3
        && snapshots.deckToggle.afterAdd.freezeScale.every((value) => approximately(value, 1.03, 0.001))
        && snapshots.deckToggle.afterAdd.check === '✓',
    'unselected deck card toggles on with checkmark and 1.03 highlight scale', snapshots.deckToggle.afterAdd);
    check(snapshots.deckToggle.full.length === 3
        && snapshots.deckToggle.maxBlocked.selected.length === 3
        && snapshots.deckToggle.maxBlocked.hint.includes('请先取消一张。'),
    'fourth deck card never replaces an existing choice automatically', snapshots.deckToggle.maxBlocked);
    check(snapshots.deckToggle.afterSecondCancel.length === 2 && snapshots.deckToggle.blockedAtTwo,
        'start battle remains unavailable until exactly three tactics are selected', snapshots.deckToggle);
    check(snapshots.deckToggle.isStarted && !snapshots.deckToggle.deckActive
        && snapshots.deckToggle.persisted?.selectedTactics?.length === 3,
    'valid deck selection starts battle and saves the three-card loadout', snapshots.deckToggle);
    await page.screenshot({ path: path.join(outputDir, 'level04_deck_toggle_1280x720.png'), fullPage: true });

    snapshots.unitToggle = await withController((cc, controller) => {
        controller.playerEnergy = 100;
        controller.selectedSheepType = 'small';
        controller.refreshHud();
        const small = controller.typeButtons.get('small').node;
        small.emit(cc.Node.EventType.TOUCH_END);
        const cancelled = {
            selected: controller.selectedSheepType ?? null,
            energy: controller.playerEnergy,
            units: controller.units.length,
        };
        controller.trySpawnPlayerUnit(0);
        const afterUnselectedLaneClick = {
            energy: controller.playerEnergy,
            units: controller.units.length,
            status: controller.statusMessage,
        };
        const medium = controller.typeButtons.get('medium').node;
        medium.emit(cc.Node.EventType.TOUCH_END);
        const selectedMedium = controller.selectedSheepType;
        medium.emit(cc.Node.EventType.TOUCH_END);
        const cancelledMedium = controller.selectedSheepType ?? null;
        controller.playerEnergy = 0;
        const giant = controller.typeButtons.get('giant').node;
        giant.emit(cc.Node.EventType.TOUCH_START);
        giant.emit(cc.Node.EventType.TOUCH_END);
        return {
            cancelled,
            afterUnselectedLaneClick,
            selectedMedium,
            cancelledMedium,
            insufficientSelected: controller.selectedSheepType ?? null,
            giantState: controller.typeButtons.get('giant').visualState,
        };
    });
    check(snapshots.unitToggle.cancelled.selected === null
        && snapshots.unitToggle.afterUnselectedLaneClick.energy === snapshots.unitToggle.cancelled.energy
        && snapshots.unitToggle.afterUnselectedLaneClick.units === snapshots.unitToggle.cancelled.units
        && snapshots.unitToggle.afterUnselectedLaneClick.status.includes('请先选择出兵单位'),
    'clicking the selected unit card cancels deployment and lane taps cannot spend energy', snapshots.unitToggle);
    check(snapshots.unitToggle.selectedMedium === 'medium' && snapshots.unitToggle.cancelledMedium === null,
        'a different unit card selects directly and a second tap cancels it', snapshots.unitToggle);
    check(snapshots.unitToggle.insufficientSelected === null && snapshots.unitToggle.giantState === 'insufficient',
        'insufficient-energy unit cards never become temporarily selected', snapshots.unitToggle);

    snapshots.freezeToggle = await withController((cc, controller) => {
        controller.playerEnergy = 100;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(1);
        const source = controller.units.find((unit) => unit.team === 0 && unit.lane === 1);
        if (!source || !controller.spawnUnit(1, 1, source.definition)) throw new Error('freeze test setup failed');
        const ai = controller.units.find((unit) => unit.team === 1 && unit.lane === 1);
        controller.playerSupply = 5;
        controller.playerFreezeCooldown = 0;
        const freezeTouch = controller.playerFreezeCard.touchArea;
        freezeTouch.emit(cc.Node.EventType.TOUCH_START);
        freezeTouch.emit(cc.Node.EventType.TOUCH_END);
        const afterFirst = {
            active: controller.freezeLaneSelectionActive,
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
            highlights: controller.freezeLaneHighlightNodes.map((node) => node.active),
        };
        controller.playerFreezeCard.lastActivationTimeMs = Number.NEGATIVE_INFINITY;
        freezeTouch.emit(cc.Node.EventType.TOUCH_START);
        freezeTouch.emit(cc.Node.EventType.TOUCH_END);
        const afterSecond = {
            active: controller.freezeLaneSelectionActive,
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
            highlights: controller.freezeLaneHighlightNodes.map((node) => node.active),
        };
        controller.toggleFreezeLaneSelection();
        controller.freezeSelectionCancelLayer.emit(cc.Node.EventType.TOUCH_END);
        const afterBlank = {
            active: controller.freezeLaneSelectionActive,
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
            highlights: controller.freezeLaneHighlightNodes.map((node) => node.active),
        };
        controller.toggleFreezeLaneSelection();
        controller.tryConfirmFreezeLane(0);
        const afterEmptyLane = {
            active: controller.freezeLaneSelectionActive,
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
        };
        controller.playerHealCard.touchArea.emit(cc.Node.EventType.TOUCH_START);
        controller.playerHealCard.touchArea.emit(cc.Node.EventType.TOUCH_END);
        const afterOtherCard = {
            active: controller.freezeLaneSelectionActive,
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
        };
        controller.toggleFreezeLaneSelection();
        controller.tryConfirmFreezeLane(1);
        return {
            afterFirst,
            afterSecond,
            afterBlank,
            afterEmptyLane,
            afterOtherCard,
            valid: {
                supply: controller.playerSupply,
                cooldown: controller.playerFreezeCooldown,
                frozenRemaining: ai.frozenRemaining,
                visual: ai.freezeVisualNode.active,
                footRing: ai.freezeFootRingNode.active,
                snow: ai.freezeSnowNode.active,
                status: ai.freezeStatusIconNode.active,
                rootScale: [ai.node.scale.x, ai.node.scale.y, ai.node.scale.z],
                activeKinds: controller.activeBattleVfx.map((effect) => effect.kind),
                transientParticles: controller.activeBattleVfx.reduce((sum, effect) => sum + effect.particleCount, 0),
            },
        };
    });
    check(snapshots.freezeToggle.afterFirst.active && snapshots.freezeToggle.afterFirst.supply === 5
        && snapshots.freezeToggle.afterFirst.cooldown === 0 && snapshots.freezeToggle.afterFirst.highlights.every(Boolean),
    'first road-freeze card tap enters target selection without cost or cooldown', snapshots.freezeToggle.afterFirst);
    check(!snapshots.freezeToggle.afterSecond.active && snapshots.freezeToggle.afterSecond.supply === 5
        && snapshots.freezeToggle.afterSecond.cooldown === 0 && snapshots.freezeToggle.afterSecond.highlights.every((value) => !value),
    'second road-freeze card tap cancels selection and clears every lane highlight', snapshots.freezeToggle.afterSecond);
    check(!snapshots.freezeToggle.afterBlank.active && snapshots.freezeToggle.afterBlank.supply === 5
        && snapshots.freezeToggle.afterBlank.cooldown === 0 && snapshots.freezeToggle.afterBlank.highlights.every((value) => !value),
    'tapping a blank battle area cancels road-freeze targeting without cost or cooldown', snapshots.freezeToggle.afterBlank);
    check(snapshots.freezeToggle.afterEmptyLane.active && snapshots.freezeToggle.afterEmptyLane.supply === 5
        && snapshots.freezeToggle.afterEmptyLane.cooldown === 0,
    'empty road remains non-consuming and stays in reversible target selection', snapshots.freezeToggle.afterEmptyLane);
    check(!snapshots.freezeToggle.afterOtherCard.active && snapshots.freezeToggle.afterOtherCard.supply === 5
        && snapshots.freezeToggle.afterOtherCard.cooldown === 0,
    'tapping another tactic cancels outstanding freeze targeting without a state leak', snapshots.freezeToggle.afterOtherCard);
    check(snapshots.freezeToggle.valid.supply === 2 && approximately(snapshots.freezeToggle.valid.cooldown, 12)
        && approximately(snapshots.freezeToggle.valid.frozenRemaining, 3)
        && snapshots.freezeToggle.valid.visual && snapshots.freezeToggle.valid.footRing
        && snapshots.freezeToggle.valid.snow && snapshots.freezeToggle.valid.status
        && snapshots.freezeToggle.valid.rootScale.every((value) => approximately(value, 1, 0.001))
        && snapshots.freezeToggle.valid.activeKinds.includes('freeze-cast-wave')
        && snapshots.freezeToggle.valid.activeKinds.includes('freeze-unit-burst'),
    'valid freeze keeps logic root unchanged while mounting the upgraded visual feedback', snapshots.freezeToggle.valid);
    await page.screenshot({ path: path.join(outputDir, 'level04_freeze_cast_1280x720.png'), fullPage: true });

    await withController((_cc, controller) => controller.pauseGame());
    const freezeBeforePause = await withController((_cc, controller) => ({
        frozen: controller.units.find((unit) => unit.team === 1 && unit.lane === 1)?.frozenRemaining ?? -1,
        effectElapsed: controller.activeBattleVfx.map((effect) => effect.elapsed),
    }));
    await page.waitForTimeout(620);
    const freezeDuringPause = await withController((_cc, controller) => ({
        frozen: controller.units.find((unit) => unit.team === 1 && unit.lane === 1)?.frozenRemaining ?? -1,
        effectElapsed: controller.activeBattleVfx.map((effect) => effect.elapsed),
    }));
    check(approximately(freezeBeforePause.frozen, freezeDuringPause.frozen, 0.03)
        && JSON.stringify(freezeBeforePause.effectElapsed.map((value) => value.toFixed(3)))
            === JSON.stringify(freezeDuringPause.effectElapsed.map((value) => value.toFixed(3))),
    'pause freezes both road-freeze logic time and manual VFX time', { freezeBeforePause, freezeDuringPause });
    await withController((_cc, controller) => controller.resumeGame());
    await page.waitForTimeout(3400);
    snapshots.freezeEnd = await withController((_cc, controller) => {
        const ai = controller.units.find((unit) => unit.team === 1 && unit.lane === 1);
        return ai ? {
            frozen: ai.frozenRemaining,
            visual: ai.freezeVisualNode.active,
            footRing: ai.freezeFootRingNode.active,
            snow: ai.freezeSnowNode.active,
            status: ai.freezeStatusIconNode.active,
            moveDistance: controller.getUnitMovementDistance(ai, 1),
            activeBattleVfx: controller.activeBattleVfx.map((effect) => effect.kind),
        } : { removed: true };
    });
    check(snapshots.freezeEnd.removed || (snapshots.freezeEnd.frozen === 0
        && !snapshots.freezeEnd.visual && !snapshots.freezeEnd.footRing
        && !snapshots.freezeEnd.snow && !snapshots.freezeEnd.status
        && approximately(snapshots.freezeEnd.moveDistance, 11.2)),
    'freeze ends with clean visual release and correct mud-adjusted movement restoration', snapshots.freezeEnd);

    snapshots.vfxCaps = await withController((_cc, controller) => {
        controller.clearBattleVfx();
        const template = controller.units.find((unit) => unit.team === 0) ?? controller.dyingUnits[0];
        if (!template) throw new Error('missing VFX test unit');
        for (let index = 0; index < 24; index += 1) controller.createMudEntryVfx(template);
        const mudCount = controller.activeBattleVfx.filter((effect) => effect.kind === 'mud-entry' || effect.kind === 'mud-trail').length;
        template.frozenRemaining = 3;
        for (let index = 0; index < 16; index += 1) controller.createFreezeUnitBurstVfx(template);
        const freezeParticles = controller.units.filter((unit) => unit.frozenRemaining > 0).length * 4
            + controller.activeBattleVfx.filter((effect) => effect.kind === 'freeze-unit-burst' || effect.kind === 'freeze-shatter')
                .reduce((sum, effect) => sum + effect.particleCount, 0);
        controller.restartGame();
        return {
            mudCount,
            freezeParticles,
            activeAfterRestart: controller.activeBattleVfx.length,
            poolSize: controller.battleVfxPool.length,
            selectedSheepType: controller.selectedSheepType,
            freezeSelectionActive: controller.freezeLaneSelectionActive,
        };
    });
    check(snapshots.vfxCaps.mudCount <= 16 && snapshots.vfxCaps.freezeParticles <= 40,
        'mud and freeze visual effects respect the configured per-lane and global particle limits', snapshots.vfxCaps);
    check(snapshots.vfxCaps.activeAfterRestart === 0 && !snapshots.vfxCaps.freezeSelectionActive,
        'restart clears all temporary VFX and targeting state while retaining pooled nodes only', snapshots.vfxCaps);

    await withController((_cc, controller) => {
        controller.currentLevel = 1;
        controller.restartGame();
        controller.activateBattle();
        controller.playerEnergy = 100;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(0);
        controller.pauseGame();
        controller.resumeGame();
    });
    await page.waitForTimeout(400);
    snapshots.regression = await withController((_cc, controller) => ({
        level: controller.currentLevel,
        units: controller.units.length,
        selectedTactics: [...controller.getActiveTacticDeck()],
        laneTypes: [...controller.getCurrentLevelConfig().laneTypes],
        freezeSelectionActive: controller.freezeLaneSelectionActive,
    }));
    check(snapshots.regression.level === 1 && snapshots.regression.units >= 1
        && JSON.stringify(snapshots.regression.selectedTactics) === JSON.stringify(['sprint', 'heal', 'shock'])
        && snapshots.regression.laneTypes.every((type) => type === 'normal')
        && !snapshots.regression.freezeSelectionActive,
    'levels 1-3 retain the fixed three-card setup and normal-road battle flow', snapshots.regression);

    check(consoleProblems.filter((entry) => entry.type === 'error' || entry.type === 'pageerror').length === 0,
        'runtime console has no errors', consoleProblems);
    check(requestFailures.length === 0, 'runtime has no failed requests', requestFailures);
    check(response404s.length === 0, 'runtime has no resource 404 responses', response404s);
    await page.close();
} catch (error) {
    fatalError = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
} finally {
    if (browser) await browser.close();
}

const passed = !fatalError && checks.every((entry) => entry.pass);
const report = { passed, fatalError, checks, snapshots, consoleProblems, requestFailures, response404s };
fs.writeFileSync(path.join(outputDir, 'level04_02_runtime_audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!passed) process.exitCode = 1;
