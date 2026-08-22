import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/victory-result-ui-01/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7456';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const snapshots = {};
const consoleProblems = [];
const requestFailures = [];
const response404s = [];
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
                .find((component) => typeof component.finishGame === 'function'
                    && typeof component.getNextImplementedLevelConfig === 'function');
            if (!controller) throw new Error('GameController component was not found');
            return Function('cc', 'controller', 'argument',
                `return (${callbackSource})(cc, controller, argument);`)(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(5000);

    const presentResult = async (levelId, playerWon, alreadyCompleted = false) => {
        await withController(async (_cc, controller, argument) => {
            controller.restartGame();
            controller.currentLevel = argument.levelId;
            controller.isStarted = true;
            controller.completedLevels.clear();
            if (argument.alreadyCompleted) controller.completedLevels.add(argument.levelId);
            controller.playerBaseHealth = argument.playerWon ? 83 : 0;
            controller.aiBaseHealth = argument.playerWon ? 0 : 46;
            controller.playerStats = {
                unitsSpawned: 8,
                supplyEarned: 17,
                shockUses: 1,
                sprintUses: 1,
                healUses: 1,
                freezeUses: 0,
            };
            controller.aiStats = {
                unitsSpawned: 12,
                supplyEarned: 5,
                shockUses: 0,
                sprintUses: 0,
                healUses: 0,
                freezeUses: 0,
            };
            await controller.artResourceManager.preloadGroups(['result']);
            controller.finishGame(argument.playerWon);
        }, { levelId, playerWon, alreadyCompleted });
        await page.waitForTimeout(1300);
        return withController((_cc, controller) => {
            const size = (node) => {
                const transform = node.getComponent(_cc.UITransform);
                return [transform.contentSize.width, transform.contentSize.height];
            };
            const values = (card) => card.valueLabels.map((label) => label.string);
            const panelArt = controller.resultCard.getChildByName('ResultPanelArt');
            return {
                currentLevel: controller.currentLevel,
                title: controller.resultTitleLabel.string,
                summary: controller.resultSummaryLabel.string,
                hint: controller.resultHintLabel.string,
                playerValues: values(controller.resultPlayerDataCard),
                aiValues: values(controller.resultAiDataCard),
                panelSize: size(controller.resultCard),
                badgeSize: size(controller.resultBadge),
                buttonSizes: controller.resultButtonViews.map((button) => size(button.node)),
                buttonPositions: controller.resultButtonViews.map((button) => [button.node.position.x, button.node.position.y]),
                nextActive: controller.resultNextButton.active,
                graphicsFallbackEnabled: controller.resultCardGraphics.enabled,
                formalPanelActive: Boolean(panelArt?.active && panelArt.getComponent(_cc.Sprite)?.spriteFrame),
                resultPanelActive: controller.resultPanel.active,
                buttonsActive: controller.resultButtonsGroup.active,
                resultActionsLocked: controller.resultActionsLocked,
            };
        });
    };

    for (const levelId of [1, 2, 3, 4]) {
        const snapshot = await presentResult(levelId, true, false);
        snapshots[`victoryLevel${levelId}`] = snapshot;
        check(snapshot.title === '战斗胜利', `level ${levelId} victory title is correct`, snapshot.title);
        check(snapshot.summary.startsWith(`第 ${levelId} 关·`) && snapshot.summary.includes('挑战成功'),
            `level ${levelId} uses its dynamic level summary`, snapshot.summary);
        check(snapshot.playerValues.join(',') === '83/100,8,17,3次',
            `level ${levelId} player card uses real formatted values`, snapshot.playerValues);
        check(snapshot.aiValues.join(',') === '0/100,12,5,未使用',
            `level ${levelId} AI card formats zero tactic use and removes .0`, snapshot.aiValues);
        check(snapshot.panelSize.join(',') === '720,540' && snapshot.badgeSize.join(',') === '80,80',
            `level ${levelId} result panel and badge use the new dimensions`, {
                panel: snapshot.panelSize, badge: snapshot.badgeSize,
            });
        check(snapshot.buttonSizes.every((size) => size.join(',') === '190,58'),
            `level ${levelId} result buttons keep touch-friendly dimensions`, snapshot.buttonSizes);
        check(snapshot.nextActive === (levelId < 4),
            `level ${levelId} only shows next when an adjacent implemented level exists`, snapshot.nextActive);
        if (levelId === 1) {
            await page.screenshot({ path: path.join(outputDir, 'victory_level1_1280x720.png'), fullPage: true });
        }
        if (levelId === 4) {
            check(snapshot.buttonPositions[0][0] === -110 && snapshot.buttonPositions[2][0] === 110,
                'last implemented level centers the remaining two buttons', snapshot.buttonPositions);
            check(snapshot.hint === '当前已完成全部开放关卡。',
                'last implemented level uses the free-selection completion hint', snapshot.hint);
            await page.screenshot({ path: path.join(outputDir, 'victory_level4_last_1280x720.png'), fullPage: true });
        }
    }

    snapshots.repeatedVictory = await presentResult(2, true, true);
    check(snapshots.repeatedVictory.hint.includes('本关已再次完成'),
        'repeated completion has a dedicated non-unlock hint', snapshots.repeatedVictory.hint);

    snapshots.defeat = await presentResult(3, false, false);
    check(snapshots.defeat.title === '战斗失败' && snapshots.defeat.summary.includes('挑战未完成'),
        'defeat reuses the same result structure with defeat copy', snapshots.defeat);
    check(!snapshots.defeat.nextActive
        && snapshots.defeat.buttonPositions[0][0] === -110
        && snapshots.defeat.buttonPositions[2][0] === 110,
    'defeat hides next and centers retry/level-select buttons', snapshots.defeat.buttonPositions);
    await page.screenshot({ path: path.join(outputDir, 'defeat_level3_1280x720.png'), fullPage: true });

    snapshots.pressState = await withController((_cc, controller) => {
        const button = controller.resultRetryButton;
        button.node.emit(_cc.Node.EventType.TOUCH_START);
        const pressedScale = [button.node.scale.x, button.node.scale.y];
        button.node.emit(_cc.Node.EventType.TOUCH_CANCEL);
        return { pressedScale, pressed: button.pressed };
    });
    check(snapshots.pressState.pressedScale.join(',') === '0.97,0.97' && !snapshots.pressState.pressed,
        'result button press feedback is scale-only and cancel restores state', snapshots.pressState);

    await page.setViewportSize({ width: 1600, height: 720 });
    await page.waitForTimeout(300);
    snapshots.wide = await withController((_cc, controller) => {
        const transform = controller.resultCard.getComponent(_cc.UITransform);
        return {
            position: [controller.resultCard.position.x, controller.resultCard.position.y],
            size: [transform.contentSize.width, transform.contentSize.height],
            panelActive: controller.resultPanel.active,
        };
    });
    check(snapshots.wide.position.join(',') === '0,0' && snapshots.wide.size.join(',') === '720,540',
        'wide landscape keeps the unified result card centered without stretching', snapshots.wide);
    await page.screenshot({ path: path.join(outputDir, 'defeat_level3_1600x720.png'), fullPage: true });

    check(consoleProblems.length === 0, 'preview console has no new errors or warnings', consoleProblems);
    check(requestFailures.length === 0, 'preview has no failed requests', requestFailures);
    check(response404s.length === 0, 'preview has no 404 responses', response404s);
} catch (error) {
    fatalError = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
} finally {
    if (browser) await browser.close();
}

const result = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    passed: !fatalError && checks.every((item) => item.pass),
    totals: {
        checks: checks.length,
        passed: checks.filter((item) => item.pass).length,
        failed: checks.filter((item) => !item.pass).length,
    },
    checks,
    snapshots,
    consoleProblems,
    requestFailures,
    response404s,
    fatalError,
};

fs.writeFileSync(path.join(outputDir, 'validation_result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ passed: result.passed, totals: result.totals, fatalError }, null, 2));
if (!result.passed) process.exitCode = 1;
