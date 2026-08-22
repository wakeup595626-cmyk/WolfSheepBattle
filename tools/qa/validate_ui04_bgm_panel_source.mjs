import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(process.argv[2] ?? '.');
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(projectRoot, relativePath));

const controller = read('assets/scripts/GameController.ts');
const releaseIdentity = JSON.parse(read('tools/release/release_identity.json'));
const reportIdentity = read('RELEASE_IDENTITY.md');

const optionBody = controller.slice(
    controller.indexOf('private createBgmStyleOption('),
    controller.indexOf('private refreshBgmTrackSelector()'),
);
const refreshBody = controller.slice(
    controller.indexOf('private refreshBgmTrackSelector()'),
    controller.indexOf('private resumeGame()'),
);
const prepareBody = controller.slice(
    controller.indexOf('private async preparePauseArt()'),
    controller.indexOf('private applyVolumeControlArt('),
);

const assertions = {
    versionAdvancedToUi04: /GAME_VERSION = 'v1\.3\.0-dev-ui04'/.test(controller)
        && releaseIdentity.developmentVersion === 'v1.3.0-dev-ui04'
        && releaseIdentity.auditBatch === 'v1.3.0-dev-ui04'
        && reportIdentity.includes('v1.3.0-dev-ui04'),
    selectorGeometryExpanded: /PAUSE_BGM_ROW_HEIGHT = 210/.test(controller)
        && /createBgmTrackSelector\(this\.pauseContentRoot, -28\)/.test(controller)
        && /'MusicVolume',[\s\S]*?-166/.test(controller)
        && /'SfxVolume',[\s\S]*?-230/.test(controller),
    equalFormalCards: /BgmStyle_\$\{track\.id\}`, 400, 68/.test(optionBody)
        && /setContentSize\(400, 68\)/.test(optionBody)
        && /index === 0 \? 24 : -54/.test(controller),
    safeCardSpacing: 78 - 68 === 10,
    fixedThreeColumnText: /'Title',[\s\S]*?-10, 18, 236, 22, 18/.test(optionBody)
        && /'Subtitle',[\s\S]*?-10, 0, 236, 18, 14/.test(optionBody)
        && /'Auxiliary',[\s\S]*?-10, -18, 236, 16, 12/.test(optionBody)
        && /'Status',[\s\S]*?156, -12, 66, 20, 13/.test(optionBody)
        && /'SelectedCheck', 22, 22, 178, 17/.test(optionBody),
    formalRuntimeArtReused: prepareBody.includes('ArtPilotResourceKey.LevelCardUnlocked')
        && prepareBody.includes('ArtPilotResourceKey.LevelCardSelected')
        && prepareBody.includes("'CardBackgroundSprite'")
        && prepareBody.includes("'CardMusicIconSprite'")
        && exists('assets/bundles/art_ui/ui/level_select/v06/level_card_unlocked_runtime_v06.png')
        && exists('assets/bundles/art_ui/ui/level_select/v06/level_card_selected_runtime_v06.png')
        && exists('assets/bundles/art_ui/ui/common/audio/music_icon_runtime_v01.png'),
    selectedStateUsesFormalFrame: refreshBody.includes('option.backgroundSprite.spriteFrame = formalFrame')
        && refreshBody.includes("option.statusLabel.string = selected ? '当前使用' : '点击试听'")
        && refreshBody.includes('option.checkNode.active = selected'),
    exactTouchBounds: /touchArea\.addComponent\(UITransform\)\.setContentSize\(400, 68\)/.test(optionBody),
    singleTouchListenerRegistration: (optionBody.match(/touchArea\.on\(NodeEventType\.TOUCH_END/g) ?? []).length === 1,
    audioSelectionFlowPreserved: optionBody.includes('this.audioManager.activateAudio()')
        && optionBody.includes('this.audioManager.selectBgmTrack(track.id)')
        && optionBody.includes("this.audioManager.playSfx('ui_click')"),
    obsoleteArtDestroyedNotHidden: prepareBody.includes("getChildByName('BgmSelectorPanelArt')")
        && prepareBody.includes('obsoleteSelectorArt.removeFromParent()')
        && prepareBody.includes('obsoleteSelectorArt.destroy()')
        && !prepareBody.includes('obsoleteSelectorArt.opacity'),
    formalFontStillPresent: exists('assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf'),
    formalBuildConfigs: (() => {
        const web = JSON.parse(read('tools/qa/ui04_web_build_config.json'));
        const wechat = JSON.parse(read('tools/qa/ui04_wechat_build_config.json'));
        return web.debug === false && web.sourceMaps === false
            && wechat.debug === false && wechat.sourceMaps === false
            && wechat.packages?.wechatgame?.appid === 'wxfbd176abc5b3911c';
    })(),
};

const result = {
    batch: 'v1.3.0-dev-ui04',
    assertions,
    passed: Object.values(assertions).every(Boolean),
};

console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
