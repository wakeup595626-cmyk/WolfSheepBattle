import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERSION = 'v1.3.0-dev-polish08-ui18-help01';
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const source = read('assets', 'scripts', 'GameController.ts');
const audio = read('assets', 'scripts', 'AudioManager.ts');
const artConfig = read('assets', 'scripts', 'art', 'ArtPilotConfig.ts');
const releaseDoc = read('RELEASE_IDENTITY.md');
const releaseJson = JSON.parse(read('tools', 'release', 'release_identity.json'));
const webBuildConfig = JSON.parse(read('tools', 'qa', 'polish08_ui18_help01_web_build_config.json'));
const wechatBuildConfig = JSON.parse(read('tools', 'qa', 'polish08_ui18_help01_wechat_build_config.json'));
const checks = [];
const check = (passed, name, details = undefined) => checks.push({ passed: Boolean(passed), name, details });
const sliceMethod = (name, nextName) => {
    const start = source.indexOf(`private ${name}`);
    const end = nextName ? source.indexOf(`private ${nextName}`, start + 1) : source.length;
    return start >= 0 && end > start ? source.slice(start, end) : '';
};

const expectedTierRgb = {
    Small: [74, 177, 238],
    Medium: [54, 190, 134],
    Large: [161, 99, 224],
    Giant: [239, 174, 47],
};
const tierEntries = Object.entries(expectedTierRgb).map(([type, rgb]) => ({
    type,
    rgb,
    present: source.includes(`[SheepType.${type}]: {`)
        && source.includes(`accentColor: new Color(${rgb.join(', ')}, 255)`),
}));
check(tierEntries.every((entry) => entry.present)
    && new Set(tierEntries.map((entry) => entry.rgb.join(','))).size === 4,
    'tier/four-unique-expected-accent-colors', tierEntries);

const cardAccent = sliceMethod('drawUnitCardTierAccent(', 'orderUnitCardChildren(');
check(cardAccent.includes('UNIT_TIER_VISUALS[type].accentColor')
    && cardAccent.includes('tierAccent.r') && cardAccent.includes('tierAccent.g')
    && cardAccent.includes('tierAccent.b'),
    'tier/unit-card-accent-directly-reads-unit-tier-visuals');
const badge = sliceMethod('drawTierBadge(', 'createGraphicsNode(');
check(badge.includes('const tier = UNIT_TIER_VISUALS[type]')
    && badge.includes('graphics.fillColor = tier.accentColor'),
    'tier/battle-badge-uses-same-accent-source');
const legend = sliceMethod('createUnitTierLegend(', 'pauseGame(');
check(legend.includes('const tier = UNIT_TIER_VISUALS[type]')
    && legend.includes('rowGraphics.strokeColor = tier.accentColor')
    && legend.includes('this.drawTierBadge(')
    && !legend.includes("'Roman'"),
    'tier/help-legend-uses-same-source-without-roman-primary-visual');

const bgmRoles = ['BgmSectionTitle', 'BgmSectionHint', 'BgmCardTitle', 'BgmCardBody', 'BgmCardState'];
const typographyStart = source.indexOf('const TARGET_TYPOGRAPHY_STYLES');
const typographyEnd = source.indexOf('const LEVELS:', typographyStart);
const typography = source.slice(typographyStart, typographyEnd);
check(bgmRoles.every((role) => {
    const start = typography.indexOf(`${role}: {`);
    const end = typography.indexOf('\n    },', start);
    const block = typography.slice(start, end);
    return start >= 0 && block.includes('overflow: Label.Overflow.CLAMP')
        && !block.includes('Label.Overflow.SHRINK');
}), 'bgm/all-target-typography-roles-use-fixed-size-clamp', bgmRoles);
const createBgmSelector = sliceMethod('createBgmTrackSelector(', 'createBgmStyleOption(');
const createBgmOption = sliceMethod('createBgmStyleOption(', 'selectBgmStyleFromUi(');
check(createBgmSelector.includes('for (let index = 0; index < tracks.length; index += 1)')
    && createBgmSelector.includes('this.createBgmStyleOption(')
    && ['BgmCardTitle', 'BgmCardBody', 'BgmCardState'].every((role) =>
        createBgmOption.includes(`this.applyTargetTypography(${role === 'BgmCardTitle' ? 'titleLabel'
            : role === 'BgmCardBody' ? 'subtitleLabel' : 'statusLabel'}, '${role}')`)),
    'bgm/two-cards-share-one-layout-and-typography-factory');
check(audio.includes("displayName: '轻松欢快'")
    && audio.includes("subtitle: '温暖、治愈、轻松的草原旋律'")
    && audio.includes("displayName: '热血对战'")
    && audio.includes("subtitle: '节奏明快、适合激烈对抗'"),
    'bgm/runtime-copy-is-exact-and-source-credit-is-not-ui-copy');

check(!source.includes('this.drawModalBackground(this.helpPanel')
    && !source.includes('this.drawModalBackground(this.replayLevelOneTutorialConfirmPanel')
    && source.includes("this.applyFormalPaperModalArt(this.helpContent, 'HelpPanelArt'")
    && artConfig.includes("HelpPanel = 'help-panel'")
    && artConfig.includes("define(ArtPilotResourceKey.HelpPanel,"),
    'help/formal-paper-art-replaces-deep-blue-modal');
check(source.includes('this.pausePanel.active = false;\n        this.refreshHelpText();')
    && source.includes('this.helpPanel.active = false;\n        if (this.isPaused)')
    && source.includes('this.showModal(this.pausePanel);')
    && source.includes("this.currentLevel === 1 && this.isPaused")
    && source.includes('this.showModal(this.replayLevelOneTutorialConfirmPanel)')
    && source.includes('this.cancelLevelOneTutorialReplay()')
    && source.includes('this.confirmLevelOneTutorialReplay()'),
    'help/return-and-replay-behavior-retained');
check(source.includes('this.helpBackButton.node.setPosition(showReplay ? 145 : 0, HELP_ACTION_Y, 0)'),
    'help/back-button-centers-when-replay-is-hidden');
check(source.includes("this.currentLevel === 4") && source.includes("this.currentLevel === 5")
    && source.includes("this.currentLevel === 6")
    && source.includes('this.helpTextLabel.fontSize = 17;')
    && source.includes('this.helpTextLabel.lineHeight = 21;'),
    'help/level-4-5-6-copy-and-fixed-typography-retained');

check(source.includes(`const GAME_VERSION = '${VERSION}';`)
    && source.includes(`const DEVELOPMENT_BATCH = '${VERSION}';`)
    && source.includes(`const REQUESTED_TASK_ID = '${VERSION}';`)
    && releaseJson.developmentVersion === VERSION && releaseJson.auditBatch === VERSION
    && (releaseDoc.match(new RegExp(VERSION.replaceAll('.', '\\.'), 'g')) ?? []).length === 3,
    'release/three-version-identities-are-consistent', releaseJson);

check(webBuildConfig.platform === 'web-mobile'
    && webBuildConfig.outputName === 'web-mobile-polish08-ui18-help01-final'
    && webBuildConfig.debug === false && webBuildConfig.sourceMaps === false
    && wechatBuildConfig.platform === 'wechatgame'
    && wechatBuildConfig.outputName === 'wechatgame-polish08-ui18-help01-final'
    && wechatBuildConfig.debug === false && wechatBuildConfig.sourceMaps === false
    && wechatBuildConfig.packages?.wechatgame?.appid === 'wxfbd176abc5b3911c'
    && wechatBuildConfig.packages?.wechatgame?.orientation === 'landscapeRight',
    'release/dedicated-build-configs-are-production-safe', { webBuildConfig, wechatBuildConfig });

const listFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
});
const webOutput = path.join(ROOT, 'build', webBuildConfig.outputName);
const wechatOutput = path.join(ROOT, 'build', wechatBuildConfig.outputName);
const inspectBuildOutput = (directory) => {
    if (!fs.existsSync(directory)) return { exists: false, directory };
    const files = listFiles(directory);
    return {
        exists: true,
        directory,
        fileCount: files.length,
        sourceMapCount: files.filter((file) => file.endsWith('.map')).length,
        versionHits: files.filter((file) => fs.readFileSync(file).includes(Buffer.from(VERSION))).length,
    };
};
const webArtifact = inspectBuildOutput(webOutput);
const wechatArtifact = inspectBuildOutput(wechatOutput);
const builtWechatProject = JSON.parse(fs.readFileSync(path.join(wechatOutput, 'project.config.json'), 'utf8'));
const builtWechatGame = JSON.parse(fs.readFileSync(path.join(wechatOutput, 'game.json'), 'utf8'));
check(webArtifact.exists && webArtifact.fileCount > 0 && webArtifact.sourceMapCount === 0
    && webArtifact.versionHits > 0
    && wechatArtifact.exists && wechatArtifact.fileCount > 0 && wechatArtifact.sourceMapCount === 0
    && wechatArtifact.versionHits > 0
    && builtWechatProject.appid === 'wxfbd176abc5b3911c'
    && builtWechatProject.compileType === 'game'
    && builtWechatGame.deviceOrientation === 'landscapeRight',
    'release/fresh-build-artifacts-match-version-appid-orientation-and-no-sourcemaps', {
        webArtifact,
        wechatArtifact,
        wechatProject: {
            appid: builtWechatProject.appid,
            compileType: builtWechatProject.compileType,
            projectname: builtWechatProject.projectname,
        },
        deviceOrientation: builtWechatGame.deviceOrientation,
    });

const cardAssets = Object.keys(expectedTierRgb).map((type) => type.toLowerCase()).flatMap((type) => [
    {
        kind: 'master',
        file: path.join(ROOT, 'art_source', 'game_ui', 'unit_cards', 'card02',
            `unit_card_${type}_integrated_master_v02.png`),
        expectedWidth: 2060,
        expectedHeight: 900,
    },
    {
        kind: 'runtime',
        file: path.join(ROOT, 'assets', 'bundles', 'art_units', 'ui', 'unit_cards', type,
            `unit_card_${type}_integrated_runtime_v02.png`),
        expectedWidth: 1030,
        expectedHeight: 450,
    },
]);
const inspectPng = (asset) => {
    if (!fs.existsSync(asset.file)) return { ...asset, exists: false };
    const buffer = fs.readFileSync(asset.file);
    const signature = buffer.subarray(0, 8).toString('hex');
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const colorType = buffer[25];
    return { ...asset, exists: true, signature, width, height, colorType,
        hasSrgb: buffer.includes(Buffer.from('sRGB')), hasMeta: asset.kind === 'master'
            || fs.existsSync(`${asset.file}.meta`) };
};
const pngResults = cardAssets.map(inspectPng);
check(pngResults.every((item) => item.exists && item.signature === '89504e470d0a1a0a'
    && item.width === item.expectedWidth && item.height === item.expectedHeight
    && item.colorType === 6 && item.hasMeta),
    'assets/card-master-runtime-png-rgba-and-meta', pngResults);

const report = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
        total: checks.length,
        passed: checks.filter((item) => item.passed).length,
        failed: checks.filter((item) => !item.passed).length,
    },
    checks,
};
console.log(JSON.stringify(report, null, 2));
if (report.summary.failed > 0) process.exitCode = 1;
