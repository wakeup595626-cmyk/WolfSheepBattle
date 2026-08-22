import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-level06/functional');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8776';
fs.mkdirSync(outputDir, { recursive: true });

const consoleProblems = [];
const requestFailures = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
        schemaVersion: 3,
        highestUnlockedLevel: 5,
        completedLevels: [1, 2, 3, 4, 5],
        selectedLevelId: 5,
        specialRoadTutorialSeen: true,
        freezeUnlocked: true,
        selectedTactics: ['heal', 'shock', 'freeze'],
        selectedTacticsByLevel: {
            4: ['heal', 'shock', 'freeze'],
            5: ['sprint', 'heal', 'surge'],
        },
        levelFiveTutorialSeen: true,
    }));
    localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
        selectedBgmId: 'cheerful_lighthearted',
        musicVolume: 0.5,
        sfxVolume: 0.75,
        musicMuted: true,
        sfxMuted: true,
        lastNonZeroMusicVolume: 0.5,
        lastNonZeroSfxVolume: 0.75,
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
    url: request.url(), failure: request.failure()?.errorText ?? 'unknown',
}));

await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    if (!scene) return false;
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
    return Boolean(controller && controller.startPanel.active && !controller.artLoadingPanel?.active);
}, { timeout: 60000 });

const audit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    let scene = cc.director.getScene();
    for (let attempt = 0; !scene && attempt < 100; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        scene = cc.director.getScene();
    }
    if (!scene) throw new Error('runtime scene unavailable');
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
    if (!controller) throw new Error('GameController not found');
    cc.director.pause();

    const checks = [];
    const check = (pass, message, detail) => checks.push({ pass: Boolean(pass), message, detail });
    const countNodes = () => {
        let count = 0;
        const scan = (node) => { count += 1; node.children.forEach(scan); };
        scan(scene);
        return count;
    };

    const levels = [1, 2, 3, 4, 5, 6].map((id) => controller.getLevelConfig(id));
    check(levels.every((level, index) => level?.id === index + 1 && level.implemented === true),
        'exactly six implemented level configurations are available', levels.map((level) => level && ({
            id: level.id, title: level.title, laneTypes: level.laneTypes,
        })));
    const level6 = levels[5];
    check(level6.title === '补给争夺战'
        && level6.description === '黄金补给线会定期转移。占领黄金补给点可获得额外补给，守到活动结束还能获得奖励。'
        && level6.playerEnergyRecoveryMultiplier === undefined
        && level6.continuousSmallUnitDeployment !== true
        && level6.aiMinimumDeployCooldown === 4.5,
    'level 6 uses the requested title, description, normal energy/queue rules, and 4.5s AI floor', level6);
    check(levels.slice(0, 5).every((level) => level.laneTypes.length === 4)
        && levels[4].playerEnergyRecoveryMultiplier === 2.5
        && levels[4].aiEnergyRecoveryMultiplier === 2.5
        && levels[4].continuousSmallUnitDeployment === true,
    'level 1-5 configuration invariants remain intact', levels.slice(0, 5));

    const migrated = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2'));
    check(migrated.schemaVersion === 4
        && [1, 2, 3, 4, 5].every((id) => migrated.completedLevels.includes(id))
        && JSON.stringify(migrated.selectedTacticsByLevel['5']) === JSON.stringify(['sprint', 'heal', 'surge'])
        && JSON.stringify(migrated.selectedTacticsByLevel['6']) === JSON.stringify(['sprint', 'heal', 'supplyBoost']),
    'schema 3 save migrates to schema 4 without losing level 1-5 progress or the level 5 deck', migrated);

    controller.showLevelSelect();
    controller.selectLevel(6);
    const levelCardRows = Array.from(controller.levelCards.values()).map((card) => ({
        id: card.levelId,
        y: card.root.position.y,
        height: card.root.getComponent(cc.UITransform).contentSize.height,
        selected: card.visualState === 'selected',
        title: card.titleLabel.string,
        description: card.descriptionLabel.string,
    }));
    const sortedRows = [...levelCardRows].sort((a, b) => b.y - a.y);
    const noCardOverlap = sortedRows.every((row, index) => index === 0
        || sortedRows[index - 1].y - sortedRows[index - 1].height / 2 >= row.y + row.height / 2);
    check(levelCardRows.length === 6 && noCardOverlap
        && levelCardRows.find((row) => row.id === 6)?.selected
        && controller.levelSelectHintLabel.string === '当前选择：第6关·补给争夺战'
        && controller.levelSelectConfirmButton.label.string === '开始挑战第6关',
    'level-select shows six non-overlapping cards and explicit level 6 selection/confirm text', {
        rows: levelCardRows,
        hint: controller.levelSelectHintLabel.string,
        confirm: controller.levelSelectConfirmButton.label.string,
    });

    controller.currentLevel = 6;
    controller.showTacticDeckSelection();
    const visibleOptions = Array.from(controller.tacticDeckOptions.values()).filter((option) => option.root.active);
    const optionLayout = visibleOptions.map((option) => ({
        kind: option.kind,
        x: option.root.position.x,
        y: option.root.position.y,
        scale: option.root.scale.x,
        selected: controller.pendingDeckSelection.includes(option.kind),
    }));
    const uniquePositions = new Set(optionLayout.map((entry) => `${entry.x}:${entry.y}`));
    check(visibleOptions.length === 6 && uniquePositions.size === 6
        && controller.pendingDeckSelection.length === 3
        && controller.pendingDeckSelection.includes('supplyBoost')
        && controller.tacticDeckSubtitleLabel.string.includes('从6张战术牌中选择3张'),
    'level 6 deck selection exposes six distinct cards and keeps a three-card selection', optionLayout);

    controller.tacticDeckPanel.active = false;
    controller.selectedTactics = ['sprint', 'heal', 'supplyBoost'];
    controller.selectedTacticsByLevel.set(6, [...controller.selectedTactics]);
    controller.restartGame();
    controller.activateBattle();
    controller.resetLevelSixGoldenState();
    controller.updateLevelSixGoldenSupply(8.9);
    const beforeWarning = { warning: controller.goldenWarningShown, next: controller.goldenNextActivationRemaining };
    controller.updateLevelSixGoldenSupply(0.2);
    const warning = {
        shown: controller.goldenWarningShown,
        lane: controller.goldenPendingLane,
        text: controller.goldenSupplyNoticeLabel.string,
    };
    controller.updateLevelSixGoldenSupply(2.9);
    const firstActivation = {
        lane: controller.goldenLane,
        active: controller.goldenActiveRemaining,
        round: controller.goldenRoundId,
        panel: controller.goldenSupplyPanel.active,
        overlay: controller.supplyPoints[controller.goldenLane]?.goldenOverlayNode.active,
    };
    check(!beforeWarning.warning && warning.shown && warning.lane >= 0
        && warning.text === `第${warning.lane + 1}路即将成为黄金补给线！`
        && firstActivation.lane === warning.lane && firstActivation.active === 14
        && firstActivation.panel,
    'first warning begins at 9s and activates the announced golden lane at 12s for 14s', {
        beforeWarning, warning, firstActivation,
    });

    controller.playerSupply = 2;
    controller.playerSupplyBoostCooldown = 0;
    controller.tryUseSupplyBoost();
    const armed = {
        supply: controller.playerSupply,
        remaining: controller.playerSupplyBoostRemaining,
        cooldown: controller.playerSupplyBoostCooldown,
        state: controller.getPlayerTacticAvailability('supplyBoost'),
    };
    const goldenPoint = controller.supplyPoints[controller.goldenLane];
    goldenPoint.owner = 0;
    controller.handleLevelSixGoldenCapture(goldenPoint, 0);
    const afterCapture = {
        supply: controller.playerSupply,
        remaining: controller.playerSupplyBoostRemaining,
        triggeredRound: controller.supplyBoostTriggeredRound,
        rewardGranted: controller.goldenCaptureRewardGranted,
    };
    controller.handleLevelSixGoldenCapture(goldenPoint, 0);
    const afterDuplicate = controller.playerSupply;
    controller.goldenActiveRemaining = 0.1;
    controller.updateLevelSixGoldenSupply(0.1);
    const afterHold = { supply: controller.playerSupply, lane: controller.goldenLane, triggered: controller.supplyBoostTriggeredRound };
    check(armed.supply === 0 && armed.remaining === 12 && armed.cooldown === 16
        && afterCapture.supply === 3 && afterCapture.remaining === 0
        && afterDuplicate === 3 && afterHold.supply === 5 && afterHold.lane === -1
        && afterHold.triggered === 0,
    'supply boost spends 2, adds +1 to capture and hold once, rejects duplicates, and clamps supply to 5', {
        armed, afterCapture, afterDuplicate, afterHold,
    });

    controller.playerSupply = 2;
    controller.playerSupplyBoostCooldown = 0;
    controller.tryUseSupplyBoost();
    controller.update(5);
    const beforePause = {
        boost: controller.playerSupplyBoostRemaining,
        cooldown: controller.playerSupplyBoostCooldown,
        next: controller.goldenNextActivationRemaining,
    };
    controller.pauseGame();
    controller.update(5);
    const duringPause = {
        boost: controller.playerSupplyBoostRemaining,
        cooldown: controller.playerSupplyBoostCooldown,
        next: controller.goldenNextActivationRemaining,
    };
    controller.resumeGame();
    controller.update(7.1);
    const afterTimeout = controller.playerSupplyBoostRemaining;
    check(JSON.stringify(beforePause) === JSON.stringify(duringPause) && afterTimeout === 0,
        'pause freezes golden and supply-boost timers; an untriggered boost expires after 12 active seconds', {
            beforePause, duringPause, afterTimeout,
        });

    controller.resetLevelSixGoldenState();
    for (let index = 0; index < 220; index += 1) controller.updateLevelSixGoldenSupply(0.5);
    const history = [...controller.goldenLaneHistory];
    const firstFour = new Set(history.slice(0, 4));
    const consecutiveRepeats = history.filter((lane, index) => index > 0 && history[index - 1] === lane).length;
    check(history.length >= 5 && firstFour.size === 4 && consecutiveRepeats === 0,
        'the shuffled golden-lane bag covers all four roads and prevents consecutive repeats', history);

    controller.restartGame();
    controller.activateBattle();
    controller.goldenLane = 2;
    controller.goldenActiveRemaining = 10;
    controller.levelSixAILaneDecisions.fill(0);
    const laneCounts = [0, 0, 0, 0];
    for (let index = 0; index < 2000; index += 1) {
        const lane = controller.chooseAILane(['small']);
        if (lane !== undefined) laneCounts[lane] += 1;
    }
    const goldenRatio = laneCounts[2] / laneCounts.reduce((sum, value) => sum + value, 0);
    const aiCooldown = controller.getAIDeployCooldown({ cost: 12 });
    check(goldenRatio >= 0.55 && goldenRatio <= 0.65
        && laneCounts.every((count) => count > 0) && aiCooldown >= 4.5,
    'level 6 AI targets the golden road about 60%, still uses every other road, and respects the 4.5s floor', {
        laneCounts, goldenRatio, aiCooldown,
    });

    controller.battleElapsedSeconds = 123.4;
    controller.playerBaseHealth = 78;
    controller.playerStats.supplyEarned = 9;
    controller.updateLevelSixBestResult();
    controller.completedLevels.add(6);
    controller.saveLevelProgress();
    const saved = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2'));
    check(saved.completedLevels.includes(6)
        && saved.bestResultsByLevel['6'].fastestWinSeconds === 123.4
        && saved.bestResultsByLevel['6'].highestBaseHealth === 78
        && saved.bestResultsByLevel['6'].highestSupplyEarned === 9
        && saved.selectedTacticsByLevel['6'].includes('supplyBoost'),
    'level 6 completion, best result, and recent deck persist in schema 4', saved);

    const beforeRestartNodes = countNodes();
    for (let index = 0; index < 10; index += 1) {
        controller.restartGame();
        controller.activateBattle();
    }
    const afterRestartNodes = countNodes();
    const goldenNodes = nodes.filter((node) => node.name === 'GoldenSupplyPanel' || node.name === 'GoldenSupplyNotice').length;
    check(afterRestartNodes === beforeRestartNodes && goldenNodes === 2
        && controller.goldenRoundId === 0 && controller.goldenLane === -1
        && controller.playerSupplyBoostRemaining === 0,
    'ten restart cycles reuse golden UI nodes and clear all round/boost state', {
        beforeRestartNodes, afterRestartNodes, goldenNodes,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    return { checks, levelCardRows, optionLayout, history, laneCounts, migrated, saved };
});

await page.screenshot({ path: path.join(outputDir, 'level06_runtime_1280x720.png'), fullPage: true });
const checks = [
    ...audit.checks,
    { pass: consoleProblems.length === 0, message: 'runtime console has no warnings or errors', detail: consoleProblems },
    { pass: requestFailures.length === 0, message: 'runtime has no failed requests', detail: requestFailures },
];
const report = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    passed: checks.every((entry) => entry.pass),
    totals: { checks: checks.length, passed: checks.filter((entry) => entry.pass).length, failed: checks.filter((entry) => !entry.pass).length },
    checks,
    snapshots: audit,
    consoleProblems,
    requestFailures,
};
fs.writeFileSync(path.join(outputDir, 'level06_functional_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, totals: report.totals, failed: checks.filter((entry) => !entry.pass).map((entry) => entry.message) }, null, 2));
await browser.close();
if (!report.passed) process.exitCode = 1;
