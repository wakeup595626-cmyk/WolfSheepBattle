import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(
    process.argv[2] ?? 'art_source/qa/art10-ui-clarity05/screenshots',
);
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7461';
fs.mkdirSync(outputDir, { recursive: true });

const checks = [];
const check = (condition, message, detail = undefined) => {
    checks.push({
        pass: Boolean(condition),
        message,
        ...(detail === undefined ? {} : { detail }),
    });
};
const approximately = (actual, expected, tolerance = 0.01) =>
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
const normalizedText = (value) => String(value ?? '').replace(/\s+/gu, ' ').trim();
const rectContains = (outer, inner, tolerance = 0.5) => Boolean(outer && inner)
    && inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.bottom >= outer.bottom - tolerance
    && inner.top <= outer.top + tolerance;
const rectOverlapArea = (left, right) => {
    if (!left || !right) return Number.POSITIVE_INFINITY;
    return Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left))
        * Math.max(0, Math.min(left.top, right.top) - Math.max(left.bottom, right.bottom));
};

let browser;
let result = {
    previewUrl,
    outputDir,
    checks,
};
let fatalError;

try {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    });
    const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
    });
    const consoleRecords = [];
    const requestFailures = [];
    const response404s = [];
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    page.on('console', (message) => {
        consoleRecords.push({ type: message.type(), text: message.text() });
    });
    page.on('pageerror', (error) => {
        consoleRecords.push({ type: 'pageerror', text: error.message });
    });
    page.on('requestfailed', (request) => {
        requestFailures.push({
            url: request.url(),
            error: request.failure()?.errorText,
        });
    });
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
    const designToPage = (box, x, y, visibleWidth = 1280, visibleHeight = 720) => ({
        x: box.x + (x + visibleWidth / 2) / visibleWidth * box.width,
        y: box.y + (visibleHeight / 2 - y) / visibleHeight * box.height,
    });
    const clickDesign = async (x, y, waitMs = 250) => {
        const { box } = await getCanvas();
        const point = designToPage(box, x, y);
        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(waitMs);
    };
    const withController = async (callbackSource, argument) => page.evaluate(
        async ({ callbackSource: source, argument: callbackArgument }) => {
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
                .find((component) => typeof component.getPlayerTacticAvailability === 'function');
            if (!controller) throw new Error('GameController component was not found');
            const callback = Function(
                'cc',
                'scene',
                'nodes',
                'controller',
                'argument',
                `return (${source})(cc, scene, nodes, controller, argument);`,
            );
            return callback(cc, scene, nodes, controller, callbackArgument);
        },
        { callbackSource: callbackSource.toString(), argument },
    );
    const getCardPagePoint = async (kind) => {
        const placement = await withController(
            (_cc, _scene, _nodes, controller, targetKind) => {
                const card = targetKind === 'sprint'
                    ? controller.playerSprintCard
                    : targetKind === 'heal'
                        ? controller.playerHealCard
                        : controller.playerShockCard;
                return {
                    designPosition: [card.node.position.x, card.node.position.y],
                    visibleWidth: controller.screenMetrics.visibleWidth,
                    visibleHeight: controller.screenMetrics.visibleHeight,
                };
            },
            kind,
        );
        const { box } = await getCanvas();
        return designToPage(
            box,
            placement.designPosition[0],
            placement.designPosition[1],
            placement.visibleWidth,
            placement.visibleHeight,
        );
    };
    const clickCard = async (kind, waitMs = 120) => {
        const point = await getCardPagePoint(kind);
        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(waitMs);
    };

    const collectLayout = () => withController((cc, _scene, _nodes, controller) => {
        const findDescendant = (root, names) => {
            if (!root) return null;
            const wanted = new Set(names.map((name) => name.toLowerCase()));
            const queue = [root];
            while (queue.length > 0) {
                const current = queue.shift();
                if (wanted.has(current.name.toLowerCase())) return current;
                queue.push(...current.children);
            }
            return null;
        };
        const asNode = (candidate) => {
            if (!candidate) return null;
            if (candidate.node && typeof candidate.node.getComponent === 'function') return candidate.node;
            if (candidate.position && Array.isArray(candidate.children)
                && typeof candidate.getComponent === 'function') return candidate;
            return null;
        };
        const asLabel = (candidate, fallbackNode) => {
            if (candidate && typeof candidate.string === 'string' && candidate.node) return candidate;
            return fallbackNode?.getComponent(cc.Label) ?? null;
        };
        const bounds = (node) => {
            if (!node) return null;
            const transform = node.getComponent(cc.UITransform);
            if (!transform) return null;
            const rect = transform.getBoundingBoxToWorld();
            return {
                left: rect.x,
                right: rect.x + rect.width,
                bottom: rect.y,
                top: rect.y + rect.height,
                width: rect.width,
                height: rect.height,
            };
        };
        const nodeMetric = (node) => {
            if (!node) return null;
            const transform = node.getComponent(cc.UITransform);
            return {
                name: node.name,
                active: node.active,
                activeInHierarchy: node.activeInHierarchy,
                position: [node.position.x, node.position.y],
                worldPosition: [node.worldPosition.x, node.worldPosition.y],
                size: transform
                    ? [transform.contentSize.width, transform.contentSize.height]
                    : null,
                bounds: bounds(node),
            };
        };
        const labelMetric = (label) => {
            if (!label) return null;
            return {
                ...nodeMetric(label.node),
                text: label.string,
                fontSize: label.fontSize,
                actualFontSize: typeof label.actualFontSize === 'number'
                    ? label.actualFontSize
                    : label.fontSize,
                lineHeight: label.lineHeight,
                overflow: label.overflow,
                isShrink: label.overflow === cc.Label.Overflow.SHRINK,
                wrap: label.enableWrapText,
                horizontalAlign: label.horizontalAlign,
                verticalAlign: label.verticalAlign,
                color: [label.color.r, label.color.g, label.color.b, label.color.a],
                usesFormalFont: Boolean(controller.formalUiFont)
                    && label.font === controller.formalUiFont,
            };
        };
        const spriteMetric = (node) => {
            const sprite = node?.getComponent(cc.Sprite) ?? null;
            return {
                ...nodeMetric(node),
                hasSprite: Boolean(sprite),
                hasSpriteFrame: Boolean(sprite?.spriteFrame),
                spriteFrameName: sprite?.spriteFrame?.name ?? null,
                color: sprite
                    ? [sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a]
                    : null,
                spriteType: sprite?.type ?? null,
                sizeMode: sprite?.sizeMode ?? null,
                isSliced: sprite?.type === cc.Sprite.Type.SLICED,
                isCustom: sprite?.sizeMode === cc.Sprite.SizeMode.CUSTOM,
            };
        };
        const resolveCard = (card) => {
            const root = card.root ?? card.node;
            const topSection = asNode(card.topSectionNode ?? card.topSection)
                ?? findDescendant(root, ['TopSection']);
            const bottomSection = asNode(card.bottomSectionNode ?? card.bottomSection)
                ?? findDescendant(root, ['BottomSection']);
            const iconCell = asNode(card.iconCellNode ?? card.iconCell)
                ?? findDescendant(root, ['IconCell']);
            const textCell = asNode(card.textCellNode ?? card.textCell)
                ?? findDescendant(root, ['TextCell']);
            const divider = asNode(card.dividerNode ?? card.divider)
                ?? findDescendant(root, ['Divider']);
            const costCell = asNode(card.costCellNode ?? card.costCell)
                ?? findDescendant(root, ['CostCell']);
            const metaCell = asNode(card.metaCellNode ?? card.metaCell)
                ?? findDescendant(root, ['MetaCell']);
            const stateCell = asNode(card.stateCellNode ?? card.stateCell)
                ?? findDescendant(root, ['StateCell']);
            const skillIconNode = asNode(card.skillIconSprite ?? card.skillIconFallbackGraphics)
                ?? findDescendant(root, ['SkillIconSprite', 'SkillIconFallback']);
            const titleNode = asNode(card.titleLabel)
                ?? findDescendant(root, ['TitleLabel', 'Title']);
            const conditionNode = asNode(card.conditionLabel)
                ?? findDescendant(root, ['ConditionLabel', 'Condition']);
            const effectNode = asNode(card.effectLabel)
                ?? findDescendant(root, ['EffectLabel', 'Effect']);
            const costIconNode = asNode(card.costIconNode ?? card.costIconSprite ?? card.costIcon)
                ?? findDescendant(root, ['CostIconSprite', 'CostIconFallback']);
            const costNode = asNode(card.costLabel)
                ?? findDescendant(root, ['CostLabel', 'Cost']);
            const extraIconNode = asNode(card.metaIconSprite ?? card.metaIconFallbackGraphics)
                ?? findDescendant(root, ['MetaIconSprite', 'MetaIconFallback']);
            const extraNode = asNode(card.metaLabel ?? card.extraLabel)
                ?? findDescendant(root, ['MetaLabel', 'ExtraLabel']);
            const stateIconNode = asNode(card.stateIconNode ?? card.stateIconSprite ?? card.stateIcon)
                ?? findDescendant(root, ['StateIconSprite', 'StateIconFallback']);
            const statusNode = asNode(card.stateLabel)
                ?? findDescendant(root, ['StateLabel', 'StatusLabel', 'Status']);
            const touchArea = asNode(card.touchAreaNode ?? card.touchArea)
                ?? findDescendant(root, ['TouchArea']);
            const pressOverlay = asNode(card.pressOverlay)
                ?? findDescendant(root, ['PressOverlay']);
            const shellSpriteNode = asNode(card.cardShellSprite)
                ?? findDescendant(root, ['CardShellSprite']);
            const iconCellSpriteNode = asNode(card.iconCellSprite)
                ?? findDescendant(iconCell, ['IconCellSprite']);
            const textCellSpriteNode = asNode(card.textCellSprite)
                ?? findDescendant(textCell, ['TextCellSprite']);
            const dividerSpriteNode = asNode(card.dividerSprite)
                ?? findDescendant(divider, ['DividerSprite']);
            const costCellSpriteNode = asNode(card.costCellSprite)
                ?? findDescendant(costCell, ['CostCellSprite']);
            const metaCellSpriteNode = asNode(card.metaCellSprite)
                ?? findDescendant(metaCell, ['MetaCellSprite']);
            const stateCellSpriteNode = asNode(card.stateCellSprite)
                ?? findDescendant(stateCell, ['StateCellSprite']);
            const titleLabel = asLabel(card.titleLabel, titleNode);
            const conditionLabel = asLabel(card.conditionLabel, conditionNode);
            const effectLabel = asLabel(card.effectLabel, effectNode);
            const costLabel = asLabel(card.costLabel, costNode);
            const extraLabel = asLabel(card.metaLabel ?? card.extraLabel, extraNode);
            const statusLabel = asLabel(card.stateLabel, statusNode);
            const backgrounds = {
                cardShell: spriteMetric(shellSpriteNode),
                iconCell: spriteMetric(iconCellSpriteNode),
                textCell: spriteMetric(textCellSpriteNode),
                divider: spriteMetric(dividerSpriteNode),
                costCell: spriteMetric(costCellSpriteNode),
                metaCell: spriteMetric(metaCellSpriteNode),
                stateCell: spriteMetric(stateCellSpriteNode),
            };
            const fallbackEnabled = {
                cardShell: card.cardShellFallbackGraphics?.enabled ?? null,
                iconCell: card.iconCellFallbackGraphics?.enabled ?? null,
                textCell: card.textCellFallbackGraphics?.enabled ?? null,
                divider: card.dividerFallbackGraphics?.enabled ?? null,
                costCell: card.costCellFallbackGraphics?.enabled ?? null,
                metaCell: card.metaCellFallbackGraphics?.enabled ?? null,
                stateCell: card.stateCellFallbackGraphics?.enabled ?? null,
            };
            const countNamedSprite = (parent, name) => parent?.children
                ?.filter((child) => child.name === name && child.getComponent(cc.Sprite))
                .length ?? 0;
            const backgroundNodeCounts = {
                cardShell: countNamedSprite(root, 'CardShellSprite'),
                iconCell: countNamedSprite(iconCell, 'IconCellSprite'),
                textCell: countNamedSprite(textCell, 'TextCellSprite'),
                divider: countNamedSprite(divider, 'DividerSprite'),
                costCell: countNamedSprite(costCell, 'CostCellSprite'),
                metaCell: countNamedSprite(metaCell, 'MetaCellSprite'),
                stateCell: countNamedSprite(stateCell, 'StateCellSprite'),
            };
            return {
                kind: card.kind,
                card: nodeMetric(root),
                topSection: nodeMetric(topSection),
                bottomSection: nodeMetric(bottomSection),
                iconCell: nodeMetric(iconCell),
                textCell: nodeMetric(textCell),
                divider: nodeMetric(divider),
                costCell: nodeMetric(costCell),
                metaCell: nodeMetric(metaCell),
                stateCell: nodeMetric(stateCell),
                skillIcon: spriteMetric(skillIconNode),
                title: labelMetric(titleLabel),
                condition: labelMetric(conditionLabel),
                effect: labelMetric(effectLabel),
                costIcon: spriteMetric(costIconNode),
                cost: labelMetric(costLabel),
                extraIcon: spriteMetric(extraIconNode),
                extra: labelMetric(extraLabel),
                stateIcon: spriteMetric(stateIconNode),
                status: labelMetric(statusLabel),
                touchArea: nodeMetric(touchArea),
                pressOverlay: nodeMetric(pressOverlay),
                backgrounds,
                fallbackEnabled,
                backgroundNodeCounts,
                enabled: card.enabled,
                availabilityState: card.availabilityState,
                iconOpacity: card.iconOpacity?.opacity ?? null,
            };
        };
        const cards = [
            resolveCard(controller.playerSprintCard),
            resolveCard(controller.playerHealCard),
            resolveCard(controller.playerShockCard),
        ];
        const header = controller.hudLayer.getChildByName('TacticSidebarHeader');
        return {
            cards,
            header: nodeMetric(header),
            screenMetrics: {
                visibleWidth: controller.screenMetrics.visibleWidth,
                visibleHeight: controller.screenMetrics.visibleHeight,
            },
        };
    });

    const setupAllAvailable = () => withController((_cc, _scene, _nodes, controller) => {
        controller.clearBattleUnits();
        controller.isStarted = true;
        controller.isFinished = false;
        controller.isPaused = false;
        controller.aiDecisionCooldown = 99999;
        controller.playerEnergy = 100;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(0);
        const player = controller.units.find((unit) => unit.team === 0);
        if (!player) throw new Error('failed to create the player unit for tactic QA');
        player.health = Math.max(1, Math.floor(player.definition.maxHealth / 2));
        if (!controller.spawnUnit(1, 1, player.definition)) {
            throw new Error('failed to create the enemy unit for tactic QA');
        }
        const enemy = controller.units.find((unit) => unit.team === 1);
        enemy.node.setPosition(enemy.node.position.x, -100, 0);
        controller.playerSupply = 5;
        controller.playerSprintRemaining = 0;
        controller.playerSprintCooldown = 0;
        controller.playerHealCooldown = 0;
        controller.playerBaseHealth = 49;
        controller.playerShockUnlocked = true;
        controller.playerShockUsed = false;
        controller.playerStats.sprintUses = 0;
        controller.playerStats.healUses = 0;
        controller.lastTacticHudState = '';
        controller.refreshTacticCards();
    });

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await getCanvas();
    await page.waitForTimeout(8500);
    await clickDesign(0, -118, 5500);
    await clickDesign(0, -168, 1400);
    await setupAllAvailable();
    const { canvas } = await getCanvas();
    await canvas.screenshot({
        path: path.join(outputDir, 'tactic_cards_available_1280x720.png'),
    });

    const layout1280 = await collectLayout();
    const expectedStaticText = {
        sprint: {
            title: '全体冲刺',
            condition: '场上有己方单位',
            effect: '移速+50% · 持续6秒',
            cost: '5/2',
            extra: '10秒',
        },
        heal: {
            title: '战地急救',
            condition: '场上有受伤单位',
            effect: '全体恢复40%生命',
            cost: '5/3',
            extra: '8秒',
        },
        shock: {
            title: '领地震荡',
            condition: '基地生命低于50%',
            effect: '本方领地小/中消灭 大/巨重伤并击退',
            cost: '零消耗',
            extra: '每局1次',
        },
    };
    const assertLayout = (layout, suffix) => {
        check(layout.cards.length === 3, `${suffix}: exactly three tactic cards exist`);
        check(
            approximately(layout.header?.size?.[0], 216),
            `${suffix}: tactic header width is 216`,
            layout.header?.size,
        );
        const expectedRegionSizes = {
            cardShell: [216, 124],
            iconCell: [68, 80],
            textCell: [136, 80],
            divider: [208, 2],
            costCell: [60, 28],
            metaCell: [56, 28],
            stateCell: [84, 28],
        };
        for (const card of layout.cards) {
            const prefix = `${suffix}:${card.kind}`;
            check(
                approximately(card.card?.size?.[0], 216)
                && approximately(card.card?.size?.[1], 124),
                `${prefix}: card size is 216x124`,
                card.card?.size,
            );
            check(
                approximately(card.topSection?.size?.[0], 216)
                && approximately(card.topSection?.size?.[1], 88),
                `${prefix}: TopSection size is 216x88`,
                card.topSection?.size,
            );
            check(
                approximately(card.bottomSection?.size?.[0], 216)
                && approximately(card.bottomSection?.size?.[1], 36),
                `${prefix}: BottomSection size is 216x36`,
                card.bottomSection?.size,
            );
            for (const [name, metric] of [
                ['IconCell', card.iconCell],
                ['TextCell', card.textCell],
                ['Divider', card.divider],
                ['CostCell', card.costCell],
                ['MetaCell', card.metaCell],
                ['StateCell', card.stateCell],
            ]) {
                check(metric !== null, `${prefix}: ${name} exists`);
                check(
                    rectContains(card.card?.bounds, metric?.bounds),
                    `${prefix}: ${name} stays inside card`,
                    metric?.bounds,
                );
            }
            check(
                approximately(card.iconCell?.size?.[0], 68)
                && approximately(card.iconCell?.size?.[1], 80),
                `${prefix}: IconCell size is 68x80`,
                card.iconCell?.size,
            );
            check(
                approximately(card.textCell?.size?.[0], 136)
                && approximately(card.textCell?.size?.[1], 80),
                `${prefix}: TextCell size is 136x80`,
                card.textCell?.size,
            );
            check(
                approximately(card.divider?.size?.[0], 208)
                && approximately(card.divider?.size?.[1], 2),
                `${prefix}: Divider size is 208x2`,
                card.divider?.size,
            );
            check(
                approximately(card.costCell?.size?.[0], 60)
                && approximately(card.costCell?.size?.[1], 28),
                `${prefix}: CostCell size is 60x28`,
                card.costCell?.size,
            );
            check(
                approximately(card.metaCell?.size?.[0], 56)
                && approximately(card.metaCell?.size?.[1], 28),
                `${prefix}: MetaCell size is 56x28`,
                card.metaCell?.size,
            );
            check(
                approximately(card.stateCell?.size?.[0], 84)
                && approximately(card.stateCell?.size?.[1], 28),
                `${prefix}: StateCell size is 84x28`,
                card.stateCell?.size,
            );
            check(
                rectContains(card.topSection?.bounds, card.iconCell?.bounds)
                && rectContains(card.topSection?.bounds, card.textCell?.bounds),
                `${prefix}: upper cells stay inside TopSection`,
            );
            check(
                rectContains(card.bottomSection?.bounds, card.costCell?.bounds)
                && rectContains(card.bottomSection?.bounds, card.metaCell?.bounds)
                && rectContains(card.bottomSection?.bounds, card.stateCell?.bounds),
                `${prefix}: lower cells stay inside BottomSection`,
            );
            check(
                rectOverlapArea(card.iconCell?.bounds, card.textCell?.bounds) <= 0.5,
                `${prefix}: IconCell and TextCell do not overlap`,
            );
            check(
                card.iconCell?.bounds && card.textCell?.bounds
                && approximately(card.textCell.bounds.left - card.iconCell.bounds.right, 4),
                `${prefix}: upper cells keep a 4px gap`,
                card.iconCell?.bounds && card.textCell?.bounds
                    ? card.textCell.bounds.left - card.iconCell.bounds.right
                    : null,
            );
            check(
                rectOverlapArea(card.costCell?.bounds, card.metaCell?.bounds) <= 0.5
                && rectOverlapArea(card.costCell?.bounds, card.stateCell?.bounds) <= 0.5
                && rectOverlapArea(card.metaCell?.bounds, card.stateCell?.bounds) <= 0.5,
                `${prefix}: lower cells do not overlap`,
            );
            check(
                card.costCell?.bounds && card.metaCell?.bounds && card.stateCell?.bounds
                && approximately(card.metaCell.bounds.left - card.costCell.bounds.right, 4)
                && approximately(card.stateCell.bounds.left - card.metaCell.bounds.right, 4),
                `${prefix}: lower cells keep 4px gaps`,
                {
                    costMeta: card.costCell?.bounds && card.metaCell?.bounds
                        ? card.metaCell.bounds.left - card.costCell.bounds.right
                        : null,
                    metaState: card.metaCell?.bounds && card.stateCell?.bounds
                        ? card.stateCell.bounds.left - card.metaCell.bounds.right
                        : null,
                },
            );
            check(
                rectContains(card.iconCell?.bounds, card.skillIcon?.bounds),
                `${prefix}: skill icon stays inside IconCell`,
            );
            for (const [name, metric] of [
                ['title', card.title],
                ['condition', card.condition],
                ['effect', card.effect],
            ]) {
                check(metric !== null, `${prefix}: ${name} label exists`);
                check(
                    rectContains(card.textCell?.bounds, metric?.bounds),
                    `${prefix}: ${name} stays inside TextCell`,
                    metric?.bounds,
                );
            }
            for (const [name, metric, cell] of [
                ['cost', card.cost, card.costCell],
                ['extra', card.extra, card.metaCell],
                ['status', card.status, card.stateCell],
            ]) {
                check(metric !== null, `${prefix}: ${name} label exists`);
                check(
                    rectContains(cell?.bounds, metric?.bounds),
                    `${prefix}: ${name} stays inside its own lower cell`,
                    metric?.bounds,
                );
            }
            check(
                rectOverlapArea(card.skillIcon?.bounds, card.title?.bounds) <= 0.5
                && rectOverlapArea(card.skillIcon?.bounds, card.condition?.bounds) <= 0.5
                && rectOverlapArea(card.skillIcon?.bounds, card.effect?.bounds) <= 0.5,
                `${prefix}: skill icon does not overlap text`,
            );
            check(
                card.touchArea !== null
                && approximately(card.touchArea?.size?.[0], 216)
                && approximately(card.touchArea?.size?.[1], 124)
                && approximately(card.touchArea?.worldPosition?.[0], card.card?.worldPosition?.[0])
                && approximately(card.touchArea?.worldPosition?.[1], card.card?.worldPosition?.[1])
                && approximately(card.touchArea?.bounds?.left, card.card?.bounds?.left)
                && approximately(card.touchArea?.bounds?.right, card.card?.bounds?.right)
                && approximately(card.touchArea?.bounds?.bottom, card.card?.bounds?.bottom)
                && approximately(card.touchArea?.bounds?.top, card.card?.bounds?.top),
                `${prefix}: TouchArea exactly covers and does not exceed card`,
                card.touchArea,
            );
            for (const [name, metric] of Object.entries(card.backgrounds ?? {})) {
                const expectedSize = expectedRegionSizes[name];
                const logicalRegion = name === 'cardShell'
                    ? card.card
                    : card[name];
                check(
                    metric?.hasSprite && metric?.hasSpriteFrame,
                    `${prefix}: ${name} maps to one loaded SpriteFrame`,
                    metric,
                );
                check(
                    metric?.isCustom === true,
                    `${prefix}: ${name} Sprite uses CUSTOM size mode`,
                    metric?.sizeMode,
                );
                check(
                    expectedSize
                    && approximately(metric?.size?.[0], expectedSize[0])
                    && approximately(metric?.size?.[1], expectedSize[1]),
                    `${prefix}: ${name} Sprite size exactly matches its logical region`,
                    metric?.size,
                );
                check(
                    approximately(metric?.bounds?.left, logicalRegion?.bounds?.left)
                    && approximately(metric?.bounds?.right, logicalRegion?.bounds?.right)
                    && approximately(metric?.bounds?.bottom, logicalRegion?.bounds?.bottom)
                    && approximately(metric?.bounds?.top, logicalRegion?.bounds?.top),
                    `${prefix}: ${name} Sprite bounds exactly match its logical region`,
                    { sprite: metric?.bounds, logicalRegion: logicalRegion?.bounds },
                );
                if (name !== 'divider') {
                    check(
                        metric?.isSliced === true,
                        `${prefix}: ${name} stretchable frame uses nine-slice`,
                        metric?.spriteType,
                    );
                }
            }
            for (const [name, count] of Object.entries(card.backgroundNodeCounts ?? {})) {
                check(
                    count === 1,
                    `${prefix}: ${name} has exactly one formal background Sprite`,
                    count,
                );
            }
            for (const [name, enabled] of Object.entries(card.fallbackEnabled ?? {})) {
                check(
                    enabled === false,
                    `${prefix}: ${name} fallback Graphics is disabled after formal art loads`,
                    enabled,
                );
            }
            const labels = [
                ['title', card.title, 16],
                ['condition', card.condition, 12.5],
                ['effect', card.effect, 12.5],
                ['cost', card.cost, 11.5],
                ['extra', card.extra, 11],
                ['status', card.status, 11],
            ];
            for (const [name, metric, minimum] of labels) {
                check(
                    metric?.fontSize >= minimum && metric?.actualFontSize >= minimum,
                    `${prefix}: ${name} font is at least ${minimum}px`,
                    metric && {
                        fontSize: metric.fontSize,
                        actualFontSize: metric.actualFontSize,
                    },
                );
                check(metric?.isShrink === false, `${prefix}: ${name} does not use SHRINK`);
                check(metric?.usesFormalFont === true, `${prefix}: ${name} uses formal UI font`);
                check(
                    !String(metric?.text ?? '').includes('\uFFFD'),
                    `${prefix}: ${name} has no replacement glyph`,
                );
            }
            check(
                card.condition?.lineHeight >= 16 && card.effect?.lineHeight >= 16,
                `${prefix}: body line height is at least 16px`,
                {
                    condition: card.condition?.lineHeight,
                    effect: card.effect?.lineHeight,
                },
            );
            check(
                card.cost?.wrap === false
                && card.extra?.wrap === false
                && card.status?.wrap === false,
                `${prefix}: all lower labels stay on one line`,
            );
            check(
                card.skillIcon?.hasSprite && card.skillIcon?.hasSpriteFrame,
                `${prefix}: skill icon is a Sprite with a frame`,
            );
            if (card.kind !== 'shock') {
                check(
                    card.costIcon?.hasSprite && card.costIcon?.hasSpriteFrame,
                    `${prefix}: cost icon is a Sprite with a frame`,
                );
                check(
                    card.extraIcon?.hasSprite && card.extraIcon?.hasSpriteFrame,
                    `${prefix}: meta icon is a Sprite with a frame`,
                );
            }
            check(
                card.stateIcon?.hasSprite && card.stateIcon?.hasSpriteFrame,
                `${prefix}: state icon is a Sprite with a frame`,
            );
            const expected = expectedStaticText[card.kind];
            check(
                normalizedText(card.title?.text) === normalizedText(expected.title),
                `${prefix}: title text is exact`,
                card.title?.text,
            );
            check(
                normalizedText(card.condition?.text) === normalizedText(expected.condition),
                `${prefix}: condition text is exact`,
                card.condition?.text,
            );
            check(
                normalizedText(card.effect?.text) === normalizedText(expected.effect),
                `${prefix}: effect text is exact`,
                card.effect?.text,
            );
            check(
                normalizedText(card.cost?.text) === normalizedText(expected.cost),
                `${prefix}: cost text is exact`,
                card.cost?.text,
            );
            check(
                normalizedText(card.extra?.text) === normalizedText(expected.extra),
                `${prefix}: extra-info text is exact`,
                card.extra?.text,
            );
            const allText = [
                card.title?.text,
                card.condition?.text,
                card.effect?.text,
                card.cost?.text,
                card.extra?.text,
                card.status?.text,
            ].join(' ');
            check(!allText.includes('全线冲刺'), `${prefix}: no stale “全线冲刺” wording`);
            check(
                !/[\u{1F300}-\u{1FAFF}]/u.test(allText),
                `${prefix}: no Emoji is used as a UI icon`,
            );
        }
        const sortedCards = [...layout.cards].sort(
            (left, right) => right.card.worldPosition[1] - left.card.worldPosition[1],
        );
        for (let index = 0; index < sortedCards.length - 1; index += 1) {
            const upper = sortedCards[index].card;
            const lower = sortedCards[index + 1].card;
            const gap = upper.worldPosition[1] - lower.worldPosition[1]
                - (upper.size[1] + lower.size[1]) / 2;
            check(gap >= 8 && gap <= 10, `${suffix}: card gap ${index + 1} is 8..10`, gap);
        }
    };
    assertLayout(layout1280, '1280x720');

    const stateAudit = await withController((cc, _scene, _nodes, controller) => {
        const cards = {
            sprint: controller.playerSprintCard,
            heal: controller.playerHealCard,
            shock: controller.playerShockCard,
        };
        const findDescendant = (root, names) => {
            const wanted = new Set(names.map((name) => name.toLowerCase()));
            const queue = [root];
            while (queue.length > 0) {
                const node = queue.shift();
                if (wanted.has(node.name.toLowerCase())) return node;
                queue.push(...node.children);
            }
            return null;
        };
        const getStatusLabel = (card) => card.statusLabel
            ?? card.stateLabel
            ?? findDescendant(card.node, ['StateLabel', 'StatusLabel', 'Status'])?.getComponent(cc.Label);
        const getStateIcon = (card) => {
            const candidate = card.stateIconNode ?? card.stateIconSprite ?? card.stateIcon;
            const node = candidate?.node ?? candidate
                ?? findDescendant(card.node, ['StateIconSprite', 'StateIconFallback', 'StateIcon', 'StatusIcon']);
            const sprite = node?.getComponent(cc.Sprite);
            return {
                active: node?.activeInHierarchy ?? false,
                hasSprite: Boolean(sprite),
                hasSpriteFrame: Boolean(sprite?.spriteFrame),
            };
        };
        const makeFake = (team, health, maxHealth, y = 0) => {
            const node = new cc.Node(`Clarity05Fake-${team}-${controller.units.length}`);
            node.setParent(controller.unitsAndVfxLayer);
            node.setPosition(0, y, 0);
            controller.units.push({
                team,
                lane: 0,
                health,
                definition: {
                    maxHealth,
                    type: 'small',
                    battlePower: 1,
                },
                node,
            });
            return controller.units[controller.units.length - 1];
        };
        const reset = () => {
            controller.clearBattleUnits();
            controller.isStarted = true;
            controller.isFinished = false;
            controller.isPaused = false;
            controller.playerSupply = 5;
            controller.playerSprintRemaining = 0;
            controller.playerSprintCooldown = 0;
            controller.playerHealCooldown = 0;
            controller.playerBaseHealth = 100;
            controller.playerShockUnlocked = false;
            controller.playerShockUsed = false;
        };
        const snapshots = [];
        const capture = (id, kind, expectedState, expectedText) => {
            controller.refreshTacticCards();
            const availability = controller.getPlayerTacticAvailability(kind);
            const card = cards[kind];
            const statusLabel = getStatusLabel(card);
            snapshots.push({
                id,
                kind,
                expectedState,
                expectedText,
                availabilityState: availability.state,
                availabilityEnabled: availability.enabled,
                availabilityStatus: availability.statusText,
                cardState: card.availabilityState,
                cardEnabled: card.enabled,
                cardStatus: statusLabel?.string ?? null,
                cardScale: [card.node.scale.x, card.node.scale.y],
                pressActive: card.pressOverlay?.active ?? false,
                stateIcon: getStateIcon(card),
            });
        };

        reset();
        controller.playerSupply = 0;
        capture('sprint-supply-0', 'sprint', 'insufficient-supply', '补给不足');
        capture('heal-supply-0', 'heal', 'insufficient-supply', '补给不足');
        capture('shock-supply-0', 'shock', 'locked', '未解锁');

        reset();
        controller.playerSupply = 1;
        capture('sprint-supply-1', 'sprint', 'insufficient-supply', '补给不足');
        capture('heal-supply-1', 'heal', 'insufficient-supply', '补给不足');
        controller.playerSupply = 2;
        capture('heal-supply-2', 'heal', 'insufficient-supply', '补给不足');

        reset();
        controller.playerSupply = 2;
        capture('sprint-no-friendly', 'sprint', 'no-friendly-unit', '暂无单位');
        makeFake(0, 100, 100);
        capture('sprint-available', 'sprint', 'available', '点击使用');

        reset();
        controller.playerSupply = 0;
        controller.playerSprintRemaining = 5;
        capture('sprint-active', 'sprint', 'active', '生效5.0秒');
        controller.playerSprintRemaining = 0;
        controller.playerSprintCooldown = 6;
        capture('sprint-cooldown', 'sprint', 'cooldown', '冷却中');

        reset();
        controller.playerSupply = 3;
        makeFake(0, 100, 100);
        capture('heal-no-injured', 'heal', 'no-injured-unit', '无人受伤');
        controller.units[0].health = 50;
        capture('heal-available', 'heal', 'available', '点击使用');
        controller.playerSupply = 0;
        controller.playerHealCooldown = 6;
        capture('heal-cooldown', 'heal', 'cooldown', '冷却中');

        reset();
        capture('shock-locked', 'shock', 'locked', '未解锁');
        controller.playerBaseHealth = 49;
        controller.unlockShockIfNeeded(0);
        capture('shock-no-enemy', 'shock', 'no-enemy-in-territory', '领地无敌');
        makeFake(1, 100, 100, -100);
        capture('shock-available', 'shock', 'available', '点击使用');
        controller.playerShockUsed = true;
        capture('shock-used', 'shock', 'used', '已使用');

        reset();
        controller.isPaused = true;
        capture('sprint-paused', 'sprint', 'paused', '已暂停');
        capture('heal-paused', 'heal', 'paused', '已暂停');
        capture('shock-paused', 'shock', 'paused', '已暂停');

        reset();
        controller.isFinished = true;
        capture('sprint-finished', 'sprint', 'finished', '已结束');
        capture('heal-finished', 'heal', 'finished', '已结束');
        capture('shock-finished', 'shock', 'finished', '已结束');

        reset();
        controller.isStarted = false;
        capture('sprint-not-started', 'sprint', 'not-started', '未开始');

        reset();
        controller.refreshTacticCards();
        return snapshots;
    });

    for (const snapshot of stateAudit) {
        const prefix = `state:${snapshot.id}`;
        const expectedEnabled = snapshot.expectedState === 'available';
        check(
            snapshot.availabilityState === snapshot.expectedState,
            `${prefix}: availability state is exact`,
            snapshot,
        );
        check(
            snapshot.cardState === snapshot.expectedState,
            `${prefix}: rendered state matches availability`,
            snapshot,
        );
        check(
            snapshot.availabilityEnabled === expectedEnabled
            && snapshot.cardEnabled === expectedEnabled,
            `${prefix}: enabled flag is exact`,
            snapshot,
        );
        check(
            snapshot.availabilityStatus === snapshot.expectedText
            && snapshot.cardStatus === snapshot.expectedText,
            `${prefix}: dynamic status text is exact`,
            snapshot,
        );
        check(
            snapshot.stateIcon.hasSprite
            && snapshot.stateIcon.hasSpriteFrame
            && snapshot.stateIcon.active === true,
            `${prefix}: short state keeps its loaded icon active`,
            snapshot.stateIcon,
        );
        if (!expectedEnabled) {
            check(
                approximately(snapshot.cardScale[0], 1)
                && approximately(snapshot.cardScale[1], 1)
                && snapshot.pressActive === false,
                `${prefix}: unavailable card has no pressed visual`,
                snapshot,
            );
        }
    }

    const dynamicDisplayAudit = await withController((cc, _scene, _nodes, controller) => {
        const cards = {
            sprint: controller.playerSprintCard,
            heal: controller.playerHealCard,
            shock: controller.playerShockCard,
        };
        const cardData = (kind) => {
            const card = cards[kind];
            const costFrame = card.costCellSprite?.spriteFrame?.name ?? null;
            const metaFrame = card.metaCellSprite?.spriteFrame?.name ?? null;
            const stateFrame = card.stateCellSprite?.spriteFrame?.name ?? null;
            const costTransform = card.costLabel.node.getComponent(cc.UITransform);
            const metaTransform = card.metaLabel.node.getComponent(cc.UITransform);
            const stateTransform = card.stateLabel.node.getComponent(cc.UITransform);
            return {
                kind,
                cost: card.costLabel.string,
                meta: card.metaLabel.string,
                status: card.stateLabel.string,
                state: card.availabilityState,
                costFrame,
                metaFrame,
                stateFrame,
                iconOpacity: card.iconOpacity?.opacity ?? null,
                costLabel: {
                    position: [card.costLabel.node.position.x, card.costLabel.node.position.y],
                    size: costTransform
                        ? [costTransform.contentSize.width, costTransform.contentSize.height]
                        : null,
                },
                metaLabel: {
                    position: [card.metaLabel.node.position.x, card.metaLabel.node.position.y],
                    size: metaTransform
                        ? [metaTransform.contentSize.width, metaTransform.contentSize.height]
                        : null,
                },
                stateLabel: {
                    position: [card.stateLabel.node.position.x, card.stateLabel.node.position.y],
                    size: stateTransform
                        ? [stateTransform.contentSize.width, stateTransform.contentSize.height]
                        : null,
                },
            };
        };
        const makeFake = (team, health, maxHealth, y = 0) => {
            const node = new cc.Node(`Clarity05DynamicFake-${team}-${controller.units.length}`);
            node.setParent(controller.unitsAndVfxLayer);
            node.setPosition(0, y, 0);
            controller.units.push({
                team,
                lane: 0,
                health,
                definition: { maxHealth, type: 'small', battlePower: 1 },
                node,
            });
            return controller.units[controller.units.length - 1];
        };
        const reset = () => {
            controller.clearBattleUnits();
            controller.isStarted = true;
            controller.isFinished = false;
            controller.isPaused = false;
            controller.aiDecisionCooldown = 99999;
            controller.playerSupply = 5;
            controller.playerSprintRemaining = 0;
            controller.playerSprintCooldown = 0;
            controller.playerHealCooldown = 0;
            controller.playerBaseHealth = 49;
            controller.playerShockUnlocked = true;
            controller.playerShockUsed = false;
            controller.playerStats.sprintUses = 0;
            controller.playerStats.healUses = 0;
            controller.tacticDisplayRefreshCooldown = 0;
            controller.lastTacticHudState = '';
            const player = makeFake(0, 50, 100);
            makeFake(1, 100, 100, -100);
            controller.refreshTacticCards(true);
            return player;
        };

        reset();
        const supplySamples = [];
        for (let supply = 0; supply <= 5; supply += 1) {
            controller.playerSupply = supply;
            controller.refreshTacticCards(true);
            supplySamples.push({
                supply,
                sprint: cardData('sprint'),
                heal: cardData('heal'),
                shock: cardData('shock'),
            });
        }

        reset();
        controller.playerStats.sprintUses = 1;
        const sprintCooldownSamples = [];
        for (const remaining of [10, 9.9, 9.8, 5.8, 0.1, 0]) {
            controller.playerSprintCooldown = remaining;
            controller.refreshTacticCards(true);
            sprintCooldownSamples.push({ remaining, card: cardData('sprint') });
        }

        reset();
        controller.playerStats.healUses = 1;
        const healCooldownSamples = [];
        for (const remaining of [8, 7.9, 7.8, 4.2, 0.1, 0]) {
            controller.playerHealCooldown = remaining;
            controller.refreshTacticCards(true);
            healCooldownSamples.push({ remaining, card: cardData('heal') });
        }

        reset();
        controller.playerSupply = 0;
        controller.refreshTacticCards(true);
        const insufficient = {
            sprint: cardData('sprint'),
            heal: cardData('heal'),
        };
        controller.playerSupply = 5;
        controller.refreshTacticCards(true);
        const supplyReady = {
            sprint: cardData('sprint'),
            heal: cardData('heal'),
        };

        reset();
        controller.playerSprintRemaining = 5.8;
        controller.playerSprintCooldown = 9.8;
        controller.playerStats.sprintUses = 1;
        controller.refreshTacticCards(true);
        const active = cardData('sprint');

        reset();
        controller.clearBattleUnits();
        controller.playerStats.sprintUses = 1;
        controller.playerSprintCooldown = 6.4;
        controller.refreshTacticCards(true);
        const beforePause = {
            cooldown: controller.playerSprintCooldown,
            card: cardData('sprint'),
        };
        controller.pauseGame();
        controller.update(1.25);
        controller.refreshTacticCards(true);
        const duringPause = {
            cooldown: controller.playerSprintCooldown,
            card: cardData('sprint'),
        };
        controller.resumeGame();
        controller.update(0.11);
        controller.refreshTacticCards(true);
        const afterResume = {
            cooldown: controller.playerSprintCooldown,
            card: cardData('sprint'),
        };

        reset();
        controller.clearBattleUnits();
        controller.playerStats.sprintUses = 1;
        controller.playerSprintCooldown = 0.04;
        controller.refreshTacticCards(true);
        const nearZero = cardData('sprint');
        controller.update(0.1);
        controller.refreshTacticCards(true);
        const atZero = {
            cooldown: controller.playerSprintCooldown,
            card: cardData('sprint'),
        };

        controller.clearBattleUnits();
        controller.lastTacticHudState = '';
        controller.refreshTacticCards(true);
        return {
            supplySamples,
            sprintCooldownSamples,
            healCooldownSamples,
            insufficient,
            supplyReady,
            active,
            beforePause,
            duringPause,
            afterResume,
            nearZero,
            atZero,
        };
    });

    for (const sample of dynamicDisplayAudit.supplySamples) {
        check(
            sample.sprint.cost === `${sample.supply}/2`
            && sample.heal.cost === `${sample.supply}/3`
            && sample.shock.cost === '零消耗',
            `dynamic-supply:${sample.supply}: all three cards show live player supply`,
            sample,
        );
        check(
            sample.sprint.costLabel.position[0] === 7
            && sample.heal.costLabel.position[0] === 7
            && sample.shock.costLabel.position[0] === 0
            && sample.sprint.costLabel.size[0] === 36
            && sample.heal.costLabel.size[0] === 36
            && sample.shock.costLabel.size[0] === 52,
            `dynamic-supply:${sample.supply}: numeric changes keep fixed label geometry`,
            sample,
        );
    }
    const assertCountdown = (samples, total, kind) => {
        for (const sample of samples) {
            const expected = sample.remaining > 0
                ? `${sample.remaining.toFixed(1)}秒`
                : '已就绪';
            check(
                sample.card.meta === expected,
                `countdown:${kind}:${sample.remaining}: meta is exact to 0.1 second`,
                sample,
            );
            check(
                sample.card.metaLabel.position[0] === 7
                && sample.card.metaLabel.size[0] === 36,
                `countdown:${kind}:${sample.remaining}: fixed-width label does not move`,
                sample.card.metaLabel,
            );
            if (sample.remaining > 0) {
                check(
                    sample.card.state === 'cooldown'
                    && sample.card.status === '冷却中'
                    && sample.card.metaFrame?.includes('cooldown'),
                    `countdown:${kind}:${sample.remaining}: cooldown uses short state and blue art`,
                    sample.card,
                );
            } else {
                check(
                    sample.card.meta === '已就绪'
                    && sample.card.metaFrame?.includes('ready'),
                    `countdown:${kind}: zero switches to ready without a negative value`,
                    sample.card,
                );
            }
        }
        check(
            samples[0].remaining === total
            && samples[0].card.meta === `${total.toFixed(1)}秒`,
            `countdown:${kind}: starts from the existing full cooldown`,
            samples[0],
        );
    };
    assertCountdown(dynamicDisplayAudit.sprintCooldownSamples, 10, 'sprint');
    assertCountdown(dynamicDisplayAudit.healCooldownSamples, 8, 'heal');
    check(
        dynamicDisplayAudit.insufficient.sprint.costFrame?.includes('insufficient')
        && dynamicDisplayAudit.insufficient.heal.costFrame?.includes('insufficient')
        && dynamicDisplayAudit.insufficient.sprint.status === '补给不足'
        && dynamicDisplayAudit.insufficient.heal.status === '补给不足'
        && dynamicDisplayAudit.insufficient.sprint.iconOpacity === 204
        && dynamicDisplayAudit.insufficient.heal.iconOpacity === 204,
        'dynamic-color: insufficient supply uses coral art while icons retain 80% visibility',
        dynamicDisplayAudit.insufficient,
    );
    check(
        dynamicDisplayAudit.supplyReady.sprint.costFrame?.includes('ready')
        && dynamicDisplayAudit.supplyReady.heal.costFrame?.includes('ready')
        && dynamicDisplayAudit.supplyReady.sprint.iconOpacity === 255
        && dynamicDisplayAudit.supplyReady.heal.iconOpacity === 255,
        'dynamic-color: enough supply uses bright ready art and full-color icons',
        dynamicDisplayAudit.supplyReady,
    );
    check(
        dynamicDisplayAudit.active.status === '生效5.8秒'
        && dynamicDisplayAudit.active.meta === '9.8秒'
        && dynamicDisplayAudit.active.state === 'active',
        'dynamic-active: active duration and real cooldown are shown in separate cells',
        dynamicDisplayAudit.active,
    );
    check(
        dynamicDisplayAudit.beforePause.cooldown === dynamicDisplayAudit.duringPause.cooldown
        && dynamicDisplayAudit.beforePause.card.meta === dynamicDisplayAudit.duringPause.card.meta
        && dynamicDisplayAudit.duringPause.card.status === '已暂停',
        'dynamic-pause: cooldown value and displayed tenths freeze while paused',
        dynamicDisplayAudit,
    );
    check(
        dynamicDisplayAudit.afterResume.cooldown < dynamicDisplayAudit.duringPause.cooldown
        && dynamicDisplayAudit.afterResume.card.meta !== dynamicDisplayAudit.duringPause.card.meta,
        'dynamic-pause: countdown resumes from the remaining game time',
        dynamicDisplayAudit,
    );
    check(
        dynamicDisplayAudit.nearZero.meta === '0.1秒'
        && dynamicDisplayAudit.atZero.cooldown === 0
        && dynamicDisplayAudit.atZero.card.meta === '已就绪'
        && !dynamicDisplayAudit.atZero.card.meta.includes('-'),
        'dynamic-zero: countdown clamps at zero and never renders a negative value',
        dynamicDisplayAudit,
    );

    const unavailableInteractionAudit = await withController((cc, _scene, _nodes, controller) => {
        const cards = {
            sprint: controller.playerSprintCard,
            heal: controller.playerHealCard,
            shock: controller.playerShockCard,
        };
        const findDescendant = (root, names) => {
            const wanted = new Set(names.map((name) => name.toLowerCase()));
            const queue = [root];
            while (queue.length > 0) {
                const node = queue.shift();
                if (wanted.has(node.name.toLowerCase())) return node;
                queue.push(...node.children);
            }
            return null;
        };
        const getTouchNode = (card) => {
            const candidate = card.touchAreaNode ?? card.touchArea;
            return candidate?.node ?? candidate ?? findDescendant(card.node, ['TouchArea']) ?? card.node;
        };
        const makeFake = (team, health, maxHealth, y = 0) => {
            const node = new cc.Node(`Clarity05TouchFake-${team}-${controller.units.length}`);
            node.setParent(controller.unitsAndVfxLayer);
            node.setPosition(0, y, 0);
            controller.units.push({
                team,
                lane: 0,
                health,
                definition: { maxHealth, type: 'small', battlePower: 1 },
                node,
            });
        };
        const reset = () => {
            controller.clearBattleUnits();
            controller.isStarted = true;
            controller.isFinished = false;
            controller.isPaused = false;
            controller.playerSupply = 5;
            controller.playerSprintRemaining = 0;
            controller.playerSprintCooldown = 0;
            controller.playerHealCooldown = 0;
            controller.playerShockUnlocked = false;
            controller.playerShockUsed = false;
        };
        const originals = {
            sprint: controller.tryUseSprint,
            heal: controller.tryUseHeal,
            shock: controller.tryUseShock,
            playSfx: controller.audioManager.playSfx,
        };
        const calls = { sprint: 0, heal: 0, shock: 0 };
        const audioCalls = [];
        controller.tryUseSprint = () => { calls.sprint += 1; };
        controller.tryUseHeal = () => { calls.heal += 1; };
        controller.tryUseShock = () => { calls.shock += 1; };
        controller.audioManager.playSfx = (name) => audioCalls.push(name);

        const outputs = [];
        const exercise = (id, kind, setup) => {
            reset();
            setup();
            controller.refreshTacticCards();
            calls[kind] = 0;
            audioCalls.length = 0;
            const card = cards[kind];
            const touchNode = getTouchNode(card);
            const before = {
                supply: controller.playerSupply,
                sprintRemaining: controller.playerSprintRemaining,
                sprintCooldown: controller.playerSprintCooldown,
                healCooldown: controller.playerHealCooldown,
                shockUsed: controller.playerShockUsed,
                state: card.availabilityState,
            };
            touchNode.emit(cc.Node.EventType.TOUCH_START);
            const whileDown = {
                scale: [card.node.scale.x, card.node.scale.y],
                pressActive: card.pressOverlay?.active ?? false,
            };
            touchNode.emit(cc.Node.EventType.TOUCH_END);
            outputs.push({
                id,
                kind,
                before,
                whileDown,
                after: {
                    supply: controller.playerSupply,
                    sprintRemaining: controller.playerSprintRemaining,
                    sprintCooldown: controller.playerSprintCooldown,
                    healCooldown: controller.playerHealCooldown,
                    shockUsed: controller.playerShockUsed,
                    state: card.availabilityState,
                    scale: [card.node.scale.x, card.node.scale.y],
                    pressActive: card.pressOverlay?.active ?? false,
                    calls: calls[kind],
                    audioCalls: [...audioCalls],
                },
            });
        };

        exercise('insufficient-supply', 'sprint', () => {
            controller.playerSupply = 0;
            makeFake(0, 100, 100);
        });
        exercise('no-friendly-unit', 'sprint', () => {
            controller.playerSupply = 2;
        });
        exercise('active', 'sprint', () => {
            controller.playerSprintRemaining = 5;
        });
        exercise('sprint-cooldown', 'sprint', () => {
            controller.playerSprintCooldown = 6;
        });
        exercise('no-injured-unit', 'heal', () => {
            controller.playerSupply = 3;
            makeFake(0, 100, 100);
        });
        exercise('heal-cooldown', 'heal', () => {
            controller.playerHealCooldown = 6;
        });
        exercise('locked', 'shock', () => {});
        exercise('no-enemy-in-territory', 'shock', () => {
            controller.playerShockUnlocked = true;
        });
        exercise('used', 'shock', () => {
            controller.playerShockUsed = true;
        });
        exercise('paused', 'sprint', () => {
            controller.isPaused = true;
            controller.playerSupply = 2;
            makeFake(0, 100, 100);
        });
        exercise('finished', 'sprint', () => {
            controller.isFinished = true;
            controller.playerSupply = 2;
            makeFake(0, 100, 100);
        });
        exercise('not-started', 'sprint', () => {
            controller.isStarted = false;
            controller.playerSupply = 2;
            makeFake(0, 100, 100);
        });

        controller.tryUseSprint = originals.sprint;
        controller.tryUseHeal = originals.heal;
        controller.tryUseShock = originals.shock;
        controller.audioManager.playSfx = originals.playSfx;
        reset();
        controller.refreshTacticCards();
        return outputs;
    });

    for (const audit of unavailableInteractionAudit) {
        check(
            approximately(audit.whileDown.scale[0], 1)
            && approximately(audit.whileDown.scale[1], 1)
            && audit.whileDown.pressActive === false,
            `touch:${audit.id}: unavailable TOUCH_START has no feedback`,
            audit,
        );
        check(
            audit.after.calls === 0
            && audit.after.audioCalls.filter((name) => String(name).startsWith('tactic_')).length === 0,
            `touch:${audit.id}: unavailable gesture invokes no tactic and no success SFX`,
            audit,
        );
        check(
            audit.after.supply === audit.before.supply
            && audit.after.sprintRemaining === audit.before.sprintRemaining
            && audit.after.sprintCooldown === audit.before.sprintCooldown
            && audit.after.healCooldown === audit.before.healCooldown
            && audit.after.shockUsed === audit.before.shockUsed,
            `touch:${audit.id}: unavailable gesture changes no gameplay state`,
            audit,
        );
        check(
            approximately(audit.after.scale[0], 1)
            && approximately(audit.after.scale[1], 1)
            && audit.after.pressActive === false,
            `touch:${audit.id}: unavailable TOUCH_END remains visually neutral`,
            audit,
        );
    }

    const armedAndDebounceAudit = await withController(async (cc, _scene, _nodes, controller) => {
        const findDescendant = (root, names) => {
            const wanted = new Set(names.map((name) => name.toLowerCase()));
            const queue = [root];
            while (queue.length > 0) {
                const node = queue.shift();
                if (wanted.has(node.name.toLowerCase())) return node;
                queue.push(...node.children);
            }
            return null;
        };
        controller.clearBattleUnits();
        controller.isStarted = true;
        controller.isFinished = false;
        controller.isPaused = false;
        controller.aiDecisionCooldown = 99999;
        controller.playerEnergy = 100;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(0);
        controller.playerSupply = 2;
        controller.playerSprintRemaining = 0;
        controller.playerSprintCooldown = 0;
        controller.refreshTacticCards();
        const card = controller.playerSprintCard;
        const candidate = card.touchAreaNode ?? card.touchArea;
        const touchNode = candidate?.node ?? candidate
            ?? findDescendant(card.node, ['TouchArea'])
            ?? card.node;
        const originalTryUseSprint = controller.tryUseSprint;
        let calls = 0;
        controller.tryUseSprint = () => { calls += 1; };
        const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
        const gesture = () => {
            touchNode.emit(cc.Node.EventType.TOUCH_START);
            touchNode.emit(cc.Node.EventType.TOUCH_END);
        };

        await wait(270);
        calls = 0;
        touchNode.emit(cc.Node.EventType.TOUCH_END);
        const strayEndCalls = calls;

        await wait(270);
        calls = 0;
        controller.playerSupply = 0;
        controller.refreshTacticCards();
        touchNode.emit(cc.Node.EventType.TOUCH_START);
        controller.playerSupply = 2;
        controller.refreshTacticCards();
        touchNode.emit(cc.Node.EventType.TOUCH_END);
        const unavailableStartAvailableEndCalls = calls;

        await wait(270);
        calls = 0;
        controller.playerSupply = 2;
        controller.refreshTacticCards();
        touchNode.emit(cc.Node.EventType.TOUCH_START);
        touchNode.emit(cc.Node.EventType.TOUCH_CANCEL);
        touchNode.emit(cc.Node.EventType.TOUCH_END);
        const cancelThenEndCalls = calls;

        await wait(270);
        calls = 0;
        gesture();
        const afterFirst = calls;
        gesture();
        const afterImmediateSecond = calls;
        await wait(270);
        gesture();
        const afterDebounceWindow = calls;
        const visualAfter = {
            scale: [card.node.scale.x, card.node.scale.y],
            pressActive: card.pressOverlay?.active ?? false,
            pressArmed: card.pressArmed ?? card.pointerArmed ?? null,
        };

        controller.tryUseSprint = originalTryUseSprint;
        controller.clearBattleUnits();
        controller.refreshTacticCards();
        return {
            strayEndCalls,
            unavailableStartAvailableEndCalls,
            cancelThenEndCalls,
            afterFirst,
            afterImmediateSecond,
            afterDebounceWindow,
            visualAfter,
        };
    });
    check(
        armedAndDebounceAudit.strayEndCalls === 0,
        'armed: TOUCH_END without accepted TOUCH_START does not trigger',
        armedAndDebounceAudit,
    );
    check(
        armedAndDebounceAudit.unavailableStartAvailableEndCalls === 0,
        'armed: unavailable START cannot become an accepted gesture before END',
        armedAndDebounceAudit,
    );
    check(
        armedAndDebounceAudit.cancelThenEndCalls === 0,
        'armed: TOUCH_CANCEL disarms the following END',
        armedAndDebounceAudit,
    );
    check(
        armedAndDebounceAudit.afterFirst === 1
        && armedAndDebounceAudit.afterImmediateSecond === 1
        && armedAndDebounceAudit.afterDebounceWindow === 2,
        'debounce: two gestures inside 250ms invoke once and a later gesture invokes again',
        armedAndDebounceAudit,
    );
    check(
        approximately(armedAndDebounceAudit.visualAfter.scale[0], 1)
        && approximately(armedAndDebounceAudit.visualAfter.scale[1], 1)
        && armedAndDebounceAudit.visualAfter.pressActive === false
        && armedAndDebounceAudit.visualAfter.pressArmed !== true,
        'armed: interaction always restores neutral visual and armed state',
        armedAndDebounceAudit.visualAfter,
    );

    const pauseAudit = await withController((cc, _scene, _nodes, controller) => {
        const findDescendant = (root, names) => {
            const wanted = new Set(names.map((name) => name.toLowerCase()));
            const queue = [root];
            while (queue.length > 0) {
                const node = queue.shift();
                if (wanted.has(node.name.toLowerCase())) return node;
                queue.push(...node.children);
            }
            return null;
        };
        const status = (card) => {
            const label = card.statusLabel
                ?? card.stateLabel
                ?? findDescendant(card.node, ['StateLabel', 'StatusLabel', 'Status'])?.getComponent(cc.Label);
            return label?.string ?? null;
        };
        controller.clearBattleUnits();
        controller.isStarted = true;
        controller.isFinished = false;
        controller.isPaused = false;
        controller.aiDecisionCooldown = 99999;
        controller.playerEnergy = 100;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(0);
        controller.playerSupply = 2;
        controller.playerSprintRemaining = 0;
        controller.playerSprintCooldown = 0;
        controller.lastTacticHudState = '';
        controller.refreshTacticCards();
        const card = controller.playerSprintCard;
        const candidate = card.touchAreaNode ?? card.touchArea;
        const touchNode = candidate?.node ?? candidate
            ?? findDescendant(card.node, ['TouchArea'])
            ?? card.node;
        const originalTryUseSprint = controller.tryUseSprint;
        let calls = 0;
        controller.tryUseSprint = () => { calls += 1; };
        card.lastActivationTimeMs = Number.NEGATIVE_INFINITY;
        touchNode.emit(cc.Node.EventType.TOUCH_START);
        const whileDown = {
            scale: [card.node.scale.x, card.node.scale.y],
            pressActive: card.pressOverlay?.active ?? false,
        };
        controller.pauseGame();
        const whilePaused = {
            isPaused: controller.isPaused,
            availability: controller.getPlayerTacticAvailability('sprint'),
            cardState: card.availabilityState,
            status: status(card),
            scale: [card.node.scale.x, card.node.scale.y],
            pressActive: card.pressOverlay?.active ?? false,
        };
        touchNode.emit(cc.Node.EventType.TOUCH_END);
        const callsAfterPausedEnd = calls;
        controller.resumeGame();
        const afterResume = {
            isPaused: controller.isPaused,
            availability: controller.getPlayerTacticAvailability('sprint'),
            cardState: card.availabilityState,
            status: status(card),
            scale: [card.node.scale.x, card.node.scale.y],
            pressActive: card.pressOverlay?.active ?? false,
        };
        controller.tryUseSprint = originalTryUseSprint;
        controller.clearBattleUnits();
        controller.refreshTacticCards();
        return {
            whileDown,
            whilePaused,
            callsAfterPausedEnd,
            afterResume,
        };
    });
    check(
        pauseAudit.whileDown.scale[0] < 1 && pauseAudit.whileDown.pressActive,
        'pause: available card shows pressed feedback before pause',
        pauseAudit,
    );
    check(
        pauseAudit.whilePaused.isPaused
        && pauseAudit.whilePaused.availability.state === 'paused'
        && pauseAudit.whilePaused.cardState === 'paused'
        && pauseAudit.whilePaused.status === '已暂停',
        'pause: real pauseGame immediately synchronizes paused state and text',
        pauseAudit,
    );
    check(
        approximately(pauseAudit.whilePaused.scale[0], 1)
        && approximately(pauseAudit.whilePaused.scale[1], 1)
        && pauseAudit.whilePaused.pressActive === false
        && pauseAudit.callsAfterPausedEnd === 0,
        'pause: pause cancels an armed press and END cannot release the tactic',
        pauseAudit,
    );
    check(
        pauseAudit.afterResume.isPaused === false
        && pauseAudit.afterResume.availability.state === 'available'
        && pauseAudit.afterResume.cardState === 'available'
        && pauseAudit.afterResume.status === '点击使用'
        && approximately(pauseAudit.afterResume.scale[0], 1)
        && pauseAudit.afterResume.pressActive === false,
        'pause: real resumeGame immediately restores the correct card state',
        pauseAudit,
    );

    const runtimeSyncAudit = await withController((cc, _scene, _nodes, controller) => {
        const makeFake = (team, health, maxHealth, y = 0) => {
            const node = new cc.Node(`Clarity05SyncFake-${team}-${controller.units.length}`);
            node.setParent(controller.unitsAndVfxLayer);
            node.setPosition(0, y, 0);
            controller.units.push({
                team,
                lane: 0,
                health,
                definition: { maxHealth, type: 'small', battlePower: 1 },
                node,
            });
            return controller.units[controller.units.length - 1];
        };
        const reset = () => {
            controller.clearBattleUnits();
            controller.isStarted = true;
            controller.isFinished = false;
            controller.isPaused = false;
            controller.aiDecisionCooldown = 99999;
            controller.playerSupply = 5;
            controller.playerSprintRemaining = 0;
            controller.playerSprintCooldown = 0;
            controller.playerHealCooldown = 0;
            controller.playerShockUnlocked = false;
            controller.playerShockUsed = false;
            controller.lastTacticHudState = '';
        };
        const state = (kind) => {
            const card = kind === 'sprint'
                ? controller.playerSprintCard
                : kind === 'heal'
                    ? controller.playerHealCard
                    : controller.playerShockCard;
            return card.availabilityState;
        };
        reset();
        controller.playerSupply = 2;
        controller.refreshHud();
        const sprintBeforeSpawn = state('sprint');
        makeFake(0, 100, 100);
        controller.refreshHud();
        const sprintAfterSpawn = state('sprint');

        reset();
        controller.playerSupply = 3;
        const player = makeFake(0, 100, 100);
        controller.refreshHud();
        const healBeforeDamage = state('heal');
        player.health = 50;
        controller.refreshHud();
        const healAfterDamage = state('heal');

        reset();
        controller.playerShockUnlocked = true;
        controller.refreshHud();
        const shockBeforeEnemy = state('shock');
        makeFake(1, 100, 100, -100);
        controller.refreshHud();
        const shockAfterEnemy = state('shock');

        reset();
        controller.playerSupply = 5;
        controller.playerSprintCooldown = 6;
        controller.hudRefreshCooldown = 0;
        controller.refreshHud();
        const cooldownBefore = {
            state: state('sprint'),
            text: controller.playerSprintCard.statusLabel?.string
                ?? controller.playerSprintCard.stateLabel?.string
                ?? null,
        };
        controller.update(1.05);
        const cooldownAfter = {
            value: controller.playerSprintCooldown,
            state: state('sprint'),
            text: controller.playerSprintCard.statusLabel?.string
                ?? controller.playerSprintCard.stateLabel?.string
                ?? null,
        };

        controller.clearBattleUnits();
        controller.lastTacticHudState = '';
        controller.refreshHud();
        return {
            sprintBeforeSpawn,
            sprintAfterSpawn,
            healBeforeDamage,
            healAfterDamage,
            shockBeforeEnemy,
            shockAfterEnemy,
            cooldownBefore,
            cooldownAfter,
        };
    });
    check(
        runtimeSyncAudit.sprintBeforeSpawn === 'no-friendly-unit'
        && runtimeSyncAudit.sprintAfterSpawn === 'available',
        'runtime-sync: spawning a friendly unit updates sprint without manual card refresh',
        runtimeSyncAudit,
    );
    check(
        runtimeSyncAudit.healBeforeDamage === 'no-injured-unit'
        && runtimeSyncAudit.healAfterDamage === 'available',
        'runtime-sync: damage updates heal without manual card refresh',
        runtimeSyncAudit,
    );
    check(
        runtimeSyncAudit.shockBeforeEnemy === 'no-enemy-in-territory'
        && runtimeSyncAudit.shockAfterEnemy === 'available',
        'runtime-sync: an enemy entering territory updates shock without manual card refresh',
        runtimeSyncAudit,
    );
    check(
        runtimeSyncAudit.cooldownBefore.state === 'cooldown'
        && runtimeSyncAudit.cooldownBefore.text === '冷却中'
        && runtimeSyncAudit.cooldownAfter.state === 'cooldown'
        && runtimeSyncAudit.cooldownAfter.text === '冷却中'
        && runtimeSyncAudit.cooldownAfter.value > 4.8
        && runtimeSyncAudit.cooldownAfter.value < 5,
        'runtime-sync: cooldown value and label update dynamically',
        runtimeSyncAudit,
    );

    const setupActualUse = (kind) => withController((_cc, _scene, _nodes, controller, targetKind) => {
        controller.clearBattleUnits();
        controller.isStarted = true;
        controller.isFinished = false;
        controller.isPaused = false;
        controller.aiDecisionCooldown = 99999;
        controller.playerEnergy = 100;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'small';
        controller.playerSprintRemaining = 0;
        controller.playerSprintCooldown = 0;
        controller.playerHealCooldown = 0;
        controller.playerShockUnlocked = false;
        controller.playerShockUsed = false;
        controller.trySpawnPlayerUnit(0);
        const player = controller.units.find((unit) => unit.team === 0);
        if (!player) throw new Error(`failed to create player for ${targetKind}`);
        if (targetKind === 'sprint') {
            controller.playerSupply = 2;
        } else if (targetKind === 'heal') {
            controller.playerSupply = 3;
            player.health = Math.max(1, Math.floor(player.definition.maxHealth / 2));
        } else {
            controller.playerSupply = 0;
            controller.playerBaseHealth = 49;
            controller.playerShockUnlocked = true;
            if (!controller.spawnUnit(1, 1, player.definition)) {
                throw new Error('failed to create shock target');
            }
            const enemy = controller.units.find((unit) => unit.team === 1);
            enemy.node.setPosition(enemy.node.position.x, -100, 0);
        }
        controller.__clarity05AudioCalls = [];
        if (!controller.__clarity05OriginalPlaySfx) {
            controller.__clarity05OriginalPlaySfx = controller.audioManager.playSfx;
        }
        controller.audioManager.playSfx = (name) => controller.__clarity05AudioCalls.push(name);
        controller.lastTacticHudState = '';
        controller.refreshTacticCards();
        return {
            supply: controller.playerSupply,
            playerHealth: player.health,
            playerMaxHealth: player.definition.maxHealth,
            enemyHealth: controller.units.find((unit) => unit.team === 1)?.health ?? null,
        };
    }, kind);
    const inspectActualUse = (kind) => withController((_cc, _scene, _nodes, controller, targetKind) => {
        const player = controller.units.find((unit) => unit.team === 0)
            ?? controller.dyingUnits.find((unit) => unit.team === 0);
        const enemy = controller.units.find((unit) => unit.team === 1)
            ?? controller.dyingUnits.find((unit) => unit.team === 1);
        const card = targetKind === 'sprint'
            ? controller.playerSprintCard
            : targetKind === 'heal'
                ? controller.playerHealCard
                : controller.playerShockCard;
        return {
            supply: controller.playerSupply,
            sprintRemaining: controller.playerSprintRemaining,
            sprintCooldown: controller.playerSprintCooldown,
            healCooldown: controller.playerHealCooldown,
            shockUsed: controller.playerShockUsed,
            playerHealth: player?.health ?? null,
            enemyHealth: enemy?.health ?? null,
            state: card.availabilityState,
            costText: card.costLabel?.string ?? null,
            metaText: card.metaLabel?.string ?? null,
            statusText: card.stateLabel?.string ?? null,
            scale: [card.node.scale.x, card.node.scale.y],
            pressActive: card.pressOverlay?.active ?? false,
            audioCalls: [...(controller.__clarity05AudioCalls ?? [])],
        };
    }, kind);

    await page.waitForTimeout(300);
    const actualUseAudit = {};
    actualUseAudit.sprint = { before: await setupActualUse('sprint') };
    await clickCard('sprint');
    actualUseAudit.sprint.after = await inspectActualUse('sprint');

    await page.waitForTimeout(300);
    actualUseAudit.heal = { before: await setupActualUse('heal') };
    await clickCard('heal');
    actualUseAudit.heal.after = await inspectActualUse('heal');

    await page.waitForTimeout(300);
    actualUseAudit.shock = { before: await setupActualUse('shock') };
    await clickCard('shock');
    actualUseAudit.shock.after = await inspectActualUse('shock');

    await withController((_cc, _scene, _nodes, controller) => {
        if (controller.__clarity05OriginalPlaySfx) {
            controller.audioManager.playSfx = controller.__clarity05OriginalPlaySfx;
        }
        delete controller.__clarity05OriginalPlaySfx;
        delete controller.__clarity05AudioCalls;
        controller.clearBattleUnits();
        controller.refreshTacticCards();
    });
    check(
        actualUseAudit.sprint.before.supply === 2
        && actualUseAudit.sprint.after.supply === 0
        && actualUseAudit.sprint.after.sprintRemaining > 5.5
        && actualUseAudit.sprint.after.sprintCooldown > 9.5
        && actualUseAudit.sprint.after.state === 'active'
        && actualUseAudit.sprint.after.costText === '0/2'
        && /^9\.\d秒$/u.test(actualUseAudit.sprint.after.metaText)
        && /^生效5\.\d秒$/u.test(actualUseAudit.sprint.after.statusText)
        && actualUseAudit.sprint.after.audioCalls.filter((name) => name === 'tactic_sprint').length === 1,
        'actual-use: sprint releases once, costs 2, immediately refreshes supply/countdown, and plays one SFX',
        actualUseAudit.sprint,
    );
    const expectedHeal = Math.min(
        actualUseAudit.heal.before.playerMaxHealth,
        actualUseAudit.heal.before.playerHealth
            + Math.ceil(actualUseAudit.heal.before.playerMaxHealth * 0.4),
    );
    check(
        actualUseAudit.heal.before.supply === 3
        && actualUseAudit.heal.after.supply === 0
        && actualUseAudit.heal.after.playerHealth === expectedHeal
        && actualUseAudit.heal.after.healCooldown > 7.5
        && actualUseAudit.heal.after.costText === '0/3'
        && /^7\.\d秒$/u.test(actualUseAudit.heal.after.metaText)
        && actualUseAudit.heal.after.statusText === '冷却中'
        && actualUseAudit.heal.after.audioCalls.filter((name) => name === 'tactic_heal').length === 1,
        'actual-use: heal releases once, costs 3, refreshes supply/countdown, heals 40%, and plays one SFX',
        actualUseAudit.heal,
    );
    check(
        actualUseAudit.shock.before.supply === 0
        && actualUseAudit.shock.after.supply === 0
        && actualUseAudit.shock.after.shockUsed === true
        && actualUseAudit.shock.after.audioCalls.filter((name) => name === 'tactic_shock').length === 1,
        'actual-use: shock releases once, costs zero, marks used, and plays one SFX',
        actualUseAudit.shock,
    );
    for (const [kind, audit] of Object.entries(actualUseAudit)) {
        check(
            approximately(audit.after.scale[0], 1)
            && approximately(audit.after.scale[1], 1)
            && audit.after.pressActive === false,
            `actual-use:${kind}: visual returns to neutral after release`,
            audit,
        );
    }

    await withController((_cc, _scene, _nodes, controller) => {
        controller.clearBattleUnits();
        controller.isStarted = true;
        controller.isFinished = false;
        controller.isPaused = false;
        controller.aiDecisionCooldown = 99999;
        controller.playerEnergy = 100;
        controller.playerSpawnCooldown = 0;
        controller.selectedSheepType = 'small';
        controller.trySpawnPlayerUnit(0);
        controller.playerSupply = 0;
        controller.playerSprintRemaining = 0;
        controller.playerSprintCooldown = 0;
        controller.playerHealCooldown = 0;
        controller.playerShockUnlocked = false;
        controller.playerShockUsed = false;
        controller.refreshTacticCards();
    });
    await page.waitForTimeout(500);
    await canvas.screenshot({
        path: path.join(outputDir, 'tactic_cards_disabled_1280x720.png'),
    });

    await page.setViewportSize({ width: 1600, height: 720 });
    await page.waitForTimeout(900);
    await setupAllAvailable();
    const wideCanvas = (await getCanvas()).canvas;
    await wideCanvas.screenshot({
        path: path.join(outputDir, 'tactic_cards_wechat_landscape_sim_1600x720.png'),
    });
    const layout1600 = await collectLayout();
    assertLayout(layout1600, '1600x720');

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(900);
    await setupAllAvailable();
    const phoneLandscapeCanvas = (await getCanvas()).canvas;
    await phoneLandscapeCanvas.screenshot({
        path: path.join(outputDir, 'tactic_cards_phone_landscape_844x390.png'),
    });
    const layoutPhoneLandscape = await collectLayout();
    assertLayout(layoutPhoneLandscape, '844x390');

    const relevantWarnings = consoleRecords.filter(
        (entry) => entry.type === 'warning'
            && /\bTactic|战术|TacticCardBounds|TacticCardLayout/u.test(entry.text),
    );
    const consoleErrors = consoleRecords.filter(
        (entry) => entry.type === 'error' || entry.type === 'pageerror',
    );
    check(consoleErrors.length === 0, 'runtime: no console errors or page errors', consoleErrors);
    check(relevantWarnings.length === 0, 'runtime: no tactic-card layout warnings', relevantWarnings);
    check(requestFailures.length === 0, 'runtime: no failed requests', requestFailures);
    check(response404s.length === 0, 'runtime: no 404 responses', response404s);

    result = {
        previewUrl,
        outputDir,
        layout1280,
        layout1600,
        layoutPhoneLandscape,
        stateAudit,
        dynamicDisplayAudit,
        unavailableInteractionAudit,
        armedAndDebounceAudit,
        pauseAudit,
        runtimeSyncAudit,
        actualUseAudit,
        requestFailures,
        response404s,
        consoleErrors,
        relevantWarnings,
        checks,
        summary: {
            total: checks.length,
            passed: checks.filter((entry) => entry.pass).length,
            failed: checks.filter((entry) => !entry.pass).length,
        },
    };
} catch (error) {
    fatalError = error;
    result = {
        ...result,
        fatalError: {
            name: error?.name ?? 'Error',
            message: error?.message ?? String(error),
            stack: error?.stack ?? null,
        },
        checks,
        summary: {
            total: checks.length,
            passed: checks.filter((entry) => entry.pass).length,
            failed: checks.filter((entry) => !entry.pass).length,
        },
    };
} finally {
    if (browser) await browser.close();
    fs.writeFileSync(
        path.join(outputDir, 'tactic_card_clarity05_runtime_audit.json'),
        JSON.stringify(result, null, 2),
    );
}

if (fatalError) throw fatalError;
const failures = checks.filter((entry) => !entry.pass);
assert.equal(
    failures.length,
    0,
    `clarity05 tactic-card QA failed (${failures.length}/${checks.length}):\n`
        + failures.map((entry) => `- ${entry.message}`).join('\n'),
);
console.log(JSON.stringify(result.summary, null, 2));
