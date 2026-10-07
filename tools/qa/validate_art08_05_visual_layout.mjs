import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2];
if (!outputDir) throw new Error('output directory is required');
const baseUrl = process.argv[3] ?? 'http://localhost:7456';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
const consoleRecords = [];
const pendingConsoleRecords = [];
const requestFailures = [];
const response404s = [];
page.on('console', (message) => {
    const pending = Promise.all(message.args().map(async (argument) => {
        try { return await argument.jsonValue(); } catch { return argument.toString(); }
    })).then((args) => consoleRecords.push({ type: message.type(), text: message.text(), args }));
    pendingConsoleRecords.push(pending);
});
page.on('pageerror', (error) => consoleRecords.push({ type: 'pageerror', text: error.message, args: [] }));
page.on('requestfailed', (request) => requestFailures.push({
    url: request.url(), failure: request.failure()?.errorText ?? 'unknown',
}));
page.on('response', (response) => {
    if (response.status() === 404) response404s.push(response.url());
});

const getCanvas = async () => {
    await page.waitForSelector('canvas', { timeout: 30000 });
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('preview canvas has no bounding box');
    return { canvas, box };
};
const designToPage = (box, x, y) => ({
    x: box.x + (x + 640) / 1280 * box.width,
    y: box.y + (360 - y) / 720 * box.height,
});
const clickDesign = async (x, y, waitMs = 250) => {
    const { box } = await getCanvas();
    const point = designToPage(box, x, y);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(waitMs);
};
const withController = async (callbackSource, argument) => page.evaluate(async ({ callbackSource, argument }) => {
    const cc = await System.import('cc');
    const scene = cc.director.getScene();
    if (!scene) throw new Error('runtime scene is unavailable');
    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        for (const child of node.children) visit(child);
    };
    visit(scene);
    const components = nodes.flatMap((node) => node.components ?? []);
    const controller = components.find((component) => typeof component.trySpawnPlayerUnit === 'function'
        && component.typeButtons instanceof Map);
    if (!controller) throw new Error('GameController component was not found');
    const callback = Function('cc', 'scene', 'nodes', 'controller', 'argument',
        `return (${callbackSource})(cc, scene, nodes, controller, argument);`);
    return callback(cc, scene, nodes, controller, argument);
}, { callbackSource: callbackSource.toString(), argument });

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await getCanvas();
await page.waitForTimeout(8500);
await clickDesign(0, -118, 6000);
await clickDesign(0, -168, 1500);

await withController((_cc, _scene, _nodes, controller) => {
    controller.aiDecisionCooldown = 99999;
    controller.playerEnergy = 100;
    controller.aiEnergy = 100;
    controller.snapEnergyBarsToCurrentValues();
    controller.refreshHud();
    return true;
});
const { canvas } = await getCanvas();
await canvas.screenshot({ path: path.join(outputDir, 'after_battle_1280x720.png') });

const levelAudits = [];
for (const level of [1, 2, 3]) {
    const audit = await withController((cc, _scene, _nodes, controller, level) => {
        controller.currentLevel = level;
        controller.refreshBattleLevelBadge();
        const badgeSize = controller.levelBadge.getComponent(cc.UITransform)?.contentSize;
        const contentSize = controller.levelBadgeContent.getComponent(cc.UITransform)?.contentSize;
        const chapterSize = controller.levelBadgeChapterLabel.node.getComponent(cc.UITransform)?.contentSize;
        const titleSize = controller.levelBadgeTitleLabel.node.getComponent(cc.UITransform)?.contentSize;
        return {
            level,
            badgeSize: badgeSize ? [badgeSize.width, badgeSize.height] : undefined,
            contentSize: contentSize ? [contentSize.width, contentSize.height] : undefined,
            contentParent: controller.levelBadgeContent.parent?.name,
            frameNode: controller.levelBadge.getChildByName('LevelBadgeFrameSprite')?.name,
            chapterText: controller.levelBadgeChapterLabel.string,
            chapterPosition: [controller.levelBadgeChapterLabel.node.position.x, controller.levelBadgeChapterLabel.node.position.y],
            chapterSize: chapterSize ? [chapterSize.width, chapterSize.height] : undefined,
            chapterOverflow: controller.levelBadgeChapterLabel.overflow,
            titleText: controller.levelBadgeTitleLabel.string,
            titlePosition: [controller.levelBadgeTitleLabel.node.position.x, controller.levelBadgeTitleLabel.node.position.y],
            titleSize: titleSize ? [titleSize.width, titleSize.height] : undefined,
            titleOverflow: controller.levelBadgeTitleLabel.overflow,
            shrinkOverflow: cc.Label.Overflow.SHRINK,
        };
    }, level);
    levelAudits.push(audit);
    await canvas.screenshot({ path: path.join(outputDir, `level_badge_level${level}.png`) });
}
await withController((_cc, _scene, _nodes, controller) => {
    controller.currentLevel = 1;
    controller.refreshBattleLevelBadge();
    return true;
});

const energyAudits = [];
for (const value of [0, 25, 50, 75, 100]) {
    const audit = await withController((cc, _scene, _nodes, controller, value) => {
        controller.playerEnergy = value;
        controller.aiEnergy = value;
        controller.snapEnergyBarsToCurrentValues();
        controller.refreshHud();
        const metric = (bar) => {
            const trackSize = bar.trackNode.getComponent(cc.UITransform)?.contentSize;
            const fillSize = bar.fillNode.getComponent(cc.UITransform)?.contentSize;
            return {
                trackName: bar.trackNode.name,
                trackPosition: [bar.trackNode.position.x, bar.trackNode.position.y],
                trackSize: trackSize ? [trackSize.width, trackSize.height] : undefined,
                fillPosition: [bar.fillNode.position.x, bar.fillNode.position.y],
                fillSize: fillSize ? [fillSize.width, fillSize.height] : undefined,
                fillScaleX: bar.fillNode.scale.x,
                fillVisibleWidth: (fillSize?.width ?? 0) * bar.fillNode.scale.x,
                fillActive: bar.fillNode.active,
                labelPosition: [bar.label.node.position.x, bar.label.node.position.y],
                labelText: bar.label.string,
                rootGraphicsEnabled: bar.node.getComponent(cc.Graphics)?.enabled ?? false,
                trackCount: bar.node.children.filter((child) => child.name === 'TrackBackground').length,
                fillCount: bar.node.children.filter((child) => child.name === 'Fill').length,
            };
        };
        return { value, ai: metric(controller.aiEnergyBar), player: metric(controller.playerEnergyBar) };
    }, value);
    energyAudits.push(audit);
    await canvas.screenshot({ path: path.join(outputDir, `energy_${String(value).padStart(3, '0')}.png`) });
}

const selectedAudit = await withController((_cc, _scene, _nodes, controller) => {
    controller.playerEnergy = 100;
    controller.selectedSheepType = 'medium';
    controller.refreshUnitTypeButtons();
    return [...controller.typeButtons.entries()].map(([type, button]) => ({
        type,
        state: button.visualState,
        status: button.stateLabel.string,
        yellow: button.artSelectionGraphics?.node.active ?? false,
        scale: button.node.scale.x,
    }));
});
await canvas.screenshot({ path: path.join(outputDir, 'unit_card_selected_yellow_only.png') });

const insufficientAudit = await withController((_cc, _scene, _nodes, controller) => {
    controller.playerEnergy = 0;
    controller.selectedSheepType = 'medium';
    controller.refreshUnitTypeButtons();
    return [...controller.typeButtons.entries()].map(([type, button]) => ({
        type,
        state: button.visualState,
        status: button.stateLabel.string,
        yellow: button.artSelectionGraphics?.node.active ?? false,
    }));
});
await canvas.screenshot({ path: path.join(outputDir, 'unit_card_insufficient.png') });

await withController((_cc, _scene, _nodes, controller) => {
    controller.playerEnergy = 100;
    controller.selectedSheepType = 'small';
    controller.playerSpawnCooldown = 0;
    controller.trySpawnPlayerUnit(0);
    controller.pauseGame();
    return true;
});
await page.waitForTimeout(1800);
await canvas.screenshot({ path: path.join(outputDir, 'after_pause_1280x720.png') });

const pauseAudit = await withController((cc, _scene, _nodes, controller) => {
    const root = controller.pauseContentRoot;
    const rootSize = root.getComponent(cc.UITransform)?.contentSize;
    const requiredNames = ['PauseTitle', 'PauseHint', 'ResumeButton', 'PauseRestartButton', 'HelpButton',
        'ReturnTitleButton', 'BgmSelector', 'MusicVolume', 'SfxVolume'];
    const metric = (node) => {
        const size = node.getComponent(cc.UITransform)?.contentSize;
        const width = (size?.width ?? 0) * Math.abs(node.scale.x);
        const height = (size?.height ?? 0) * Math.abs(node.scale.y);
        return {
            name: node.name,
            parent: node.parent?.name,
            position: [node.position.x, node.position.y],
            size: [size?.width ?? 0, size?.height ?? 0],
            bounds: [node.position.x - width / 2, node.position.y - height / 2,
                node.position.x + width / 2, node.position.y + height / 2],
        };
    };
    const actions = ['ResumeButton', 'PauseRestartButton', 'HelpButton', 'ReturnTitleButton'].map((name) => {
        const node = root.getChildByName(name);
        const label = node?.getChildByName('Text')?.getComponent(cc.Label);
        return { ...metric(node), text: label?.string, fontSize: label?.fontSize,
            color: label ? [label.color.r, label.color.g, label.color.b, label.color.a] : undefined };
    });
    const volumeMetric = (control) => ({
        ...metric(control.root),
        title: control.root.getChildByName(`${control.root.name}Title`)?.getComponent(cc.Label)?.string,
        columns: control.root.children.filter((child) =>
            child.name.includes('Mute') || child.name.includes('Minus') || child.name.includes('Track')
            || child.name.includes('Plus') || child.name.includes('Percent')).map(metric),
        trackWidth: control.trackWidth,
    });
    const worldBefore = {
        paused: controller.isPaused,
        playerEnergy: controller.playerEnergy,
        aiEnergy: controller.aiEnergy,
        unitPositions: controller.units.map((unit) => [unit.node.position.x, unit.node.position.y]),
    };
    return {
        root: metric(root),
        rootSize: rootSize ? [rootSize.width, rootSize.height] : undefined,
        requiredParents: requiredNames.map((name) => ({ name, parent: root.getChildByName(name)?.parent?.name })),
        actions,
        bgm: metric(root.getChildByName('BgmSelector')),
        bgmTrackText: controller.bgmCurrentTrackLabel.string,
        music: volumeMetric(controller.musicVolumeControl),
        sfx: volumeMetric(controller.sfxVolumeControl),
        worldBefore,
    };
});
await page.waitForTimeout(700);
const pauseFreezeAfter = await withController((_cc, _scene, _nodes, controller) => ({
    paused: controller.isPaused,
    playerEnergy: controller.playerEnergy,
    aiEnergy: controller.aiEnergy,
    unitPositions: controller.units.map((unit) => [unit.node.position.x, unit.node.position.y]),
}));

const audioBefore = await withController((_cc, _scene, _nodes, controller) => ({
    selected: controller.audioManager.getSelectedBgmId(),
    music: controller.audioManager.getMusicVolume(),
    sfx: controller.audioManager.getSfxVolume(),
}));
await clickDesign(136, 24, 350);
await clickDesign(-99, -64, 250);
await clickDesign(125, -136, 250);
const audioAfter = await withController((_cc, _scene, _nodes, controller) => ({
    selected: controller.audioManager.getSelectedBgmId(),
    music: controller.audioManager.getMusicVolume(),
    sfx: controller.audioManager.getSfxVolume(),
    stored: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
}));

await clickDesign(-107, 148, 450);
const resumed = await withController((_cc, _scene, _nodes, controller) => ({
    paused: controller.isPaused,
    pausePanelActive: controller.pausePanel.active,
}));

await page.setViewportSize({ width: 1800, height: 720 });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outputDir, 'after_battle_wide_1800x720.png') });

await Promise.all(pendingConsoleRecords);
const consoleProblems = consoleRecords.filter((record) =>
    record.type === 'error' || record.type === 'warning' || record.type === 'pageerror');
const levelPassed = levelAudits.length === 3 && levelAudits.every((entry) =>
    entry.badgeSize?.[0] === 116 && entry.badgeSize?.[1] === 58
    && entry.contentSize?.[0] === 84 && entry.contentSize?.[1] === 42
    && entry.contentParent === 'BattleLevelBadge' && entry.frameNode === 'LevelBadgeFrameSprite'
    && entry.chapterOverflow === entry.shrinkOverflow && entry.titleOverflow === entry.shrinkOverflow);
const energyPassed = energyAudits.every((entry) => {
    const widthError = Math.abs(entry.ai.fillVisibleWidth - entry.player.fillVisibleWidth);
    return JSON.stringify(entry.ai.trackPosition) === JSON.stringify(entry.player.trackPosition)
        && JSON.stringify(entry.ai.trackSize) === JSON.stringify(entry.player.trackSize)
        && JSON.stringify(entry.ai.fillPosition) === JSON.stringify(entry.player.fillPosition)
        && JSON.stringify(entry.ai.fillSize) === JSON.stringify(entry.player.fillSize)
        && JSON.stringify(entry.ai.labelPosition) === JSON.stringify(entry.player.labelPosition)
        && widthError <= 2 && entry.ai.trackCount === 1 && entry.player.trackCount === 1
        && entry.ai.fillCount === 1 && entry.player.fillCount === 1
        && entry.ai.fillActive === (entry.value > 0) && entry.player.fillActive === (entry.value > 0);
});
const selectedYellow = selectedAudit.filter((entry) => entry.yellow);
const selectedPassed = selectedYellow.length === 1 && selectedYellow[0].type === 'medium'
    && selectedYellow[0].status === '可用' && selectedYellow[0].scale <= 1.02
    && selectedAudit.every((entry) => !entry.status.includes('选择') && !entry.status.includes('✓'));
const insufficientPassed = insufficientAudit.every((entry) => entry.state === 'insufficient'
    && entry.status === '能量不足' && !entry.yellow);
const [rootWidth, rootHeight] = pauseAudit.rootSize;
const withinRoot = (entry) => entry.bounds[0] >= -rootWidth / 2 && entry.bounds[2] <= rootWidth / 2
    && entry.bounds[1] >= -rootHeight / 2 && entry.bounds[3] <= rootHeight / 2;
const pausePassed = pauseAudit.requiredParents.every((entry) => entry.parent === 'PauseContentRoot')
    && pauseAudit.actions.every(withinRoot) && withinRoot(pauseAudit.bgm)
    && withinRoot(pauseAudit.music) && withinRoot(pauseAudit.sfx)
    && pauseAudit.actions.every((entry) => entry.fontSize === 20
        && JSON.stringify(entry.color) === JSON.stringify([86, 58, 37, 255]))
    && !pauseAudit.bgmTrackText.includes('✓');
const freezePassed = pauseAudit.worldBefore.paused && pauseFreezeAfter.paused
    && pauseAudit.worldBefore.playerEnergy === pauseFreezeAfter.playerEnergy
    && pauseAudit.worldBefore.aiEnergy === pauseFreezeAfter.aiEnergy
    && JSON.stringify(pauseAudit.worldBefore.unitPositions) === JSON.stringify(pauseFreezeAfter.unitPositions);
const audioPassed = audioBefore.selected !== audioAfter.selected
    && audioAfter.music <= audioBefore.music && audioAfter.sfx >= audioBefore.sfx
    && Object.keys(audioAfter.stored).some((key) => key.includes('wolf-sheep-battle.audio-settings.v1'));
const passed = levelPassed && energyPassed && selectedPassed && insufficientPassed && pausePassed
    && freezePassed && audioPassed && !resumed.paused && !resumed.pausePanelActive
    && consoleProblems.length === 0 && requestFailures.length === 0 && response404s.length === 0;

const report = {
    passed, levelPassed, energyPassed, selectedPassed, insufficientPassed, pausePassed,
    freezePassed, audioPassed, resumed, levelAudits, energyAudits, selectedAudit, insufficientAudit,
    pauseAudit, pauseFreezeAfter, audioBefore, audioAfter,
    consoleProblems, requestFailures, response404s,
};
fs.writeFileSync(path.join(outputDir, 'visual_layout_validation.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (!passed) process.exitCode = 1;
