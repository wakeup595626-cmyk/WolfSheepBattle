import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/tactic-loadout-art-01/screenshots');
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
                .find((component) => typeof component.showTacticDeckSelection === 'function'
                    && typeof component.toggleTacticDeckOption === 'function'
                    && typeof component.confirmTacticDeckSelection === 'function');
            if (!controller) throw new Error('updated GameController component was not found');
            return Function('cc', 'controller', 'argument',
                `return (${callbackSource})(cc, controller, argument);`)(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(7000);

    snapshots.initial = await withController(async (_cc, controller) => {
        await controller.artResourceManager.preloadGroups(['battle-core']);
        controller.applyTacticDeckArt();
        controller.currentLevel = 4;
        controller.specialRoadTutorialSeen = true;
        controller.isStarted = false;
        controller.isPaused = false;
        controller.isFinished = false;
        controller.startPanel.active = false;
        controller.levelSelectPanel.active = false;
        controller.showTacticDeckSelection();
        const cards = [...controller.tacticDeckOptions.values()].map((option) => ({
            kind: option.kind,
            selected: controller.pendingDeckSelection.includes(option.kind),
            badgeVisible: option.checkBadgeNode.active,
            rootScale: [option.root.scale.x, option.root.scale.y],
            visualScale: [option.visualRoot.scale.x, option.visualRoot.scale.y],
            shellFormal: Boolean(option.cardShellSprite?.spriteFrame),
            iconCellFormal: Boolean(option.iconCellSprite?.spriteFrame),
            skillIconFormal: Boolean(option.skillIconSprite?.spriteFrame),
            freezeOverlay: option.kind === 'freeze' ? option.skillIconFallbackGraphics.node.active : undefined,
            iconChildren: option.iconCellNode.children.map((node) => ({
                name: node.name,
                active: node.active,
                sibling: node.getSiblingIndex(),
                position: [node.position.x, node.position.y],
                size: (() => {
                    const transform = node.getComponent(_cc.UITransform);
                    return transform ? [transform.contentSize.width, transform.contentSize.height] : undefined;
                })(),
                sprite: Boolean(node.getComponent(_cc.Sprite)?.spriteFrame),
            })),
            text: {
                title: option.titleLabel.string,
                condition: option.conditionLabel.string,
                effect: option.effectLabel.string,
                cost: option.costLabel.string,
                cooldown: option.cooldownLabel.string,
            },
        }));
        return {
            pending: [...controller.pendingDeckSelection],
            count: controller.tacticDeckHintLabel.string,
            panelFormal: Boolean(controller.tacticDeckPanelSprite?.spriteFrame),
            panelGraphicsEnabled: controller.tacticDeckContentGraphics.enabled,
            title: controller.tacticDeckContent.getChildByName('Title')?.getComponent(_cc.Label)?.string,
            subtitle: controller.tacticDeckContent.getChildByName('Subtitle')?.getComponent(_cc.Label)?.string,
            confirmSize: (() => {
                const size = controller.tacticDeckConfirmButton.node.getComponent(_cc.UITransform).contentSize;
                return [size.width, size.height];
            })(),
            cards,
        };
    });
    check(JSON.stringify(snapshots.initial.pending) === JSON.stringify(['heal', 'shock', 'freeze']),
        'fresh save uses heal, shock, and freeze as the level-four default loadout', snapshots.initial.pending);
    check(snapshots.initial.count === '已选择 3 / 3 张战术牌',
        'selection count is displayed in the requested live format', snapshots.initial.count);
    check(snapshots.initial.title === '选择战术卡组'
        && snapshots.initial.subtitle === '从4张战术牌中选择3张携带进入第4关',
    'title and subtitle match the fourth-level loadout copy', snapshots.initial);
    check(snapshots.initial.panelFormal && !snapshots.initial.panelGraphicsEnabled,
        'formal parchment panel replaces the dark graphics card', snapshots.initial);
    check(snapshots.initial.cards.every((card) => card.shellFormal && card.iconCellFormal && card.skillIconFormal),
        'all four cards use formal shell, icon-cell, and skill-icon resources', snapshots.initial.cards);
    check(snapshots.initial.cards.find((card) => card.kind === 'freeze')?.freezeOverlay === true,
        'freeze combines the formal lock emblem with the snowflake overlay', snapshots.initial.cards);
    check(JSON.stringify(snapshots.initial.confirmSize) === JSON.stringify([320, 64]),
        'start button keeps the 320x64 touch-friendly size', snapshots.initial.confirmSize);
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(outputDir, 'tactic_loadout_default_1280x720.png'), fullPage: true });

    snapshots.bounds = await withController((cc, controller) => {
        const getRect = (node) => {
            const rect = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { xMin: rect.xMin, xMax: rect.xMax, yMin: rect.yMin, yMax: rect.yMax };
        };
        const contains = (outer, inner, padding = 0.5) => inner.xMin >= outer.xMin - padding
            && inner.xMax <= outer.xMax + padding
            && inner.yMin >= outer.yMin - padding
            && inner.yMax <= outer.yMax + padding;
        const cards = [...controller.tacticDeckOptions.values()].map((option) => {
            const card = getRect(option.root);
            const nodes = [
                option.iconCellNode,
                option.titleLabel.node,
                option.conditionLabel.node,
                option.effectLabel.node,
                option.costLabel.node.parent,
                option.cooldownLabel.node.parent,
                option.checkBadgeNode,
            ];
            return {
                kind: option.kind,
                card,
                contained: nodes.map((node) => ({ name: node.name, pass: contains(card, getRect(node), 1) })),
            };
        });
        return { cards };
    });
    check(snapshots.bounds.cards.every((card) => card.contained.every((entry) => entry.pass)),
        'icons, labels, tags, and check badges remain inside every card', snapshots.bounds.cards);

    snapshots.toggleAndLimit = await withController((cc, controller) => {
        const emitTap = (kind) => {
            const option = controller.tacticDeckOptions.get(kind);
            option.root.emit(cc.Node.EventType.TOUCH_START);
            option.root.emit(cc.Node.EventType.TOUCH_END);
        };
        const rows = [];
        emitTap('heal');
        rows.push({ action: 'cancel-heal', selected: [...controller.pendingDeckSelection],
            count: controller.tacticDeckHintLabel.string });
        emitTap('sprint');
        rows.push({ action: 'add-sprint', selected: [...controller.pendingDeckSelection],
            count: controller.tacticDeckHintLabel.string });
        const beforeBlocked = [...controller.pendingDeckSelection];
        emitTap('heal');
        rows.push({
            action: 'block-fourth',
            selected: [...controller.pendingDeckSelection],
            unchanged: JSON.stringify(beforeBlocked) === JSON.stringify(controller.pendingDeckSelection),
            feedback: controller.tacticDeckFeedbackLabel.string,
            feedbackOpacity: controller.tacticDeckFeedbackOpacity.opacity,
        });
        return {
            rows,
            selectedBadges: [...controller.tacticDeckOptions.values()]
                .filter((option) => option.checkBadgeNode.active).map((option) => option.kind),
        };
    });
    check(snapshots.toggleAndLimit.rows[0].selected.length === 2
        && snapshots.toggleAndLimit.rows[0].count === '已选择 2 / 3 张战术牌',
    're-tapping a selected card cancels it and updates the count', snapshots.toggleAndLimit.rows[0]);
    check(snapshots.toggleAndLimit.rows[1].selected.length === 3,
        'an unselected card can fill the third slot', snapshots.toggleAndLimit.rows[1]);
    check(snapshots.toggleAndLimit.rows[2].unchanged
        && snapshots.toggleAndLimit.rows[2].feedback === '最多携带3张战术牌，请先取消一张。'
        && snapshots.toggleAndLimit.selectedBadges.length === 3,
    'the fourth card is rejected without replacing the existing three selections', snapshots.toggleAndLimit);
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(outputDir, 'tactic_loadout_limit_feedback_1280x720.png'), fullPage: true });

    snapshots.confirmGuard = await withController((cc, controller) => {
        const emitTap = (kind) => {
            const option = controller.tacticDeckOptions.get(kind);
            option.root.emit(cc.Node.EventType.TOUCH_START);
            option.root.emit(cc.Node.EventType.TOUCH_END);
        };
        emitTap('sprint');
        const before = {
            selected: [...controller.pendingDeckSelection],
            started: controller.isStarted,
            locked: controller.tacticDeckConfirmLocked,
        };
        controller.confirmTacticDeckSelection();
        const blocked = {
            started: controller.isStarted,
            locked: controller.tacticDeckConfirmLocked,
            panelActive: controller.tacticDeckPanel.active,
            feedback: controller.tacticDeckFeedbackLabel.string,
        };
        emitTap('heal');
        controller.confirmTacticDeckSelection();
        const confirmed = {
            started: controller.isStarted,
            locked: controller.tacticDeckConfirmLocked,
            panelActive: controller.tacticDeckPanel.active,
            selected: [...controller.selectedTactics],
            activeCards: ['sprint', 'heal', 'shock', 'freeze'].filter((kind) => controller.getTacticCard(kind).node.active),
            save: JSON.parse(localStorage.getItem('wolf-sheep-battle.progress.v2') ?? '{}').selectedTactics,
        };
        controller.confirmTacticDeckSelection();
        const afterSecondConfirm = {
            selected: [...controller.selectedTactics],
            started: controller.isStarted,
            locked: controller.tacticDeckConfirmLocked,
        };
        return { before, blocked, confirmed, afterSecondConfirm };
    });
    check(snapshots.confirmGuard.before.selected.length === 2
        && !snapshots.confirmGuard.blocked.started
        && !snapshots.confirmGuard.blocked.locked
        && snapshots.confirmGuard.blocked.panelActive
        && snapshots.confirmGuard.blocked.feedback === '请选择3张战术牌',
    'start remains blocked until exactly three cards are selected', snapshots.confirmGuard);
    check(snapshots.confirmGuard.confirmed.started
        && snapshots.confirmGuard.confirmed.locked
        && !snapshots.confirmGuard.confirmed.panelActive
        && snapshots.confirmGuard.confirmed.selected.length === 3
        && JSON.stringify([...snapshots.confirmGuard.confirmed.selected].sort())
            === JSON.stringify([...snapshots.confirmGuard.confirmed.activeCards].sort())
        && JSON.stringify(snapshots.confirmGuard.confirmed.selected) === JSON.stringify(snapshots.confirmGuard.confirmed.save),
    'confirm saves and activates only the three chosen cards', snapshots.confirmGuard.confirmed);
    check(JSON.stringify(snapshots.confirmGuard.afterSecondConfirm.selected)
        === JSON.stringify(snapshots.confirmGuard.confirmed.selected),
    'one-shot confirm lock prevents duplicate initialization', snapshots.confirmGuard.afterSecondConfirm);

    snapshots.persistence = await withController((_cc, controller) => {
        const key = 'wolf-sheep-battle.progress.v2';
        const savedRaw = localStorage.getItem(key);
        controller.selectedTactics = [];
        controller.loadLevelProgress();
        const restored = [...controller.selectedTactics];
        const parsedSave = JSON.parse(savedRaw ?? '{}');
        const invalid = {
            ...parsedSave,
            selectedTactics: ['freeze', 'freeze', 'missing'],
            selectedTacticsByLevel: {
                ...(parsedSave.selectedTacticsByLevel ?? {}),
                '4': ['freeze', 'freeze', 'missing'],
            },
        };
        localStorage.setItem(key, JSON.stringify(invalid));
        controller.loadLevelProgress();
        const fallback = [...controller.selectedTactics];
        if (savedRaw) localStorage.setItem(key, savedRaw);
        controller.loadLevelProgress();
        return { restored, fallback, final: [...controller.selectedTactics] };
    });
    check(JSON.stringify(snapshots.persistence.restored)
        === JSON.stringify(snapshots.confirmGuard.confirmed.selected),
    'the last confirmed three-card loadout is restored from local storage', snapshots.persistence);
    check(JSON.stringify(snapshots.persistence.fallback) === JSON.stringify(['heal', 'shock', 'freeze']),
        'an invalid saved deck safely falls back to heal, shock, and freeze', snapshots.persistence);

    await page.setViewportSize({ width: 1600, height: 720 });
    await page.waitForTimeout(500);
    snapshots.wide = await withController((_cc, controller) => {
        controller.isStarted = false;
        controller.showTacticDeckSelection();
        return {
            contentPosition: [controller.tacticDeckContent.position.x, controller.tacticDeckContent.position.y],
            panelActive: controller.tacticDeckPanel.active,
            count: controller.tacticDeckHintLabel.string,
            visualScales: [...controller.tacticDeckOptions.values()].map((option) => [
                option.kind, option.root.scale.x, option.root.scale.y, option.visualRoot.scale.x, option.visualRoot.scale.y,
            ]),
        };
    });
    check(snapshots.wide.panelActive
        && snapshots.wide.visualScales.every((entry) => entry.slice(1).every((value) => value === 1)),
    '1600x720 relayout keeps card roots at uniform scale without non-proportional stretching', snapshots.wide);
    await page.screenshot({ path: path.join(outputDir, 'tactic_loadout_wechat_landscape_sim_1600x720.png'), fullPage: true });

    const unexpectedConsoleProblems = consoleProblems.filter((entry) =>
        !entry.text.includes('LabelOutline.color') && !entry.text.includes('LabelOutline.width'));
    check(unexpectedConsoleProblems.length === 0,
        'preview console has no new errors or unexpected warnings', unexpectedConsoleProblems);
    check(requestFailures.length === 0, 'preview has no failed requests', requestFailures);
    check(response404s.length === 0, 'preview has no 404 resources', response404s);
} catch (error) {
    fatalError = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
} finally {
    await browser?.close();
}

const report = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    checks,
    snapshots,
    consoleProblems,
    requestFailures,
    response404s,
    fatalError,
    passed: !fatalError && checks.every((entry) => entry.pass),
};
fs.writeFileSync(path.join(outputDir, 'tactic_loadout_runtime_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
