import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'art_source/qa/level05-ui02/screenshots');
const previewUrl = process.argv[3] ?? 'http://127.0.0.1:7512';
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
                    && typeof component.showTacticDeckSelection === 'function');
            if (!controller) throw new Error('updated GameController component was not found');
            return Function('cc', 'controller', 'argument',
                `return (${callbackSource})(cc, controller, argument);`)(cc, controller, callbackArgument);
        },
        { callbackSource: callback.toString(), callbackArgument: argument },
    );

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(6500);

    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (await withController((_cc, controller) => Boolean(controller.formalUiFont))) break;
        await page.waitForTimeout(250);
    }

    snapshots.levelSelect = await withController((cc, controller) => {
        const color = (value) => [value.r, value.g, value.b, value.a];
        const rect = (node) => {
            const value = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { xMin: value.xMin, xMax: value.xMax, yMin: value.yMin, yMax: value.yMax };
        };
        const style = (label, includeColor = true) => ({
            fontUuid: label.font?._uuid ?? label.font?.uuid ?? '',
            fontName: label.font?.name ?? '',
            useSystemFont: label.useSystemFont,
            fontSize: label.fontSize,
            lineHeight: label.lineHeight,
            isBold: label.isBold,
            enableOutline: label.enableOutline,
            outlineWidth: label.outlineWidth,
            enableShadow: label.enableShadow,
            ...(includeColor ? { color: color(label.color) } : {}),
        });
        controller.currentLevel = 5;
        controller.showLevelSelect();
        controller.selectLevel(5);
        const cards = [...controller.levelCards.values()].map((card) => ({
            levelId: card.levelId,
            title: card.titleLabel.string,
            description: card.descriptionLabel.string,
            state: card.stateLabel.string,
            visualState: card.visualState,
            titleStyle: style(card.titleLabel),
            descriptionStyle: style(card.descriptionLabel),
            stateTypography: style(card.stateLabel, false),
            cardRect: rect(card.root),
            titleRect: rect(card.titleLabel.node),
            descriptionRect: rect(card.descriptionLabel.node),
            stateRect: rect(card.stateLabel.node),
        }));
        const titleLabel = controller.levelSelectContent.getChildByName('TitleArea')
            ?.getChildByName('TitleLabel')?.getComponent(cc.Label);
        const subtitleLabel = controller.levelSelectContent.getChildByName('TitleArea')
            ?.getChildByName('SubtitleLabel')?.getComponent(cc.Label);
        return {
            formalFontReady: Boolean(controller.formalUiFont),
            formalFontName: controller.formalUiFont?.name ?? '',
            cards,
            mainTitle: titleLabel ? { text: titleLabel.string, style: style(titleLabel) } : undefined,
            subtitle: subtitleLabel ? { text: subtitleLabel.string, style: style(subtitleLabel) } : undefined,
            backButton: {
                text: controller.levelSelectBackButton.label.string,
                style: style(controller.levelSelectBackButton.label),
            },
            confirmButton: {
                text: controller.levelSelectConfirmButton.label.string,
                style: style(controller.levelSelectConfirmButton.label),
            },
        };
    });
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(outputDir, 'level_select_level05_selected_1280x720.png'), fullPage: true });

    const levelCards = snapshots.levelSelect.cards;
    const firstTitleStyle = JSON.stringify(levelCards[0].titleStyle);
    const firstDescriptionStyle = JSON.stringify(levelCards[0].descriptionStyle);
    const firstStateTypography = JSON.stringify(levelCards[0].stateTypography);
    const contains = (outer, inner) => inner.xMin >= outer.xMin - 1 && inner.xMax <= outer.xMax + 1
        && inner.yMin >= outer.yMin - 1 && inner.yMax <= outer.yMax + 1;
    check(snapshots.levelSelect.formalFontReady
        && snapshots.levelSelect.formalFontName.includes('ui_font_cn_subset_runtime_v02'),
    'the shared formal Chinese font is loaded for the level-select UI', snapshots.levelSelect.formalFontName);
    check(levelCards.length === 5
        && levelCards.map((card) => card.title).join('|')
            === '第1关·教学节奏|第2关·轻度练习|第3关·标准节奏|第4关·泥泞与花径|第5关·无限火力',
    'all five level titles are present as dynamic labels', levelCards.map((card) => card.title));
    check(levelCards.every((card) => JSON.stringify(card.titleStyle) === firstTitleStyle),
        'all five level titles use identical font, size, weight, color, outline, and shadow parameters',
        levelCards.map((card) => ({ levelId: card.levelId, style: card.titleStyle })));
    check(levelCards.every((card) => JSON.stringify(card.descriptionStyle) === firstDescriptionStyle),
        'all level descriptions use one identical body typography style',
        levelCards.map((card) => ({ levelId: card.levelId, style: card.descriptionStyle })));
    check(levelCards.every((card) => JSON.stringify(card.stateTypography) === firstStateTypography),
        'all level-state labels use one identical typography style',
        levelCards.map((card) => ({ levelId: card.levelId, style: card.stateTypography })));
    check(levelCards.every((card) => !card.titleStyle.useSystemFont && !card.descriptionStyle.useSystemFont
        && !card.stateTypography.useSystemFont),
    'no level card falls back to a system font', levelCards);
    check(levelCards.find((card) => card.levelId === 5)?.visualState === 'selected'
        && levelCards.find((card) => card.levelId === 5)?.state === '当前选择',
    'level five expresses selection through the selected card state, not a font swap', levelCards[4]);
    check(levelCards.every((card) => contains(card.cardRect, card.titleRect)
        && contains(card.cardRect, card.descriptionRect) && contains(card.cardRect, card.stateRect)),
    'level titles, descriptions, and states remain inside all five cards', levelCards);
    check(snapshots.levelSelect.mainTitle?.style.fontSize === 36
        && snapshots.levelSelect.subtitle?.style.fontSize === 16
        && snapshots.levelSelect.backButton.style.fontSize === 22
        && snapshots.levelSelect.confirmButton.style.fontSize === 24
        && snapshots.levelSelect.confirmButton.text === '开始挑战第5关',
    'level-select title, subtitle, and action buttons use the requested hierarchy', snapshots.levelSelect);

    snapshots.tacticDeck = await withController((cc, controller) => {
        const rect = (node) => {
            const value = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
            return { xMin: value.xMin, xMax: value.xMax, yMin: value.yMin, yMax: value.yMax };
        };
        const typography = (label) => ({
            fontUuid: label.font?._uuid ?? label.font?.uuid ?? '',
            useSystemFont: label.useSystemFont,
            fontSize: label.fontSize,
            lineHeight: label.lineHeight,
            isBold: label.isBold,
            enableOutline: label.enableOutline,
            enableShadow: label.enableShadow,
        });
        controller.levelSelectPanel.active = false;
        controller.currentLevel = 5;
        controller.showTacticDeckSelection();
        const title = controller.tacticDeckContent.getChildByName('Title').getComponent(cc.Label);
        const subtitle = controller.tacticDeckContent.getChildByName('Subtitle').getComponent(cc.Label);
        const divider = controller.tacticDeckContent.getChildByName('HeaderDivider');
        const mask = controller.tacticDeckContent.getChildByName('HeaderLineMask');
        const cards = [...controller.tacticDeckOptions.values()].filter((option) => option.root.active).map((option) => ({
            kind: option.kind,
            selected: controller.pendingDeckSelection.includes(option.kind),
            rootScale: [option.root.scale.x, option.root.scale.y],
            title: option.titleLabel.string,
            titleTypography: typography(option.titleLabel),
            conditionTypography: typography(option.conditionLabel),
            effectTypography: typography(option.effectLabel),
            costTypography: typography(option.costLabel),
            cooldownTypography: typography(option.cooldownLabel),
            cardRect: rect(option.root),
            titleRect: rect(option.titleLabel.node),
            conditionRect: rect(option.conditionLabel.node),
            effectRect: rect(option.effectLabel.node),
            costRect: rect(option.costLabel.node),
            cooldownRect: rect(option.cooldownLabel.node),
        }));
        return {
            title: { text: title.string, rect: rect(title.node), typography: typography(title) },
            subtitle: { text: subtitle.string, rect: rect(subtitle.node), typography: typography(subtitle) },
            dividerRect: rect(divider),
            maskRect: rect(mask),
            cards,
            hintRect: rect(controller.tacticDeckHintLabel.node),
            buttonRect: rect(controller.tacticDeckConfirmButton.node),
            panelRect: rect(controller.tacticDeckContent),
        };
    });
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(outputDir, 'tactic_loadout_level05_header_1280x720.png'), fullPage: true });

    snapshots.tacticToggleTypography = await withController((_cc, controller) => {
        const typography = (label) => ({
            fontUuid: label.font?._uuid ?? label.font?.uuid ?? '',
            useSystemFont: label.useSystemFont,
            fontSize: label.fontSize,
            lineHeight: label.lineHeight,
            isBold: label.isBold,
            enableOutline: label.enableOutline,
            enableShadow: label.enableShadow,
        });
        const before = [...controller.tacticDeckOptions.values()].filter((option) => option.root.active)
            .map((option) => ({ kind: option.kind, style: typography(option.titleLabel) }));
        controller.toggleTacticDeckOption('heal');
        const after = [...controller.tacticDeckOptions.values()].filter((option) => option.root.active)
            .map((option) => ({ kind: option.kind, style: typography(option.titleLabel) }));
        return { before, after };
    });

    const header = snapshots.tacticDeck;
    check(header.title.text === '选择战术卡组'
        && header.subtitle.text === '从5张战术牌中选择3张携带进入第5关',
    'level-five tactic-loadout title and subtitle are complete dynamic labels', header);
    check(header.title.rect.yMin - header.subtitle.rect.yMax >= 9
        && header.subtitle.rect.yMin - header.dividerRect.yMax >= 14,
    'the header uses title, subtitle, and lower divider rows with safe vertical gaps', {
        titleSubtitleGap: header.title.rect.yMin - header.subtitle.rect.yMax,
        subtitleDividerGap: header.subtitle.rect.yMin - header.dividerRect.yMax,
    });
    check(header.dividerRect.yMax < header.subtitle.rect.yMin
        && header.dividerRect.xMin >= header.panelRect.xMin
        && header.dividerRect.xMax <= header.panelRect.xMax,
    'the decorative divider stays below and never crosses the subtitle', {
        subtitle: header.subtitle.rect, divider: header.dividerRect,
    });
    check(header.cards.length === 5
        && header.cards.every((card) => card.rootScale[0] === card.rootScale[1]),
    'all five tactic cards are visible and use proportional scaling', header.cards);
    for (const key of ['titleTypography', 'conditionTypography', 'effectTypography', 'costTypography', 'cooldownTypography']) {
        const reference = JSON.stringify(header.cards[0][key]);
        check(header.cards.every((card) => JSON.stringify(card[key]) === reference),
            `all five tactic cards share identical ${key} parameters`, header.cards.map((card) => ({ kind: card.kind, value: card[key] })));
    }
    check(header.cards.every((card) => !card.titleTypography.useSystemFont
        && !card.conditionTypography.useSystemFont && !card.effectTypography.useSystemFont
        && !card.costTypography.useSystemFont && !card.cooldownTypography.useSystemFont),
    'no tactic-card text falls back to a system font', header.cards);
    check(JSON.stringify(snapshots.tacticToggleTypography.before)
        === JSON.stringify(snapshots.tacticToggleTypography.after),
    'selection and cancellation do not alter tactic-card typography', snapshots.tacticToggleTypography);
    check(header.cards.every((card) => contains(card.cardRect, card.titleRect)
        && contains(card.cardRect, card.conditionRect) && contains(card.cardRect, card.effectRect)
        && contains(card.cardRect, card.costRect) && contains(card.cardRect, card.cooldownRect)),
    'all five tactic-card text regions remain inside their card safe areas', header.cards);
    check(contains(header.panelRect, header.hintRect) && contains(header.panelRect, header.buttonRect),
        'selection count and start button remain inside the parchment panel', header);

    await page.setViewportSize({ width: 1600, height: 720 });
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.join(outputDir, 'tactic_loadout_level05_1600x720.png'), fullPage: true });
    snapshots.wide = await withController((_cc, controller) => ({
        panelActive: controller.tacticDeckPanel.active,
        cardScales: [...controller.tacticDeckOptions.values()].filter((option) => option.root.active)
            .map((option) => [option.kind, option.root.scale.x, option.root.scale.y]),
    }));
    check(snapshots.wide.panelActive
        && snapshots.wide.cardScales.every((entry) => entry[1] === entry[2]),
    '1600x720 landscape simulation keeps the loadout layout proportional', snapshots.wide);

    await page.setViewportSize({ width: 844, height: 390 });
    await withController((_cc, controller) => {
        controller.tacticDeckPanel.active = false;
        controller.currentLevel = 5;
        controller.showLevelSelect();
        controller.selectLevel(5);
    });
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.join(outputDir, 'level_select_level05_844x390.png'), fullPage: true });
    snapshots.ultrawide = await withController((cc, controller) => {
        const rect = controller.levelSelectContent.getComponent(cc.UITransform).getBoundingBoxToWorld();
        return { active: controller.levelSelectPanel.active, width: rect.width, height: rect.height };
    });
    check(snapshots.ultrawide.active && snapshots.ultrawide.width > 0 && snapshots.ultrawide.height > 0,
        '844x390 wide-phone simulation keeps the level-select panel rendered', snapshots.ultrawide);

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
fs.writeFileSync(path.join(outputDir, 'level05_ui02_runtime_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
