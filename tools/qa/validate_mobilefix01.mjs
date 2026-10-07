import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/mobilefix01/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7472';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
const snapshots = {
    title: undefined,
    layouts: {},
    stress: undefined,
};
const check = (condition, message, detail = undefined) => {
    checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
};
const approximately = (actual, expected, tolerance = 0.02) =>
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;

let browser;
let fatalError;

try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });

    const createPage = async (width, height, scenario) => {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        page.on('console', (message) => {
            if (message.type() === 'error' || message.type() === 'warning') {
                consoleProblems.push({ scenario, type: message.type(), text: message.text() });
            }
        });
        page.on('pageerror', (error) => consoleProblems.push({
            scenario,
            type: 'pageerror',
            text: error.message,
        }));
        page.on('requestfailed', (request) => requestFailures.push({
            scenario,
            url: request.url(),
            failure: request.failure()?.errorText ?? 'unknown',
        }));
        page.on('response', (response) => {
            if (response.status() === 404) response404s.push({ scenario, url: response.url() });
        });
        await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('canvas', { timeout: 30000 });
        await page.waitForTimeout(4200);
        return page;
    };

    const withController = async (page, callback, argument = undefined) => page.evaluate(
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

    const clickDesign = async (page, x, y) => {
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        if (!box) throw new Error('preview canvas has no bounding box');
        await page.mouse.click(
            box.x + (x + 640) / 1280 * box.width,
            box.y + (360 - y) / 720 * box.height,
        );
    };

    const beginBattle = async (page) => {
        await withController(page, (_cc, controller) => {
            controller.tutorialCompleted = true;
            controller.beginBattle();
        });
        let started = false;
        for (let attempt = 0; attempt < 120; attempt += 1) {
            started = await withController(page, (_cc, controller) =>
                Boolean(controller.isStarted && !controller.startPanel.active));
            if (started) break;
            await page.waitForTimeout(250);
        }
        if (!started) throw new Error('battle did not become active within 30 seconds');
        await page.waitForTimeout(600);
    };

    const titleAudit = (cc, controller) => {
        const rect = (node) => {
            const size = node.getComponent(cc.UITransform)?.contentSize;
            return {
                x: node.position.x,
                y: node.position.y,
                width: size?.width ?? 0,
                height: size?.height ?? 0,
                left: node.position.x - (size?.width ?? 0) / 2,
                right: node.position.x + (size?.width ?? 0) / 2,
                bottom: node.position.y - (size?.height ?? 0) / 2,
                top: node.position.y + (size?.height ?? 0) / 2,
            };
        };
        const auditButton = (button) => ({
            rect: rect(button.node),
            text: button.label.string,
            labelRect: rect(button.label.node),
            labelDynamic: Boolean(button.label),
            scale: [button.node.scale.x, button.node.scale.y],
            opacity: button.opacity.opacity,
            iconActive: button.iconNode.active,
            genericArtActive: button.node.getChildByName('ButtonArt')?.active ?? false,
        });
        return {
            startPanelActive: controller.startPanel.active,
            panel: rect(controller.startPanel.getChildByName('TitleReadabilityPanel')
                ?? controller.startPanel),
            primary: auditButton(controller.startBattleButton),
            secondary: auditButton(controller.startLevelSelectButton),
            version: controller.versionLabel?.string ?? '',
        };
    };

    const titlePage = await createPage(1280, 720, 'title-1280x720');
    snapshots.title = await withController(titlePage, titleAudit);
    await titlePage.screenshot({
        path: path.join(outputDir, 'title_buttons_1280x720.png'),
        fullPage: true,
    });
    const title = snapshots.title;
    const titleButtonGap = title.primary.rect.bottom - title.secondary.rect.top;
    check(title.startPanelActive, 'title panel is visible before battle');
    check(title.primary.text === '挑战第 1 关', 'primary label is dynamic and targets level 1');
    check(title.secondary.text === '选择关卡', 'secondary label is dynamic');
    check(approximately(title.primary.rect.width, 320)
        && approximately(title.primary.rect.height, 68), 'primary button is 320x68');
    check(approximately(title.secondary.rect.width, 300)
        && approximately(title.secondary.rect.height, 58), 'secondary button is 300x58');
    check(approximately(title.primary.rect.x, title.secondary.rect.x), 'title buttons share one center X');
    check(titleButtonGap >= 16 && titleButtonGap <= 22, 'title button edge gap is 16-22px', titleButtonGap);
    check(title.primary.labelDynamic && title.secondary.labelDynamic,
        'title button text remains dynamic Cocos Label content');
    check(title.primary.iconActive && title.secondary.iconActive, 'both title buttons have separate icons');
    check(!title.primary.genericArtActive && !title.secondary.genericArtActive,
        'old flattened generic button art is not layered over the new design');

    const interaction = await withController(titlePage, (cc, controller) => {
        const primary = controller.startBattleButton;
        const secondary = controller.startLevelSelectButton;
        let primaryCalls = 0;
        let secondaryCalls = 0;
        const originalBegin = controller.beginBattle;
        const originalSelect = controller.showLevelSelect;
        controller.beginBattle = () => { primaryCalls += 1; };
        controller.showLevelSelect = () => { secondaryCalls += 1; };

        primary.node.emit(cc.Node.EventType.TOUCH_START);
        const pressed = {
            scale: [primary.node.scale.x, primary.node.scale.y],
            opacity: primary.opacity.opacity,
        };
        primary.node.emit(cc.Node.EventType.TOUCH_END);
        primary.node.emit(cc.Node.EventType.TOUCH_START);
        primary.node.emit(cc.Node.EventType.TOUCH_END);
        secondary.node.emit(cc.Node.EventType.TOUCH_START);
        secondary.node.emit(cc.Node.EventType.TOUCH_END);
        secondary.node.emit(cc.Node.EventType.TOUCH_START);
        secondary.node.emit(cc.Node.EventType.TOUCH_END);
        controller.beginBattle = originalBegin;
        controller.showLevelSelect = originalSelect;
        return { pressed, primaryCalls, secondaryCalls };
    });
    await titlePage.waitForTimeout(220);
    const released = await withController(titlePage, (_cc, controller) => ({
        primaryScale: [controller.startBattleButton.node.scale.x, controller.startBattleButton.node.scale.y],
        primaryOpacity: controller.startBattleButton.opacity.opacity,
        secondaryScale: [controller.startLevelSelectButton.node.scale.x,
            controller.startLevelSelectButton.node.scale.y],
    }));
    check(interaction.pressed.scale.every((value) => approximately(value, 0.97)),
        'title button press scale is 0.97');
    check(interaction.pressed.opacity === 224, 'title button press slightly dims the button');
    check(interaction.primaryCalls === 1 && interaction.secondaryCalls === 1,
        'rapid duplicate touch-end events are debounced', interaction);
    check(released.primaryScale.every((value) => approximately(value, 1, 0.01))
        && released.secondaryScale.every((value) => approximately(value, 1, 0.01))
        && released.primaryOpacity === 255, 'title buttons recover in 0.15 seconds');

    await withController(titlePage, (_cc, controller) => {
        controller.startLevelSelectButton.lastActivationTimeMs = 0;
    });
    await clickDesign(titlePage, 0, -206);
    await titlePage.waitForTimeout(180);
    const levelSelectClick = await withController(titlePage, (_cc, controller) => ({
        levelSelectActive: controller.levelSelectPanel.active,
        startActive: controller.startPanel.active,
    }));
    check(levelSelectClick.levelSelectActive && !levelSelectClick.startActive,
        'browser click on 选择关卡 opens the level-selection modal', levelSelectClick);

    await withController(titlePage, (_cc, controller) => {
        controller.returnToStartPanel();
        controller.tutorialCompleted = true;
        controller.startBattleButton.lastActivationTimeMs = 0;
    });
    await clickDesign(titlePage, 0, -125);
    let titleClickStarted = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
        titleClickStarted = await withController(titlePage, (_cc, controller) =>
            Boolean(controller.isStarted && !controller.startPanel.active));
        if (titleClickStarted) break;
        await titlePage.waitForTimeout(250);
    }
    check(titleClickStarted, 'browser click on 挑战第1关 enters the selected battle');
    await titlePage.close();

    const aspectCases = [
        { name: '16x9', width: 1280, height: 720 },
        { name: '18x9', width: 1440, height: 720 },
        { name: '19_5x9', width: 1560, height: 720 },
        { name: '20x9', width: 1600, height: 720, capsule: {
            left: 1468, right: 1584, top: 12, bottom: 52, width: 116, height: 40,
        } },
    ];
    const layoutAudit = (cc, controller, argument) => {
        if (argument.capsule) {
            globalThis.wx = {
                getWindowInfo: () => ({ windowWidth: argument.width, windowHeight: argument.height }),
                getSystemInfoSync: () => ({ windowWidth: argument.width, windowHeight: argument.height }),
                getMenuButtonBoundingClientRect: () => ({ ...argument.capsule }),
            };
            controller.screenAdapter.refresh();
        }
        const rect = (node) => {
            const size = node.getComponent(cc.UITransform)?.contentSize;
            const worldX = controller.rightControlBar.position.x + node.position.x;
            return {
                localX: node.position.x,
                localY: node.position.y,
                x: worldX,
                width: size?.width ?? 0,
                height: size?.height ?? 0,
                left: worldX - (size?.width ?? 0) / 2,
                right: worldX + (size?.width ?? 0) / 2,
                bottom: node.position.y - (size?.height ?? 0) / 2,
                top: node.position.y + (size?.height ?? 0) / 2,
            };
        };
        const header = controller.rightControlBar.getChildByName('TacticSidebarHeader');
        const pause = rect(controller.pauseButton.node);
        const headerRect = rect(header);
        const cards = [
            rect(controller.playerSprintCard.node),
            rect(controller.playerHealCard.node),
            rect(controller.playerShockCard.node),
        ];
        const logicalPerPhysical = controller.screenMetrics.visibleHeight
            / Math.max(1, controller.screenMetrics.screenPixelHeight);
        return {
            visible: [controller.screenMetrics.visibleWidth, controller.screenMetrics.visibleHeight],
            safe: [
                controller.screenMetrics.safeLeft,
                controller.screenMetrics.safeRight,
                controller.screenMetrics.safeBottom,
                controller.screenMetrics.safeTop,
            ],
            capsule: controller.screenMetrics.capsule,
            rootX: controller.rightControlBar.position.x,
            pause,
            header: headerRect,
            cards,
            pauseHeaderGap: pause.bottom - headerRect.top,
            capsuleGapPhysical: controller.screenMetrics.capsule
                ? (controller.screenMetrics.capsule.bottom - pause.top) / logicalPerPhysical
                : undefined,
            pauseLabel: {
                text: controller.pauseButton.label.string,
                horizontalAlign: controller.pauseButton.label.horizontalAlign,
                verticalAlign: controller.pauseButton.label.verticalAlign,
            },
        };
    };

    for (const aspect of aspectCases) {
        const page = await createPage(aspect.width, aspect.height, `layout-${aspect.name}`);
        await beginBattle(page);
        snapshots.layouts[aspect.name] = await withController(page, layoutAudit, aspect);
        await page.waitForTimeout(120);
        await page.screenshot({
            path: path.join(outputDir, `battle_right_control_${aspect.name}_${aspect.width}x${aspect.height}.png`),
            fullPage: true,
        });
        const layout = snapshots.layouts[aspect.name];
        const controls = [layout.pause, layout.header, ...layout.cards];
        check(controls.every((entry) => approximately(entry.localX, 0)),
            `${aspect.name}: pause/header/cards share one local center X`);
        check(controls.every((entry) => approximately(entry.width, 216)),
            `${aspect.name}: pause/header/cards share 216px visual width`);
        check(controls.every((entry) => approximately(entry.left, layout.pause.left)
            && approximately(entry.right, layout.pause.right)),
        `${aspect.name}: right-control edges form one vertical baseline`);
        check(layout.pauseHeaderGap >= 12 && layout.pauseHeaderGap <= 18,
            `${aspect.name}: pause/header vertical gap is 12-18px`, layout.pauseHeaderGap);
        check(layout.pause.right <= layout.safe[1] - 9.9,
            `${aspect.name}: right control remains inside the safe edge`);
        check(layout.pauseLabel.text === 'Ⅱ 暂停',
            `${aspect.name}: pause icon and text remain intact`);
        if (aspect.capsule) {
            check(layout.capsuleGapPhysical >= 10,
                `${aspect.name}: pause is at least 10 physical px below the WeChat capsule`,
                layout.capsuleGapPhysical);
        }
        if (aspect.name === '16x9') {
            const pauseFlow = await withController(page, (_cc, controller) => {
                const before = {
                    isStarted: controller.isStarted,
                    isFinished: controller.isFinished,
                    isPaused: controller.isPaused,
                    pauseVisible: controller.pauseButton.node.active,
                    pausePanel: controller.pausePanel.active,
                    tutorialPanel: controller.tutorialPanel.active,
                };
                controller.pauseGame();
                const paused = {
                    isPaused: controller.isPaused,
                    pauseVisible: controller.pauseButton.node.active,
                    pausePanel: controller.pausePanel.active,
                };
                controller.resumeGame();
                return {
                    before,
                    paused,
                    resumed: {
                        isPaused: controller.isPaused,
                        pauseVisible: controller.pauseButton.node.active,
                        pausePanel: controller.pausePanel.active,
                    },
                };
            });
            check(pauseFlow.paused.isPaused && !pauseFlow.paused.pauseVisible
                && pauseFlow.paused.pausePanel, 'pause flow hides the HUD button and opens the modal', pauseFlow);
            check(!pauseFlow.resumed.isPaused && pauseFlow.resumed.pauseVisible
                && !pauseFlow.resumed.pausePanel, 'resume flow restores the aligned pause button', pauseFlow);
        }
        await page.close();
    }

    const stressPage = await createPage(1280, 720, 'stress-24-units');
    await beginBattle(stressPage);
    const stressSetup = await withController(stressPage, (_cc, controller) => {
        controller.isPaused = false;
        controller.playerEnergy = 999;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(0);
        const definition = controller.units[0]?.definition;
        if (!definition) throw new Error('failed to obtain the live small-unit definition');
        controller.clearBattleUnits();
        controller.isPaused = true;

        const spawnSide = (team, lane, positions) => {
            for (const y of positions) {
                const spawned = controller.spawnUnit(team, lane, definition);
                if (!spawned) throw new Error(`stress spawn failed: team=${team}, lane=${lane}, y=${y}`);
                const unit = controller.units[controller.units.length - 1];
                controller.setUnitLogicY(unit, y);
            }
        };
        for (let lane = 0; lane < 4; lane += 1) {
            spawnSide(0, lane, [-75, -135, -195]);
            spawnSide(1, lane, [75, 135, 195]);
        }
        controller.repairAllLaneInvariants();
        controller.resetLaneLivenessTimers();
        controller.aiDecisionCooldown = 9999;
        controller.playerSupply = 20;
        controller.aiSupply = 20;

        const baseSpeedsPlayer = [20, 17, 14, 12]
            .map((speed) => controller.getUnitMovementDistance({ definition: { speed }, team: 0 }, 1));
        const baseSpeedsAI = [20, 17, 14, 12]
            .map((speed) => controller.getUnitMovementDistance({ definition: { speed }, team: 1 }, 1));
        controller.isPaused = false;
        controller.tryUseSprint(0);
        controller.tryUseSprint(1);
        const sprintSpeedsPlayer = [20, 17, 14, 12]
            .map((speed) => controller.getUnitMovementDistance({ definition: { speed }, team: 0 }, 1));
        const sprintSpeedsAI = [20, 17, 14, 12]
            .map((speed) => controller.getUnitMovementDistance({ definition: { speed }, team: 1 }, 1));
        return {
            initialUnits: controller.units.length,
            baseSpeedsPlayer,
            baseSpeedsAI,
            sprintSpeedsPlayer,
            sprintSpeedsAI,
            playerSprintRemaining: controller.playerSprintRemaining,
            aiSprintRemaining: controller.aiSprintRemaining,
        };
    });
    check(stressSetup.initialUnits === 24, 'stress scene starts with 24 live units');
    check(stressSetup.baseSpeedsPlayer.every((value, index) =>
        approximately(value, [16, 13.6, 11.2, 9.6][index]))
        && stressSetup.baseSpeedsAI.every((value, index) =>
            approximately(value, [16, 13.6, 11.2, 9.6][index])),
    'both factions apply the same 0.80 normal-movement multiplier', stressSetup);
    check(stressSetup.sprintSpeedsPlayer.every((value, index) =>
        approximately(value, [24, 20.4, 16.8, 14.4][index]))
        && stressSetup.sprintSpeedsAI.every((value, index) =>
            approximately(value, [24, 20.4, 16.8, 14.4][index])),
    'sprint remains +50% relative to the reduced base speed', stressSetup);

    await stressPage.waitForTimeout(2800);
    const beforePause = await withController(stressPage, (_cc, controller) =>
        controller.units.filter((unit) => unit.node.isValid).map((unit) => ({
            id: unit.id,
            x: unit.node.position.x,
            y: unit.node.position.y,
        })));
    await withController(stressPage, (_cc, controller) => controller.pauseGame());
    await stressPage.waitForTimeout(900);
    const duringPause = await withController(stressPage, (_cc, controller) =>
        controller.units.filter((unit) => unit.node.isValid).map((unit) => ({
            id: unit.id,
            x: unit.node.position.x,
            y: unit.node.position.y,
        })));
    const pausedPositionsStable = beforePause.length === duringPause.length
        && beforePause.every((before) => {
            const after = duringPause.find((entry) => entry.id === before.id);
            return after && approximately(after.x, before.x, 0.001) && approximately(after.y, before.y, 0.001);
        });
    check(pausedPositionsStable, 'pause freezes all 24-unit logical positions');
    await withController(stressPage, (_cc, controller) => controller.resumeGame());
    await stressPage.waitForTimeout(4000);

    const sprintRecovery = await withController(stressPage, (_cc, controller) => ({
        playerRemaining: controller.playerSprintRemaining,
        aiRemaining: controller.aiSprintRemaining,
        playerBase: controller.getUnitMovementDistance({ definition: { speed: 20 }, team: 0 }, 1),
        aiBase: controller.getUnitMovementDistance({ definition: { speed: 20 }, team: 1 }, 1),
    }));
    check(sprintRecovery.playerRemaining <= 0 && sprintRecovery.aiRemaining <= 0
        && approximately(sprintRecovery.playerBase, 16)
        && approximately(sprintRecovery.aiBase, 16),
    'sprint expiry restores the new 0.80 base speed without stacking', sprintRecovery);

    const secondSprint = await withController(stressPage, (_cc, controller) => {
        controller.playerSupply = 20;
        controller.aiSupply = 20;
        controller.playerSprintCooldown = 0;
        controller.aiSprintCooldown = 0;
        controller.tryUseSprint(0);
        controller.tryUseSprint(1);
        return {
            player: controller.getUnitMovementDistance({ definition: { speed: 20 }, team: 0 }, 1),
            ai: controller.getUnitMovementDistance({ definition: { speed: 20 }, team: 1 }, 1),
        };
    });
    check(approximately(secondSprint.player, 24) && approximately(secondSprint.ai, 24),
        'a second sprint still applies exactly one 1.5 multiplier', secondSprint);
    await stressPage.waitForTimeout(5200);

    snapshots.stress = await withController(stressPage, (_cc, controller) => {
        const liveUnits = controller.units.filter((unit) => unit.node.isValid && unit.health > 0 && !unit.isDying);
        const unitAudit = liveUnits.map((unit) => {
            const bounds = controller.getRoadBoundsForRadius(unit.definition.radius);
            return {
                id: unit.id,
                team: unit.team,
                lane: unit.lane,
                x: unit.node.position.x,
                y: unit.node.position.y,
                scale: [unit.node.scale.x, unit.node.scale.y, unit.node.scale.z],
                minY: bounds.minY,
                maxY: bounds.maxY,
                radius: unit.definition.radius,
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
                        overlapViolations.push({
                            lane,
                            team,
                            front: front.id,
                            rear: rear.id,
                            actualGap,
                            requiredGap,
                        });
                    }
                }
            }
        }
        return {
            liveCount: liveUnits.length,
            dyingCount: controller.dyingUnits.length,
            finished: controller.isFinished,
            paused: controller.isPaused,
            unitAudit,
            overlapViolations,
            liveness: controller.laneRuntimeStates.map((state) => ({
                stalledSeconds: state.stalledSeconds,
                warningIssued: state.warningIssued,
                recoveryCount: state.recoveryCount,
            })),
        };
    });
    await stressPage.screenshot({
        path: path.join(outputDir, 'stress_24_units_after_pause_and_sprints_1280x720.png'),
        fullPage: true,
    });
    check(snapshots.stress.unitAudit.every((unit) =>
        unit.scale.every((value) => approximately(value, 1, 0.001))),
    'all remaining UnitRoot scales stay at 1');
    check(snapshots.stress.unitAudit.every((unit) =>
        unit.y >= unit.minY - 0.01 && unit.y <= unit.maxY + 0.01),
    'all remaining units stay inside road bounds');
    check(snapshots.stress.overlapViolations.length === 0,
        'same-team queues have no overlap after pause and repeated sprint',
        snapshots.stress.overlapViolations);
    check(snapshots.stress.liveness.every((state) => state.recoveryCount === 0
        && !state.warningIssued), 'no lane liveness recovery/deadlock was triggered',
    snapshots.stress.liveness);
    await stressPage.close();

    check(consoleProblems.filter((entry) => entry.type === 'error'
        || entry.type === 'pageerror').length === 0, 'runtime console has no errors', consoleProblems);
    check(requestFailures.length === 0, 'runtime has no failed network requests', requestFailures);
    check(response404s.length === 0, 'runtime has no resource 404 responses', response404s);
} catch (error) {
    fatalError = error instanceof Error ? `${error.stack ?? error.message}` : String(error);
} finally {
    if (browser) await browser.close();
}

const passed = !fatalError && checks.every((entry) => entry.pass);
const report = {
    passed,
    fatalError,
    checks,
    snapshots,
    consoleProblems,
    requestFailures,
    response404s,
};
fs.writeFileSync(
    path.join(outputDir, 'mobilefix01_runtime_audit.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
);
console.log(JSON.stringify(report, null, 2));
if (!passed) process.exitCode = 1;
