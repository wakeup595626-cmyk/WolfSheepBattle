import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-level06/level01-05-regression');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:8776';
fs.mkdirSync(outputDir, { recursive: true });
const consoleProblems = [];
const requestFailures = [];
const browser = await chromium.launch({ headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('wolf-sheep-battle.progress.v2', JSON.stringify({
        schemaVersion: 3, highestUnlockedLevel: 5, completedLevels: [1, 2, 3, 4, 5],
        selectedLevelId: 5, specialRoadTutorialSeen: true, levelFiveTutorialSeen: true,
        freezeUnlocked: true, tutorialCompleted: true,
        selectedTacticsByLevel: { 4: ['sprint', 'heal', 'freeze'], 5: ['sprint', 'heal', 'surge'] },
    }));
    localStorage.setItem('wolf-sheep-battle.audio-settings.v1', JSON.stringify({
        selectedBgmId: 'cheerful_lighthearted', musicVolume: 0.5, sfxVolume: 0.75,
        musicMuted: true, sfxMuted: true, lastNonZeroMusicVolume: 0.5, lastNonZeroSfxVolume: 0.75,
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
await page.waitForTimeout(10000);
const audit = await page.evaluate(async () => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    const nodes = [];
    const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        component?.startPanel && typeof component.updateLevelSixGoldenSupply === 'function');
    if (!controller) throw new Error('GameController not found');
    const results = [];
    const unitTypes = ['small', 'medium', 'large', 'giant'];
    const decks = {
        1: [], 2: [], 3: [],
        4: ['sprint', 'heal', 'freeze'],
        5: ['sprint', 'heal', 'surge'],
    };
    for (let level = 1; level <= 5; level += 1) {
        controller.isStarted = false;
        controller.currentLevel = level;
        controller.selectedTactics = [...decks[level]];
        controller.restartGame();
        controller.startPanel.active = false;
        controller.tacticDeckPanel.active = false;
        controller.tutorialPanel.active = false;
        controller.specialRoadTutorialPanel.active = false;
        controller.levelFiveTutorialPanel.active = false;
        controller.activateBattle();
        controller.playerEnergy = 100;
        controller.aiEnergy = 100;
        for (let lane = 0; lane < 4; lane += 1) {
            controller.playerEnergy = 100;
            controller.playerSpawnCooldown = 0;
            controller.selectedSheepType = unitTypes[lane];
            controller.tryDeploySelectedUnit(lane);
        }
        for (let tick = 0; tick < 100; tick += 1) controller.update(0.05);
        const activeUnits = controller.units.filter((unit) => controller.isActiveBattleUnit(unit));
        const playerLanes = new Set(activeUnits.filter((unit) => unit.team === 0).map((unit) => unit.lane));
        const boundsViolations = activeUnits.filter((unit) => {
            const bounds = controller.getUnitRoadBounds(unit);
            return !Number.isFinite(unit.node.position.x) || !Number.isFinite(unit.node.position.y)
                || unit.node.position.y < bounds.minY - 0.01 || unit.node.position.y > bounds.maxY + 0.01
                || Math.abs(unit.node.position.x - controller.getLaneCenterX(unit.lane)) > 0.01;
        }).length;
        const beforePause = {
            elapsed: controller.battleElapsedSeconds,
            positions: activeUnits.map((unit) => [unit.id, unit.node.position.x, unit.node.position.y]),
        };
        controller.pauseGame();
        controller.update(2);
        const duringPause = {
            elapsed: controller.battleElapsedSeconds,
            positions: activeUnits.map((unit) => [unit.id, unit.node.position.x, unit.node.position.y]),
        };
        controller.resumeGame();
        controller.update(0.1);
        const resumed = controller.battleElapsedSeconds > beforePause.elapsed;
        const config = controller.getLevelConfig(level);
        controller.isStarted = false;
        controller.restartGame();
        results.push({
            level, title: config.title, laneTypes: [...config.laneTypes],
            energyMultiplier: config.playerEnergyRegenMultiplier,
            continuousSmallUnitDeployment: Boolean(config.continuousSmallUnitDeployment),
            activeUnits: activeUnits.length, playerLanes: [...playerLanes], boundsViolations,
            pauseFrozen: JSON.stringify(beforePause) === JSON.stringify(duringPause), resumed,
            clearedAfterRestart: controller.units.length === 0 && controller.dyingUnits.length === 0,
        });
    }
    const saved = JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2'));
    return { results, saved };
});

const checks = [
    ...audit.results.map((result) => ({
        pass: result.activeUnits >= 4 && result.playerLanes.length === 4 && result.boundsViolations === 0
            && result.pauseFrozen && result.resumed && result.clearedAfterRestart,
        message: `level ${result.level} preserves four-road spawn, bounds, pause/resume, and restart cleanup`,
        detail: result,
    })),
    { pass: audit.results.slice(0, 4).every((result) => !result.continuousSmallUnitDeployment)
        && audit.results[4].continuousSmallUnitDeployment,
    message: 'level 5 alone keeps its continuous-small-unit rule among levels 1-5', detail: audit.results },
    { pass: [1, 2, 3, 4, 5].every((level) => audit.saved.completedLevels.includes(level)),
        message: 'schema migration retains all existing level 1-5 completion records', detail: audit.saved },
    { pass: consoleProblems.length === 0 && requestFailures.length === 0,
        message: 'level 1-5 runtime regression produced no console or request failures',
        detail: { consoleProblems, requestFailures } },
];
const report = {
    generatedAt: new Date().toISOString(), previewUrl,
    passed: checks.every((entry) => entry.pass),
    totals: { checks: checks.length, passed: checks.filter((entry) => entry.pass).length,
        failed: checks.filter((entry) => !entry.pass).length },
    checks, audit, consoleProblems, requestFailures,
};
fs.writeFileSync(path.join(outputDir, 'level01_05_regression_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, totals: report.totals,
    failed: checks.filter((entry) => !entry.pass).map((entry) => entry.message) }, null, 2));
await browser.close();
if (!report.passed) process.exitCode = 1;
