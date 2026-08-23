import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERSION = 'v1.3.0-dev-polish09-ui19-perf01-loading01';
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const source = read('assets', 'scripts', 'GameController.ts');
const audio = read('assets', 'scripts', 'AudioManager.ts');
const releaseDoc = read('RELEASE_IDENTITY.md');
const releaseJson = JSON.parse(read('tools', 'release', 'release_identity.json'));
const webConfig = JSON.parse(read('tools', 'qa', 'polish09_ui19_perf01_loading01_web_build_config.json'));
const wechatConfig = JSON.parse(read('tools', 'qa', 'polish09_ui19_perf01_loading01_wechat_build_config.json'));
const checks = [];
const check = (passed, name, details = undefined) => checks.push({ passed: Boolean(passed), name, details });
const method = (name, nextName) => {
    const start = source.indexOf(`private ${name}`);
    const end = nextName ? source.indexOf(`private ${nextName}`, start + 1) : source.length;
    return start >= 0 && end > start ? source.slice(start, end) : '';
};

check(source.includes(`const GAME_VERSION = '${VERSION}';`)
    && source.includes(`const DEVELOPMENT_BATCH = '${VERSION}';`)
    && source.includes(`const REQUESTED_TASK_ID = '${VERSION}';`)
    && releaseJson.developmentVersion === VERSION && releaseJson.auditBatch === VERSION
    && (releaseDoc.match(new RegExp(VERSION.replaceAll('.', '\\.'), 'g')) ?? []).length === 3,
    'release/three-version-identities-match', releaseJson);

const pauseCreate = method('createPauseControls(', 'createUnitTierLegend(');
const pausePrepare = method('preparePauseArt(', 'applyVolumeControlArt(');
const backdrop = method('drawModalBackdropOnly(', 'showModal(');
check(!source.includes("'PausePanelShadow'") && !source.includes("'PausePanelFinish'")
    && !source.includes('drawPausePanelFinish(')
    && source.includes('pauseContentGraphics.clear();') && source.includes('pauseContentGraphics.enabled = false;')
    && source.includes("this.applyChildSprite(this.pauseContent, 'PausePanelArt'")
    && source.includes("private drawModalBackdropOnly(panel: Node): void")
    && backdrop.includes("'FullscreenBackdrop'") && backdrop.includes('BlockInputEvents'),
    'pause/programmatic-ghost-layers-removed-formal-art-and-backdrop-retained');

const typography = source.slice(source.indexOf('const TARGET_TYPOGRAPHY_STYLES'), source.indexOf('const LEVELS:'));
const typographyRole = (role) => {
    const start = typography.indexOf(`${role}: {`);
    const end = typography.indexOf('\n    },', start);
    return typography.slice(start, end);
};
const expectedTypography = {
    BgmSectionTitle: [22, true], BgmSectionHint: [14, false], BgmCardTitle: [18, true],
    BgmCardBody: [14, false], BgmCardState: [13, true],
};
check(Object.entries(expectedTypography).every(([role, [size, bold]]) => {
    const block = typographyRole(role);
    return block.includes(`fontSize: ${size}`) && block.includes(`isBold: ${bold}`)
        && block.includes('overflow: Label.Overflow.CLAMP') && !block.includes('Label.Overflow.SHRINK');
}), 'bgm/fixed-size-weight-clamp-typography', expectedTypography);
const bgmCreate = method('createBgmTrackSelector(', 'createBgmStyleOption(');
const bgmOption = method('createBgmStyleOption(', 'selectBgmStyleFromUi(');
const fontLoader = method('loadFormalUiFont(', 'applyResponsiveLandscapeLayout(');
check(source.includes('this.createBgmStyleOption(')
    && source.includes('PAUSE_BGM_CARD_WIDTH, PAUSE_BGM_CARD_HEIGHT, x, y, parent')
    && ['BgmCardTitle', 'BgmCardBody', 'BgmCardState'].every((role) => source.includes(`'${role}'`))
    && source.includes("'ui/fonts/ui_font_cn_subset_runtime_ui05_regular'")
    && source.includes('for (const [label, role] of this.targetTypographyBindings)')
    && audio.includes("displayName: '轻松欢快'") && audio.includes("displayName: '热血对战'")
    && !audio.includes("displayName: '热血对抗'")
    && !source.includes('Ear0 · 欢乐') && !source.includes('Pixabay · Fun Game'),
    'bgm/shared-card-factory-single-async-rebound-font-and-copy-retained');

const tierColors = {
    Small: [74, 177, 238], Medium: [54, 190, 134], Large: [161, 99, 224], Giant: [239, 174, 47],
};
check(Object.entries(tierColors).every(([type, rgb]) => source.includes(
    `[SheepType.${type}]: {`) && source.includes(`accentColor: new Color(${rgb.join(', ')}, 255)`)),
    'tier/frozen-blue-green-purple-orange-values', tierColors);
const cardAccent = method('drawUnitCardTierAccent(', 'orderUnitCardChildren(');
const badge = method('drawTierBadge(', 'createGraphicsNode(');
const legend = method('createUnitTierLegend(', 'pauseGame(');
check(cardAccent.includes('UNIT_TIER_VISUALS[type].accentColor')
    && cardAccent.includes('mixWithCream(0.18') && cardAccent.includes('mixWithCream(0.36')
    && cardAccent.includes('Math.max(3.5, 4 * scale)')
    && cardAccent.includes('statePanelLeft') && cardAccent.includes('graphics.fill()')
    && badge.includes('const tier = UNIT_TIER_VISUALS[type]') && badge.includes('graphics.fillColor = tier.accentColor')
    && legend.includes('const tier = UNIT_TIER_VISUALS[type]') && legend.includes('rowGraphics.strokeColor = tier.accentColor'),
    'tier/cards-badges-help-use-one-source-and-card-has-dominant-surfaces');
const orderCards = method('orderUnitCardChildren(', 'getUnitCardVisualState(');
check(orderCards.indexOf('button.artSprite.node.setSiblingIndex') < orderCards.indexOf('button.tierAccentGraphics.node.setSiblingIndex')
    && orderCards.indexOf('button.tierAccentGraphics.node.setSiblingIndex') < orderCards.indexOf('button.label.node.setSiblingIndex')
    && orderCards.indexOf('button.tierAccentGraphics.node.setSiblingIndex') < orderCards.indexOf('button.stateLabel.node.setSiblingIndex'),
    'tier/type-surface-above-art-and-below-text');

const healthUpdate = method('updateUnitHealthBarDisplay(', 'drawSheepUnit(');
const depthUpdate = method('updateUnitDepthOrder(', 'createImpactSpark(');
check(source.includes('lastRenderedHealthRatio: number;')
    && source.includes('lastRenderedHealthRatio: Number.NaN')
    && source.includes('unit.lastRenderedHealthRatio = Number.NaN;')
    && healthUpdate.includes('UNIT_HEALTH_RENDER_RATIO_EPSILON')
    && healthUpdate.includes('Math.abs(displayRatio - unit.lastRenderedHealthRatio)')
    && healthUpdate.includes('unit.healthFillNode.setScale(displayRatio, 1, 1)')
    && healthUpdate.includes('unit.lastRenderedHealthRatio = displayRatio'),
    'perf/health-scale-write-is-ratio-change-gated-with-spawn-and-pool-reset');
check(depthUpdate.includes('orderedUnits.sort(') && depthUpdate.includes('node.siblingIndex !== index')
    && depthUpdate.includes('node.setSiblingIndex(index)')
    && !source.includes('tween(unit.healthNode)') && !source.includes('schedule(unit.healthNode'),
    'perf/depth-write-is-order-change-gated-and-health-ui-has-no-delayed-follow');

const loadingCreate = method('createArtLoadingPanel(', 'createAudioUnlockHint(');
const loadingTrackAt = loadingCreate.indexOf("'LoadingProgressTrackFallback'");
const loadingFrameAt = loadingCreate.indexOf("'LoadingProgressFrameArt'");
const loadingFillAt = loadingCreate.indexOf("'LoadingProgressFill'");
const loadingProgress = method('updateArtLoadingProgress(', 'finishArtLoading(');
const loadingPresent = method('updateArtLoadingPresentation(', 'applyArtLoadingVisualProgress(');
check(loadingTrackAt >= 0 && loadingTrackAt < loadingFrameAt && loadingFrameAt < loadingFillAt
    && loadingCreate.includes('LOADING_PROGRESS_WIDTH, 26')
    && !loadingCreate.includes('loadingProgressFillFrame'),
    'loading/track-opaque-frame-then-single-slot-constrained-fill-layer-order');
check(loadingProgress.includes('actualRatio >= 1 ? 0.98 : actualRatio')
    && loadingProgress.includes('Math.max(this.artLoadingTargetProgress, visibleTarget)')
    && loadingPresent.includes('Math.exp(-LOADING_PROGRESS_SMOOTHING * safeDelta)')
    && source.includes('(completed, total) => this.updateArtLoadingProgress(completed, total)')
    && source.includes('retryFailed((completed, total) =>')
    && source.includes('this.startArtLoadingFade()'),
    'loading/real-callback-monotonic-098-retry-smoothing-and-fade-retained');

check(webConfig.platform === 'web-mobile' && webConfig.debug === false && webConfig.sourceMaps === false
    && webConfig.outputName === 'web-mobile-polish09-ui19-perf01-loading01-final'
    && wechatConfig.platform === 'wechatgame' && wechatConfig.debug === false && wechatConfig.sourceMaps === false
    && wechatConfig.outputName === 'wechatgame-polish09-ui19-perf01-loading01-final'
    && wechatConfig.packages?.wechatgame?.appid === 'wxfbd176abc5b3911c'
    && wechatConfig.packages?.wechatgame?.orientation === 'landscapeRight',
    'build/dedicated-production-safe-web-and-wechat-configs', { webConfig, wechatConfig });

const listFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
});
const inspectBuild = (outputName) => {
    const directory = path.join(ROOT, 'build', outputName);
    if (!fs.existsSync(directory)) return { exists: false, directory };
    const files = listFiles(directory);
    return { exists: true, directory, fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + fs.statSync(file).size, 0),
        latestMtime: Math.max(...files.map((file) => fs.statSync(file).mtimeMs)),
        sourceMapCount: files.filter((file) => file.endsWith('.map')).length,
        versionHits: files.filter((file) => fs.readFileSync(file).includes(Buffer.from(VERSION))).length };
};
const webBuild = inspectBuild(webConfig.outputName);
const wechatBuild = inspectBuild(wechatConfig.outputName);
let wechatProject;
let wechatGame;
if (wechatBuild.exists) {
    wechatProject = JSON.parse(read('build', wechatConfig.outputName, 'project.config.json'));
    wechatGame = JSON.parse(read('build', wechatConfig.outputName, 'game.json'));
}
check(webBuild.exists && webBuild.fileCount > 0 && webBuild.sourceMapCount === 0 && webBuild.versionHits > 0
    && wechatBuild.exists && wechatBuild.fileCount > 0 && wechatBuild.sourceMapCount === 0 && wechatBuild.versionHits > 0
    && wechatProject?.appid === 'wxfbd176abc5b3911c' && wechatProject?.compileType === 'game'
    && wechatGame?.deviceOrientation === 'landscapeRight',
    'build/fresh-artifacts-version-appid-orientation-and-no-maps', { webBuild, wechatBuild, wechatProject, wechatGame });

const report = { version: VERSION, generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.filter((item) => item.passed).length,
        failed: checks.filter((item) => !item.passed).length }, checks, builds: { web: webBuild, wechat: wechatBuild } };
console.log(JSON.stringify(report, null, 2));
if (report.summary.failed > 0) process.exitCode = 1;
