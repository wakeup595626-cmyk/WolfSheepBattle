import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/level-free-unit-badge-01/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7456';
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
                .find((component) => typeof component.showLevelSelect === 'function'
                    && typeof component.spawnUnit === 'function');
            if (!controller) throw new Error('GameController component was not found');
            return Function('cc', 'controller', 'argument',
                `return (${callbackSource})(cc, controller, argument);`)(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(5000);

    const auditLevelCards = (_cc, controller) => ({
        currentLevel: controller.currentLevel,
        highestUnlockedLevel: controller.highestUnlockedLevel,
        progress: controller.levelSelectProgressLabel.string,
        hint: controller.levelSelectHintLabel.string,
        completed: [...controller.completedLevels].sort(),
        selectedTactics: [...controller.selectedTactics],
        cards: [...controller.levelCards.values()].map((card) => ({
            id: card.levelId,
            state: card.visualState,
            label: card.stateLabel.string,
            completed: card.completed,
            scale: [card.root.scale.x, card.root.scale.y],
        })),
    });

    await withController((_cc, controller) => {
        controller.highestUnlockedLevel = 1;
        controller.currentLevel = 1;
        controller.showLevelSelect();
    });
    snapshots.fresh = await withController(auditLevelCards);
    await page.screenshot({ path: path.join(outputDir, 'level_select_all_free_1280x720.png'), fullPage: true });
    check(snapshots.fresh.cards.length === 4, 'all four implemented level cards are present', snapshots.fresh);
    check(snapshots.fresh.cards.map((card) => card.state).join(',')
        === 'selected,available,available,available',
    'fresh storage leaves levels 2-4 available even when legacy high-water mark is 1', snapshots.fresh.cards);
    check(snapshots.fresh.cards.map((card) => card.label).join(',')
        === '当前选择,未通关,未通关,未通关',
    'level cards distinguish current selection and playable uncompleted levels', snapshots.fresh.cards);
    check(snapshots.fresh.progress === '已通关  0/4'
        && snapshots.fresh.hint.includes('也可直接挑战'),
    'progress is completion-only and no longer describes unlock progression', snapshots.fresh);

    snapshots.directLevelFour = await withController((_cc, controller) => {
        controller.selectLevel(4);
        const selected = controller.getCurrentLevelConfig();
        return {
            currentLevel: controller.currentLevel,
            title: selected.title,
            laneTypes: [...selected.laneTypes],
            startLabel: controller.startBattleButton.label.string,
            startPanelActive: controller.startPanel.active,
            levelSelectActive: controller.levelSelectPanel.active,
            implementedFlag: controller.isLevelImplemented(controller.getLevelConfig(4)),
            enabledFutureFlag: controller.isLevelImplemented({ id: 5, enabled: true }),
            unimplementedFutureFlag: controller.isLevelImplemented({ id: 5 }),
        };
    });
    check(snapshots.directLevelFour.currentLevel === 4
        && snapshots.directLevelFour.startLabel.includes('第 4 关')
        && snapshots.directLevelFour.startPanelActive
        && !snapshots.directLevelFour.levelSelectActive,
    'level 4 can be selected directly from a fresh save', snapshots.directLevelFour);
    check(snapshots.directLevelFour.laneTypes.join(',') === 'normal,mud,flower,normal',
        'direct level 4 selection resolves the implemented special-road configuration', snapshots.directLevelFour);
    check(snapshots.directLevelFour.implementedFlag
        && snapshots.directLevelFour.enabledFutureFlag
        && !snapshots.directLevelFour.unimplementedFutureFlag,
    'implemented/enabled is the sole availability contract; empty configs remain blocked', snapshots.directLevelFour);

    snapshots.badges = await withController((cc, controller) => {
        controller.currentLevel = 4;
        controller.specialRoadTutorialSeen = true;
        controller.freezeUnlocked = true;
        controller.restartGame();
        controller.isStarted = true;
        controller.isPaused = false;
        controller.startPanel.active = false;
        controller.levelSelectPanel.active = false;
        controller.tutorialPanel.active = false;
        controller.specialRoadTutorialPanel.active = false;
        controller.tacticDeckPanel.active = false;
        controller.levelBadge.active = true;
        controller.pauseButton.node.active = true;
        controller.clearBattleUnits();
        controller.playerEnergy = 1000;
        const types = ['small', 'medium', 'large', 'giant'];
        const definitions = {};
        for (let index = 0; index < types.length; index += 1) {
            controller.selectedSheepType = types[index];
            controller.playerSpawnCooldown = 0;
            controller.trySpawnPlayerUnit(index);
            const unit = controller.units.find((candidate) => candidate.team === 0 && candidate.lane === index);
            if (!unit) throw new Error(`failed to spawn player ${types[index]}`);
            definitions[types[index]] = unit.definition;
            controller.spawnUnit(1, index, unit.definition);
        }
        controller.updateUnits(1 / 60);
        const rows = controller.units.map((unit) => {
            const badgeTransform = unit.tierBadgeNode.getComponent(cc.UITransform);
            const barTransform = unit.healthGraphics.node.getComponent(cc.UITransform);
            const barLeft = unit.healthGraphics.node.position.x - barTransform.contentSize.width / 2;
            const badgeRight = unit.tierBadgeNode.position.x + badgeTransform.contentSize.width / 2;
            return {
                team: unit.team,
                lane: unit.lane,
                type: unit.definition.type,
                rootName: unit.node.name,
                rootScale: [unit.node.scale.x, unit.node.scale.y],
                badgeName: unit.tierBadgeNode.name,
                parentName: unit.tierBadgeNode.parent?.name,
                size: [badgeTransform.contentSize.width, badgeTransform.contentSize.height],
                label: unit.tierBadgeLabel.string,
                fontSize: unit.tierBadgeLabel.fontSize,
                bold: unit.tierBadgeLabel.isBold,
                outline: unit.tierBadgeLabel.enableOutline,
                outlineWidth: unit.tierBadgeLabel.outlineWidth,
                shadow: unit.tierBadgeLabel.enableShadow,
                color: [unit.tierBadgeLabel.color.r, unit.tierBadgeLabel.color.g,
                    unit.tierBadgeLabel.color.b, unit.tierBadgeLabel.color.a],
                gapToBar: barLeft - badgeRight,
                badgeY: unit.tierBadgeNode.position.y,
                barY: unit.healthGraphics.node.position.y,
                graphicsEnabled: unit.tierBadgeGraphics.enabled,
                staleArtActive: unit.tierBadgeNode.getChildByName('TierBadgeArt')?.active ?? false,
            };
        });
        return { rows, definitions: Object.keys(definitions) };
    });
    const badgeRows = snapshots.badges.rows;
    check(badgeRows.length === 8
        && new Set(badgeRows.map((row) => `${row.team}:${row.type}`)).size === 8,
    'all four sheep and all four wolf badge variants are present', badgeRows);
    check(badgeRows.every((row) => row.badgeName === 'TypeBadge' && row.parentName === 'HealthUI'
        && row.size[0] === 28 && row.size[1] === 28),
    'every TypeBadge is a fixed 28x28 child of independent HealthUI', badgeRows);
    check(new Set(badgeRows.map((row) => row.label)).size === 4
        && ['小', '中', '大', '巨'].every((label) => badgeRows.some((row) => row.label === label)),
    'single-character Chinese tier labels cover small/medium/large/giant', badgeRows);
    check(badgeRows.every((row) => row.fontSize === 19 && row.bold && row.outline
        && row.outlineWidth === 2 && row.shadow && row.color[0] >= 250 && row.color[1] >= 245),
    'badge labels use bold 19px cream text with 2px outline and shadow', badgeRows);
    check(badgeRows.every((row) => Math.abs(row.gapToBar - 6) <= 1.1
        && Math.abs(row.badgeY - row.barY) <= 0.01),
    'TypeBadge stays centered with the health bar and keeps a 6px gap', badgeRows);
    check(badgeRows.every((row) => row.rootScale[0] === 1 && row.rootScale[1] === 1
        && row.graphicsEnabled && !row.staleArtActive),
    'badge upgrade leaves UnitRoot scale untouched and disables the old badge sprite override', badgeRows);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, 'eight_unit_type_badges_1280x720.png'), fullPage: true });

    snapshots.stress = await withController((_cc, controller) => {
        const types = ['small', 'medium', 'large', 'giant'];
        const definitions = Object.fromEntries(types.map((type) => {
            const source = controller.units.find((unit) => unit.definition.type === type);
            return [type, source.definition];
        }));
        controller.clearBattleUnits();
        controller.isStarted = true;
        controller.isPaused = false;
        controller.isFinished = false;
        controller.aiDecisionCooldown = 999;
        for (let lane = 0; lane < 4; lane += 1) {
            for (let index = 0; index < 3; index += 1) {
                const type = 'small';
                controller.spawnUnit(0, lane, definitions[type]);
                const player = controller.units[controller.units.length - 1];
                player.node.setPosition(player.node.position.x, -40 - index * 90, 0);
            }
            for (let index = 0; index < 3; index += 1) {
                const type = 'small';
                controller.spawnUnit(1, lane, definitions[type]);
                const enemy = controller.units[controller.units.length - 1];
                enemy.node.setPosition(enemy.node.position.x, 40 + index * 90, 0);
            }
        }
        const beforeIds = controller.units.map((unit) => unit.id);
        for (let step = 0; step < 360; step += 1) controller.updateUnits(1 / 60);
        const active = controller.units.filter((unit) => unit.node.isValid);
        const finite = active.every((unit) => Number.isFinite(unit.node.position.x)
            && Number.isFinite(unit.node.position.y));
        const laneAligned = active.every((unit) => Math.abs(unit.node.position.x
            - [-495, -225, 45, 315][unit.lane]) < 0.01);
        const rootScales = active.every((unit) => unit.node.scale.x === 1 && unit.node.scale.y === 1);
        const badgesAttached = active.every((unit) => unit.tierBadgeNode.isValid
            && unit.tierBadgeNode.parent === unit.healthNode && unit.tierBadgeNode.name === 'TypeBadge');
        controller.isPaused = true;
        const pausedBefore = active.map((unit) => [unit.id, unit.node.position.x, unit.node.position.y]);
        controller.update(0.5);
        const pausedAfter = active.map((unit) => [unit.id, unit.node.position.x, unit.node.position.y]);
        controller.isPaused = false;
        return {
            spawned: beforeIds.length,
            remaining: active.length,
            finite,
            laneAligned,
            rootScales,
            badgesAttached,
            pausedStable: JSON.stringify(pausedBefore) === JSON.stringify(pausedAfter),
            duplicateIds: beforeIds.length - new Set(beforeIds).size,
        };
    });
    check(snapshots.stress.spawned === 24 && snapshots.stress.duplicateIds === 0,
        '24-unit four-lane stress fixture is created with unique units', snapshots.stress);
    check(snapshots.stress.finite && snapshots.stress.laneAligned && snapshots.stress.rootScales,
        'six seconds of lane solving keeps all remaining units finite, lane-aligned, and root-scale stable', snapshots.stress);
    check(snapshots.stress.badgesAttached && snapshots.stress.pausedStable,
        'badges remain attached and pause freezes unit positions during stress test', snapshots.stress);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(outputDir, 'type_badge_stress_24_units_1280x720.png'), fullPage: true });

    snapshots.oldSave = await withController((_cc, controller) => {
        localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
            schemaVersion: 2,
            highestUnlockedLevel: 1,
            completedLevels: [1, 3],
            specialRoadTutorialSeen: true,
            freezeUnlocked: true,
            selectedTactics: ['sprint', 'heal', 'freeze'],
        }));
        controller.loadLevelProgress();
        controller.currentLevel = 1;
        controller.showLevelSelect();
        return {
            beforeReset: {
                completed: [...controller.completedLevels].sort(),
                tactics: [...controller.selectedTactics],
                states: [...controller.levelCards.values()].map((card) => card.visualState),
            },
            reset: (() => {
                controller.resetLocalProgress();
                const saved = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2'));
                return {
                    completed: [...controller.completedLevels],
                    tactics: [...controller.selectedTactics],
                    states: [...controller.levelCards.values()].map((card) => card.visualState),
                    savedCompleted: saved.completedLevels,
                    savedTactics: saved.selectedTactics,
                };
            })(),
        };
    });
    check(snapshots.oldSave.beforeReset.completed.join(',') === '1,3'
        && snapshots.oldSave.beforeReset.tactics.join(',') === 'sprint,heal,freeze'
        && snapshots.oldSave.beforeReset.states.every((state) => state !== 'in-development'),
    'legacy progress and tactic choices load without re-locking any implemented level', snapshots.oldSave);
    check(snapshots.oldSave.reset.completed.length === 0
        && snapshots.oldSave.reset.savedCompleted.length === 0
        && snapshots.oldSave.reset.tactics.join(',') === 'sprint,heal,freeze'
        && snapshots.oldSave.reset.savedTactics.join(',') === 'sprint,heal,freeze'
        && snapshots.oldSave.reset.states.join(',') === 'selected,available,available,available',
    'progress reset clears completion only while preserving tactics and free level access', snapshots.oldSave.reset);

    const relevantConsoleProblems = consoleProblems.filter((problem) =>
        !problem.text.includes('LabelOutline.color') && !problem.text.includes('LabelOutline.width'));
    check(relevantConsoleProblems.length === 0,
        'preview console has no new warnings or errors from this change', relevantConsoleProblems);
    check(requestFailures.length === 0 && response404s.length === 0,
        'preview has no failed requests or 404 resources', { requestFailures, response404s });
} catch (error) {
    fatalError = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
} finally {
    if (browser) await browser.close();
}

const result = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    checks,
    passed: checks.filter((item) => item.pass).length,
    failed: checks.filter((item) => !item.pass).length,
    snapshots,
    consoleProblems,
    requestFailures,
    response404s,
    fatalError,
};
fs.writeFileSync(path.join(outputDir, 'validation_result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (fatalError || result.failed > 0) process.exitCode = 1;
