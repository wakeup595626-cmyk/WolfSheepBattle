import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/level04-01/screenshots/level04');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7476';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
const snapshots = {};
const check = (condition, message, detail = undefined) => {
    checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
};
const approximately = (actual, expected, tolerance = 0.03) =>
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
            const controller = nodes
                .flatMap((node) => node.components)
                .find((component) => component
                    && component.startPanel
                    && component.rightControlBar
                    && typeof component.getUnitMovementDistance === 'function');
            if (!controller) throw new Error('GameController is unavailable');
            return new Function(
                'cc',
                'controller',
                'argument',
                `return (${callbackSource})(cc, controller, argument);`,
            )(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    snapshots.migration = await withController((_cc, controller) => ({
        highestUnlockedLevel: controller.highestUnlockedLevel,
        completedLevels: [...controller.completedLevels],
        freezeUnlocked: controller.freezeUnlocked,
        selectedTactics: [...controller.selectedTactics],
        invalidDeckFallback: controller.normalizeTacticDeck(['freeze', 'missing']),
        v2: JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2') ?? 'null'),
        legacy: localStorage.getItem('wolf-sheep-battle.v1.highest-unlocked-level'),
    }));
    check(snapshots.migration.highestUnlockedLevel === 4
        && snapshots.migration.completedLevels.includes(3),
    'legacy level-3 progress migrates to unlocked level 4', snapshots.migration);
    check(snapshots.migration.v2?.schemaVersion === 2
        && snapshots.migration.legacy === '3',
    'v2 progress is written while the rollback-compatible legacy key is preserved', snapshots.migration);
    check(JSON.stringify(snapshots.migration.selectedTactics) === JSON.stringify(['sprint', 'heal', 'shock']),
        'legacy save defaults to the original three-card tactic deck');
    check(JSON.stringify(snapshots.migration.invalidDeckFallback)
        === JSON.stringify(['sprint', 'heal', 'shock']),
    'invalid or incomplete tactic saves fall back to the safe original deck');

    await withController((_cc, controller) => {
        controller.currentLevel = 4;
        controller.specialRoadTutorialSeen = false;
        controller.refreshStartPanel();
        controller.beginBattle();
    });
    let tutorialVisible = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
        tutorialVisible = await withController((_cc, controller) => controller.specialRoadTutorialPanel.active);
        if (tutorialVisible) break;
        await page.waitForTimeout(250);
    }
    check(tutorialVisible, 'first level-4 entry shows the one-time special-road tutorial');
    await page.screenshot({ path: path.join(outputDir, 'level04_special_road_tutorial_1280x720.png'), fullPage: true });

    snapshots.tutorial = await withController((cc, controller) => {
        const labelStrings = [];
        const visit = (node) => {
            const label = node.getComponent(cc.Label);
            if (label) labelStrings.push(label.string);
            for (const child of node.children) visit(child);
        };
        visit(controller.specialRoadTutorialPanel);
        controller.completeSpecialRoadTutorial();
        return {
            labelStrings,
            specialRoadTutorialSeen: controller.specialRoadTutorialSeen,
            tutorialActive: controller.specialRoadTutorialPanel.active,
            deckActive: controller.tacticDeckPanel.active,
            pendingDeck: [...controller.pendingDeckSelection],
        };
    });
    check(snapshots.tutorial.labelStrings.some((text) => text.includes('泥泞道路') && text.includes('降低30%'))
        && snapshots.tutorial.labelStrings.some((text) => text.includes('花径') && text.includes('降低12%')),
    'tutorial states the mud and flower-road effects', snapshots.tutorial.labelStrings);
    check(snapshots.tutorial.specialRoadTutorialSeen
        && !snapshots.tutorial.tutorialActive
        && snapshots.tutorial.deckActive,
    'tutorial confirmation persists and opens tactic-deck selection', snapshots.tutorial);
    await page.screenshot({ path: path.join(outputDir, 'level04_tactic_deck_default_1280x720.png'), fullPage: true });

    snapshots.deck = await withController((cc, controller) => {
        const optionBounds = [...controller.tacticDeckOptions.values()].map((option) => {
            const inspect = (node) => {
                const size = node.getComponent(cc.UITransform).contentSize;
                return {
                    left: node.position.x - size.width / 2,
                    right: node.position.x + size.width / 2,
                    bottom: node.position.y - size.height / 2,
                    top: node.position.y + size.height / 2,
                };
            };
            return {
                kind: option.kind,
                title: inspect(option.titleLabel.node),
                detail: inspect(option.detailLabel.node),
            };
        });
        const originalDeck = [...controller.selectedTactics];
        controller.toggleTacticDeckOption('sprint');
        const afterRemove = [...controller.pendingDeckSelection];
        controller.confirmTacticDeckSelection();
        const blockedAtTwo = controller.tacticDeckPanel.active && !controller.isStarted;
        controller.toggleTacticDeckOption('freeze');
        const readyDeck = [...controller.pendingDeckSelection];
        controller.confirmTacticDeckSelection();
        const selectedBeforeReload = [...controller.selectedTactics];
        controller.selectedTactics = [];
        controller.loadLevelProgress();
        const selectedAfterReload = [...controller.selectedTactics];
        return {
            optionCount: controller.tacticDeckOptions.size,
            optionBounds,
            originalDeck,
            afterRemove,
            blockedAtTwo,
            readyDeck,
            selectedTactics: [...controller.selectedTactics],
            selectedBeforeReload,
            selectedAfterReload,
            activeCards: ['sprint', 'heal', 'shock', 'freeze'].filter((kind) =>
                controller.getTacticCard(kind).node.active),
            isStarted: controller.isStarted,
            deckActive: controller.tacticDeckPanel.active,
            persisted: JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2') ?? 'null'),
        };
    });
    check(snapshots.deck.optionCount === 4, 'level-4 deck selector exposes all four tactics');
    check(snapshots.deck.optionBounds.every((option) => [option.title, option.detail].every((bounds) =>
        bounds.left >= -185 && bounds.right <= 185 && bounds.bottom >= -64 && bounds.top <= 64)),
    'deck option labels stay inside their card bounds', snapshots.deck.optionBounds);
    check(snapshots.deck.afterRemove.length === 2 && snapshots.deck.blockedAtTwo,
        'deck confirmation is blocked unless exactly three tactics are selected', snapshots.deck);
    check(JSON.stringify(snapshots.deck.readyDeck) === JSON.stringify(['heal', 'shock', 'freeze'])
        && JSON.stringify(snapshots.deck.activeCards) === JSON.stringify(['heal', 'shock', 'freeze'])
        && snapshots.deck.isStarted && !snapshots.deck.deckActive,
    'valid three-card selection starts battle and only mounts those three cards', snapshots.deck);
    check(JSON.stringify(snapshots.deck.persisted?.selectedTactics)
        === JSON.stringify(['heal', 'shock', 'freeze']),
    'selected tactic deck persists in the v2 save');
    check(JSON.stringify(snapshots.deck.selectedBeforeReload)
        === JSON.stringify(snapshots.deck.selectedAfterReload),
    'reloading local progress restores the last selected tactic deck', snapshots.deck);

    snapshots.levelConfig = await withController((cc, controller) => {
        const config = controller.getCurrentLevelConfig();
        const earlyAllowed = [...controller.getCurrentAIAllowedUnitTypes(config)];
        const smallDefinition = {
            type: 'small', name: '小羊', cost: 12, maxHealth: 32, damage: 6,
            speed: 20, attackInterval: 0.48, baseDamage: 8, battlePower: 18, radius: 18,
        };
        controller.battleElapsedSeconds = 0;
        const earlyCooldown = controller.getAIDeployCooldown(smallDefinition);
        controller.battleElapsedSeconds = 46;
        const lateAllowed = [...controller.getCurrentAIAllowedUnitTypes(config)];
        const lateCooldown = controller.getAIDeployCooldown(smallDefinition);
        controller.battleElapsedSeconds = 0;
        return {
            id: config.id,
            title: config.title,
            laneTypes: [...config.laneTypes],
            initialDelay: config.aiInitialDecisionDelay,
            earlyAllowed,
            lateAllowed,
            earlyCooldown,
            lateCooldown,
            laneVisualActive: controller.laneEffectVisuals.map((node) => node.active),
            laneVisualLabels: controller.laneEffectVisuals.map((node) =>
                node.getChildByName('LaneEffectLabel')?.getComponent(cc.Label)?.string ?? ''),
        };
    });
    check(snapshots.levelConfig.id === 4 && snapshots.levelConfig.title === '泥泞与花径'
        && JSON.stringify(snapshots.levelConfig.laneTypes) === JSON.stringify(['normal', 'mud', 'flower', 'normal']),
    'level 4 uses the data-driven normal/mud/flower/normal lane layout', snapshots.levelConfig);
    check(snapshots.levelConfig.initialDelay === 10
        && JSON.stringify(snapshots.levelConfig.earlyAllowed) === JSON.stringify(['small', 'medium'])
        && snapshots.levelConfig.lateAllowed.length === 4
        && approximately(snapshots.levelConfig.earlyCooldown / snapshots.levelConfig.lateCooldown, 1.1),
    'level-4 AI uses a 10s opening and the configured 45s early-phase restrictions', snapshots.levelConfig);
    check(JSON.stringify(snapshots.levelConfig.laneVisualActive) === JSON.stringify([false, true, true, false]),
        'only mud and flower roads show special-road overlays', snapshots.levelConfig.laneVisualActive);

    snapshots.math = await withController((_cc, controller) => {
        const fake = (team, lane, speed = 20) => ({
            team, lane, frozenRemaining: 0, definition: { speed }, health: 100,
        });
        controller.playerSprintRemaining = 0;
        const normalPlayer = controller.getUnitMovementDistance(fake(0, 0), 1);
        const mudPlayer = controller.getUnitMovementDistance(fake(0, 1), 1);
        const mudAI = controller.getUnitMovementDistance(fake(1, 1), 1);
        controller.playerSprintRemaining = 1;
        const mudSprint = controller.getUnitMovementDistance(fake(0, 1), 1);
        controller.playerSprintRemaining = 0;
        const frozen = fake(1, 1);
        frozen.frozenRemaining = 2;
        const frozenDistance = controller.getUnitMovementDistance(frozen, 1);
        const flowerPlayer = fake(0, 2);
        const normalPlayerTarget = fake(0, 0);
        const flowerAI = fake(1, 2);
        controller.applyUnitDamage(flowerPlayer, 25);
        controller.applyUnitDamage(normalPlayerTarget, 25);
        controller.applyUnitDamage(flowerAI, 25);
        return {
            normalPlayer, mudPlayer, mudAI, mudSprint, frozenDistance,
            flowerPlayerDamage: 100 - flowerPlayer.health,
            normalPlayerDamage: 100 - normalPlayerTarget.health,
            flowerAIDamage: 100 - flowerAI.health,
        };
    });
    check(approximately(snapshots.math.normalPlayer, 16)
        && approximately(snapshots.math.mudPlayer, 11.2)
        && approximately(snapshots.math.mudAI, 11.2),
    'mud applies one shared 0.70 movement multiplier after the global 0.80 base multiplier', snapshots.math);
    check(approximately(snapshots.math.mudSprint, 16.8),
        'sprint remains +50% relative to the mud-adjusted base speed', snapshots.math);
    check(approximately(snapshots.math.flowerPlayerDamage, 22)
        && approximately(snapshots.math.normalPlayerDamage, 25)
        && approximately(snapshots.math.flowerAIDamage, 25),
    'flower-road 12% reduction applies only to incoming player-unit damage', snapshots.math);
    check(approximately(snapshots.math.frozenDistance, 0), 'frozen units have zero movement distance');

    snapshots.freezeStart = await withController((_cc, controller) => {
        controller.playerEnergy = 999;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(1);
        const player = controller.units.find((unit) => unit.team === 0 && unit.lane === 1);
        if (!player) throw new Error('failed to create freeze-test player unit');
        if (!controller.spawnUnit(1, 0, player.definition)) throw new Error('failed to create freeze-test setup AI');
        controller.playerSupply = 5;
        controller.playerFreezeCooldown = 0;
        controller.beginFreezeLaneSelection();
        const beforeInvalid = { supply: controller.playerSupply, cooldown: controller.playerFreezeCooldown };
        controller.tryConfirmFreezeLane(1);
        const afterInvalid = {
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
            selectionActive: controller.freezeLaneSelectionActive,
        };
        for (let index = 0; index < 2; index += 1) {
            if (!controller.spawnUnit(1, 1, player.definition)) throw new Error('failed to create freeze-test AI unit');
            controller.setUnitLogicY(controller.units[controller.units.length - 1], 90 + index * 60);
        }
        controller.repairAllLaneInvariants();
        const laneTargets = controller.getLaneFormation(1, 1);
        laneTargets[laneTargets.length - 1].health = 1;
        const ai = laneTargets[0];
        if (!ai) throw new Error('freeze-test AI unit is unavailable');
        const attackCooldownBefore = ai.attackCooldown;
        controller.tryConfirmFreezeLane(1);
        const pendingDamage = new Map();
        controller.collectFrontAttack(ai, player, 1, pendingDamage);
        const afterValid = {
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
            frozenRemaining: ai.frozenRemaining,
            movementDistance: controller.getUnitMovementDistance(ai, 1),
            attackCooldownBefore,
            attackCooldownAfter: ai.attackCooldown,
            pendingDamageCount: pendingDamage.size,
            freezeVisualActive: ai.freezeVisualNode.active,
            freezeStatusActive: ai.freezeStatusIconNode.active,
            rootScale: [ai.node.scale.x, ai.node.scale.y, ai.node.scale.z],
            frozenTargetCount: laneTargets.filter((target) => target.frozenRemaining > 0).length,
            lowHealthTargetHealth: laneTargets[laneTargets.length - 1].health,
        };
        const supplyAfterValid = controller.playerSupply;
        controller.beginFreezeLaneSelection();
        const cooldownRetry = {
            selectionActive: controller.freezeLaneSelectionActive,
            supply: controller.playerSupply,
        };
        controller.playerFreezeCooldown = 0;
        controller.playerSupply = 2;
        controller.beginFreezeLaneSelection();
        const insufficientRetry = {
            selectionActive: controller.freezeLaneSelectionActive,
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
        };
        controller.playerSupply = 5;
        controller.beginFreezeLaneSelection();
        const cancelBefore = { supply: controller.playerSupply, cooldown: controller.playerFreezeCooldown };
        controller.cancelFreezeLaneSelection(false);
        const cancelAfter = {
            selectionActive: controller.freezeLaneSelectionActive,
            supply: controller.playerSupply,
            cooldown: controller.playerFreezeCooldown,
        };
        return {
            playerId: player.id,
            aiId: ai.id,
            beforeInvalid,
            afterInvalid,
            afterValid,
            supplyAfterValid,
            cooldownRetry,
            insufficientRetry,
            cancelBefore,
            cancelAfter,
        };
    });
    check(snapshots.freezeStart.beforeInvalid.supply === snapshots.freezeStart.afterInvalid.supply
        && snapshots.freezeStart.afterInvalid.cooldown === 0
        && snapshots.freezeStart.afterInvalid.selectionActive,
    'selecting an empty lane does not consume supply or start cooldown', snapshots.freezeStart);
    check(snapshots.freezeStart.afterValid.supply === 2
        && approximately(snapshots.freezeStart.afterValid.cooldown, 12)
        && approximately(snapshots.freezeStart.afterValid.frozenRemaining, 3),
    'valid freeze consumes 3 supply, starts 12s cooldown and applies 3s duration', snapshots.freezeStart.afterValid);
    check(snapshots.freezeStart.afterValid.movementDistance === 0
        && snapshots.freezeStart.afterValid.pendingDamageCount === 0
        && approximately(snapshots.freezeStart.afterValid.attackCooldownBefore,
            snapshots.freezeStart.afterValid.attackCooldownAfter),
    'frozen AI cannot move or attack', snapshots.freezeStart.afterValid);
    check(snapshots.freezeStart.afterValid.freezeVisualActive
        && snapshots.freezeStart.afterValid.freezeStatusActive
        && snapshots.freezeStart.afterValid.rootScale.every((value) => approximately(value, 1, 0.001)),
    'freeze feedback is visual-only and UnitRoot scale stays unchanged', snapshots.freezeStart.afterValid);
    check(snapshots.freezeStart.afterValid.frozenTargetCount === 2
        && snapshots.freezeStart.afterValid.lowHealthTargetHealth === 1,
    'freeze affects moving/front/queued and low-health enemies without changing their health', snapshots.freezeStart.afterValid);
    check(!snapshots.freezeStart.cooldownRetry.selectionActive
        && snapshots.freezeStart.cooldownRetry.supply === snapshots.freezeStart.supplyAfterValid,
    'cooldown blocks repeated activation without another supply charge', snapshots.freezeStart.cooldownRetry);
    check(!snapshots.freezeStart.insufficientRetry.selectionActive
        && snapshots.freezeStart.insufficientRetry.supply === 2
        && snapshots.freezeStart.insufficientRetry.cooldown === 0,
    'insufficient supply blocks lane selection without starting cooldown', snapshots.freezeStart.insufficientRetry);
    check(!snapshots.freezeStart.cancelAfter.selectionActive
        && snapshots.freezeStart.cancelAfter.supply === snapshots.freezeStart.cancelBefore.supply
        && snapshots.freezeStart.cancelAfter.cooldown === snapshots.freezeStart.cancelBefore.cooldown,
    'cancelling lane selection consumes no supply and starts no cooldown', snapshots.freezeStart.cancelAfter);

    await withController((_cc, controller) => controller.pauseGame());
    const pausedBefore = await withController((_cc, controller, aiId) =>
        controller.units.find((unit) => unit.id === aiId)?.frozenRemaining ?? -1, snapshots.freezeStart.aiId);
    await page.waitForTimeout(700);
    const pausedAfter = await withController((_cc, controller, aiId) =>
        controller.units.find((unit) => unit.id === aiId)?.frozenRemaining ?? -1, snapshots.freezeStart.aiId);
    check(approximately(pausedBefore, pausedAfter, 0.03),
        'pause freezes the road-freeze timer', { pausedBefore, pausedAfter });
    await withController((_cc, controller) => controller.resumeGame());
    await page.waitForTimeout(700);
    const resumedRemaining = await withController((_cc, controller, aiId) =>
        controller.units.find((unit) => unit.id === aiId)?.frozenRemaining ?? -1, snapshots.freezeStart.aiId);
    check(resumedRemaining >= 0 && resumedRemaining < pausedAfter - 0.4,
        'freeze timer resumes after battle continues', { pausedAfter, resumedRemaining });
    await page.screenshot({ path: path.join(outputDir, 'level04_freeze_mud_lane_1280x720.png'), fullPage: true });
    await page.waitForTimeout(2800);
    snapshots.freezeEnd = await withController((_cc, controller, aiId) => {
        const ai = controller.units.find((unit) => unit.id === aiId);
        return ai ? {
            frozenRemaining: ai.frozenRemaining,
            freezeVisualActive: ai.freezeVisualNode.active,
            freezeStatusActive: ai.freezeStatusIconNode.active,
            movementDistance: controller.getUnitMovementDistance(ai, 1),
            laneLiveness: { ...controller.laneRuntimeStates[1] },
        } : { removed: true };
    }, snapshots.freezeStart.aiId);
    check(snapshots.freezeEnd.removed === true || (snapshots.freezeEnd.frozenRemaining === 0
        && !snapshots.freezeEnd.freezeVisualActive && !snapshots.freezeEnd.freezeStatusActive),
    'freeze expires cleanly without permanent status or residual visuals', snapshots.freezeEnd);
    if (!snapshots.freezeEnd.removed) {
        check(approximately(snapshots.freezeEnd.movementDistance, 11.2),
            'expired mud-lane unit returns to the correct adjusted base speed', snapshots.freezeEnd);
        check((snapshots.freezeEnd.laneLiveness?.recoveryCount ?? 0) === 0,
            'intentional freeze does not trigger lane deadlock recovery', snapshots.freezeEnd.laneLiveness);
    }

    snapshots.deathCleanup = await withController((_cc, controller) => {
        const source = controller.units.find((unit) => unit.team === 0);
        if (!source || !controller.spawnUnit(1, 0, source.definition)) {
            return { skipped: true };
        }
        const target = controller.units.filter((unit) => unit.team === 1 && unit.lane === 0).at(-1);
        target.frozenRemaining = 2;
        target.freezeVisualNode.active = true;
        target.freezeStatusIconNode.active = true;
        const id = target.id;
        controller.startUnitDeath(target);
        return { skipped: false, id, frozenRemaining: target.frozenRemaining,
            freezeVisualActive: target.freezeVisualNode.active, freezeStatusActive: target.freezeStatusIconNode.active };
    });
    check(snapshots.deathCleanup.skipped || (snapshots.deathCleanup.frozenRemaining === 0
        && !snapshots.deathCleanup.freezeVisualActive && !snapshots.deathCleanup.freezeStatusActive),
    'unit death immediately clears freeze state and visuals', snapshots.deathCleanup);

    snapshots.nextLevel = await withController((_cc, controller) => {
        controller.currentLevel = 3;
        controller.isFinished = false;
        controller.isStarted = true;
        controller.enterNextLevelImmediately();
        return {
            currentLevel: controller.currentLevel,
            isStarted: controller.isStarted,
            deckActive: controller.tacticDeckPanel.active,
            selectedTactics: [...controller.selectedTactics],
        };
    });
    check(snapshots.nextLevel.currentLevel === 4 && !snapshots.nextLevel.isStarted
        && snapshots.nextLevel.deckActive,
    'entering next level from level 3 immediately routes to level-4 deck selection', snapshots.nextLevel);
    check(JSON.stringify(snapshots.nextLevel.selectedTactics) === JSON.stringify(['heal', 'shock', 'freeze']),
        'next-level transition keeps the persisted selected deck', snapshots.nextLevel);

    snapshots.stressSetup = await withController((_cc, controller) => {
        controller.confirmTacticDeckSelection();
        controller.playerEnergy = 999;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(0);
        const definition = controller.units[0]?.definition;
        if (!definition) throw new Error('failed to obtain a live small-unit definition for level-4 stress');
        controller.clearBattleUnits();
        controller.isPaused = true;
        const spawnSide = (team, lane, positions) => {
            for (const y of positions) {
                if (!controller.spawnUnit(team, lane, definition)) {
                    throw new Error(`level-4 stress spawn failed: team=${team}, lane=${lane}, y=${y}`);
                }
                controller.setUnitLogicY(controller.units[controller.units.length - 1], y);
            }
        };
        for (let lane = 0; lane < 4; lane += 1) {
            spawnSide(0, lane, [-75, -135, -195]);
            spawnSide(1, lane, [75, 135, 195]);
        }
        const mudFrontAI = controller.getLaneFormation(1, 1)[0];
        mudFrontAI.frozenRemaining = 1.5;
        mudFrontAI.freezeVisualNode.active = true;
        mudFrontAI.freezeStatusIconNode.active = true;
        controller.repairAllLaneInvariants();
        controller.resetLaneLivenessTimers();
        controller.aiDecisionCooldown = 9999;
        controller.isPaused = false;
        return {
            initialUnits: controller.units.length,
            lanes: controller.laneRuntimeStates.length,
            frozenLane: mudFrontAI.lane,
            frozenSpeed: controller.getUnitMovementDistance(mudFrontAI, 1),
        };
    });
    check(snapshots.stressSetup.initialUnits === 24 && snapshots.stressSetup.lanes === 4,
        'level-4 stress starts with 24 live units across four roads', snapshots.stressSetup);
    check(snapshots.stressSetup.frozenLane === 1 && snapshots.stressSetup.frozenSpeed === 0,
        'stress includes an intentionally frozen mud-road front', snapshots.stressSetup);
    await page.waitForTimeout(1800);
    const stressBeforePause = await withController((_cc, controller) => {
        controller.pauseGame();
        return controller.units.filter((unit) => unit.node.isValid).map((unit) => ({
            id: unit.id, x: unit.node.position.x, y: unit.node.position.y,
        }));
    });
    await page.waitForTimeout(600);
    const stressDuringPause = await withController((_cc, controller) =>
        controller.units.filter((unit) => unit.node.isValid).map((unit) => ({
            id: unit.id, x: unit.node.position.x, y: unit.node.position.y,
        })));
    check(stressBeforePause.length === stressDuringPause.length
        && stressBeforePause.every((before) => {
            const during = stressDuringPause.find((entry) => entry.id === before.id);
            return during && approximately(during.x, before.x, 0.001)
                && approximately(during.y, before.y, 0.001);
        }), 'pause freezes all level-4 stress-unit logical positions');
    await withController((_cc, controller) => controller.resumeGame());
    await page.waitForTimeout(4200);
    snapshots.stress = await withController((_cc, controller) => {
        const liveUnits = controller.units.filter((unit) =>
            unit.node.isValid && unit.health > 0 && !unit.isDying);
        const unitAudit = liveUnits.map((unit) => {
            const bounds = controller.getRoadBoundsForRadius(unit.definition.radius);
            return {
                id: unit.id,
                team: unit.team,
                lane: unit.lane,
                x: unit.node.position.x,
                expectedX: controller.getLaneCenterX(unit.lane),
                y: unit.node.position.y,
                minY: bounds.minY,
                maxY: bounds.maxY,
                rootScale: [unit.node.scale.x, unit.node.scale.y, unit.node.scale.z],
            };
        });
        const overlapViolations = [];
        for (let lane = 0; lane < 4; lane += 1) {
            for (const team of [0, 1]) {
                const formation = controller.getLaneFormation(team, lane);
                for (let index = 1; index < formation.length; index += 1) {
                    const front = formation[index - 1];
                    const rear = formation[index];
                    const actualGap = Math.abs(front.node.position.y - rear.node.position.y);
                    const requiredGap = front.definition.radius + rear.definition.radius + 10;
                    if (actualGap + 0.01 < requiredGap) {
                        overlapViolations.push({ lane, team, front: front.id, rear: rear.id,
                            actualGap, requiredGap });
                    }
                }
            }
        }
        return {
            liveCount: liveUnits.length,
            unitAudit,
            overlapViolations,
            liveness: controller.laneRuntimeStates.map((state) => ({
                stalledSeconds: state.stalledSeconds,
                warningIssued: state.warningIssued,
                recoveryCount: state.recoveryCount,
            })),
        };
    });
    check(snapshots.stress.unitAudit.every((unit) =>
        approximately(unit.x, unit.expectedX, 0.001)
        && unit.y >= unit.minY - 0.01 && unit.y <= unit.maxY + 0.01
        && unit.rootScale.every((value) => approximately(value, 1, 0.001))),
    'level-4 stress units stay on their roads, within bounds and keep UnitRoot scale 1', snapshots.stress.unitAudit);
    check(snapshots.stress.overlapViolations.length === 0,
        'level-4 stress queues have no same-team overlap', snapshots.stress.overlapViolations);
    check(snapshots.stress.liveness.every((state) => state.recoveryCount === 0 && !state.warningIssued),
        'level-4 stress triggers no deadlock recovery or liveness warning', snapshots.stress.liveness);
    await page.screenshot({ path: path.join(outputDir, 'level04_stress_24_units_1280x720.png'), fullPage: true });

    snapshots.levelFlows = [];
    for (let level = 1; level <= 4; level += 1) {
        await withController((_cc, controller, levelId) => {
            controller.restartGame();
            controller.currentLevel = levelId;
            controller.activateBattle();
            controller.pauseGame();
            controller.resumeGame();
            controller.finishGame(true);
        }, level);
        await page.waitForTimeout(1150);
        const victory = await withController((_cc, controller) => ({
            currentLevel: controller.currentLevel,
            finished: controller.isFinished,
            paused: controller.isPaused,
            resultActive: controller.resultPanel.active,
            title: controller.resultTitleLabel.string,
            nextVisible: controller.resultNextButton.active,
        }));
        await withController((_cc, controller) => {
            controller.restartGame();
            controller.activateBattle();
            controller.finishGame(false);
        });
        await page.waitForTimeout(1150);
        const defeat = await withController((_cc, controller) => ({
            currentLevel: controller.currentLevel,
            finished: controller.isFinished,
            paused: controller.isPaused,
            resultActive: controller.resultPanel.active,
            title: controller.resultTitleLabel.string,
            nextVisible: controller.resultNextButton.active,
        }));
        await withController((_cc, controller) => controller.restartGame());
        const restarted = await withController((_cc, controller) => ({
            currentLevel: controller.currentLevel,
            finished: controller.isFinished,
            paused: controller.isPaused,
            resultActive: controller.resultPanel.active,
        }));
        snapshots.levelFlows.push({ level, victory, defeat, restarted });
    }
    check(snapshots.levelFlows.every(({ level, victory }) => victory.currentLevel === level
        && victory.finished && victory.resultActive && victory.title === '战斗胜利'
        && victory.nextVisible === (level < 4)),
    'levels 1-4 show the correct victory result and next-level availability', snapshots.levelFlows);
    check(snapshots.levelFlows.every(({ level, defeat }) => defeat.currentLevel === level
        && defeat.finished && defeat.resultActive && defeat.title === '战斗失败'
        && !defeat.nextVisible),
    'levels 1-4 show the correct defeat result without a next-level action', snapshots.levelFlows);
    check(snapshots.levelFlows.every(({ level, restarted }) => restarted.currentLevel === level
        && !restarted.finished && !restarted.paused && !restarted.resultActive),
    'levels 1-4 restart cleanly on the same level after a result', snapshots.levelFlows);

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
fs.writeFileSync(path.join(outputDir, 'level04_01_runtime_audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!passed) process.exitCode = 1;
