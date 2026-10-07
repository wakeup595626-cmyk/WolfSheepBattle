import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(
    process.argv[2] ?? 'art_source/qa/art10-ui-clarity03/screenshots',
);
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7459';
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
            };
        };
        const resolveCard = (card) => {
            const root = card.node;
            const infoSection = asNode(card.infoSectionNode ?? card.infoSection)
                ?? findDescendant(root, ['InfoSection']);
            const actionSection = asNode(card.actionSectionNode ?? card.actionSection)
                ?? findDescendant(root, ['ActionSection']);
            const divider = asNode(card.dividerNode ?? card.divider)
                ?? findDescendant(root, ['Divider']);
            const skillIconNode = asNode(card.skillIconNode ?? card.iconNode ?? card.iconGraphics)
                ?? findDescendant(root, ['SkillIcon', 'IconArea']);
            const titleNode = asNode(card.titleLabel)
                ?? findDescendant(root, ['TitleLabel', 'Title']);
            const conditionNode = asNode(card.conditionLabel)
                ?? findDescendant(root, ['ConditionLabel', 'Condition']);
            const effectNode = asNode(card.effectLabel)
                ?? findDescendant(root, ['EffectLabel', 'Effect']);
            const costIconNode = asNode(card.costIconNode ?? card.costIconSprite ?? card.costIcon)
                ?? findDescendant(root, ['CostIcon', 'CostIconArt']);
            const costNode = asNode(card.costLabel)
                ?? findDescendant(root, ['CostLabel', 'Cost']);
            const extraIconNode = asNode(card.extraInfoIconNode ?? card.extraInfoIconSprite ?? card.extraInfoIcon)
                ?? findDescendant(root, ['ExtraInfoIcon', 'ExtraInfoIconArt', 'ExtraIcon']);
            const extraNode = asNode(card.extraInfoLabel ?? card.extraLabel)
                ?? findDescendant(root, ['ExtraInfoLabel', 'ExtraInfo', 'ExtraLabel']);
            const stateIconNode = asNode(card.stateIconNode ?? card.stateIconSprite ?? card.stateIcon)
                ?? findDescendant(root, ['StateIcon', 'StateIconArt', 'StatusIcon']);
            const statusNode = asNode(card.statusLabel ?? card.stateLabel)
                ?? findDescendant(root, ['StateLabel', 'StatusLabel', 'Status']);
            const stateButtonNode = asNode(card.stateButtonNode ?? card.stateButton)
                ?? findDescendant(root, ['StateButton', 'StatusButton']);
            const touchArea = asNode(card.touchAreaNode ?? card.touchArea)
                ?? findDescendant(root, ['TouchArea']);
            const pressOverlay = asNode(card.pressOverlay)
                ?? findDescendant(root, ['PressOverlay']);
            const artSprite = card.artSprite ?? findDescendant(root, ['CardBackground', 'CardArt'])?.getComponent(cc.Sprite);
            const titleLabel = asLabel(card.titleLabel, titleNode);
            const conditionLabel = asLabel(card.conditionLabel, conditionNode);
            const effectLabel = asLabel(card.effectLabel, effectNode);
            const costLabel = asLabel(card.costLabel, costNode);
            const extraLabel = asLabel(card.extraInfoLabel ?? card.extraLabel, extraNode);
            const statusLabel = asLabel(card.statusLabel ?? card.stateLabel, statusNode);
            return {
                kind: card.kind,
                card: nodeMetric(root),
                infoSection: nodeMetric(infoSection),
                actionSection: nodeMetric(actionSection),
                divider: nodeMetric(divider),
                skillIcon: nodeMetric(skillIconNode),
                title: labelMetric(titleLabel),
                condition: labelMetric(conditionLabel),
                effect: labelMetric(effectLabel),
                costIcon: spriteMetric(costIconNode),
                cost: labelMetric(costLabel),
                extraIcon: spriteMetric(extraIconNode),
                extra: labelMetric(extraLabel),
                stateButton: nodeMetric(stateButtonNode),
                stateIcon: spriteMetric(stateIconNode),
                status: labelMetric(statusLabel),
                touchArea: nodeMetric(touchArea),
                pressOverlay: nodeMetric(pressOverlay),
                formalSliced: artSprite?.type === cc.Sprite.Type.SLICED,
                fallbackGraphicsEnabled: card.graphics?.enabled ?? null,
                enabled: card.enabled,
                availabilityState: card.availabilityState,
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
            cost: '补给 2',
            extra: '冷却 10秒',
        },
        heal: {
            title: '战地急救',
            condition: '场上有受伤单位',
            effect: '全体恢复40%生命',
            cost: '补给 3',
            extra: '冷却 8秒',
        },
        shock: {
            title: '领地震荡',
            condition: '基地生命低于50%',
            effect: '仅作用于本方领地 小/中消灭，大/巨重伤并击退',
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
        for (const card of layout.cards) {
            const prefix = `${suffix}:${card.kind}`;
            check(
                approximately(card.card?.size?.[0], 216)
                && approximately(card.card?.size?.[1], 120),
                `${prefix}: card size is 216x120`,
                card.card?.size,
            );
            check(card.infoSection !== null, `${prefix}: InfoSection exists`);
            check(card.actionSection !== null, `${prefix}: ActionSection exists`);
            check(card.divider !== null, `${prefix}: Divider exists`);
            check(
                card.infoSection?.size?.[1] >= 82 && card.infoSection?.size?.[1] <= 86,
                `${prefix}: InfoSection height is 82..86`,
                card.infoSection?.size,
            );
            check(
                card.actionSection?.size?.[1] >= 32 && card.actionSection?.size?.[1] <= 36,
                `${prefix}: ActionSection height is 32..36`,
                card.actionSection?.size,
            );
            check(
                rectContains(card.card?.bounds, card.infoSection?.bounds),
                `${prefix}: InfoSection stays inside card`,
            );
            check(
                rectContains(card.card?.bounds, card.actionSection?.bounds),
                `${prefix}: ActionSection stays inside card`,
            );
            check(
                rectContains(card.card?.bounds, card.divider?.bounds),
                `${prefix}: Divider stays inside card`,
            );
            const sectionOverlap = rectOverlapArea(
                card.infoSection?.bounds,
                card.actionSection?.bounds,
            );
            check(
                sectionOverlap <= 2,
                `${prefix}: InfoSection and ActionSection do not overlap`,
                sectionOverlap,
            );
            check(
                rectContains(card.infoSection?.bounds, card.skillIcon?.bounds),
                `${prefix}: skill icon stays inside InfoSection`,
            );
            check(
                card.skillIcon?.bounds && card.card?.bounds
                && card.skillIcon.bounds.left - card.card.bounds.left >= 9.5,
                `${prefix}: skill icon keeps at least 10px left safe margin`,
                card.skillIcon?.bounds && card.card?.bounds
                    ? card.skillIcon.bounds.left - card.card.bounds.left
                    : null,
            );
            for (const [name, metric] of [
                ['title', card.title],
                ['condition', card.condition],
                ['effect', card.effect],
            ]) {
                check(metric !== null, `${prefix}: ${name} label exists`);
                check(
                    rectContains(card.infoSection?.bounds, metric?.bounds),
                    `${prefix}: ${name} stays inside InfoSection`,
                    metric?.bounds,
                );
            }
            for (const [name, metric] of [
                ['cost', card.cost],
                ['extra', card.extra],
                ['status', card.status],
            ]) {
                check(metric !== null, `${prefix}: ${name} label exists`);
                check(
                    rectContains(card.actionSection?.bounds, metric?.bounds),
                    `${prefix}: ${name} stays inside ActionSection`,
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
                rectOverlapArea(card.cost?.bounds, card.extra?.bounds) <= 0.5
                && rectOverlapArea(card.cost?.bounds, card.status?.bounds) <= 0.5
                && rectOverlapArea(card.extra?.bounds, card.status?.bounds) <= 0.5,
                `${prefix}: ActionSection labels do not overlap`,
            );
            check(
                card.touchArea !== null
                && approximately(card.touchArea?.size?.[0], 216)
                && approximately(card.touchArea?.size?.[1], 120)
                && approximately(card.touchArea?.worldPosition?.[0], card.card?.worldPosition?.[0])
                && approximately(card.touchArea?.worldPosition?.[1], card.card?.worldPosition?.[1])
                && rectContains(card.card?.bounds, card.touchArea?.bounds),
                `${prefix}: TouchArea exactly covers and does not exceed card`,
                card.touchArea,
            );
            check(card.formalSliced, `${prefix}: formal card background uses nine-slice`);
            check(
                card.fallbackGraphicsEnabled === false,
                `${prefix}: fallback full-card Graphics is disabled in formal mode`,
                card.fallbackGraphicsEnabled,
            );
            const labels = [
                ['title', card.title, 16],
                ['condition', card.condition, 12.5],
                ['effect', card.effect, 12.5],
                ['cost', card.cost, 12.5],
                ['extra', card.extra, 12.5],
                ['status', card.status, 12.5],
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
                card.costIcon?.hasSprite && card.costIcon?.hasSpriteFrame,
                `${prefix}: cost icon is a Sprite with a frame`,
            );
            check(
                card.extraIcon?.hasSprite && card.extraIcon?.hasSpriteFrame,
                `${prefix}: extra-info icon is a Sprite with a frame`,
            );
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
            const candidate = card.stateIconNode ?? card.stateIcon;
            const node = candidate?.node ?? candidate
                ?? findDescendant(card.node, ['StateIcon', 'StatusIcon']);
            const sprite = node?.getComponent(cc.Sprite);
            return {
                active: node?.activeInHierarchy ?? false,
                hasSprite: Boolean(sprite),
                hasSpriteFrame: Boolean(sprite?.spriteFrame),
            };
        };
        const makeFake = (team, health, maxHealth, y = 0) => {
            const node = new cc.Node(`Clarity03Fake-${team}-${controller.units.length}`);
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
        capture('sprint-supply-0', 'sprint', 'insufficient-supply', '补给不足 0/2');
        capture('heal-supply-0', 'heal', 'insufficient-supply', '补给不足 0/3');
        capture('shock-supply-0', 'shock', 'locked', '生命低于50%解锁');

        reset();
        controller.playerSupply = 1;
        capture('sprint-supply-1', 'sprint', 'insufficient-supply', '补给不足 1/2');
        capture('heal-supply-1', 'heal', 'insufficient-supply', '补给不足 1/3');
        controller.playerSupply = 2;
        capture('heal-supply-2', 'heal', 'insufficient-supply', '补给不足 2/3');

        reset();
        controller.playerSupply = 2;
        capture('sprint-no-friendly', 'sprint', 'no-friendly-unit', '暂无己方单位');
        makeFake(0, 100, 100);
        capture('sprint-available', 'sprint', 'available', '点击使用');

        reset();
        controller.playerSupply = 0;
        controller.playerSprintRemaining = 5;
        capture('sprint-active', 'sprint', 'active', '生效中 5秒');
        controller.playerSprintRemaining = 0;
        controller.playerSprintCooldown = 6;
        capture('sprint-cooldown', 'sprint', 'cooldown', '冷却中 6秒');

        reset();
        controller.playerSupply = 3;
        makeFake(0, 100, 100);
        capture('heal-no-injured', 'heal', 'no-injured-unit', '暂无受伤单位');
        controller.units[0].health = 50;
        capture('heal-available', 'heal', 'available', '点击使用');
        controller.playerSupply = 0;
        controller.playerHealCooldown = 6;
        capture('heal-cooldown', 'heal', 'cooldown', '冷却中 6秒');

        reset();
        capture('shock-locked', 'shock', 'locked', '生命低于50%解锁');
        controller.playerBaseHealth = 49;
        controller.unlockShockIfNeeded(0);
        capture('shock-no-enemy', 'shock', 'no-enemy-in-territory', '领地内暂无敌人');
        makeFake(1, 100, 100, -100);
        capture('shock-available', 'shock', 'available', '点击使用');
        controller.playerShockUsed = true;
        capture('shock-used', 'shock', 'used', '本局已使用');

        reset();
        controller.isPaused = true;
        capture('sprint-paused', 'sprint', 'paused', '游戏已暂停');
        capture('heal-paused', 'heal', 'paused', '游戏已暂停');
        capture('shock-paused', 'shock', 'paused', '游戏已暂停');

        reset();
        controller.isFinished = true;
        capture('sprint-finished', 'sprint', 'finished', '战斗已结束');
        capture('heal-finished', 'heal', 'finished', '战斗已结束');
        capture('shock-finished', 'shock', 'finished', '战斗已结束');

        reset();
        controller.isStarted = false;
        capture('sprint-not-started', 'sprint', 'not-started', '战斗尚未开始');

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
            snapshot.stateIcon.active
            && snapshot.stateIcon.hasSprite
            && snapshot.stateIcon.hasSpriteFrame,
            `${prefix}: state icon is an active Sprite`,
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
            const node = new cc.Node(`Clarity03TouchFake-${team}-${controller.units.length}`);
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
        && pauseAudit.whilePaused.status === '游戏已暂停',
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
            const node = new cc.Node(`Clarity03SyncFake-${team}-${controller.units.length}`);
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
        && runtimeSyncAudit.cooldownBefore.text === '冷却中 6秒'
        && runtimeSyncAudit.cooldownAfter.state === 'cooldown'
        && runtimeSyncAudit.cooldownAfter.text === '冷却中 5秒'
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
        controller.__clarity03AudioCalls = [];
        if (!controller.__clarity03OriginalPlaySfx) {
            controller.__clarity03OriginalPlaySfx = controller.audioManager.playSfx;
        }
        controller.audioManager.playSfx = (name) => controller.__clarity03AudioCalls.push(name);
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
            scale: [card.node.scale.x, card.node.scale.y],
            pressActive: card.pressOverlay?.active ?? false,
            audioCalls: [...(controller.__clarity03AudioCalls ?? [])],
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
        if (controller.__clarity03OriginalPlaySfx) {
            controller.audioManager.playSfx = controller.__clarity03OriginalPlaySfx;
        }
        delete controller.__clarity03OriginalPlaySfx;
        delete controller.__clarity03AudioCalls;
        controller.clearBattleUnits();
        controller.refreshTacticCards();
    });
    check(
        actualUseAudit.sprint.before.supply === 2
        && actualUseAudit.sprint.after.supply === 0
        && actualUseAudit.sprint.after.sprintRemaining > 5.5
        && actualUseAudit.sprint.after.sprintCooldown > 9.5
        && actualUseAudit.sprint.after.state === 'active'
        && actualUseAudit.sprint.after.audioCalls.filter((name) => name === 'tactic_sprint').length === 1,
        'actual-use: sprint releases once, costs 2, becomes active, and plays one SFX',
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
        && actualUseAudit.heal.after.audioCalls.filter((name) => name === 'tactic_heal').length === 1,
        'actual-use: heal releases once, costs 3, heals 40%, and plays one SFX',
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
        stateAudit,
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
        path.join(outputDir, 'tactic_card_clarity03_runtime_audit.json'),
        JSON.stringify(result, null, 2),
    );
}

if (fatalError) throw fatalError;
const failures = checks.filter((entry) => !entry.pass);
assert.equal(
    failures.length,
    0,
    `clarity03 tactic-card QA failed (${failures.length}/${checks.length}):\n`
        + failures.map((entry) => `- ${entry.message}`).join('\n'),
);
console.log(JSON.stringify(result.summary, null, 2));
