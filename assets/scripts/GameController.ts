import {
    _decorator,
    AudioClip,
    BlockInputEvents,
    Canvas,
    Color,
    Component,
    EventTouch,
    Font,
    game,
    Game,
    Graphics,
    HorizontalTextAlignment,
    Label,
    LabelOutline,
    Mask,
    Node,
    NodeEventType,
    Rect,
    Size,
    Sprite,
    SpriteFrame,
    UIOpacity,
    UITransform,
    Vec2,
    Vec3,
    VerticalTextAlignment,
    tween,
    Tween,
    sys,
} from 'cc';
import { AudioManager, BgmTrackConfig, BgmTrackId } from './AudioManager';
import {
    ART_PILOT_BATCH,
    ART_PILOT_ENABLED,
    ART_FULL_ENABLED,
    ART_RENDER_MODE,
    BATTLEFIELD_VISUAL_MODE,
    ART_PILOT_LANE_INDEX,
    ArtPilotResourceKey,
    ArtResourceGroup,
    FULL_UNIT_SPRITE_SIZE,
    PILOT_MOVE_DUST_INTERVAL,
    PILOT_UNIT_DEATH_VISUAL_SECONDS,
    PILOT_UNIT_SPRITE_SIZE,
    PILOT_VFX_MAX_ACTIVE,
    PILOT_VFX_POOL_LIMIT,
} from './art/ArtPilotConfig';
import { ArtResourceManager } from './art/ArtResourceManager';
import { UnitSpriteAnimator } from './art/UnitSpriteAnimator';
import { VfxSpriteAnimator } from './art/VfxSpriteAnimator';
import { LandscapeLayoutMetrics, LandscapeScreenAdapter } from './ui/LandscapeScreenAdapter';
import { WeChatShareManager } from './WeChatShareManager';

const { ccclass, property } = _decorator;

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
const GAME_NAME = '羊狼四线战';
const GAME_VERSION = 'v1.3.0-dev-tutorial05-ui09';
const DEVELOPMENT_BATCH = 'v1.3.0-dev-tutorial05-ui09';
const REQUESTED_TASK_ID = 'v1.3.0-dev-tutorial05-ui09';
const BATTLEFIELD_CENTER_X = -90;
const LANE_SPACING = 270;
const LANE_X = [
    BATTLEFIELD_CENTER_X - LANE_SPACING * 1.5,
    BATTLEFIELD_CENTER_X - LANE_SPACING * 0.5,
    BATTLEFIELD_CENTER_X + LANE_SPACING * 0.5,
    BATTLEFIELD_CENTER_X + LANE_SPACING * 1.5,
];
const LANE_WIDTH = 180;
const LANE_BOTTOM_Y = -245;
const LANE_TOP_Y = 270;
const LANE_LENGTH = LANE_TOP_Y - LANE_BOTTOM_Y;
const PLAYER_BASE_Y = -270;
const AI_BASE_Y = 288;
const HUD_SAFE_MARGIN = 12;
const TOP_HUD_Y = 308;
const AI_HUD_Y = TOP_HUD_Y;
const PLAYER_HUD_Y = -284;
const BASE_BAR_HEIGHT = 48;
const HUD_BASE_BAR_WIDTH = 400;
const PLAYER_RESOURCE_BADGE_WIDTH = 170;
const PLAYER_RESOURCE_BADGE_HEIGHT = 44;
const ENERGY_BAR_WIDTH = 300;
const ENERGY_BAR_HEIGHT = 44;
const ENERGY_BAR_ICON_BOX_WIDTH = 30;
// The formal AI and player frames have slightly different transparent openings.
// A shared track covers both openings while the fill stays inside the narrower
// player opening, so both factions use exactly the same effective meter geometry.
const ENERGY_BAR_TRACK_LEFT = -106;
const ENERGY_BAR_TRACK_WIDTH = 240;
const ENERGY_BAR_TRACK_HEIGHT = 30;
const ENERGY_BAR_TRACK_CENTER_Y = -1;
const ENERGY_BAR_FILL_LEFT = -102;
const ENERGY_BAR_FILL_WIDTH = 228;
const ENERGY_BAR_FILL_HEIGHT = 20;
const ENERGY_BAR_FILL_CENTER_Y = -1;
const ENERGY_BAR_ICON_X = -126;
const ENERGY_BAR_LABEL_X = 16;
const ENERGY_BAR_LABEL_WIDTH = 222;
const HUD_RESOURCE_GAP = 14;
const BATTLE_HUD_COLUMNS = {
    supply: {
        centerX: BATTLEFIELD_CENTER_X - HUD_BASE_BAR_WIDTH / 2 - HUD_RESOURCE_GAP - PLAYER_RESOURCE_BADGE_WIDTH / 2,
        width: PLAYER_RESOURCE_BADGE_WIDTH,
        height: PLAYER_RESOURCE_BADGE_HEIGHT,
    },
    base: {
        centerX: BATTLEFIELD_CENTER_X,
        width: HUD_BASE_BAR_WIDTH,
        height: BASE_BAR_HEIGHT,
    },
    energy: {
        centerX: BATTLEFIELD_CENTER_X + HUD_BASE_BAR_WIDTH / 2 + HUD_RESOURCE_GAP + ENERGY_BAR_WIDTH / 2,
        width: ENERGY_BAR_WIDTH,
        height: ENERGY_BAR_HEIGHT,
    },
} as const;
const FUNCTION_SIDEBAR_WIDTH = 216;
const FUNCTION_SIDEBAR_X = DESIGN_WIDTH / 2 - HUD_SAFE_MARGIN - FUNCTION_SIDEBAR_WIDTH / 2;
const TACTIC_HEADER_HEIGHT = 36;
const PAUSE_BUTTON_WIDTH = FUNCTION_SIDEBAR_WIDTH;
const PAUSE_BUTTON_HEIGHT = 54;
const PAUSE_BUTTON_X = 0;
const PAUSE_BUTTON_Y = TOP_HUD_Y - BASE_BAR_HEIGHT / 2
    - HUD_SAFE_MARGIN - PAUSE_BUTTON_HEIGHT / 2;
const PAUSE_TACTIC_VERTICAL_GAP = 15;
const WECHAT_CAPSULE_SAFE_GAP_PHYSICAL_PX = 14;
const LEVEL_BADGE_WIDTH = 116;
const LEVEL_BADGE_HEIGHT = 58;
const LEVEL_BADGE_CONTENT_WIDTH = 84;
const LEVEL_BADGE_CONTENT_HEIGHT = 42;
const LEVEL_BADGE_X = -DESIGN_WIDTH / 2 + HUD_SAFE_MARGIN + LEVEL_BADGE_WIDTH / 2;
const LEVEL_BADGE_Y = TOP_HUD_Y;
const PAUSE_PANEL_WIDTH = 760;
const PAUSE_PANEL_HEIGHT = 650;
const PAUSE_PANEL_ART_WIDTH = 740;
const PAUSE_CONTENT_ROOT_WIDTH = 430;
const PAUSE_CONTENT_ROOT_HEIGHT = 548;
const PAUSE_ACTION_BUTTON_WIDTH = 204;
const PAUSE_ACTION_BUTTON_HEIGHT = 46;
const PAUSE_ACTION_COLUMN_X = 107;
const PAUSE_SETTINGS_ROW_WIDTH = 430;
const PAUSE_BGM_ROW_HEIGHT = 210;
const PAUSE_VOLUME_ROW_HEIGHT = 56;
const TACTIC_HEADER_Y = PAUSE_BUTTON_Y - PAUSE_BUTTON_HEIGHT / 2
    - PAUSE_TACTIC_VERTICAL_GAP - TACTIC_HEADER_HEIGHT / 2;
const TACTIC_CARD_HEIGHT = 124;
const TACTIC_CARD_GAP = 9;
const TACTIC_CARD_TOP_HEIGHT = 88;
const TACTIC_CARD_BOTTOM_HEIGHT = 36;
const TACTIC_CARD_DIVIDER_Y = -TACTIC_CARD_HEIGHT / 2 + TACTIC_CARD_BOTTOM_HEIGHT;
const TACTIC_ICON_CELL_WIDTH = 68;
const TACTIC_TEXT_CELL_WIDTH = 136;
const TACTIC_TOP_CELL_HEIGHT = 80;
const TACTIC_COST_CELL_WIDTH = 60;
const TACTIC_META_CELL_WIDTH = 56;
const TACTIC_STATE_CELL_WIDTH = 84;
const TACTIC_BOTTOM_CELL_HEIGHT = 28;
const TACTIC_BOTTOM_CELL_GAP = 4;
const TACTIC_BOTTOM_INNER_LEFT = -104;
const TACTIC_COST_CELL_X = TACTIC_BOTTOM_INNER_LEFT + TACTIC_COST_CELL_WIDTH / 2;
const TACTIC_META_CELL_X = TACTIC_BOTTOM_INNER_LEFT + TACTIC_COST_CELL_WIDTH
    + TACTIC_BOTTOM_CELL_GAP + TACTIC_META_CELL_WIDTH / 2;
const TACTIC_STATE_CELL_X = TACTIC_BOTTOM_INNER_LEFT + TACTIC_COST_CELL_WIDTH
    + TACTIC_BOTTOM_CELL_GAP + TACTIC_META_CELL_WIDTH + TACTIC_BOTTOM_CELL_GAP
    + TACTIC_STATE_CELL_WIDTH / 2;
const TACTIC_DYNAMIC_REFRESH_INTERVAL = 0.1;
const TACTIC_CARD_PRESS_DEBOUNCE_MS = 250;
const TACTIC_FIRST_CARD_Y = TACTIC_HEADER_Y - TACTIC_HEADER_HEIGHT / 2 - 8 - TACTIC_CARD_HEIGHT / 2;
const GLOBAL_MOVE_SPEED_MULTIPLIER = 0.8;
const START_READABILITY_PANEL_WIDTH = 720;
const START_READABILITY_PANEL_HEIGHT = 500;
const START_LEVEL_SELECT_BUTTON_WIDTH = 380;
const START_LEVEL_SELECT_BUTTON_HEIGHT = 70;
const START_LEVEL_SELECT_BUTTON_Y = -132;
const START_BATTLE_BUTTON_WIDTH = 340;
const START_BATTLE_BUTTON_HEIGHT = 58;
const START_BATTLE_BUTTON_Y = -211;
const START_LEVEL_SELECT_PULSE_SCALE = 1.035;
const START_LEVEL_SELECT_PULSE_HALF_SECONDS = 0.35;
const START_LEVEL_SELECT_PULSE_COUNT = 3;
const START_BUTTON_RELEASE_SECONDS = 0.15;
const START_BUTTON_PRESS_DEBOUNCE_MS = 300;
const STATUS_TOAST_WIDTH = 540;
const STATUS_TOAST_HEIGHT = 60;
const STATUS_TOAST_X = BATTLEFIELD_CENTER_X;
// Derived from the lower HUD baseline so the toast remains above the spawn gates
// across supported landscape aspect ratios instead of relying on a screenshot offset.
const STATUS_TOAST_Y = PLAYER_HUD_Y + BASE_BAR_HEIGHT / 2 + 112;
const STATUS_TOAST_FADE_IN_SECONDS = 0.15;
const STATUS_TOAST_HOLD_SECONDS = 1.2;
const STATUS_TOAST_FADE_OUT_SECONDS = 0.2;
const UI_TEXT_PRIMARY = new Color(86, 58, 37, 255);
const UI_TEXT_SECONDARY = new Color(107, 98, 86, 255);
const UI_TEXT_VALUE = new Color(52, 91, 62, 255);
const LOADING_BACKGROUND_ASPECT = 1600 / 720;
const LOADING_MASCOT_DISPLAY_SIZE = 236;
const LOADING_MASCOT_CENTER_Y = 30;
const LOADING_MASCOT_SHADOW_Y = -75;
const LOADING_PROGRESS_WIDTH = 452;
const LOADING_PROGRESS_SMOOTHING = 7.5;
const LOADING_FADE_SECONDS = 0.32;
const LOADING_TIP_INTERVAL_SECONDS = 2.5;
const LOADING_TIPS = [
    '小提示：选择兵种后，点击任意道路即可出兵。',
    '小提示：占领中央补给点可以获得补给。',
    '小提示：合理搭配大小单位，比一味堆兵更有效。',
    '小提示：战术牌需要满足补给或基地血量条件。',
] as const;
const LEVEL_SELECT_PANEL_WIDTH = 780;
const LEVEL_SELECT_PANEL_HEIGHT = 700;
const LEVEL_SELECT_CARD_WIDTH = 650;
const LEVEL_SELECT_CARD_HEIGHT = 112;
const LEVEL_SELECT_CARD_GAP = 12;
const LEVEL_SELECT_ITEMS_PER_PAGE = 3;
const LEVEL_SELECT_CARD_Y = [152, 28, -96] as const;
const LEVEL_SELECT_PROGRESS_WIDTH = 650;
const LEVEL_SELECT_PROGRESS_HEIGHT = 42;
const LEVEL_SELECT_PROGRESS_Y = -238;
const LEVEL_SELECT_PAGINATION_Y = -184;
const LEVEL_SELECT_PAGE_BUTTON_WIDTH = 142;
const LEVEL_SELECT_PAGE_BUTTON_HEIGHT = 46;
const LEVEL_SELECT_BACK_BUTTON_WIDTH = 230;
const LEVEL_SELECT_CONFIRM_BUTTON_WIDTH = 300;
const LEVEL_SELECT_ACTION_BUTTON_HEIGHT = 56;
const LEVEL_SELECT_BOTTOM_BUTTON_Y = -304;
const LEVEL_SELECT_MAIN_TITLE_FONT_SIZE = 36;
const LEVEL_SELECT_SUBTITLE_FONT_SIZE = 16;
const LEVEL_SELECT_CARD_TITLE_FONT_SIZE = 22;
const LEVEL_SELECT_CARD_DESCRIPTION_FONT_SIZE = 15;
const LEVEL_SELECT_CARD_STATE_FONT_SIZE = 16;
const LEVEL_SELECT_BACK_BUTTON_FONT_SIZE = 22;
const LEVEL_SELECT_CONFIRM_BUTTON_FONT_SIZE = 24;

type TargetTypographyRole =
    | 'LevelSelectMainTitle'
    | 'LevelSelectSubtitle'
    | 'LevelCardTitle'
    | 'LevelCardDescription'
    | 'LevelCardState'
    | 'LevelSelectPagination'
    | 'LevelSelectProgress'
    | 'LevelSelectProgressHint'
    | 'LevelSelectSecondaryAction'
    | 'LevelSelectPrimaryAction'
    | 'BgmSectionTitle'
    | 'BgmSectionHint'
    | 'BgmCardTitle'
    | 'BgmCardBody'
    | 'BgmCardSource'
    | 'BgmCardState'
    | 'VolumeTitle'
    | 'VolumePercent'
    | 'VolumeButton';

interface TargetTypographyStyle {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly isBold: boolean;
    readonly color: Color;
    readonly overflow: Label['overflow'];
    readonly enableWrapText: boolean;
    readonly horizontalAlign: HorizontalTextAlignment;
    readonly verticalAlign: VerticalTextAlignment;
    readonly enableOutline?: boolean;
    readonly outlineColor?: Color;
    readonly outlineWidth?: number;
    readonly enableShadow?: boolean;
    readonly shadowColor?: Color;
    readonly shadowOffset?: Vec2;
    readonly shadowBlur?: number;
}

const TARGET_TYPOGRAPHY_STYLES: Readonly<Record<TargetTypographyRole, TargetTypographyStyle>> = {
    LevelSelectMainTitle: {
        fontSize: LEVEL_SELECT_MAIN_TITLE_FONT_SIZE,
        lineHeight: 45,
        isBold: true,
        color: new Color(74, 56, 39, 255),
        overflow: Label.Overflow.CLAMP,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
        enableOutline: true,
        outlineColor: new Color(255, 241, 198, 235),
        outlineWidth: 2,
        enableShadow: true,
        shadowColor: new Color(72, 48, 30, 80),
        shadowOffset: new Vec2(1, -1),
        shadowBlur: 1,
    },
    LevelSelectSubtitle: {
        fontSize: LEVEL_SELECT_SUBTITLE_FONT_SIZE,
        lineHeight: 20,
        isBold: false,
        color: new Color(118, 91, 60, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    LevelCardTitle: {
        fontSize: LEVEL_SELECT_CARD_TITLE_FONT_SIZE,
        lineHeight: 28,
        isBold: true,
        color: new Color(74, 56, 39, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.LEFT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    LevelCardDescription: {
        fontSize: LEVEL_SELECT_CARD_DESCRIPTION_FONT_SIZE,
        lineHeight: 20,
        isBold: false,
        color: new Color(118, 91, 60, 255),
        overflow: Label.Overflow.CLAMP,
        enableWrapText: true,
        horizontalAlign: HorizontalTextAlignment.LEFT,
        verticalAlign: VerticalTextAlignment.TOP,
    },
    LevelCardState: {
        fontSize: LEVEL_SELECT_CARD_STATE_FONT_SIZE,
        lineHeight: 20,
        isBold: true,
        color: new Color(74, 56, 39, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    LevelSelectPagination: {
        fontSize: 18,
        lineHeight: 23,
        isBold: true,
        color: new Color(74, 56, 39, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    LevelSelectProgress: {
        fontSize: 16,
        lineHeight: 20,
        isBold: false,
        color: new Color(74, 56, 39, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.LEFT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    LevelSelectProgressHint: {
        fontSize: 13,
        lineHeight: 16,
        isBold: false,
        color: new Color(118, 91, 60, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.RIGHT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    LevelSelectSecondaryAction: {
        fontSize: LEVEL_SELECT_BACK_BUTTON_FONT_SIZE,
        lineHeight: 28,
        isBold: true,
        color: new Color(49, 73, 61, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    LevelSelectPrimaryAction: {
        fontSize: LEVEL_SELECT_CONFIRM_BUTTON_FONT_SIZE,
        lineHeight: 30,
        isBold: true,
        color: new Color(61, 67, 39, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    BgmSectionTitle: {
        fontSize: 22,
        lineHeight: 27,
        isBold: true,
        color: UI_TEXT_PRIMARY,
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.LEFT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    BgmSectionHint: {
        fontSize: 14,
        lineHeight: 18,
        isBold: false,
        color: UI_TEXT_SECONDARY,
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.RIGHT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    BgmCardTitle: {
        fontSize: 18,
        lineHeight: 23,
        isBold: true,
        color: new Color(74, 56, 39, 255),
        overflow: Label.Overflow.CLAMP,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.LEFT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    BgmCardBody: {
        fontSize: 14,
        lineHeight: 18,
        isBold: false,
        color: new Color(100, 87, 61, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.LEFT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    BgmCardSource: {
        fontSize: 12,
        lineHeight: 15,
        isBold: false,
        color: new Color(120, 96, 57, 230),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.LEFT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    BgmCardState: {
        fontSize: 13,
        lineHeight: 16,
        isBold: true,
        color: new Color(126, 84, 25, 255),
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    VolumeTitle: {
        fontSize: 18,
        lineHeight: 23,
        isBold: true,
        color: UI_TEXT_PRIMARY,
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.LEFT,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    VolumePercent: {
        fontSize: 18,
        lineHeight: 23,
        isBold: true,
        color: UI_TEXT_PRIMARY,
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
    VolumeButton: {
        fontSize: 20,
        lineHeight: 24,
        isBold: true,
        color: UI_TEXT_PRIMARY,
        overflow: Label.Overflow.SHRINK,
        enableWrapText: false,
        horizontalAlign: HorizontalTextAlignment.CENTER,
        verticalAlign: VerticalTextAlignment.CENTER,
    },
};
const TACTIC_DECK_TITLE_Y = 306;
const TACTIC_DECK_TITLE_FONT_SIZE = 36;
const TACTIC_DECK_SUBTITLE_Y = 260;
const TACTIC_DECK_SUBTITLE_FONT_SIZE = 16;
const TACTIC_DECK_HEADER_MASK_Y = 260;
const TACTIC_DECK_HEADER_DIVIDER_Y = 228;
const TACTIC_DECK_CARD_TITLE_FONT_SIZE = 22;
const TACTIC_DECK_CARD_CONDITION_FONT_SIZE = 13;
const TACTIC_DECK_CARD_EFFECT_FONT_SIZE = 14;
const TACTIC_DECK_CARD_META_FONT_SIZE = 12;
// Formal release builds keep this source-level development switch disabled.
// If enabled locally, progress reset still requires an explicit second confirmation.
const LEVEL_SELECT_DEBUG_RESET_ENABLED = false;
const BASE_MAX_HEALTH = 100;
const ENERGY_MAX = 100;
const ENERGY_START = 60;
const ENERGY_RECOVERY_PER_SECOND = 4;
const PLAYER_SPAWN_COOLDOWN = 0.8;
const AI_INITIAL_DECISION_DELAY = 1.8;
const AI_IDLE_DECISION_INTERVAL = 1.1;
const PLAYER_MAX_ACTIVE_UNITS = 8;
const TEAM_MAX_UNITS_PER_LANE = 3;
const UNIT_QUEUE_GAP = 10;
const UNIT_ENEMY_CONTACT_GAP = 3;
const LANE_CONTACT_EPSILON = 0.01;
const LANE_PROGRESS_POSITION_EPSILON = 0.05;
const LANE_PROGRESS_VALUE_EPSILON = 0.001;
const LANE_STALL_RECOVERY_SECONDS = 2;
const MAX_LOGIC_DELTA_TIME = 0.1;
// Root positions stay inside these bounds. The margin also reserves room for
// the health bar and keeps units away from the surrounding HUD/base visuals.
const UNIT_ROAD_SAFETY_MARGIN = 22;
const QUEUE_FULL_MARKER_SECONDS = 0.55;
const SPAWN_BUTTON_WIDTH = LANE_WIDTH - 16;
const SPAWN_BUTTON_HEIGHT = 52;
const SPAWN_BUTTON_Y = -216;
const LANE_HIT_AREA_CENTER_Y = (LANE_BOTTOM_Y + LANE_TOP_Y) * 0.5;
const CARTOON_ROAD_VISUAL_WIDTH = 143;
const LANE_HIT_AREA_WIDTH = BATTLEFIELD_VISUAL_MODE === 'cartoon_20x9_v02'
    ? CARTOON_ROAD_VISUAL_WIDTH + 22 : LANE_WIDTH;
const LANE_TOUCH_DRAG_THRESHOLD = 12;
const LANE_TOUCH_DEDUPLICATION_MS = 80;
const SPAWN_GATE_VISUAL_SIZE = 72;
const AI_GATE_GROUND_Y = LANE_TOP_Y - SPAWN_GATE_VISUAL_SIZE;
const PLAYER_GATE_GROUND_LOCAL_Y = -SPAWN_GATE_VISUAL_SIZE / 2;
// Alpha-bounds audit of the four 128x128 states: AI centers average 0.375 px
// left of the texture center, while the player states average exactly at center.
// Convert that correction to the 72 px design sprite; every lane shares it.
const AI_GATE_ALPHA_BODY_OFFSET_X = -0.375 * SPAWN_GATE_VISUAL_SIZE / 128;
const PLAYER_GATE_ALPHA_BODY_OFFSET_X = 0;
const AI_GATE_VISUAL_OFFSET_X = -AI_GATE_ALPHA_BODY_OFFSET_X;
const PLAYER_GATE_VISUAL_OFFSET_X = -PLAYER_GATE_ALPHA_BODY_OFFSET_X;
const UNIT_CARD_WIDTH = 48;
const UNIT_CARD_HEIGHT = 70;
const UNIT_CARD_GAP = 4;
const UNIT_CARD_SIDEBAR_PADDING = 0;
const UNIT_CARD_SIDEBAR_WIDTH = UNIT_CARD_WIDTH + UNIT_CARD_SIDEBAR_PADDING * 2;
const UNIT_CARD_SIDEBAR_HEIGHT = UNIT_CARD_HEIGHT * 4 + UNIT_CARD_GAP * 3
    + UNIT_CARD_SIDEBAR_PADDING * 2;
const PLAYER_HUD_VISIBLE_HALF_HEIGHT = Math.max(
    BASE_BAR_HEIGHT,
    PLAYER_RESOURCE_BADGE_HEIGHT,
    ENERGY_BAR_HEIGHT,
) / 2;
const DEBUG_BOTTOM_HUD_ASSERT = false;
const UNIT_CARD_TIER_CENTER_X = 0;
const UNIT_CARD_TIER_CENTER_Y = 21;
const UNIT_CARD_MAIN_CENTER_X = 0;
const UNIT_CARD_MAIN_CENTER_Y = -1;
const UNIT_CARD_MAIN_AREA_WIDTH = 42;
const UNIT_CARD_MAIN_AREA_HEIGHT = 30;
const UNIT_CARD_STATUS_CENTER_X = 0;
const UNIT_CARD_STATUS_CENTER_Y = -25;
const UNIT_CARD_STATUS_BOX_WIDTH = 42;
const UNIT_CARD_STATUS_BOX_HEIGHT = 16;
const UNIT_CARD_TIER_AREA_WIDTH = 24;
const UNIT_CARD_STATUS_AREA_WIDTH = UNIT_CARD_STATUS_BOX_WIDTH;
// Development-only lane diagnostics. Keep this false for normal Creator and
// WeChat builds: warnings are emitted only when an invariant is actually broken.
const DEBUG_LANE_ASSERT = false;
const DEBUG_LANE_CENTER_LINES = false;
const SUPPLY_CAPTURE_RADIUS = 62;
const SUPPLY_CAPTURE_SECONDS = 1.7;
const SUPPLY_VALUE_PER_POINT_PER_SECOND = 2;
const SUPPLY_MAX = 5;
const LEVEL_SIX_FIRST_GOLDEN_ACTIVATION_SECONDS = 12;
const LEVEL_SIX_GOLDEN_ROTATION_SECONDS = 20;
const LEVEL_SIX_GOLDEN_WARNING_SECONDS = 3;
const LEVEL_SIX_GOLDEN_ACTIVE_SECONDS = 14;
const LEVEL_SIX_GOLDEN_CAPTURE_REWARD = 2;
const LEVEL_SIX_GOLDEN_HOLD_REWARD = 1;
const LEVEL_SIX_AI_GOLDEN_LANE_WEIGHT = 0.60;
const LEVEL_SIX_AI_DEPLOY_COOLDOWN_MULTIPLIER = 0.95;
const LEVEL_SIX_AI_MIN_DEPLOY_COOLDOWN = 4.5;
const SUPPLY_BOOST_SUPPLY_COST = 2;
const SUPPLY_BOOST_DURATION_SECONDS = 12;
const SUPPLY_BOOST_COOLDOWN_SECONDS = 16;
const SUPPLY_BOOST_CAPTURE_BONUS = 1;
const SUPPLY_BOOST_HOLD_BONUS = 1;
const SPRINT_SUPPLY_COST = 2;
const SPRINT_DURATION_SECONDS = 6;
const SPRINT_COOLDOWN_SECONDS = 10;
const SPRINT_SPEED_MULTIPLIER = 1.5;
const HEAL_SUPPLY_COST = 3;
const HEAL_AMOUNT_RATIO = 0.4;
const HEAL_COOLDOWN_SECONDS = 8;
const SHOCK_UNLOCK_HEALTH = BASE_MAX_HEALTH * 0.5;
const SHOCK_HEAVY_DAMAGE_RATIO = 0.55;
const SHOCK_KNOCKBACK_DISTANCE = 145;
const MUD_MOVE_SPEED_MULTIPLIER = 0.70;
const FLOWER_DAMAGE_REDUCTION = 0.12;
const FREEZE_SUPPLY_COST = 3;
const FREEZE_DURATION_SECONDS = 3;
const FREEZE_COOLDOWN_SECONDS = 12;
const ENERGY_SURGE_SUPPLY_COST = 2;
const ENERGY_SURGE_DURATION_SECONDS = 8;
const ENERGY_SURGE_COOLDOWN_SECONDS = 18;
const ENERGY_SURGE_RECOVERY_MULTIPLIER = 2;
const LEVEL_FIVE_PLAYER_ENERGY_RECOVERY_MULTIPLIER = 2.5;
const LEVEL_FIVE_AI_ENERGY_RECOVERY_MULTIPLIER = 2.5;
const LEVEL_FIVE_AI_MIN_DECISION_INTERVAL = 1.25;
const LEVEL_FIVE_LANE_ACTIVE_UNIT_SOFT_BUDGET = 20;
const LEVEL_FIVE_PENDING_SPAWNS_PER_FRAME = 2;
const LEVEL_FIVE_SMALL_UNIT_POOL_LIMIT = 48;
const LEVEL_FIVE_SECONDARY_VFX_UNIT_THRESHOLD = 64;
const LEVEL_FIVE_RUSH_WINDOW_SECONDS = 4;
const LEVEL_FIVE_RUSH_NOTICE_SECONDS = 1.2;
const MUD_ENTRY_VFX_DURATION_SECONDS = 0.34;
const MUD_TRAIL_VFX_DURATION_SECONDS = 0.38;
const MUD_TRAIL_INTERVAL_SECONDS = 0.38;
const MUD_MAX_ACTIVE_TRAILS_PER_UNIT = 2;
const MUD_MAX_ACTIVE_TRAILS_PER_LANE = 16;
const FREEZE_CAST_WAVE_DURATION_SECONDS = 0.52;
const FREEZE_UNIT_BURST_DURATION_SECONDS = 0.46;
const FREEZE_SHATTER_DURATION_SECONDS = 0.36;
const FREEZE_VISUAL_REFRESH_INTERVAL_SECONDS = 0.08;
const FREEZE_MAX_VISIBLE_PARTICLES_PER_UNIT = 4;
const FREEZE_MAX_ACTIVE_PARTICLES = 40;
const BATTLE_VFX_POOL_LIMIT = 64;
const LEVEL_FOUR_AI_EARLY_PHASE_SECONDS = 45;
const LEVEL_FOUR_AI_EARLY_COOLDOWN_MULTIPLIER = 1.10;
const UNIT_HIT_FLASH_DURATION = 0.12;
const UNIT_IMPACT_DURATION = 0.14;
const UNIT_DEATH_DURATION = 0.28;
const UNIT_HEALTH_DAMAGE_DISPLAY_SECONDS = 0.15;
const UNIT_HEALTH_HEAL_DISPLAY_SECONDS = 0.2;
const UNIT_HEALTH_DEATH_DISPLAY_SECONDS = 0.08;
const UNIT_VISUAL_BASE_RADIUS = 22;
const UNIT_TYPE_BADGE_SIZE = 28;
const UNIT_TIER_BADGE_GAP = 6;
const UNIT_TYPE_BADGE_FONT_SIZE = 19;
const PLAYER_TYPE_BADGE_RING_COLOR = new Color(43, 190, 176, 255);
const AI_TYPE_BADGE_RING_COLOR = new Color(238, 91, 70, 255);
const AI_DEPLOY_NOTICE_MIN_INTERVAL = 0.75;
const BASE_HIT_FLASH_DURATION = 0.32;
const HUD_DYNAMIC_REFRESH_INTERVAL = 0.25;
const TACTIC_NOTICE_FADE_IN_SECONDS = 0.12;
const TACTIC_NOTICE_HOLD_SECONDS = 0.7;
const TACTIC_NOTICE_FADE_OUT_SECONDS = 0.22;
const LEVEL_PROGRESS_STORAGE_KEY = 'wolf-sheep-battle.v1.highest-unlocked-level';
const LEVEL_PROGRESS_STORAGE_KEY_V2 = 'wolf-sheep-battle.progress.v2';
const LEVEL_PROGRESS_SCHEMA_VERSION = 7;
const LEVEL_ONE_TUTORIAL_VERSION = 5;
const LEVEL_ONE_TUTORIAL_DIM_ALPHA = 153;
const LEVEL_ONE_TUTORIAL_CARD_WIDTH = 560;
const LEVEL_ONE_TUTORIAL_CARD_HEIGHT = 280;
const LEVEL_ONE_TUTORIAL_CARD_CLEARANCE = 8;
const LEVEL_ONE_TUTORIAL_IDLE_PULSE_SECONDS = 15;

enum Team {
    Player,
    AI,
}

enum SheepType {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
    Giant = 'giant',
}

type LaneType = 'normal' | 'mud' | 'flower';
type TacticIcon = 'sprint' | 'heal' | 'shock' | 'freeze' | 'surge' | 'supplyBoost';
type LevelOneTutorialProgress = 'inactive' | 'welcome' | 'deploy-four-sheep'
    | 'deploy-four-sheep-complete' | 'capture-supply' | 'capture-supply-complete'
    | 'use-sprint' | 'use-sprint-complete' | 'battle-goal' | 'ready' | 'completed';
type LevelOneTutorialPage = 'welcome' | 'deploy-four-sheep' | 'capture-supply'
    | 'use-sprint' | 'battle-goal' | 'ready';
type LevelOneTutorialPointerTarget = SheepType | 'sprint' | number;

const LEVEL_ONE_TUTORIAL_PAGES: readonly LevelOneTutorialPage[] = [
    'welcome',
    'deploy-four-sheep',
    'capture-supply',
    'use-sprint',
    'battle-goal',
    'ready',
];
const LEVEL_ONE_TUTORIAL_DEPLOYMENTS: readonly { readonly type: SheepType; readonly lane: number }[] = [
    { type: SheepType.Small, lane: 0 },
    { type: SheepType.Medium, lane: 1 },
    { type: SheepType.Large, lane: 2 },
    { type: SheepType.Giant, lane: 3 },
];

interface TacticDefinition {
    readonly id: TacticIcon;
    readonly name: string;
    readonly supplyCost: number;
    readonly cooldownSeconds: number;
    readonly durationSeconds: number;
    readonly condition: string;
    readonly effect: string;
}

const DEFAULT_TACTIC_DECK: readonly TacticIcon[] = ['sprint', 'heal', 'shock'];
const DEFAULT_LEVEL_FOUR_TACTIC_DECK: readonly TacticIcon[] = ['heal', 'shock', 'freeze'];
const DEFAULT_LEVEL_FIVE_TACTIC_DECK: readonly TacticIcon[] = ['sprint', 'heal', 'surge'];
const DEFAULT_LEVEL_SIX_TACTIC_DECK: readonly TacticIcon[] = ['sprint', 'heal', 'supplyBoost'];
const ALL_TACTICS: readonly TacticIcon[] = ['sprint', 'heal', 'shock', 'freeze', 'surge', 'supplyBoost'];
const TACTIC_DECK_PANEL_WIDTH = 960;
const TACTIC_DECK_PANEL_HEIGHT = 690;
const TACTIC_DECK_CARD_WIDTH = 410;
const TACTIC_DECK_CARD_HEIGHT = 176;
const TACTIC_DECK_CONFIRM_WIDTH = 320;
const TACTIC_DECK_CONFIRM_HEIGHT = 64;
const TACTIC_DEFINITIONS: Readonly<Record<TacticIcon, TacticDefinition>> = {
    sprint: {
        id: 'sprint', name: '全体冲刺', supplyCost: SPRINT_SUPPLY_COST,
        cooldownSeconds: SPRINT_COOLDOWN_SECONDS, durationSeconds: SPRINT_DURATION_SECONDS,
        condition: '场上有己方单位', effect: `移速+50% · 持续${SPRINT_DURATION_SECONDS}秒`,
    },
    heal: {
        id: 'heal', name: '战地急救', supplyCost: HEAL_SUPPLY_COST,
        cooldownSeconds: HEAL_COOLDOWN_SECONDS, durationSeconds: 0,
        condition: '场上有受伤单位', effect: '全体恢复40%生命',
    },
    shock: {
        id: 'shock', name: '领地震荡', supplyCost: 0,
        cooldownSeconds: 0, durationSeconds: 0,
        condition: '基地生命低于50%', effect: '本方领地小/中消灭\n大/巨重伤并击退',
    },
    freeze: {
        id: 'freeze', name: '道路冻结', supplyCost: FREEZE_SUPPLY_COST,
        cooldownSeconds: FREEZE_COOLDOWN_SECONDS, durationSeconds: FREEZE_DURATION_SECONDS,
        condition: '选择有敌人的道路', effect: `该路敌人停止${FREEZE_DURATION_SECONDS}秒`,
    },
    surge: {
        id: 'surge', name: '能量涌流', supplyCost: ENERGY_SURGE_SUPPLY_COST,
        cooldownSeconds: ENERGY_SURGE_COOLDOWN_SECONDS, durationSeconds: ENERGY_SURGE_DURATION_SECONDS,
        condition: `补给≥${ENERGY_SURGE_SUPPLY_COST}`, effect: `${ENERGY_SURGE_DURATION_SECONDS}秒内能量恢复速度翻倍`,
    },
    supplyBoost: {
        id: 'supplyBoost', name: '补给强化', supplyCost: SUPPLY_BOOST_SUPPLY_COST,
        cooldownSeconds: SUPPLY_BOOST_COOLDOWN_SECONDS, durationSeconds: SUPPLY_BOOST_DURATION_SECONDS,
        condition: '等待下一次黄金占领', effect: '黄金占领与守点奖励各+1',
    },
};

interface UnitDefinition {
    readonly type: SheepType;
    readonly name: string;
    readonly cost: number;
    readonly maxHealth: number;
    readonly damage: number;
    readonly speed: number;
    readonly attackInterval: number;
    readonly baseDamage: number;
    readonly battlePower: number;
    readonly radius: number;
    readonly color: readonly [number, number, number];
}

interface UnitTierVisualConfig {
    readonly label: string;
    readonly roman: string;
    readonly accentColor: Color;
    readonly visualScale: number;
    readonly displayName: {
        readonly sheep: string;
        readonly wolf: string;
    };
}

interface BattleUnit {
    id: number;
    queueOrder: number;
    readonly team: Team;
    lane: number;
    readonly definition: UnitDefinition;
    readonly node: Node;
    readonly visualNode: Node;
    readonly visualGraphics: Graphics;
    readonly groundShadowNode: Node;
    readonly groundShadowOpacity: UIOpacity;
    groundShadowSprite?: Sprite;
    readonly hitFlashNode: Node;
    readonly hitFlashOpacity: UIOpacity;
    readonly healthNode: Node;
    readonly healthGraphics: Graphics;
    readonly healthFillNode: Node;
    readonly healthFillGraphics: Graphics;
    readonly tierBadgeNode: Node;
    readonly tierBadgeGraphics: Graphics;
    readonly tierBadgeLabel: Label;
    readonly laneBuffBadgeNode: Node;
    readonly laneBuffBadgeGraphics: Graphics;
    readonly freezeVisualNode: Node;
    readonly freezeVisualGraphics: Graphics;
    readonly freezeFootRingNode: Node;
    readonly freezeFootRingGraphics: Graphics;
    readonly freezeSnowNode: Node;
    readonly freezeSnowGraphics: Graphics;
    readonly freezeStatusIconNode: Node;
    readonly freezeStatusIconGraphics: Graphics;
    readonly opacity: UIOpacity;
    artSprite?: Sprite;
    artAnimator?: UnitSpriteAnimator;
    artHealthFillSprite?: Sprite;
    pilotDustCooldown: number;
    mudTrailCooldown: number;
    freezeVisualRefreshRemaining: number;
    health: number;
    displayHealth: number;
    attackCooldown: number;
    walkPhase: number;
    isMoving: boolean;
    hitFlashRemaining: number;
    attackKickRemaining: number;
    hitRecoilRemaining: number;
    isDying: boolean;
    deathRemaining: number;
    frozenRemaining: number;
}

interface RoadBounds {
    readonly minY: number;
    readonly maxY: number;
}

type LaneActivityState = 'marching' | 'fighting' | 'breakthrough';

interface LaneRuntimeState {
    previousPlayerFrontY: number | undefined;
    previousAIFrontY: number | undefined;
    previousPlayerHealthTotal: number;
    previousAIHealthTotal: number;
    previousUnitCount: number;
    previousBaseHitCount: number;
    baseHitCount: number;
    stalledSeconds: number;
    warningIssued: boolean;
    recoveryCount: number;
}

interface FeedbackEffect {
    readonly node: Node;
    readonly opacity: UIOpacity;
    readonly startX: number;
    readonly startY: number;
    readonly yOffset: number;
    readonly duration: number;
    elapsed: number;
}

type BattleVfxKind = 'mud-entry' | 'mud-trail' | 'freeze-cast-wave' | 'freeze-unit-burst'
    | 'freeze-shatter' | 'deploy-rush' | 'hit-spark';

interface BattleVfxEffect {
    readonly node: Node;
    readonly graphics: Graphics;
    readonly opacity: UIOpacity;
    kind: BattleVfxKind;
    lane: number;
    unitId: number | undefined;
    duration: number;
    elapsed: number;
    particleCount: number;
}

interface ButtonView {
    readonly node: Node;
    readonly graphics: Graphics;
    readonly label: Label;
    readonly width: number;
    readonly height: number;
    artSprite?: Sprite;
}

type ResultButtonRole = 'primary' | 'secondary';

interface ResultButtonView extends ButtonView {
    readonly role: ResultButtonRole;
    readonly opacity: UIOpacity;
    enabled: boolean;
    pressed: boolean;
}

interface ResultDataCardView {
    readonly root: Node;
    readonly graphics: Graphics;
    readonly headerLabel: Label;
    readonly metricLabels: readonly Label[];
    readonly valueLabels: readonly Label[];
}

type TitleActionButtonRole = 'primary' | 'secondary';

interface TitleActionButtonView extends ButtonView {
    readonly role: TitleActionButtonRole;
    readonly opacity: UIOpacity;
    readonly iconNode: Node;
    enabled: boolean;
    pressed: boolean;
    pressArmed: boolean;
    lastActivationTimeMs: number;
}

type LevelCardVisualState = 'selected' | 'available' | 'completed' | 'locked' | 'in-development';

interface LevelCardView {
    readonly levelId: number;
    readonly root: Node;
    readonly backgroundGraphics: Graphics;
    readonly numberBadgeNode: Node;
    readonly numberBadgeGraphics: Graphics;
    readonly numberLabel: Label;
    readonly titleLabel: Label;
    readonly descriptionLabel: Label;
    readonly stateArea: Node;
    readonly stateIconFallbackNode: Node;
    readonly stateIconFallbackGraphics: Graphics;
    readonly stateLabel: Label;
    readonly completionBadgeNode: Node;
    readonly completionBadgeFallbackGraphics: Graphics;
    readonly touchArea: Node;
    backgroundSprite?: Sprite;
    numberBadgeSprite?: Sprite;
    stateIconSprite?: Sprite;
    completionBadgeSprite?: Sprite;
    visualState: LevelCardVisualState;
    completed: boolean;
}

interface BgmStyleOptionView {
    readonly track: BgmTrackConfig;
    readonly root: Node;
    readonly graphics: Graphics;
    readonly titleLabel: Label;
    readonly subtitleLabel: Label;
    readonly auxiliaryLabel: Label;
    readonly statusLabel: Label;
    readonly checkNode: Node;
    readonly checkGraphics: Graphics;
    readonly checkLabel: Label;
    readonly touchArea: Node;
    backgroundSprite?: Sprite;
    musicIconSprite?: Sprite;
}

interface UnitTypeButtonView extends ButtonView {
    readonly tierBadgeNode: Node;
    readonly tierBadgeGraphics: Graphics;
    readonly tierBadgeLabel: Label;
    readonly statusBackgroundNode: Node;
    readonly statusBackgroundGraphics: Graphics;
    readonly stateLabel: Label;
    artSprite?: Sprite;
    artSelectionGraphics?: Graphics;
    pressed: boolean;
    visualState: UnitCardVisualState;
}

type UnitCardVisualState = 'locked' | 'insufficient' | 'available' | 'selected'
    | 'selected-insufficient' | 'pressed';

type AudioChannel = 'music' | 'sfx';

interface VolumeControlView {
    readonly channel: AudioChannel;
    readonly root: Node;
    readonly accent: Color;
    readonly trackNode: Node;
    readonly trackGraphics: Graphics;
    readonly fillClipNode: Node;
    readonly fillNode: Node;
    readonly knobNode: Node;
    readonly knobGraphics: Graphics;
    readonly fallbackMuteIconNode: Node;
    readonly fallbackMuteIconGraphics: Graphics;
    readonly percentLabel: Label;
    readonly muteButton: ButtonView;
    readonly trackWidth: number;
    readonly valueWidth: number;
    muteIconSprite?: Sprite;
    formalTrackReady: boolean;
    formalKnobReady: boolean;
    formalIconReady: boolean;
    dragging: boolean;
}

interface EnergyBarView {
    readonly node: Node;
    readonly trackNode: Node;
    readonly fillNode: Node;
    readonly label: Label;
    readonly shadowLabel: Label;
    displayRatio: number;
}

interface LaneSpawnMarkerView {
    readonly node: Node;
    readonly graphics: Graphics;
    readonly label: Label;
    readonly queueLabel: Label;
    readonly failureOverlay: Node;
    readonly failureOpacity: UIOpacity;
    artSprite?: Sprite;
    pressed: boolean;
    fullRemaining: number;
    visualState: SpawnMarkerState;
    lastQueueText: string;
}

interface LaneHitAreaView {
    readonly lane: number;
    readonly node: Node;
    touchStartX: number;
    touchStartY: number;
    moved: boolean;
}

type SpawnMarkerState = 'ready' | 'selected' | 'energy' | 'full' | 'paused';
type TacticAvailabilityState = 'not-started' | 'paused' | 'finished' | 'active' | 'cooldown'
    | 'insufficient-supply' | 'no-friendly-unit' | 'no-injured-unit' | 'locked'
    | 'no-enemy-in-territory' | 'used' | 'available';

interface TacticAvailability {
    readonly state: TacticAvailabilityState;
    readonly enabled: boolean;
    readonly active: boolean;
    readonly statusText: string;
}

type TacticInfoVisualState = 'neutral' | 'ready' | 'insufficient' | 'cooldown';

interface TacticCardDisplayState {
    readonly currentSupply: number;
    readonly requiredSupply: number;
    readonly cooldownTotal: number;
    readonly cooldownRemaining: number;
    readonly activeRemaining: number;
    readonly availability: TacticAvailability;
    readonly costText: string;
    readonly metaText: string;
    readonly stateText: string;
    readonly costVisualState: TacticInfoVisualState;
    readonly metaVisualState: TacticInfoVisualState;
}

interface TacticCardView {
    readonly kind: TacticIcon;
    readonly root: Node;
    readonly node: Node;
    readonly cardShellFallbackGraphics: Graphics;
    readonly topSectionNode: Node;
    readonly iconCellNode: Node;
    readonly iconCellFallbackGraphics: Graphics;
    readonly textCellNode: Node;
    readonly textCellFallbackGraphics: Graphics;
    readonly dividerNode: Node;
    readonly dividerFallbackGraphics: Graphics;
    readonly skillIconFallbackGraphics: Graphics;
    readonly iconOpacity: UIOpacity;
    readonly titleLabel: Label;
    readonly conditionLabel: Label;
    readonly effectLabel: Label;
    readonly bottomSectionNode: Node;
    readonly costCellNode: Node;
    readonly costCellFallbackGraphics: Graphics;
    readonly costIconFallbackGraphics: Graphics;
    readonly costLabel: Label;
    readonly metaCellNode: Node;
    readonly metaCellFallbackGraphics: Graphics;
    readonly metaIconFallbackGraphics: Graphics;
    readonly metaLabel: Label;
    readonly stateCellNode: Node;
    readonly stateCellFallbackGraphics: Graphics;
    readonly stateIconFallbackGraphics: Graphics;
    readonly stateLabel: Label;
    readonly pressOverlay: Node;
    readonly touchArea: Node;
    readonly width: number;
    readonly height: number;
    cardShellSprite?: Sprite;
    iconCellSprite?: Sprite;
    skillIconSprite?: Sprite;
    textCellSprite?: Sprite;
    dividerSprite?: Sprite;
    costCellSprite?: Sprite;
    costIconSprite?: Sprite;
    metaCellSprite?: Sprite;
    metaIconSprite?: Sprite;
    stateCellSprite?: Sprite;
    stateIconSprite?: Sprite;
    costCellArtKey?: ArtPilotResourceKey;
    metaCellArtKey?: ArtPilotResourceKey;
    stateCellArtKey?: ArtPilotResourceKey;
    lastDisplayKey: string;
    previousDisplayState?: TacticCardDisplayState;
    enabled: boolean;
    availabilityState: TacticAvailabilityState;
    pressArmed: boolean;
    lastActivationTimeMs: number;
}

interface DeckTacticOptionView {
    readonly kind: TacticIcon;
    readonly root: Node;
    readonly visualRoot: Node;
    readonly graphics: Graphics;
    readonly selectionGlowGraphics: Graphics;
    readonly iconCellNode: Node;
    readonly skillIconFallbackGraphics: Graphics;
    readonly checkBadgeNode: Node;
    readonly checkBadgeGraphics: Graphics;
    readonly titleLabel: Label;
    readonly conditionLabel: Label;
    readonly effectLabel: Label;
    readonly costLabel: Label;
    readonly cooldownLabel: Label;
    readonly checkLabel: Label;
    cardShellSprite?: Sprite;
    iconCellSprite?: Sprite;
    skillIconSprite?: Sprite;
    selectedSparkSprite?: Sprite;
    pressArmed: boolean;
}

interface LevelProgressSave {
    readonly schemaVersion: number;
    readonly highestUnlockedLevel: number;
    readonly completedLevels: readonly number[];
    readonly selectedLevelId?: number;
    readonly specialRoadTutorialSeen: boolean;
    readonly levelOneTutorialCompleted: boolean;
    readonly levelOneTutorialVersion: number;
    readonly freezeUnlocked: boolean;
    readonly selectedTactics: readonly string[];
    readonly selectedTacticsByLevel?: Readonly<Record<string, readonly string[]>>;
    readonly levelFiveTutorialSeen?: boolean;
    readonly bestResultsByLevel?: Readonly<Record<string, LevelBestResultSave>>;
}

interface LevelBestResultSave {
    readonly fastestWinSeconds: number;
    readonly highestBaseHealth: number;
    readonly highestSupplyEarned: number;
}

interface SupplyPoint {
    readonly lane: number;
    readonly node: Node;
    readonly graphics: Graphics;
    readonly label: Label;
    readonly factionSilhouetteNode: Node;
    readonly factionSilhouetteGraphics: Graphics;
    readonly goldenOverlayNode: Node;
    readonly goldenOverlayGraphics: Graphics;
    artSprite?: Sprite;
    artStateIndex: number;
    owner: Team | null;
    capturingTeam: Team | null;
    captureTime: number;
}

interface BattleStats {
    unitsSpawned: number;
    supplyEarned: number;
    shockUses: number;
    sprintUses: number;
    healUses: number;
    freezeUses: number;
    surgeUses: number;
    supplyBoostUses: number;
}

interface LevelConfig {
    readonly id: number;
    readonly title: string;
    readonly subtitle?: string;
    readonly description: string;
    readonly implemented?: boolean;
    readonly enabled?: boolean;
    readonly playerStartEnergy: number;
    readonly aiStartEnergy: number;
    readonly aiInitialDecisionDelay: number;
    readonly aiIdleDecisionInterval: number;
    readonly aiDeployCooldownMultiplier: number;
    readonly aiAllowedUnitTypes: readonly SheepType[];
    readonly aiMaxActiveUnits: number;
    readonly allowAITactics: boolean;
    readonly aiSprintPowerRatio: number;
    readonly aiSprintAdvanceY: number;
    readonly aiHealInjuredUnitCount: number;
    readonly aiHealHealthRatio: number;
    readonly aiShockMinTargets: number;
    readonly aiShockPowerThreshold: number;
    readonly laneTypes: readonly [LaneType, LaneType, LaneType, LaneType];
    readonly earlyAIUnitTypes?: readonly SheepType[];
    readonly earlyAIPhaseSeconds?: number;
    readonly earlyAIDeployCooldownMultiplier?: number;
    readonly aiMudAwarenessChance?: number;
    readonly aiMudAvoidancePenalty?: number;
    readonly playerEnergyRecoveryMultiplier?: number;
    readonly aiEnergyRecoveryMultiplier?: number;
    readonly continuousSmallUnitDeployment?: boolean;
    readonly aiMinimumDeployCooldown?: number;
}

const LEVEL_CONFIGS: readonly LevelConfig[] = [
    {
        id: 1,
        implemented: true,
        title: '\u6559\u5B66\u8282\u594F',
        description: 'AI \u4EC5\u4F7F\u7528\u5C0F\u72FC\u4E14\u51FA\u5175\u7F13\u6162\uFF0C\u7528\u4E8E\u719F\u6089\u56DB\u7EBF\u57FA\u7840\u3002',
        playerStartEnergy: ENERGY_MAX,
        aiStartEnergy: 0,
        aiInitialDecisionDelay: 8.4,
        aiIdleDecisionInterval: 2.75,
        aiDeployCooldownMultiplier: 2.5,
        aiAllowedUnitTypes: [SheepType.Small],
        aiMaxActiveUnits: 2,
        allowAITactics: false,
        aiSprintPowerRatio: 1.65,
        aiSprintAdvanceY: 65,
        aiHealInjuredUnitCount: 3,
        aiHealHealthRatio: 0.52,
        aiShockMinTargets: 2,
        aiShockPowerThreshold: 82,
        laneTypes: ['normal', 'normal', 'normal', 'normal'],
    },
    {
        id: 2,
        implemented: true,
        title: '\u8F7B\u5EA6\u7EC3\u4E60',
        description: 'AI \u4EC5\u4F7F\u7528\u5C0F\u72FC\u548C\u4E2D\u72FC\uFF0C\u7ED9\u4E88\u5145\u8DB3\u7684\u56DB\u7EBF\u7EC3\u4E60\u65F6\u95F4\u3002',
        playerStartEnergy: ENERGY_MAX,
        aiStartEnergy: 20,
        aiInitialDecisionDelay: 5.6,
        aiIdleDecisionInterval: 1.9,
        aiDeployCooldownMultiplier: 1.65,
        aiAllowedUnitTypes: [SheepType.Small, SheepType.Medium],
        aiMaxActiveUnits: 3,
        allowAITactics: false,
        aiSprintPowerRatio: 1.25,
        aiSprintAdvanceY: 140,
        aiHealInjuredUnitCount: 2,
        aiHealHealthRatio: 0.68,
        aiShockMinTargets: 2,
        aiShockPowerThreshold: 70,
        laneTypes: ['normal', 'normal', 'normal', 'normal'],
    },
    {
        id: 3,
        implemented: true,
        title: '\u6807\u51C6\u8282\u594F',
        description: 'AI \u6B63\u5E38\u4E89\u593A\u8865\u7ED9\uFF0C\u5E76\u4F7F\u7528\u5B8C\u6574\u5175\u79CD\u4E0E\u6218\u672F\u3002',
        playerStartEnergy: ENERGY_START,
        aiStartEnergy: ENERGY_START,
        aiInitialDecisionDelay: 1.8,
        aiIdleDecisionInterval: 1.1,
        aiDeployCooldownMultiplier: 1,
        aiAllowedUnitTypes: [SheepType.Small, SheepType.Medium, SheepType.Large, SheepType.Giant],
        aiMaxActiveUnits: 5,
        allowAITactics: true,
        aiSprintPowerRatio: 1.25,
        aiSprintAdvanceY: 140,
        aiHealInjuredUnitCount: 2,
        aiHealHealthRatio: 0.68,
        aiShockMinTargets: 2,
        aiShockPowerThreshold: 70,
        laneTypes: ['normal', 'normal', 'normal', 'normal'],
    },
    {
        id: 4,
        implemented: true,
        title: '泥泞与花径',
        subtitle: '特殊道路',
        description: '特殊道路与战术卡组。泥泞道路减速，花径保护羊方单位。',
        playerStartEnergy: ENERGY_START,
        aiStartEnergy: ENERGY_START,
        aiInitialDecisionDelay: 10,
        aiIdleDecisionInterval: 1.1,
        aiDeployCooldownMultiplier: 1,
        aiAllowedUnitTypes: [SheepType.Small, SheepType.Medium, SheepType.Large, SheepType.Giant],
        aiMaxActiveUnits: 5,
        allowAITactics: true,
        aiSprintPowerRatio: 1.25,
        aiSprintAdvanceY: 140,
        aiHealInjuredUnitCount: 2,
        aiHealHealthRatio: 0.68,
        aiShockMinTargets: 2,
        aiShockPowerThreshold: 70,
        laneTypes: ['normal', 'mud', 'flower', 'normal'],
        earlyAIUnitTypes: [SheepType.Small, SheepType.Medium],
        earlyAIPhaseSeconds: LEVEL_FOUR_AI_EARLY_PHASE_SECONDS,
        earlyAIDeployCooldownMultiplier: LEVEL_FOUR_AI_EARLY_COOLDOWN_MULTIPLIER,
        aiMudAwarenessChance: 0.65,
        aiMudAvoidancePenalty: 12,
    },
    {
        id: 5,
        implemented: true,
        title: '无限火力',
        subtitle: '能量奔涌，羊群出击',
        description: '双方能量高速恢复，小型单位可持续下达部署命令，以多路压力突破防线。',
        playerStartEnergy: ENERGY_MAX,
        aiStartEnergy: 80,
        aiInitialDecisionDelay: LEVEL_FIVE_AI_MIN_DECISION_INTERVAL,
        aiIdleDecisionInterval: LEVEL_FIVE_AI_MIN_DECISION_INTERVAL,
        aiDeployCooldownMultiplier: 0.6,
        aiAllowedUnitTypes: [SheepType.Small, SheepType.Medium, SheepType.Large, SheepType.Giant],
        aiMaxActiveUnits: 5,
        allowAITactics: true,
        aiSprintPowerRatio: 1.25,
        aiSprintAdvanceY: 140,
        aiHealInjuredUnitCount: 2,
        aiHealHealthRatio: 0.68,
        aiShockMinTargets: 2,
        aiShockPowerThreshold: 70,
        laneTypes: ['normal', 'normal', 'normal', 'normal'],
        playerEnergyRecoveryMultiplier: LEVEL_FIVE_PLAYER_ENERGY_RECOVERY_MULTIPLIER,
        aiEnergyRecoveryMultiplier: LEVEL_FIVE_AI_ENERGY_RECOVERY_MULTIPLIER,
        continuousSmallUnitDeployment: true,
    },
    {
        id: 6,
        implemented: true,
        title: '补给争夺战',
        subtitle: '黄金补给线',
        description: '黄金补给线会定期转移。占领黄金补给点可获得额外补给，守到活动结束还能获得奖励。',
        playerStartEnergy: ENERGY_START,
        aiStartEnergy: ENERGY_START,
        aiInitialDecisionDelay: LEVEL_SIX_AI_MIN_DEPLOY_COOLDOWN,
        aiIdleDecisionInterval: AI_IDLE_DECISION_INTERVAL,
        aiDeployCooldownMultiplier: LEVEL_SIX_AI_DEPLOY_COOLDOWN_MULTIPLIER,
        aiAllowedUnitTypes: [SheepType.Small, SheepType.Medium, SheepType.Large, SheepType.Giant],
        aiMaxActiveUnits: 5,
        allowAITactics: true,
        aiSprintPowerRatio: 1.25,
        aiSprintAdvanceY: 140,
        aiHealInjuredUnitCount: 2,
        aiHealHealthRatio: 0.68,
        aiShockMinTargets: 2,
        aiShockPowerThreshold: 70,
        laneTypes: ['normal', 'normal', 'normal', 'normal'],
        aiMinimumDeployCooldown: LEVEL_SIX_AI_MIN_DEPLOY_COOLDOWN,
    },
];

const UNIT_DEFINITIONS: Record<SheepType, UnitDefinition> = {
    [SheepType.Small]: {
        type: SheepType.Small,
        name: '小羊',
        cost: 12,
        maxHealth: 32,
        damage: 6,
        speed: 20,
        attackInterval: 0.48,
        baseDamage: 8,
        battlePower: 18,
        radius: 18,
        color: [236, 241, 246],
    },
    [SheepType.Medium]: {
        type: SheepType.Medium,
        name: '中羊',
        cost: 24,
        maxHealth: 64,
        damage: 11,
        speed: 17,
        attackInterval: 0.58,
        baseDamage: 13,
        battlePower: 38,
        radius: 22,
        color: [231, 220, 182],
    },
    [SheepType.Large]: {
        type: SheepType.Large,
        name: '大羊',
        cost: 42,
        maxHealth: 116,
        damage: 19,
        speed: 14,
        attackInterval: 0.7,
        baseDamage: 21,
        battlePower: 72,
        radius: 28,
        color: [201, 229, 211],
    },
    [SheepType.Giant]: {
        type: SheepType.Giant,
        name: '巨羊',
        cost: 70,
        maxHealth: 200,
        damage: 33,
        speed: 12,
        attackInterval: 0.9,
        baseDamage: 35,
        battlePower: 130,
        radius: 35,
        color: [208, 202, 244],
    },
};

const UNIT_TIER_VISUALS: Readonly<Record<SheepType, UnitTierVisualConfig>> = {
    [SheepType.Small]: {
        label: '\u5C0F',
        roman: '\u2160',
        accentColor: new Color(74, 177, 238, 255),
        visualScale: 1,
        displayName: {
            sheep: '\u5C0F\u7F8A',
            wolf: '\u5C0F\u72FC',
        },
    },
    [SheepType.Medium]: {
        label: '\u4E2D',
        roman: '\u2161',
        accentColor: new Color(54, 190, 134, 255),
        visualScale: 1.15,
        displayName: {
            sheep: '\u4E2D\u7F8A',
            wolf: '\u4E2D\u72FC',
        },
    },
    [SheepType.Large]: {
        label: '\u5927',
        roman: '\u2162',
        accentColor: new Color(161, 99, 224, 255),
        visualScale: 1.3,
        displayName: {
            sheep: '\u5927\u7F8A',
            wolf: '\u5927\u72FC',
        },
    },
    [SheepType.Giant]: {
        label: '\u5DE8',
        roman: '\u2163',
        accentColor: new Color(239, 174, 47, 255),
        visualScale: 1.48,
        displayName: {
            sheep: '\u5DE8\u7F8A',
            wolf: '\u5DE8\u72FC',
        },
    },
};

const UNIT_ORDER: readonly SheepType[] = [
    SheepType.Small,
    SheepType.Medium,
    SheepType.Large,
    SheepType.Giant,
];

/**
 * 四线战斗的最小可运行玩法入口。
 * Canvas 下的界面、单位和临时图形均在运行时生成，不依赖正式美术资源。
 */
@ccclass('GameController')
export class GameController extends Component {
    @property([AudioClip])
    private readonly audioClips: AudioClip[] = [];

    @property(SpriteFrame)
    private loadingBackgroundFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private loadingMascotSheepFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private loadingMascotWolfFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private loadingProgressFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private loadingProgressFillFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private loadingTipPanelFrame: SpriteFrame | null = null;

    @property(Font)
    private loadingUiFont: Font | null = null;

    private readonly units: BattleUnit[] = [];
    private readonly dyingUnits: BattleUnit[] = [];
    private readonly typeButtons = new Map<SheepType, UnitTypeButtonView>();
    private readonly supplyPoints: SupplyPoint[] = [];
    private readonly feedbackEffects: FeedbackEffect[] = [];
    private readonly laneSpawnMarkers: LaneSpawnMarkerView[] = [];
    private readonly laneHitAreas: LaneHitAreaView[] = [];
    private readonly laneDebugSignatures = new Set<string>();
    private readonly pendingLaneShifts: number[][] = [
        LANE_X.map(() => 0),
        LANE_X.map(() => 0),
    ];
    private readonly artResourceManager = new ArtResourceManager();
    private readonly activePilotVfx: VfxSpriteAnimator[] = [];
    private readonly pilotVfxPool: VfxSpriteAnimator[] = [];
    private readonly activeBattleVfx: BattleVfxEffect[] = [];
    private readonly battleVfxPool: BattleVfxEffect[] = [];
    private readonly levelFiveSmallUnitPool: BattleUnit[] = [];
    private readonly laneFormations: BattleUnit[][][] = [
        LANE_X.map(() => []),
        LANE_X.map(() => []),
    ];
    private laneFormationCacheDirty = true;
    private readonly pendingCombatDamage = new Map<BattleUnit, number>();
    private readonly depthOrderScratch: BattleUnit[] = [];
    private readonly playerDefinitionScratch: UnitDefinition[] = [];
    private readonly aiDefinitionScratch: UnitDefinition[] = [];
    private readonly roadBoundsCache = new Map<number, RoadBounds>();
    private readonly pendingSmallDeployments: number[][] = [
        LANE_X.map(() => 0),
        LANE_X.map(() => 0),
    ];
    private pendingSmallDeploymentLaneCursor = 0;
    private readonly laneRuntimeStates: LaneRuntimeState[] = LANE_X.map(() => ({
        previousPlayerFrontY: undefined,
        previousAIFrontY: undefined,
        previousPlayerHealthTotal: 0,
        previousAIHealthTotal: 0,
        previousUnitCount: 0,
        previousBaseHitCount: 0,
        baseHitCount: 0,
        stalledSeconds: 0,
        warningIssued: false,
        recoveryCount: 0,
    }));

    private playerBaseHealth = BASE_MAX_HEALTH;
    private aiBaseHealth = BASE_MAX_HEALTH;
    private playerEnergy = ENERGY_START;
    private aiEnergy = ENERGY_START;
    private playerSupply = 0;
    private aiSupply = 0;
    private playerStats: BattleStats = this.createEmptyBattleStats();
    private aiStats: BattleStats = this.createEmptyBattleStats();
    private currentLevel = 1;
    private highestUnlockedLevel = 1;
    private readonly completedLevels = new Set<number>();
    private specialRoadTutorialSeen = false;
    private levelOneTutorialCompleted = false;
    private levelOneTutorialVersion = 0;
    private levelFiveTutorialSeen = false;
    private freezeUnlocked = false;
    private selectedTactics: TacticIcon[] = [...DEFAULT_LEVEL_FOUR_TACTIC_DECK];
    private pendingDeckSelection: TacticIcon[] = [...DEFAULT_LEVEL_FOUR_TACTIC_DECK];
    private readonly selectedTacticsByLevel = new Map<number, TacticIcon[]>();
    private readonly bestResultsByLevel = new Map<number, LevelBestResultSave>();
    private battleElapsedSeconds = 0;
    private selectedSheepType: SheepType | undefined;
    private nextUnitId = 1;
    private playerSpawnCooldown = 0;
    private aiDecisionCooldown = AI_INITIAL_DECISION_DELAY;
    private hudRefreshCooldown = 0;
    private statusToastRemaining = 0;
    private aiDeployNoticeCooldown = 0;
    private lastLaneSpawnTouchAtMs = 0;
    private lastLaneSpawnTouchLane = -1;
    private lastBaseHudState = '';
    private lastUnitButtonState = '';
    private lastTacticHudState = '';
    private tacticDisplayRefreshCooldown = 0;
    private isStarted = false;
    private tutorialProgress: LevelOneTutorialProgress = 'inactive';
    private tutorialVisiblePage = 0;
    private tutorialHighestViewedPage = 0;
    private tutorialFlowActive = false;
    private tutorialSimulationFrozen = false;
    private tutorialInteractionLocked = false;
    private tutorialPointerTarget: LevelOneTutorialPointerTarget | undefined;
    private tutorialPointerStartX = 0;
    private tutorialPointerStartY = 0;
    private tutorialPointerMoved = false;
    private tutorialIdleSeconds = 0;
    private tutorialDeploymentLane: number | undefined;
    private tutorialDeployedUnitId: number | undefined;
    private tutorialDeploymentIndex = 0;
    private readonly tutorialCompletedDeploymentTypes = new Set<SheepType>();
    private readonly tutorialCompletedDeploymentLanes = new Set<number>();
    private readonly tutorialDeploymentUnitIds = new Map<SheepType, number>();
    private readonly tutorialEnergySubsidiesGranted = new Set<SheepType>();
    private readonly tutorialEnergySubsidiesRemaining = new Map<SheepType, number>();
    private tutorialSprintSubsidyGranted = false;
    private tutorialSprintSubsidyRemaining = 0;
    private tutorialRecoveryMessage = '';
    private readonly tutorialTargetRects: Rect[] = [];
    private isFinished = false;
    private isPaused = false;
    private playerShockUnlocked = false;
    private aiShockUnlocked = false;
    private playerShockUsed = false;
    private aiShockUsed = false;
    private playerSprintRemaining = 0;
    private aiSprintRemaining = 0;
    private playerSprintCooldown = 0;
    private aiSprintCooldown = 0;
    private playerHealCooldown = 0;
    private aiHealCooldown = 0;
    private playerFreezeCooldown = 0;
    private playerEnergySurgeRemaining = 0;
    private playerEnergySurgeCooldown = 0;
    private playerSupplyBoostRemaining = 0;
    private playerSupplyBoostCooldown = 0;
    private supplyBoostTriggeredRound = 0;
    private goldenNextActivationRemaining = LEVEL_SIX_FIRST_GOLDEN_ACTIVATION_SECONDS;
    private goldenActiveRemaining = 0;
    private goldenPendingLane = -1;
    private goldenLane = -1;
    private goldenPreviousLane = -1;
    private goldenRoundId = 0;
    private goldenWarningShown = false;
    private goldenCaptureRewardGranted = false;
    private goldenRewardTeam: Team | null = null;
    private goldenVisualPhase = 0;
    private readonly goldenLaneBag: number[] = [];
    private readonly goldenLaneHistory: number[] = [];
    private readonly levelSixAILaneDecisions = [0, 0, 0, 0];
    private readonly levelFiveRecentPlayerDeployTimes: number[] = [];
    private levelFiveRushHighestAnnounced = 0;
    private freezeLaneSelectionActive = false;
    private playerBaseFlashRemaining = 0;
    private aiBaseFlashRemaining = 0;
    private statusMessage = '选择兵种后，点击对应道路任意位置出兵。';
    private artPilotLoadGeneration = 0;
    private readonly aiSpawnGateSelectedRemaining = [0, 0, 0, 0];
    private readonly laneEffectVisuals: Node[] = [];
    private readonly freezeLaneHighlightNodes: Node[] = [];
    private readonly freezeLaneHighlightOpacities: UIOpacity[] = [];

    private gameLayer!: Node;
    private fullscreenBackgroundRoot!: Node;
    private safeUiRoot!: Node;
    private battleLayer!: Node;
    private battlefieldBackgroundLayer!: Node;
    private laneVisualsLayer!: Node;
    private basesAndSpawnGatesLayer!: Node;
    private unitsAndVfxLayer!: Node;
    private battleInputLayer!: Node;
    private hudLayer!: Node;
    private unitCardSidebar!: Node;
    private toastLayer!: Node;
    private modalLayer!: Node;
    private rightControlBar!: Node;
    private screenAdapter!: LandscapeScreenAdapter;
    private screenMetrics!: LandscapeLayoutMetrics;
    private playerHudY = PLAYER_HUD_Y;
    private bottomHudAuditSignature = '';
    private capsuleExclusion?: Node;
    private readonly fullscreenBackdropColors = new Map<Node, Color>();
    private readonly modalContentBasePositions = new Map<Node, Vec3>();
    private readonly laneCenterAnchors: Node[] = [];
    private readonly laneArtSlots: Node[] = [];
    private readonly laneArtSprites: Sprite[] = [];
    private readonly aiSpawnGateSlots: Node[] = [];
    private readonly aiSpawnGateSprites: Sprite[] = [];
    private readonly playerSpawnGateRoots: Node[] = [];
    private readonly aiSpawnGateFrameIndices = [-1, -1, -1, -1];
    private battleBackgroundSlot?: Node;
    private battleBackgroundSprite?: Sprite;
    private battleBackgroundSourceAspect = DESIGN_WIDTH / DESIGN_HEIGHT;
    private playerBaseArtSlot?: Node;
    private playerBaseArtSprite?: Sprite;
    private aiBaseArtSlot?: Node;
    private aiBaseArtSprite?: Sprite;
    private playerBaseFrameSprite?: Sprite;
    private aiBaseFrameSprite?: Sprite;
    private playerBaseFillSprite?: Sprite;
    private aiBaseFillSprite?: Sprite;
    private artLoadingPanel?: Node;
    private artLoadingLabel?: Label;
    private artLoadingFillSprite?: Sprite;
    private artLoadingFillFallback?: Node;
    private artLoadingTipLabel?: Label;
    private artLoadingTipOpacity?: UIOpacity;
    private artLoadingSheepNode?: Node;
    private artLoadingWolfNode?: Node;
    private artLoadingAnimationTime = 0;
    private artLoadingTipElapsed = 0;
    private artLoadingTipIndex = 0;
    private artLoadingTargetProgress = 0;
    private artLoadingVisualProgress = 0;
    private artLoadingCompletionPending = false;
    private artLoadingFadeStarted = false;
    private artLoadingFailed = false;
    private artLoadingRetryButton?: ButtonView;
    private artLoadingContinueButton?: ButtonView;
    private artLoadingPendingContinue?: () => void;
    private formalUiFont?: Font;
    private targetTypographyFont?: Font;
    private readonly targetTypographyBindings = new Map<Label, TargetTypographyRole>();
    private battleArtPreparing = false;
    private playerBaseHudNode!: Node;
    private aiBaseHudNode!: Node;
    private playerBaseGraphics!: Graphics;
    private aiBaseGraphics!: Graphics;
    private playerBaseLabel!: Label;
    private aiBaseLabel!: Label;
    private playerBaseShadowLabel!: Label;
    private aiBaseShadowLabel!: Label;
    private playerEnergyLabel!: Label;
    private aiEnergyLabel!: Label;
    private playerSupplyLabel!: Label;
    private aiSupplyLabel!: Label;
    private playerEnergyBar!: EnergyBarView;
    private aiEnergyBar!: EnergyBarView;
    private playerSupplyBadge!: Node;
    private aiSupplyBadge!: Node;
    private aiTacticLabel!: Label;
    private statusLabel!: Label;
    private statusToast!: Node;
    private statusToastOpacity!: UIOpacity;
    private tacticNotice!: Node;
    private tacticNoticeLabel!: Label;
    private tacticNoticeOpacity!: UIOpacity;
    private resultPanel!: Node;
    private startPanel!: Node;
    private levelSelectPanel!: Node;
    private tutorialPanel!: Node;
    private tutorialDimLayer!: Node;
    private tutorialDimGraphics!: Graphics;
    private tutorialHighlightLayer!: Node;
    private tutorialHighlightGraphics!: Graphics;
    private tutorialHighlightOpacity!: UIOpacity;
    private tutorialArrow!: Node;
    private tutorialArrowGraphics!: Graphics;
    private tutorialArrowOpacity!: UIOpacity;
    private tutorialCard!: Node;
    private tutorialCardGraphics!: Graphics;
    private tutorialTitleLabel!: Label;
    private tutorialStepLabel!: Label;
    private tutorialBodyLabel!: Label;
    private readonly tutorialTaskLabels: Label[] = [];
    private tutorialPreviousButton!: ButtonView;
    private tutorialNextButton!: ButtonView;
    private replayLevelOneTutorialButton!: ButtonView;
    private replayLevelOneTutorialConfirmPanel!: Node;
    private specialRoadTutorialPanel!: Node;
    private levelFiveTutorialPanel!: Node;
    private levelFiveTutorialContent!: Node;
    private tacticDeckPanel!: Node;
    private tacticDeckContent!: Node;
    private tacticDeckContentGraphics!: Graphics;
    private tacticDeckPanelSprite?: Sprite;
    private tacticDeckHintLabel!: Label;
    private tacticDeckSubtitleLabel!: Label;
    private tacticDeckFeedbackLabel!: Label;
    private tacticDeckFeedbackOpacity!: UIOpacity;
    private tacticDeckConfirmButton!: ButtonView;
    private tacticDeckConfirmLocked = false;
    private readonly tacticDeckOptions = new Map<TacticIcon, DeckTacticOptionView>();
    private pausePanel!: Node;
    private pauseContent!: Node;
    private pauseContentRoot!: Node;
    private helpPanel!: Node;
    private helpTextLabel!: Label;
    private playerSprintCard!: TacticCardView;
    private playerHealCard!: TacticCardView;
    private playerShockCard!: TacticCardView;
    private playerFreezeCard!: TacticCardView;
    private playerEnergySurgeCard!: TacticCardView;
    private playerSupplyBoostCard!: TacticCardView;
    private freezeSelectionCancelLayer!: Node;
    private freezeSelectionCancelButton!: ButtonView;
    private pauseButton!: ButtonView;
    private levelBadge!: Node;
    private levelBadgeContent!: Node;
    private levelBadgeChapterLabel!: Label;
    private levelBadgeTitleLabel!: Label;
    private musicVolumeControl!: VolumeControlView;
    private sfxVolumeControl!: VolumeControlView;
    private readonly bgmStyleOptions = new Map<BgmTrackId, BgmStyleOptionView>();
    private levelFivePlayerEnergyFx?: Node;
    private levelFivePlayerEnergyFxOpacity?: UIOpacity;
    private levelFiveAiEnergyFx?: Node;
    private levelFiveAiEnergyFxOpacity?: UIOpacity;
    private levelFiveEnergyFxPhase = 0;
    private levelFivePlayerFullFlashRemaining = 0;
    private levelFiveAiFullFlashRemaining = 0;
    private levelFiveRushNotice?: Node;
    private levelFiveRushNoticeLabel?: Label;
    private levelFiveRushNoticeOpacity?: UIOpacity;
    private goldenSupplyPanel!: Node;
    private goldenSupplyPanelGraphics!: Graphics;
    private goldenSupplyLaneLabel!: Label;
    private goldenSupplyTimeLabel!: Label;
    private goldenSupplyOwnerLabel!: Label;
    private goldenSupplyNotice!: Node;
    private goldenSupplyNoticeLabel!: Label;
    private resultBackdropOpacity!: UIOpacity;
    private resultCard!: Node;
    private resultCardGraphics!: Graphics;
    private resultCardOpacity!: UIOpacity;
    private resultPanelCroppedFrame?: SpriteFrame;
    private resultBadge!: Node;
    private resultBadgeOpacity!: UIOpacity;
    private resultTitleGroup!: Node;
    private resultTitleOpacity!: UIOpacity;
    private resultDetailsGroup!: Node;
    private resultDetailsOpacity!: UIOpacity;
    private resultButtonsGroup!: Node;
    private resultButtonsOpacity!: UIOpacity;
    private resultTitleLabel!: Label;
    private resultSummaryLabel!: Label;
    private resultPlayerDataCard!: ResultDataCardView;
    private resultAiDataCard!: ResultDataCardView;
    private resultHintLabel!: Label;
    private resultRetryButton!: ResultButtonView;
    private resultNextButtonView!: ResultButtonView;
    private resultLevelSelectButton!: ResultButtonView;
    private resultNextButton!: Node;
    private readonly resultButtonViews: ResultButtonView[] = [];
    private resultAudioPlayed = false;
    private resultActionsLocked = false;
    private levelTransitionActive = false;
    private startCurrentLevelCaptionLabel!: Label;
    private startSelectedLevelLabel!: Label;
    private startBattleButton!: TitleActionButtonView;
    private startLevelSelectButton!: TitleActionButtonView;
    private startLevelSelectSubtitleLabel!: Label;
    private startMenuActionLocked = false;
    private startLevelSelectPulsePlayed = false;
    private levelSelectHintLabel!: Label;
    private levelSelectList!: Node;
    private levelSelectListOpacity!: UIOpacity;
    private levelSelectContent!: Node;
    private levelSelectDimBackground!: Node;
    private levelSelectPanelFallbackGraphics!: Graphics;
    private levelSelectProgressArea!: Node;
    private levelSelectProgressFallbackGraphics!: Graphics;
    private levelSelectProgressLabel!: Label;
    private readonly levelSelectProgressSteps: Node[] = [];
    private levelSelectPaginationArea!: Node;
    private levelSelectPreviousPageButton!: ButtonView;
    private levelSelectNextPageButton!: ButtonView;
    private levelSelectPageLabel!: Label;
    private levelSelectPage = 0;
    private levelSelectBackButton!: ButtonView;
    private levelSelectConfirmButton!: ButtonView;
    private pendingLevelSelection?: number;
    private levelSelectStartLocked = false;
    private levelSelectDebugResetButton?: ButtonView;
    private levelSelectDebugConfirmPanel?: Node;
    private levelSelectPanelSprite?: Sprite;
    private levelSelectOverlaySprite?: Sprite;
    private levelSelectProgressSprite?: Sprite;
    private readonly levelCards = new Map<number, LevelCardView>();
    private audioManager!: AudioManager;
    private audioUnlockHint?: Node;
    private readonly handleBgmPlaybackStarted = (): void => {
        this.refreshAudioUnlockHint();
    };

    onLoad(): void {
        if (!this.node.getComponent(Canvas)) {
            console.error('[WolfSheepBattle] GameController 必须挂在 Canvas 节点上。');
            return;
        }

        WeChatShareManager.initialize(GAME_VERSION);

        this.screenAdapter = this.node.getComponent(LandscapeScreenAdapter)
            ?? this.node.addComponent(LandscapeScreenAdapter);
        this.screenMetrics = this.screenAdapter.initialize();
        this.screenAdapter.subscribe(this.handleLandscapeLayoutChanged);
        game.on(Game.EVENT_HIDE, this.handleLevelOneTutorialGameHide, this);
        game.on(Game.EVENT_SHOW, this.handleLevelOneTutorialGameShow, this);
        const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        transform.setContentSize(this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);
        this.audioManager = AudioManager.getOrCreate();
        this.audioManager.registerClips(this.audioClips);
        this.audioManager.onBgmPlaybackStarted(this.handleBgmPlaybackStarted);
        this.audioManager.preloadMenuBgm();
        this.audioManager.preloadBattleBgm();
        this.audioManager.requestMenuBgm();
        this.loadLevelProgress();
        this.buildGame();
        this.applyResponsiveLandscapeLayout(this.screenMetrics);
        void this.initializePilotArt();
    }

    update(deltaTime: number): void {
        this.updateArtLoadingPresentation(Math.max(0, deltaTime));
        if (this.tutorialSimulationFrozen) {
            this.updateLevelOneTutorialSimulation(Math.max(0, deltaTime));
            return;
        }
        if (!this.isStarted || this.isFinished || this.isPaused) {
            return;
        }

        this.playerSpawnCooldown = Math.max(0, this.playerSpawnCooldown - deltaTime);
        this.statusToastRemaining = Math.max(0, this.statusToastRemaining - deltaTime);
        this.aiDeployNoticeCooldown = Math.max(0, this.aiDeployNoticeCooldown - deltaTime);
        if (this.statusToastRemaining <= 0 && this.statusToast?.active) {
            this.statusToast.active = false;
        }
        this.aiDecisionCooldown -= deltaTime;
        this.battleElapsedSeconds += deltaTime;
        this.playerSprintRemaining = Math.max(0, this.playerSprintRemaining - deltaTime);
        this.aiSprintRemaining = Math.max(0, this.aiSprintRemaining - deltaTime);
        this.playerSprintCooldown = Math.max(0, this.playerSprintCooldown - deltaTime);
        this.aiSprintCooldown = Math.max(0, this.aiSprintCooldown - deltaTime);
        this.playerHealCooldown = Math.max(0, this.playerHealCooldown - deltaTime);
        this.aiHealCooldown = Math.max(0, this.aiHealCooldown - deltaTime);
        this.playerFreezeCooldown = Math.max(0, this.playerFreezeCooldown - deltaTime);
        this.playerEnergySurgeRemaining = Math.max(0, this.playerEnergySurgeRemaining - deltaTime);
        this.playerEnergySurgeCooldown = Math.max(0, this.playerEnergySurgeCooldown - deltaTime);
        this.playerSupplyBoostRemaining = Math.max(0, this.playerSupplyBoostRemaining - deltaTime);
        this.playerSupplyBoostCooldown = Math.max(0, this.playerSupplyBoostCooldown - deltaTime);
        this.updateLevelSixGoldenSupply(deltaTime);
        const level = this.getCurrentLevelConfig();
        const previousPlayerEnergy = this.playerEnergy;
        const previousAiEnergy = this.aiEnergy;
        const playerRecoveryMultiplier = (level.playerEnergyRecoveryMultiplier ?? 1)
            * (this.playerEnergySurgeRemaining > 0 ? ENERGY_SURGE_RECOVERY_MULTIPLIER : 1);
        const aiRecoveryMultiplier = level.aiEnergyRecoveryMultiplier ?? 1;
        this.playerEnergy = Math.min(
            ENERGY_MAX,
            this.playerEnergy + ENERGY_RECOVERY_PER_SECOND * playerRecoveryMultiplier * deltaTime,
        );
        this.aiEnergy = Math.min(
            ENERGY_MAX,
            this.aiEnergy + ENERGY_RECOVERY_PER_SECOND * aiRecoveryMultiplier * deltaTime,
        );

        if (this.aiDecisionCooldown <= 0) {
            this.aiDecisionCooldown += this.trySpawnAIUnit();
        }

        this.updateEnergyBars(deltaTime);
        this.updateUnits(deltaTime);
        this.processPendingSmallDeployments();
        this.updateLevelFiveEnergyFeedback(deltaTime, previousPlayerEnergy, previousAiEnergy);
        this.updateLaneSpawnMarkers(deltaTime);
        this.updateUnitVisuals(deltaTime);
        this.updateBattleVfx(deltaTime);
        this.updatePilotVfx(deltaTime);
        this.updatePilotAIGate(deltaTime);
        this.updateBaseHitFeedback(deltaTime);
        this.updateSupplyPoints(deltaTime);
        this.tacticDisplayRefreshCooldown -= deltaTime;
        if (this.tacticDisplayRefreshCooldown <= 0) {
            this.tacticDisplayRefreshCooldown = TACTIC_DYNAMIC_REFRESH_INTERVAL;
            this.refreshTacticCards();
        }
        this.tryUseAITacticCards();
        this.tryUseAIShock();
        this.updateFeedbackEffects(deltaTime);
        this.hudRefreshCooldown -= deltaTime;
        if (this.hudRefreshCooldown <= 0) {
            this.hudRefreshCooldown = HUD_DYNAMIC_REFRESH_INTERVAL;
            this.refreshHud();
        }
    }

    private buildGame(): void {
        this.fullscreenBackgroundRoot = this.createLayerUnder(
            this.node,
            'FullscreenBackgroundRoot',
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
        );
        this.gameLayer = new Node('GameLayer');
        this.gameLayer.setParent(this.node);
        this.gameLayer.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.battleLayer = this.createLayerUnder(this.gameLayer, 'BattleLayer');
        this.battlefieldBackgroundLayer = this.createLayerUnder(
            this.fullscreenBackgroundRoot,
            'BattlefieldBackground',
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
        );
        this.laneVisualsLayer = this.createChildLayer(this.battleLayer, 'LaneVisuals');
        this.basesAndSpawnGatesLayer = this.createChildLayer(this.battleLayer, 'BasesAndSpawnGates');
        this.unitsAndVfxLayer = this.createChildLayer(this.battleLayer, 'UnitsAndVfx');
        this.battleInputLayer = this.createChildLayer(this.gameLayer, 'BattleInputLayer');
        this.safeUiRoot = this.createLayerUnder(
            this.node,
            'SafeUIRoot',
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
        );
        this.hudLayer = this.createLayerUnder(this.safeUiRoot, 'HudLayer',
            this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);
        this.toastLayer = this.createLayerUnder(this.safeUiRoot, 'ToastLayer',
            this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);
        this.modalLayer = this.createLayerUnder(this.node, 'ModalLayer',
            this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);

        this.createLaneCenterAnchors();
        this.drawBoard();
        this.createPilotArtSlots();
        this.createLaneNumberBadges();
        this.createLaneEffectVisuals();
        this.createBaseBars();
        this.createSupplyPoints();
        this.createHud();
        this.createFreezeLaneSelectionControls();
        this.createLaneSpawnZones();
        this.createUnitTypeButtons();
        this.createTacticButtons();
        this.createLevelFiveRushNotice();
        this.createLevelSixGoldenHud();
        this.createBattleLevelBadge();
        this.createResultPanel();
        this.createStartPanel();
        this.createLevelSelectPanel();
        this.createTutorialPanel();
        this.createSpecialRoadTutorialPanel();
        this.createLevelFiveTutorialPanel();
        this.createTacticDeckPanel();
        this.createPauseControls();
        this.createArtLoadingPanel();
        this.createAudioUnlockHint();
        this.refreshStartPanel();
        this.refreshLevelSelectPanel();
        this.refreshHud(this.statusMessage);
    }

    private createLayerUnder(parent: Node, name: string, width = DESIGN_WIDTH, height = DESIGN_HEIGHT): Node {
        const layer = new Node(name);
        layer.setParent(parent);
        layer.addComponent(UITransform).setContentSize(width, height);
        return layer;
    }

    private createChildLayer(parent: Node, name: string): Node {
        const layer = new Node(name);
        layer.setParent(parent);
        layer.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        return layer;
    }

    private createSoftGroundShadow(parent: Node, width: number, height: number, y: number): Node {
        const shadow = this.createGraphicsNode('SoftGroundShadow', width, height, 0, y, parent);
        const graphics = shadow.getComponent(Graphics)!;
        const layers = [
            { scale: 1, alpha: 24 },
            { scale: 0.78, alpha: 25 },
            { scale: 0.56, alpha: 22 },
        ] as const;
        for (const layer of layers) {
            const layerWidth = width * layer.scale;
            const layerHeight = height * layer.scale;
            graphics.fillColor = new Color(67, 82, 53, layer.alpha);
            graphics.roundRect(-layerWidth / 2, -layerHeight / 2,
                layerWidth, layerHeight, layerHeight / 2);
            graphics.fill();
        }
        shadow.setSiblingIndex(0);
        return shadow;
    }

    private readonly handleLandscapeLayoutChanged = (metrics: LandscapeLayoutMetrics): void => {
        this.applyResponsiveLandscapeLayout(metrics);
    };

    private readonly handleLevelOneTutorialGameHide = (): void => {
        if (!this.tutorialFlowActive) return;
        this.tutorialInteractionLocked = false;
        this.clearLevelOneTutorialPointer();
    };

    private readonly handleLevelOneTutorialGameShow = (): void => {
        if (!this.tutorialFlowActive) return;
        this.tutorialInteractionLocked = false;
        this.clearLevelOneTutorialPointer();
        this.refreshLevelOneTutorialPresentation();
    };

    private applyResponsiveLandscapeLayout(metrics: LandscapeLayoutMetrics): void {
        this.screenMetrics = metrics;
        this.node.getComponent(UITransform)?.setContentSize(metrics.visibleWidth, metrics.visibleHeight);
        for (const layer of [this.fullscreenBackgroundRoot, this.battlefieldBackgroundLayer,
            this.safeUiRoot, this.hudLayer, this.toastLayer, this.modalLayer]) {
            layer?.getComponent(UITransform)?.setContentSize(metrics.visibleWidth, metrics.visibleHeight);
        }
        this.rightControlBar?.getComponent(UITransform)?.setContentSize(
            FUNCTION_SIDEBAR_WIDTH,
            metrics.visibleHeight,
        );

        this.resizeBattlefieldBackgroundToCover();
        const board = this.battlefieldBackgroundLayer?.getChildByName('Board');
        if (board?.isValid) this.redrawBoardFallback(board, metrics.visibleWidth, metrics.visibleHeight);
        const loadingFallback = this.artLoadingPanel?.getChildByName('LoadingFallbackBackground');
        if (loadingFallback?.isValid) this.redrawLoadingFallback(loadingFallback);

        if (this.levelBadge?.isValid) {
            this.levelBadge.setPosition(metrics.safeLeft + HUD_SAFE_MARGIN + LEVEL_BADGE_WIDTH / 2, LEVEL_BADGE_Y, 0);
        }
        if (this.goldenSupplyPanel?.isValid) {
            this.goldenSupplyPanel.setPosition(metrics.safeLeft + HUD_SAFE_MARGIN + 108, 232, 0);
        }
        if (this.goldenSupplyNotice?.isValid) {
            this.goldenSupplyNotice.setPosition(BATTLEFIELD_CENTER_X, 218, 0);
        }

        const sidebarX = metrics.safeRight - HUD_SAFE_MARGIN - FUNCTION_SIDEBAR_WIDTH / 2;
        this.rightControlBar?.setPosition(sidebarX, 0, 0);

        const safeTopPauseY = metrics.safeTop - HUD_SAFE_MARGIN - PAUSE_BUTTON_HEIGHT / 2;
        let pauseY = Math.min(PAUSE_BUTTON_Y, safeTopPauseY);
        if (metrics.capsule) {
            const logicalPixelsPerPhysicalPixel = metrics.visibleHeight
                / Math.max(1, metrics.screenPixelHeight);
            const capsuleGap = WECHAT_CAPSULE_SAFE_GAP_PHYSICAL_PX * logicalPixelsPerPhysicalPixel;
            pauseY = Math.min(
                pauseY,
                metrics.capsule.bottom - capsuleGap - PAUSE_BUTTON_HEIGHT / 2,
            );
        }
        const tacticHeaderY = pauseY - PAUSE_BUTTON_HEIGHT / 2
            - PAUSE_TACTIC_VERTICAL_GAP - TACTIC_HEADER_HEIGHT / 2;
        const tacticFirstCardY = tacticHeaderY - TACTIC_HEADER_HEIGHT / 2
            - 8 - TACTIC_CARD_HEIGHT / 2;

        this.pauseButton?.node.setPosition(PAUSE_BUTTON_X, pauseY, 0);
        this.rightControlBar?.getChildByName('TacticSidebarHeader')?.setPosition(
            0, tacticHeaderY, 0);
        if (this.playerFreezeCard) {
            this.applyCurrentTacticDeckLayout(tacticFirstCardY);
        }

        this.playerHudY = Math.max(
            PLAYER_HUD_Y - 16,
            metrics.safeBottom + HUD_SAFE_MARGIN + PLAYER_HUD_VISIBLE_HALF_HEIGHT,
        );
        this.applyBattleHudColumnLayout();
        if (this.unitCardSidebar?.isValid) {
            const sidebarX = metrics.safeLeft + HUD_SAFE_MARGIN + UNIT_CARD_SIDEBAR_WIDTH / 2;
            const sidebarBottom = this.playerHudY + PLAYER_HUD_VISIBLE_HALF_HEIGHT + HUD_SAFE_MARGIN;
            this.unitCardSidebar.setPosition(
                sidebarX,
                sidebarBottom + UNIT_CARD_SIDEBAR_HEIGHT / 2,
                0,
            );
        }
        this.auditBottomHudClearance(metrics);

        this.updateCapsuleExclusion(metrics);
        for (const panel of this.modalLayer?.children ?? []) {
            if (panel !== this.audioUnlockHint) {
                panel.getComponent(UITransform)?.setContentSize(metrics.visibleWidth, metrics.visibleHeight);
            }
        }
        for (const [backdrop, color] of this.fullscreenBackdropColors) {
            if (backdrop.isValid) this.redrawFullscreenBackdrop(backdrop, color);
        }
        this.positionModalContentsInSafeArea(metrics);
        this.audioUnlockHint?.setPosition(metrics.safeCenterX, metrics.safeBottom + 30, 0);
        this.resizeNamedFullscreenArt();
        this.ensureOverlayLayerOrder();
        if (this.tutorialFlowActive) {
            this.refreshLevelOneTutorialPresentation();
        }

        console.info('[LandscapeScreenAdapter] 布局已更新。', {
            mode: metrics.mode,
            visible: `${metrics.visibleWidth.toFixed(1)}x${metrics.visibleHeight.toFixed(1)}`,
            safe: [metrics.safeLeft, metrics.safeRight, metrics.safeBottom, metrics.safeTop].map((v) => Number(v.toFixed(1))),
            capsule: metrics.capsule,
        });
    }

    private updateCapsuleExclusion(metrics: LandscapeLayoutMetrics): void {
        if (!metrics.capsule) {
            if (this.capsuleExclusion?.isValid) this.capsuleExclusion.active = false;
            return;
        }
        if (!this.capsuleExclusion?.isValid) {
            this.capsuleExclusion = new Node('WeChatCapsuleExclusion');
            this.capsuleExclusion.setParent(this.safeUiRoot);
            this.capsuleExclusion.addComponent(UITransform);
            this.capsuleExclusion.addComponent(BlockInputEvents);
        }
        const capsule = metrics.capsule;
        this.capsuleExclusion.active = true;
        this.capsuleExclusion.setPosition((capsule.left + capsule.right) * 0.5,
            (capsule.top + capsule.bottom) * 0.5, 0);
        this.capsuleExclusion.getComponent(UITransform)?.setContentSize(
            capsule.width + HUD_SAFE_MARGIN * 2,
            capsule.height + HUD_SAFE_MARGIN * 2,
        );
        this.capsuleExclusion.setSiblingIndex(this.safeUiRoot.children.length - 1);
    }

    private resizeBattlefieldBackgroundToCover(): void {
        if (!this.battleBackgroundSlot?.isValid || !this.screenMetrics) return;
        this.setNodeCoverSize(this.battleBackgroundSlot, this.battleBackgroundSourceAspect);
    }

    private setNodeCoverSize(node: Node, sourceAspect: number): void {
        if (!node?.isValid || !this.screenMetrics) return;
        const visibleAspect = this.screenMetrics.visibleWidth / this.screenMetrics.visibleHeight;
        const width = visibleAspect >= sourceAspect
            ? this.screenMetrics.visibleWidth : this.screenMetrics.visibleHeight * sourceAspect;
        const height = visibleAspect >= sourceAspect
            ? this.screenMetrics.visibleWidth / sourceAspect : this.screenMetrics.visibleHeight;
        node.getComponent(UITransform)?.setContentSize(width, height);
        node.setPosition(0, 0, 0);
        node.setScale(1, 1, 1);
    }

    private resizeNamedFullscreenArt(): void {
        if (!this.screenMetrics) return;
        const coverNames = new Set([
            'LoadingBackgroundArt', 'SplashArt', 'ResultAtmosphereArt',
            'TransitionBackground', 'TransitionWipe',
        ]);
        for (const transform of this.node.getComponentsInChildren(UITransform)) {
            if (coverNames.has(transform.node.name)) {
                this.setNodeCoverSize(transform.node, transform.node.name === 'LoadingBackgroundArt'
                    ? LOADING_BACKGROUND_ASPECT : DESIGN_WIDTH / DESIGN_HEIGHT);
            }
            if (transform.node.name === 'OverlaySprite') {
                transform.setContentSize(this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);
                transform.node.setPosition(0, 0, 0);
                transform.node.setScale(1, 1, 1);
            }
        }
    }

    private positionModalContentsInSafeArea(metrics: LandscapeLayoutMetrics): void {
        const fullscreenNames = new Set([
            'FullscreenBackdrop', 'DimBackground', 'LoadingFallbackBackground', 'LoadingBackgroundArt',
            'ResultBackdrop', 'ResultAtmosphereArt', 'SplashArt',
            'TransitionBackground', 'TransitionWipe',
            'LevelOneTutorialDim', 'LevelOneTutorialHighlight', 'LevelOneTutorialArrow',
        ]);
        for (const panel of this.modalLayer?.children ?? []) {
            for (const child of panel.children) {
                if (fullscreenNames.has(child.name)) continue;
                let base = this.modalContentBasePositions.get(child);
                if (!base) {
                    base = child.position.clone();
                    this.modalContentBasePositions.set(child, base);
                }
                child.setPosition(base.x + metrics.safeCenterX, base.y + metrics.safeCenterY, base.z);
            }
        }
    }

    private redrawFullscreenBackdrop(node: Node, color: Color): void {
        if (!this.screenMetrics || !node?.isValid) return;
        const width = this.screenMetrics.visibleWidth;
        const height = this.screenMetrics.visibleHeight;
        node.getComponent(UITransform)?.setContentSize(width, height);
        const graphics = node.getComponent(Graphics);
        if (!graphics) return;
        graphics.clear();
        graphics.fillColor = color;
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();
    }

    private createLaneCenterAnchors(): void {
        const laneCenterY = (LANE_BOTTOM_Y + LANE_TOP_Y) * 0.5;
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const anchor = new Node(`LaneCenterAnchor${lane + 1}`);
            anchor.setParent(this.laneVisualsLayer);
            anchor.setPosition(LANE_X[lane], 0, 0);
            anchor.addComponent(UITransform).setContentSize(1, LANE_LENGTH);
            this.laneCenterAnchors[lane] = anchor;

            const debugLine = this.createGraphicsNode(
                'DebugCenterLine',
                2,
                LANE_LENGTH,
                0,
                laneCenterY,
                anchor,
            );
            const graphics = debugLine.getComponent(Graphics)!;
            graphics.lineWidth = 2;
            graphics.strokeColor = new Color(255, 63, 75, 220);
            graphics.moveTo(0, -LANE_LENGTH / 2);
            graphics.lineTo(0, LANE_LENGTH / 2);
            graphics.stroke();
            debugLine.active = DEBUG_LANE_CENTER_LINES && BATTLEFIELD_VISUAL_MODE === 'topdown_v02';
        }
    }

    private getLaneCenterX(lane: number): number {
        return this.laneCenterAnchors[lane]?.position.x ?? LANE_X[lane];
    }

    private drawBoard(): void {
        const board = this.createGraphicsNode('Board', this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight, 0, 0, this.battlefieldBackgroundLayer);
        this.redrawBoardFallback(board, this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);
    }

    private redrawBoardFallback(board: Node, width: number, height: number): void {
        const graphics = board.getComponent(Graphics)!;
        const wasEnabled = graphics.enabled;
        graphics.clear();
        graphics.fillColor = new Color(83, 126, 74, 255);
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();

        graphics.fillColor = new Color(108, 143, 89, 255);
        graphics.roundRect(-DESIGN_WIDTH / 2 + 10, -250, DESIGN_WIDTH - 20, 520, 28);
        graphics.fill();

        graphics.lineWidth = 4;
        graphics.strokeColor = new Color(105, 126, 150, 255);
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const laneX = this.getLaneCenterX(lane);
            graphics.roundRect(laneX - LANE_WIDTH / 2, LANE_BOTTOM_Y, LANE_WIDTH, LANE_LENGTH, 22);
            graphics.stroke();

            graphics.lineWidth = 2;
            graphics.strokeColor = new Color(88, 107, 128, 180);
            graphics.moveTo(laneX, LANE_BOTTOM_Y + 20);
            graphics.lineTo(laneX, LANE_TOP_Y - 20);
            graphics.stroke();
            graphics.lineWidth = 4;
            graphics.strokeColor = new Color(105, 126, 150, 255);
        }
        graphics.enabled = wasEnabled;
    }

    private createPilotArtSlots(): void {
        if (!ART_PILOT_ENABLED) {
            return;
        }
        const laneCenterY = (LANE_BOTTOM_Y + LANE_TOP_Y) * 0.5;
        const lanesToCreate = ART_FULL_ENABLED ? LANE_X.length : 1;
        if (ART_FULL_ENABLED) {
            const background = this.createSpriteSlot('FormalBattleBackground', this.battlefieldBackgroundLayer, DESIGN_WIDTH, DESIGN_HEIGHT, 0, 0);
            background.node.setSiblingIndex(0);
            this.battleBackgroundSlot = background.node;
            this.battleBackgroundSprite = background.sprite;

            const aiBase = this.createSpriteSlot('FormalAIBase', this.basesAndSpawnGatesLayer, 760, 285, BATTLEFIELD_CENTER_X, 390);
            aiBase.node.setSiblingIndex(1);
            this.aiBaseArtSlot = aiBase.node;
            this.aiBaseArtSprite = aiBase.sprite;
            const playerBase = this.createSpriteSlot('FormalPlayerBase', this.basesAndSpawnGatesLayer, 760, 285, BATTLEFIELD_CENTER_X, -390);
            playerBase.node.setSiblingIndex(1);
            this.playerBaseArtSlot = playerBase.node;
            this.playerBaseArtSprite = playerBase.sprite;
        }
        for (let lane = 0; lane < lanesToCreate; lane += 1) {
            const laneX = this.getLaneCenterX(lane);
            const laneSlot = this.createSpriteSlot(
                `LaneArt${lane + 1}`,
                this.laneVisualsLayer,
                LANE_WIDTH,
                LANE_LENGTH,
                laneX,
                laneCenterY,
            );
            this.laneArtSlots[lane] = laneSlot.node;
            this.laneArtSprites[lane] = laneSlot.sprite;

            const aiGateRoot = new Node(`AISpawnGateRoot${lane + 1}`);
            aiGateRoot.setParent(this.basesAndSpawnGatesLayer);
            aiGateRoot.setPosition(laneX, AI_GATE_GROUND_Y, 0);
            const aiGateRootTransform = aiGateRoot.addComponent(UITransform);
            aiGateRootTransform.setContentSize(SPAWN_GATE_VISUAL_SIZE, SPAWN_GATE_VISUAL_SIZE);
            aiGateRootTransform.setAnchorPoint(0.5, 0);
            this.createSoftGroundShadow(aiGateRoot, 58, 12, 2);
            const aiGateVisual = this.createSpriteSlot(
                'GateVisual',
                aiGateRoot,
                SPAWN_GATE_VISUAL_SIZE,
                SPAWN_GATE_VISUAL_SIZE,
                AI_GATE_VISUAL_OFFSET_X,
                0,
                0.5,
                0,
            );
            this.aiSpawnGateSlots[lane] = aiGateRoot;
            this.aiSpawnGateSprites[lane] = aiGateVisual.sprite;
        }
    }

    private async initializePilotArt(): Promise<void> {
        if (!ART_PILOT_ENABLED) {
            return;
        }
        const generation = ++this.artPilotLoadGeneration;
        const summary = await this.artResourceManager.preload((completed, total) => {
            this.updateArtLoadingProgress(completed, total);
        });
        if (generation !== this.artPilotLoadGeneration || !this.node.isValid) {
            return;
        }
        this.applyPilotStaticArt();
        if (ART_FULL_ENABLED) {
            await this.loadFormalUiFont(generation);
        }
        for (const unit of [...this.units, ...this.dyingUnits]) {
            this.tryBindPilotUnitArt(unit);
            this.tryBindUnitGroundShadow(unit);
        }
        this.finishArtLoading(summary.failed.length);
        console.info(`[Art:${ART_PILOT_BATCH}] 正式美术已应用。`, {
            loaded: summary.loaded,
            failed: summary.failed.length,
            mode: ART_RENDER_MODE,
        });
    }

    private applyPilotStaticArt(): void {
        const roadKeys = [
            ArtPilotResourceKey.RoadLane01,
            ArtPilotResourceKey.RoadLane02,
            ArtPilotResourceKey.RoadLane03,
            ArtPilotResourceKey.RoadLane04,
        ];
        const laneCount = ART_FULL_ENABLED ? LANE_X.length : 1;
        for (let lane = 0; lane < laneCount; lane += 1) {
            const roadFrame = this.artResourceManager.getFrame(roadKeys[lane]);
            const slot = this.laneArtSlots[lane];
            const sprite = this.laneArtSprites[lane];
            if (roadFrame && slot?.isValid && sprite && BATTLEFIELD_VISUAL_MODE === 'legacy_v01') {
                sprite.spriteFrame = roadFrame;
                slot.active = true;
            } else if (slot?.isValid) {
                slot.active = false;
            }
        }

        for (let lane = 0; lane < laneCount; lane += 1) {
            const laneMarker = this.laneSpawnMarkers[lane];
            if (laneMarker) {
                this.applyPilotSpawnMarkerFrame(laneMarker, laneMarker.visualState);
            }
        }
        this.updatePilotAIGate(0);

        for (const supplyPoint of this.supplyPoints) {
            if (ART_FULL_ENABLED || supplyPoint.lane === ART_PILOT_LANE_INDEX) {
                supplyPoint.artStateIndex = -1;
                this.drawSupplyPoint(supplyPoint);
            }
        }

        const tierBadgeKeys: Readonly<Record<SheepType, ArtPilotResourceKey>> = {
            [SheepType.Small]: ArtPilotResourceKey.TierBadgeSmall,
            [SheepType.Medium]: ArtPilotResourceKey.TierBadgeMedium,
            [SheepType.Large]: ArtPilotResourceKey.TierBadgeLarge,
            [SheepType.Giant]: ArtPilotResourceKey.TierBadgeGiant,
        };
        for (const type of UNIT_ORDER) {
            const button = this.typeButtons.get(type);
            if (button) {
                const tierBadgeArt = this.applyChildSprite(
                    button.tierBadgeNode,
                    'TierBadgeArt',
                    tierBadgeKeys[type],
                    24,
                    24,
                );
                if (tierBadgeArt) {
                    button.tierBadgeGraphics.enabled = false;
                    tierBadgeArt.node.setSiblingIndex(0);
                    button.tierBadgeLabel.node.setSiblingIndex(button.tierBadgeNode.children.length - 1);
                }
            }
        }
        this.lastUnitButtonState = '';
        this.refreshUnitTypeButtons();

        if (ART_FULL_ENABLED) {
            this.applyFullStaticArt();
        }
        this.applyResponsiveLandscapeLayout(this.screenMetrics);
    }

    private createArtLoadingPanel(): void {
        if (!ART_PILOT_ENABLED) {
            return;
        }
        const panel = new Node('ArtLoadingPanel');
        panel.setParent(this.modalLayer);
        panel.addComponent(UITransform).setContentSize(this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);
        panel.addComponent(BlockInputEvents);
        panel.addComponent(UIOpacity).opacity = 255;

        const fallback = this.createGraphicsNode('LoadingFallbackBackground', this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight, 0, 0, panel);
        fallback.setSiblingIndex(0);
        this.redrawLoadingFallback(fallback);

        if (this.loadingBackgroundFrame) {
            const background = this.createSpriteSlot('LoadingBackgroundArt', panel, 1600, 720, 0, 0);
            background.sprite.spriteFrame = this.loadingBackgroundFrame;
            background.node.active = true;
            background.node.setSiblingIndex(1);
            this.setNodeCoverSize(background.node, LOADING_BACKGROUND_ASPECT);
        }

        const content = this.createLayerUnder(panel, 'LoadingContentRoot', 960, 680);
        content.setSiblingIndex(panel.children.length - 1);

        const title = this.createLabel(content, 'LoadingTitle', GAME_NAME, 0, 238, 820, 90, 66,
            new Color(105, 65, 28, 255));
        this.applyLoadingUiFont(title);
        title.overflow = Label.Overflow.SHRINK;
        const titleOutline = title.node.addComponent(LabelOutline);
        titleOutline.color = new Color(255, 239, 184, 255);
        titleOutline.width = 5;

        const subtitle = this.createLabel(content, 'LoadingSubtitle', '青青草原四线争夺战', 0, 178, 620, 38, 24,
            new Color(56, 105, 65, 255));
        this.applyLoadingUiFont(subtitle);
        subtitle.overflow = Label.Overflow.SHRINK;

        const sheepShadow = this.createGraphicsNode('LoadingSheepShadow', 138, 26, -155, LOADING_MASCOT_SHADOW_Y, content);
        sheepShadow.getComponent(Graphics)!.fillColor = new Color(57, 93, 52, 55);
        sheepShadow.getComponent(Graphics)!.ellipse(0, 0, 69, 13);
        sheepShadow.getComponent(Graphics)!.fill();
        const wolfShadow = this.createGraphicsNode('LoadingWolfShadow', 138, 26, 155, LOADING_MASCOT_SHADOW_Y, content);
        wolfShadow.getComponent(Graphics)!.fillColor = new Color(57, 93, 52, 55);
        wolfShadow.getComponent(Graphics)!.ellipse(0, 0, 69, 13);
        wolfShadow.getComponent(Graphics)!.fill();

        if (this.loadingMascotSheepFrame) {
            const sheep = this.createSpriteSlot('LoadingMascotSheep', content,
                LOADING_MASCOT_DISPLAY_SIZE, LOADING_MASCOT_DISPLAY_SIZE, -155, LOADING_MASCOT_CENTER_Y);
            sheep.sprite.spriteFrame = this.loadingMascotSheepFrame;
            sheep.node.active = true;
            this.artLoadingSheepNode = sheep.node;
        }
        if (this.loadingMascotWolfFrame) {
            const wolf = this.createSpriteSlot('LoadingMascotWolf', content,
                LOADING_MASCOT_DISPLAY_SIZE, LOADING_MASCOT_DISPLAY_SIZE, 155, LOADING_MASCOT_CENTER_Y);
            wolf.sprite.spriteFrame = this.loadingMascotWolfFrame;
            wolf.node.active = true;
            this.artLoadingWolfNode = wolf.node;
        }

        this.artLoadingLabel = this.createLabel(content, 'LoadingProgressText', '正在准备四线战场… 0%',
            0, -87, 680, 38, 23, new Color(72, 82, 46, 255));
        this.applyLoadingUiFont(this.artLoadingLabel);
        this.artLoadingLabel.overflow = Label.Overflow.SHRINK;

        const barTrack = this.createGraphicsNode('LoadingProgressTrackFallback', 584, 42, 0, -142, content);
        const barGraphics = barTrack.getComponent(Graphics)!;
        barGraphics.fillColor = new Color(113, 77, 40, 82);
        barGraphics.roundRect(-292, -21, 584, 42, 21);
        barGraphics.fill();
        barGraphics.fillColor = new Color(255, 239, 199, 245);
        barGraphics.roundRect(-284, -15, 568, 30, 15);
        barGraphics.fill();

        const fallbackFill = this.createGraphicsNode('LoadingProgressFillFallback',
            LOADING_PROGRESS_WIDTH, 22, -LOADING_PROGRESS_WIDTH / 2, -142, content);
        fallbackFill.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        const fallbackFillGraphics = fallbackFill.getComponent(Graphics)!;
        fallbackFillGraphics.fillColor = new Color(105, 215, 180, 255);
        fallbackFillGraphics.roundRect(0, -11, LOADING_PROGRESS_WIDTH, 22, 11);
        fallbackFillGraphics.fill();
        fallbackFill.setScale(0, 1, 1);
        this.artLoadingFillFallback = fallbackFill;

        if (this.loadingProgressFrame) {
            const frame = this.createSpriteSlot('LoadingProgressFrameArt', content, 620, 116, 0, -142);
            frame.sprite.spriteFrame = this.loadingProgressFrame;
            frame.node.active = true;
        }
        if (this.loadingProgressFillFrame) {
            const fill = this.createSpriteSlot('LoadingProgressFillArt', content,
                LOADING_PROGRESS_WIDTH, 26, 0, -142);
            fill.sprite.spriteFrame = this.loadingProgressFillFrame;
            fill.sprite.type = Sprite.Type.FILLED;
            fill.sprite.fillType = Sprite.FillType.HORIZONTAL;
            fill.sprite.fillStart = 0;
            fill.sprite.fillRange = 0;
            fill.node.active = true;
            this.artLoadingFillSprite = fill.sprite;
        }

        if (this.loadingTipPanelFrame) {
            const tipPanel = this.createSpriteSlot('LoadingTipPanelArt', content, 760, 76, 0, -222);
            tipPanel.sprite.spriteFrame = this.loadingTipPanelFrame;
            tipPanel.node.active = true;
        } else {
            const tipPanel = this.createGraphicsNode('LoadingTipPanelFallback', 760, 70, 0, -222, content);
            const tipGraphics = tipPanel.getComponent(Graphics)!;
            tipGraphics.fillColor = new Color(255, 250, 224, 222);
            tipGraphics.roundRect(-380, -35, 760, 70, 28);
            tipGraphics.fill();
            tipGraphics.lineWidth = 2;
            tipGraphics.strokeColor = new Color(201, 154, 73, 225);
            tipGraphics.roundRect(-380, -35, 760, 70, 28);
            tipGraphics.stroke();
        }
        this.artLoadingTipLabel = this.createLabel(content, 'LoadingTipText', LOADING_TIPS[0],
            0, -222, 650, 52, 18, new Color(91, 79, 51, 255));
        this.applyLoadingUiFont(this.artLoadingTipLabel);
        this.artLoadingTipLabel.overflow = Label.Overflow.SHRINK;
        this.artLoadingTipOpacity = this.artLoadingTipLabel.node.addComponent(UIOpacity);
        this.artLoadingTipOpacity.opacity = 255;

        this.artLoadingRetryButton = this.createButton(content, 'ArtLoadingRetryButton', '重新尝试', -105, -296,
            180, 48, 18, () => { void this.retryFailedArtLoad(); });
        this.artLoadingContinueButton = this.createButton(content, 'ArtLoadingContinueButton', '进入基础画面', 115, -296,
            200, 48, 18, () => this.continueAfterArtFailure());
        this.applyLoadingUiFont(this.artLoadingRetryButton.label);
        this.applyLoadingUiFont(this.artLoadingContinueButton.label);
        this.drawButton(this.artLoadingRetryButton, new Color(86, 150, 81, 255), new Color(245, 232, 168, 255));
        this.drawButton(this.artLoadingContinueButton, new Color(166, 123, 70, 255), new Color(255, 239, 194, 255));
        this.artLoadingRetryButton.node.active = false;
        this.artLoadingContinueButton.node.active = false;
        this.artLoadingPanel = panel;
        this.resetArtLoadingProgress();
        panel.setSiblingIndex(this.modalLayer.children.length - 1);
    }

    private createAudioUnlockHint(): void {
        const label = this.createLabel(
            this.modalLayer,
            'AudioUnlockHint',
            '点击屏幕开启音乐',
            this.screenMetrics.safeCenterX,
            this.screenMetrics.safeBottom + 30,
            420,
            36,
            18,
            new Color(255, 246, 210, 255),
        );
        label.isBold = true;
        label.enableShadow = true;
        label.shadowColor = new Color(20, 27, 36, 210);
        label.shadowOffset = new Vec2(0, -2);
        const outline = label.node.addComponent(LabelOutline);
        outline.color = new Color(40, 58, 70, 220);
        outline.width = 2;
        this.audioUnlockHint = label.node;
        this.refreshAudioUnlockHint();
    }

    private refreshAudioUnlockHint(): void {
        if (!this.audioUnlockHint?.isValid) {
            return;
        }
        this.audioUnlockHint.active = this.audioManager.isMusicEnabled()
            && !this.audioManager.isBgmPlaybackConfirmed();
        if (this.audioUnlockHint.active) {
            this.audioUnlockHint.setSiblingIndex(this.modalLayer.children.length - 1);
        }
    }

    private redrawLoadingFallback(node: Node): void {
        if (!this.screenMetrics || !node?.isValid) return;
        const width = this.screenMetrics.visibleWidth;
        const height = this.screenMetrics.visibleHeight;
        node.getComponent(UITransform)?.setContentSize(width, height);
        const graphics = node.getComponent(Graphics);
        if (!graphics) return;
        graphics.clear();
        graphics.fillColor = new Color(173, 224, 245, 255);
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();
        const horizonY = height * 0.08;
        const meadowBands = [
            new Color(177, 222, 109, 255),
            new Color(154, 211, 91, 255),
            new Color(132, 196, 78, 255),
        ];
        meadowBands.forEach((color, index) => {
            const bandTop = horizonY - index * height * 0.13;
            graphics.fillColor = color;
            graphics.rect(-width / 2, -height / 2, width, bandTop + height / 2);
            graphics.fill();
        });
        graphics.strokeColor = new Color(242, 213, 133, 72);
        graphics.lineCap = Graphics.LineCap.ROUND;
        graphics.lineWidth = Math.max(22, width * 0.024);
        for (let lane = 0; lane < 4; lane += 1) {
            const bottomX = (lane - 1.5) * width * 0.17;
            const topX = (lane - 1.5) * width * 0.055;
            graphics.moveTo(bottomX, -height / 2);
            graphics.lineTo(topX, horizonY);
            graphics.stroke();
        }
        graphics.fillColor = new Color(255, 242, 188, 92);
        graphics.circle(0, height * 0.29, Math.min(width, height) * 0.08);
        graphics.fill();
    }

    private updateArtLoadingProgress(completed: number, total: number): void {
        const actualRatio = total > 0 ? Math.max(0, Math.min(1, completed / total)) : 0;
        const visibleTarget = actualRatio >= 1 ? 0.98 : actualRatio;
        this.artLoadingTargetProgress = Math.max(this.artLoadingTargetProgress, visibleTarget);
        this.artLoadingFailed = false;
    }

    private finishArtLoading(failedCount: number, onContinue?: () => void): void {
        if (!this.artLoadingPanel) {
            onContinue?.();
            return;
        }
        if (failedCount > 0) {
            console.warn(`[Art:${ART_PILOT_BATCH}] ${failedCount} 项资源加载失败，等待玩家重试或选择基础画面。`);
            this.artLoadingPendingContinue = onContinue;
            this.artLoadingCompletionPending = false;
            this.artLoadingFadeStarted = false;
            this.artLoadingFailed = true;
            if (this.artLoadingLabel) {
                this.artLoadingLabel.string = `有 ${failedCount} 项资源未能加载`;
            }
            if (this.artLoadingTipLabel && this.artLoadingTipOpacity) {
                Tween.stopAllByTarget(this.artLoadingTipOpacity);
                this.artLoadingTipOpacity.opacity = 255;
                this.artLoadingTipLabel.string = '请检查网络连接，然后点击“重新尝试”。';
            }
            if (this.artLoadingRetryButton && this.artLoadingContinueButton) {
                this.artLoadingRetryButton.node.active = true;
                this.artLoadingContinueButton.node.active = true;
            }
            this.artLoadingPanel.active = true;
            this.artLoadingPanel.setSiblingIndex(this.modalLayer.children.length - 1);
            return;
        }
        this.artLoadingRetryButton && (this.artLoadingRetryButton.node.active = false);
        this.artLoadingContinueButton && (this.artLoadingContinueButton.node.active = false);
        this.artLoadingFailed = false;
        this.artLoadingPendingContinue = onContinue;
        this.artLoadingTargetProgress = 1;
        this.artLoadingCompletionPending = true;
        if (this.artLoadingVisualProgress >= 0.999) {
            this.startArtLoadingFade();
        }
    }

    private async retryFailedArtLoad(): Promise<void> {
        if (!this.artLoadingPanel) return;
        this.artLoadingFailed = false;
        this.artLoadingRetryButton && (this.artLoadingRetryButton.node.active = false);
        this.artLoadingContinueButton && (this.artLoadingContinueButton.node.active = false);
        if (this.artLoadingTipLabel) {
            this.artLoadingTipLabel.string = '正在重新连接并校验资源…';
        }
        const summary = await this.artResourceManager.retryFailed((completed, total) => {
            this.updateArtLoadingProgress(completed, total);
        });
        if (!this.node.isValid) return;
        this.applyPilotStaticArt();
        for (const unit of [...this.units, ...this.dyingUnits]) {
            this.tryBindPilotUnitArt(unit);
        }
        this.finishArtLoading(summary.failed.length, this.artLoadingPendingContinue);
    }

    private continueAfterArtFailure(): void {
        const continuation = this.artLoadingPendingContinue;
        this.artLoadingPendingContinue = undefined;
        this.artLoadingFailed = false;
        if (this.artLoadingRetryButton && this.artLoadingContinueButton) {
            this.artLoadingRetryButton.node.active = false;
            this.artLoadingContinueButton.node.active = false;
        }
        this.finishArtLoading(0, continuation);
    }

    private updateArtLoadingPresentation(deltaTime: number): void {
        if (!this.artLoadingPanel?.active) return;
        const safeDelta = Math.min(0.1, deltaTime);
        this.artLoadingAnimationTime += safeDelta;
        const sheepPhase = Math.sin(this.artLoadingAnimationTime * 2.35);
        const wolfPhase = Math.sin(this.artLoadingAnimationTime * 2.35 + Math.PI);
        if (this.artLoadingSheepNode?.isValid) {
            this.artLoadingSheepNode.setPosition(-155, 35 + sheepPhase * 6, 0);
            const scale = 1 + sheepPhase * 0.018;
            this.artLoadingSheepNode.setScale(scale, scale, 1);
        }
        if (this.artLoadingWolfNode?.isValid) {
            this.artLoadingWolfNode.setPosition(155, 35 + wolfPhase * 6, 0);
            const scale = 1 + wolfPhase * 0.018;
            this.artLoadingWolfNode.setScale(scale, scale, 1);
        }

        if (!this.artLoadingFailed) {
            this.artLoadingTipElapsed += safeDelta;
            if (this.artLoadingTipElapsed >= LOADING_TIP_INTERVAL_SECONDS) {
                this.artLoadingTipElapsed = 0;
                this.rotateArtLoadingTip();
            }
        }

        if (this.artLoadingVisualProgress < this.artLoadingTargetProgress) {
            const interpolation = 1 - Math.exp(-LOADING_PROGRESS_SMOOTHING * safeDelta);
            this.artLoadingVisualProgress +=
                (this.artLoadingTargetProgress - this.artLoadingVisualProgress) * interpolation;
            if (this.artLoadingTargetProgress - this.artLoadingVisualProgress < 0.0005) {
                this.artLoadingVisualProgress = this.artLoadingTargetProgress;
            }
            this.applyArtLoadingVisualProgress(this.artLoadingVisualProgress);
        }
        if (this.artLoadingCompletionPending && this.artLoadingVisualProgress >= 0.999) {
            this.startArtLoadingFade();
        }
    }

    private applyArtLoadingVisualProgress(ratio: number): void {
        const clamped = Math.max(0, Math.min(1, ratio));
        if (this.artLoadingFillSprite) this.artLoadingFillSprite.fillRange = clamped;
        this.artLoadingFillFallback?.setScale(clamped, 1, 1);
        if (this.artLoadingLabel && !this.artLoadingFailed) {
            this.artLoadingLabel.string = `正在准备四线战场… ${Math.round(clamped * 100)}%`;
        }
    }

    private rotateArtLoadingTip(): void {
        if (!this.artLoadingTipLabel || !this.artLoadingTipOpacity) return;
        Tween.stopAllByTarget(this.artLoadingTipOpacity);
        tween(this.artLoadingTipOpacity)
            .to(0.18, { opacity: 0 }, { easing: 'quadIn' })
            .call(() => {
                this.artLoadingTipIndex = (this.artLoadingTipIndex + 1) % LOADING_TIPS.length;
                if (this.artLoadingTipLabel) this.artLoadingTipLabel.string = LOADING_TIPS[this.artLoadingTipIndex];
            })
            .to(0.24, { opacity: 255 }, { easing: 'quadOut' })
            .start();
    }

    private resetArtLoadingProgress(): void {
        this.artLoadingTargetProgress = 0;
        this.artLoadingVisualProgress = 0;
        this.artLoadingCompletionPending = false;
        this.artLoadingFadeStarted = false;
        this.artLoadingFailed = false;
        this.artLoadingTipElapsed = 0;
        this.applyArtLoadingVisualProgress(0);
        const opacity = this.artLoadingPanel?.getComponent(UIOpacity);
        if (opacity) {
            Tween.stopAllByTarget(opacity);
            opacity.opacity = 255;
        }
    }

    private startArtLoadingFade(): void {
        if (this.artLoadingFadeStarted || !this.artLoadingPanel) return;
        this.artLoadingFadeStarted = true;
        this.artLoadingCompletionPending = false;
        this.artLoadingVisualProgress = 1;
        this.applyArtLoadingVisualProgress(1);
        const panel = this.artLoadingPanel;
        const opacity = panel.getComponent(UIOpacity) ?? panel.addComponent(UIOpacity);
        const continuation = this.artLoadingPendingContinue;
        tween(opacity).to(LOADING_FADE_SECONDS, { opacity: 0 }, { easing: 'quadOut' }).call(() => {
            if (panel.isValid) {
                panel.active = false;
                opacity.opacity = 255;
            }
            this.artLoadingPendingContinue = undefined;
            continuation?.();
            if (!continuation && this.startPanel?.active) {
                this.playStartLevelSelectAttention();
            }
        }).start();
    }

    private applyLoadingUiFont(label: Label): void {
        if (this.loadingUiFont) {
            label.font = this.loadingUiFont;
            label.useSystemFont = false;
            return;
        }
        this.applyFormalUiFont(label);
    }

    private async loadFormalUiFont(generation: number): Promise<void> {
        try {
            const [font, targetTypographyFont] = await Promise.all([
                this.artResourceManager.loadFont(
                    'art_boot',
                    'ui/fonts/ui_font_cn_subset_runtime_v02',
                ).catch((error) => {
                    console.warn(
                        `[Art:${ART_PILOT_BATCH}] 全局中文字体加载失败，保留系统字体。`,
                        error,
                    );
                    return undefined;
                }),
                this.artResourceManager.loadFont(
                    'art_boot',
                    'ui/fonts/ui_font_cn_subset_runtime_ui05_regular',
                ).catch((error) => {
                    console.warn(
                        `[Typography:${DEVELOPMENT_BATCH}] UI05 目标字体加载失败，目标文字暂用全局正式字体。`,
                        error,
                    );
                    return undefined;
                }),
            ]);
            if (generation !== this.artPilotLoadGeneration || !this.node.isValid) {
                return;
            }
            if (font) {
                this.formalUiFont = font;
            }
            if (targetTypographyFont) {
                this.targetTypographyFont = targetTypographyFont;
            }
            for (const label of this.node.getComponentsInChildren(Label)) {
                this.applyFormalUiFont(label);
            }
            for (const [label, role] of this.targetTypographyBindings) {
                if (!label.node.isValid) {
                    this.targetTypographyBindings.delete(label);
                    continue;
                }
                this.applyTargetTypography(
                    label,
                    role,
                    new Color(label.color.r, label.color.g, label.color.b, label.color.a),
                );
            }
        } catch (error) {
            console.warn(`[Art:${ART_PILOT_BATCH}] 中文字体加载失败，保留系统字体。`, error);
        }
    }

    private applyFullStaticArt(): void {
        const preferredBackgroundKey = BATTLEFIELD_VISUAL_MODE === 'cartoon_20x9_v02'
            ? ArtPilotResourceKey.BattleBackgroundCartoon
            : BATTLEFIELD_VISUAL_MODE === 'plush_20x9_v01'
                ? ArtPilotResourceKey.BattleBackgroundPlush
                : BATTLEFIELD_VISUAL_MODE === 'topdown_v02'
                    ? ArtPilotResourceKey.BattleBackgroundTopdown : ArtPilotResourceKey.BattleBackground;
        const preferredBackgroundFrame = this.artResourceManager.getFrame(preferredBackgroundKey);
        const backgroundFrame = preferredBackgroundFrame
            ?? this.artResourceManager.getFrame(ArtPilotResourceKey.BattleBackground);
        if (backgroundFrame && this.battleBackgroundSlot && this.battleBackgroundSprite) {
            this.battleBackgroundSourceAspect = preferredBackgroundFrame
                && preferredBackgroundKey === ArtPilotResourceKey.BattleBackgroundPlush
                ? 1680 / 720
                : preferredBackgroundFrame && preferredBackgroundKey === ArtPilotResourceKey.BattleBackgroundCartoon
                    ? 1600 / 720 : DESIGN_WIDTH / DESIGN_HEIGHT;
            this.battleBackgroundSprite.spriteFrame = backgroundFrame;
            this.battleBackgroundSlot.active = true;
            const boardGraphics = this.battlefieldBackgroundLayer.getChildByName('Board')?.getComponent(Graphics);
            if (boardGraphics) {
                boardGraphics.enabled = false;
            }
            const usingIntegratedRoadBackground = preferredBackgroundKey !== ArtPilotResourceKey.BattleBackground
                && !!preferredBackgroundFrame;
            for (const laneSlot of this.laneArtSlots) {
                laneSlot.active = !usingIntegratedRoadBackground && BATTLEFIELD_VISUAL_MODE === 'legacy_v01';
            }
            this.resizeBattlefieldBackgroundToCover();
        }
        this.applyStandaloneSprite(this.aiBaseArtSlot, this.aiBaseArtSprite, ArtPilotResourceKey.AIBase);
        this.applyStandaloneSprite(this.playerBaseArtSlot, this.playerBaseArtSprite, ArtPilotResourceKey.PlayerBase);

        const aiBaseNode = this.aiBaseHudNode;
        const playerBaseNode = this.playerBaseHudNode;
        this.aiBaseFillSprite = this.applyChildSprite(aiBaseNode, 'BaseFillArt', ArtPilotResourceKey.BaseHealthFillMask, 388, 36, -194, 0, 0, 0.5);
        this.playerBaseFillSprite = this.applyChildSprite(playerBaseNode, 'BaseFillArt', ArtPilotResourceKey.BaseHealthFillMask, 388, 36, -194, 0, 0, 0.5);
        if (this.aiBaseFillSprite) this.aiBaseFillSprite.color = new Color(239, 83, 80, 255);
        if (this.playerBaseFillSprite) this.playerBaseFillSprite.color = new Color(66, 213, 122, 255);
        this.aiBaseFrameSprite = this.applyChildSprite(aiBaseNode, 'BaseFrameArt', ArtPilotResourceKey.AIBaseHealthFrame, 400, 48);
        this.playerBaseFrameSprite = this.applyChildSprite(playerBaseNode, 'BaseFrameArt', ArtPilotResourceKey.PlayerBaseHealthFrame, 400, 48);
        const aiBaseFormal = this.setFormalHudCompositeMode(aiBaseNode,
            [this.aiBaseFillSprite, this.aiBaseFrameSprite]);
        const playerBaseFormal = this.setFormalHudCompositeMode(playerBaseNode,
            [this.playerBaseFillSprite, this.playerBaseFrameSprite]);
        this.orderBaseHudChildren(aiBaseNode, this.aiBaseFillSprite, this.aiBaseFrameSprite,
            this.aiBaseShadowLabel, this.aiBaseLabel, aiBaseFormal);
        this.orderBaseHudChildren(playerBaseNode, this.playerBaseFillSprite, this.playerBaseFrameSprite,
            this.playerBaseShadowLabel, this.playerBaseLabel, playerBaseFormal);

        const aiSupply = this.aiSupplyBadge;
        const playerSupply = this.playerSupplyBadge;
        const aiSupplyFrame = this.applyChildSprite(aiSupply, 'FrameArt', ArtPilotResourceKey.AISupplyFrame,
            PLAYER_RESOURCE_BADGE_WIDTH, PLAYER_RESOURCE_BADGE_HEIGHT);
        const playerSupplyFrame = this.applyChildSprite(playerSupply, 'FrameArt', ArtPilotResourceKey.PlayerSupplyFrame,
            PLAYER_RESOURCE_BADGE_WIDTH, PLAYER_RESOURCE_BADGE_HEIGHT);
        const aiSupplyIcon = this.applyChildSprite(aiSupply, 'SupplyIconArt', ArtPilotResourceKey.SupplyIcon, 28, 28, -64, 0);
        const playerSupplyIcon = this.applyChildSprite(playerSupply, 'SupplyIconArt', ArtPilotResourceKey.SupplyIcon, 28, 28, -64, 0);
        const aiEnergyFrame = this.applyChildSprite(this.aiEnergyBar?.node, 'FrameArt', ArtPilotResourceKey.AIEnergyFrame, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT);
        const playerEnergyFrame = this.applyChildSprite(this.playerEnergyBar?.node, 'FrameArt', ArtPilotResourceKey.PlayerEnergyFrame, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT);
        const aiEnergyIcon = this.applyChildSprite(this.aiEnergyBar?.node, 'EnergyIconArt', ArtPilotResourceKey.EnergyIcon, 30, 30, ENERGY_BAR_ICON_X, 0);
        const playerEnergyIcon = this.applyChildSprite(this.playerEnergyBar?.node, 'EnergyIconArt', ArtPilotResourceKey.EnergyIcon, 30, 30, ENERGY_BAR_ICON_X, 0);
        const aiSupplyFormal = this.setFormalHudCompositeMode(aiSupply, [aiSupplyFrame, aiSupplyIcon]);
        const playerSupplyFormal = this.setFormalHudCompositeMode(playerSupply, [playerSupplyFrame, playerSupplyIcon]);
        const aiEnergyFormal = this.setFormalHudCompositeMode(this.aiEnergyBar.node, [aiEnergyFrame, aiEnergyIcon]);
        const playerEnergyFormal = this.setFormalHudCompositeMode(this.playerEnergyBar.node, [playerEnergyFrame, playerEnergyIcon]);
        this.orderResourceHudChildren(aiSupply, undefined, aiSupplyFrame, aiSupplyIcon,
            undefined, this.aiSupplyLabel, aiSupplyFormal);
        this.orderResourceHudChildren(playerSupply, undefined, playerSupplyFrame, playerSupplyIcon,
            undefined, this.playerSupplyLabel, playerSupplyFormal);
        this.orderEnergyHudChildren(this.aiEnergyBar, aiEnergyFrame, aiEnergyIcon, aiEnergyFormal);
        this.orderEnergyHudChildren(this.playerEnergyBar, playerEnergyFrame, playerEnergyIcon, playerEnergyFormal);
        const levelBadgeArt = this.applyChildSprite(this.levelBadge, 'LevelBadgeFrameSprite', ArtPilotResourceKey.LevelBadge,
            LEVEL_BADGE_WIDTH, LEVEL_BADGE_HEIGHT);
        if (levelBadgeArt) {
            levelBadgeArt.color = new Color(255, 244, 218, 255);
        }
        const statusArt = this.applyChildSprite(this.statusToast, 'NoticeBannerArt', ArtPilotResourceKey.NoticeBanner,
            STATUS_TOAST_WIDTH, STATUS_TOAST_HEIGHT);
        const tacticNoticeArt = this.applyChildSprite(this.tacticNotice, 'NoticeBannerArt', ArtPilotResourceKey.NoticeBanner,
            420, 54);
        const tacticHeader = this.rightControlBar?.getChildByName('TacticSidebarHeader');
        const tacticHeaderArt = this.applyChildSprite(tacticHeader, 'HeaderArt', ArtPilotResourceKey.NoticeBanner,
            FUNCTION_SIDEBAR_WIDTH, TACTIC_HEADER_HEIGHT);
        this.applyChildSprite(this.pauseButton?.node, 'PauseButtonArt', ArtPilotResourceKey.PauseButton,
            38, 38, -78, 0);
        this.applyChildSprite(this.helpPanel?.getChildByName('HelpBackButton'), 'CloseArt', ArtPilotResourceKey.ButtonClose,
            28, 28, -96, 0);

        this.applyTacticCardArt(this.playerSprintCard);
        this.applyTacticCardArt(this.playerHealCard);
        this.applyTacticCardArt(this.playerShockCard);
        this.applyTacticCardArt(this.playerFreezeCard);
        this.applyTacticCardArt(this.playerEnergySurgeCard);
        this.applyTacticCardArt(this.playerSupplyBoostCard);
        this.applyBattleHudColumnLayout();
        this.applyFormalBattleTextStyles({
            aiSupplyFrame: aiSupplyFormal,
            playerSupplyFrame: playerSupplyFormal,
            aiEnergyFrame: aiEnergyFormal,
            playerEnergyFrame: playerEnergyFormal,
            levelBadgeArt: !!levelBadgeArt,
            statusArt: !!statusArt,
            tacticNoticeArt: !!tacticNoticeArt,
            tacticHeaderArt: !!tacticHeaderArt,
        });
        this.lastTacticHudState = '';
        this.tacticDisplayRefreshCooldown = 0;
        this.refreshTacticCards();
        this.applyTitleArt();
        this.applyLevelSelectArt();
        this.applyTacticDeckArt();
        if (this.levelFiveTutorialContent?.isValid) {
            const tutorialPanelSprite = this.applyTacticRegionSprite(
                this.levelFiveTutorialContent,
                'FormalTutorialPanelSprite',
                ArtPilotResourceKey.LevelSelectPanel,
                780,
                510,
                true,
                32,
            );
            this.levelFiveTutorialContent.getComponent(Graphics)!.enabled = !tutorialPanelSprite;
            for (const child of this.levelFiveTutorialContent.children) {
                if (child.name !== 'FormalTutorialPanelSprite') {
                    child.setSiblingIndex(this.levelFiveTutorialContent.children.length - 1);
                }
            }
        }
        this.applyLevelOneTutorialArt();
        this.applyResultArt(false);
        this.applyGenericButtonSkins();
        this.refreshBaseBars();
        this.logVisualPolishLayoutAudit();
    }

    private applyStandaloneSprite(slot: Node | undefined, sprite: Sprite | undefined, key: ArtPilotResourceKey): void {
        const frame = this.artResourceManager.getFrame(key);
        if (slot?.isValid && sprite && frame) {
            sprite.spriteFrame = frame;
            slot.active = true;
        }
    }

    private applyChildSprite(
        parent: Node | undefined,
        name: string,
        key: ArtPilotResourceKey,
        width: number,
        height: number,
        x = 0,
        y = 0,
        anchorX = 0.5,
        anchorY = 0.5,
    ): Sprite | undefined {
        if (!parent?.isValid) {
            return undefined;
        }
        const frame = this.artResourceManager.getFrame(key);
        if (!frame) {
            return undefined;
        }
        const existing = parent.getChildByName(name);
        if (existing) {
            const sprite = existing.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = frame;
                existing.setPosition(x, y, 0);
                existing.setScale(1, 1, 1);
                const transform = existing.getComponent(UITransform);
                transform?.setContentSize(width, height);
                transform?.setAnchorPoint(anchorX, anchorY);
                existing.active = true;
                return sprite;
            }
        }
        const slot = this.createSpriteSlot(name, parent, width, height, x, y, anchorX, anchorY);
        slot.node.setSiblingIndex(0);
        slot.sprite.spriteFrame = frame;
        slot.node.active = true;
        return slot.sprite;
    }

    private setFormalHudCompositeMode(parent: Node | undefined, parts: readonly (Sprite | undefined)[]): boolean {
        if (!parent?.isValid) return false;
        const ready = parts.length > 0 && parts.every((part) => !!part?.spriteFrame);
        for (const part of parts) {
            if (part?.node.isValid) {
                part.node.active = ready;
                part.node.setScale(1, 1, 1);
            }
        }
        const placeholderGraphics = parent.getComponent(Graphics);
        if (placeholderGraphics) {
            placeholderGraphics.enabled = !ready;
        }
        parent.setScale(1, 1, 1);
        return ready;
    }

    private orderBaseHudChildren(
        parent: Node,
        fill: Sprite | undefined,
        frame: Sprite | undefined,
        shadowLabel: Label,
        label: Label,
        formalReady: boolean,
    ): void {
        if (!formalReady || !fill || !frame) return;
        fill.node.setSiblingIndex(0);
        frame.node.setSiblingIndex(1);
        shadowLabel.node.setSiblingIndex(parent.children.length - 1);
        label.node.setSiblingIndex(parent.children.length - 1);
    }

    private orderResourceHudChildren(
        parent: Node,
        fillNode: Node | undefined,
        frame: Sprite | undefined,
        icon: Sprite | undefined,
        shadowLabel: Label | undefined,
        label: Label,
        formalReady: boolean,
    ): void {
        if (!formalReady || !frame || !icon) return;
        let nextIndex = 0;
        if (fillNode) {
            fillNode.setSiblingIndex(nextIndex);
            nextIndex += 1;
        }
        frame.node.setSiblingIndex(nextIndex);
        icon.node.setSiblingIndex(nextIndex + 1);
        shadowLabel?.node.setSiblingIndex(parent.children.length - 1);
        label.node.setSiblingIndex(parent.children.length - 1);
    }

    private orderEnergyHudChildren(
        bar: EnergyBarView,
        frame: Sprite | undefined,
        icon: Sprite | undefined,
        formalReady: boolean,
    ): void {
        if (!formalReady || !frame || !icon) return;
        bar.trackNode.setSiblingIndex(0);
        bar.fillNode.setSiblingIndex(1);
        frame.node.setSiblingIndex(2);
        icon.node.setSiblingIndex(3);
        bar.shadowLabel.node.setSiblingIndex(bar.node.children.length - 1);
        bar.label.node.setSiblingIndex(bar.node.children.length - 1);
    }

    private logVisualPolishLayoutAudit(): void {
        const hudMetric = (node: Node) => {
            const size = node.getComponent(UITransform)?.contentSize;
            return {
                centerX: node.position.x,
                centerY: node.position.y,
                width: size?.width ?? 0,
                height: size?.height ?? 0,
                left: node.position.x - (size?.width ?? 0) / 2,
                right: node.position.x + (size?.width ?? 0) / 2,
                scale: [node.scale.x, node.scale.y, node.scale.z],
                placeholderGraphicsEnabled: node.getComponent(Graphics)?.enabled ?? false,
            };
        };
        console.info('[VisualPolish04][HUDColumns]', {
            ai: {
                supply: hudMetric(this.aiSupplyBadge),
                base: hudMetric(this.aiBaseHudNode),
                energy: hudMetric(this.aiEnergyBar.node),
            },
            player: {
                supply: hudMetric(this.playerSupplyBadge),
                base: hudMetric(this.playerBaseHudNode),
                energy: hudMetric(this.playerEnergyBar.node),
            },
        });
        console.info('[VisualPolish04][UnitCardLayout]', {
            card: { width: UNIT_CARD_WIDTH, height: UNIT_CARD_HEIGHT },
            tier: { width: UNIT_CARD_TIER_AREA_WIDTH, centerX: UNIT_CARD_TIER_CENTER_X },
            main: { width: UNIT_CARD_MAIN_AREA_WIDTH, centerX: UNIT_CARD_MAIN_CENTER_X },
            status: { width: UNIT_CARD_STATUS_AREA_WIDTH, centerX: UNIT_CARD_STATUS_CENTER_X },
        });
        console.info('[VisualPolish04][LaneCenters]', LANE_X.map((laneX, lane) => {
            const aiGateRootX = this.aiSpawnGateSlots[lane]?.position.x ?? laneX;
            const aiGateVisualLocalX = this.aiSpawnGateSprites[lane]?.node.position.x ?? 0;
            const aiGateVisualWorldX = aiGateRootX + aiGateVisualLocalX;
            const aiGateAlphaBodyCenterX = aiGateVisualWorldX + AI_GATE_ALPHA_BODY_OFFSET_X;
            const playerGateRootX = this.laneSpawnMarkers[lane]?.node.position.x ?? laneX;
            const playerGateVisualLocalX = this.playerSpawnGateRoots[lane]
                ?.getChildByName('GateVisual')?.position.x ?? 0;
            const playerGateVisualWorldX = playerGateRootX + playerGateVisualLocalX;
            const playerGateAlphaBodyCenterX = playerGateVisualWorldX + PLAYER_GATE_ALPHA_BODY_OFFSET_X;
            return {
                lane: lane + 1,
                laneX,
                anchorX: this.getLaneCenterX(lane),
                aiGateRootX,
                aiGateVisualLocalX,
                aiGateVisualWorldX,
                aiGateAlphaBodyCenterX,
                aiGateFinalError: Math.abs(aiGateAlphaBodyCenterX - laneX),
                playerGateRootX,
                playerGateVisualLocalX,
                playerGateVisualWorldX,
                playerGateAlphaBodyCenterX,
                playerGateFinalError: Math.abs(playerGateAlphaBodyCenterX - laneX),
                playerUnitSpawnX: LANE_X[lane],
                aiUnitSpawnX: LANE_X[lane],
                supplyPointX: this.supplyPoints[lane]?.node.position.x,
                laneNumberX: this.laneVisualsLayer.getChildByName(`LaneNumber${lane + 1}`)?.position.x,
                laneHitArea: {
                    centerX: this.laneHitAreas[lane]?.node.position.x,
                    centerY: this.laneHitAreas[lane]?.node.position.y,
                    width: this.laneHitAreas[lane]?.node.getComponent(UITransform)?.contentSize.width,
                    height: this.laneHitAreas[lane]?.node.getComponent(UITransform)?.contentSize.height,
                },
                debugCenterLineActive: this.laneCenterAnchors[lane]
                    ?.getChildByName('DebugCenterLine')?.active ?? false,
            };
        }));
    }

    private applyTacticRegionSprite(
        parent: Node,
        name: string,
        key: ArtPilotResourceKey,
        width: number,
        height: number,
        sliced: boolean,
        inset = 8,
    ): Sprite | undefined {
        const sprite = this.applyChildSprite(parent, name, key, width, height);
        const fallback = parent.getComponent(Graphics);
        if (!sprite) {
            const staleSprite = parent.getChildByName(name);
            if (staleSprite) staleSprite.active = false;
            if (fallback) fallback.enabled = true;
            return undefined;
        }
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = sliced ? Sprite.Type.SLICED : Sprite.Type.SIMPLE;
        sprite.node.setScale(1, 1, 1);
        sprite.node.getComponent(UITransform)?.setContentSize(width, height);
        if (sliced && sprite.spriteFrame) {
            sprite.spriteFrame.insetLeft = inset;
            sprite.spriteFrame.insetRight = inset;
            sprite.spriteFrame.insetTop = inset;
            sprite.spriteFrame.insetBottom = inset;
        }
        sprite.node.active = true;
        sprite.node.setSiblingIndex(0);
        if (fallback) fallback.enabled = false;
        return sprite;
    }

    private getLevelCardArtKey(state: LevelCardVisualState): ArtPilotResourceKey {
        if (state === 'selected') return ArtPilotResourceKey.LevelCardSelected;
        if (state === 'completed') return ArtPilotResourceKey.LevelCardCompleted;
        if (state === 'locked') return ArtPilotResourceKey.LevelCardLocked;
        return ArtPilotResourceKey.LevelCardUnlocked;
    }

    private getLevelStateArtKey(state: LevelCardVisualState): ArtPilotResourceKey {
        if (state === 'selected') return ArtPilotResourceKey.LevelStateSelected;
        if (state === 'completed') return ArtPilotResourceKey.LevelStateCompleted;
        if (state === 'locked') return ArtPilotResourceKey.LevelStateLocked;
        return ArtPilotResourceKey.LevelStateAvailable;
    }

    private applyLevelSelectArt(): void {
        if (!this.levelSelectPanel?.isValid || !this.levelSelectContent?.isValid) {
            return;
        }
        this.levelSelectOverlaySprite = this.applyTacticRegionSprite(
            this.levelSelectDimBackground,
            'OverlaySprite',
            ArtPilotResourceKey.LevelSelectOverlay,
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
            true,
            8,
        );
        this.levelSelectPanelSprite = this.applyTacticRegionSprite(
            this.levelSelectContent,
            'PanelBackgroundSprite',
            ArtPilotResourceKey.LevelSelectPanel,
            LEVEL_SELECT_PANEL_WIDTH,
            LEVEL_SELECT_PANEL_HEIGHT,
            true,
            34,
        );
        this.levelSelectProgressSprite = this.applyTacticRegionSprite(
            this.levelSelectProgressArea,
            'ProgressBackgroundSprite',
            ArtPilotResourceKey.LevelProgressPanel,
            LEVEL_SELECT_PROGRESS_WIDTH,
            LEVEL_SELECT_PROGRESS_HEIGHT,
            true,
            14,
        );
        this.levelSelectBackButton.artSprite = this.applyTacticRegionSprite(
            this.levelSelectBackButton.node,
            'BackButtonSprite',
            ArtPilotResourceKey.LevelBackButton,
            LEVEL_SELECT_BACK_BUTTON_WIDTH,
            LEVEL_SELECT_ACTION_BUTTON_HEIGHT,
            true,
            15,
        );
        if (this.levelSelectDebugResetButton) {
            this.levelSelectDebugResetButton.artSprite = this.applyTacticRegionSprite(
                this.levelSelectDebugResetButton.node,
                'DebugResetButtonSprite',
                ArtPilotResourceKey.LevelDebugResetButton,
                this.levelSelectDebugResetButton.width,
                this.levelSelectDebugResetButton.height,
                true,
                13,
            );
        }
        for (const card of this.levelCards.values()) {
            card.numberBadgeSprite = this.applyTacticRegionSprite(
                card.numberBadgeNode,
                'NumberBadgeSprite',
                ArtPilotResourceKey.LevelNumberBadge,
                66,
                60,
                true,
                15,
            );
            card.numberLabel.node.setSiblingIndex(card.numberBadgeNode.children.length - 1);
            this.applyLevelCardStateArt(card);
        }
        this.refreshLevelSelectPanel();
    }

    private getTacticDeckTheme(kind: TacticIcon): {
        readonly accent: Color;
        readonly softFill: Color;
        readonly iconTint: Color;
    } {
        if (kind === 'sprint') {
            return {
                accent: new Color(225, 169, 45, 255),
                softFill: new Color(255, 232, 151, 64),
                iconTint: Color.WHITE,
            };
        }
        if (kind === 'heal') {
            return {
                accent: new Color(72, 176, 122, 255),
                softFill: new Color(155, 229, 188, 58),
                iconTint: Color.WHITE,
            };
        }
        if (kind === 'shock') {
            return {
                accent: new Color(154, 112, 207, 255),
                softFill: new Color(207, 179, 239, 58),
                iconTint: Color.WHITE,
            };
        }
        if (kind === 'surge') {
            return {
                accent: new Color(213, 166, 41, 255),
                softFill: new Color(149, 224, 153, 62),
                iconTint: new Color(255, 233, 129, 255),
            };
        }
        if (kind === 'supplyBoost') {
            return {
                accent: new Color(190, 148, 34, 255),
                softFill: new Color(137, 207, 128, 64),
                iconTint: new Color(255, 235, 139, 255),
            };
        }
        return {
            accent: new Color(76, 166, 219, 255),
            softFill: new Color(157, 221, 247, 64),
            iconTint: new Color(143, 222, 255, 255),
        };
    }

    private getTacticDeckIconCellKey(kind: TacticIcon): ArtPilotResourceKey {
        if (kind === 'sprint') return ArtPilotResourceKey.TacticIconCellSprint;
        if (kind === 'heal') return ArtPilotResourceKey.TacticIconCellHeal;
        if (kind === 'shock') return ArtPilotResourceKey.TacticIconCellShock;
        if (kind === 'surge') return ArtPilotResourceKey.TacticIconCellSprint;
        if (kind === 'supplyBoost') return ArtPilotResourceKey.TacticIconCellHeal;
        // The formal art set has no dedicated freeze cell. Reuse the mint cell
        // and tint it ice blue so the deck keeps the same illustrated frame language.
        return ArtPilotResourceKey.TacticIconCellHeal;
    }

    private getTacticDeckSkillIconKey(kind: TacticIcon): ArtPilotResourceKey {
        if (kind === 'sprint') return ArtPilotResourceKey.TacticSkillSprint;
        if (kind === 'heal') return ArtPilotResourceKey.TacticSkillHeal;
        if (kind === 'shock') return ArtPilotResourceKey.TacticSkillShock;
        if (kind === 'surge') return ArtPilotResourceKey.TacticSkillSprint;
        if (kind === 'supplyBoost') return ArtPilotResourceKey.TacticStateReady;
        // Combine the formal lock emblem with the snowflake overlay created below.
        return ArtPilotResourceKey.TacticStateLock;
    }

    private applyTacticDeckArt(): void {
        if (!this.tacticDeckPanel?.isValid || !this.tacticDeckContent?.isValid) return;
        this.tacticDeckPanelSprite = this.applyTacticRegionSprite(
            this.tacticDeckContent,
            'TacticDeckPanelSprite',
            ArtPilotResourceKey.LevelSelectPanel,
            TACTIC_DECK_PANEL_WIDTH,
            TACTIC_DECK_PANEL_HEIGHT,
            true,
            34,
        );
        this.tacticDeckContentGraphics.enabled = !this.tacticDeckPanelSprite;

        for (const option of this.tacticDeckOptions.values()) {
            const theme = this.getTacticDeckTheme(option.kind);
            option.cardShellSprite = this.applyTacticRegionSprite(
                option.visualRoot,
                'DeckCardShellSprite',
                ArtPilotResourceKey.TacticCardShell,
                TACTIC_DECK_CARD_WIDTH,
                TACTIC_DECK_CARD_HEIGHT,
                true,
                14,
            );
            option.iconCellSprite = this.applyTacticRegionSprite(
                option.iconCellNode,
                'DeckIconCellSprite',
                this.getTacticDeckIconCellKey(option.kind),
                102,
                126,
                true,
                10,
            );
            if (option.iconCellSprite) {
                option.iconCellSprite.color = option.kind === 'freeze' ? theme.iconTint : Color.WHITE;
            }
            option.skillIconSprite = this.applyChildSprite(
                option.iconCellNode,
                'DeckSkillIconSprite',
                this.getTacticDeckSkillIconKey(option.kind),
                option.kind === 'freeze' ? 50 : 62,
                option.kind === 'freeze' ? 50 : 62,
            );
            if (option.skillIconSprite) {
                option.skillIconSprite.color = option.kind === 'freeze'
                    ? new Color(151, 226, 255, 120)
                    : option.kind === 'surge' ? new Color(255, 231, 126, 220) : Color.WHITE;
                option.skillIconSprite.node.setSiblingIndex(option.iconCellNode.children.length - 1);
            }
            option.skillIconFallbackGraphics.node.active = option.kind === 'freeze'
                || option.kind === 'surge' || option.kind === 'supplyBoost' || !option.skillIconSprite;
            option.skillIconFallbackGraphics.node.setSiblingIndex(option.iconCellNode.children.length - 1);

            option.selectedSparkSprite = this.applyChildSprite(
                option.checkBadgeNode,
                'SelectedSparkSprite',
                ArtPilotResourceKey.TacticStateReady,
                40,
                40,
            );
            if (option.selectedSparkSprite) {
                option.selectedSparkSprite.color = new Color(255, 239, 153, 235);
                option.selectedSparkSprite.node.setSiblingIndex(0);
            }
            option.checkLabel.node.setSiblingIndex(option.checkBadgeNode.children.length - 1);
        }
        this.refreshTacticDeckSelection();
    }

    private applyLevelCardStateArt(card: LevelCardView): void {
        card.backgroundSprite = this.applyTacticRegionSprite(
            card.root,
            'CardBackgroundSprite',
            this.getLevelCardArtKey(card.visualState),
            LEVEL_SELECT_CARD_WIDTH,
            LEVEL_SELECT_CARD_HEIGHT,
            true,
            18,
        );
        if (card.numberBadgeSprite) {
            card.numberBadgeSprite.color = card.visualState === 'selected'
                ? new Color(255, 222, 104, 255) : Color.WHITE;
        }
        if (card.visualState === 'in-development') {
            const staleStateSprite = card.stateIconFallbackNode.getChildByName('StateIconSprite');
            if (staleStateSprite) staleStateSprite.active = false;
            card.stateIconFallbackGraphics.enabled = true;
            card.stateIconSprite = undefined;
        } else {
            card.stateIconSprite = this.applyTacticRegionSprite(
                card.stateIconFallbackNode,
                'StateIconSprite',
                this.getLevelStateArtKey(card.visualState),
                28,
                28,
                false,
            );
        }
        card.completionBadgeSprite = this.applyTacticRegionSprite(
            card.completionBadgeNode,
            'CompletionIconSprite',
            ArtPilotResourceKey.LevelStateCompleted,
            22,
            22,
            false,
        );
        card.numberBadgeNode.setSiblingIndex(1);
        card.stateArea.setSiblingIndex(3);
        card.completionBadgeNode.setSiblingIndex(4);
        card.touchArea.setSiblingIndex(card.root.children.length - 1);
        card.stateLabel.node.setSiblingIndex(card.stateArea.children.length - 1);
    }

    private drawLevelCompletionBadgeFallback(card: LevelCardView): void {
        const graphics = card.completionBadgeFallbackGraphics;
        graphics.clear();
        graphics.fillColor = new Color(87, 201, 130, 255);
        graphics.circle(0, 0, 9);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = Color.WHITE;
        graphics.moveTo(-5, 0);
        graphics.lineTo(-1, -4);
        graphics.lineTo(6, 5);
        graphics.stroke();
    }

    private refreshLevelProgressSteps(): void {
        for (let index = 0; index < this.levelSelectProgressSteps.length; index += 1) {
            const node = this.levelSelectProgressSteps[index];
            const config = LEVEL_CONFIGS[index];
            const implemented = this.isLevelImplemented(config);
            const challengeable = implemented && this.canChallengeLevel(config.id);
            const completed = implemented && this.completedLevels.has(config.id);
            const graphics = node.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                graphics.fillColor = completed
                    ? new Color(87, 201, 130, 255)
                    : challengeable ? new Color(105, 207, 226, 255) : new Color(168, 169, 178, 255);
                graphics.circle(0, 0, 9);
                graphics.fill();
                if (!implemented) {
                    graphics.fillColor = new Color(94, 91, 98, 255);
                    for (const x of [-4, 0, 4]) graphics.circle(x, 0, 1.2);
                    graphics.fill();
                }
            }
            const existingSpriteNode = node.getChildByName('ProgressStateSprite');
            if (!implemented) {
                if (existingSpriteNode) existingSpriteNode.active = false;
                if (graphics) graphics.enabled = true;
                continue;
            }
            const key = completed
                ? ArtPilotResourceKey.LevelStateCompleted
                : challengeable ? ArtPilotResourceKey.LevelStateAvailable : ArtPilotResourceKey.LevelStateLocked;
            this.applyTacticRegionSprite(node, 'ProgressStateSprite', key, 24, 24, false);
        }
    }

    private getTacticIconCellKey(kind: TacticIcon): ArtPilotResourceKey {
        if (kind === 'sprint') return ArtPilotResourceKey.TacticIconCellSprint;
        if (kind === 'heal') return ArtPilotResourceKey.TacticIconCellHeal;
        if (kind === 'surge') return ArtPilotResourceKey.TacticIconCellSprint;
        if (kind === 'supplyBoost') return ArtPilotResourceKey.TacticIconCellHeal;
        return ArtPilotResourceKey.TacticIconCellShock;
    }

    private getTacticSkillIconKey(kind: TacticIcon): ArtPilotResourceKey | undefined {
        if (kind === 'sprint') return ArtPilotResourceKey.TacticSkillSprint;
        if (kind === 'heal') return ArtPilotResourceKey.TacticSkillHeal;
        if (kind === 'shock') return ArtPilotResourceKey.TacticSkillShock;
        return undefined;
    }

    private getTacticTextCellKey(kind: TacticIcon): ArtPilotResourceKey {
        if (kind === 'sprint') return ArtPilotResourceKey.TacticTextCellSprint;
        if (kind === 'heal') return ArtPilotResourceKey.TacticTextCellHeal;
        if (kind === 'surge') return ArtPilotResourceKey.TacticTextCellSprint;
        if (kind === 'supplyBoost') return ArtPilotResourceKey.TacticTextCellHeal;
        return ArtPilotResourceKey.TacticTextCellShock;
    }

    private getTacticInfoCellKey(state: TacticInfoVisualState): ArtPilotResourceKey {
        if (state === 'ready') return ArtPilotResourceKey.TacticInfoCellReady;
        if (state === 'insufficient') return ArtPilotResourceKey.TacticInfoCellInsufficient;
        if (state === 'cooldown') return ArtPilotResourceKey.TacticInfoCellCooldown;
        return ArtPilotResourceKey.TacticInfoCellNeutral;
    }

    private getTacticStateCellKey(state: TacticAvailabilityState): ArtPilotResourceKey {
        if (state === 'available' || state === 'active') {
            return ArtPilotResourceKey.TacticStateCellAvailable;
        }
        if (state === 'cooldown' || state === 'paused' || state === 'not-started') {
            return ArtPilotResourceKey.TacticStateCellCooldown;
        }
        if (state === 'insufficient-supply') return ArtPilotResourceKey.TacticStateCellInsufficient;
        if (state === 'locked') return ArtPilotResourceKey.TacticStateCellLocked;
        if (state === 'used' || state === 'finished') return ArtPilotResourceKey.TacticStateCellUsed;
        return ArtPilotResourceKey.TacticStateCellUnavailable;
    }

    private applyTacticInfoCellArt(
        card: TacticCardView,
        target: 'cost' | 'meta',
        state: TacticInfoVisualState,
    ): void {
        const key = this.getTacticInfoCellKey(state);
        const currentKey = target === 'cost' ? card.costCellArtKey : card.metaCellArtKey;
        const currentSprite = target === 'cost' ? card.costCellSprite : card.metaCellSprite;
        if (currentSprite && currentKey === key) return;
        const parent = target === 'cost' ? card.costCellNode : card.metaCellNode;
        const width = target === 'cost' ? TACTIC_COST_CELL_WIDTH : TACTIC_META_CELL_WIDTH;
        const sprite = this.applyTacticRegionSprite(
            parent,
            target === 'cost' ? 'CostCellSprite' : 'MetaCellSprite',
            key,
            width,
            TACTIC_BOTTOM_CELL_HEIGHT,
            true,
            7,
        );
        if (target === 'cost') {
            card.costCellSprite = sprite;
            card.costCellArtKey = sprite ? key : undefined;
            card.costLabel.node.setSiblingIndex(card.costCellNode.children.length - 1);
        } else {
            card.metaCellSprite = sprite;
            card.metaCellArtKey = sprite ? key : undefined;
            card.metaLabel.node.setSiblingIndex(card.metaCellNode.children.length - 1);
        }
    }

    private applyTacticStateCellArt(card: TacticCardView, state: TacticAvailabilityState): void {
        const key = this.getTacticStateCellKey(state);
        if (card.stateCellSprite && card.stateCellArtKey === key) return;
        card.stateCellSprite = this.applyTacticRegionSprite(
            card.stateCellNode,
            'StateCellSprite',
            key,
            TACTIC_STATE_CELL_WIDTH,
            TACTIC_BOTTOM_CELL_HEIGHT,
            true,
            7,
        );
        card.stateCellArtKey = card.stateCellSprite ? key : undefined;
        card.stateLabel.node.setSiblingIndex(card.stateCellNode.children.length - 1);
    }

    private applyTacticCardArt(card: TacticCardView | undefined): void {
        if (!card) return;
        card.cardShellSprite = this.applyTacticRegionSprite(
            card.root,
            'CardShellSprite',
            ArtPilotResourceKey.TacticCardShell,
            card.width,
            card.height,
            true,
            14,
        );
        card.iconCellSprite = this.applyTacticRegionSprite(
            card.iconCellNode,
            'IconCellSprite',
            this.getTacticIconCellKey(card.kind),
            TACTIC_ICON_CELL_WIDTH,
            TACTIC_TOP_CELL_HEIGHT,
            true,
            10,
        );
        const skillIconKey = this.getTacticSkillIconKey(card.kind);
        card.skillIconSprite = skillIconKey ? this.applyChildSprite(
            card.iconCellNode,
            'SkillIconSprite',
            skillIconKey,
            54,
            54,
        ) : undefined;
        if (card.skillIconSprite) {
            card.skillIconSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            card.skillIconSprite.type = Sprite.Type.SIMPLE;
            card.skillIconSprite.node.setScale(1, 1, 1);
            card.skillIconSprite.node.getComponent(UITransform)?.setContentSize(54, 54);
            card.skillIconSprite.node.setSiblingIndex(1);
        }
        card.skillIconFallbackGraphics.node.active = !card.skillIconSprite;

        card.textCellSprite = this.applyTacticRegionSprite(
            card.textCellNode,
            'TextCellSprite',
            this.getTacticTextCellKey(card.kind),
            TACTIC_TEXT_CELL_WIDTH,
            TACTIC_TOP_CELL_HEIGHT,
            true,
            10,
        );
        card.dividerSprite = this.applyTacticRegionSprite(
            card.dividerNode,
            'DividerSprite',
            ArtPilotResourceKey.TacticDivider,
            card.width - 8,
            2,
            false,
        );
        this.applyTacticInfoCellArt(card, 'cost', 'neutral');
        this.applyTacticInfoCellArt(card, 'meta', 'neutral');
        this.applyTacticStateCellArt(card, card.availabilityState);

        card.costIconSprite = this.applyChildSprite(
            card.costCellNode,
            'CostIconSprite',
            ArtPilotResourceKey.SupplyIcon,
            12,
            12,
            -21,
            0,
        );
        card.metaIconSprite = this.applyChildSprite(
            card.metaCellNode,
            'MetaIconSprite',
            card.kind === 'shock' ? ArtPilotResourceKey.TacticStateOnce : ArtPilotResourceKey.TacticStateClock,
            12,
            12,
            -20,
            0,
        );
        card.costIconFallbackGraphics.node.active = !card.costIconSprite;
        card.metaIconFallbackGraphics.node.active = !card.metaIconSprite;
        card.costIconSprite?.node.setSiblingIndex(1);
        card.metaIconSprite?.node.setSiblingIndex(1);
        card.costLabel.node.setSiblingIndex(card.costCellNode.children.length - 1);
        card.metaLabel.node.setSiblingIndex(card.metaCellNode.children.length - 1);

        card.topSectionNode.setSiblingIndex(1);
        card.dividerNode.setSiblingIndex(2);
        card.bottomSectionNode.setSiblingIndex(3);
        card.pressOverlay.setSiblingIndex(4);
        card.touchArea.setSiblingIndex(5);
    }

    private applyFormalBattleTextStyles(state: {
        readonly aiSupplyFrame: boolean;
        readonly playerSupplyFrame: boolean;
        readonly aiEnergyFrame: boolean;
        readonly playerEnergyFrame: boolean;
        readonly levelBadgeArt: boolean;
        readonly statusArt: boolean;
        readonly tacticNoticeArt: boolean;
        readonly tacticHeaderArt: boolean;
    }): void {
        if (state.aiSupplyFrame) {
            this.configureSingleLineLabel(this.aiSupplyLabel, UI_TEXT_PRIMARY);
            this.resizeAndPositionLabel(this.aiSupplyLabel, 16, 0, 112, 32);
        }
        if (state.playerSupplyFrame) {
            this.configureSingleLineLabel(this.playerSupplyLabel, UI_TEXT_VALUE);
            this.resizeAndPositionLabel(this.playerSupplyLabel, 16, 0, 112, 32);
        }
        if (state.aiEnergyFrame) {
            this.configureSingleLineLabel(this.aiEnergyLabel, UI_TEXT_PRIMARY);
            this.configureSingleLineLabel(this.aiEnergyBar.shadowLabel, new Color(255, 244, 220, 230));
            this.resizeAndPositionLabel(this.aiEnergyLabel, ENERGY_BAR_LABEL_X, 0, ENERGY_BAR_LABEL_WIDTH, 38);
            this.resizeAndPositionLabel(this.aiEnergyBar.shadowLabel, ENERGY_BAR_LABEL_X + 2, -2, ENERGY_BAR_LABEL_WIDTH, 38);
        }
        if (state.playerEnergyFrame) {
            this.configureSingleLineLabel(this.playerEnergyLabel, UI_TEXT_PRIMARY);
            this.configureSingleLineLabel(this.playerEnergyBar.shadowLabel, new Color(255, 244, 220, 230));
            this.resizeAndPositionLabel(this.playerEnergyLabel, ENERGY_BAR_LABEL_X, 0, ENERGY_BAR_LABEL_WIDTH, 38);
            this.resizeAndPositionLabel(this.playerEnergyBar.shadowLabel, ENERGY_BAR_LABEL_X + 2, -2, ENERGY_BAR_LABEL_WIDTH, 38);
        }
        if (state.levelBadgeArt) {
            const graphics = this.levelBadge.getComponent(Graphics);
            if (graphics) graphics.enabled = false;
            this.configureSingleLineLabel(this.levelBadgeChapterLabel, UI_TEXT_PRIMARY);
            this.configureSingleLineLabel(this.levelBadgeTitleLabel, new Color(73, 91, 67, 255));
            this.resizeAndPositionLabel(this.levelBadgeChapterLabel, 0, 9.5, LEVEL_BADGE_CONTENT_WIDTH, 22);
            this.resizeAndPositionLabel(this.levelBadgeTitleLabel, 0, -12.5, LEVEL_BADGE_CONTENT_WIDTH, 15);
        }
        if (state.statusArt) {
            const graphics = this.statusToast.getComponent(Graphics);
            if (graphics) graphics.enabled = false;
            this.configureSingleLineLabel(this.statusLabel, UI_TEXT_PRIMARY);
        }
        if (state.tacticNoticeArt) {
            const graphics = this.tacticNotice.getComponent(Graphics);
            if (graphics) graphics.enabled = false;
            this.configureSingleLineLabel(this.tacticNoticeLabel, UI_TEXT_PRIMARY);
        }
        if (state.tacticHeaderArt) {
                const tacticHeader = this.rightControlBar?.getChildByName('TacticSidebarHeader');
            const graphics = tacticHeader?.getComponent(Graphics);
            if (graphics) graphics.enabled = false;
            const title = tacticHeader?.getChildByName('Title')?.getComponent(Label);
            if (title) this.configureSingleLineLabel(title, UI_TEXT_PRIMARY);
        }

        if (this.pauseButton) {
            this.pauseButton.node.setScale(1, 1, 1);
            this.pauseButton.node.getComponent(UITransform)?.setContentSize(PAUSE_BUTTON_WIDTH, PAUSE_BUTTON_HEIGHT);
            this.configureSingleLineLabel(this.pauseButton.label, UI_TEXT_PRIMARY);
            this.resizeAndPositionLabel(this.pauseButton.label, 20, 0, 150, 40);
        }
    }

    private applyTitleArt(): void {
        if (!this.startPanel) return;
        const splash = this.applyChildSprite(this.startPanel, 'SplashArt', ArtPilotResourceKey.SplashScreen, DESIGN_WIDTH, DESIGN_HEIGHT);
        splash?.node.setSiblingIndex(0);
        if (splash) {
            this.setNodeCoverSize(splash.node, DESIGN_WIDTH / DESIGN_HEIGHT);
            const fallbackBackdrop = this.startPanel.getChildByName('FullscreenBackdrop');
            const fallbackCard = this.startPanel.getChildByName('ModalCardBackground');
            if (fallbackBackdrop) fallbackBackdrop.active = false;
            if (fallbackCard) fallbackCard.active = false;
        }
        if (!this.startPanel.getChildByName('TitleReadabilityPanel')) {
            const veil = this.createGraphicsNode(
                'TitleReadabilityPanel',
                START_READABILITY_PANEL_WIDTH,
                START_READABILITY_PANEL_HEIGHT,
                0,
                -4,
                this.startPanel,
            );
            const graphics = veil.getComponent(Graphics)!;
            graphics.fillColor = new Color(8, 20, 34, 138);
            graphics.roundRect(
                -START_READABILITY_PANEL_WIDTH / 2,
                -START_READABILITY_PANEL_HEIGHT / 2,
                START_READABILITY_PANEL_WIDTH,
                START_READABILITY_PANEL_HEIGHT,
                34,
            );
            graphics.fill();
            graphics.lineWidth = 2;
            graphics.strokeColor = new Color(230, 244, 255, 128);
            graphics.roundRect(
                -START_READABILITY_PANEL_WIDTH / 2,
                -START_READABILITY_PANEL_HEIGHT / 2,
                START_READABILITY_PANEL_WIDTH,
                START_READABILITY_PANEL_HEIGHT,
                34,
            );
            graphics.stroke();
            veil.setSiblingIndex(1);
        }
        const wordmark = this.applyChildSprite(this.startPanel, 'LogoWordmarkArt', ArtPilotResourceKey.GameLogoWordmark, 330, 165, 0, 170);
        const emblem = this.applyChildSprite(this.startPanel, 'LogoEmblemArt', ArtPilotResourceKey.GameLogoEmblem, 96, 96, -205, 170);
        wordmark?.node.setSiblingIndex(this.startPanel.children.length - 1);
        emblem?.node.setSiblingIndex(this.startPanel.children.length - 1);
        const title = this.startPanel.getChildByName('StartTitle');
        if (title && this.artResourceManager.hasResource(ArtPilotResourceKey.GameLogoWordmark)) {
            title.active = false;
        }
    }

    private applyResultArt(playerWon: boolean): void {
        if (!this.resultPanel || !this.resultCard || !this.resultBadge) return;
        const panelSprite = this.applyChildSprite(
            this.resultCard,
            'ResultPanelArt',
            ArtPilotResourceKey.ResultPanel,
            720,
            540,
        );
        const panelSourceFrame = this.artResourceManager.getFrame(ArtPilotResourceKey.ResultPanel);
        if (panelSprite && panelSourceFrame?.texture) {
            if (!this.resultPanelCroppedFrame) {
                this.resultPanelCroppedFrame = new SpriteFrame();
            }
            this.resultPanelCroppedFrame.reset({
                texture: panelSourceFrame.texture,
                originalSize: new Size(551, 685),
                rect: new Rect(205, 19, 551, 685),
                offset: new Vec2(0, 0),
                borderLeft: 56,
                borderRight: 56,
                borderTop: 56,
                borderBottom: 56,
                isRotate: false,
            }, true);
            panelSprite.spriteFrame = this.resultPanelCroppedFrame;
            panelSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            panelSprite.type = Sprite.Type.SLICED;
            panelSprite.node.getComponent(UITransform)?.setContentSize(720, 540);
        }
        this.resultCardGraphics.enabled = !panelSprite;
        const emblemKey = playerWon ? ArtPilotResourceKey.VictoryEmblem : ArtPilotResourceKey.DefeatEmblem;
        const overlayKey = playerWon ? ArtPilotResourceKey.VictoryOverlay : ArtPilotResourceKey.DefeatOverlay;
        const badgeSprite = this.applyChildSprite(this.resultBadge, 'ResultEmblemArt', emblemKey, 80, 80);
        if (badgeSprite) {
            this.resultBadge.getComponent(Graphics)!.enabled = false;
        }
        const oldOverlay = this.resultPanel.getChildByName('ResultAtmosphereArt');
        oldOverlay?.destroy();
        const atmosphere = this.applyChildSprite(this.resultPanel, 'ResultAtmosphereArt', overlayKey, DESIGN_WIDTH, DESIGN_HEIGHT);
        if (atmosphere) {
            this.setNodeCoverSize(atmosphere.node, DESIGN_WIDTH / DESIGN_HEIGHT);
            atmosphere.color = new Color(255, 255, 255, playerWon ? 170 : 135);
        }
        this.resultTitleLabel.color = playerWon
            ? new Color(59, 105, 51, 255) : new Color(142, 68, 58, 255);
        this.resultSummaryLabel.color = playerWon
            ? new Color(86, 92, 55, 255) : new Color(121, 77, 68, 255);
        this.resultHintLabel.color = playerWon
            ? new Color(73, 101, 59, 255) : new Color(128, 72, 66, 255);
        this.resultSummaryLabel.color = playerWon
            ? new Color(86, 92, 55, 255) : new Color(121, 77, 68, 255);
        this.resultHintLabel.color = playerWon
            ? new Color(73, 101, 59, 255) : new Color(128, 72, 66, 255);
        this.applyResultButtonSkins();
    }

    private applyGenericButtonSkins(): void {
        const primaryNames = new Set([
            'StartBattleButton',
            'ResumeButton',
            'TutorialConfirmButton',
            'TutorialNextButton',
            'TutorialPreviousButton',
            'ReplayTutorialConfirmButton',
            'ResultNextButton',
            'LevelSelectConfirmButton',
            'TacticDeckConfirmButton',
        ]);
        const warningNames = new Set(['ResetProgressButton', 'PauseRestartButton']);
        for (const node of this.node.getComponentsInChildren(UITransform).map((transform) => transform.node)) {
            const graphics = node.getComponent(Graphics);
            const label = node.getChildByName('Text')?.getComponent(Label);
            if (!graphics || !label || !node.name.toLowerCase().includes('button')) continue;
            if (node.name === 'StartBattleButton' || node.name === 'LevelSelectButton') {
                const genericButtonArt = node.getChildByName('ButtonArt');
                if (genericButtonArt) genericButtonArt.active = false;
                graphics.enabled = true;
                continue;
            }
            const dedicatedUnitCard = node.children.find((child) =>
                child.name.startsWith('UnitCard') && !!child.getComponent(Sprite)?.spriteFrame);
            const dedicatedControlArt = node.children.find((child) =>
                ['AudioIconArt', 'PreviousArt', 'NextArt', 'BackButtonSprite', 'DebugResetButtonSprite']
                    .indexOf(child.name) >= 0
                && !!child.getComponent(Sprite)?.spriteFrame);
            const isDedicatedPauseControl = node.name === 'MusicVolumeMute' || node.name === 'SfxVolumeMute'
                || node.name === 'BgmPreviousButton' || node.name === 'BgmNextButton';
            if (isDedicatedPauseControl) {
                const genericButtonArt = node.getChildByName('ButtonArt');
                if (genericButtonArt) genericButtonArt.active = false;
                graphics.enabled = !dedicatedControlArt;
                continue;
            }
            if (dedicatedUnitCard || dedicatedControlArt) {
                const genericButtonArt = node.getChildByName('ButtonArt');
                if (genericButtonArt) genericButtonArt.active = false;
                graphics.enabled = false;
                continue;
            }
            const key = primaryNames.has(node.name) ? ArtPilotResourceKey.ButtonPrimary
                : warningNames.has(node.name) ? ArtPilotResourceKey.ButtonWarning : ArtPilotResourceKey.ButtonSecondary;
            const size = node.getComponent(UITransform)!.contentSize;
            const sprite = this.applyChildSprite(node, 'ButtonArt', key, size.width, size.height);
            if (sprite) {
                graphics.enabled = false;
                sprite.color = Color.WHITE;
            }
        }
        this.applyResultButtonSkins();
    }

    private createSpriteSlot(
        name: string,
        parent: Node,
        width: number,
        height: number,
        x: number,
        y: number,
        anchorX = 0.5,
        anchorY = 0.5,
    ): { readonly node: Node; readonly sprite: Sprite } {
        const node = new Node(name);
        node.setParent(parent);
        node.setPosition(x, y, 0);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(width, height);
        transform.setAnchorPoint(anchorX, anchorY);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        node.active = false;
        return { node, sprite };
    }

    private createLaneNumberBadges(): void {
        const numberY = LANE_TOP_Y - 78;
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.createLabel(
                this.laneVisualsLayer,
                `LaneNumber${lane + 1}`,
                `${lane + 1}`,
                this.getLaneCenterX(lane),
                numberY,
                36,
                30,
                22,
                new Color(175, 194, 216, 110),
            );
        }
    }

    private createLaneEffectVisuals(): void {
        const centerY = (LANE_BOTTOM_Y + LANE_TOP_Y) * 0.5;
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const root = this.createGraphicsNode(
                `LaneEffectVisual${lane + 1}`,
                LANE_WIDTH - 12,
                LANE_LENGTH - 18,
                this.getLaneCenterX(lane),
                centerY,
                this.laneVisualsLayer,
            );
            root.active = false;
            this.laneEffectVisuals.push(root);
        }
    }

    private refreshLaneEffectVisuals(): void {
        const laneTypes = this.getCurrentLevelConfig().laneTypes;
        for (let lane = 0; lane < this.laneEffectVisuals.length; lane += 1) {
            const root = this.laneEffectVisuals[lane];
            const laneType = laneTypes[lane] ?? 'normal';
            root.active = laneType !== 'normal';
            if (!root.active) continue;
            for (const child of [...root.children]) child.destroy();
            const graphics = root.getComponent(Graphics)!;
            graphics.clear();
            if (laneType === 'mud') {
                // Layered low-alpha shapes keep the mud readable without turning the
                // whole lane into a dark sticker on the bright grass battlefield.
                graphics.fillColor = new Color(124, 83, 47, 54);
                graphics.roundRect(-76, -247, 152, 494, 22);
                graphics.fill();
                graphics.fillColor = new Color(185, 142, 89, 74);
                for (const [x, y, width, height] of [
                    [-32, 156, 34, 10], [31, 96, 46, 12], [-18, 22, 32, 9],
                    [28, -54, 44, 11], [-35, -132, 38, 10], [16, -204, 28, 8],
                ] as const) {
                    graphics.ellipse(x, y, width, height);
                    graphics.fill();
                }
                graphics.fillColor = new Color(239, 218, 178, 42);
                for (const [x, y, width] of [[-33, 158, 20], [29, 98, 27], [28, -52, 26], [-35, -130, 22]] as const) {
                    graphics.ellipse(x, y, width, 3.5);
                    graphics.fill();
                }
                graphics.fillColor = new Color(105, 66, 40, 58);
                for (const [x, y] of [[-12, 128], [15, 66], [-28, -16], [9, -95], [-16, -178]] as const) {
                    graphics.circle(x, y, 2.2);
                    graphics.circle(x + 6, y - 6, 1.5);
                    graphics.fill();
                }
                graphics.lineWidth = 1.25;
                graphics.strokeColor = new Color(250, 229, 185, 46);
                graphics.roundRect(-74, -245, 148, 490, 20);
                graphics.stroke();
            } else {
                graphics.fillColor = new Color(255, 231, 238, 24);
                graphics.roundRect(-74, -247, 148, 494, 20);
                graphics.fill();
                const flowerColors = [
                    new Color(255, 248, 226, 205),
                    new Color(255, 184, 205, 195),
                    new Color(255, 224, 129, 200),
                ];
                for (let index = 0; index < 9; index += 1) {
                    graphics.fillColor = flowerColors[index % flowerColors.length];
                    const x = index % 2 === 0 ? -62 : 62;
                    const y = -212 + index * 53;
                    graphics.circle(x, y, 3.2);
                    graphics.fill();
                }
            }
            const labelText = laneType === 'mud' ? '泥泞\n移速－30%' : '花径\n羊方减伤12%';
            const label = this.createLabel(
                root,
                'LaneEffectLabel',
                labelText,
                0,
                154,
                128,
                42,
                14,
                laneType === 'mud' ? new Color(94, 57, 32, 255) : new Color(76, 82, 55, 255),
            );
            label.enableWrapText = true;
            label.overflow = Label.Overflow.CLAMP;
            label.lineHeight = 18;
            label.horizontalAlign = HorizontalTextAlignment.CENTER;
            label.verticalAlign = VerticalTextAlignment.CENTER;
        }
    }

    private createBaseBars(): void {
        this.aiBaseHudNode = this.createGraphicsNode(
            'AIBaseBar',
            BATTLE_HUD_COLUMNS.base.width,
            BATTLE_HUD_COLUMNS.base.height,
            BATTLE_HUD_COLUMNS.base.centerX,
            AI_HUD_Y,
            this.hudLayer,
        );
        this.playerBaseHudNode = this.createGraphicsNode(
            'PlayerBaseBar',
            BATTLE_HUD_COLUMNS.base.width,
            BATTLE_HUD_COLUMNS.base.height,
            BATTLE_HUD_COLUMNS.base.centerX,
            PLAYER_HUD_Y,
            this.hudLayer,
        );
        this.aiBaseGraphics = this.aiBaseHudNode.getComponent(Graphics)!;
        this.playerBaseGraphics = this.playerBaseHudNode.getComponent(Graphics)!;
        const baseHudState = `${this.playerBaseHealth}:${this.aiBaseHealth}`;
        if (baseHudState !== this.lastBaseHudState) {
            this.lastBaseHudState = baseHudState;
            this.refreshBaseBars();
        }
    }

    private refreshBaseBars(): void {
        if (!this.playerBaseGraphics || !this.aiBaseGraphics) {
            return;
        }
        this.drawBase(this.aiBaseGraphics, Team.AI);
        this.drawBase(this.playerBaseGraphics, Team.Player);
    }

    private drawBase(graphics: Graphics, team: Team): void {
        const health = team === Team.Player ? this.playerBaseHealth : this.aiBaseHealth;
        const healthRatio = Math.max(0, Math.min(1, health / BASE_MAX_HEALTH));
        const fillColor = team === Team.Player ? new Color(66, 213, 122, 255) : new Color(239, 83, 80, 255);
        const borderColor = team === Team.Player ? new Color(140, 242, 178, 255) : new Color(255, 170, 164, 255);
        const baseWidth = HUD_BASE_BAR_WIDTH;
        const baseHalfWidth = baseWidth / 2;
        const innerInset = 6;
        const innerHeight = BASE_BAR_HEIGHT - 12;
        const innerWidth = baseWidth - innerInset * 2;

        graphics.clear();
        graphics.fillColor = new Color(13, 22, 34, 255);
        graphics.roundRect(-baseHalfWidth, -BASE_BAR_HEIGHT / 2, baseWidth, BASE_BAR_HEIGHT, 18);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = borderColor;
        graphics.roundRect(-baseHalfWidth, -BASE_BAR_HEIGHT / 2, baseWidth, BASE_BAR_HEIGHT, 18);
        graphics.stroke();

        const fillWidth = innerWidth * healthRatio;
        if (fillWidth > 0) {
            graphics.fillColor = fillColor;
            graphics.roundRect(-baseHalfWidth + innerInset, -innerHeight / 2, fillWidth, innerHeight, Math.min(14, fillWidth / 2));
            graphics.fill();
        }

        const flashRemaining = team === Team.Player ? this.playerBaseFlashRemaining : this.aiBaseFlashRemaining;
        if (flashRemaining > 0) {
            const flashAlpha = Math.round(145 * flashRemaining / BASE_HIT_FLASH_DURATION);
            graphics.fillColor = new Color(borderColor.r, borderColor.g, borderColor.b, flashAlpha);
            graphics.roundRect(-baseHalfWidth, -BASE_BAR_HEIGHT / 2, baseWidth, BASE_BAR_HEIGHT, 18);
            graphics.fill();
        }
        const formalFill = team === Team.Player ? this.playerBaseFillSprite : this.aiBaseFillSprite;
        if (formalFill?.node.isValid) {
            formalFill.node.setScale(healthRatio, 1, 1);
        }
    }

    private updateBaseHitFeedback(deltaTime: number): void {
        const wasFlashing = this.playerBaseFlashRemaining > 0 || this.aiBaseFlashRemaining > 0;
        this.playerBaseFlashRemaining = Math.max(0, this.playerBaseFlashRemaining - deltaTime);
        this.aiBaseFlashRemaining = Math.max(0, this.aiBaseFlashRemaining - deltaTime);
        if (wasFlashing) {
            this.refreshBaseBars();
        }
    }

    private createFloatingFeedback(text: string, x: number, y: number, color: Color, duration: number, yOffset: number, width: number, fontSize: number): void {
        const effect = this.createGraphicsNode('BattleFeedback', width, 42, x, y, this.unitsAndVfxLayer);
        const graphics = effect.getComponent(Graphics)!;
        graphics.fillColor = new Color(8, 16, 27, 222);
        graphics.roundRect(-width / 2, -21, width, 42, 14);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = color;
        graphics.roundRect(-width / 2, -21, width, 42, 14);
        graphics.stroke();
        this.createLabel(effect, 'Text', text, 0, 0, width - 18, 38, fontSize, color);
        const opacity = effect.addComponent(UIOpacity);
        this.feedbackEffects.push({
            node: effect,
            opacity,
            startX: x,
            startY: y,
            yOffset,
            duration,
            elapsed: 0,
        });
    }

    private updateFeedbackEffects(deltaTime: number): void {
        for (let index = this.feedbackEffects.length - 1; index >= 0; index -= 1) {
            const effect = this.feedbackEffects[index];
            if (!effect.node.isValid) {
                this.feedbackEffects.splice(index, 1);
                continue;
            }
            effect.elapsed += deltaTime;
            const progress = Math.min(1, effect.elapsed / effect.duration);
            effect.node.setPosition(effect.startX, effect.startY + effect.yOffset * progress);
            effect.node.setScale(1 - progress * 0.08, 1 - progress * 0.08, 1);
            effect.opacity.opacity = Math.round(255 * (1 - progress));
            if (progress >= 1) {
                this.feedbackEffects.splice(index, 1);
                effect.node.destroy();
            }
        }
    }

    private clearFeedbackEffects(): void {
        for (const effect of this.feedbackEffects) if (effect.node.isValid) effect.node.destroy();
        this.feedbackEffects.length = 0;
        Tween.stopAllByTarget(this.battleLayer);
        this.battleLayer.setPosition(0, 0, 0);
    }

    private createSupplyPoints(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const node = this.createGraphicsNode(`SupplyPoint${lane}`, 76, 74, this.getLaneCenterX(lane), 0, this.laneVisualsLayer);
            const label = this.createLabel(node, 'Label', '', 4, -8, 92, 22, 10, Color.WHITE);
            const contactShadow = this.createSoftGroundShadow(node, 56, 14, -18);
            const factionSilhouetteNode = this.createGraphicsNode('FactionSilhouette', 64, 64, 0, 0, node);
            const factionSilhouetteGraphics = factionSilhouetteNode.getComponent(Graphics)!;
            factionSilhouetteNode.active = false;
            const goldenOverlayNode = this.createGraphicsNode('GoldenOverlay', 96, 96, 0, 0, node);
            const goldenOverlayGraphics = goldenOverlayNode.getComponent(Graphics)!;
            goldenOverlayNode.active = false;
            const point: SupplyPoint = {
                lane,
                node,
                graphics: node.getComponent(Graphics)!,
                label,
                factionSilhouetteNode,
                factionSilhouetteGraphics,
                goldenOverlayNode,
                goldenOverlayGraphics,
                artStateIndex: -1,
                owner: null,
                capturingTeam: null,
                captureTime: 0,
            };
            if (ART_PILOT_ENABLED && (ART_FULL_ENABLED || lane === ART_PILOT_LANE_INDEX)) {
                const artSlot = this.createSpriteSlot('SupplyPointArt', node, 64, 64, 0, 0);
                artSlot.node.setSiblingIndex(1);
                point.artSprite = artSlot.sprite;
            }
            contactShadow.setSiblingIndex(0);
            factionSilhouetteNode.setSiblingIndex(Math.min(1, node.children.length - 1));
            goldenOverlayNode.setSiblingIndex(Math.max(1, node.children.length - 2));
            label.node.setSiblingIndex(node.children.length - 1);
            this.supplyPoints.push(point);
            this.drawSupplyPoint(point);
        }
    }

    private drawSupplyPoint(point: SupplyPoint): void {
        const graphics = point.graphics;
        const isGolden = this.currentLevel === 6 && this.goldenActiveRemaining > 0 && point.lane === this.goldenLane;
        const compactOwnerText = isGolden
            ? point.owner === Team.Player ? '玩家占领' : point.owner === Team.AI ? 'AI占领' : '黄金中立'
            : point.owner === Team.Player ? '\u7F8A' : point.owner === Team.AI ? '\u72FC' : '\u4E2D';
        point.label.string = point.capturingTeam === null
            ? compactOwnerText : `\u593A\u53D6 ${Math.ceil(point.captureTime / SUPPLY_CAPTURE_SECONDS * 100)}%`;
        if (ART_PILOT_ENABLED && (ART_FULL_ENABLED || point.lane === ART_PILOT_LANE_INDEX) && point.artSprite) {
            // The formal v02 sheet owns the faction silhouette. A live capture uses
            // frame 3 while owner remains unchanged until the capture timer completes.
            const artStateIndex = point.capturingTeam !== null
                ? 3 : point.owner === Team.Player ? 1 : point.owner === Team.AI ? 2 : 0;
            const artFrame = this.artResourceManager.getFrame(ArtPilotResourceKey.SupplyPoint, artStateIndex);
            if (artFrame) {
                if (point.artStateIndex !== artStateIndex || point.artSprite.spriteFrame !== artFrame) {
                    point.artStateIndex = artStateIndex;
                    point.artSprite.spriteFrame = artFrame;
                }
                point.artSprite.node.active = true;
                graphics.enabled = false;
                point.factionSilhouetteNode.active = false;
                this.drawGoldenSupplyOverlay(point, isGolden);
                return;
            }
            point.artSprite.node.active = false;
        }
        this.drawSupplyFactionSilhouette(point);
        graphics.enabled = true;
        const ownerColor = point.owner === Team.Player
            ? new Color(70, 162, 230, 255)
            : point.owner === Team.AI ? new Color(223, 89, 79, 255) : new Color(116, 132, 148, 255);
        const captureColor = point.capturingTeam === Team.Player
            ? new Color(153, 220, 255, 255)
            : point.capturingTeam === Team.AI ? new Color(255, 177, 163, 255) : new Color(184, 194, 204, 255);

        graphics.clear();
        graphics.fillColor = new Color(20, 28, 41, 245);
        graphics.circle(0, 0, 28);
        graphics.fill();
        graphics.lineWidth = 4;
        graphics.strokeColor = ownerColor;
        graphics.circle(0, 0, 28);
        graphics.stroke();
        graphics.fillColor = new Color(ownerColor.r, ownerColor.g, ownerColor.b, point.owner === null ? 65 : 145);
        graphics.circle(0, 0, 22);
        graphics.fill();

        graphics.lineWidth = 3;
        graphics.strokeColor = captureColor;
        graphics.moveTo(-9, -15);
        graphics.lineTo(-9, 16);
        graphics.stroke();
        graphics.fillColor = ownerColor;
        graphics.moveTo(-8, 14);
        graphics.lineTo(15, 7);
        graphics.lineTo(-8, 0);
        graphics.close();
        graphics.fill();

        graphics.fillColor = new Color(30, 38, 49, 255);
        graphics.roundRect(-28, 30, 56, 5, 2);
        graphics.fill();
        if (point.capturingTeam !== null) {
            const progressWidth = 56 * point.captureTime / SUPPLY_CAPTURE_SECONDS;
            graphics.fillColor = captureColor;
            graphics.roundRect(-28, 30, progressWidth, 5, 2);
            graphics.fill();
        }
        this.drawGoldenSupplyOverlay(point, isGolden);
    }

    private drawGoldenSupplyOverlay(point: SupplyPoint, active: boolean): void {
        point.goldenOverlayNode.active = active;
        if (!active) return;
        const graphics = point.goldenOverlayGraphics;
        const pulse = 0.5 + Math.sin(this.goldenVisualPhase * Math.PI * 2) * 0.5;
        const ownerAccent = point.owner === Team.Player
            ? new Color(78, 188, 112, 255)
            : point.owner === Team.AI ? new Color(220, 91, 72, 255) : new Color(247, 199, 74, 255);
        graphics.clear();
        graphics.lineWidth = 4 + pulse * 1.5;
        graphics.strokeColor = new Color(248, 205, 83, Math.round(185 + pulse * 55));
        graphics.circle(0, 0, 36 + pulse * 2);
        graphics.stroke();
        graphics.lineWidth = 2.5;
        graphics.strokeColor = ownerAccent;
        graphics.circle(0, 0, 31);
        graphics.stroke();
        graphics.fillColor = new Color(255, 235, 141, Math.round(35 + pulse * 35));
        graphics.circle(0, 0, 33);
        graphics.fill();
        graphics.fillColor = new Color(255, 232, 118, 235);
        for (let index = 0; index < 3; index += 1) {
            const angle = this.goldenVisualPhase * 1.4 + index * Math.PI * 2 / 3;
            const x = Math.cos(angle) * 42;
            const y = Math.sin(angle) * 29;
            const radius = 2.5 + ((index + Math.round(this.goldenVisualPhase * 4)) % 2) * 1.2;
            graphics.circle(x, y, radius);
        }
        graphics.fill();
        point.label.color = point.owner === Team.Player
            ? new Color(35, 105, 61, 255)
            : point.owner === Team.AI ? new Color(139, 48, 37, 255) : new Color(120, 82, 24, 255);
        point.label.node.setSiblingIndex(point.node.children.length - 1);
    }

    private updateSupplyPoints(deltaTime: number): void {
        let playerControlledCount = 0;
        let aiControlledCount = 0;
        let captureMessage: string | undefined;

        for (const point of this.supplyPoints) {
            const playerPresence = this.countUnitsInSupplyRange(point.lane, Team.Player);
            const aiPresence = this.countUnitsInSupplyRange(point.lane, Team.AI);
            const capturingTeam = playerPresence > 0 && aiPresence === 0
                ? Team.Player : aiPresence > 0 && playerPresence === 0 ? Team.AI : null;

            if (capturingTeam === null || capturingTeam === point.owner) {
                point.capturingTeam = null;
                point.captureTime = 0;
            } else {
                if (point.capturingTeam !== capturingTeam) {
                    point.capturingTeam = capturingTeam;
                    point.captureTime = 0;
                }
                point.captureTime += deltaTime;
                if (point.captureTime >= SUPPLY_CAPTURE_SECONDS) {
                    point.owner = capturingTeam;
                    point.capturingTeam = null;
                    point.captureTime = 0;
                    captureMessage = `${capturingTeam === Team.Player ? '玩家' : 'AI'}夺取了第 ${point.lane + 1} 线补给点！`;
                    this.handleLevelSixGoldenCapture(point, capturingTeam);
                    if (capturingTeam === Team.Player && this.tutorialFlowActive
                        && this.tutorialProgress === 'capture-supply'
                        && point.lane === this.tutorialDeploymentLane) {
                        this.handleLevelOneTutorialSupplyCaptured(point);
                    }
                }
            }

            if (point.owner === Team.Player) {
                playerControlledCount += 1;
            } else if (point.owner === Team.AI) {
                aiControlledCount += 1;
            }
            this.drawSupplyPoint(point);
        }

        const playerSupplyGain = Math.min(SUPPLY_MAX - this.playerSupply,
            playerControlledCount * SUPPLY_VALUE_PER_POINT_PER_SECOND * deltaTime);
        const aiSupplyGain = Math.min(SUPPLY_MAX - this.aiSupply,
            aiControlledCount * SUPPLY_VALUE_PER_POINT_PER_SECOND * deltaTime);
        this.playerSupply += playerSupplyGain;
        this.aiSupply += aiSupplyGain;
        this.playerStats.supplyEarned += playerSupplyGain;
        this.aiStats.supplyEarned += aiSupplyGain;
        if (captureMessage) {
            this.refreshHud(captureMessage);
        }
    }

    private createLevelSixGoldenHud(): void {
        this.goldenSupplyPanel = this.createGraphicsNode(
            'GoldenSupplyPanel', 216, 96, LEVEL_BADGE_X + 48, 232, this.hudLayer,
        );
        this.goldenSupplyPanelGraphics = this.goldenSupplyPanel.getComponent(Graphics)!;
        this.goldenSupplyPanelGraphics.fillColor = new Color(255, 246, 205, 238);
        this.goldenSupplyPanelGraphics.roundRect(-108, -48, 216, 96, 16);
        this.goldenSupplyPanelGraphics.fill();
        this.goldenSupplyPanelGraphics.lineWidth = 3;
        this.goldenSupplyPanelGraphics.strokeColor = new Color(210, 166, 53, 245);
        this.goldenSupplyPanelGraphics.roundRect(-108, -48, 216, 96, 16);
        this.goldenSupplyPanelGraphics.stroke();
        this.goldenSupplyLaneLabel = this.createLabel(
            this.goldenSupplyPanel, 'GoldenLane', '', 0, 26, 190, 24, 15, new Color(105, 72, 25, 255),
        );
        this.goldenSupplyTimeLabel = this.createLabel(
            this.goldenSupplyPanel, 'GoldenTime', '', 0, 0, 190, 22, 14, new Color(105, 72, 25, 255),
        );
        this.goldenSupplyOwnerLabel = this.createLabel(
            this.goldenSupplyPanel, 'GoldenOwner', '', 0, -25, 190, 22, 14, new Color(57, 111, 66, 255),
        );
        for (const label of [this.goldenSupplyLaneLabel, this.goldenSupplyTimeLabel, this.goldenSupplyOwnerLabel]) {
            this.configureSingleLineLabel(label, label.color);
            label.isBold = true;
        }
        this.goldenSupplyPanel.active = false;

        this.goldenSupplyNotice = this.createGraphicsNode(
            'GoldenSupplyNotice', 470, 48, BATTLEFIELD_CENTER_X, 218, this.toastLayer,
        );
        const noticeGraphics = this.goldenSupplyNotice.getComponent(Graphics)!;
        noticeGraphics.fillColor = new Color(255, 245, 196, 245);
        noticeGraphics.roundRect(-235, -24, 470, 48, 15);
        noticeGraphics.fill();
        noticeGraphics.lineWidth = 3;
        noticeGraphics.strokeColor = new Color(224, 174, 47, 255);
        noticeGraphics.roundRect(-235, -24, 470, 48, 15);
        noticeGraphics.stroke();
        this.goldenSupplyNoticeLabel = this.createLabel(
            this.goldenSupplyNotice, 'Text', '', 0, 0, 438, 34, 21, new Color(112, 73, 20, 255),
        );
        this.configureSingleLineLabel(this.goldenSupplyNoticeLabel, new Color(112, 73, 20, 255));
        this.goldenSupplyNoticeLabel.isBold = true;
        this.goldenSupplyNotice.active = false;
    }

    private updateLevelSixGoldenSupply(deltaTime: number): void {
        if (this.currentLevel !== 6) return;
        this.goldenVisualPhase = (this.goldenVisualPhase + deltaTime * 0.7) % 1;

        if (this.goldenActiveRemaining > 0) {
            this.goldenActiveRemaining = Math.max(0, this.goldenActiveRemaining - deltaTime);
            if (this.goldenActiveRemaining <= 0) this.finishLevelSixGoldenRound();
        }

        this.goldenNextActivationRemaining -= deltaTime;
        if (!this.goldenWarningShown
            && this.goldenNextActivationRemaining <= LEVEL_SIX_GOLDEN_WARNING_SECONDS
            && this.goldenNextActivationRemaining > 0) {
            this.goldenPendingLane = this.chooseNextGoldenLane();
            this.goldenWarningShown = true;
        }
        if (this.goldenNextActivationRemaining <= 0) {
            this.activateLevelSixGoldenLane();
        }
        this.refreshLevelSixGoldenHud();
    }

    private chooseNextGoldenLane(): number {
        if (this.goldenLaneBag.length === 0) {
            for (let lane = 0; lane < LANE_X.length; lane += 1) this.goldenLaneBag.push(lane);
            for (let index = this.goldenLaneBag.length - 1; index > 0; index -= 1) {
                const swapIndex = Math.floor(Math.random() * (index + 1));
                const value = this.goldenLaneBag[index];
                this.goldenLaneBag[index] = this.goldenLaneBag[swapIndex];
                this.goldenLaneBag[swapIndex] = value;
            }
            if (this.goldenLaneBag.length > 1
                && this.goldenLaneBag[this.goldenLaneBag.length - 1] === this.goldenPreviousLane) {
                const swapIndex = this.goldenLaneBag.length - 2;
                const value = this.goldenLaneBag[swapIndex];
                this.goldenLaneBag[swapIndex] = this.goldenLaneBag[this.goldenLaneBag.length - 1];
                this.goldenLaneBag[this.goldenLaneBag.length - 1] = value;
            }
        }
        let lane = this.goldenLaneBag.pop() ?? Math.floor(Math.random() * LANE_X.length);
        if (lane === this.goldenPreviousLane && this.goldenLaneBag.length > 0) {
            const alternative = this.goldenLaneBag.pop()!;
            this.goldenLaneBag.push(lane);
            lane = alternative;
        }
        return lane;
    }

    private activateLevelSixGoldenLane(): void {
        const lane = this.goldenPendingLane >= 0 ? this.goldenPendingLane : this.chooseNextGoldenLane();
        this.goldenLane = lane;
        this.goldenPreviousLane = lane;
        this.goldenPendingLane = -1;
        this.goldenRoundId += 1;
        this.goldenLaneHistory.push(lane);
        this.goldenActiveRemaining = LEVEL_SIX_GOLDEN_ACTIVE_SECONDS;
        this.goldenNextActivationRemaining += LEVEL_SIX_GOLDEN_ROTATION_SECONDS;
        this.goldenWarningShown = false;
        this.goldenCaptureRewardGranted = false;
        this.goldenRewardTeam = null;
        const point = this.supplyPoints[lane];
        if (point?.owner !== null && point?.owner !== undefined) {
            this.handleLevelSixGoldenCapture(point, point.owner);
        }
        this.refreshHud(`第${lane + 1}路已成为黄金补给线，持续${LEVEL_SIX_GOLDEN_ACTIVE_SECONDS}秒！`);
        this.refreshLevelSixGoldenHud();
    }

    private handleLevelSixGoldenCapture(point: SupplyPoint, team: Team): void {
        if (this.currentLevel !== 6 || this.goldenActiveRemaining <= 0
            || point.lane !== this.goldenLane || this.goldenCaptureRewardGranted) return;
        this.goldenCaptureRewardGranted = true;
        this.goldenRewardTeam = team;
        const baseGranted = this.grantSupplyReward(team, LEVEL_SIX_GOLDEN_CAPTURE_REWARD);
        let bonusGranted = 0;
        if (team === Team.Player && this.playerSupplyBoostRemaining > 0) {
            bonusGranted = this.grantSupplyReward(Team.Player, SUPPLY_BOOST_CAPTURE_BONUS);
            this.playerSupplyBoostRemaining = 0;
            this.supplyBoostTriggeredRound = this.goldenRoundId;
        }
        this.refreshHud(`${team === Team.Player ? '玩家' : 'AI'}首次占领黄金补给点，获得${baseGranted + bonusGranted}点补给！`);
        this.refreshTacticCards(true);
    }

    private finishLevelSixGoldenRound(): void {
        const lane = this.goldenLane;
        const point = lane >= 0 ? this.supplyPoints[lane] : undefined;
        let rewardMessage = '黄金补给线已结束。';
        if (point && this.goldenRewardTeam !== null && point.owner === this.goldenRewardTeam) {
            const holdGranted = this.grantSupplyReward(this.goldenRewardTeam, LEVEL_SIX_GOLDEN_HOLD_REWARD);
            let boostGranted = 0;
            if (this.goldenRewardTeam === Team.Player && this.supplyBoostTriggeredRound === this.goldenRoundId) {
                boostGranted = this.grantSupplyReward(Team.Player, SUPPLY_BOOST_HOLD_BONUS);
            }
            rewardMessage = `${this.goldenRewardTeam === Team.Player ? '玩家' : 'AI'}守住黄金补给点，获得${holdGranted + boostGranted}点奖励！`;
        }
        this.supplyBoostTriggeredRound = 0;
        this.goldenLane = -1;
        this.goldenCaptureRewardGranted = false;
        this.goldenRewardTeam = null;
        this.refreshHud(rewardMessage);
        this.refreshLevelSixGoldenHud();
    }

    private grantSupplyReward(team: Team, amount: number): number {
        const current = team === Team.Player ? this.playerSupply : this.aiSupply;
        const granted = Math.max(0, Math.min(amount, SUPPLY_MAX - current));
        if (team === Team.Player) this.playerSupply += granted;
        else this.aiSupply += granted;
        this.getBattleStats(team).supplyEarned += granted;
        return granted;
    }

    private refreshLevelSixGoldenHud(): void {
        if (!this.goldenSupplyPanel || !this.goldenSupplyNotice) return;
        const visible = this.currentLevel === 6 && this.isStarted && !this.isFinished;
        this.goldenSupplyPanel.active = visible;
        if (!visible) {
            this.goldenSupplyNotice.active = false;
            return;
        }
        if (this.goldenActiveRemaining > 0 && this.goldenLane >= 0) {
            const point = this.supplyPoints[this.goldenLane];
            this.goldenSupplyLaneLabel.string = `黄金补给线：第${this.goldenLane + 1}路`;
            this.goldenSupplyTimeLabel.string = `剩余：${this.formatGoldenCountdown(this.goldenActiveRemaining)}秒`;
            this.goldenSupplyOwnerLabel.string = `占领方：${point?.owner === Team.Player ? '玩家' : point?.owner === Team.AI ? 'AI' : '中立'}`;
        } else {
            this.goldenSupplyLaneLabel.string = '黄金补给线：等待中';
            this.goldenSupplyTimeLabel.string = `下轮：${this.formatGoldenCountdown(this.goldenNextActivationRemaining)}秒`;
            this.goldenSupplyOwnerLabel.string = '占领方：中立';
        }
        const warningVisible = this.goldenWarningShown && this.goldenPendingLane >= 0
            && this.goldenNextActivationRemaining > 0;
        this.goldenSupplyNotice.active = warningVisible;
        if (warningVisible) {
            this.goldenSupplyNoticeLabel.string = `第${this.goldenPendingLane + 1}路即将成为黄金补给线！`;
            this.goldenSupplyNotice.setSiblingIndex(this.toastLayer.children.length - 1);
        }
    }

    private formatGoldenCountdown(seconds: number): string {
        const whole = Math.max(0, Math.ceil(seconds));
        return whole < 10 ? `0${whole}` : `${whole}`;
    }

    private resetLevelSixGoldenState(): void {
        this.goldenNextActivationRemaining = LEVEL_SIX_FIRST_GOLDEN_ACTIVATION_SECONDS;
        this.goldenActiveRemaining = 0;
        this.goldenPendingLane = -1;
        this.goldenLane = -1;
        this.goldenPreviousLane = -1;
        this.goldenRoundId = 0;
        this.goldenWarningShown = false;
        this.goldenCaptureRewardGranted = false;
        this.goldenRewardTeam = null;
        this.goldenVisualPhase = 0;
        this.goldenLaneBag.length = 0;
        this.goldenLaneHistory.length = 0;
        this.levelSixAILaneDecisions.fill(0);
        this.supplyBoostTriggeredRound = 0;
        if (this.goldenSupplyPanel) this.goldenSupplyPanel.active = false;
        if (this.goldenSupplyNotice) this.goldenSupplyNotice.active = false;
        for (const point of this.supplyPoints) {
            point.goldenOverlayNode.active = false;
            point.goldenOverlayGraphics.clear();
        }
    }

    private countUnitsInSupplyRange(lane: number, team: Team): number {
        return this.units.filter((unit) => unit.team === team && unit.lane === lane
            && unit.health > 0 && unit.node.isValid && Math.abs(unit.node.position.y) <= SUPPLY_CAPTURE_RADIUS).length;
    }

    private getSupplyIncome(team: Team): number {
        const controlledCount = this.supplyPoints.filter((point) => point.owner === team).length;
        return controlledCount * SUPPLY_VALUE_PER_POINT_PER_SECOND;
    }

    private createHud(): void {
        this.aiBaseShadowLabel = this.createLabel(this.aiBaseHudNode, 'TextShadow', '', 2, -2,
            BATTLE_HUD_COLUMNS.base.width, 34, 23, new Color(3, 9, 17, 255));
        this.aiBaseLabel = this.createLabel(this.aiBaseHudNode, 'Text', '', 0, 0,
            BATTLE_HUD_COLUMNS.base.width, 34, 23, Color.WHITE);
        this.aiSupplyBadge = this.createResourceBadge('AISupplyBadge', BATTLE_HUD_COLUMNS.supply.centerX, AI_HUD_Y,
            new Color(47, 34, 40, 255), new Color(178, 108, 116, 255));
        this.aiSupplyLabel = this.createLabel(this.aiSupplyBadge, 'Text', '', 0, 0,
            BATTLE_HUD_COLUMNS.supply.width - 24, 32, 16, new Color(215, 255, 236, 255));
        this.configureSingleLineLabel(this.aiSupplyLabel, new Color(215, 255, 236, 255));
        this.aiEnergyBar = this.createEnergyBar('AIEnergyBar', BATTLE_HUD_COLUMNS.energy.centerX, AI_HUD_Y,
            new Color(238, 137, 76, 255), new Color(211, 113, 94, 255), new Color(255, 202, 133, 255), 'AI \u80FD\u91CF');
        this.aiEnergyLabel = this.aiEnergyBar.label;
        const aiEnergyFx = this.createLevelFiveEnergyFx(this.aiEnergyBar.node, 'AILevelFiveEnergyFx');
        this.levelFiveAiEnergyFx = aiEnergyFx.node;
        this.levelFiveAiEnergyFxOpacity = aiEnergyFx.opacity;
        this.aiTacticLabel = this.createLabel(this.hudLayer, 'AITactic', '', 0, 0, 1, 1, 1, Color.WHITE);
        this.aiTacticLabel.node.active = false;

        this.playerBaseShadowLabel = this.createLabel(this.playerBaseHudNode, 'TextShadow', '', 2, -2,
            BATTLE_HUD_COLUMNS.base.width, 34, 23, new Color(3, 9, 17, 255));
        this.playerBaseLabel = this.createLabel(this.playerBaseHudNode, 'Text', '', 0, 0,
            BATTLE_HUD_COLUMNS.base.width, 34, 23, Color.WHITE);
        this.playerSupplyBadge = this.createResourceBadge('PlayerSupplyBadge', BATTLE_HUD_COLUMNS.supply.centerX, PLAYER_HUD_Y,
            new Color(10, 43, 46, 255), new Color(164, 244, 220, 255));
        this.playerSupplyLabel = this.createLabel(this.playerSupplyBadge, 'Text', '', 0, 0,
            BATTLE_HUD_COLUMNS.supply.width - 24, 32, 16, new Color(230, 255, 242, 255));
        this.configureSingleLineLabel(this.playerSupplyLabel, new Color(230, 255, 242, 255));
        this.playerEnergyBar = this.createEnergyBar('PlayerEnergyBar', BATTLE_HUD_COLUMNS.energy.centerX, PLAYER_HUD_Y,
            new Color(48, 195, 255, 255), new Color(137, 220, 255, 255), new Color(255, 216, 90, 255), '\u80FD\u91CF');
        this.playerEnergyLabel = this.playerEnergyBar.label;
        const playerEnergyFx = this.createLevelFiveEnergyFx(this.playerEnergyBar.node, 'PlayerLevelFiveEnergyFx');
        this.levelFivePlayerEnergyFx = playerEnergyFx.node;
        this.levelFivePlayerEnergyFxOpacity = playerEnergyFx.opacity;
        this.snapEnergyBarsToCurrentValues();
        this.applyBattleHudColumnLayout();

        this.statusToast = this.createGraphicsNode('StatusToast', STATUS_TOAST_WIDTH, STATUS_TOAST_HEIGHT,
            STATUS_TOAST_X, STATUS_TOAST_Y, this.toastLayer);
        this.statusToast.addComponent(BlockInputEvents);
        const toastGraphics = this.statusToast.getComponent(Graphics)!;
        toastGraphics.fillColor = new Color(10, 18, 29, 220);
        toastGraphics.roundRect(-STATUS_TOAST_WIDTH / 2, -STATUS_TOAST_HEIGHT / 2,
            STATUS_TOAST_WIDTH, STATUS_TOAST_HEIGHT, 16);
        toastGraphics.fill();
        toastGraphics.lineWidth = 2;
        toastGraphics.strokeColor = new Color(188, 220, 242, 190);
        toastGraphics.roundRect(-STATUS_TOAST_WIDTH / 2, -STATUS_TOAST_HEIGHT / 2,
            STATUS_TOAST_WIDTH, STATUS_TOAST_HEIGHT, 16);
        toastGraphics.stroke();
        this.statusLabel = this.createLabel(this.statusToast, 'Text', '', 0, 0,
            STATUS_TOAST_WIDTH - 48, STATUS_TOAST_HEIGHT - 12, 22, new Color(232, 237, 244, 255));
        this.configureSingleLineLabel(this.statusLabel, new Color(232, 237, 244, 255));
        this.statusToastOpacity = this.statusToast.addComponent(UIOpacity);
        this.statusToast.active = false;
        this.createTacticNotice();
    }

    private createLevelFiveEnergyFx(parent: Node, name: string): { readonly node: Node; readonly opacity: UIOpacity } {
        const node = this.createGraphicsNode(name, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT, 0, 0, parent);
        const graphics = node.getComponent(Graphics)!;
        graphics.fillColor = new Color(255, 210, 62, 230);
        graphics.moveTo(-92, 14);
        graphics.lineTo(-79, 2);
        graphics.lineTo(-86, 2);
        graphics.lineTo(-75, -14);
        graphics.lineTo(-96, 6);
        graphics.lineTo(-88, 6);
        graphics.close();
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(104, 229, 191, 150);
        for (const offset of [-18, 0, 18]) {
            graphics.moveTo(-54 + offset, -13);
            graphics.bezierCurveTo(-44 + offset, -5, -44 + offset, 5, -32 + offset, 13);
        }
        graphics.stroke();
        const opacity = node.addComponent(UIOpacity);
        opacity.opacity = 0;
        node.active = false;
        node.setSiblingIndex(parent.children.length - 1);
        return { node, opacity };
    }

    private updateLevelFiveEnergyFeedback(
        deltaTime: number,
        previousPlayerEnergy: number,
        previousAiEnergy: number,
    ): void {
        const active = this.currentLevel === 5 && this.isStarted && !this.isFinished;
        if (this.levelFivePlayerEnergyFx) this.levelFivePlayerEnergyFx.active = active;
        if (this.levelFiveAiEnergyFx) this.levelFiveAiEnergyFx.active = active;
        if (!active) {
            if (this.levelFivePlayerEnergyFxOpacity) this.levelFivePlayerEnergyFxOpacity.opacity = 0;
            if (this.levelFiveAiEnergyFxOpacity) this.levelFiveAiEnergyFxOpacity.opacity = 0;
            return;
        }
        if (previousPlayerEnergy < ENERGY_MAX && this.playerEnergy >= ENERGY_MAX) {
            this.levelFivePlayerFullFlashRemaining = 0.34;
        }
        if (previousAiEnergy < ENERGY_MAX && this.aiEnergy >= ENERGY_MAX) {
            this.levelFiveAiFullFlashRemaining = 0.34;
        }
        this.levelFivePlayerFullFlashRemaining = Math.max(0, this.levelFivePlayerFullFlashRemaining - deltaTime);
        this.levelFiveAiFullFlashRemaining = Math.max(0, this.levelFiveAiFullFlashRemaining - deltaTime);
        this.levelFiveEnergyFxPhase += deltaTime * 5.5;
        const recoveryGlow = 96 + Math.round((Math.sin(this.levelFiveEnergyFxPhase) * 0.5 + 0.5) * 54);
        if (this.levelFivePlayerEnergyFxOpacity) {
            this.levelFivePlayerEnergyFxOpacity.opacity = this.levelFivePlayerFullFlashRemaining > 0
                ? 230 : Math.min(170, recoveryGlow + (this.playerEnergySurgeRemaining > 0 ? 28 : 0));
        }
        if (this.levelFiveAiEnergyFxOpacity) {
            this.levelFiveAiEnergyFxOpacity.opacity = this.levelFiveAiFullFlashRemaining > 0 ? 220 : recoveryGlow;
        }
    }

    private applyBattleHudColumnLayout(): void {
        this.applyBattleHudColumnNode(this.aiSupplyBadge, BATTLE_HUD_COLUMNS.supply, AI_HUD_Y);
        this.applyBattleHudColumnNode(this.aiBaseHudNode, BATTLE_HUD_COLUMNS.base, AI_HUD_Y);
        this.applyBattleHudColumnNode(this.aiEnergyBar.node, BATTLE_HUD_COLUMNS.energy, AI_HUD_Y);
        this.applyBattleHudColumnNode(this.playerSupplyBadge, BATTLE_HUD_COLUMNS.supply, this.playerHudY);
        this.applyBattleHudColumnNode(this.playerBaseHudNode, BATTLE_HUD_COLUMNS.base, this.playerHudY);
        this.applyBattleHudColumnNode(this.playerEnergyBar.node, BATTLE_HUD_COLUMNS.energy, this.playerHudY);

        for (const label of [this.aiBaseShadowLabel, this.playerBaseShadowLabel]) {
            this.resizeAndPositionLabel(label, 2, -2, BATTLE_HUD_COLUMNS.base.width, 34);
            label.node.setScale(1, 1, 1);
        }
        for (const label of [this.aiBaseLabel, this.playerBaseLabel]) {
            this.resizeAndPositionLabel(label, 0, 0, BATTLE_HUD_COLUMNS.base.width, 34);
            label.node.setScale(1, 1, 1);
        }
    }

    private auditBottomHudClearance(metrics: LandscapeLayoutMetrics): void {
        if (!DEBUG_BOTTOM_HUD_ASSERT || this.typeButtons.size !== UNIT_ORDER.length) return;
        const hudNodes = [this.playerSupplyBadge, this.playerBaseHudNode, this.playerEnergyBar?.node]
            .filter((node): node is Node => !!node?.isValid);
        if (hudNodes.length !== 3 || !this.unitCardSidebar?.isValid) return;
        const hudBottom = Math.min(...hudNodes.map((node) => {
            const height = node.getComponent(UITransform)?.height ?? 0;
            return node.position.y - height * Math.abs(node.scale.y) / 2;
        }));
        const hudTop = Math.max(...hudNodes.map((node) => {
            const height = node.getComponent(UITransform)?.height ?? 0;
            return node.position.y + height * Math.abs(node.scale.y) / 2;
        }));
        const sidebarBottom = this.unitCardSidebar.position.y - UNIT_CARD_SIDEBAR_HEIGHT / 2;
        const sidebarRight = this.unitCardSidebar.position.x + UNIT_CARD_WIDTH / 2;
        const firstLaneTouchLeft = this.getLaneCenterX(0) - LANE_HIT_AREA_WIDTH / 2;
        const hudSafeBottomClearance = hudBottom - metrics.safeBottom;
        const sidebarHudClearance = sidebarBottom - hudTop;
        const laneTouchClearance = firstLaneTouchLeft - sidebarRight;
        const signature = `${metrics.visibleWidth.toFixed(1)}x${metrics.visibleHeight.toFixed(1)}`
            + `:${metrics.safeBottom.toFixed(1)}:${hudSafeBottomClearance.toFixed(2)}`
            + `:${sidebarHudClearance.toFixed(2)}:${laneTouchClearance.toFixed(2)}`;
        if (signature === this.bottomHudAuditSignature) return;
        this.bottomHudAuditSignature = signature;
        const details = {
            visible: `${metrics.visibleWidth.toFixed(1)}x${metrics.visibleHeight.toFixed(1)}`,
            safeBottom: Number(metrics.safeBottom.toFixed(1)),
            hudSafeBottomClearance: Number(hudSafeBottomClearance.toFixed(2)),
            sidebarHudClearance: Number(sidebarHudClearance.toFixed(2)),
            laneTouchClearance: Number(laneTouchClearance.toFixed(2)),
            required: HUD_SAFE_MARGIN,
        };
        if (hudSafeBottomClearance + 0.01 < HUD_SAFE_MARGIN
            || sidebarHudClearance + 0.01 < HUD_SAFE_MARGIN
            || laneTouchClearance < 0) {
            console.warn('[WolfSheepBattle][BottomHud] 左侧卡栏或玩家HUD安全间距不足。', details);
        } else {
            console.info('[WolfSheepBattle][BottomHud] 左侧卡栏与玩家HUD边界检查通过。', details);
        }
    }

    private createLevelFiveRushNotice(): void {
        this.levelFiveRushNotice = this.createGraphicsNode(
            'LevelFiveRushNotice',
            360,
            58,
            0,
            -108,
            this.toastLayer,
        );
        const graphics = this.levelFiveRushNotice.getComponent(Graphics)!;
        graphics.fillColor = new Color(255, 246, 198, 238);
        graphics.roundRect(-180, -29, 360, 58, 20);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = new Color(232, 180, 54, 245);
        graphics.roundRect(-178, -27, 356, 54, 18);
        graphics.stroke();
        graphics.fillColor = new Color(117, 193, 93, 230);
        graphics.ellipse(-151, 14, 14, 6);
        graphics.ellipse(151, -13, 14, 6);
        graphics.fill();
        this.levelFiveRushNoticeLabel = this.createLabel(
            this.levelFiveRushNotice,
            'Text',
            '',
            0,
            0,
            320,
            46,
            24,
            new Color(101, 68, 29, 255),
        );
        this.configureSingleLineLabel(this.levelFiveRushNoticeLabel, new Color(101, 68, 29, 255));
        this.levelFiveRushNoticeLabel.enableOutline = true;
        this.levelFiveRushNoticeLabel.outlineColor = new Color(255, 237, 155, 220);
        this.levelFiveRushNoticeLabel.outlineWidth = 2;
        this.levelFiveRushNoticeOpacity = this.levelFiveRushNotice.addComponent(UIOpacity);
        this.levelFiveRushNoticeOpacity.opacity = 0;
        this.levelFiveRushNotice.active = false;
    }

    private recordLevelFivePlayerDeployment(lane: number): void {
        if (this.currentLevel !== 5) return;
        const cutoff = this.battleElapsedSeconds - LEVEL_FIVE_RUSH_WINDOW_SECONDS;
        while (this.levelFiveRecentPlayerDeployTimes.length > 0
            && this.levelFiveRecentPlayerDeployTimes[0] < cutoff) {
            this.levelFiveRecentPlayerDeployTimes.shift();
        }
        if (this.levelFiveRecentPlayerDeployTimes.length < 5) this.levelFiveRushHighestAnnounced = 0;
        this.levelFiveRecentPlayerDeployTimes.push(this.battleElapsedSeconds);
        this.createLevelFiveDeployGateVfx(lane);
        const count = this.levelFiveRecentPlayerDeployTimes.length;
        if (count >= 10 && this.levelFiveRushHighestAnnounced < 10) {
            this.levelFiveRushHighestAnnounced = 10;
            this.showLevelFiveRushNotice('羊群奔涌 ×10');
        } else if (count >= 5 && this.levelFiveRushHighestAnnounced < 5) {
            this.levelFiveRushHighestAnnounced = 5;
            this.showLevelFiveRushNotice('火力全开 ×5');
        }
    }

    private showLevelFiveRushNotice(text: string): void {
        if (!this.levelFiveRushNotice || !this.levelFiveRushNoticeOpacity || !this.levelFiveRushNoticeLabel) return;
        Tween.stopAllByTarget(this.levelFiveRushNotice);
        Tween.stopAllByTarget(this.levelFiveRushNoticeOpacity);
        this.levelFiveRushNoticeLabel.string = text;
        this.levelFiveRushNotice.active = true;
        this.levelFiveRushNotice.setScale(0.82, 0.82, 1);
        this.levelFiveRushNoticeOpacity.opacity = 0;
        tween(this.levelFiveRushNoticeOpacity)
            .to(0.12, { opacity: 255 }, { easing: 'quadOut' })
            .delay(Math.max(0, LEVEL_FIVE_RUSH_NOTICE_SECONDS - 0.32))
            .to(0.2, { opacity: 0 }, { easing: 'quadIn' })
            .call(() => { if (this.levelFiveRushNotice) this.levelFiveRushNotice.active = false; })
            .start();
        tween(this.levelFiveRushNotice)
            .to(0.18, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' })
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
            .start();
    }

    private createLevelFiveDeployGateVfx(lane: number): void {
        if (this.countActiveBattleVfx('deploy-rush', lane) >= 3) return;
        const effect = this.acquireBattleVfx(
            'deploy-rush',
            lane,
            undefined,
            this.getLaneCenterX(lane),
            LANE_BOTTOM_Y + 18,
            74,
            54,
            0.42,
            4,
        );
        if (!effect) return;
        const graphics = effect.graphics;
        graphics.clear();
        graphics.fillColor = new Color(255, 219, 89, 125);
        graphics.circle(0, 0, 20);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(255, 240, 170, 220);
        for (const [x, y] of [[-25, 9], [-10, 20], [13, 18], [27, 4]] as const) {
            graphics.moveTo(x - 4, y);
            graphics.lineTo(x + 4, y);
            graphics.moveTo(x, y - 4);
            graphics.lineTo(x, y + 4);
        }
        graphics.stroke();
        graphics.fillColor = new Color(104, 197, 95, 210);
        graphics.ellipse(-19, -13, 7, 3.5);
        graphics.ellipse(20, -11, 7, 3.5);
        graphics.fill();
    }

    private applyBattleHudColumnNode(
        node: Node,
        column: { readonly centerX: number; readonly width: number; readonly height: number },
        y: number,
    ): void {
        node.setPosition(column.centerX, y, 0);
        node.setScale(1, 1, 1);
        node.getComponent(UITransform)?.setContentSize(column.width, column.height);
    }

    private createTacticNotice(): void {
        this.tacticNotice = this.createGraphicsNode('TacticNotice', 420, 54, 0, 150, this.toastLayer);
        this.tacticNotice.addComponent(BlockInputEvents);
        const graphics = this.tacticNotice.getComponent(Graphics)!;
        graphics.fillColor = new Color(8, 16, 27, 236);
        graphics.roundRect(-210, -27, 420, 54, 14);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(210, 235, 250, 255);
        graphics.roundRect(-210, -27, 420, 54, 14);
        graphics.stroke();
        this.tacticNoticeLabel = this.createLabel(this.tacticNotice, 'Text', '', 0, 0, 372, 42, 19, Color.WHITE);
        this.configureSingleLineLabel(this.tacticNoticeLabel, Color.WHITE);
        this.tacticNoticeOpacity = this.tacticNotice.addComponent(UIOpacity);
        this.tacticNotice.active = false;
    }

    private showTacticNotice(team: Team, tacticName: string): void {
        if (!this.tacticNotice || !this.tacticNoticeLabel || !this.tacticNoticeOpacity) {
            return;
        }
        Tween.stopAllByTarget(this.tacticNotice);
        Tween.stopAllByTarget(this.tacticNoticeOpacity);
        this.ensureOverlayLayerOrder();
        if (this.statusToast) {
            this.statusToast.active = false;
        }
        this.tacticNoticeLabel.string = `${team === Team.Player ? '\u73A9\u5BB6' : 'AI'}\uFF1A${tacticName}\uFF01`;
        this.tacticNotice.active = true;
        this.tacticNotice.setPosition(0, 150, 0);
        this.tacticNotice.setScale(0.92, 0.92, 1);
        this.tacticNoticeOpacity.opacity = 0;
        tween(this.tacticNotice)
            .to(TACTIC_NOTICE_FADE_IN_SECONDS, { position: new Vec3(0, 158, 0), scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' })
            .to(0.06, { scale: new Vec3(1, 1, 1) }, { easing: 'quadInOut' })
            .delay(TACTIC_NOTICE_HOLD_SECONDS)
            .to(TACTIC_NOTICE_FADE_OUT_SECONDS, { position: new Vec3(0, 174, 0), scale: new Vec3(0.98, 0.98, 1) }, { easing: 'quadIn' })
            .call(() => { this.tacticNotice.active = false; })
            .start();
        tween(this.tacticNoticeOpacity)
            .to(TACTIC_NOTICE_FADE_IN_SECONDS, { opacity: 255 }, { easing: 'quadOut' })
            .delay(0.06 + TACTIC_NOTICE_HOLD_SECONDS)
            .to(TACTIC_NOTICE_FADE_OUT_SECONDS, { opacity: 0 }, { easing: 'quadIn' })
            .start();
    }

    private hideTacticNotice(): void {
        if (!this.tacticNotice || !this.tacticNoticeOpacity) {
            return;
        }
        Tween.stopAllByTarget(this.tacticNotice);
        Tween.stopAllByTarget(this.tacticNoticeOpacity);
        this.tacticNoticeOpacity.opacity = 0;
        this.tacticNotice.active = false;
    }

    private createResourceBadge(name: string, x: number, y: number, fillColor: Color, borderColor: Color): Node {
        const badge = this.createGraphicsNode(name, PLAYER_RESOURCE_BADGE_WIDTH, PLAYER_RESOURCE_BADGE_HEIGHT, x, y, this.hudLayer);
        const graphics = badge.getComponent(Graphics)!;
        graphics.fillColor = fillColor;
        graphics.roundRect(-PLAYER_RESOURCE_BADGE_WIDTH / 2, -PLAYER_RESOURCE_BADGE_HEIGHT / 2,
            PLAYER_RESOURCE_BADGE_WIDTH, PLAYER_RESOURCE_BADGE_HEIGHT, 16);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = borderColor;
        graphics.roundRect(-PLAYER_RESOURCE_BADGE_WIDTH / 2, -PLAYER_RESOURCE_BADGE_HEIGHT / 2,
            PLAYER_RESOURCE_BADGE_WIDTH, PLAYER_RESOURCE_BADGE_HEIGHT, 16);
        graphics.stroke();
        return badge;
    }

    private createEnergyBar(name: string, x: number, y: number, fillColor: Color, borderColor: Color, labelColor: Color, labelPrefix: string): EnergyBarView {
        const bar = this.createGraphicsNode(name, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT, x, y, this.hudLayer);
        const graphics = bar.getComponent(Graphics)!;
        const barLeft = -ENERGY_BAR_WIDTH / 2;
        const iconLeft = barLeft + 7;

        graphics.fillColor = new Color(10, 20, 31, 255);
        graphics.roundRect(barLeft, -ENERGY_BAR_HEIGHT / 2, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT, 16);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = borderColor;
        graphics.roundRect(barLeft, -ENERGY_BAR_HEIGHT / 2, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT, 16);
        graphics.stroke();

        graphics.fillColor = new Color(borderColor.r, borderColor.g, borderColor.b, 58);
        graphics.roundRect(iconLeft, -15, ENERGY_BAR_ICON_BOX_WIDTH, 30, 8);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = borderColor;
        graphics.roundRect(iconLeft, -15, ENERGY_BAR_ICON_BOX_WIDTH, 30, 8);
        graphics.stroke();
        graphics.fillColor = fillColor;
        graphics.moveTo(iconLeft + 17, 12);
        graphics.lineTo(iconLeft + 9, 1);
        graphics.lineTo(iconLeft + 15, 1);
        graphics.lineTo(iconLeft + 13, -11);
        graphics.lineTo(iconLeft + 23, -1);
        graphics.lineTo(iconLeft + 17, -1);
        graphics.close();
        graphics.fill();

        const trackNode = this.createGraphicsNode(
            'TrackBackground',
            ENERGY_BAR_TRACK_WIDTH,
            ENERGY_BAR_TRACK_HEIGHT,
            ENERGY_BAR_TRACK_LEFT + ENERGY_BAR_TRACK_WIDTH / 2,
            ENERGY_BAR_TRACK_CENTER_Y,
            bar,
        );
        const trackGraphics = trackNode.getComponent(Graphics)!;
        trackGraphics.fillColor = new Color(36, 47, 46, 255);
        trackGraphics.roundRect(
            -ENERGY_BAR_TRACK_WIDTH / 2,
            -ENERGY_BAR_TRACK_HEIGHT / 2,
            ENERGY_BAR_TRACK_WIDTH,
            ENERGY_BAR_TRACK_HEIGHT,
            10,
        );
        trackGraphics.fill();
        trackGraphics.lineWidth = 1.5;
        trackGraphics.strokeColor = new Color(73, 65, 52, 220);
        trackGraphics.roundRect(
            -ENERGY_BAR_TRACK_WIDTH / 2 + 0.75,
            -ENERGY_BAR_TRACK_HEIGHT / 2 + 0.75,
            ENERGY_BAR_TRACK_WIDTH - 1.5,
            ENERGY_BAR_TRACK_HEIGHT - 1.5,
            9,
        );
        trackGraphics.stroke();

        const fillNode = new Node('Fill');
        fillNode.setParent(bar);
        const fillTransform = fillNode.addComponent(UITransform);
        fillTransform.setContentSize(ENERGY_BAR_FILL_WIDTH, ENERGY_BAR_FILL_HEIGHT);
        fillTransform.setAnchorPoint(0, 0.5);
        fillNode.setPosition(ENERGY_BAR_FILL_LEFT, ENERGY_BAR_FILL_CENTER_Y, 0);
        const fillGraphics = fillNode.addComponent(Graphics);
        fillGraphics.fillColor = fillColor;
        fillGraphics.roundRect(0, -ENERGY_BAR_FILL_HEIGHT / 2, ENERGY_BAR_FILL_WIDTH, ENERGY_BAR_FILL_HEIGHT, 9);
        fillGraphics.fill();
        fillNode.setScale(0, 1, 1);
        fillNode.active = false;

        const shadowLabel = this.createLabel(bar, 'TextShadow', `${labelPrefix} 0 / ${ENERGY_MAX}`, ENERGY_BAR_LABEL_X + 2, -2,
            ENERGY_BAR_LABEL_WIDTH, ENERGY_BAR_HEIGHT - 4, 17, new Color(7, 12, 20, 255));
        const label = this.createLabel(bar, 'Text', `${labelPrefix} 0 / ${ENERGY_MAX}`, ENERGY_BAR_LABEL_X, 0,
            ENERGY_BAR_LABEL_WIDTH, ENERGY_BAR_HEIGHT - 4, 17, labelColor);
        this.configureSingleLineLabel(shadowLabel, new Color(7, 12, 20, 255));
        this.configureSingleLineLabel(label, labelColor);
        return {
            node: bar,
            trackNode,
            fillNode,
            label,
            shadowLabel,
            displayRatio: 0,
        };
    }

    private updateEnergyBars(deltaTime: number): void {
        this.updateEnergyBar(this.playerEnergyBar, this.playerEnergy / ENERGY_MAX, deltaTime);
        this.updateEnergyBar(this.aiEnergyBar, this.aiEnergy / ENERGY_MAX, deltaTime);
    }

    private updateEnergyBar(bar: EnergyBarView, targetRatio: number, deltaTime: number): void {
        const target = Math.max(0, Math.min(1, targetRatio));
        const difference = target - bar.displayRatio;
        if (Math.abs(difference) < 0.0001) {
            return;
        }
        const duration = difference < 0 ? 0.1 : 0.12;
        bar.displayRatio += difference * Math.min(1, deltaTime / duration);
        if (Math.abs(target - bar.displayRatio) < 0.0001) {
            bar.displayRatio = target;
        }
        bar.fillNode.setScale(bar.displayRatio, 1, 1);
        bar.fillNode.active = bar.displayRatio > 0.0001;
    }

    private snapEnergyBarsToCurrentValues(): void {
        if (!this.playerEnergyBar || !this.aiEnergyBar) {
            return;
        }
        const playerRatio = Math.max(0, Math.min(1, this.playerEnergy / ENERGY_MAX));
        const aiRatio = Math.max(0, Math.min(1, this.aiEnergy / ENERGY_MAX));
        this.playerEnergyBar.displayRatio = playerRatio;
        this.aiEnergyBar.displayRatio = aiRatio;
        this.playerEnergyBar.fillNode.setScale(playerRatio, 1, 1);
        this.aiEnergyBar.fillNode.setScale(aiRatio, 1, 1);
        this.playerEnergyBar.fillNode.active = playerRatio > 0.0001;
        this.aiEnergyBar.fillNode.active = aiRatio > 0.0001;
    }

    private createLaneButtons(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.createButton(this.hudLayer, `SpawnButton${lane}`, `第 ${lane + 1} 线\n出兵`, LANE_X[lane], -178, 120, 44, 15, () => {
                this.tryDeploySelectedUnit(lane);
            });
        }
    }

    private createFreezeLaneSelectionControls(): void {
        this.freezeSelectionCancelLayer = new Node('FreezeSelectionCancelLayer');
        this.freezeSelectionCancelLayer.setParent(this.battleInputLayer);
        this.freezeSelectionCancelLayer.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.freezeSelectionCancelLayer.addComponent(BlockInputEvents);
        this.freezeSelectionCancelLayer.on(NodeEventType.TOUCH_END, () => this.cancelFreezeLaneSelection(true), this);
        this.freezeSelectionCancelLayer.active = false;
        this.freezeSelectionCancelLayer.setSiblingIndex(0);

        const centerY = (LANE_BOTTOM_Y + LANE_TOP_Y) * 0.5;
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const highlight = this.createGraphicsNode(
                `FreezeLaneHighlight${lane + 1}`,
                LANE_WIDTH - 6,
                LANE_LENGTH - 10,
                this.getLaneCenterX(lane),
                centerY,
                this.battleInputLayer,
            );
            const graphics = highlight.getComponent(Graphics)!;
            graphics.fillColor = new Color(123, 213, 255, 42);
            graphics.roundRect(-(LANE_WIDTH - 6) / 2, -(LANE_LENGTH - 10) / 2,
                LANE_WIDTH - 6, LANE_LENGTH - 10, 22);
            graphics.fill();
            graphics.lineWidth = 3;
            graphics.strokeColor = new Color(177, 235, 255, 205);
            graphics.roundRect(-(LANE_WIDTH - 6) / 2, -(LANE_LENGTH - 10) / 2,
                LANE_WIDTH - 6, LANE_LENGTH - 10, 22);
            graphics.stroke();
            const opacity = highlight.addComponent(UIOpacity);
            highlight.active = false;
            this.freezeLaneHighlightNodes.push(highlight);
            this.freezeLaneHighlightOpacities.push(opacity);
        }

        this.freezeSelectionCancelButton = this.createButton(
            this.toastLayer,
            'FreezeSelectionCancelButton',
            '取消选择',
            BATTLEFIELD_CENTER_X,
            PLAYER_HUD_Y + 72,
            170,
            44,
            17,
            () => this.cancelFreezeLaneSelection(true),
        );
        this.freezeSelectionCancelButton.node.active = false;
    }

    private createLaneSpawnZones(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const marker = this.createGraphicsNode(
                `SpawnMarker${lane}`,
                SPAWN_BUTTON_WIDTH,
                SPAWN_BUTTON_HEIGHT,
                this.getLaneCenterX(lane),
                SPAWN_BUTTON_Y,
                this.battleInputLayer,
            );
            let artSprite: Sprite | undefined;
            if (ART_PILOT_ENABLED && (ART_FULL_ENABLED || lane === ART_PILOT_LANE_INDEX)) {
                const gateRoot = new Node('PlayerSpawnGateRoot');
                gateRoot.setParent(marker);
                gateRoot.setPosition(0, PLAYER_GATE_GROUND_LOCAL_Y, 0);
                const gateRootTransform = gateRoot.addComponent(UITransform);
                gateRootTransform.setContentSize(SPAWN_GATE_VISUAL_SIZE, SPAWN_GATE_VISUAL_SIZE);
                gateRootTransform.setAnchorPoint(0.5, 0);
                gateRoot.setScale(1, 1, 1);
                this.createSoftGroundShadow(gateRoot, 58, 12, 2);
                const artSlot = this.createSpriteSlot(
                    'GateVisual',
                    gateRoot,
                    SPAWN_GATE_VISUAL_SIZE,
                    SPAWN_GATE_VISUAL_SIZE,
                    PLAYER_GATE_VISUAL_OFFSET_X,
                    0,
                    0.5,
                    0,
                );
                this.playerSpawnGateRoots[lane] = gateRoot;
                artSprite = artSlot.sprite;
            }
            const failureOverlay = this.createGraphicsNode(
                'DeployFailureOverlay',
                SPAWN_BUTTON_WIDTH,
                SPAWN_BUTTON_HEIGHT,
                0,
                0,
                marker,
            );
            const failureGraphics = failureOverlay.getComponent(Graphics)!;
            failureGraphics.fillColor = new Color(74, 22, 32, 185);
            failureGraphics.roundRect(
                -SPAWN_BUTTON_WIDTH / 2,
                -SPAWN_BUTTON_HEIGHT / 2,
                SPAWN_BUTTON_WIDTH,
                SPAWN_BUTTON_HEIGHT,
                15,
            );
            failureGraphics.fill();
            const failureOpacity = failureOverlay.addComponent(UIOpacity);
            failureOverlay.active = false;
            const markerView: LaneSpawnMarkerView = {
                node: marker,
                graphics: marker.getComponent(Graphics)!,
                label: this.createLabel(marker, 'QueueState', '', SPAWN_BUTTON_WIDTH / 2 - 28, 5, 40, 24, 14, Color.WHITE),
                queueLabel: this.createLabel(marker, 'QueueCount', '', 0, -18, SPAWN_BUTTON_WIDTH - 12, 16, 11, new Color(255, 231, 157, 255)),
                failureOverlay,
                failureOpacity,
                artSprite,
                pressed: false,
                fullRemaining: 0,
                visualState: 'paused',
                lastQueueText: '',
            };
            this.configureSingleLineLabel(markerView.label, Color.WHITE);
            this.configureSingleLineLabel(markerView.queueLabel, new Color(255, 231, 157, 255));
            this.laneSpawnMarkers.push(markerView);
            this.drawLaneSpawnMarker(markerView, 'paused');

            const laneHitAreaNode = new Node(`LaneHitArea${lane + 1}`);
            laneHitAreaNode.setParent(this.battleInputLayer);
            laneHitAreaNode.setPosition(this.getLaneCenterX(lane), LANE_HIT_AREA_CENTER_Y, 0);
            laneHitAreaNode.addComponent(UITransform).setContentSize(LANE_HIT_AREA_WIDTH, LANE_LENGTH);
            const hitArea: LaneHitAreaView = {
                lane,
                node: laneHitAreaNode,
                touchStartX: 0,
                touchStartY: 0,
                moved: false,
            };
            laneHitAreaNode.on(NodeEventType.TOUCH_START, (event: EventTouch) => {
                if (!this.canHandleLaneSpawnTouch()) return;
                const location = event.getUILocation();
                hitArea.touchStartX = location.x;
                hitArea.touchStartY = location.y;
                hitArea.moved = false;
                if (!this.freezeLaneSelectionActive) {
                    markerView.pressed = true;
                    this.refreshLaneSpawnMarker(lane, markerView);
                }
            }, this);
            laneHitAreaNode.on(NodeEventType.TOUCH_MOVE, (event: EventTouch) => {
                const location = event.getUILocation();
                const dx = location.x - hitArea.touchStartX;
                const dy = location.y - hitArea.touchStartY;
                if (dx * dx + dy * dy >= LANE_TOUCH_DRAG_THRESHOLD * LANE_TOUCH_DRAG_THRESHOLD) {
                    hitArea.moved = true;
                    markerView.pressed = false;
                    this.refreshLaneSpawnMarker(lane, markerView);
                }
            }, this);
            laneHitAreaNode.on(NodeEventType.TOUCH_CANCEL, () => {
                hitArea.moved = false;
                markerView.pressed = false;
                this.refreshLaneSpawnMarker(lane, markerView);
            }, this);
            laneHitAreaNode.on(NodeEventType.TOUCH_END, (event: EventTouch) => {
                markerView.pressed = false;
                this.refreshLaneSpawnMarker(lane, markerView);
                const location = event.getUILocation();
                const dx = location.x - hitArea.touchStartX;
                const dy = location.y - hitArea.touchStartY;
                const endedAsDrag = hitArea.moved
                    || dx * dx + dy * dy >= LANE_TOUCH_DRAG_THRESHOLD * LANE_TOUCH_DRAG_THRESHOLD;
                hitArea.moved = false;
                if (endedAsDrag || !this.canHandleLaneSpawnTouch()) return;
                const now = Date.now();
                if (this.lastLaneSpawnTouchLane === lane
                    && now - this.lastLaneSpawnTouchAtMs < LANE_TOUCH_DEDUPLICATION_MS) {
                    return;
                }
                this.lastLaneSpawnTouchLane = lane;
                this.lastLaneSpawnTouchAtMs = now;
                if (this.freezeLaneSelectionActive) {
                    this.tryConfirmFreezeLane(lane);
                } else {
                    this.tryDeploySelectedUnit(lane);
                }
            }, this);
            this.laneHitAreas.push(hitArea);
        }
    }

    private canHandleLaneSpawnTouch(): boolean {
        const tutorialDeployAllowsLaneInput = this.tutorialFlowActive
            && this.tutorialProgress === 'deploy-four-sheep'
            && LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] === 'deploy-four-sheep';
        return this.isStarted && !this.isFinished && !this.isPaused
            && !this.levelTransitionActive
            && (tutorialDeployAllowsLaneInput || !this.isBlockingModalVisible());
    }

    private isBlockingModalVisible(): boolean {
        const blockingPanels = [
            this.startPanel,
            this.levelSelectPanel,
            this.tutorialPanel,
            this.specialRoadTutorialPanel,
            this.tacticDeckPanel,
            this.pausePanel,
            this.helpPanel,
            this.replayLevelOneTutorialConfirmPanel,
            this.resultPanel,
            this.artLoadingPanel,
        ];
        return blockingPanels.some((panel) => !!panel?.isValid && panel.activeInHierarchy);
    }

    private drawLaneSpawnMarker(marker: LaneSpawnMarkerView, state: SpawnMarkerState): void {
        const graphics = marker.graphics;
        if (this.applyPilotSpawnMarkerFrame(marker, state)) {
            marker.label.string = state === 'full' ? '\u6EE1' : '';
            marker.label.color = UI_TEXT_PRIMARY;
            marker.queueLabel.color = UI_TEXT_PRIMARY;
            return;
        }
        graphics.enabled = true;
        const isReady = state === 'ready' || state === 'selected';
        const fillColor = state === 'selected' ? new Color(57, 169, 237, 255)
            : isReady ? new Color(35, 137, 211, 245)
            : state === 'energy' ? new Color(38, 79, 111, 235) : new Color(69, 78, 90, 242);
        const borderColor = isReady ? new Color(210, 244, 255, 255)
            : state === 'energy' ? new Color(126, 164, 190, 240) : new Color(181, 190, 201, 245);
        graphics.clear();
        graphics.fillColor = fillColor;
        graphics.roundRect(
            -SPAWN_BUTTON_WIDTH / 2,
            -SPAWN_BUTTON_HEIGHT / 2,
            SPAWN_BUTTON_WIDTH,
            SPAWN_BUTTON_HEIGHT,
            15,
        );
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = borderColor;
        graphics.roundRect(
            -SPAWN_BUTTON_WIDTH / 2,
            -SPAWN_BUTTON_HEIGHT / 2,
            SPAWN_BUTTON_WIDTH,
            SPAWN_BUTTON_HEIGHT,
            15,
        );
        graphics.stroke();
        graphics.fillColor = isReady ? Color.WHITE : new Color(205, 214, 222, 235);
        graphics.moveTo(0, 17);
        graphics.lineTo(-14, 1);
        graphics.lineTo(-6, 1);
        graphics.lineTo(-6, -11);
        graphics.lineTo(6, -11);
        graphics.lineTo(6, 1);
        graphics.lineTo(14, 1);
        graphics.close();
        graphics.fill();
        marker.label.string = state === 'full' ? '\u6EE1' : '';
        marker.label.color = new Color(246, 246, 246, 255);
        marker.queueLabel.color = new Color(255, 231, 157, 255);
    }

    private applyPilotSpawnMarkerFrame(marker: LaneSpawnMarkerView, state: SpawnMarkerState): boolean {
        if (!ART_PILOT_ENABLED || !marker.artSprite) {
            return false;
        }
        const frameIndex = state === 'selected' ? 1 : state === 'energy' || state === 'paused' ? 2 : state === 'full' ? 3 : 0;
        const frame = this.artResourceManager.getFrame(ArtPilotResourceKey.PlayerSpawnGate, frameIndex);
        if (!frame) {
            marker.artSprite.node.active = false;
            return false;
        }
        marker.node.setScale(1, 1, 1);
        const gateRoot = marker.artSprite.node.parent;
        gateRoot?.setPosition(0, PLAYER_GATE_GROUND_LOCAL_Y, 0);
        gateRoot?.setScale(1, 1, 1);
        marker.artSprite.node.setPosition(PLAYER_GATE_VISUAL_OFFSET_X, 0, 0);
        marker.artSprite.node.setScale(1, 1, 1);
        marker.artSprite.spriteFrame = frame;
        marker.artSprite.node.active = true;
        marker.graphics.enabled = false;
        return true;
    }

    private showLaneQueueFull(lane: number): void {
        const marker = this.laneSpawnMarkers[lane];
        if (!marker) {
            return;
        }
        marker.fullRemaining = QUEUE_FULL_MARKER_SECONDS;
        this.refreshLaneSpawnMarker(lane, marker);
    }

    private triggerDeployFailureFeedback(lane: number): void {
        const marker = this.laneSpawnMarkers[lane];
        if (marker) {
            Tween.stopAllByTarget(marker.failureOpacity);
            marker.failureOverlay.active = true;
            marker.failureOpacity.opacity = 210;
            tween(marker.failureOpacity)
                .to(0.18, { opacity: 0 }, { easing: 'quadOut' })
                .call(() => {
                    if (marker.failureOverlay.isValid) {
                        marker.failureOverlay.active = false;
                    }
                })
                .start();
        }
        this.audioManager.playSfx('deploy_failed');
    }

    private updateLaneSpawnMarkers(deltaTime: number): void {
        for (let lane = 0; lane < this.laneSpawnMarkers.length; lane += 1) {
            const marker = this.laneSpawnMarkers[lane];
            if (marker.fullRemaining > 0) {
                marker.fullRemaining = Math.max(0, marker.fullRemaining - deltaTime);
            }
            this.refreshLaneSpawnMarker(lane, marker);
        }
    }

    private refreshLaneSpawnMarker(lane: number, marker: LaneSpawnMarkerView): void {
        const unitCount = this.getLaneUnitCount(Team.Player, lane);
        const selectedDefinition = this.selectedSheepType ? UNIT_DEFINITIONS[this.selectedSheepType] : undefined;
        const continuousSmall = !!selectedDefinition && this.isLevelFiveContinuousSmallDefinition(selectedDefinition);
        const isAtCapacity = !continuousSmall && unitCount >= TEAM_MAX_UNITS_PER_LANE;
        const isSpawnBlocked = !!selectedDefinition && !continuousSmall && !isAtCapacity
            && !this.canSpawnUnitInLane(Team.Player, lane, selectedDefinition);
        const isEnergyInsufficient = !!selectedDefinition && this.playerEnergy < selectedDefinition.cost;
        const isPaused = this.isPaused || !this.isStarted;
        const pendingSmallCount = this.getPendingSmallDeploymentCount(Team.Player, lane);
        const queueText = isPaused ? '\u5DF2\u6682\u505C'
            : continuousSmall && pendingSmallCount > 0 ? `待部署 ${pendingSmallCount}`
            : isAtCapacity
            ? `\u7B2C ${lane + 1} \u7EBF ${unitCount} / ${TEAM_MAX_UNITS_PER_LANE}`
            : isSpawnBlocked ? `\u7B2C ${lane + 1} \u7EBF\u62E5\u6324`
                : isEnergyInsufficient ? '\u80FD\u91CF\u4E0D\u8DB3' : '';
        if (queueText !== marker.lastQueueText) {
            marker.lastQueueText = queueText;
            marker.queueLabel.string = queueText;
        }
        const visualState: SpawnMarkerState = isPaused ? 'paused'
            : isAtCapacity || isSpawnBlocked || marker.fullRemaining > 0 ? 'full'
                : isEnergyInsufficient ? 'energy' : marker.pressed ? 'selected' : 'ready';
        if (visualState !== marker.visualState) {
            marker.visualState = visualState;
            this.drawLaneSpawnMarker(marker, visualState);
        }
    }

    private refreshLaneSpawnMarkers(): void {
        for (let lane = 0; lane < this.laneSpawnMarkers.length; lane += 1) {
            this.refreshLaneSpawnMarker(lane, this.laneSpawnMarkers[lane]);
        }
    }

    private resetLaneSpawnMarkers(): void {
        this.lastLaneSpawnTouchAtMs = 0;
        this.lastLaneSpawnTouchLane = -1;
        for (const marker of this.laneSpawnMarkers) {
            marker.fullRemaining = 0;
            marker.pressed = false;
        }
        this.refreshLaneSpawnMarkers();
    }

    private updatePilotAIGate(deltaTime: number): void {
        if (!ART_PILOT_ENABLED) return;
        const level = this.getCurrentLevelConfig();
        const laneCount = ART_FULL_ENABLED ? LANE_X.length : 1;
        for (let lane = 0; lane < laneCount; lane += 1) {
            const slot = this.aiSpawnGateSlots[lane];
            const sprite = this.aiSpawnGateSprites[lane];
            if (!slot?.isValid || !sprite) continue;
            slot.setPosition(this.getLaneCenterX(lane), AI_GATE_GROUND_Y, 0);
            slot.setScale(1, 1, 1);
            sprite.node.setPosition(AI_GATE_VISUAL_OFFSET_X, 0, 0);
            sprite.node.setScale(1, 1, 1);
            this.aiSpawnGateSelectedRemaining[lane] = Math.max(0,
                this.aiSpawnGateSelectedRemaining[lane] - Math.max(0, deltaTime));
            const aiCount = this.getLaneUnitCount(Team.AI, lane);
            const hasSpawnSpace = level.aiAllowedUnitTypes.some((type) => this.canSpawnUnitInLane(
                Team.AI, lane, UNIT_DEFINITIONS[type],
            ));
            const hasAffordableType = level.aiAllowedUnitTypes.some((type) => UNIT_DEFINITIONS[type].cost <= this.aiEnergy);
            const levelFiveContinuous = level.continuousSmallUnitDeployment === true;
            const isFull = !levelFiveContinuous && (aiCount >= TEAM_MAX_UNITS_PER_LANE || !hasSpawnSpace);
            const isDisabled = !this.isStarted || this.isPaused || this.isFinished
                || this.tutorialFlowActive || !hasAffordableType;
            const frameIndex = this.aiSpawnGateSelectedRemaining[lane] > 0 && !isDisabled
                ? 1 : isFull ? 3 : isDisabled ? 2 : 0;
            const frame = this.artResourceManager.getFrame(ArtPilotResourceKey.AISpawnGate, frameIndex);
            if (!frame) {
                sprite.node.active = false;
                slot.active = false;
                continue;
            }
            if (frameIndex !== this.aiSpawnGateFrameIndices[lane] || sprite.spriteFrame !== frame) {
                this.aiSpawnGateFrameIndices[lane] = frameIndex;
                sprite.spriteFrame = frame;
            }
            sprite.node.active = true;
            slot.active = true;
        }
    }

    private createUnitTypeButtons(): void {
        this.unitCardSidebar = this.createGraphicsNode(
            'UnitCardSidebar',
            UNIT_CARD_SIDEBAR_WIDTH,
            UNIT_CARD_SIDEBAR_HEIGHT,
            0,
            0,
            this.hudLayer,
        );
        const sidebarGraphics = this.unitCardSidebar.getComponent(Graphics)!;
        sidebarGraphics.fillColor = new Color(47, 81, 48, 218);
        sidebarGraphics.roundRect(
            -UNIT_CARD_SIDEBAR_WIDTH / 2,
            -UNIT_CARD_SIDEBAR_HEIGHT / 2,
            UNIT_CARD_SIDEBAR_WIDTH,
            UNIT_CARD_SIDEBAR_HEIGHT,
            12,
        );
        sidebarGraphics.fill();
        sidebarGraphics.lineWidth = 2;
        sidebarGraphics.strokeColor = new Color(113, 83, 43, 235);
        sidebarGraphics.roundRect(
            -UNIT_CARD_SIDEBAR_WIDTH / 2 + 1,
            -UNIT_CARD_SIDEBAR_HEIGHT / 2 + 1,
            UNIT_CARD_SIDEBAR_WIDTH - 2,
            UNIT_CARD_SIDEBAR_HEIGHT - 2,
            11,
        );
        sidebarGraphics.stroke();
        const firstCardY = (UNIT_ORDER.length - 1) * (UNIT_CARD_HEIGHT + UNIT_CARD_GAP) / 2;
        for (let index = 0; index < UNIT_ORDER.length; index += 1) {
            const type = UNIT_ORDER[index];
            const cardY = firstCardY - index * (UNIT_CARD_HEIGHT + UNIT_CARD_GAP);
            const button = this.createButton(this.unitCardSidebar, `TypeButton${type}`, '', 0, cardY,
                UNIT_CARD_WIDTH, UNIT_CARD_HEIGHT, 15, () => {
                if (this.isPaused || !this.isLevelOneTutorialUnitSelectionAllowed(type)) {
                    return;
                }
                if (!this.isUnitTypeUnlocked(type)) {
                    this.showStatusToast(`${this.getUnitDisplayName(type, Team.Player)}尚未解锁。`);
                    return;
                }
                this.selectUnitType(type);
            });
            let artSelectionGraphics: Graphics | undefined;
            if (ART_PILOT_ENABLED) {
                const selectionNode = this.createGraphicsNode('UnitCardSelection',
                    UNIT_CARD_WIDTH, UNIT_CARD_HEIGHT, 0, 0, button.node);
                selectionNode.setSiblingIndex(0);
                artSelectionGraphics = selectionNode.getComponent(Graphics)!;
                selectionNode.active = false;
            }
            this.resizeAndPositionLabel(
                button.label,
                UNIT_CARD_MAIN_CENTER_X,
                UNIT_CARD_MAIN_CENTER_Y,
                UNIT_CARD_MAIN_AREA_WIDTH,
                UNIT_CARD_MAIN_AREA_HEIGHT,
            );
            button.label.fontSize = 13;
            button.label.lineHeight = 14;
            button.label.overflow = Label.Overflow.SHRINK;
            button.label.enableWrapText = false;
            button.label.horizontalAlign = HorizontalTextAlignment.CENTER;
            button.label.verticalAlign = VerticalTextAlignment.CENTER;
            button.label.color = UI_TEXT_PRIMARY;
            const tierBadgeNode = this.createGraphicsNode('TierBadge', 24, 24,
                UNIT_CARD_TIER_CENTER_X, UNIT_CARD_TIER_CENTER_Y, button.node);
            tierBadgeNode.addComponent(UIOpacity);
            const tierBadgeLabel = this.createLabel(tierBadgeNode, 'TierLabel', '', 0, 0, 22, 22, 13, Color.WHITE);
            const statusBackgroundNode = this.createGraphicsNode('StatusBackground',
                UNIT_CARD_STATUS_BOX_WIDTH, UNIT_CARD_STATUS_BOX_HEIGHT,
                UNIT_CARD_STATUS_CENTER_X, UNIT_CARD_STATUS_CENTER_Y, button.node);
            const statusBackgroundGraphics = statusBackgroundNode.getComponent(Graphics)!;
            const stateLabel = this.createLabel(button.node, 'UnitCardState', '',
                UNIT_CARD_STATUS_CENTER_X, UNIT_CARD_STATUS_CENTER_Y,
                UNIT_CARD_STATUS_BOX_WIDTH - 2, UNIT_CARD_STATUS_BOX_HEIGHT - 2,
                11, UI_TEXT_SECONDARY);
            stateLabel.lineHeight = 13;
            this.configureSingleLineLabel(stateLabel, UI_TEXT_SECONDARY);
            const unitButton: UnitTypeButtonView = {
                ...button,
                tierBadgeNode,
                tierBadgeGraphics: tierBadgeNode.getComponent(Graphics)!,
                tierBadgeLabel,
                statusBackgroundNode,
                statusBackgroundGraphics,
                stateLabel,
                artSelectionGraphics,
                pressed: false,
                visualState: 'available',
            };
            this.orderUnitCardChildren(unitButton);
            button.node.on(NodeEventType.TOUCH_START, () => {
                if (this.isPaused || !this.isUnitTypeUnlocked(type) || this.selectedSheepType === type
                    || !this.isLevelOneTutorialUnitSelectionAllowed(type)) return;
                unitButton.pressed = true;
                this.refreshUnitTypeButtons();
            }, this);
            const releasePress = (): void => {
                if (!unitButton.pressed) return;
                unitButton.pressed = false;
                this.refreshUnitTypeButtons();
            };
            button.node.on(NodeEventType.TOUCH_END, releasePress, this);
            button.node.on(NodeEventType.TOUCH_CANCEL, releasePress, this);
            this.drawTierBadge(unitButton.tierBadgeGraphics, unitButton.tierBadgeLabel, type, 22);
            this.typeButtons.set(type, unitButton);
        }
    }

    private selectUnitType(type: SheepType): void {
        if (!this.isLevelOneTutorialUnitSelectionAllowed(type)) {
            if (this.tutorialFlowActive && this.tutorialProgress === 'deploy-four-sheep') {
                const expected = LEVEL_ONE_TUTORIAL_DEPLOYMENTS[this.tutorialDeploymentIndex];
                if (expected) this.refreshHud(`当前请先选择${this.getUnitDisplayName(expected.type, Team.Player)}。`);
            }
            return;
        }
        if (this.selectedSheepType === type) {
            const expected = this.tutorialFlowActive
                ? LEVEL_ONE_TUTORIAL_DEPLOYMENTS[this.tutorialDeploymentIndex] : undefined;
            this.refreshHud(expected?.type === type
                ? `已选择${this.getUnitDisplayName(type, Team.Player)}，请点击第${expected.lane + 1}路出兵。`
                : `${this.getUnitDisplayName(type, Team.Player)}保持选中，请点击道路出兵。`);
        } else {
            this.selectedSheepType = type;
            const definition = UNIT_DEFINITIONS[type];
            const availability = this.playerEnergy >= definition.cost
                ? '当前能量充足。'
                : `当前能量不足，还差${Math.max(1, Math.ceil(definition.cost - this.playerEnergy))}点。`;
            this.refreshHud(`${this.getUnitDisplayName(type, Team.Player)}已选中，${availability}`);
        }
        this.lastUnitButtonState = '';
        this.refreshUnitTypeButtons();
        this.refreshLaneSpawnMarkers();
        if (this.tutorialFlowActive && this.tutorialProgress === 'deploy-four-sheep'
            && this.selectedSheepType === type) {
            this.tutorialRecoveryMessage = '';
            this.refreshLevelOneTutorialPresentation();
        }
    }

    private isLevelOneTutorialUnitSelectionAllowed(type: SheepType): boolean {
        if (!this.tutorialFlowActive) return true;
        const expected = LEVEL_ONE_TUTORIAL_DEPLOYMENTS[this.tutorialDeploymentIndex];
        return this.tutorialProgress === 'deploy-four-sheep'
            && LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] === 'deploy-four-sheep'
            && expected?.type === type;
    }

    private createTacticButtons(): void {
        this.rightControlBar = new Node('RightControlBar');
        this.rightControlBar.setParent(this.hudLayer);
        this.rightControlBar.addComponent(UITransform).setContentSize(
            FUNCTION_SIDEBAR_WIDTH,
            DESIGN_HEIGHT,
        );
        this.rightControlBar.setPosition(FUNCTION_SIDEBAR_X, 0, 0);

        const header = this.createGraphicsNode('TacticSidebarHeader', FUNCTION_SIDEBAR_WIDTH, TACTIC_HEADER_HEIGHT,
            0, TACTIC_HEADER_Y, this.rightControlBar);
        const headerGraphics = header.getComponent(Graphics)!;
        headerGraphics.fillColor = new Color(28, 48, 76, 250);
        headerGraphics.roundRect(-FUNCTION_SIDEBAR_WIDTH / 2, -TACTIC_HEADER_HEIGHT / 2,
            FUNCTION_SIDEBAR_WIDTH, TACTIC_HEADER_HEIGHT, 12);
        headerGraphics.fill();
        headerGraphics.lineWidth = 2;
        headerGraphics.strokeColor = new Color(255, 222, 126, 255);
        headerGraphics.roundRect(-FUNCTION_SIDEBAR_WIDTH / 2, -TACTIC_HEADER_HEIGHT / 2,
            FUNCTION_SIDEBAR_WIDTH, TACTIC_HEADER_HEIGHT, 12);
        headerGraphics.stroke();
        const headerLabel = this.createLabel(header, 'Title', '\u6218\u672F', 0, 0,
            FUNCTION_SIDEBAR_WIDTH - 24, TACTIC_HEADER_HEIGHT - 12, 20, new Color(255, 238, 180, 255));
        this.configureSingleLineLabel(headerLabel, new Color(255, 238, 180, 255));

        this.playerSprintCard = this.createTacticCard('PlayerSprintCard', 0, TACTIC_FIRST_CARD_Y, 'sprint', () => {
            this.tryUseSprint(Team.Player);
        });
        this.playerHealCard = this.createTacticCard('PlayerHealCard', 0,
            TACTIC_FIRST_CARD_Y - TACTIC_CARD_HEIGHT - TACTIC_CARD_GAP, 'heal', () => {
            this.tryUseHeal(Team.Player);
        });
        this.playerShockCard = this.createTacticCard('PlayerShockCard', 0,
            TACTIC_FIRST_CARD_Y - (TACTIC_CARD_HEIGHT + TACTIC_CARD_GAP) * 2, 'shock', () => {
            this.tryUseShock(Team.Player);
        });
        this.playerFreezeCard = this.createTacticCard('PlayerFreezeCard', 0,
            TACTIC_FIRST_CARD_Y - (TACTIC_CARD_HEIGHT + TACTIC_CARD_GAP) * 2, 'freeze', () => {
            this.toggleFreezeLaneSelection();
        });
        this.playerEnergySurgeCard = this.createTacticCard('PlayerEnergySurgeCard', 0,
            TACTIC_FIRST_CARD_Y - (TACTIC_CARD_HEIGHT + TACTIC_CARD_GAP) * 2, 'surge', () => {
            this.tryUseEnergySurge();
        });
        this.playerSupplyBoostCard = this.createTacticCard('PlayerSupplyBoostCard', 0,
            TACTIC_FIRST_CARD_Y - (TACTIC_CARD_HEIGHT + TACTIC_CARD_GAP) * 2, 'supplyBoost', () => {
            this.tryUseSupplyBoost();
        });
        this.applyCurrentTacticDeckLayout(TACTIC_FIRST_CARD_Y);
    }

    private getTacticCard(kind: TacticIcon): TacticCardView {
        if (kind === 'sprint') return this.playerSprintCard;
        if (kind === 'heal') return this.playerHealCard;
        if (kind === 'shock') return this.playerShockCard;
        if (kind === 'freeze') return this.playerFreezeCard;
        if (kind === 'surge') return this.playerEnergySurgeCard;
        return this.playerSupplyBoostCard;
    }

    private getActiveTacticDeck(): readonly TacticIcon[] {
        return this.currentLevel >= 4 ? this.selectedTactics : DEFAULT_TACTIC_DECK;
    }

    private applyCurrentTacticDeckLayout(firstCardY = TACTIC_FIRST_CARD_Y): void {
        const activeDeck = this.getActiveTacticDeck();
        for (const kind of ALL_TACTICS) {
            const card = this.getTacticCard(kind);
            const index = activeDeck.indexOf(kind);
            card.node.active = index >= 0;
            if (index >= 0) {
                card.node.setPosition(0, firstCardY - index * (TACTIC_CARD_HEIGHT + TACTIC_CARD_GAP), 0);
            }
        }
        this.lastTacticHudState = '';
    }

    private createTacticCard(name: string, x: number, y: number, icon: TacticIcon, onClick: () => void): TacticCardView {
        const width = FUNCTION_SIDEBAR_WIDTH;
        const height = TACTIC_CARD_HEIGHT;
        const root = this.createGraphicsNode(name, width, height, x, y, this.rightControlBar);
        const createContainer = (
            nodeName: string,
            nodeWidth: number,
            nodeHeight: number,
            nodeX: number,
            nodeY: number,
            parent: Node,
        ): Node => {
            const child = new Node(nodeName);
            child.setParent(parent);
            child.addComponent(UITransform).setContentSize(nodeWidth, nodeHeight);
            child.setPosition(nodeX, nodeY, 0);
            return child;
        };
        const topSectionNode = createContainer(
            'TopSection',
            width,
            TACTIC_CARD_TOP_HEIGHT,
            0,
            TACTIC_CARD_BOTTOM_HEIGHT / 2,
            root,
        );
        const iconCellNode = this.createGraphicsNode(
            'IconCell',
            TACTIC_ICON_CELL_WIDTH,
            TACTIC_TOP_CELL_HEIGHT,
            -70,
            0,
            topSectionNode,
        );
        const textCellNode = this.createGraphicsNode(
            'TextCell',
            TACTIC_TEXT_CELL_WIDTH,
            TACTIC_TOP_CELL_HEIGHT,
            36,
            0,
            topSectionNode,
        );
        const dividerNode = this.createGraphicsNode(
            'Divider',
            width - 8,
            2,
            0,
            TACTIC_CARD_DIVIDER_Y,
            root,
        );
        const bottomSectionNode = createContainer(
            'BottomSection',
            width,
            TACTIC_CARD_BOTTOM_HEIGHT,
            0,
            -height / 2 + TACTIC_CARD_BOTTOM_HEIGHT / 2,
            root,
        );
        const costCellNode = this.createGraphicsNode(
            'CostCell',
            TACTIC_COST_CELL_WIDTH,
            TACTIC_BOTTOM_CELL_HEIGHT,
            TACTIC_COST_CELL_X,
            0,
            bottomSectionNode,
        );
        const metaCellNode = this.createGraphicsNode(
            'MetaCell',
            TACTIC_META_CELL_WIDTH,
            TACTIC_BOTTOM_CELL_HEIGHT,
            TACTIC_META_CELL_X,
            0,
            bottomSectionNode,
        );
        const stateCellNode = this.createGraphicsNode(
            'StateCell',
            TACTIC_STATE_CELL_WIDTH,
            TACTIC_BOTTOM_CELL_HEIGHT,
            TACTIC_STATE_CELL_X,
            0,
            bottomSectionNode,
        );
        const skillIconFallbackNode = this.createGraphicsNode(
            'SkillIconFallback',
            54,
            54,
            0,
            0,
            iconCellNode,
        );

        const textWidth = TACTIC_TEXT_CELL_WIDTH - 16;
        const titleLabel = this.createLabel(
            textCellNode,
            'TitleLabel',
            '',
            0,
            25,
            textWidth,
            20,
            17,
            UI_TEXT_PRIMARY,
        );
        const conditionLabel = this.createLabel(
            textCellNode,
            'ConditionLabel',
            '',
            0,
            7,
            textWidth,
            16,
            13,
            UI_TEXT_SECONDARY,
        );
        const effectLabel = this.createLabel(
            textCellNode,
            'EffectLabel',
            '',
            0,
            -20,
            textWidth,
            34,
            13,
            UI_TEXT_PRIMARY,
        );

        const costIconFallbackNode = this.createGraphicsNode(
            'CostIconFallback',
            12,
            12,
            -21,
            0,
            costCellNode,
        );
        const costLabel = this.createLabel(
            costCellNode,
            'CostLabel',
            '',
            7,
            0,
            36,
            20,
            12,
            UI_TEXT_PRIMARY,
        );
        const metaIconFallbackNode = this.createGraphicsNode(
            'MetaIconFallback',
            12,
            12,
            -20,
            0,
            metaCellNode,
        );
        const metaLabel = this.createLabel(
            metaCellNode,
            'MetaLabel',
            '',
            7,
            0,
            36,
            20,
            11.5,
            UI_TEXT_PRIMARY,
        );
        const stateIconFallbackNode = this.createGraphicsNode(
            'StateIconFallback',
            12,
            12,
            -32,
            0,
            stateCellNode,
        );
        const stateLabel = this.createLabel(
            stateCellNode,
            'StateLabel',
            '',
            6,
            0,
            60,
            20,
            11.5,
            Color.WHITE,
        );

        for (const label of [titleLabel, conditionLabel, costLabel, metaLabel, stateLabel]) {
            label.overflow = Label.Overflow.CLAMP;
            label.enableWrapText = false;
            label.verticalAlign = VerticalTextAlignment.CENTER;
        }
        titleLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        titleLabel.lineHeight = 20;
        conditionLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        conditionLabel.lineHeight = 16;
        effectLabel.overflow = Label.Overflow.CLAMP;
        effectLabel.enableWrapText = true;
        effectLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        effectLabel.verticalAlign = VerticalTextAlignment.CENTER;
        effectLabel.lineHeight = 16;
        costLabel.horizontalAlign = HorizontalTextAlignment.CENTER;
        costLabel.lineHeight = 14;
        metaLabel.horizontalAlign = HorizontalTextAlignment.CENTER;
        metaLabel.lineHeight = 14;
        stateLabel.horizontalAlign = HorizontalTextAlignment.CENTER;
        stateLabel.lineHeight = 14;

        const pressOverlay = this.createGraphicsNode('PressOverlay', width, height, 0, 0, root);
        const overlayGraphics = pressOverlay.getComponent(Graphics)!;
        overlayGraphics.fillColor = new Color(255, 218, 99, 42);
        overlayGraphics.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 13);
        overlayGraphics.fill();
        pressOverlay.active = false;
        const touchArea = new Node('TouchArea');
        touchArea.setParent(root);
        touchArea.addComponent(UITransform).setContentSize(width, height);

        const card: TacticCardView = {
            kind: icon,
            root,
            node: root,
            cardShellFallbackGraphics: root.getComponent(Graphics)!,
            topSectionNode,
            iconCellNode,
            iconCellFallbackGraphics: iconCellNode.getComponent(Graphics)!,
            textCellNode,
            textCellFallbackGraphics: textCellNode.getComponent(Graphics)!,
            dividerNode,
            dividerFallbackGraphics: dividerNode.getComponent(Graphics)!,
            skillIconFallbackGraphics: skillIconFallbackNode.getComponent(Graphics)!,
            iconOpacity: iconCellNode.addComponent(UIOpacity),
            titleLabel,
            conditionLabel,
            effectLabel,
            bottomSectionNode,
            costCellNode,
            costCellFallbackGraphics: costCellNode.getComponent(Graphics)!,
            costIconFallbackGraphics: costIconFallbackNode.getComponent(Graphics)!,
            costLabel,
            metaCellNode,
            metaCellFallbackGraphics: metaCellNode.getComponent(Graphics)!,
            metaIconFallbackGraphics: metaIconFallbackNode.getComponent(Graphics)!,
            metaLabel,
            stateCellNode,
            stateCellFallbackGraphics: stateCellNode.getComponent(Graphics)!,
            stateIconFallbackGraphics: stateIconFallbackNode.getComponent(Graphics)!,
            stateLabel,
            pressOverlay,
            touchArea,
            width,
            height,
            lastDisplayKey: '',
            enabled: false,
            availabilityState: 'not-started',
            pressArmed: false,
            lastActivationTimeMs: Number.NEGATIVE_INFINITY,
        };
        this.drawTacticIcon(card.skillIconFallbackGraphics, icon);
        this.drawTacticFallbackIcon(card.costIconFallbackGraphics, 'supply');
        this.drawTacticFallbackIcon(
            card.metaIconFallbackGraphics,
            icon === 'shock' ? 'once' : 'clock',
        );
        this.drawTacticFallbackIcon(card.stateIconFallbackGraphics, 'ready');
        this.validateTacticCardTextBounds(card);
        const handleTouchStart = (): void => {
            // Targeting is a temporary, reversible interaction state. Tapping any
            // other tactic first clears it, so its full-card touch area never leaves
            // an invisible lane-selection blocker behind.
            if (this.freezeLaneSelectionActive && card.kind !== 'freeze') {
                this.cancelFreezeLaneSelection(false);
                this.refreshHud('已取消道路冻结，未消耗补给。');
            }
            this.resetTacticCardPressState(card);
            const availability = this.getPlayerTacticAvailability(card.kind);
            const canCancelFreeze = card.kind === 'freeze' && this.freezeLaneSelectionActive;
            if ((!availability.enabled && !canCancelFreeze)
                || Date.now() - card.lastActivationTimeMs < TACTIC_CARD_PRESS_DEBOUNCE_MS) {
                return;
            }
            card.pressArmed = true;
            root.setScale(0.97, 0.97, 1);
            pressOverlay.active = true;
        };
        const handleTouchCancel = (): void => this.resetTacticCardPressState(card);
        const handleTouchEnd = (): void => {
            const wasArmed = card.pressArmed;
            this.resetTacticCardPressState(card);
            if (!wasArmed) return;
            const now = Date.now();
            const canCancelFreeze = card.kind === 'freeze' && this.freezeLaneSelectionActive;
            if (now - card.lastActivationTimeMs < TACTIC_CARD_PRESS_DEBOUNCE_MS
                || (!canCancelFreeze && !this.getPlayerTacticAvailability(card.kind).enabled)) return;
            card.lastActivationTimeMs = now;
            onClick();
        };
        for (const target of [root, touchArea]) {
            target.on(NodeEventType.TOUCH_START, handleTouchStart, this);
            target.on(NodeEventType.TOUCH_CANCEL, handleTouchCancel, this);
            target.on(NodeEventType.TOUCH_END, handleTouchEnd, this);
        }
        return card;
    }

    private resetTacticCardPressState(card: TacticCardView): void {
        card.pressArmed = false;
        card.node.setScale(1, 1, 1);
        card.pressOverlay.active = false;
    }

    private resetAllTacticCardPressStates(refreshCards = false, resetDebounce = false): void {
        for (const card of [this.playerSprintCard, this.playerHealCard, this.playerShockCard,
            this.playerFreezeCard, this.playerEnergySurgeCard, this.playerSupplyBoostCard]) {
            if (!card) continue;
            this.resetTacticCardPressState(card);
            if (resetDebounce) {
                card.lastActivationTimeMs = Number.NEGATIVE_INFINITY;
                card.lastDisplayKey = '';
                card.previousDisplayState = undefined;
            }
        }
        if (refreshCards) {
            this.lastTacticHudState = '';
            this.refreshTacticCards();
        }
    }

    private drawTacticIcon(graphics: Graphics, icon: TacticIcon): void {
        const accent = icon === 'sprint' ? new Color(249, 203, 72, 255)
            : icon === 'heal' ? new Color(91, 219, 132, 255)
                : icon === 'freeze' ? new Color(105, 211, 255, 255)
                    : icon === 'surge' ? new Color(244, 194, 55, 255)
                        : icon === 'supplyBoost' ? new Color(208, 171, 54, 255)
                            : new Color(184, 132, 255, 255);
        graphics.clear();
        graphics.fillColor = accent;
        graphics.strokeColor = accent;
        if (icon === 'sprint') {
            graphics.moveTo(-4, 19);
            graphics.lineTo(12, 2);
            graphics.lineTo(3, 2);
            graphics.lineTo(10, -18);
            graphics.lineTo(-11, 7);
            graphics.lineTo(-2, 7);
            graphics.close();
            graphics.fill();
            graphics.lineWidth = 3;
            graphics.moveTo(-18, -8);
            graphics.lineTo(-8, 0);
            graphics.lineTo(-18, 8);
            graphics.stroke();
            return;
        }
        if (icon === 'heal') {
            graphics.roundRect(-6, -18, 12, 36, 3);
            graphics.fill();
            graphics.roundRect(-18, -6, 36, 12, 3);
            graphics.fill();
            return;
        }
        if (icon === 'freeze') {
            graphics.lineWidth = 3.4;
            for (let index = 0; index < 3; index += 1) {
                const angle = index * Math.PI / 3;
                const dx = Math.cos(angle) * 18;
                const dy = Math.sin(angle) * 18;
                graphics.moveTo(-dx, -dy);
                graphics.lineTo(dx, dy);
            }
            graphics.stroke();
            graphics.circle(0, 0, 4.5);
            graphics.fill();
            return;
        }
        if (icon === 'surge') {
            graphics.moveTo(-4, 20);
            graphics.lineTo(11, 3);
            graphics.lineTo(3, 3);
            graphics.lineTo(9, -17);
            graphics.lineTo(-11, 7);
            graphics.lineTo(-2, 7);
            graphics.close();
            graphics.fill();
            graphics.fillColor = new Color(104, 207, 117, 255);
            graphics.ellipse(-14, -10, 7, 4);
            graphics.ellipse(14, 11, 7, 4);
            graphics.fill();
            graphics.lineWidth = 2.5;
            graphics.strokeColor = new Color(116, 225, 183, 230);
            graphics.arc(0, 0, 21, 0.45, 2.65, false);
            graphics.stroke();
            return;
        }
        if (icon === 'supplyBoost') {
            graphics.lineWidth = 3;
            graphics.roundRect(-17, -12, 34, 24, 7);
            graphics.stroke();
            graphics.fillColor = new Color(255, 231, 126, 255);
            graphics.moveTo(0, 18);
            graphics.lineTo(4, 6);
            graphics.lineTo(17, 6);
            graphics.lineTo(7, -1);
            graphics.lineTo(11, -14);
            graphics.lineTo(0, -6);
            graphics.lineTo(-11, -14);
            graphics.lineTo(-7, -1);
            graphics.lineTo(-17, 6);
            graphics.lineTo(-4, 6);
            graphics.close();
            graphics.fill();
            graphics.stroke();
            graphics.fillColor = new Color(86, 174, 105, 255);
            graphics.circle(0, 0, 4);
            graphics.fill();
            return;
        }
        graphics.lineWidth = 4;
        graphics.arc(0, 0, 16, 0.22, Math.PI - 0.22, false);
        graphics.stroke();
        graphics.arc(0, 0, 9, 0.22, Math.PI - 0.22, false);
        graphics.stroke();
        graphics.lineWidth = 3;
        graphics.moveTo(-16, -8);
        graphics.lineTo(-5, -2);
        graphics.lineTo(1, -11);
        graphics.lineTo(12, -4);
        graphics.lineTo(17, -12);
        graphics.stroke();
    }

    private drawTacticFallbackIcon(
        graphics: Graphics,
        icon: 'supply' | 'clock' | 'once' | 'ready' | 'lock' | 'blocked',
    ): void {
        graphics.clear();
        graphics.lineWidth = 1.8;
        graphics.strokeColor = new Color(92, 66, 43, 255);
        graphics.fillColor = new Color(250, 226, 161, 255);
        if (icon === 'supply') {
            graphics.roundRect(-6, -5, 12, 10, 2);
            graphics.fill();
            graphics.stroke();
            graphics.moveTo(-6, 1);
            graphics.lineTo(6, 1);
            graphics.moveTo(0, -5);
            graphics.lineTo(0, 5);
            graphics.stroke();
            return;
        }
        if (icon === 'clock') {
            graphics.circle(0, 0, 6);
            graphics.fill();
            graphics.stroke();
            graphics.moveTo(0, 0);
            graphics.lineTo(0, 3.5);
            graphics.moveTo(0, 0);
            graphics.lineTo(3.5, -1.8);
            graphics.stroke();
            return;
        }
        if (icon === 'once') {
            graphics.arc(0, 0, 5.8, 0.25, Math.PI * 1.75, false);
            graphics.stroke();
            graphics.moveTo(5.7, -2);
            graphics.lineTo(6.5, 2.2);
            graphics.lineTo(2.5, 1);
            graphics.close();
            graphics.fill();
            return;
        }
        if (icon === 'ready') {
            graphics.fillColor = new Color(255, 239, 150, 255);
            graphics.moveTo(0, 7);
            graphics.lineTo(2.1, 2.2);
            graphics.lineTo(7, 0);
            graphics.lineTo(2.1, -2.2);
            graphics.lineTo(0, -7);
            graphics.lineTo(-2.1, -2.2);
            graphics.lineTo(-7, 0);
            graphics.lineTo(-2.1, 2.2);
            graphics.close();
            graphics.fill();
            return;
        }
        if (icon === 'lock') {
            graphics.roundRect(-5.5, -5.5, 11, 9, 2);
            graphics.fill();
            graphics.stroke();
            graphics.arc(0, 3, 4, 0, Math.PI, false);
            graphics.stroke();
            return;
        }
        graphics.circle(0, 0, 6);
        graphics.stroke();
        graphics.moveTo(-4.2, -4.2);
        graphics.lineTo(4.2, 4.2);
        graphics.stroke();
    }

    private validateTacticCardTextBounds(card: TacticCardView, emitWarnings = true): readonly string[] {
        const boundsInCard = (node: Node): { left: number; right: number; bottom: number; top: number } | undefined => {
            const transform = node.getComponent(UITransform);
            if (!transform) return undefined;
            let x = 0;
            let y = 0;
            let cursor: Node | null = node;
            while (cursor && cursor !== card.node) {
                x += cursor.position.x;
                y += cursor.position.y;
                cursor = cursor.parent;
            }
            if (cursor !== card.node) return undefined;
            const anchor = transform.anchorPoint;
            const width = transform.contentSize.width * Math.abs(node.scale.x);
            const height = transform.contentSize.height * Math.abs(node.scale.y);
            return {
                left: x - width * anchor.x,
                right: x + width * (1 - anchor.x),
                bottom: y - height * anchor.y,
                top: y + height * (1 - anchor.y),
            };
        };
        const contains = (
            outer: { left: number; right: number; bottom: number; top: number } | undefined,
            inner: { left: number; right: number; bottom: number; top: number } | undefined,
            horizontalInset = 0,
            verticalInset = 0,
        ): boolean => !!outer && !!inner
            && inner.left >= outer.left + horizontalInset - 0.01
            && inner.right <= outer.right - horizontalInset + 0.01
            && inner.bottom >= outer.bottom + verticalInset - 0.01
            && inner.top <= outer.top - verticalInset + 0.01;
        const overlaps = (
            first: { left: number; right: number; bottom: number; top: number } | undefined,
            second: { left: number; right: number; bottom: number; top: number } | undefined,
        ): boolean => !!first && !!second
            && first.right > second.left + 0.01
            && first.left < second.right - 0.01
            && first.top > second.bottom + 0.01
            && first.bottom < second.top - 0.01;

        const violations: string[] = [];
        const regionChecks: readonly [string, Node, Node, number, number][] = [
            ['SkillIcon', card.skillIconSprite?.node ?? card.skillIconFallbackGraphics.node, card.iconCellNode, 5, 5],
            ['TitleLabel', card.titleLabel.node, card.textCellNode, 8, 3],
            ['ConditionLabel', card.conditionLabel.node, card.textCellNode, 8, 3],
            ['EffectLabel', card.effectLabel.node, card.textCellNode, 8, 3],
            ['CostLabel', card.costLabel.node, card.costCellNode, 2, 2],
            ['MetaLabel', card.metaLabel.node, card.metaCellNode, 2, 2],
            ['StateLabel', card.stateLabel.node, card.stateCellNode, 2, 2],
        ];
        for (const [name, child, region, horizontalInset, verticalInset] of regionChecks) {
            const childBounds = boundsInCard(child);
            const regionBounds = boundsInCard(region);
            if (!contains(regionBounds, childBounds, horizontalInset, verticalInset)) {
                violations.push(`${name}:outside-region:${JSON.stringify({ childBounds, regionBounds })}`);
            }
        }

        const iconCellBounds = boundsInCard(card.iconCellNode);
        const textCellBounds = boundsInCard(card.textCellNode);
        const costCellBounds = boundsInCard(card.costCellNode);
        const metaCellBounds = boundsInCard(card.metaCellNode);
        const stateCellBounds = boundsInCard(card.stateCellNode);
        if (overlaps(iconCellBounds, textCellBounds)) violations.push('TopCells:overlap');
        if (overlaps(costCellBounds, metaCellBounds)
            || overlaps(costCellBounds, stateCellBounds)
            || overlaps(metaCellBounds, stateCellBounds)) {
            violations.push('BottomCells:overlap');
        }

        const artPairs: readonly [string, Sprite | undefined, Graphics][] = [
            ['CardShell', card.cardShellSprite, card.cardShellFallbackGraphics],
            ['IconCell', card.iconCellSprite, card.iconCellFallbackGraphics],
            ['TextCell', card.textCellSprite, card.textCellFallbackGraphics],
            ['Divider', card.dividerSprite, card.dividerFallbackGraphics],
            ['CostCell', card.costCellSprite, card.costCellFallbackGraphics],
            ['MetaCell', card.metaCellSprite, card.metaCellFallbackGraphics],
            ['StateCell', card.stateCellSprite, card.stateCellFallbackGraphics],
        ];
        for (const [name, sprite, fallback] of artPairs) {
            if (sprite?.node.activeInHierarchy && fallback.enabled) {
                violations.push(`${name}:sprite-and-graphics-both-enabled`);
            }
            if (sprite?.node.activeInHierarchy) {
                const spriteBounds = boundsInCard(sprite.node);
                const regionBounds = boundsInCard(fallback.node);
                if (!contains(regionBounds, spriteBounds) || !contains(spriteBounds, regionBounds)) {
                    violations.push(`${name}:sprite-size-mismatch`);
                }
            }
        }

        const touchBounds = boundsInCard(card.touchArea);
        if (!touchBounds || Math.abs(touchBounds.left + card.width / 2) > 0.01
            || Math.abs(touchBounds.right - card.width / 2) > 0.01
            || Math.abs(touchBounds.bottom + card.height / 2) > 0.01
            || Math.abs(touchBounds.top - card.height / 2) > 0.01) {
            violations.push('TouchArea:does-not-match-card');
        }
        if (emitWarnings) {
            for (const violation of violations) {
                console.warn(`[TacticCardBounds] ${card.root.name} 越界、遮挡或映射异常：${violation}`);
            }
        }
        return violations;
    }

    private drawSupplyFactionSilhouette(point: SupplyPoint): void {
        const node = point.factionSilhouetteNode;
        const graphics = point.factionSilhouetteGraphics;
        graphics.clear();
        node.active = point.owner !== null;
        if (point.owner === null) {
            point.label.color = UI_TEXT_PRIMARY;
            return;
        }

        if (point.owner === Team.Player) {
            // Cream wool puffs plus paired curled horns create a round silhouette
            // that remains recognisable independently of the teal faction colour.
            graphics.fillColor = new Color(255, 246, 214, 245);
            graphics.circle(-9, 14, 7);
            graphics.circle(0, 18, 8);
            graphics.circle(9, 14, 7);
            graphics.fill();
            graphics.lineWidth = 4;
            graphics.strokeColor = new Color(47, 126, 104, 255);
            graphics.arc(-14, 8, 8, Math.PI * 0.35, Math.PI * 1.85, false);
            graphics.stroke();
            graphics.arc(14, 8, 8, Math.PI * 1.15, Math.PI * 2.65, false);
            graphics.stroke();
            point.label.color = new Color(38, 91, 65, 255);
            return;
        }

        // Two tall ears and a paw-shaped crest create the sharper wolf outline.
        graphics.fillColor = new Color(135, 49, 38, 245);
        graphics.moveTo(-16, 11);
        graphics.lineTo(-9, 27);
        graphics.lineTo(-3, 12);
        graphics.close();
        graphics.fill();
        graphics.moveTo(3, 12);
        graphics.lineTo(9, 27);
        graphics.lineTo(16, 11);
        graphics.close();
        graphics.fill();
        graphics.fillColor = new Color(255, 216, 155, 245);
        graphics.circle(0, 4, 5);
        graphics.circle(-7, 9, 2.5);
        graphics.circle(0, 11, 2.5);
        graphics.circle(7, 9, 2.5);
        graphics.fill();
        point.label.color = new Color(111, 43, 33, 255);
    }

    private formatTacticTenths(seconds: number): string {
        const clamped = Math.max(0, seconds);
        const roundedUp = Math.ceil(clamped * 10 - 0.0001) / 10;
        return Math.max(0, roundedUp).toFixed(1);
    }

    private buildTacticCardDisplayState(kind: TacticIcon): TacticCardDisplayState {
        const availability = this.getPlayerTacticAvailability(kind);
        const definition = TACTIC_DEFINITIONS[kind];
        const currentSupply = Math.max(0, Math.floor(this.playerSupply));
        const requiredSupply = definition.supplyCost;
        const cooldownTotal = definition.cooldownSeconds;
        const cooldownRemaining = kind === 'sprint' ? Math.max(0, this.playerSprintCooldown)
            : kind === 'heal' ? Math.max(0, this.playerHealCooldown)
                : kind === 'freeze' ? Math.max(0, this.playerFreezeCooldown)
                    : kind === 'surge' ? Math.max(0, this.playerEnergySurgeCooldown)
                        : kind === 'supplyBoost' ? Math.max(0, this.playerSupplyBoostCooldown) : 0;
        const activeRemaining = kind === 'sprint' ? Math.max(0, this.playerSprintRemaining)
            : kind === 'surge' ? Math.max(0, this.playerEnergySurgeRemaining)
                : kind === 'supplyBoost' ? Math.max(0, this.playerSupplyBoostRemaining) : 0;
        const hasUsed = kind === 'sprint' ? this.playerStats.sprintUses > 0
            : kind === 'heal' ? this.playerStats.healUses > 0
                : kind === 'freeze' ? this.playerStats.freezeUses > 0
                    : kind === 'surge' ? this.playerStats.surgeUses > 0
                        : kind === 'supplyBoost' ? this.playerStats.supplyBoostUses > 0 : this.playerShockUsed;
        const costText = requiredSupply > 0 ? `${currentSupply}/${requiredSupply}` : '零消耗';
        const metaText = kind === 'shock'
            ? '每局1次'
            : cooldownRemaining > 0
                ? `${this.formatTacticTenths(cooldownRemaining)}秒`
                : hasUsed ? '已就绪' : `${cooldownTotal}秒`;
        const costVisualState: TacticInfoVisualState = requiredSupply === 0
            ? 'neutral'
            : currentSupply >= requiredSupply ? 'ready' : 'insufficient';
        const metaVisualState: TacticInfoVisualState = kind === 'shock'
            ? 'neutral'
            : cooldownRemaining > 0 ? 'cooldown' : hasUsed ? 'ready' : 'neutral';
        return {
            currentSupply,
            requiredSupply,
            cooldownTotal,
            cooldownRemaining,
            activeRemaining,
            availability,
            costText,
            metaText,
            stateText: availability.statusText,
            costVisualState,
            metaVisualState,
        };
    }

    private getTacticDisplayKey(kind: TacticIcon, display: TacticCardDisplayState): string {
        return [
            kind,
            display.costText,
            display.metaText,
            display.stateText,
            display.costVisualState,
            display.metaVisualState,
            display.availability.state,
            display.availability.enabled ? '1' : '0',
        ].join(':');
    }

    private refreshTacticCards(force = false): void {
        if (!this.playerSprintCard || !this.playerHealCard || !this.playerShockCard
            || !this.playerFreezeCard || !this.playerEnergySurgeCard || !this.playerSupplyBoostCard) {
            return;
        }
        const sprintDisplay = this.buildTacticCardDisplayState('sprint');
        const healDisplay = this.buildTacticCardDisplayState('heal');
        const shockDisplay = this.buildTacticCardDisplayState('shock');
        const freezeDisplay = this.buildTacticCardDisplayState('freeze');
        const surgeDisplay = this.buildTacticCardDisplayState('surge');
        const supplyBoostDisplay = this.buildTacticCardDisplayState('supplyBoost');
        const tacticHudState = [
            this.getActiveTacticDeck().join(','),
            this.getTacticDisplayKey('sprint', sprintDisplay),
            this.getTacticDisplayKey('heal', healDisplay),
            this.getTacticDisplayKey('shock', shockDisplay),
            this.getTacticDisplayKey('freeze', freezeDisplay),
            this.getTacticDisplayKey('surge', surgeDisplay),
            this.getTacticDisplayKey('supplyBoost', supplyBoostDisplay),
        ].join('|');
        if (!force && tacticHudState === this.lastTacticHudState) return;
        this.lastTacticHudState = tacticHudState;
        this.updateTacticCard(
            this.playerSprintCard,
            '全体冲刺',
            '场上有己方单位',
            `移速+50% · 持续${SPRINT_DURATION_SECONDS}秒`,
            sprintDisplay,
        );
        this.updateTacticCard(
            this.playerHealCard,
            '战地急救',
            '场上有受伤单位',
            '全体恢复40%生命',
            healDisplay,
        );
        this.updateTacticCard(
            this.playerShockCard,
            '领地震荡',
            '基地生命低于50%',
            '本方领地小/中消灭\n大/巨重伤并击退',
            shockDisplay,
        );
        this.updateTacticCard(
            this.playerFreezeCard,
            TACTIC_DEFINITIONS.freeze.name,
            TACTIC_DEFINITIONS.freeze.condition,
            TACTIC_DEFINITIONS.freeze.effect,
            freezeDisplay,
        );
        this.updateTacticCard(
            this.playerEnergySurgeCard,
            TACTIC_DEFINITIONS.surge.name,
            TACTIC_DEFINITIONS.surge.condition,
            TACTIC_DEFINITIONS.surge.effect,
            surgeDisplay,
        );
        this.updateTacticCard(
            this.playerSupplyBoostCard,
            TACTIC_DEFINITIONS.supplyBoost.name,
            TACTIC_DEFINITIONS.supplyBoost.condition,
            TACTIC_DEFINITIONS.supplyBoost.effect,
            supplyBoostDisplay,
        );
    }

    private getPlayerTacticAvailability(kind: TacticIcon): TacticAvailability {
        const result = (state: TacticAvailabilityState, statusText: string, active = false): TacticAvailability => ({
            state,
            statusText,
            active,
            enabled: state === 'available',
        });
        if (!this.isStarted) return result('not-started', '未开始');
        if (this.isFinished) return result('finished', '已结束');
        if (this.isPaused) return result('paused', '已暂停');
        if (this.tutorialFlowActive
            && !(this.tutorialProgress === 'use-sprint' && kind === 'sprint'
                && LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] === 'use-sprint')) {
            return result('not-started', '引导进行中');
        }

        if (kind === 'sprint') {
            if (this.playerSprintRemaining > 0) {
                return result('active', `生效${this.formatTacticTenths(this.playerSprintRemaining)}秒`, true);
            }
            if (this.playerSprintCooldown > 0) {
                return result('cooldown', '冷却中');
            }
            if (this.playerSupply < SPRINT_SUPPLY_COST) {
                return result('insufficient-supply', '补给不足');
            }
            const hasFriendlyUnit = this.units.some((unit) => unit.team === Team.Player
                && unit.health > 0 && unit.node.isValid);
            return hasFriendlyUnit ? result('available', '点击使用') : result('no-friendly-unit', '暂无单位');
        }

        if (kind === 'heal') {
            if (this.playerHealCooldown > 0) {
                return result('cooldown', '冷却中');
            }
            if (this.playerSupply < HEAL_SUPPLY_COST) {
                return result('insufficient-supply', '补给不足');
            }
            const hasInjuredUnit = this.units.some((unit) => unit.team === Team.Player
                && unit.health > 0 && unit.node.isValid && unit.health < unit.definition.maxHealth);
            return hasInjuredUnit ? result('available', '点击使用') : result('no-injured-unit', '无人受伤');
        }

        if (kind === 'freeze') {
            if (!this.freezeUnlocked || this.currentLevel < 4) return result('locked', '未解锁');
            if (this.freezeLaneSelectionActive) return result('active', '请选道路', true);
            if (this.playerFreezeCooldown > 0) return result('cooldown', '冷却中');
            if (this.playerSupply < FREEZE_SUPPLY_COST) return result('insufficient-supply', '补给不足');
            const hasEnemy = this.units.some((unit) => unit.team === Team.AI && this.isActiveBattleUnit(unit));
            return hasEnemy ? result('available', '点击选路') : result('no-enemy-in-territory', '暂无敌人');
        }

        if (kind === 'surge') {
            if (this.currentLevel < 5) return result('locked', '第5关后可用');
            if (this.playerEnergySurgeRemaining > 0) {
                return result('active', `生效${this.formatTacticTenths(this.playerEnergySurgeRemaining)}秒`, true);
            }
            if (this.playerEnergySurgeCooldown > 0) return result('cooldown', '冷却中');
            if (this.playerSupply < ENERGY_SURGE_SUPPLY_COST) return result('insufficient-supply', '补给不足');
            return result('available', '点击使用');
        }

        if (kind === 'supplyBoost') {
            if (this.currentLevel !== 6) return result('locked', '仅第6关');
            if (this.playerSupplyBoostRemaining > 0) {
                return result('active', `强化剩余 ${Math.max(1, Math.ceil(this.playerSupplyBoostRemaining))}秒`, true);
            }
            if (this.playerSupplyBoostCooldown > 0) {
                return result('cooldown', `冷却中 ${Math.max(1, Math.ceil(this.playerSupplyBoostCooldown))}秒`);
            }
            if (this.playerSupply < SUPPLY_BOOST_SUPPLY_COST) return result('insufficient-supply', '补给不足');
            return result('available', '点击使用');
        }

        if (this.playerShockUsed) return result('used', '已使用');
        if (!this.playerShockUnlocked) return result('locked', '未解锁');
        return this.getEnemiesInTerritory(Team.Player).length > 0
            ? result('available', '点击使用')
            : result('no-enemy-in-territory', '领地无敌');
    }

    private getTacticStatusBarColor(state: TacticAvailabilityState): Color {
        if (state === 'available' || state === 'active') return new Color(79, 202, 123, 255);
        if (state === 'cooldown' || state === 'paused' || state === 'not-started') {
            return new Color(90, 173, 229, 255);
        }
        if (state === 'insufficient-supply') return new Color(230, 107, 91, 255);
        if (state === 'locked') return new Color(150, 117, 216, 255);
        if (state === 'used' || state === 'finished') return new Color(132, 147, 168, 255);
        return new Color(232, 169, 87, 255);
    }

    private updateTacticStateIcon(card: TacticCardView, state: TacticAvailabilityState): void {
        let resourceKey = ArtPilotResourceKey.TacticStateBlocked;
        let fallbackIcon: 'supply' | 'clock' | 'once' | 'ready' | 'lock' | 'blocked' = 'blocked';
        if (state === 'available' || state === 'active') {
            resourceKey = ArtPilotResourceKey.TacticStateReady;
            fallbackIcon = 'ready';
        } else if (state === 'cooldown' || state === 'paused' || state === 'not-started') {
            resourceKey = ArtPilotResourceKey.TacticStateClock;
            fallbackIcon = 'clock';
        } else if (state === 'insufficient-supply') {
            resourceKey = ArtPilotResourceKey.SupplyIcon;
            fallbackIcon = 'supply';
        } else if (state === 'locked') {
            resourceKey = ArtPilotResourceKey.TacticStateLock;
            fallbackIcon = 'lock';
        } else if (state === 'used') {
            resourceKey = ArtPilotResourceKey.TacticStateOnce;
            fallbackIcon = 'once';
        }
        const stateIcon = this.applyChildSprite(
            card.stateCellNode,
            'StateIconSprite',
            resourceKey,
            12,
            12,
            -32,
            0,
        );
        card.stateIconSprite = stateIcon;
        const showStateIcon = true;
        const stateIconArtNode = card.stateCellNode.getChildByName('StateIconSprite');
        if (stateIconArtNode) stateIconArtNode.active = showStateIcon && !!stateIcon;
        card.stateIconFallbackGraphics.node.active = showStateIcon && !stateIcon;
        if (stateIcon) {
            stateIcon.color = Color.WHITE;
            stateIcon.sizeMode = Sprite.SizeMode.CUSTOM;
            stateIcon.node.setSiblingIndex(1);
        } else {
            this.drawTacticFallbackIcon(card.stateIconFallbackGraphics, fallbackIcon);
            card.stateIconFallbackGraphics.node.setSiblingIndex(1);
        }
        card.stateLabel.node.setPosition(showStateIcon ? 6 : 0, 0, 0);
        card.stateLabel.node.getComponent(UITransform)?.setContentSize(showStateIcon ? 60 : 76, 20);
        card.stateLabel.node.setSiblingIndex(card.stateCellNode.children.length - 1);
    }

    private updateTacticCard(
        card: TacticCardView,
        title: string,
        condition: string,
        effect: string,
        display: TacticCardDisplayState,
    ): void {
        const availability = display.availability;
        const isAvailable = availability.enabled;
        const titleColor = new Color(75, 56, 38, 255);
        const bodyColor = new Color(101, 82, 62, 255);
        const border = new Color(232, 183, 68, 255);
        const cardFill = new Color(255, 247, 217, 255);
        const infoFill = card.kind === 'sprint' ? new Color(255, 248, 216, 255)
            : card.kind === 'heal' ? new Color(237, 255, 243, 255)
                : card.kind === 'freeze' ? new Color(232, 249, 255, 255)
                    : card.kind === 'surge' ? new Color(240, 252, 222, 255) : new Color(245, 239, 255, 255);
        const iconFill = card.kind === 'sprint' ? new Color(255, 216, 77, 255)
            : card.kind === 'heal' ? new Color(116, 223, 166, 255)
                : card.kind === 'freeze' ? new Color(112, 211, 245, 255)
                    : card.kind === 'surge' ? new Color(214, 210, 83, 255) : new Color(185, 154, 242, 255);
        const infoVisualColor = (state: TacticInfoVisualState): Color => {
            if (state === 'ready') return new Color(188, 239, 207, 255);
            if (state === 'insufficient') return new Color(241, 138, 121, 255);
            if (state === 'cooldown') return new Color(141, 204, 242, 255);
            return new Color(255, 240, 189, 255);
        };
        const previous = card.previousDisplayState;
        const becameSupplyReady = !!previous
            && previous.requiredSupply > 0
            && previous.currentSupply < previous.requiredSupply
            && display.currentSupply >= display.requiredSupply;
        const cooldownBecameReady = !!previous
            && previous.cooldownRemaining > 0
            && display.cooldownRemaining <= 0;

        card.enabled = availability.enabled;
        card.availabilityState = availability.state;
        card.titleLabel.string = title;
        card.conditionLabel.string = condition;
        card.effectLabel.string = effect;
        card.costLabel.string = display.costText;
        card.metaLabel.string = display.metaText;
        card.stateLabel.string = display.stateText;
        card.titleLabel.color = titleColor;
        card.conditionLabel.color = bodyColor;
        card.effectLabel.color = titleColor;
        card.costLabel.color = display.costVisualState === 'insufficient' ? Color.WHITE : titleColor;
        card.metaLabel.color = titleColor;
        card.stateLabel.color = Color.WHITE;

        this.applyTacticInfoCellArt(card, 'cost', display.costVisualState);
        this.applyTacticInfoCellArt(card, 'meta', display.metaVisualState);
        this.applyTacticStateCellArt(card, availability.state);

        const usedTint = new Color(224, 231, 239, 255);
        if (card.cardShellSprite) {
            card.cardShellSprite.color = availability.state === 'used'
                || availability.state === 'finished' ? usedTint : Color.WHITE;
        }
        if (card.textCellSprite) {
            card.textCellSprite.color = availability.state === 'used'
                || availability.state === 'finished' ? usedTint : Color.WHITE;
        }
        if (card.iconCellSprite) card.iconCellSprite.color = Color.WHITE;
        if (card.costCellSprite) card.costCellSprite.color = Color.WHITE;
        if (card.metaCellSprite) card.metaCellSprite.color = Color.WHITE;
        if (card.stateCellSprite) card.stateCellSprite.color = Color.WHITE;
        if (card.skillIconSprite) card.skillIconSprite.color = Color.WHITE;

        if (availability.state === 'used' || availability.state === 'finished') {
            card.iconOpacity.opacity = 190;
        } else if (availability.state === 'insufficient-supply') {
            card.iconOpacity.opacity = 204;
        } else if (availability.state === 'locked'
            || availability.state === 'no-friendly-unit'
            || availability.state === 'no-injured-unit'
            || availability.state === 'no-enemy-in-territory'
            || availability.state === 'paused') {
            card.iconOpacity.opacity = 215;
        } else if (availability.state === 'cooldown') {
            card.iconOpacity.opacity = 238;
        } else {
            card.iconOpacity.opacity = 255;
        }

        const showCostIcon = card.kind !== 'shock';
        card.costIconSprite?.node.setPosition(-21, 0, 0);
        if (card.costIconSprite) card.costIconSprite.node.active = showCostIcon;
        card.costIconFallbackGraphics.node.active = showCostIcon && !card.costIconSprite;
        card.costLabel.node.setPosition(showCostIcon ? 7 : 0, 0, 0);
        card.costLabel.node.getComponent(UITransform)?.setContentSize(showCostIcon ? 36 : 52, 20);

        const showMetaIcon = card.kind !== 'shock';
        card.metaIconSprite?.node.setPosition(-20, 0, 0);
        if (card.metaIconSprite) card.metaIconSprite.node.active = showMetaIcon;
        card.metaIconFallbackGraphics.node.active = showMetaIcon && !card.metaIconSprite;
        card.metaLabel.node.setPosition(showMetaIcon ? 7 : 0, 0, 0);
        card.metaLabel.node.getComponent(UITransform)?.setContentSize(showMetaIcon ? 36 : 48, 20);
        if (card.costIconSprite) {
            card.costIconSprite.color = display.costVisualState === 'insufficient'
                ? Color.WHITE : titleColor;
        }
        if (card.metaIconSprite) card.metaIconSprite.color = titleColor;

        const drawFallbackPanel = (
            graphics: Graphics,
            width: number,
            height: number,
            fill: Color,
            stroke: Color,
            radius: number,
        ): void => {
            graphics.clear();
            graphics.fillColor = fill;
            graphics.roundRect(-width / 2, -height / 2, width, height, radius);
            graphics.fill();
            graphics.lineWidth = 1.5;
            graphics.strokeColor = stroke;
            graphics.roundRect(-width / 2 + 0.75, -height / 2 + 0.75, width - 1.5, height - 1.5, radius - 1);
            graphics.stroke();
        };
        drawFallbackPanel(card.cardShellFallbackGraphics, card.width, card.height, cardFill, border, 13);
        drawFallbackPanel(
            card.iconCellFallbackGraphics,
            TACTIC_ICON_CELL_WIDTH,
            TACTIC_TOP_CELL_HEIGHT,
            iconFill,
            border,
            10,
        );
        drawFallbackPanel(
            card.textCellFallbackGraphics,
            TACTIC_TEXT_CELL_WIDTH,
            TACTIC_TOP_CELL_HEIGHT,
            infoFill,
            border,
            9,
        );
        card.dividerFallbackGraphics.clear();
        card.dividerFallbackGraphics.lineWidth = 1.5;
        card.dividerFallbackGraphics.strokeColor = new Color(border.r, border.g, border.b, 170);
        card.dividerFallbackGraphics.moveTo(-(card.width - 12) / 2, 0);
        card.dividerFallbackGraphics.lineTo((card.width - 12) / 2, 0);
        card.dividerFallbackGraphics.stroke();
        drawFallbackPanel(
            card.costCellFallbackGraphics,
            TACTIC_COST_CELL_WIDTH,
            TACTIC_BOTTOM_CELL_HEIGHT,
            infoVisualColor(display.costVisualState),
            border,
            7,
        );
        drawFallbackPanel(
            card.metaCellFallbackGraphics,
            TACTIC_META_CELL_WIDTH,
            TACTIC_BOTTOM_CELL_HEIGHT,
            infoVisualColor(display.metaVisualState),
            border,
            7,
        );
        drawFallbackPanel(
            card.stateCellFallbackGraphics,
            TACTIC_STATE_CELL_WIDTH,
            TACTIC_BOTTOM_CELL_HEIGHT,
            this.getTacticStatusBarColor(availability.state),
            new Color(255, 248, 225, isAvailable ? 205 : 125),
            7,
        );

        this.updateTacticStateIcon(card, availability.state);

        if (becameSupplyReady && card.costCellSprite) {
            const opacity = card.costCellSprite.node.getComponent(UIOpacity)
                ?? card.costCellSprite.node.addComponent(UIOpacity);
            Tween.stopAllByTarget(opacity);
            opacity.opacity = 205;
            tween(opacity)
                .to(0.16, { opacity: 255 }, { easing: 'quadOut' })
                .start();
        }
        if (cooldownBecameReady) {
            const iconNode = card.skillIconSprite?.node ?? card.skillIconFallbackGraphics.node;
            Tween.stopAllByTarget(iconNode);
            iconNode.setScale(1, 1, 1);
            tween(iconNode)
                .to(0.12, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'quadOut' })
                .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'quadIn' })
                .start();
        }

        if (!isAvailable) {
            this.resetTacticCardPressState(card);
        }
        card.lastDisplayKey = this.getTacticDisplayKey(card.kind, display);
        card.previousDisplayState = display;
        this.validateTacticCardTextBounds(card);
    }

    private createResultPanel(): void {
        this.resultPanel = new Node('ResultPanel');
        this.resultPanel.setParent(this.modalLayer);
        this.resultPanel.addComponent(UITransform).setContentSize(this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);
        this.resultPanel.addComponent(BlockInputEvents);

        const backdrop = this.createGraphicsNode(
            'ResultBackdrop',
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
            0,
            0,
            this.resultPanel,
        );
        const resultBackdropColor = new Color(8, 18, 16, 158);
        this.fullscreenBackdropColors.set(backdrop, resultBackdropColor);
        this.redrawFullscreenBackdrop(backdrop, resultBackdropColor);
        this.resultBackdropOpacity = backdrop.addComponent(UIOpacity);

        this.resultCard = this.createGraphicsNode('ResultCard', 720, 540, 0, 0, this.resultPanel);
        this.resultCardGraphics = this.resultCard.getComponent(Graphics)!;
        this.resultCardOpacity = this.resultCard.addComponent(UIOpacity);

        this.resultBadge = this.createGraphicsNode('ResultBadge', 80, 80, 0, 220, this.resultCard);
        this.resultBadgeOpacity = this.resultBadge.addComponent(UIOpacity);

        this.resultTitleGroup = new Node('ResultTitleGroup');
        this.resultTitleGroup.setParent(this.resultCard);
        this.resultTitleGroup.setPosition(0, 127, 0);
        this.resultTitleGroup.addComponent(UITransform).setContentSize(620, 92);
        this.resultTitleOpacity = this.resultTitleGroup.addComponent(UIOpacity);
        this.resultTitleLabel = this.createLabel(
            this.resultTitleGroup,
            'ResultText',
            '',
            0,
            19,
            600,
            48,
            42,
            new Color(59, 105, 51, 255),
        );
        this.resultTitleLabel.isBold = true;
        this.resultTitleLabel.enableOutline = true;
        this.resultTitleLabel.outlineColor = new Color(238, 202, 108, 220);
        this.resultTitleLabel.outlineWidth = 2;
        this.resultTitleLabel.enableShadow = true;
        this.resultTitleLabel.shadowColor = new Color(75, 54, 34, 90);
        this.resultTitleLabel.shadowOffset = new Vec2(1, -2);
        this.configureSingleLineLabel(this.resultTitleLabel, this.resultTitleLabel.color);
        this.resultSummaryLabel = this.createLabel(
            this.resultTitleGroup,
            'ResultSummary',
            '',
            0,
            -27,
            600,
            42,
            17,
            new Color(86, 92, 55, 255),
        );
        this.resultSummaryLabel.lineHeight = 21;

        this.resultDetailsGroup = new Node('ResultDetailsGroup');
        this.resultDetailsGroup.setParent(this.resultCard);
        this.resultDetailsGroup.setPosition(0, -5, 0);
        this.resultDetailsGroup.addComponent(UITransform).setContentSize(620, 144);
        this.resultDetailsOpacity = this.resultDetailsGroup.addComponent(UIOpacity);
        this.resultPlayerDataCard = this.createResultDataCard(
            this.resultDetailsGroup,
            'PlayerResultCard',
            '\u7F8A\u65B9\u8868\u73B0',
            -154,
            true,
        );
        this.resultAiDataCard = this.createResultDataCard(
            this.resultDetailsGroup,
            'AiResultCard',
            '\u72FC\u65B9\u8868\u73B0',
            154,
            false,
        );
        this.resultHintLabel = this.createLabel(
            this.resultCard,
            'ResultHint',
            '',
            0,
            -104,
            620,
            34,
            16,
            new Color(73, 101, 59, 255),
        );
        this.configureSingleLineLabel(this.resultHintLabel, this.resultHintLabel.color);

        this.resultButtonsGroup = new Node('ResultButtonsGroup');
        this.resultButtonsGroup.setParent(this.resultCard);
        this.resultButtonsGroup.setPosition(0, -184, 0);
        this.resultButtonsGroup.addComponent(UITransform).setContentSize(640, 60);
        this.resultButtonsOpacity = this.resultButtonsGroup.addComponent(UIOpacity);
        this.resultRetryButton = this.createResultActionButton(
            this.resultButtonsGroup,
            'ResultRetryButton',
            '\u91CD\u65B0\u6311\u6218',
            -208,
            0,
            190,
            58,
            24,
            'secondary',
            () => this.restartGame(),
        );
        this.resultNextButtonView = this.createResultActionButton(
            this.resultButtonsGroup,
            'ResultNextButton',
            '\u4E0B\u4E00\u5173',
            0,
            0,
            190,
            58,
            24,
            'primary',
            () => this.startNextLevel(),
        );
        this.resultNextButton = this.resultNextButtonView.node;
        this.resultLevelSelectButton = this.createResultActionButton(
            this.resultButtonsGroup,
            'ResultLevelSelectButton',
            '\u8FD4\u56DE\u9009\u5173',
            208,
            0,
            190,
            58,
            24,
            'secondary',
            () => this.leaveBattleToLevelSelect(),
        );
        this.drawResultCard(true);
        this.drawResultBadge(true);
        this.resetResultPresentation(false);
        this.resultPanel.active = false;
    }

    private createResultDataCard(
        parent: Node,
        name: string,
        title: string,
        x: number,
        playerCard: boolean,
    ): ResultDataCardView {
        const root = this.createGraphicsNode(name, 296, 142, x, 0, parent);
        const graphics = root.getComponent(Graphics)!;
        const headerLabel = this.createLabel(
            root,
            'Header',
            title,
            0,
            49,
            250,
            24,
            18,
            playerCard ? new Color(48, 105, 74, 255) : new Color(139, 72, 59, 255),
        );
        headerLabel.isBold = true;
        this.configureSingleLineLabel(headerLabel, headerLabel.color);

        const metricNames = ['\u57FA\u5730\u5269\u4F59', '\u6D3E\u51FA\u5355\u4F4D', '\u83B7\u5F97\u8865\u7ED9', '\u4F7F\u7528\u6218\u672F'];
        const metricLabels: Label[] = [];
        const valueLabels: Label[] = [];
        const rowY = [18, -5, -28, -51];
        for (let index = 0; index < metricNames.length; index += 1) {
            const metricLabel = this.createLabel(
                root,
                `Metric${index + 1}`,
                metricNames[index],
                -55,
                rowY[index],
                130,
                20,
                15,
                new Color(91, 75, 57, 255),
            );
            this.configureSingleLineLabel(metricLabel, metricLabel.color, HorizontalTextAlignment.LEFT);
            const valueLabel = this.createLabel(
                root,
                `Value${index + 1}`,
                '',
                80,
                rowY[index],
                96,
                20,
                15,
                playerCard ? new Color(43, 104, 71, 255) : new Color(136, 66, 54, 255),
            );
            valueLabel.isBold = true;
            this.configureSingleLineLabel(valueLabel, valueLabel.color, HorizontalTextAlignment.RIGHT);
            metricLabels.push(metricLabel);
            valueLabels.push(valueLabel);
        }
        const view: ResultDataCardView = { root, graphics, headerLabel, metricLabels, valueLabels };
        this.drawResultDataCard(view, playerCard);
        return view;
    }

    private drawResultDataCard(card: ResultDataCardView, playerCard: boolean): void {
        const graphics = card.graphics;
        graphics.clear();
        graphics.fillColor = playerCard
            ? new Color(228, 244, 220, 250)
            : new Color(252, 229, 216, 250);
        graphics.roundRect(-148, -71, 296, 142, 18);
        graphics.fill();
        graphics.fillColor = playerCard
            ? new Color(194, 229, 185, 245)
            : new Color(247, 198, 179, 245);
        graphics.roundRect(-143, 35, 286, 32, 13);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = playerCard
            ? new Color(111, 168, 113, 230)
            : new Color(201, 125, 105, 230);
        graphics.roundRect(-148, -71, 296, 142, 18);
        graphics.stroke();
        graphics.lineWidth = 1;
        graphics.strokeColor = new Color(122, 100, 75, 70);
        graphics.moveTo(20, 28);
        graphics.lineTo(20, -60);
        graphics.stroke();
    }

    private updateResultDataCard(card: ResultDataCardView, stats: BattleStats, baseHealth: number): void {
        const tacticUses = stats.shockUses + stats.sprintUses + stats.healUses + stats.freezeUses + stats.surgeUses;
        const values = [
            `${this.formatResultNumber(baseHealth)}/${this.formatResultNumber(BASE_MAX_HEALTH)}`,
            this.formatResultNumber(stats.unitsSpawned),
            this.formatResultNumber(stats.supplyEarned),
            tacticUses > 0 ? `${this.formatResultNumber(tacticUses)}\u6B21` : '\u672A\u4F7F\u7528',
        ];
        card.valueLabels.forEach((label, index) => {
            label.string = values[index];
        });
    }

    private formatResultNumber(value: number): string {
        if (!Number.isFinite(value)) return '0';
        const rounded = Math.round(value * 10) / 10;
        return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
    }

    private createResultActionButton(
        parent: Node,
        name: string,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fontSize: number,
        role: ResultButtonRole,
        onClick: () => void,
    ): ResultButtonView {
        const node = this.createGraphicsNode(name, width, height, x, y, parent);
        const opacity = node.addComponent(UIOpacity);
        const label = this.createLabel(
            node,
            'Text',
            text,
            0,
            0,
            width - 30,
            height - 8,
            fontSize,
            role === 'primary' ? new Color(45, 86, 49, 255) : new Color(83, 61, 43, 255),
        );
        label.isBold = true;
        label.enableShadow = true;
        label.shadowColor = new Color(255, 248, 218, 115);
        label.shadowOffset = new Vec2(0, 1);
        this.configureSingleLineLabel(label, label.color);
        const view: ResultButtonView = {
            node,
            graphics: node.getComponent(Graphics)!,
            label,
            width,
            height,
            role,
            opacity,
            enabled: true,
            pressed: false,
        };
        this.resultButtonViews.push(view);
        this.drawResultButtonFallback(view);

        node.on(NodeEventType.TOUCH_START, () => {
            if (!view.enabled || this.resultActionsLocked || !this.resultButtonsGroup.active) return;
            view.pressed = true;
            Tween.stopAllByTarget(node);
            node.setScale(0.97, 0.97, 1);
            const sprite = node.getChildByName('ButtonArt')?.getComponent(Sprite);
            if (sprite) sprite.color = new Color(225, 225, 225, 255);
        }, this);
        const release = (): void => this.releaseResultButton(view);
        node.on(NodeEventType.TOUCH_CANCEL, release, this);
        node.on(NodeEventType.TOUCH_END, () => {
            const shouldActivate = view.pressed && view.enabled && !this.resultActionsLocked;
            this.releaseResultButton(view);
            if (!shouldActivate) return;
            this.resultActionsLocked = true;
            onClick();
            this.audioManager.playSfx('ui_click');
        }, this);
        return view;
    }

    private releaseResultButton(view: ResultButtonView): void {
        view.pressed = false;
        const sprite = view.node.getChildByName('ButtonArt')?.getComponent(Sprite);
        if (sprite) sprite.color = Color.WHITE;
        Tween.stopAllByTarget(view.node);
        tween(view.node)
            .to(0.14, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    private drawResultButtonFallback(view: ResultButtonView): void {
        const fill = view.role === 'primary'
            ? new Color(137, 213, 119, 255)
            : new Color(224, 238, 208, 255);
        const border = view.role === 'primary'
            ? new Color(199, 151, 70, 255)
            : new Color(186, 143, 78, 255);
        this.drawButton(view, fill, border);
    }

    private applyResultButtonSkins(): void {
        for (const view of this.resultButtonViews) {
            if (!view.node.isValid) continue;
            const key = view.role === 'primary'
                ? ArtPilotResourceKey.ButtonPrimary
                : ArtPilotResourceKey.ButtonSecondary;
            const sprite = this.applyChildSprite(view.node, 'ButtonArt', key, view.width, view.height);
            view.artSprite = sprite;
            view.graphics.enabled = !sprite;
            if (sprite) sprite.color = Color.WHITE;
            view.label.color = view.role === 'primary'
                ? new Color(45, 86, 49, 255)
                : new Color(83, 61, 43, 255);
            view.label.node.setSiblingIndex(view.node.children.length - 1);
        }
    }

    private layoutResultButtons(showNextButton: boolean): void {
        this.resultNextButton.active = showNextButton;
        if (showNextButton) {
            this.resultRetryButton.node.setPosition(-208, 0, 0);
            this.resultNextButton.setPosition(0, 0, 0);
            this.resultLevelSelectButton.node.setPosition(208, 0, 0);
        } else {
            this.resultRetryButton.node.setPosition(-110, 0, 0);
            this.resultLevelSelectButton.node.setPosition(110, 0, 0);
        }
    }

    private drawResultCard(playerWon: boolean): void {
        const graphics = this.resultCardGraphics;
        graphics.clear();
        graphics.fillColor = new Color(92, 66, 37, 115);
        graphics.roundRect(-354, -274, 716, 536, 32);
        graphics.fill();
        graphics.fillColor = new Color(255, 248, 224, 255);
        graphics.roundRect(-350, -266, 700, 520, 28);
        graphics.fill();
        graphics.lineWidth = 6;
        graphics.strokeColor = playerWon
            ? new Color(201, 150, 65, 255) : new Color(177, 112, 91, 255);
        graphics.roundRect(-350, -266, 700, 520, 28);
        graphics.stroke();
    }

    private drawResultBadge(playerWon: boolean): void {
        const graphics = this.resultBadge.getComponent(Graphics)!;
        graphics.clear();
        if (playerWon) {
            graphics.fillColor = new Color(70, 117, 54, 255);
            graphics.circle(0, 0, 41);
            graphics.fill();
            graphics.lineWidth = 4;
            graphics.strokeColor = new Color(255, 213, 92, 255);
            graphics.circle(0, 0, 39);
            graphics.stroke();

            graphics.fillColor = new Color(229, 177, 54, 255);
            graphics.moveTo(-23, 21);
            graphics.lineTo(23, 21);
            graphics.lineTo(19, -7);
            graphics.quadraticCurveTo(14, -26, 0, -32);
            graphics.quadraticCurveTo(-14, -26, -19, -7);
            graphics.close();
            graphics.fill();
            graphics.lineWidth = 3;
            graphics.strokeColor = new Color(255, 237, 158, 255);
            graphics.moveTo(-13, -2);
            graphics.lineTo(-3, -12);
            graphics.lineTo(16, 9);
            graphics.stroke();
            graphics.lineWidth = 3;
            graphics.strokeColor = new Color(95, 193, 255, 255);
            graphics.moveTo(-28, -21);
            graphics.quadraticCurveTo(-38, -3, -32, 18);
            graphics.moveTo(28, -21);
            graphics.quadraticCurveTo(38, -3, 32, 18);
            graphics.stroke();
        } else {
            graphics.fillColor = new Color(118, 79, 72, 255);
            graphics.circle(0, 0, 41);
            graphics.fill();
            graphics.lineWidth = 4;
            graphics.strokeColor = new Color(153, 78, 101, 255);
            graphics.circle(0, 0, 39);
            graphics.stroke();

            graphics.fillColor = new Color(128, 65, 80, 255);
            graphics.moveTo(-23, 21);
            graphics.lineTo(23, 21);
            graphics.lineTo(19, -9);
            graphics.quadraticCurveTo(13, -26, 0, -32);
            graphics.quadraticCurveTo(-14, -26, -20, -8);
            graphics.close();
            graphics.fill();
            graphics.lineWidth = 4;
            graphics.strokeColor = new Color(222, 147, 158, 255);
            graphics.moveTo(3, 21);
            graphics.lineTo(-6, 6);
            graphics.lineTo(5, -2);
            graphics.lineTo(-5, -17);
            graphics.lineTo(0, -31);
            graphics.stroke();
            graphics.lineWidth = 3;
            graphics.strokeColor = new Color(116, 99, 148, 255);
            graphics.moveTo(-28, -21);
            graphics.lineTo(-35, -32);
            graphics.moveTo(28, -21);
            graphics.lineTo(35, -32);
            graphics.stroke();
        }
    }

    private playResultTransition(playerWon: boolean): void {
        this.resetResultPresentation(false);
        this.showModal(this.resultPanel);
        this.resultBackdropOpacity.opacity = 0;
        this.resultCardOpacity.opacity = 0;
        this.resultCard.setScale(0.92, 0.92, 1);
        this.resultBadgeOpacity.opacity = 0;
        this.resultBadge.setScale(0.72, 0.72, 1);
        this.resultTitleOpacity.opacity = 0;
        this.resultDetailsOpacity.opacity = 0;
        this.resultButtonsOpacity.opacity = 0;
        this.resultButtonsGroup.active = false;

        tween(this.resultBackdropOpacity)
            .to(0.26, { opacity: 255 }, { easing: 'quadOut' })
            .start();
        tween(this.resultCardOpacity)
            .delay(0.05)
            .to(0.3, { opacity: 255 }, { easing: 'quadOut' })
            .start();
        tween(this.resultCard)
            .delay(0.05)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        tween(this.resultBadgeOpacity)
            .delay(0.2)
            .to(0.3, { opacity: 255 }, { easing: 'quadOut' })
            .start();
        tween(this.resultBadge)
            .delay(0.2)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        tween(this.resultTitleOpacity)
            .delay(0.38)
            .to(0.2, { opacity: 255 }, { easing: 'quadOut' })
            .start();
        tween(this.resultDetailsOpacity)
            .delay(0.48)
            .to(0.23, { opacity: 255 }, { easing: 'quadOut' })
            .start();
        tween(this.resultPanel)
            .delay(0.16)
            .call(() => {
                if (!this.resultAudioPlayed && this.isFinished) {
                    this.resultAudioPlayed = true;
                    this.audioManager.playSfx(playerWon ? 'victory' : 'defeat');
                }
            })
            .delay(0.52)
            .call(() => {
                if (!this.isFinished) {
                    return;
                }
                this.resultButtonsGroup.active = true;
                this.resultButtonsOpacity.opacity = 0;
                tween(this.resultButtonsOpacity)
                    .to(0.22, { opacity: 255 }, { easing: 'quadOut' })
                    .start();
            })
            .start();
    }

    private resetResultPresentation(hidePanel = true): void {
        if (!this.resultPanel) {
            return;
        }
        const tweenTargets: object[] = [
            this.resultPanel,
            this.resultBackdropOpacity,
            this.resultCard,
            this.resultCardOpacity,
            this.resultBadge,
            this.resultBadgeOpacity,
            this.resultTitleOpacity,
            this.resultDetailsOpacity,
            this.resultButtonsOpacity,
        ];
        for (const target of tweenTargets) {
            if (target) {
                Tween.stopAllByTarget(target);
            }
        }
        this.resultAudioPlayed = false;
        this.resultActionsLocked = false;
        if (this.resultBackdropOpacity) {
            this.resultBackdropOpacity.opacity = 0;
        }
        if (this.resultCardOpacity) {
            this.resultCardOpacity.opacity = 0;
        }
        if (this.resultCard) {
            this.resultCard.setScale(0.92, 0.92, 1);
        }
        if (this.resultBadgeOpacity) {
            this.resultBadgeOpacity.opacity = 0;
        }
        if (this.resultBadge) {
            this.resultBadge.setScale(0.72, 0.72, 1);
        }
        if (this.resultTitleOpacity) {
            this.resultTitleOpacity.opacity = 0;
        }
        if (this.resultDetailsOpacity) {
            this.resultDetailsOpacity.opacity = 0;
        }
        if (this.resultButtonsOpacity) {
            this.resultButtonsOpacity.opacity = 0;
        }
        if (this.resultButtonsGroup) {
            this.resultButtonsGroup.active = false;
        }
        for (const button of this.resultButtonViews) {
            if (!button.node?.isValid) continue;
            Tween.stopAllByTarget(button.node);
            button.node.setScale(1, 1, 1);
            button.pressed = false;
            button.opacity.opacity = 255;
            const sprite = button.node.getChildByName('ButtonArt')?.getComponent(Sprite);
            if (sprite) sprite.color = Color.WHITE;
        }
        if (hidePanel) {
            this.resultPanel.active = false;
        }
    }

    private createStartPanel(): void {
        this.startPanel = new Node('StartPanel');
        this.startPanel.setParent(this.modalLayer);
        this.startPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.startPanel, 860, 480);

        this.createLabel(this.startPanel, 'StartTitle', GAME_NAME, 0, 126, 760, 58, 38, new Color(255, 244, 207, 255));
        this.createLabel(this.startPanel, 'StartSubtitle', '\u56DB\u7EBF\u6B63\u9762\u4EA4\u950B\u00B7\u593A\u53D6\u8865\u7ED9\u00B7\u5B88\u4F4F\u57FA\u5730', 0, 78, 760, 30, 18, new Color(190, 220, 242, 255));
        this.createLabel(this.startPanel, 'StartDescription', '\u9009\u62E9\u7F8A\u7FA4\uFF0C\u5728\u56DB\u6761\u901A\u9053\u51FA\u5175\u3002\n\u5360\u9886\u4E2D\u592E\u8865\u7ED9\u70B9\uFF0C\u79EF\u7D2F\u8865\u7ED9\u6765\u91CA\u653E\u6218\u672F\u3002\n\u51FB\u7834\u654C\u65B9\u57FA\u5730\u5373\u83B7\u80DC\u3002', 0, 13, 720, 102, 18, new Color(226, 233, 240, 255));
        this.startCurrentLevelCaptionLabel = this.createLabel(
            this.startPanel,
            'StartCurrentLevelCaption',
            '\u5F53\u524D\u5173\u5361',
            0,
            -50,
            700,
            20,
            14,
            new Color(190, 220, 242, 255),
        );
        this.startCurrentLevelCaptionLabel.isBold = true;
        this.startSelectedLevelLabel = this.createLabel(
            this.startPanel,
            'StartSelectedLevel',
            '',
            0,
            -76,
            700,
            28,
            21,
            new Color(255, 225, 145, 255),
        );
        this.startSelectedLevelLabel.isBold = true;
        this.startSelectedLevelLabel.enableShadow = true;
        this.startSelectedLevelLabel.shadowColor = new Color(28, 35, 39, 150);
        this.startSelectedLevelLabel.shadowOffset = new Vec2(0, -2);
        this.startLevelSelectButton = this.createTitleActionButton(
            this.startPanel,
            'LevelSelectButton',
            '\u9009\u62E9\uFF0F\u5207\u6362\u5173\u5361',
            START_LEVEL_SELECT_BUTTON_Y,
            START_LEVEL_SELECT_BUTTON_WIDTH,
            START_LEVEL_SELECT_BUTTON_HEIGHT,
            24,
            'primary',
            () => this.requestStartLevelSelect(),
        );
        this.resizeAndPositionLabel(
            this.startLevelSelectButton.label,
            22,
            11,
            START_LEVEL_SELECT_BUTTON_WIDTH - 116,
            31,
        );
        this.startLevelSelectButton.label.isBold = true;
        this.startLevelSelectSubtitleLabel = this.createLabel(
            this.startLevelSelectButton.node,
            'Subtitle',
            '\u67E5\u770B\u5168\u90E8\u5173\u5361',
            22,
            -18,
            START_LEVEL_SELECT_BUTTON_WIDTH - 116,
            18,
            14,
            new Color(88, 71, 43, 245),
        );
        this.configureSingleLineLabel(this.startLevelSelectSubtitleLabel, new Color(88, 71, 43, 245));
        this.startBattleButton = this.createTitleActionButton(
            this.startPanel,
            'StartBattleButton',
            '\u5F00\u59CB\u6311\u6218',
            START_BATTLE_BUTTON_Y,
            START_BATTLE_BUTTON_WIDTH,
            START_BATTLE_BUTTON_HEIGHT,
            22,
            'secondary',
            () => this.requestStartBattle(),
        );
        this.startBattleButton.label.isBold = true;
        this.createLabel(
            this.startPanel,
            'VersionLabel',
            `${GAME_NAME} ${GAME_VERSION}`,
            500,
            -328,
            230,
            24,
            14,
            new Color(132, 151, 169, 210),
        );
    }

    private createLevelSelectPanel(): void {
        this.levelSelectPanel = new Node('LevelSelectOverlay');
        this.levelSelectPanel.setParent(this.modalLayer);
        this.levelSelectPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.levelSelectPanel.addComponent(BlockInputEvents);

        this.levelSelectDimBackground = this.createGraphicsNode(
            'DimBackground',
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
            0,
            0,
            this.levelSelectPanel,
        );
        const dimColor = new Color(23, 63, 45, 198);
        this.fullscreenBackdropColors.set(this.levelSelectDimBackground, dimColor);
        this.redrawFullscreenBackdrop(this.levelSelectDimBackground, dimColor);

        this.levelSelectContent = this.createGraphicsNode(
            'LevelSelectPanel',
            LEVEL_SELECT_PANEL_WIDTH,
            LEVEL_SELECT_PANEL_HEIGHT,
            0,
            0,
            this.levelSelectPanel,
        );
        this.levelSelectPanelFallbackGraphics = this.levelSelectContent.getComponent(Graphics)!;
        this.drawLevelSelectPanelFallback();

        const titleArea = new Node('TitleArea');
        titleArea.setParent(this.levelSelectContent);
        titleArea.setPosition(0, 274, 0);
        titleArea.addComponent(UITransform).setContentSize(700, 104);
        const titleLabel = this.createLabel(
            titleArea,
            'TitleLabel',
            '\u5173\u5361\u9009\u62E9',
            0,
            24,
            680,
            44,
            LEVEL_SELECT_MAIN_TITLE_FONT_SIZE,
            new Color(74, 56, 39, 255),
        );
        this.applyTargetTypography(titleLabel, 'LevelSelectMainTitle');
        const divider = this.createGraphicsNode('TitleDivider', 520, 8, 0, -5, titleArea);
        const dividerGraphics = divider.getComponent(Graphics)!;
        dividerGraphics.lineWidth = 2;
        dividerGraphics.strokeColor = new Color(218, 178, 91, 185);
        dividerGraphics.moveTo(-260, 0);
        dividerGraphics.lineTo(260, 0);
        dividerGraphics.stroke();
        const subtitleLabel = this.createLabel(
            titleArea,
            'SubtitleLabel',
            '选择关卡后，点击下方按钮开始挑战',
            0,
            -30,
            680,
            24,
            LEVEL_SELECT_SUBTITLE_FONT_SIZE,
            new Color(118, 91, 60, 255),
        );
        this.applyTargetTypography(subtitleLabel, 'LevelSelectSubtitle');

        this.levelSelectList = new Node('LevelList');
        this.levelSelectList.setParent(this.levelSelectContent);
        this.levelSelectList.addComponent(UITransform).setContentSize(
            LEVEL_SELECT_CARD_WIDTH,
            LEVEL_SELECT_CARD_HEIGHT * LEVEL_SELECT_ITEMS_PER_PAGE
                + LEVEL_SELECT_CARD_GAP * (LEVEL_SELECT_ITEMS_PER_PAGE - 1),
        );
        this.levelSelectListOpacity = this.levelSelectList.addComponent(UIOpacity);
        for (let index = 0; index < LEVEL_CONFIGS.length; index += 1) {
            const config = LEVEL_CONFIGS[index];
            const y = LEVEL_SELECT_CARD_Y[index % LEVEL_SELECT_ITEMS_PER_PAGE];
            const card = this.createLevelCard(this.levelSelectList, config, y);
            this.levelCards.set(config.id, card);
        }

        this.levelSelectPaginationArea = this.createGraphicsNode(
            'PaginationArea', 500, LEVEL_SELECT_PAGE_BUTTON_HEIGHT, 0, LEVEL_SELECT_PAGINATION_Y,
            this.levelSelectContent,
        );
        const paginationGraphics = this.levelSelectPaginationArea.getComponent(Graphics)!;
        paginationGraphics.fillColor = new Color(255, 247, 220, 210);
        paginationGraphics.roundRect(-250, -23, 500, 46, 15);
        paginationGraphics.fill();
        this.levelSelectPreviousPageButton = this.createButton(
            this.levelSelectPaginationArea, 'PreviousPageButton', '上一页', -168, 0,
            LEVEL_SELECT_PAGE_BUTTON_WIDTH, LEVEL_SELECT_PAGE_BUTTON_HEIGHT, 18,
            () => this.changeLevelSelectPage(-1),
        );
        this.levelSelectNextPageButton = this.createButton(
            this.levelSelectPaginationArea, 'NextPageButton', '下一页', 168, 0,
            LEVEL_SELECT_PAGE_BUTTON_WIDTH, LEVEL_SELECT_PAGE_BUTTON_HEIGHT, 18,
            () => this.changeLevelSelectPage(1),
        );
        this.applyTargetTypography(
            this.levelSelectPreviousPageButton.label,
            'LevelSelectPagination',
        );
        this.applyTargetTypography(
            this.levelSelectNextPageButton.label,
            'LevelSelectPagination',
        );
        this.levelSelectPageLabel = this.createLabel(
            this.levelSelectPaginationArea, 'PageLabel', '', 0, 0, 150, 34, 18,
            new Color(74, 56, 39, 255),
        );
        this.applyTargetTypography(this.levelSelectPageLabel, 'LevelSelectPagination');

        this.levelSelectProgressArea = this.createGraphicsNode(
            'ProgressArea',
            LEVEL_SELECT_PROGRESS_WIDTH,
            LEVEL_SELECT_PROGRESS_HEIGHT,
            0,
            LEVEL_SELECT_PROGRESS_Y,
            this.levelSelectContent,
        );
        this.levelSelectProgressFallbackGraphics = this.levelSelectProgressArea.getComponent(Graphics)!;
        this.drawLevelSelectProgressFallback();
        this.levelSelectProgressLabel = this.createLabel(
            this.levelSelectProgressArea,
            'ProgressLabel',
            '',
            -210,
            0,
            190,
            30,
            16,
            new Color(74, 56, 39, 255),
        );
        this.applyTargetTypography(this.levelSelectProgressLabel, 'LevelSelectProgress');
        this.levelSelectHintLabel = this.createLabel(
            this.levelSelectProgressArea,
            'ProgressHint',
            '',
            112,
            0,
            390,
            30,
            13,
            new Color(118, 91, 60, 255),
        );
        this.applyTargetTypography(this.levelSelectHintLabel, 'LevelSelectProgressHint');

        const bottomButtons = new Node('BottomButtons');
        bottomButtons.setParent(this.levelSelectContent);
        bottomButtons.setPosition(0, LEVEL_SELECT_BOTTOM_BUTTON_Y, 0);
        bottomButtons.addComponent(UITransform).setContentSize(650, LEVEL_SELECT_ACTION_BUTTON_HEIGHT);
        this.levelSelectBackButton = this.createButton(
            bottomButtons,
            'LevelSelectBackButton',
            '\u8FD4\u56DE\u4E3B\u83DC\u5355',
            -190,
            0,
            LEVEL_SELECT_BACK_BUTTON_WIDTH,
            LEVEL_SELECT_ACTION_BUTTON_HEIGHT,
            LEVEL_SELECT_BACK_BUTTON_FONT_SIZE,
            () => this.returnToStartPanel(),
        );
        this.applyTargetTypography(
            this.levelSelectBackButton.label,
            'LevelSelectSecondaryAction',
        );
        this.levelSelectConfirmButton = this.createButton(
            bottomButtons,
            'LevelSelectConfirmButton',
            '\u5F00\u59CB\u6311\u6218',
            155,
            0,
            LEVEL_SELECT_CONFIRM_BUTTON_WIDTH,
            LEVEL_SELECT_ACTION_BUTTON_HEIGHT,
            LEVEL_SELECT_CONFIRM_BUTTON_FONT_SIZE,
            () => this.confirmSelectedLevel(),
        );
        this.applyTargetTypography(
            this.levelSelectConfirmButton.label,
            'LevelSelectPrimaryAction',
        );
        this.drawButton(
            this.levelSelectConfirmButton,
            new Color(142, 207, 104, 255),
            new Color(232, 183, 57, 255),
        );
        if (LEVEL_SELECT_DEBUG_RESET_ENABLED) {
            this.levelSelectDebugResetButton = this.createButton(
                bottomButtons,
                'DebugResetButton',
                '\u91CD\u7F6E\u672C\u5730\u8FDB\u5EA6',
                0,
                -62,
                210,
                42,
                15,
                () => this.showResetProgressConfirmation(),
            );
            this.levelSelectDebugResetButton.label.color = new Color(111, 59, 39, 255);
            this.createResetProgressConfirmation();
        }
        this.levelSelectPanel.active = false;
    }

    private createLevelCard(parent: Node, config: LevelConfig, y: number): LevelCardView {
        const root = this.createGraphicsNode(
            `LevelCard${config.id}`,
            LEVEL_SELECT_CARD_WIDTH,
            LEVEL_SELECT_CARD_HEIGHT,
            0,
            y,
            parent,
        );
        const backgroundGraphics = root.getComponent(Graphics)!;

        const numberBadgeNode = this.createGraphicsNode('NumberBadge', 66, 60, -282, 0, root);
        const numberBadgeGraphics = numberBadgeNode.getComponent(Graphics)!;
        const numberLabel = this.createLabel(
            numberBadgeNode,
            'NumberLabel',
            `${config.id}`,
            0,
            -1,
            52,
            38,
            23,
            new Color(74, 56, 39, 255),
        );
        this.configureSingleLineLabel(numberLabel, new Color(74, 56, 39, 255));

        const textArea = new Node('TextArea');
        textArea.setParent(root);
        textArea.setPosition(-30, 0, 0);
        textArea.addComponent(UITransform).setContentSize(410, 100);
        const titleLabel = this.createLabel(
            textArea,
            'LevelTitleLabel',
            `\u7B2C${config.id}\u5173\u00B7${config.title}`,
            0,
            27,
            410,
            28,
            LEVEL_SELECT_CARD_TITLE_FONT_SIZE,
            new Color(74, 56, 39, 255),
        );
        this.applyTargetTypography(titleLabel, 'LevelCardTitle');
        const descriptionLabel = this.createLabel(
            textArea,
            'DescriptionLabel',
            this.getLevelSelectDescription(config.id),
            0,
            -19,
            410,
            50,
            LEVEL_SELECT_CARD_DESCRIPTION_FONT_SIZE,
            new Color(118, 91, 60, 255),
        );
        this.applyTargetTypography(descriptionLabel, 'LevelCardDescription');

        const stateArea = new Node('StateArea');
        stateArea.setParent(root);
        stateArea.setPosition(246, 0, 0);
        stateArea.addComponent(UITransform).setContentSize(156, 72);
        const stateIconFallbackNode = this.createGraphicsNode('StateIconFallback', 28, 28, -57, 0, stateArea);
        const stateIconFallbackGraphics = stateIconFallbackNode.getComponent(Graphics)!;
        const stateLabel = this.createLabel(
            stateArea,
            'StateLabel',
            '',
            17,
            0,
            120,
            30,
            LEVEL_SELECT_CARD_STATE_FONT_SIZE,
            new Color(74, 56, 39, 255),
        );
        this.applyTargetTypography(stateLabel, 'LevelCardState');

        const completionBadgeNode = this.createGraphicsNode(
            'CompletionBadge',
            22,
            22,
            LEVEL_SELECT_CARD_WIDTH / 2 - 16,
            LEVEL_SELECT_CARD_HEIGHT / 2 - 16,
            root,
        );
        const completionBadgeFallbackGraphics = completionBadgeNode.getComponent(Graphics)!;
        completionBadgeNode.active = false;

        const touchArea = new Node('TouchArea');
        touchArea.setParent(root);
        touchArea.addComponent(UITransform).setContentSize(LEVEL_SELECT_CARD_WIDTH, LEVEL_SELECT_CARD_HEIGHT);

        const card: LevelCardView = {
            levelId: config.id,
            root,
            backgroundGraphics,
            numberBadgeNode,
            numberBadgeGraphics,
            numberLabel,
            titleLabel,
            descriptionLabel,
            stateArea,
            stateIconFallbackNode,
            stateIconFallbackGraphics,
            stateLabel,
            completionBadgeNode,
            completionBadgeFallbackGraphics,
            touchArea,
            visualState: !this.isLevelImplemented(config) ? 'in-development'
                : this.canChallengeLevel(config.id) ? 'available' : 'locked',
            completed: false,
        };
        touchArea.on(NodeEventType.TOUCH_START, () => {
            if (this.canChallengeLevel(config.id)) {
                root.setScale(0.99, 0.99, 1);
            }
        }, this);
        touchArea.on(NodeEventType.TOUCH_CANCEL, () => {
            root.setScale(1, 1, 1);
        }, this);
        touchArea.on(NodeEventType.TOUCH_END, () => {
            root.setScale(1, 1, 1);
            this.selectLevel(config.id);
            this.audioManager.playSfx('ui_click');
        }, this);
        this.drawLevelCardFallback(card, card.visualState);
        this.drawLevelNumberBadgeFallback(card, card.visualState);
        this.drawLevelStateIconFallback(card, card.visualState);
        return card;
    }

    private getLevelSelectDescription(levelId: number): string {
        if (levelId === 1) {
            return '小狼缓慢出兵，熟悉选兵、四线部署与补给争夺。';
        }
        if (levelId === 2) {
            return '小狼与中狼交替出兵，练习多路线判断与基础对抗。';
        }
        if (levelId === 3) {
            return '完整兵种与战术登场，考验补给、能量与路线调度。';
        }
        if (levelId === 4) {
            return '特殊道路改变移速，合理利用道路冻结突破防线。';
        }
        if (levelId === 5) {
            return '能量高速恢复，小型单位可持续部署，体验高频对抗。';
        }
        if (levelId === 6) {
            return '黄金补给线定时转移，围绕限时占领争夺额外补给。';
        }
        return '自由选择道路部署单位，围绕补给与基地展开对抗。';
    }

    private drawLevelSelectPanelFallback(): void {
        const graphics = this.levelSelectPanelFallbackGraphics;
        graphics.clear();
        graphics.fillColor = new Color(255, 247, 220, 255);
        graphics.roundRect(
            -LEVEL_SELECT_PANEL_WIDTH / 2,
            -LEVEL_SELECT_PANEL_HEIGHT / 2,
            LEVEL_SELECT_PANEL_WIDTH,
            LEVEL_SELECT_PANEL_HEIGHT,
            34,
        );
        graphics.fill();
        graphics.lineWidth = 6;
        graphics.strokeColor = new Color(232, 184, 77, 255);
        graphics.roundRect(
            -LEVEL_SELECT_PANEL_WIDTH / 2,
            -LEVEL_SELECT_PANEL_HEIGHT / 2,
            LEVEL_SELECT_PANEL_WIDTH,
            LEVEL_SELECT_PANEL_HEIGHT,
            34,
        );
        graphics.stroke();
    }

    private drawLevelCardFallback(card: LevelCardView, state: LevelCardVisualState): void {
        const colors: Record<LevelCardVisualState, { fill: Color; border: Color }> = {
            selected: {
                fill: new Color(255, 240, 181, 255),
                border: new Color(245, 200, 78, 255),
            },
            available: {
                fill: new Color(241, 251, 242, 255),
                border: new Color(105, 207, 226, 255),
            },
            completed: {
                fill: new Color(236, 249, 233, 255),
                border: new Color(87, 201, 130, 255),
            },
            locked: {
                fill: new Color(226, 226, 222, 255),
                border: new Color(146, 146, 140, 255),
            },
            'in-development': {
                fill: new Color(238, 234, 240, 255),
                border: new Color(168, 169, 178, 255),
            },
        };
        const palette = colors[state];
        const graphics = card.backgroundGraphics;
        graphics.clear();
        graphics.fillColor = palette.fill;
        graphics.roundRect(
            -LEVEL_SELECT_CARD_WIDTH / 2,
            -LEVEL_SELECT_CARD_HEIGHT / 2,
            LEVEL_SELECT_CARD_WIDTH,
            LEVEL_SELECT_CARD_HEIGHT,
            18,
        );
        graphics.fill();
        graphics.lineWidth = state === 'selected' ? 4 : 3;
        graphics.strokeColor = palette.border;
        graphics.roundRect(
            -LEVEL_SELECT_CARD_WIDTH / 2,
            -LEVEL_SELECT_CARD_HEIGHT / 2,
            LEVEL_SELECT_CARD_WIDTH,
            LEVEL_SELECT_CARD_HEIGHT,
            18,
        );
        graphics.stroke();
    }

    private drawLevelNumberBadgeFallback(card: LevelCardView, state: LevelCardVisualState): void {
        const graphics = card.numberBadgeGraphics;
        graphics.clear();
        graphics.fillColor = state === 'selected'
            ? new Color(255, 220, 105, 255)
            : new Color(255, 241, 200, 255);
        graphics.roundRect(-33, -30, 66, 60, 16);
        graphics.fill();
        graphics.lineWidth = state === 'selected' ? 4 : 3;
        graphics.strokeColor = state === 'selected'
            ? new Color(184, 121, 22, 255)
            : new Color(221, 168, 63, 255);
        graphics.roundRect(-33, -30, 66, 60, 16);
        graphics.stroke();
        card.numberLabel.color = state === 'selected'
            ? new Color(82, 53, 24, 255) : new Color(74, 56, 39, 255);
    }

    private drawLevelStateIconFallback(card: LevelCardView, state: LevelCardVisualState): void {
        const graphics = card.stateIconFallbackGraphics;
        graphics.clear();
        const accent = state === 'selected'
            ? new Color(245, 200, 78, 255)
            : state === 'available' ? new Color(105, 207, 226, 255)
                : state === 'completed' ? new Color(87, 201, 130, 255)
                    : new Color(168, 169, 178, 255);
        graphics.fillColor = accent;
        graphics.circle(0, 0, 11);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(74, 56, 39, 255);
        if (state === 'in-development') {
            graphics.fillColor = new Color(74, 56, 39, 255);
            for (const x of [-5, 0, 5]) graphics.circle(x, 0, 1.5);
            graphics.fill();
        } else if (state === 'locked') {
            graphics.strokeColor = new Color(74, 56, 39, 255);
            graphics.roundRect(-6, -2, 12, 10, 2);
            graphics.stroke();
            graphics.arc(0, 3, 5, 0, Math.PI, false);
            graphics.stroke();
        } else if (state === 'completed') {
            graphics.moveTo(-6, 0);
            graphics.lineTo(-1, -5);
            graphics.lineTo(7, 6);
            graphics.stroke();
        } else if (state === 'available') {
            graphics.moveTo(-3, -6);
            graphics.lineTo(6, 0);
            graphics.lineTo(-3, 6);
            graphics.close();
            graphics.stroke();
        } else {
            graphics.moveTo(-5, -7);
            graphics.lineTo(-5, 7);
            graphics.stroke();
            graphics.moveTo(-4, 6);
            graphics.lineTo(6, 3);
            graphics.lineTo(-4, -1);
            graphics.close();
            graphics.stroke();
        }
    }

    private drawLevelSelectProgressFallback(): void {
        const graphics = this.levelSelectProgressFallbackGraphics;
        graphics.clear();
        graphics.fillColor = new Color(255, 241, 200, 255);
        graphics.roundRect(
            -LEVEL_SELECT_PROGRESS_WIDTH / 2,
            -LEVEL_SELECT_PROGRESS_HEIGHT / 2,
            LEVEL_SELECT_PROGRESS_WIDTH,
            LEVEL_SELECT_PROGRESS_HEIGHT,
            14,
        );
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(225, 191, 105, 255);
        graphics.roundRect(
            -LEVEL_SELECT_PROGRESS_WIDTH / 2,
            -LEVEL_SELECT_PROGRESS_HEIGHT / 2,
            LEVEL_SELECT_PROGRESS_WIDTH,
            LEVEL_SELECT_PROGRESS_HEIGHT,
            14,
        );
        graphics.stroke();
    }

    private loadLevelProgress(): void {
        const maxLevel = Math.max(...LEVEL_CONFIGS.map((config) => config.id));
        this.completedLevels.clear();
        this.selectedTacticsByLevel.clear();
        this.bestResultsByLevel.clear();
        let legacyHighest: number | undefined;
        try {
            const rawLegacy = sys.localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);
            if (rawLegacy !== null) {
                const numeric = Number(rawLegacy);
                if (Number.isFinite(numeric)) legacyHighest = Math.max(1, Math.min(3, Math.floor(numeric)));
            }
        } catch (error) {
            console.warn('[WolfSheepBattle][Save] 旧版进度键读取失败，将使用安全默认值。', error);
        }

        const mergeLegacyProgress = (): void => {
            if (legacyHighest === undefined) return;
            // The legacy high-water key came from a free-selection build and cannot
            // prove a real victory. Preserve it only for rollback compatibility;
            // never synthesize completedLevels from it.
            this.highestUnlockedLevel = Math.max(this.highestUnlockedLevel, legacyHighest);
        };

        let loadedStructuredSave = false;
        let saveNeedsRepair = false;
        try {
            const raw = sys.localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY_V2);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<LevelProgressSave>;
                if (parsed && typeof parsed === 'object'
                    && typeof parsed.schemaVersion === 'number' && parsed.schemaVersion >= 2) {
                    loadedStructuredSave = true;
                    const savedHighest = parsed.highestUnlockedLevel;
                    if (typeof savedHighest === 'number' && Number.isFinite(savedHighest)) {
                        this.highestUnlockedLevel = Math.max(1, Math.min(maxLevel, Math.floor(savedHighest)));
                    } else {
                        this.highestUnlockedLevel = 1;
                        saveNeedsRepair = true;
                    }

                    if (Array.isArray(parsed.completedLevels)) {
                        for (const levelId of parsed.completedLevels) {
                            if (typeof levelId !== 'number' || !Number.isFinite(levelId)) {
                                saveNeedsRepair = true;
                                continue;
                            }
                            const normalized = Math.floor(levelId);
                            if (this.getLevelConfig(normalized)) this.completedLevels.add(normalized);
                            else saveNeedsRepair = true;
                        }
                    } else {
                        saveNeedsRepair = true;
                    }
                    mergeLegacyProgress();

                    this.specialRoadTutorialSeen = typeof parsed.specialRoadTutorialSeen === 'boolean'
                        ? parsed.specialRoadTutorialSeen : false;
                    const savedTutorialVersion = typeof parsed.levelOneTutorialVersion === 'number'
                        && Number.isFinite(parsed.levelOneTutorialVersion)
                        ? Math.max(0, Math.floor(parsed.levelOneTutorialVersion)) : 0;
                    this.levelOneTutorialVersion = this.completedLevels.has(1)
                        ? LEVEL_ONE_TUTORIAL_VERSION : savedTutorialVersion;
                    this.levelOneTutorialCompleted = this.completedLevels.has(1)
                        || (savedTutorialVersion >= LEVEL_ONE_TUTORIAL_VERSION
                            && parsed.levelOneTutorialCompleted === true);
                    this.levelFiveTutorialSeen = typeof parsed.levelFiveTutorialSeen === 'boolean'
                        ? parsed.levelFiveTutorialSeen : false;
                    this.freezeUnlocked = typeof parsed.freezeUnlocked === 'boolean'
                        ? parsed.freezeUnlocked : this.highestUnlockedLevel >= 4 || this.completedLevels.has(3);
                    if (typeof parsed.specialRoadTutorialSeen !== 'boolean'
                        || typeof parsed.levelFiveTutorialSeen !== 'boolean'
                        || typeof parsed.freezeUnlocked !== 'boolean') saveNeedsRepair = true;
                    if (typeof parsed.levelOneTutorialCompleted !== 'boolean'
                        || typeof parsed.levelOneTutorialVersion !== 'number'
                        || savedTutorialVersion !== this.levelOneTutorialVersion
                        || (parsed.levelOneTutorialCompleted === true && !this.completedLevels.has(1)
                            && savedTutorialVersion < LEVEL_ONE_TUTORIAL_VERSION)) saveNeedsRepair = true;
                    if (this.completedLevels.has(1) && parsed.levelOneTutorialCompleted !== true) {
                        saveNeedsRepair = true;
                    }

                    const savedLevelId = parsed.selectedLevelId;
                    const savedLevel = typeof savedLevelId === 'number' && Number.isFinite(savedLevelId)
                        ? this.getLevelConfig(Math.floor(savedLevelId)) : undefined;
                    if (this.isLevelImplemented(savedLevel)) this.currentLevel = savedLevel.id;
                    else saveNeedsRepair = true;

                    this.selectedTacticsByLevel.set(4,
                        this.normalizeTacticDeck(parsed.selectedTactics, DEFAULT_LEVEL_FOUR_TACTIC_DECK));
                    const savedByLevel = parsed.selectedTacticsByLevel;
                    if (savedByLevel && typeof savedByLevel === 'object') {
                        for (const levelId of [4, 5, 6]) {
                            const savedDeck = savedByLevel[`${levelId}`];
                            this.selectedTacticsByLevel.set(
                                levelId,
                                this.normalizeTacticDeck(savedDeck, this.getDefaultTacticDeckForLevel(levelId)),
                            );
                            if (!Array.isArray(savedDeck)) saveNeedsRepair = true;
                        }
                    } else {
                        saveNeedsRepair = true;
                    }
                    const bestResults = parsed.bestResultsByLevel;
                    if (bestResults && typeof bestResults === 'object') {
                        const levelSixBest = bestResults['6'];
                        if (levelSixBest && typeof levelSixBest === 'object'
                            && typeof levelSixBest.fastestWinSeconds === 'number'
                            && Number.isFinite(levelSixBest.fastestWinSeconds)
                            && levelSixBest.fastestWinSeconds > 0
                            && typeof levelSixBest.highestBaseHealth === 'number'
                            && Number.isFinite(levelSixBest.highestBaseHealth)
                            && typeof levelSixBest.highestSupplyEarned === 'number'
                            && Number.isFinite(levelSixBest.highestSupplyEarned)) {
                            this.bestResultsByLevel.set(6, {
                                fastestWinSeconds: Math.max(0.1, levelSixBest.fastestWinSeconds),
                                highestBaseHealth: Math.max(0, Math.min(BASE_MAX_HEALTH, levelSixBest.highestBaseHealth)),
                                highestSupplyEarned: Math.max(0, levelSixBest.highestSupplyEarned),
                            });
                        } else if (levelSixBest !== undefined) {
                            saveNeedsRepair = true;
                        }
                    } else if (parsed.schemaVersion >= 4) {
                        saveNeedsRepair = true;
                    }
                    if (parsed.schemaVersion !== LEVEL_PROGRESS_SCHEMA_VERSION) saveNeedsRepair = true;
                }
            }
        } catch (error) {
            console.warn('[WolfSheepBattle][Save] 结构化进度损坏，将合并旧版进度并安全恢复。', error);
        }

        if (!loadedStructuredSave) {
            this.highestUnlockedLevel = 1;
            mergeLegacyProgress();
            this.specialRoadTutorialSeen = false;
            this.levelOneTutorialCompleted = this.completedLevels.has(1);
            this.levelOneTutorialVersion = this.completedLevels.has(1) ? LEVEL_ONE_TUTORIAL_VERSION : 0;
            this.levelFiveTutorialSeen = false;
            this.freezeUnlocked = this.highestUnlockedLevel >= 4 || this.completedLevels.has(3);
            this.currentLevel = this.getFirstImplementedLevelConfig().id;
            this.selectedTacticsByLevel.set(4, [...DEFAULT_LEVEL_FOUR_TACTIC_DECK]);
            this.selectedTacticsByLevel.set(5, [...DEFAULT_LEVEL_FIVE_TACTIC_DECK]);
            this.selectedTacticsByLevel.set(6, [...DEFAULT_LEVEL_SIX_TACTIC_DECK]);
            saveNeedsRepair = true;
        }

        if (this.completedLevels.has(3) && this.highestUnlockedLevel < 4) {
            this.highestUnlockedLevel = 4;
            this.freezeUnlocked = true;
            saveNeedsRepair = true;
        }
        if (this.hasClearedMandatoryLevelOne() && this.highestUnlockedLevel < maxLevel) {
            // Level 1 victory opens every implemented level at once. The high-water
            // value is retained only for old-build rollback and is not an entry gate.
            this.highestUnlockedLevel = maxLevel;
            saveNeedsRepair = true;
        }
        if (this.highestUnlockedLevel >= 4) this.freezeUnlocked = true;
        if (!this.selectedTacticsByLevel.has(4)) {
            this.selectedTacticsByLevel.set(4, [...DEFAULT_LEVEL_FOUR_TACTIC_DECK]);
            saveNeedsRepair = true;
        }
        if (!this.selectedTacticsByLevel.has(5)) {
            this.selectedTacticsByLevel.set(5, [...DEFAULT_LEVEL_FIVE_TACTIC_DECK]);
            saveNeedsRepair = true;
        }
        if (!this.selectedTacticsByLevel.has(6)) {
            this.selectedTacticsByLevel.set(6, [...DEFAULT_LEVEL_SIX_TACTIC_DECK]);
            saveNeedsRepair = true;
        }
        if (!this.canChallengeLevel(this.currentLevel)) {
            this.currentLevel = this.getFirstImplementedLevelConfig().id;
            saveNeedsRepair = true;
        }
        this.selectedTactics = [...(this.selectedTacticsByLevel.get(this.currentLevel)
            ?? this.getDefaultTacticDeckForLevel(this.currentLevel))];
        if (saveNeedsRepair) this.saveLevelProgress();
    }

    private saveLevelProgress(): void {
        const bestResultsByLevel: Record<string, LevelBestResultSave> = {};
        for (const [levelId, result] of this.bestResultsByLevel) {
            bestResultsByLevel[`${levelId}`] = { ...result };
        }
        const saveData: LevelProgressSave = {
            schemaVersion: LEVEL_PROGRESS_SCHEMA_VERSION,
            highestUnlockedLevel: this.highestUnlockedLevel,
            completedLevels: Array.from(this.completedLevels).sort((left, right) => left - right),
            selectedLevelId: this.getCurrentLevelConfig().id,
            specialRoadTutorialSeen: this.specialRoadTutorialSeen,
            levelOneTutorialCompleted: this.levelOneTutorialCompleted,
            levelOneTutorialVersion: this.levelOneTutorialVersion,
            freezeUnlocked: this.freezeUnlocked,
            selectedTactics: [...this.selectedTactics],
            selectedTacticsByLevel: {
                '4': [...(this.selectedTacticsByLevel.get(4) ?? DEFAULT_LEVEL_FOUR_TACTIC_DECK)],
                '5': [...(this.selectedTacticsByLevel.get(5) ?? DEFAULT_LEVEL_FIVE_TACTIC_DECK)],
                '6': [...(this.selectedTacticsByLevel.get(6) ?? DEFAULT_LEVEL_SIX_TACTIC_DECK)],
            },
            levelFiveTutorialSeen: this.levelFiveTutorialSeen,
            bestResultsByLevel,
        };
        try {
            sys.localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY_V2, JSON.stringify(saveData));
            // Preserve the original key for rollback compatibility with the shipped build.
            sys.localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, `${Math.min(3, this.highestUnlockedLevel)}`);
        } catch (error) {
            const errorKind = error instanceof Error ? error.name : typeof error;
            console.warn('[WolfSheepBattle][Save] 本地进度保存失败，本局仍可继续。', errorKind);
        }
    }

    private normalizeTacticDeck(
        raw: readonly string[] | undefined,
        fallback: readonly TacticIcon[] = DEFAULT_LEVEL_FOUR_TACTIC_DECK,
    ): TacticIcon[] {
        if (!Array.isArray(raw)) return [...fallback];
        const unique = raw.filter((kind, index): kind is TacticIcon =>
            ALL_TACTICS.indexOf(kind as TacticIcon) >= 0 && raw.indexOf(kind) === index);
        return unique.length === 3 ? [...unique] : [...fallback];
    }

    private getDefaultTacticDeckForLevel(levelId: number): readonly TacticIcon[] {
        if (levelId === 6) return DEFAULT_LEVEL_SIX_TACTIC_DECK;
        return levelId === 5 ? DEFAULT_LEVEL_FIVE_TACTIC_DECK : DEFAULT_LEVEL_FOUR_TACTIC_DECK;
    }

    private getAvailableTacticsForLevel(levelId: number): readonly TacticIcon[] {
        if (levelId === 6) return ALL_TACTICS;
        if (levelId === 5) return ALL_TACTICS.filter((kind) => kind !== 'supplyBoost');
        return ALL_TACTICS.filter((kind) => kind !== 'surge' && kind !== 'supplyBoost');
    }

    private isLevelImplemented(config: LevelConfig | undefined): config is LevelConfig {
        return !!config && (config.implemented === true || config.enabled === true);
    }

    private hasClearedMandatoryLevelOne(): boolean {
        return this.completedLevels.has(1);
    }

    private canChallengeLevel(levelId: number): boolean {
        const config = this.getLevelConfig(levelId);
        return this.isLevelImplemented(config)
            && (config.id === 1 || this.hasClearedMandatoryLevelOne());
    }

    private enforceMandatoryLevelOneGateSelection(persistRepair = true): boolean {
        if (this.canChallengeLevel(this.currentLevel)) return false;
        const fallback = this.getFirstImplementedLevelConfig();
        this.currentLevel = fallback.id;
        this.pendingLevelSelection = fallback.id;
        this.selectedTactics = [...(this.selectedTacticsByLevel.get(fallback.id)
            ?? this.getDefaultTacticDeckForLevel(fallback.id))];
        if (persistRepair) this.saveLevelProgress();
        return true;
    }

    private getLevelConfig(levelId: number): LevelConfig | undefined {
        return LEVEL_CONFIGS.find((config) => config.id === levelId);
    }

    private getFirstImplementedLevelConfig(): LevelConfig {
        return LEVEL_CONFIGS.find((config) => this.isLevelImplemented(config)) ?? LEVEL_CONFIGS[0];
    }

    private getNextImplementedLevelConfig(levelId: number): LevelConfig | undefined {
        const adjacent = this.getLevelConfig(levelId + 1);
        return this.isLevelImplemented(adjacent) ? adjacent : undefined;
    }

    private getCurrentLevelConfig(): LevelConfig {
        const selected = this.getLevelConfig(this.currentLevel);
        return this.isLevelImplemented(selected) ? selected : this.getFirstImplementedLevelConfig();
    }

    private refreshStartPanel(): void {
        if (!this.startSelectedLevelLabel || !this.startPanel) {
            return;
        }
        this.enforceMandatoryLevelOneGateSelection();
        const level = this.getCurrentLevelConfig();
        this.startSelectedLevelLabel.string = `\u7B2C${level.id}\u5173 \u00B7 ${level.title}`;
        if (this.startBattleButton?.label) {
            this.startBattleButton.label.string = this.hasClearedMandatoryLevelOne()
                ? '\u5F00\u59CB\u6311\u6218' : '开始教学关卡';
        }
        if (this.startLevelSelectButton?.label && this.startLevelSelectSubtitleLabel) {
            this.startLevelSelectButton.label.string = this.hasClearedMandatoryLevelOne()
                ? '\u9009\u62E9\uFF0F\u5207\u6362\u5173\u5361' : '查看关卡解锁状态';
            this.startLevelSelectSubtitleLabel.string = this.hasClearedMandatoryLevelOne()
                ? '\u67E5\u770B\u5168\u90E8\u5173\u5361' : '请先通关第1关教学';
        }
        if (!this.startLevelSelectPulsePlayed
            && this.startPanel.active
            && (!this.artLoadingPanel || !this.artLoadingPanel.active)) {
            this.playStartLevelSelectAttention();
        }
    }

    private requestStartLevelSelect(): void {
        if (this.startMenuActionLocked || !this.startPanel.active) return;
        this.startMenuActionLocked = true;
        this.enforceMandatoryLevelOneGateSelection();
        this.showLevelSelect();
    }

    private requestStartBattle(): void {
        if (this.startMenuActionLocked || !this.startPanel.active) return;
        this.startMenuActionLocked = true;
        this.enforceMandatoryLevelOneGateSelection();
        this.beginBattle();
    }

    private playStartLevelSelectAttention(): void {
        if (this.startLevelSelectPulsePlayed
            || !this.startLevelSelectButton?.node?.isValid
            || !this.startPanel?.active) {
            return;
        }
        this.startLevelSelectPulsePlayed = true;
        const node = this.startLevelSelectButton.node;
        Tween.stopAllByTarget(node);
        node.setScale(1, 1, 1);
        const attentionTween = tween(node);
        for (let index = 0; index < START_LEVEL_SELECT_PULSE_COUNT; index += 1) {
            attentionTween
                .to(
                    START_LEVEL_SELECT_PULSE_HALF_SECONDS,
                    { scale: new Vec3(START_LEVEL_SELECT_PULSE_SCALE, START_LEVEL_SELECT_PULSE_SCALE, 1) },
                    { easing: 'sineInOut' },
                )
                .to(
                    START_LEVEL_SELECT_PULSE_HALF_SECONDS,
                    { scale: new Vec3(1, 1, 1) },
                    { easing: 'sineInOut' },
                );
        }
        attentionTween.call(() => node.isValid && node.setScale(1, 1, 1)).start();
    }

    private getLevelSelectTotalPages(): number {
        return Math.max(1, Math.ceil(LEVEL_CONFIGS.length / LEVEL_SELECT_ITEMS_PER_PAGE));
    }

    private locateLevelSelectPage(levelId: number): number {
        const index = Math.max(0, LEVEL_CONFIGS.findIndex((config) => config.id === levelId));
        return Math.min(this.getLevelSelectTotalPages() - 1,
            Math.floor(index / LEVEL_SELECT_ITEMS_PER_PAGE));
    }

    private changeLevelSelectPage(direction: -1 | 1): void {
        const totalPages = this.getLevelSelectTotalPages();
        const targetPage = Math.max(0, Math.min(totalPages - 1, this.levelSelectPage + direction));
        if (targetPage === this.levelSelectPage) return;
        this.levelSelectPage = targetPage;
        this.audioManager.playSfx('ui_click');
        this.refreshLevelSelectPanel();
        this.refreshLevelSelectPageCards(direction);
    }

    private refreshLevelSelectPageCards(direction: -1 | 0 | 1 = 0): void {
        const firstIndex = this.levelSelectPage * LEVEL_SELECT_ITEMS_PER_PAGE;
        for (let index = 0; index < LEVEL_CONFIGS.length; index += 1) {
            const card = this.levelCards.get(LEVEL_CONFIGS[index].id);
            if (!card) continue;
            const visible = index >= firstIndex && index < firstIndex + LEVEL_SELECT_ITEMS_PER_PAGE;
            card.root.active = visible;
            if (visible) {
                const pageIndex = index - firstIndex;
                card.root.setPosition(0, LEVEL_SELECT_CARD_Y[pageIndex], 0);
            }
        }
        if (!this.levelSelectList?.isValid || !this.levelSelectListOpacity) return;
        Tween.stopAllByTarget(this.levelSelectList);
        Tween.stopAllByTarget(this.levelSelectListOpacity);
        if (direction === 0) {
            this.levelSelectList.setPosition(0, 0, 0);
            this.levelSelectListOpacity.opacity = 255;
            return;
        }
        this.levelSelectList.setPosition(direction * 30, 0, 0);
        this.levelSelectListOpacity.opacity = 188;
        tween(this.levelSelectList)
            .to(0.2, { position: new Vec3(0, 0, 0) }, { easing: 'quadOut' })
            .start();
        tween(this.levelSelectListOpacity)
            .to(0.2, { opacity: 255 }, { easing: 'quadOut' })
            .start();
    }

    private refreshLevelSelectPagination(): void {
        if (!this.levelSelectPageLabel || !this.levelSelectPreviousPageButton || !this.levelSelectNextPageButton) {
            return;
        }
        const totalPages = this.getLevelSelectTotalPages();
        this.levelSelectPage = Math.max(0, Math.min(totalPages - 1, this.levelSelectPage));
        this.levelSelectPageLabel.string = `第${this.levelSelectPage + 1}/${totalPages}页`;
        const previousEnabled = this.levelSelectPage > 0;
        const nextEnabled = this.levelSelectPage < totalPages - 1;
        this.levelSelectPreviousPageButton.label.color = previousEnabled
            ? new Color(49, 73, 61, 255) : new Color(145, 139, 123, 210);
        this.levelSelectNextPageButton.label.color = nextEnabled
            ? new Color(49, 73, 61, 255) : new Color(145, 139, 123, 210);
        this.drawButton(this.levelSelectPreviousPageButton,
            previousEnabled ? new Color(222, 242, 202, 255) : new Color(232, 229, 215, 220),
            previousEnabled ? new Color(109, 169, 92, 255) : new Color(173, 169, 154, 190));
        this.drawButton(this.levelSelectNextPageButton,
            nextEnabled ? new Color(222, 242, 202, 255) : new Color(232, 229, 215, 220),
            nextEnabled ? new Color(109, 169, 92, 255) : new Color(173, 169, 154, 190));
    }

    private refreshLevelSelectPanel(message?: string): void {
        if (!this.levelSelectHintLabel || !this.levelSelectProgressLabel) {
            return;
        }
        const selectedConfig = this.getPendingLevelSelectionConfig();
        for (const config of LEVEL_CONFIGS) {
            const card = this.levelCards.get(config.id);
            if (!card) {
                continue;
            }
            const implemented = this.isLevelImplemented(config);
            const challengeable = implemented && this.canChallengeLevel(config.id);
            const selected = challengeable && config.id === selectedConfig.id;
            const completed = this.completedLevels.has(config.id);
            const visualState: LevelCardVisualState = !implemented ? 'in-development'
                : !challengeable ? 'locked'
                    : selected ? 'selected'
                        : completed ? 'completed' : 'available';
            card.visualState = visualState;
            card.completed = completed;
            card.root.setScale(1, 1, 1);
            card.titleLabel.color = visualState === 'in-development' || visualState === 'locked'
                ? new Color(91, 82, 91, 255) : new Color(74, 56, 39, 255);
            card.descriptionLabel.color = visualState === 'in-development' || visualState === 'locked'
                ? new Color(112, 103, 112, 255) : new Color(118, 91, 60, 255);
            card.stateLabel.string = visualState === 'selected' ? '\u5F53\u524D\u9009\u62E9'
                : visualState === 'available' ? '可挑战'
                    : visualState === 'completed' ? '\u5DF2\u901A\u5173'
                        : visualState === 'locked' ? '通关第1关后解锁' : '\u5236\u4F5C\u4E2D';
            card.stateLabel.color = visualState === 'selected' ? new Color(126, 84, 25, 255)
                : visualState === 'available' ? new Color(43, 111, 122, 255)
                    : visualState === 'completed' ? new Color(38, 113, 70, 255)
                        : new Color(91, 82, 91, 255);
            card.completionBadgeNode.active = selected && completed;
            this.drawLevelCardFallback(card, visualState);
            this.drawLevelNumberBadgeFallback(card, visualState);
            this.drawLevelStateIconFallback(card, visualState);
            this.drawLevelCompletionBadgeFallback(card);
            this.applyLevelCardStateArt(card);
        }
        const implementedLevels = LEVEL_CONFIGS.filter((config) => this.isLevelImplemented(config));
        const completedCount = implementedLevels.filter((config) => this.completedLevels.has(config.id)).length;
        this.levelSelectProgressLabel.string =
            `\u5DF2\u901A\u5173  ${completedCount}/${implementedLevels.length}`;
        this.levelSelectHintLabel.string = message
            ?? (this.hasClearedMandatoryLevelOne()
                ? `当前选择：第${selectedConfig.id}关·${selectedConfig.title}`
                : '请先通关第1关教学');
        this.levelSelectHintLabel.color = message
            ? new Color(173, 77, 52, 255) : new Color(118, 91, 60, 255);
        this.levelSelectConfirmButton.label.string = this.levelSelectStartLocked
            ? `\u6B63\u5728\u8FDB\u5165\u7B2C${selectedConfig.id}\u5173…`
            : !this.hasClearedMandatoryLevelOne() && selectedConfig.id === 1
                ? '开始教学关卡' : `\u5F00\u59CB\u6311\u6218\u7B2C${selectedConfig.id}\u5173`;
        this.refreshLevelSelectPageCards();
        this.refreshLevelSelectPagination();
        this.refreshLevelProgressSteps();
    }

    private showLevelSelect(): void {
        this.audioManager.requestMenuBgm();
        this.startPanel.active = false;
        this.prepareLevelSelection();
        this.showModal(this.levelSelectPanel);
        this.refreshLevelSelectPanel();
    }

    private returnToStartPanel(): void {
        this.audioManager.requestMenuBgm();
        this.levelSelectPanel.active = false;
        this.levelSelectStartLocked = false;
        this.startMenuActionLocked = false;
        this.showModal(this.startPanel);
        this.refreshStartPanel();
    }

    private selectLevel(levelId: number): void {
        const config = this.getLevelConfig(levelId);
        if (!this.isLevelImplemented(config)) {
            this.refreshLevelSelectPanel('\u8BE5\u5173\u5361\u5C1A\u5728\u5236\u4F5C\u4E2D');
            return;
        }
        if (!this.canChallengeLevel(config.id)) {
            this.refreshLevelSelectPanel('请先通关第1关教学');
            return;
        }
        this.pendingLevelSelection = config.id;
        this.currentLevel = config.id;
        this.saveLevelProgress();
        this.levelSelectStartLocked = false;
        this.refreshLevelSelectPanel();
    }

    private prepareLevelSelection(): void {
        this.enforceMandatoryLevelOneGateSelection();
        const current = this.getLevelConfig(this.currentLevel);
        this.pendingLevelSelection = this.isLevelImplemented(current) && this.canChallengeLevel(current.id)
            ? current.id : this.getFirstImplementedLevelConfig().id;
        this.levelSelectPage = this.locateLevelSelectPage(this.pendingLevelSelection);
        this.levelSelectStartLocked = false;
    }

    private getPendingLevelSelectionConfig(): LevelConfig {
        const pending = this.getLevelConfig(this.pendingLevelSelection ?? this.currentLevel);
        return this.isLevelImplemented(pending) && this.canChallengeLevel(pending.id)
            ? pending : this.getFirstImplementedLevelConfig();
    }

    private confirmSelectedLevel(): void {
        if (this.levelSelectStartLocked) {
            return;
        }
        const config = this.getPendingLevelSelectionConfig();
        if (!this.canChallengeLevel(config.id)) {
            this.enforceMandatoryLevelOneGateSelection();
            this.refreshLevelSelectPanel('请先通关第1关教学');
            return;
        }
        this.levelSelectStartLocked = true;
        this.currentLevel = config.id;
        this.refreshLevelSelectPanel();
        this.levelSelectPanel.active = false;
        this.restartGame();
        this.isStarted = false;
        this.beginBattle();
    }

    private showResetProgressConfirmation(): void {
        if (!LEVEL_SELECT_DEBUG_RESET_ENABLED || !this.levelSelectDebugConfirmPanel) {
            return;
        }
        this.levelSelectDebugConfirmPanel.active = true;
        this.levelSelectDebugConfirmPanel.setSiblingIndex(this.levelSelectContent.children.length - 1);
    }

    private createResetProgressConfirmation(): void {
        const panel = this.createGraphicsNode(
            'DebugResetConfirmPanel',
            460,
            180,
            0,
            -10,
            this.levelSelectContent,
        );
        panel.addComponent(BlockInputEvents);
        const graphics = panel.getComponent(Graphics)!;
        graphics.fillColor = new Color(255, 247, 220, 255);
        graphics.roundRect(-230, -90, 460, 180, 22);
        graphics.fill();
        graphics.lineWidth = 4;
        graphics.strokeColor = new Color(233, 130, 90, 255);
        graphics.roundRect(-230, -90, 460, 180, 22);
        graphics.stroke();
        this.createLabel(
            panel,
            'ConfirmTitle',
            '\u786E\u8BA4\u91CD\u7F6E\u672C\u5730\u8FDB\u5EA6\uFF1F',
            0,
            48,
            400,
            34,
            22,
            new Color(74, 56, 39, 255),
        );
        this.createLabel(
            panel,
            'ConfirmDescription',
            '\u4EC5\u6E05\u9664\u901A\u5173\u6807\u8BB0\uFF0C\u6240\u6709\u5DF2\u5B9E\u73B0\u5173\u5361\u4ECD\u53EF\u81EA\u7531\u6311\u6218\u3002',
            0,
            12,
            410,
            28,
            14,
            new Color(118, 91, 60, 255),
        );
        this.createButton(
            panel,
            'CancelResetButton',
            '\u53D6\u6D88',
            -105,
            -48,
            160,
            42,
            16,
            () => { panel.active = false; },
        );
        this.createButton(
            panel,
            'ConfirmResetButton',
            '\u786E\u8BA4\u91CD\u7F6E',
            105,
            -48,
            160,
            42,
            16,
            () => {
                panel.active = false;
                this.resetLocalProgress();
            },
        );
        panel.active = false;
        this.levelSelectDebugConfirmPanel = panel;
    }

    private resetLocalProgress(): void {
        this.cleanupLevelOneTutorial(false);
        this.completedLevels.clear();
        this.highestUnlockedLevel = 1;
        this.currentLevel = this.getFirstImplementedLevelConfig().id;
        this.pendingLevelSelection = this.currentLevel;
        this.levelOneTutorialCompleted = false;
        this.levelOneTutorialVersion = 0;
        this.saveLevelProgress();
        this.refreshStartPanel();
        this.refreshLevelSelectPanel('本地通关记录已重置，请重新完成第1关教学。');
    }

    private createTutorialPanel(): void {
        this.tutorialPanel = new Node('TutorialPanel');
        this.tutorialPanel.setParent(this.modalLayer);
        this.tutorialPanel.addComponent(UITransform).setContentSize(
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
        );
        this.tutorialPanel.addComponent(BlockInputEvents);

        this.tutorialDimLayer = this.createGraphicsNode(
            'LevelOneTutorialDim',
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
            0,
            0,
            this.tutorialPanel,
        );
        this.tutorialDimGraphics = this.tutorialDimLayer.getComponent(Graphics)!;
        this.tutorialDimLayer.setSiblingIndex(0);

        this.tutorialHighlightLayer = this.createGraphicsNode(
            'LevelOneTutorialHighlight',
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
            0,
            0,
            this.tutorialPanel,
        );
        this.tutorialHighlightGraphics = this.tutorialHighlightLayer.getComponent(Graphics)!;
        this.tutorialHighlightOpacity = this.tutorialHighlightLayer.addComponent(UIOpacity);

        this.tutorialArrow = this.createGraphicsNode(
            'LevelOneTutorialArrow',
            this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight,
            0,
            0,
            this.tutorialPanel,
        );
        this.tutorialArrowGraphics = this.tutorialArrow.getComponent(Graphics)!;
        this.tutorialArrowOpacity = this.tutorialArrow.addComponent(UIOpacity);

        this.tutorialCard = this.createGraphicsNode(
            'LevelOneTutorialCard',
            LEVEL_ONE_TUTORIAL_CARD_WIDTH,
            LEVEL_ONE_TUTORIAL_CARD_HEIGHT,
            0,
            0,
            this.tutorialPanel,
        );
        this.tutorialCardGraphics = this.tutorialCard.getComponent(Graphics)!;
        this.drawLevelOneTutorialCard();
        this.tutorialStepLabel = this.createLabel(
            this.tutorialCard,
            'TutorialStepLabel',
            '',
            0,
            112,
            LEVEL_ONE_TUTORIAL_CARD_WIDTH - 64,
            24,
            14,
            new Color(88, 115, 62, 255),
        );
        this.configureSingleLineLabel(this.tutorialStepLabel, new Color(88, 115, 62, 255));
        this.tutorialTitleLabel = this.createLabel(
            this.tutorialCard,
            'TutorialTitle',
            '',
            0,
            80,
            LEVEL_ONE_TUTORIAL_CARD_WIDTH - 64,
            38,
            26,
            new Color(72, 58, 35, 255),
        );
        this.tutorialTitleLabel.isBold = true;
        this.configureSingleLineLabel(this.tutorialTitleLabel, new Color(72, 58, 35, 255));
        this.tutorialBodyLabel = this.createLabel(
            this.tutorialCard,
            'TutorialBody',
            '',
            0,
            10,
            LEVEL_ONE_TUTORIAL_CARD_WIDTH - 72,
            126,
            17,
            new Color(80, 73, 56, 255),
        );
        this.tutorialBodyLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        this.tutorialBodyLabel.verticalAlign = VerticalTextAlignment.CENTER;
        this.tutorialBodyLabel.overflow = Label.Overflow.CLAMP;
        this.tutorialBodyLabel.enableWrapText = true;
        this.tutorialBodyLabel.lineHeight = 22;
        const tutorialTaskNames = ['小羊 → 第1线', '中羊 → 第2线', '大羊 → 第3线', '巨羊 → 第4线'];
        for (let index = 0; index < tutorialTaskNames.length; index += 1) {
            const taskLabel = this.createLabel(
                this.tutorialCard,
                `TutorialDeployTask${index + 1}`,
                `○ ${tutorialTaskNames[index]}`,
                0,
                20 - index * 19,
                LEVEL_ONE_TUTORIAL_CARD_WIDTH - 96,
                19,
                15,
                new Color(94, 82, 59, 255),
            );
            taskLabel.lineHeight = 18;
            taskLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
            taskLabel.verticalAlign = VerticalTextAlignment.CENTER;
            taskLabel.overflow = Label.Overflow.SHRINK;
            taskLabel.enableWrapText = false;
            taskLabel.node.active = false;
            this.tutorialTaskLabels.push(taskLabel);
        }

        this.tutorialPreviousButton = this.createButton(
            this.tutorialCard,
            'TutorialPreviousButton',
            '上一步',
            -112,
            -108,
            210,
            48,
            17,
            () => this.handleLevelOneTutorialPreviousAction(),
        );
        this.tutorialNextButton = this.createButton(
            this.tutorialCard,
            'TutorialNextButton',
            '下一步',
            112,
            -108,
            210,
            48,
            17,
            () => this.handleLevelOneTutorialNextAction(),
        );
        const bindNavigationPressState = (button: ButtonView, next: boolean): void => {
            // Remove createButton's unconditional click listener so disabled tutorial
            // navigation has neither an action nor a hidden audible hit area.
            button.node.off(NodeEventType.TOUCH_END);
            button.node.on(NodeEventType.TOUCH_START, () => {
                const enabled = next ? this.isLevelOneTutorialNextEnabled() : this.tutorialVisiblePage > 0;
                if (!enabled) return;
                this.drawButton(
                    button,
                    next ? new Color(48, 132, 61, 255) : new Color(181, 110, 35, 255),
                    next ? new Color(255, 230, 122, 255) : new Color(255, 219, 145, 255),
                );
                button.label.color = Color.WHITE;
            }, this);
            button.node.on(NodeEventType.TOUCH_END, () => {
                const enabled = next ? this.isLevelOneTutorialNextEnabled() : this.tutorialVisiblePage > 0;
                if (enabled) {
                    if (next) this.handleLevelOneTutorialNextAction();
                    else this.handleLevelOneTutorialPreviousAction();
                    this.audioManager.playSfx('ui_click');
                }
                if (this.tutorialFlowActive) this.drawLevelOneTutorialNavigationButtons();
            }, this);
            button.node.on(NodeEventType.TOUCH_CANCEL, () => {
                if (this.tutorialFlowActive) this.drawLevelOneTutorialNavigationButtons();
            }, this);
        };
        bindNavigationPressState(this.tutorialPreviousButton, false);
        bindNavigationPressState(this.tutorialNextButton, true);
        this.tutorialPanel.on(NodeEventType.TOUCH_START, this.handleLevelOneTutorialTouchStart, this);
        this.tutorialPanel.on(NodeEventType.TOUCH_MOVE, this.handleLevelOneTutorialTouchMove, this);
        this.tutorialPanel.on(NodeEventType.TOUCH_CANCEL, this.handleLevelOneTutorialTouchCancel, this);
        this.tutorialPanel.on(NodeEventType.TOUCH_END, this.handleLevelOneTutorialTouchEnd, this);
        this.tutorialPanel.active = false;
    }

    private drawLevelOneTutorialCard(): void {
        const graphics = this.tutorialCardGraphics;
        const transform = this.tutorialCard.getComponent(UITransform);
        const width = transform?.width ?? LEVEL_ONE_TUTORIAL_CARD_WIDTH;
        const height = transform?.height ?? LEVEL_ONE_TUTORIAL_CARD_HEIGHT;
        const outerRadius = Math.min(28, height / 2);
        const innerRadius = Math.min(25.5, Math.max(4, height / 2 - 2.5));
        const insetRadius = Math.min(20, Math.max(3, height / 2 - 11));
        const leafY = height / 2 - Math.min(34, Math.max(12, height * 0.35));
        const leafWidth = Math.min(13, Math.max(6, height * 0.3));
        const leafHeight = Math.min(7, Math.max(3, height * 0.16));
        graphics.clear();
        graphics.fillColor = new Color(74, 52, 31, 72);
        graphics.roundRect(-width / 2 + 8, -height / 2 - 8, width - 16, height, outerRadius);
        graphics.fill();
        graphics.fillColor = new Color(253, 244, 213, 255);
        graphics.roundRect(-width / 2, -height / 2, width, height, outerRadius);
        graphics.fill();
        graphics.lineWidth = 5;
        graphics.strokeColor = new Color(154, 106, 54, 255);
        graphics.roundRect(-width / 2 + 2.5, -height / 2 + 2.5, width - 5, height - 5, innerRadius);
        graphics.stroke();
        graphics.lineWidth = 1.5;
        graphics.strokeColor = new Color(238, 206, 121, 255);
        graphics.roundRect(-width / 2 + 11, -height / 2 + 11, width - 22, height - 22, insetRadius);
        graphics.stroke();
        for (const side of [-1, 1]) {
            const leafX = side * (width / 2 - 31);
            graphics.fillColor = new Color(107, 168, 77, 210);
            graphics.ellipse(leafX, leafY, leafWidth, leafHeight);
            graphics.fill();
            graphics.fillColor = new Color(241, 190, 66, 255);
            graphics.circle(leafX - side * Math.min(10, leafWidth), leafY + leafHeight + 3, 4);
            graphics.fill();
        }
    }

    private applyLevelOneTutorialCardLayout(): boolean {
        const cardTransform = this.tutorialCard.getComponent(UITransform)!;
        const titleTransform = this.tutorialTitleLabel.node.getComponent(UITransform)!;
        const stepTransform = this.tutorialStepLabel.node.getComponent(UITransform)!;
        const bodyTransform = this.tutorialBodyLabel.node.getComponent(UITransform)!;
        const previousTransform = this.tutorialPreviousButton.node.getComponent(UITransform)!;
        const nextTransform = this.tutorialNextButton.node.getComponent(UITransform)!;

        cardTransform.setContentSize(LEVEL_ONE_TUTORIAL_CARD_WIDTH, LEVEL_ONE_TUTORIAL_CARD_HEIGHT);
        const formalSprite = this.tutorialCard.getChildByName('FormalTutorialPanelSprite');
        if (formalSprite?.isValid) {
            formalSprite.active = true;
            formalSprite.getComponent(UITransform)?.setContentSize(
                LEVEL_ONE_TUTORIAL_CARD_WIDTH,
                LEVEL_ONE_TUTORIAL_CARD_HEIGHT,
            );
        }
        this.tutorialCardGraphics.enabled = !formalSprite?.isValid;
        this.drawLevelOneTutorialCard();
        this.tutorialStepLabel.node.active = true;
        this.tutorialBodyLabel.node.active = true;
        this.tutorialTitleLabel.node.active = true;
        this.tutorialStepLabel.node.setPosition(0, 112, 0);
        stepTransform.setContentSize(LEVEL_ONE_TUTORIAL_CARD_WIDTH - 64, 24);
        this.tutorialStepLabel.fontSize = 14;
        this.tutorialStepLabel.lineHeight = 18;
        this.tutorialTitleLabel.node.setPosition(0, 80, 0);
        titleTransform.setContentSize(LEVEL_ONE_TUTORIAL_CARD_WIDTH - 64, 38);
        this.tutorialTitleLabel.fontSize = 26;
        this.tutorialTitleLabel.lineHeight = 32;
        this.tutorialTitleLabel.isBold = true;
        this.tutorialTitleLabel.horizontalAlign = HorizontalTextAlignment.CENTER;
        this.tutorialTitleLabel.verticalAlign = VerticalTextAlignment.CENTER;
        this.tutorialTitleLabel.overflow = Label.Overflow.SHRINK;
        this.tutorialTitleLabel.enableWrapText = false;
        this.tutorialBodyLabel.node.setPosition(0, 10, 0);
        bodyTransform.setContentSize(LEVEL_ONE_TUTORIAL_CARD_WIDTH - 72, 126);
        this.tutorialBodyLabel.fontSize = 17;
        this.tutorialBodyLabel.lineHeight = 22;
        this.tutorialBodyLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        this.tutorialBodyLabel.verticalAlign = VerticalTextAlignment.CENTER;
        this.tutorialBodyLabel.overflow = Label.Overflow.CLAMP;
        this.tutorialBodyLabel.enableWrapText = true;
        previousTransform.setContentSize(210, 48);
        nextTransform.setContentSize(210, 48);
        this.tutorialPreviousButton.node.setPosition(-112, -108, 0);
        this.tutorialNextButton.node.setPosition(112, -108, 0);
        this.tutorialPreviousButton.label.fontSize = 17;
        this.tutorialPreviousButton.label.lineHeight = 21;
        this.tutorialNextButton.label.fontSize = 17;
        this.tutorialNextButton.label.lineHeight = 21;
        return false;
    }

    private beginLevelOneTutorial(): void {
        if (this.currentLevel !== 1 || !this.tutorialPanel?.isValid) {
            return;
        }
        this.cleanupLevelOneTutorial(false);
        this.clearLevelOneTutorialRuntimeState();
        this.tutorialFlowActive = true;
        this.tutorialSimulationFrozen = true;
        this.tutorialProgress = 'welcome';
        this.tutorialVisiblePage = 0;
        this.tutorialHighestViewedPage = 0;
        this.tutorialIdleSeconds = 0;
        this.cancelFreezeLaneSelection(false);
        this.resetAllTacticCardPressStates(true);
        this.setBattleTweensPaused(true);
        this.tutorialPanel.active = true;
        this.ensureOverlayLayerOrder();
        this.modalLayer.setSiblingIndex(this.node.children.length - 1);
        this.tutorialPanel.setSiblingIndex(this.modalLayer.children.length - 1);
        this.applyLevelOneTutorialArt();
        this.refreshLevelOneTutorialPresentation();
    }

    private handleLevelOneTutorialPreviousAction(): void {
        if (!this.tutorialFlowActive || this.tutorialInteractionLocked) return;
        if (this.tutorialVisiblePage <= 0) return;
        this.tutorialInteractionLocked = true;
        try {
            // Page history is presentational only. It never rolls back battle state,
            // ownership, spent resources, granted effects, or AI-freeze state.
            this.tutorialVisiblePage -= 1;
            this.tutorialIdleSeconds = 0;
            this.refreshLevelOneTutorialPresentation();
        } finally {
            this.tutorialInteractionLocked = false;
        }
    }

    private handleLevelOneTutorialNextAction(): void {
        if (!this.tutorialFlowActive || this.tutorialInteractionLocked
            || !this.isLevelOneTutorialNextEnabled()) return;
        this.tutorialInteractionLocked = true;
        try {
            if (this.tutorialRecoveryMessage) {
                const recoveryMessage = this.tutorialRecoveryMessage;
                this.recoverLevelOneTutorialDeployment(recoveryMessage, true);
                return;
            }
            const page = LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage];
            if (page === 'ready') {
                this.completeTutorial();
                return;
            }
            const nextPage = this.tutorialVisiblePage + 1;
            if (nextPage <= this.tutorialHighestViewedPage) {
                this.tutorialVisiblePage = nextPage;
                this.refreshLevelOneTutorialPresentation();
                return;
            }
            if (page === 'welcome') {
                this.tutorialProgress = 'deploy-four-sheep';
                this.tutorialSimulationFrozen = true;
                this.selectedSheepType = undefined;
            } else if (page === 'deploy-four-sheep') {
                this.tutorialProgress = 'capture-supply';
                // Keep the normal update loop frozen; the tutorial whitelist below
                // advances only real player units, supply points, VFX and HUD.
                this.tutorialSimulationFrozen = true;
            } else if (page === 'capture-supply') {
                this.grantLevelOneTutorialSprintSubsidy();
                this.tutorialProgress = 'use-sprint';
                this.tutorialSimulationFrozen = true;
            } else if (page === 'use-sprint') {
                this.tutorialProgress = 'battle-goal';
            } else if (page === 'battle-goal') {
                this.tutorialProgress = 'ready';
            }
            this.tutorialVisiblePage = nextPage;
            this.tutorialHighestViewedPage = nextPage;
            this.tutorialIdleSeconds = 0;
            this.lastUnitButtonState = '';
            this.refreshUnitTypeButtons();
            this.refreshLaneSpawnMarkers();
            this.lastTacticHudState = '';
            this.refreshTacticCards(true);
            this.refreshLevelOneTutorialPresentation();
        } finally {
            this.tutorialInteractionLocked = false;
        }
    }

    private isLevelOneTutorialNextEnabled(): boolean {
        const page = LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage];
        if (!page) return false;
        if (this.tutorialRecoveryMessage) return true;
        if (this.tutorialVisiblePage < this.tutorialHighestViewedPage) return true;
        if (page === 'deploy-four-sheep') return this.tutorialProgress === 'deploy-four-sheep-complete';
        if (page === 'capture-supply') return this.tutorialProgress === 'capture-supply-complete';
        if (page === 'use-sprint') return this.tutorialProgress === 'use-sprint-complete';
        return true;
    }

    /**
     * The tutorial keeps the normal battle clock frozen. Only the real unit movement,
     * supply-point capture/resource accounting and their existing visual/HUD refreshes
     * are allowed while waiting for the selected point to change owner. AI decisions
     * and every AI tactic entry point remain outside this whitelist.
     */
    private updateLevelOneTutorialSimulation(deltaTime: number): void {
        this.updateLevelOneTutorialIdleCue(deltaTime);
        if (!this.tutorialFlowActive || this.tutorialProgress !== 'capture-supply') return;
        const lane = this.tutorialDeploymentLane;
        const unitId = this.tutorialDeployedUnitId;
        const point = lane === undefined ? undefined : this.supplyPoints[lane];
        const unit = unitId === undefined ? undefined : this.units.find((candidate) => candidate.id === unitId);
        if (lane === undefined || lane < 0 || lane >= LANE_X.length
            || !point?.node?.isValid || !unit || !this.isActiveBattleUnit(unit)
            || unit.team !== Team.Player || unit.lane !== lane) {
            this.recoverLevelOneTutorialDeployment('教学单位或目标补给点异常，已重置本次引导，请重新完成四羊出兵。');
            return;
        }

        this.updateUnits(deltaTime);
        if (!this.tutorialFlowActive || this.tutorialProgress !== 'capture-supply' || this.isFinished) return;
        this.updateLaneSpawnMarkers(deltaTime);
        this.updateUnitVisuals(deltaTime);
        this.updateBattleVfx(deltaTime);
        this.updatePilotVfx(deltaTime);
        this.updateBaseHitFeedback(deltaTime);
        this.updateSupplyPoints(deltaTime);
        this.hudRefreshCooldown -= deltaTime;
        if (this.hudRefreshCooldown <= 0) {
            this.hudRefreshCooldown = HUD_DYNAMIC_REFRESH_INTERVAL;
            this.refreshHud();
        }
    }

    private handleLevelOneTutorialSupplyCaptured(point: SupplyPoint): void {
        if (!this.tutorialFlowActive || this.tutorialProgress !== 'capture-supply'
            || point.owner !== Team.Player || point.lane !== this.tutorialDeploymentLane) return;
        this.tutorialSimulationFrozen = true;
        this.tutorialProgress = 'capture-supply-complete';
        this.refreshLevelOneTutorialPresentation();
        this.refreshHud(`第${point.lane + 1}线补给点已真实占领。请点击“下一步”继续。`);
    }

    private grantLevelOneTutorialSprintSubsidy(): void {
        if (this.tutorialSprintSubsidyGranted) return;
        this.tutorialSprintSubsidyGranted = true;
        const subsidy = Math.max(0, SPRINT_SUPPLY_COST - this.playerSupply);
        this.tutorialSprintSubsidyRemaining = subsidy;
        if (subsidy > 0) this.playerSupply += subsidy;
        this.lastTacticHudState = '';
        this.refreshTacticCards(true);
        this.refreshHud(subsidy > 0
            ? `教学临时补助 ${subsidy} 点补给，仅用于本次全体冲刺。`
            : '当前补给已足够使用全体冲刺。');
    }

    private recoverLevelOneTutorialDeployment(message: string, refreshPresentation = true): void {
        if (!this.tutorialFlowActive) return;
        if (!refreshPresentation) {
            this.tutorialRecoveryMessage = message;
            this.tutorialSimulationFrozen = true;
            this.refreshHud(message);
            return;
        }
        // A broken real unit/point cannot be faked or silently skipped. Restart only
        // this battle, keep persistent progression intact, and reopen the deploy page.
        this.restartGame();
        this.beginLevelOneTutorial();
        this.tutorialProgress = 'deploy-four-sheep';
        this.tutorialVisiblePage = 1;
        this.tutorialHighestViewedPage = 1;
        this.tutorialRecoveryMessage = '';
        this.selectedSheepType = undefined;
        this.refreshLevelOneTutorialPresentation();
        this.refreshHud(message);
    }

    private grantLevelOneTutorialEnergySubsidy(type: SheepType): number {
        if (this.tutorialEnergySubsidiesGranted.has(type)) return 0;
        this.tutorialEnergySubsidiesGranted.add(type);
        const missing = Math.max(0, UNIT_DEFINITIONS[type].cost - this.playerEnergy);
        this.tutorialEnergySubsidiesRemaining.set(type, missing);
        if (missing > 0) this.playerEnergy += missing;
        return missing;
    }

    private removeUnusedLevelOneTutorialEnergySubsidies(): void {
        let unusedTotal = 0;
        for (const remaining of this.tutorialEnergySubsidiesRemaining.values()) unusedTotal += remaining;
        if (unusedTotal > 0) this.playerEnergy = Math.max(0, this.playerEnergy - unusedTotal);
        this.tutorialEnergySubsidiesRemaining.clear();
        this.tutorialEnergySubsidiesGranted.clear();
    }

    private removeUnusedLevelOneTutorialSprintSubsidy(): void {
        if (this.tutorialSprintSubsidyRemaining > 0) {
            this.playerSupply = Math.max(0, this.playerSupply - this.tutorialSprintSubsidyRemaining);
        }
        this.tutorialSprintSubsidyRemaining = 0;
        this.tutorialSprintSubsidyGranted = false;
    }

    private clearLevelOneTutorialRuntimeState(): void {
        this.removeUnusedLevelOneTutorialEnergySubsidies();
        this.removeUnusedLevelOneTutorialSprintSubsidy();
        this.tutorialDeploymentLane = undefined;
        this.tutorialDeployedUnitId = undefined;
        this.tutorialDeploymentIndex = 0;
        this.tutorialCompletedDeploymentTypes.clear();
        this.tutorialCompletedDeploymentLanes.clear();
        this.tutorialDeploymentUnitIds.clear();
        this.tutorialVisiblePage = 0;
        this.tutorialHighestViewedPage = 0;
        this.tutorialRecoveryMessage = '';
        this.clearLevelOneTutorialPointer();
    }

    private completeTutorial(): void {
        if (!this.tutorialFlowActive) return;
        this.endLevelOneTutorial(true, '新手引导完成，已开始正式战斗。');
    }

    private endLevelOneTutorial(markCompleted: boolean, status?: string): void {
        const wasActive = this.tutorialFlowActive;
        this.tutorialFlowActive = false;
        this.tutorialSimulationFrozen = false;
        this.tutorialInteractionLocked = false;
        this.tutorialIdleSeconds = 0;
        this.clearLevelOneTutorialRuntimeState();
        this.tutorialTargetRects.length = 0;
        if (this.tutorialHighlightLayer?.isValid) {
            Tween.stopAllByTarget(this.tutorialHighlightOpacity);
            this.tutorialHighlightGraphics.clear();
        }
        if (this.tutorialArrow?.isValid) {
            Tween.stopAllByTarget(this.tutorialArrowOpacity);
            this.tutorialArrow.active = false;
        }
        if (this.tutorialDimLayer?.isValid) {
            this.tutorialDimGraphics.clear();
        }
        if (this.tutorialPanel?.isValid) {
            this.tutorialPanel.active = false;
        }
        this.setBattleTweensPaused(false);
        this.tutorialProgress = markCompleted ? 'completed' : 'inactive';
        if (markCompleted) {
            this.levelOneTutorialCompleted = true;
            this.levelOneTutorialVersion = LEVEL_ONE_TUTORIAL_VERSION;
            this.saveLevelProgress();
        }
        if (wasActive && this.isStarted && !this.isFinished && !this.isPaused) {
            this.lastUnitButtonState = '';
            this.refreshUnitTypeButtons();
            this.refreshLaneSpawnMarkers();
            this.updatePilotAIGate(0);
            if (status) this.refreshHud(status);
        }
    }

    private cleanupLevelOneTutorial(markCompleted: boolean): void {
        if (!this.tutorialFlowActive && !this.tutorialSimulationFrozen && !this.tutorialPanel?.active) {
            this.clearLevelOneTutorialRuntimeState();
            this.tutorialProgress = markCompleted ? 'completed' : 'inactive';
            return;
        }
        this.endLevelOneTutorial(markCompleted);
    }

    private refreshLevelOneTutorialPresentation(): void {
        if (!this.tutorialFlowActive || !this.tutorialPanel?.isValid) return;
        const targetNodes = this.getLevelOneTutorialTargetNodes();
        const expectedTargetCount = this.getLevelOneTutorialExpectedTargetCount();
        if (targetNodes.length !== expectedTargetCount) {
            console.warn('[WolfSheepBattle][Tutorial] 引导目标缺失，已冻结等待恢复。', {
                progress: this.tutorialProgress,
                page: this.tutorialVisiblePage,
                expectedTargetCount,
                actualTargetCount: targetNodes.length,
            });
            this.tutorialRecoveryMessage = '引导目标暂不可用，请重开本关后重新完成本步骤。';
            this.tutorialSimulationFrozen = true;
        }
        const targetRects: Rect[] = [];
        for (const targetNode of targetNodes) {
            const targetRect = this.getLevelOneTutorialTargetRect(targetNode);
            if (!targetRect) {
                console.warn('[WolfSheepBattle][Tutorial] 引导目标不可用，已冻结等待恢复。', {
                    progress: this.tutorialProgress,
                    target: targetNode?.name ?? 'unknown',
                });
                this.tutorialRecoveryMessage = '引导目标暂不可用，请重开本关后重新完成本步骤。';
                this.tutorialSimulationFrozen = true;
                continue;
            }
            targetRects.push(targetRect);
        }
        this.tutorialTargetRects.length = 0;
        this.tutorialTargetRects.push(...targetRects);
        this.resizeLevelOneTutorialLayers();
        this.applyLevelOneTutorialCardLayout();
        this.drawLevelOneTutorialDimmer(targetRects);
        this.drawLevelOneTutorialHighlights(targetRects);
        this.positionLevelOneTutorialCard(targetRects);
        this.drawLevelOneTutorialArrow(targetRects[0]);

        const copy = this.getLevelOneTutorialCopy();
        this.tutorialStepLabel.string = copy.stepLabel;
        this.tutorialTitleLabel.string = copy.title;
        this.tutorialBodyLabel.string = copy.body;
        const deploymentPageVisible = LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] === 'deploy-four-sheep';
        const taskNames = ['小羊 → 第1线', '中羊 → 第2线', '大羊 → 第3线', '巨羊 → 第4线'];
        for (let index = 0; index < this.tutorialTaskLabels.length; index += 1) {
            const taskLabel = this.tutorialTaskLabels[index];
            const completed = index < this.tutorialDeploymentIndex;
            taskLabel.node.active = deploymentPageVisible;
            taskLabel.string = `${completed ? '✓' : '○'} ${taskNames[index]}`;
            taskLabel.color = completed ? new Color(45, 145, 70, 255) : new Color(94, 82, 59, 255);
        }
        if (deploymentPageVisible) {
            this.tutorialBodyLabel.node.setPosition(0, 54, 0);
            this.tutorialBodyLabel.node.getComponent(UITransform)?.setContentSize(
                LEVEL_ONE_TUTORIAL_CARD_WIDTH - 72,
                38,
            );
            this.tutorialBodyLabel.verticalAlign = VerticalTextAlignment.CENTER;
        } else {
            this.tutorialBodyLabel.node.setPosition(0, 10, 0);
            this.tutorialBodyLabel.node.getComponent(UITransform)?.setContentSize(
                LEVEL_ONE_TUTORIAL_CARD_WIDTH - 72,
                126,
            );
        }
        this.tutorialPreviousButton.node.active = true;
        this.tutorialNextButton.node.active = true;
        this.tutorialPreviousButton.label.string = '上一步';
        this.tutorialNextButton.label.string = this.tutorialVisiblePage === LEVEL_ONE_TUTORIAL_PAGES.length - 1
            ? '完成教学' : this.tutorialRecoveryMessage ? '重新开始本步骤' : '下一步';
        this.drawLevelOneTutorialNavigationButtons();
        this.tutorialPanel.active = true;
        this.pulseLevelOneTutorialCue();
    }

    private drawLevelOneTutorialNavigationButtons(): void {
        const previousEnabled = this.tutorialVisiblePage > 0;
        const nextEnabled = this.isLevelOneTutorialNextEnabled();
        const drawNavigationButton = (button: ButtonView, enabled: boolean, next: boolean): void => {
            const art = button.node.getChildByName('ButtonArt');
            if (art?.isValid) art.active = false;
            button.graphics.enabled = true;
            const fill = enabled
                ? next ? new Color(74, 168, 83, 255) : new Color(218, 145, 52, 255)
                : new Color(137, 126, 102, 255);
            const border = enabled
                ? next ? new Color(249, 213, 92, 255) : new Color(255, 230, 169, 255)
                : new Color(206, 190, 153, 255);
            this.drawButton(button, fill, border);
            button.label.color = enabled ? Color.WHITE : new Color(244, 236, 214, 255);
        };
        drawNavigationButton(this.tutorialPreviousButton, previousEnabled, false);
        drawNavigationButton(this.tutorialNextButton, nextEnabled, true);
    }

    private getLevelOneTutorialCopy(): {
        readonly stepLabel: string;
        readonly title: string;
        readonly body: string;
    } {
        const page = LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage];
        const stepLabel = `第${this.tutorialVisiblePage + 1}步 / 共${LEVEL_ONE_TUTORIAL_PAGES.length}步`;
        switch (page) {
        case 'welcome':
            return {
                stepLabel,
                title: '新手引导',
                body: '欢迎来到羊狼四线战！\n接下来会依次完成四路出兵、占领补给点和使用战术牌。',
            };
        case 'deploy-four-sheep': {
            const expected = LEVEL_ONE_TUTORIAL_DEPLOYMENTS[this.tutorialDeploymentIndex];
            const hint = expected
                ? `请按固定顺序选择${this.getUnitDisplayName(expected.type, Team.Player)}并点击第${expected.lane + 1}线入口。`
                : '四种羊已分别真实派往四条道路，请点击“下一步”。';
            return {
                stepLabel,
                title: '四羊分路出兵',
                body: this.tutorialRecoveryMessage || hint,
            };
        }
        case 'capture-supply':
            return {
                stepLabel,
                title: '占领补给点',
                body: this.tutorialRecoveryMessage || (this.tutorialProgress === 'capture-supply-complete'
                    ? '第1线中央补给点已真实归玩家所有，补给会持续增加。\n请点击“下一步”学习使用战术牌。'
                    : '四只羊暂时保持冻结；进入本页后，第1线小羊会沿正常规则移动。\n必须等中央补给点真实变为玩家所有才能继续。'),
            };
        case 'use-sprint':
            return {
                stepLabel,
                title: '使用全体冲刺',
                body: this.tutorialRecoveryMessage || (this.tutorialProgress === 'use-sprint-complete'
                    ? '全体冲刺已真实扣除2点补给并成功生效。\n请点击“下一步”查看能量、暂停与胜负目标。'
                    : '补给数量显示在玩家补给栏。请点击右侧“全体冲刺”。\n只有真实扣除2点补给并让场上单位加速后才能继续。'),
            };
        case 'battle-goal':
            return {
                stepLabel,
                title: '能量与胜负目标',
                body: '出兵消耗能量，能量会自动恢复；单位到达敌方领地后会伤害基地。\n先摧毁敌方基地即可获胜；需要暂停或重开时可点击右上角“暂停”。',
            };
        case 'ready':
            return {
                stepLabel,
                title: '准备开始战斗',
                body: '你已经完成四路出兵、真实占点和全体冲刺操作。\n点击“完成教学”后，AI与完整战斗模拟会恢复；只有打赢第1关才会开放后续关卡。',
            };
        default:
            return {
                stepLabel: '',
                title: '',
                body: '',
            };
        }
    }

    private getLevelOneTutorialTargetNodes(): readonly Node[] {
        const page = LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage];
        if (page === 'deploy-four-sheep' && this.tutorialProgress === 'deploy-four-sheep') {
            const expected = LEVEL_ONE_TUTORIAL_DEPLOYMENTS[this.tutorialDeploymentIndex];
            const typeButton = expected ? this.typeButtons.get(expected.type)?.node : undefined;
            const laneMarker = expected ? this.laneSpawnMarkers[expected.lane]?.node : undefined;
            return [typeButton, laneMarker].filter((node): node is Node => !!node);
        }
        if (page === 'capture-supply') {
            const lane = this.tutorialDeploymentLane;
            const point = lane === undefined ? undefined : this.supplyPoints[lane];
            return [point?.node, this.playerSupplyBadge].filter((node): node is Node => !!node);
        }
        if (page === 'use-sprint') {
            return [this.playerSupplyBadge, this.playerSprintCard?.node]
                .filter((node): node is Node => !!node);
        }
        if (page === 'battle-goal') {
            return [this.pauseButton?.node, this.playerBaseHudNode, this.aiBaseHudNode]
                .filter((node): node is Node => !!node);
        }
        return [];
    }

    private getLevelOneTutorialExpectedTargetCount(): number {
        const page = LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage];
        if (page === 'deploy-four-sheep' && this.tutorialProgress === 'deploy-four-sheep') return 2;
        if (page === 'capture-supply') return 2;
        if (page === 'use-sprint') return 2;
        if (page === 'battle-goal') return 3;
        return 0;
    }

    private getLevelOneTutorialTargetRect(target: Node): Rect | undefined {
        if (!target?.isValid || !this.tutorialPanel?.isValid) return undefined;
        const targetTransform = target.getComponent(UITransform);
        const panelTransform = this.tutorialPanel.getComponent(UITransform);
        if (!targetTransform || !panelTransform) return undefined;
        const size = targetTransform.contentSize;
        if (size.width <= 0 || size.height <= 0) return undefined;
        const anchor = targetTransform.anchorPoint;
        const left = -anchor.x * size.width;
        const right = left + size.width;
        const bottom = -anchor.y * size.height;
        const top = bottom + size.height;
        const corners = [
            new Vec3(left, bottom, 0),
            new Vec3(left, top, 0),
            new Vec3(right, bottom, 0),
            new Vec3(right, top, 0),
        ].map((corner) => panelTransform.convertToNodeSpaceAR(targetTransform.convertToWorldSpaceAR(corner)));
        // Keep the proxy hit bounds identical to each formal target's UITransform.
        // The gold border itself supplies the visual breathing room without enlarging
        // the permitted touch range beyond a LaneHitArea or unit card.
        const minX = Math.min(...corners.map((corner) => corner.x));
        const maxX = Math.max(...corners.map((corner) => corner.x));
        const minY = Math.min(...corners.map((corner) => corner.y));
        const maxY = Math.max(...corners.map((corner) => corner.y));
        return new Rect(minX, minY, maxX - minX, maxY - minY);
    }

    private resizeLevelOneTutorialLayers(): void {
        const width = this.screenMetrics.visibleWidth;
        const height = this.screenMetrics.visibleHeight;
        for (const node of [this.tutorialDimLayer, this.tutorialHighlightLayer, this.tutorialArrow]) {
            node.getComponent(UITransform)?.setContentSize(width, height);
        }
    }

    private drawLevelOneTutorialDimmer(holes: readonly Rect[]): void {
        const graphics = this.tutorialDimGraphics;
        const left = -this.screenMetrics.visibleWidth / 2;
        const right = this.screenMetrics.visibleWidth / 2;
        const bottom = -this.screenMetrics.visibleHeight / 2;
        const top = this.screenMetrics.visibleHeight / 2;
        const xEdges = [left, right];
        const yEdges = [bottom, top];
        for (const hole of holes) {
            xEdges.push(Math.max(left, Math.min(right, hole.x)));
            xEdges.push(Math.max(left, Math.min(right, hole.x + hole.width)));
            yEdges.push(Math.max(bottom, Math.min(top, hole.y)));
            yEdges.push(Math.max(bottom, Math.min(top, hole.y + hole.height)));
        }
        const uniqueEdges = (edges: number[]): number[] => edges.sort((a, b) => a - b)
            .filter((edge, index) => index === 0 || Math.abs(edge - edges[index - 1]) > 0.01);
        const xGrid = uniqueEdges(xEdges);
        const yGrid = uniqueEdges(yEdges);
        graphics.clear();
        graphics.fillColor = new Color(16, 30, 29, LEVEL_ONE_TUTORIAL_DIM_ALPHA);
        for (let xIndex = 0; xIndex < xGrid.length - 1; xIndex += 1) {
            for (let yIndex = 0; yIndex < yGrid.length - 1; yIndex += 1) {
                const cellLeft = xGrid[xIndex];
                const cellBottom = yGrid[yIndex];
                const cellWidth = xGrid[xIndex + 1] - cellLeft;
                const cellHeight = yGrid[yIndex + 1] - cellBottom;
                if (cellWidth <= 0 || cellHeight <= 0) continue;
                const centerX = cellLeft + cellWidth / 2;
                const centerY = cellBottom + cellHeight / 2;
                if (holes.some((hole) => this.isLevelOneTutorialPointInside(hole, centerX, centerY))) continue;
                graphics.rect(cellLeft, cellBottom, cellWidth, cellHeight);
            }
        }
        graphics.fill();
    }

    private drawLevelOneTutorialHighlights(rects: readonly Rect[]): void {
        const graphics = this.tutorialHighlightGraphics;
        graphics.clear();
        for (const rect of rects) {
            const radius = Math.min(20, Math.min(rect.width, rect.height) / 4);
            graphics.fillColor = new Color(255, 221, 108, 42);
            graphics.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
            graphics.fill();
            graphics.lineWidth = 3.5;
            graphics.strokeColor = new Color(244, 200, 67, 255);
            graphics.roundRect(rect.x + 1.75, rect.y + 1.75, rect.width - 3.5, rect.height - 3.5,
                Math.max(2, radius - 1.75));
            graphics.stroke();
        }
    }

    private drawLevelOneTutorialArrow(target: Rect | undefined): void {
        const graphics = this.tutorialArrowGraphics;
        graphics.clear();
        this.tutorialArrow.active = !!target;
        if (!target) return;
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;
        const cardCenter = this.tutorialCard.position;
        const desiredLength = Math.max(0.001, Math.hypot(cardCenter.x - targetCenterX, cardCenter.y - targetCenterY));
        const desiredX = (cardCenter.x - targetCenterX) / desiredLength;
        const desiredY = (cardCenter.y - targetCenterY) / desiredLength;
        const safe = this.screenMetrics;
        const capsule = this.getLevelOneTutorialCapsuleRect();
        const cardRect = this.getLevelOneTutorialCardRect();
        const directions = [
            new Vec2(0, 1), new Vec2(0, -1), new Vec2(1, 0), new Vec2(-1, 0),
        ];
        let best: { outward: Vec2; tip: Vec2; tail: Vec2; score: number } | undefined;
        for (const outward of directions) {
            const boundaryDistance = Math.abs(outward.x) * target.width / 2
                + Math.abs(outward.y) * target.height / 2;
            const tip = new Vec2(
                targetCenterX + outward.x * (boundaryDistance + 5),
                targetCenterY + outward.y * (boundaryDistance + 5),
            );
            const tail = new Vec2(tip.x + outward.x * 38, tip.y + outward.y * 38);
            const arrowRect = new Rect(
                Math.min(tip.x, tail.x) - 14,
                Math.min(tip.y, tail.y) - 14,
                Math.abs(tip.x - tail.x) + 28,
                Math.abs(tip.y - tail.y) + 28,
            );
            const insideSafe = arrowRect.x >= safe.safeLeft && arrowRect.x + arrowRect.width <= safe.safeRight
                && arrowRect.y >= safe.safeBottom && arrowRect.y + arrowRect.height <= safe.safeTop;
            const reservedOverlap = this.getLevelOneTutorialRectOverlapArea(arrowRect, cardRect)
                + (capsule ? this.getLevelOneTutorialRectOverlapArea(arrowRect, capsule) : 0);
            const score = outward.x * desiredX + outward.y * desiredY
                - (insideSafe ? 0 : 100) - reservedOverlap * 100;
            if (!best || score > best.score) {
                best = { outward, tip, tail, score };
            }
        }
        if (!best) return;
        const perpendicular = new Vec2(-best.outward.y, best.outward.x);
        graphics.lineWidth = 5;
        graphics.strokeColor = new Color(247, 203, 67, 255);
        graphics.moveTo(best.tail.x, best.tail.y);
        graphics.lineTo(best.tip.x, best.tip.y);
        graphics.stroke();
        graphics.fillColor = new Color(247, 203, 67, 255);
        graphics.moveTo(best.tip.x, best.tip.y);
        graphics.lineTo(best.tip.x + best.outward.x * 16 + perpendicular.x * 10,
            best.tip.y + best.outward.y * 16 + perpendicular.y * 10);
        graphics.lineTo(best.tip.x + best.outward.x * 16 - perpendicular.x * 10,
            best.tip.y + best.outward.y * 16 - perpendicular.y * 10);
        graphics.close();
        graphics.fill();
    }

    private getLevelOneTutorialReservedRects(): readonly Rect[] {
        const nodes: (Node | undefined)[] = [
            ...Array.from(this.typeButtons.values()).map((button) => button.node),
            this.levelBadge,
            this.rightControlBar,
            this.pauseButton?.node,
            this.playerEnergyBar?.node,
            this.playerSupplyBadge,
            this.aiEnergyBar?.node,
            this.aiSupplyBadge,
            this.playerBaseHudNode,
            this.aiBaseHudNode,
        ];
        const rects: Rect[] = [];
        for (const node of nodes) {
            if (!node?.isValid) continue;
            const rect = this.getLevelOneTutorialTargetRect(node);
            if (rect) rects.push(rect);
        }
        const capsule = this.getLevelOneTutorialCapsuleRect();
        if (capsule) rects.push(capsule);
        return rects;
    }

    private getLevelOneTutorialCapsuleRect(): Rect | undefined {
        const capsule = this.screenMetrics.capsule;
        if (!capsule) return undefined;
        return new Rect(
            capsule.left - HUD_SAFE_MARGIN,
            capsule.bottom - HUD_SAFE_MARGIN,
            capsule.width + HUD_SAFE_MARGIN * 2,
            capsule.height + HUD_SAFE_MARGIN * 2,
        );
    }

    private getLevelOneTutorialCardRect(): Rect {
        const transform = this.tutorialCard.getComponent(UITransform);
        const width = transform?.width ?? LEVEL_ONE_TUTORIAL_CARD_WIDTH;
        const height = transform?.height ?? LEVEL_ONE_TUTORIAL_CARD_HEIGHT;
        return new Rect(
            this.tutorialCard.position.x - width / 2,
            this.tutorialCard.position.y - height / 2,
            width,
            height,
        );
    }

    private getLevelOneTutorialRectOverlapArea(left: Rect, right: Rect | undefined): number {
        if (!right) return 0;
        const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
        const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
        return width * height;
    }

    private positionLevelOneTutorialCard(_targetRects: readonly Rect[]): void {
        const transform = this.tutorialCard.getComponent(UITransform);
        const cardWidth = transform?.width ?? LEVEL_ONE_TUTORIAL_CARD_WIDTH;
        const cardHeight = transform?.height ?? LEVEL_ONE_TUTORIAL_CARD_HEIGHT;
        const cardHalfWidth = cardWidth / 2;
        const cardHalfHeight = cardHeight / 2;
        const fixedX = this.screenMetrics.safeCenterX;
        let fixedY = this.screenMetrics.safeTop - cardHalfHeight - 12;
        const capsule = this.getLevelOneTutorialCapsuleRect();
        const fixedRect = new Rect(fixedX - cardHalfWidth, fixedY - cardHalfHeight, cardWidth, cardHeight);
        if (capsule && this.getLevelOneTutorialRectOverlapArea(fixedRect, capsule) > 0.01) {
            fixedY = Math.min(fixedY, capsule.y - cardHalfHeight - LEVEL_ONE_TUTORIAL_CARD_CLEARANCE);
        }
        fixedY = Math.max(this.screenMetrics.safeBottom + cardHalfHeight + LEVEL_ONE_TUTORIAL_CARD_CLEARANCE, fixedY);
        this.tutorialCard.setPosition(fixedX, fixedY, 0);
    }

    private readonly handleLevelOneTutorialTouchStart = (event: EventTouch): void => {
        if (!this.tutorialFlowActive || this.tutorialInteractionLocked) return;
        const point = this.getLevelOneTutorialTouchPoint(event);
        if (!point) return;
        this.tutorialIdleSeconds = 0;
        this.tutorialPointerStartX = point.x;
        this.tutorialPointerStartY = point.y;
        this.tutorialPointerMoved = false;
        this.tutorialPointerTarget = this.getLevelOneTutorialPointerTarget(point.x, point.y);
    };

    private readonly handleLevelOneTutorialTouchMove = (event: EventTouch): void => {
        if (!this.tutorialFlowActive || this.tutorialPointerTarget === undefined) return;
        const point = this.getLevelOneTutorialTouchPoint(event);
        if (!point) return;
        const dx = point.x - this.tutorialPointerStartX;
        const dy = point.y - this.tutorialPointerStartY;
        if (dx * dx + dy * dy >= LANE_TOUCH_DRAG_THRESHOLD * LANE_TOUCH_DRAG_THRESHOLD) {
            this.tutorialPointerMoved = true;
        }
    };

    private readonly handleLevelOneTutorialTouchCancel = (): void => {
        this.clearLevelOneTutorialPointer();
    };

    private readonly handleLevelOneTutorialTouchEnd = (event: EventTouch): void => {
        if (!this.tutorialFlowActive || this.tutorialInteractionLocked) {
            this.clearLevelOneTutorialPointer();
            return;
        }
        const target = this.tutorialPointerTarget;
        const moved = this.tutorialPointerMoved;
        const point = this.getLevelOneTutorialTouchPoint(event);
        this.clearLevelOneTutorialPointer();
        if (target === undefined || moved || !point || !this.isLevelOneTutorialPointerTargetAt(target, point.x, point.y)) {
            return;
        }
        this.tutorialInteractionLocked = true;
        try {
            if (target === 'sprint' && this.tutorialProgress === 'use-sprint'
                && LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] === 'use-sprint') {
                this.tryUseSprint(Team.Player);
            } else if (typeof target === 'number' && this.tutorialProgress === 'deploy-four-sheep') {
                this.tryDeploySelectedUnit(target);
            } else if (this.tutorialProgress === 'deploy-four-sheep') {
                this.selectUnitType(target as SheepType);
            }
        } finally {
            this.tutorialInteractionLocked = false;
        }
    };

    private getLevelOneTutorialTouchPoint(event: EventTouch): Vec3 | undefined {
        const panelTransform = this.tutorialPanel?.getComponent(UITransform);
        if (!panelTransform) return undefined;
        const location = event.getUILocation();
        return panelTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
    }

    private getLevelOneTutorialPointerTarget(x: number, y: number): LevelOneTutorialPointerTarget | undefined {
        if (this.isLevelOneTutorialPointInside(this.getLevelOneTutorialCardRect(), x, y)) {
            return undefined;
        }
        if (this.tutorialProgress === 'deploy-four-sheep'
            && LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] === 'deploy-four-sheep') {
            const expected = LEVEL_ONE_TUTORIAL_DEPLOYMENTS[this.tutorialDeploymentIndex];
            if (!expected) return undefined;
            for (const [type, button] of this.typeButtons) {
                const rect = this.getLevelOneTutorialTargetRect(button.node);
                if (rect && this.isLevelOneTutorialPointInside(rect, x, y)) return type;
            }
            for (let lane = 0; lane < this.laneSpawnMarkers.length; lane += 1) {
                const rect = this.getLevelOneTutorialTargetRect(this.laneSpawnMarkers[lane].node);
                if (rect && this.isLevelOneTutorialPointInside(rect, x, y)) return lane;
            }
        }
        if (this.tutorialProgress === 'use-sprint'
            && LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] === 'use-sprint') {
            const sprintRect = this.tutorialTargetRects[1];
            return sprintRect && this.isLevelOneTutorialPointInside(sprintRect, x, y) ? 'sprint' : undefined;
        }
        return undefined;
    }

    private isLevelOneTutorialPointerTargetAt(target: LevelOneTutorialPointerTarget, x: number, y: number): boolean {
        if (target === 'sprint') {
            return this.tutorialTargetRects[1]
                ? this.isLevelOneTutorialPointInside(this.tutorialTargetRects[1], x, y) : false;
        }
        const targetNode = typeof target === 'number'
            ? this.laneSpawnMarkers[target]?.node : this.typeButtons.get(target)?.node;
        const rect = targetNode ? this.getLevelOneTutorialTargetRect(targetNode) : undefined;
        return !!rect && this.isLevelOneTutorialPointInside(rect, x, y);
    }

    private isLevelOneTutorialPointInside(rect: Rect, x: number, y: number): boolean {
        return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    }

    private clearLevelOneTutorialPointer(): void {
        this.tutorialPointerTarget = undefined;
        this.tutorialPointerMoved = false;
        this.tutorialPointerStartX = 0;
        this.tutorialPointerStartY = 0;
    }

    private updateLevelOneTutorialIdleCue(deltaTime: number): void {
        if (!this.tutorialFlowActive) return;
        this.tutorialIdleSeconds += deltaTime;
        if (this.tutorialIdleSeconds >= LEVEL_ONE_TUTORIAL_IDLE_PULSE_SECONDS) {
            this.tutorialIdleSeconds = 0;
            this.pulseLevelOneTutorialCue();
        }
    }

    private pulseLevelOneTutorialCue(): void {
        if (!this.tutorialFlowActive) return;
        Tween.stopAllByTarget(this.tutorialHighlightOpacity);
        Tween.stopAllByTarget(this.tutorialArrowOpacity);
        this.tutorialHighlightOpacity.opacity = 255;
        this.tutorialArrowOpacity.opacity = 255;
        tween(this.tutorialHighlightOpacity)
            .to(0.22, { opacity: 145 }, { easing: 'sineInOut' })
            .to(0.3, { opacity: 255 }, { easing: 'sineInOut' })
            .start();
        if (this.tutorialArrow.active) {
            tween(this.tutorialArrowOpacity)
                .to(0.22, { opacity: 95 }, { easing: 'sineInOut' })
                .to(0.3, { opacity: 255 }, { easing: 'sineInOut' })
                .start();
        }
    }

    private applyLevelOneTutorialArt(): void {
        if (!this.tutorialCard?.isValid) return;
        const cardTransform = this.tutorialCard.getComponent(UITransform);
        const width = cardTransform?.width ?? LEVEL_ONE_TUTORIAL_CARD_WIDTH;
        const height = cardTransform?.height ?? LEVEL_ONE_TUTORIAL_CARD_HEIGHT;
        const sprite = this.applyTacticRegionSprite(
            this.tutorialCard,
            'FormalTutorialPanelSprite',
            ArtPilotResourceKey.LevelSelectPanel,
            width,
            height,
            true,
            28,
        );
        if (sprite) sprite.node.active = true;
        this.tutorialCardGraphics.enabled = !sprite;
        if (sprite) {
            for (const child of this.tutorialCard.children) {
                if (child !== sprite.node) child.setSiblingIndex(this.tutorialCard.children.length - 1);
            }
        }
        this.applyGenericButtonSkins();
    }

    private createSpecialRoadTutorialPanel(): void {
        this.specialRoadTutorialPanel = new Node('SpecialRoadTutorialPanel');
        this.specialRoadTutorialPanel.setParent(this.modalLayer);
        this.specialRoadTutorialPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.specialRoadTutorialPanel, 860, 520);
        this.createLabel(this.specialRoadTutorialPanel, 'Title', '特殊道路', 0, 190, 700, 48, 32,
            new Color(255, 244, 207, 255));
        const body = this.createLabel(
            this.specialRoadTutorialPanel,
            'Body',
            '① 第2路是泥泞道路，双方单位移动速度降低30%。\n'
                + '② 第3路是花径，羊方单位受到的伤害降低12%。\n'
                + '③ 普通道路没有额外效果。\n'
                + '④ 观察道路状态，再选择羊群和出兵路线。\n'
                + '⑤ 本关解锁新战术牌“道路冻结”。',
            0,
            30,
            690,
            250,
            20,
            new Color(226, 233, 240, 255),
        );
        body.horizontalAlign = HorizontalTextAlignment.LEFT;
        body.verticalAlign = VerticalTextAlignment.TOP;
        body.enableWrapText = true;
        body.overflow = Label.Overflow.CLAMP;
        body.lineHeight = 40;
        this.createButton(this.specialRoadTutorialPanel, 'ConfirmButton', '知道了，开始作战',
            0, -192, 300, 56, 20, () => this.completeSpecialRoadTutorial());
        this.specialRoadTutorialPanel.active = false;
    }

    private completeSpecialRoadTutorial(): void {
        this.specialRoadTutorialSeen = true;
        this.freezeUnlocked = true;
        this.saveLevelProgress();
        this.specialRoadTutorialPanel.active = false;
        this.showTacticDeckSelection();
    }

    private createLevelFiveTutorialPanel(): void {
        this.levelFiveTutorialPanel = new Node('LevelFiveTutorialPanel');
        this.levelFiveTutorialPanel.setParent(this.modalLayer);
        this.levelFiveTutorialPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackdropOnly(this.levelFiveTutorialPanel);
        this.levelFiveTutorialContent = this.createGraphicsNode(
            'LevelFiveTutorialContent',
            780,
            510,
            0,
            0,
            this.levelFiveTutorialPanel,
        );
        const graphics = this.levelFiveTutorialContent.getComponent(Graphics)!;
        graphics.fillColor = new Color(255, 249, 224, 255);
        graphics.roundRect(-390, -255, 780, 510, 32);
        graphics.fill();
        graphics.lineWidth = 7;
        graphics.strokeColor = new Color(219, 176, 82, 255);
        graphics.roundRect(-386, -251, 772, 502, 29);
        graphics.stroke();
        graphics.fillColor = new Color(115, 187, 91, 255);
        for (const side of [-1, 1]) {
            graphics.ellipse(side * 342, 214, 24, 11);
            graphics.ellipse(side * 314, 229, 18, 9);
        }
        graphics.fill();
        const title = this.createLabel(
            this.levelFiveTutorialContent,
            'Title',
            '第5关 · 无限火力',
            0,
            192,
            680,
            50,
            32,
            new Color(78, 55, 31, 255),
        );
        this.configureSingleLineLabel(title, new Color(78, 55, 31, 255));
        const subtitle = this.createLabel(
            this.levelFiveTutorialContent,
            'Subtitle',
            '能量奔涌，羊群出击',
            0,
            151,
            650,
            30,
            18,
            new Color(76, 125, 72, 255),
        );
        this.configureSingleLineLabel(subtitle, new Color(76, 125, 72, 255));
        const body = this.createLabel(
            this.levelFiveTutorialContent,
            'Body',
            '1. 本关双方能量恢复速度大幅提升。\n'
                + '2. 小羊可以持续派出，不受道路部署数量限制。\n'
                + '3. 单位仍会保持安全间距并依次排队战斗。\n'
                + '4. 合理利用能量涌流，集中突破敌方防线。',
            0,
            18,
            650,
            238,
            20,
            new Color(86, 73, 59, 255),
        );
        body.horizontalAlign = HorizontalTextAlignment.LEFT;
        body.verticalAlign = VerticalTextAlignment.TOP;
        body.enableWrapText = true;
        body.overflow = Label.Overflow.CLAMP;
        body.lineHeight = 43;
        const button = this.createButton(
            this.levelFiveTutorialContent,
            'ConfirmButton',
            '火力全开！',
            0,
            -194,
            300,
            60,
            22,
            () => this.completeLevelFiveTutorial(),
        );
        this.drawButton(button, new Color(116, 196, 104, 255), new Color(225, 176, 65, 255));
        button.label.color = new Color(67, 68, 37, 255);
        this.levelFiveTutorialPanel.active = false;
    }

    private completeLevelFiveTutorial(): void {
        this.levelFiveTutorialSeen = true;
        this.saveLevelProgress();
        this.levelFiveTutorialPanel.active = false;
        this.showTacticDeckSelection();
    }

    private createTacticDeckPanel(): void {
        this.tacticDeckPanel = new Node('TacticDeckPanel');
        this.tacticDeckPanel.setParent(this.modalLayer);
        this.tacticDeckPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackdropOnly(this.tacticDeckPanel);
        this.tacticDeckContent = this.createGraphicsNode(
            'TacticDeckContent',
            TACTIC_DECK_PANEL_WIDTH,
            TACTIC_DECK_PANEL_HEIGHT,
            0,
            0,
            this.tacticDeckPanel,
        );
        this.tacticDeckContentGraphics = this.tacticDeckContent.getComponent(Graphics)!;
        this.drawTacticDeckPanelFallback();
        this.tacticDeckContent.setSiblingIndex(1);

        // The reused parchment art contains a fixed decorative line at the old
        // subtitle baseline. Cover that line and render a dedicated divider
        // below the subtitle so every aspect ratio keeps the same three-row header.
        const headerLineMask = this.createGraphicsNode(
            'HeaderLineMask',
            720,
            38,
            0,
            TACTIC_DECK_HEADER_MASK_Y,
            this.tacticDeckContent,
        );
        const headerLineMaskGraphics = headerLineMask.getComponent(Graphics)!;
        headerLineMaskGraphics.fillColor = new Color(255, 249, 224, 255);
        headerLineMaskGraphics.rect(-360, -19, 720, 38);
        headerLineMaskGraphics.fill();
        const headerDivider = this.createGraphicsNode(
            'HeaderDivider',
            680,
            4,
            0,
            TACTIC_DECK_HEADER_DIVIDER_Y,
            this.tacticDeckContent,
        );
        const headerDividerGraphics = headerDivider.getComponent(Graphics)!;
        headerDividerGraphics.lineWidth = 2;
        headerDividerGraphics.strokeColor = new Color(224, 181, 82, 220);
        headerDividerGraphics.moveTo(-340, 0);
        headerDividerGraphics.lineTo(340, 0);
        headerDividerGraphics.stroke();

        const title = this.createLabel(this.tacticDeckContent, 'Title', '选择战术卡组',
            0, TACTIC_DECK_TITLE_Y, 760, 44, TACTIC_DECK_TITLE_FONT_SIZE,
            new Color(78, 55, 31, 255));
        this.configureSingleLineLabel(title, new Color(78, 55, 31, 255));
        title.isBold = true;
        title.enableOutline = true;
        title.outlineColor = new Color(255, 239, 182, 225);
        title.outlineWidth = 2;
        title.enableShadow = true;
        title.shadowColor = new Color(72, 48, 30, 80);
        title.shadowOffset = new Vec2(1, -1);
        title.shadowBlur = 1;
        this.tacticDeckSubtitleLabel = this.createLabel(
            this.tacticDeckContent,
            'Subtitle',
            '从4张战术牌中选择3张携带进入第4关',
            0,
            TACTIC_DECK_SUBTITLE_Y,
            760,
            26,
            TACTIC_DECK_SUBTITLE_FONT_SIZE,
            new Color(107, 98, 86, 255),
        );
        this.configureSingleLineLabel(this.tacticDeckSubtitleLabel, new Color(107, 98, 86, 255));
        this.tacticDeckSubtitleLabel.isBold = false;

        for (let index = 0; index < ALL_TACTICS.length; index += 1) {
            const kind = ALL_TACTICS[index];
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = column === 0 ? -215 : 215;
            const y = row === 0 ? 91 : -96;
            const root = new Node(`DeckOption_${kind}`);
            root.setParent(this.tacticDeckContent);
            root.setPosition(x, y, 0);
            root.addComponent(UITransform).setContentSize(TACTIC_DECK_CARD_WIDTH, TACTIC_DECK_CARD_HEIGHT);
            const visualRoot = this.createGraphicsNode(
                'CardVisual',
                TACTIC_DECK_CARD_WIDTH,
                TACTIC_DECK_CARD_HEIGHT,
                0,
                0,
                root,
            );
            const selectionGlow = this.createGraphicsNode(
                'SelectionGlow',
                TACTIC_DECK_CARD_WIDTH,
                TACTIC_DECK_CARD_HEIGHT,
                0,
                0,
                visualRoot,
            );
            const iconCellNode = this.createGraphicsNode('IconCell', 102, 126, -145, 0, visualRoot);
            const skillIconFallbackNode = this.createGraphicsNode('SkillIconFallback', 72, 72, 0, 0, iconCellNode);
            const skillIconFallbackGraphics = skillIconFallbackNode.getComponent(Graphics)!;
            if (kind === 'freeze') {
                this.drawTacticDeckFreezeOverlay(skillIconFallbackGraphics);
            } else {
                this.drawTacticIcon(skillIconFallbackGraphics, kind);
            }

            const titleLabel = this.createLabel(visualRoot, 'Title', TACTIC_DEFINITIONS[kind].name, 44, 57,
                248, 28, TACTIC_DECK_CARD_TITLE_FONT_SIZE, new Color(78, 55, 31, 255));
            titleLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
            titleLabel.enableWrapText = false;
            titleLabel.overflow = Label.Overflow.SHRINK;
            titleLabel.verticalAlign = VerticalTextAlignment.CENTER;
            titleLabel.isBold = true;
            titleLabel.enableOutline = false;
            titleLabel.enableShadow = false;

            const conditionText = kind === 'shock'
                ? '玩家基地生命低于50%后解锁'
                : kind === 'freeze' ? '选择一条存在敌人的道路' : TACTIC_DEFINITIONS[kind].condition;
            const effectText = kind === 'sprint'
                ? '全体移速提高50%，持续6秒'
                : kind === 'heal' ? '全体存活单位恢复40%生命'
                    : kind === 'shock' ? '本方领地小/中消灭，大/巨重伤击退'
                        : kind === 'freeze' ? '该道路敌方单位停止3秒'
                            : kind === 'supplyBoost' ? '下一次黄金占领与守点奖励各+1'
                                : `${ENERGY_SURGE_DURATION_SECONDS}秒内能量恢复速度翻倍`;
            const conditionLabel = this.createLabel(visualRoot, 'Condition', conditionText, 44, 26,
                248, 24, TACTIC_DECK_CARD_CONDITION_FONT_SIZE, new Color(107, 98, 86, 255));
            conditionLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
            conditionLabel.enableWrapText = false;
            conditionLabel.overflow = Label.Overflow.SHRINK;
            conditionLabel.isBold = false;
            conditionLabel.enableOutline = false;
            conditionLabel.enableShadow = false;
            const effectLabel = this.createLabel(visualRoot, 'Effect', effectText, 44, -7,
                248, 42, TACTIC_DECK_CARD_EFFECT_FONT_SIZE, new Color(86, 73, 59, 255));
            effectLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
            effectLabel.verticalAlign = VerticalTextAlignment.TOP;
            effectLabel.enableWrapText = true;
            effectLabel.overflow = Label.Overflow.CLAMP;
            effectLabel.lineHeight = 18;
            effectLabel.isBold = false;
            effectLabel.enableOutline = false;
            effectLabel.enableShadow = false;

            const theme = this.getTacticDeckTheme(kind);
            const costTag = this.createGraphicsNode('CostTag', 106, 27, -18, -59, visualRoot);
            this.drawTacticDeckTag(costTag.getComponent(Graphics)!, 106, theme.softFill, theme.accent);
            const costLabel = this.createLabel(costTag, 'Text', `补给消耗：${TACTIC_DEFINITIONS[kind].supplyCost}`,
                0, 0, 98, 25, TACTIC_DECK_CARD_META_FONT_SIZE, new Color(86, 73, 59, 255));
            this.configureSingleLineLabel(costLabel, new Color(86, 73, 59, 255));
            costLabel.isBold = false;
            const cooldownText = kind === 'shock'
                ? '每局限用1次'
                : `冷却时间：${TACTIC_DEFINITIONS[kind].cooldownSeconds}秒`;
            const cooldownTag = this.createGraphicsNode('CooldownTag', 126, 27, 105, -59, visualRoot);
            this.drawTacticDeckTag(cooldownTag.getComponent(Graphics)!, 126, theme.softFill, theme.accent);
            const cooldownLabel = this.createLabel(cooldownTag, 'Text', cooldownText,
                0, 0, 118, 25, TACTIC_DECK_CARD_META_FONT_SIZE, new Color(86, 73, 59, 255));
            this.configureSingleLineLabel(cooldownLabel, new Color(86, 73, 59, 255));
            cooldownLabel.isBold = false;

            const checkBadgeNode = this.createGraphicsNode('SelectedBadge', 46, 46, 180, 65, visualRoot);
            const checkBadgeGraphics = checkBadgeNode.getComponent(Graphics)!;
            const checkLabel = this.createLabel(checkBadgeNode, 'Check', '✓', 0, 0, 34, 34, 25,
                new Color(255, 250, 220, 255));
            checkLabel.enableOutline = true;
            checkLabel.outlineColor = new Color(111, 77, 24, 255);
            checkLabel.outlineWidth = 2;
            checkBadgeNode.active = false;
            const option: DeckTacticOptionView = {
                kind,
                root,
                visualRoot,
                graphics: visualRoot.getComponent(Graphics)!,
                selectionGlowGraphics: selectionGlow.getComponent(Graphics)!,
                iconCellNode,
                skillIconFallbackGraphics,
                checkBadgeNode,
                checkBadgeGraphics,
                titleLabel,
                conditionLabel,
                effectLabel,
                costLabel,
                cooldownLabel,
                checkLabel,
                pressArmed: false,
            };
            this.tacticDeckOptions.set(kind, option);
            this.drawTacticDeckIconCellFallback(option);
            this.drawTacticDeckOption(option, false);
            root.on(NodeEventType.TOUCH_START, () => this.beginTacticDeckOptionPress(option), this);
            root.on(NodeEventType.TOUCH_END, () => this.endTacticDeckOptionPress(option), this);
            root.on(NodeEventType.TOUCH_CANCEL, () => this.cancelTacticDeckOptionPress(option), this);
        }

        this.tacticDeckHintLabel = this.createLabel(this.tacticDeckContent, 'SelectionCount', '', 0, -224,
            700, 28, 17, new Color(78, 96, 60, 255));
        this.configureSingleLineLabel(this.tacticDeckHintLabel, new Color(78, 96, 60, 255));
        this.tacticDeckHintLabel.isBold = true;
        this.tacticDeckFeedbackLabel = this.createLabel(this.tacticDeckContent, 'Feedback', '', 0, -248,
            760, 25, 15, new Color(151, 76, 49, 255));
        this.configureSingleLineLabel(this.tacticDeckFeedbackLabel, new Color(151, 76, 49, 255));
        this.tacticDeckFeedbackOpacity = this.tacticDeckFeedbackLabel.node.addComponent(UIOpacity);
        this.tacticDeckFeedbackOpacity.opacity = 0;
        this.tacticDeckConfirmButton = this.createButton(
            this.tacticDeckContent,
            'TacticDeckConfirmButton',
            '开始作战',
            0,
            -306,
            TACTIC_DECK_CONFIRM_WIDTH,
            TACTIC_DECK_CONFIRM_HEIGHT,
            23,
            () => this.confirmTacticDeckSelection(),
        );
        this.configureSingleLineLabel(this.tacticDeckConfirmButton.label, new Color(66, 74, 47, 255));
        this.tacticDeckConfirmButton.label.isBold = true;
        this.attachTacticDeckConfirmPressFeedback();
        this.tacticDeckPanel.active = false;
    }

    private showTacticDeckSelection(): void {
        this.audioManager.requestMenuBgm();
        const savedDeck = this.selectedTacticsByLevel.get(this.currentLevel)
            ?? this.getDefaultTacticDeckForLevel(this.currentLevel);
        this.selectedTactics = this.normalizeTacticDeck(savedDeck, this.getDefaultTacticDeckForLevel(this.currentLevel));
        this.pendingDeckSelection = [...this.selectedTactics];
        this.tacticDeckConfirmLocked = false;
        this.clearTacticDeckFeedback();
        const available = this.getAvailableTacticsForLevel(this.currentLevel);
        const compactLayout = this.currentLevel >= 5;
        let visibleIndex = 0;
        for (const option of this.tacticDeckOptions.values()) {
            const isAvailable = available.indexOf(option.kind) >= 0;
            option.root.active = isAvailable;
            if (!isAvailable) continue;
            option.pressArmed = false;
            Tween.stopAllByTarget(option.visualRoot);
            option.visualRoot.setPosition(0, 0, 0);
            option.visualRoot.setScale(1, 1, 1);
            if (compactLayout) {
                const positions = this.currentLevel === 6
                    ? [
                        new Vec2(-310, 105), new Vec2(0, 105), new Vec2(310, 105),
                        new Vec2(-310, -95), new Vec2(0, -95), new Vec2(310, -95),
                    ]
                    : [
                        new Vec2(-210, 135), new Vec2(210, 135),
                        new Vec2(-210, 0), new Vec2(210, 0),
                        new Vec2(0, -135),
                    ];
                const position = positions[visibleIndex] ?? positions[positions.length - 1];
                option.root.setPosition(position.x, position.y, 0);
                const scale = this.currentLevel === 6 ? 0.72 : 0.78;
                option.root.setScale(scale, scale, 1);
            } else {
                const column = visibleIndex % 2;
                const row = Math.floor(visibleIndex / 2);
                option.root.setPosition(column === 0 ? -215 : 215, row === 0 ? 91 : -96, 0);
                option.root.setScale(1, 1, 1);
            }
            visibleIndex += 1;
        }
        this.tacticDeckSubtitleLabel.string = this.currentLevel === 6
            ? '从6张战术牌中选择3张携带进入第6关'
            : compactLayout ? '从5张战术牌中选择3张携带进入第5关'
                : '从4张战术牌中选择3张携带进入第4关';
        this.refreshTacticDeckSelection();
        this.showModal(this.tacticDeckPanel);
    }

    private toggleTacticDeckOption(kind: TacticIcon): void {
        if (this.tacticDeckConfirmLocked) return;
        const option = this.tacticDeckOptions.get(kind);
        const existingIndex = this.pendingDeckSelection.indexOf(kind);
        if (existingIndex >= 0) {
            this.pendingDeckSelection.splice(existingIndex, 1);
        } else if (this.pendingDeckSelection.length >= 3) {
            if (option) this.playTacticDeckOptionShake(option);
            this.showTacticDeckFeedback('最多携带3张战术牌，请先取消一张。', new Color(151, 76, 49, 255));
            this.audioManager.playSfx('deploy_failed');
            return;
        } else {
            this.pendingDeckSelection.push(kind);
        }
        this.audioManager.playSfx('ui_click');
        this.refreshTacticDeckSelection();
        if (option) this.playTacticDeckOptionPulse(option);
    }

    private refreshTacticDeckSelection(): void {
        for (const option of this.tacticDeckOptions.values()) {
            const selected = this.pendingDeckSelection.indexOf(option.kind) >= 0;
            this.drawTacticDeckOption(option, selected);
        }
        const ready = this.pendingDeckSelection.length === 3;
        this.tacticDeckHintLabel.string = `已选择 ${this.pendingDeckSelection.length} / 3 张战术牌`;
        this.tacticDeckHintLabel.color = ready
            ? new Color(57, 126, 73, 255) : new Color(110, 87, 55, 255);
        this.drawButton(
            this.tacticDeckConfirmButton,
            ready ? new Color(90, 184, 102, 255) : new Color(163, 177, 156, 255),
            ready ? new Color(219, 166, 69, 255) : new Color(132, 139, 126, 255),
        );
        const buttonArt = this.tacticDeckConfirmButton.node.getChildByName('ButtonArt')?.getComponent(Sprite);
        if (buttonArt) {
            buttonArt.node.active = true;
            buttonArt.color = ready ? Color.WHITE : new Color(147, 159, 143, 255);
            this.tacticDeckConfirmButton.graphics.enabled = false;
        }
        this.tacticDeckConfirmButton.label.color = ready
            ? new Color(55, 79, 43, 255) : new Color(84, 91, 80, 255);
        this.tacticDeckConfirmButton.label.node.setSiblingIndex(this.tacticDeckConfirmButton.node.children.length - 1);
    }

    private confirmTacticDeckSelection(): void {
        if (this.tacticDeckConfirmLocked) return;
        if (this.pendingDeckSelection.length !== 3) {
            this.showTacticDeckFeedback('请选择3张战术牌', new Color(151, 76, 49, 255));
            this.playTacticDeckConfirmShake();
            return;
        }
        this.tacticDeckConfirmLocked = true;
        this.selectedTactics = [...this.pendingDeckSelection];
        this.selectedTacticsByLevel.set(this.currentLevel, [...this.selectedTactics]);
        this.saveLevelProgress();
        this.tacticDeckPanel.active = false;
        this.applyCurrentTacticDeckLayout();
        this.activateBattle();
    }

    private drawTacticDeckPanelFallback(): void {
        const graphics = this.tacticDeckContentGraphics;
        graphics.clear();
        graphics.fillColor = new Color(55, 43, 29, 70);
        graphics.roundRect(
            -TACTIC_DECK_PANEL_WIDTH / 2 + 7,
            -TACTIC_DECK_PANEL_HEIGHT / 2 - 8,
            TACTIC_DECK_PANEL_WIDTH - 14,
            TACTIC_DECK_PANEL_HEIGHT,
            34,
        );
        graphics.fill();
        graphics.fillColor = new Color(255, 249, 224, 255);
        graphics.roundRect(
            -TACTIC_DECK_PANEL_WIDTH / 2,
            -TACTIC_DECK_PANEL_HEIGHT / 2,
            TACTIC_DECK_PANEL_WIDTH,
            TACTIC_DECK_PANEL_HEIGHT,
            34,
        );
        graphics.fill();
        graphics.lineWidth = 7;
        graphics.strokeColor = new Color(221, 177, 82, 255);
        graphics.roundRect(
            -TACTIC_DECK_PANEL_WIDTH / 2 + 3,
            -TACTIC_DECK_PANEL_HEIGHT / 2 + 3,
            TACTIC_DECK_PANEL_WIDTH - 6,
            TACTIC_DECK_PANEL_HEIGHT - 6,
            31,
        );
        graphics.stroke();
        for (const side of [-1, 1]) {
            const x = side * 432;
            graphics.fillColor = new Color(105, 177, 86, 255);
            graphics.ellipse(x, 285, 20, 11);
            graphics.fill();
            graphics.fillColor = new Color(151, 205, 112, 255);
            graphics.ellipse(x - side * 23, 298, 17, 9);
            graphics.fill();
            graphics.fillColor = new Color(255, 251, 229, 255);
            graphics.circle(x - side * 8, 304, 9);
            graphics.fill();
            graphics.fillColor = new Color(242, 191, 58, 255);
            graphics.circle(x - side * 8, 304, 3);
            graphics.fill();
        }
    }

    private drawTacticDeckTag(
        graphics: Graphics,
        width: number,
        fill: Color,
        border: Color,
    ): void {
        graphics.clear();
        graphics.fillColor = new Color(fill.r, fill.g, fill.b, Math.max(72, fill.a));
        graphics.roundRect(-width / 2, -13.5, width, 27, 9);
        graphics.fill();
        graphics.lineWidth = 1.5;
        graphics.strokeColor = new Color(border.r, border.g, border.b, 205);
        graphics.roundRect(-width / 2 + 1, -12.5, width - 2, 25, 8);
        graphics.stroke();
    }

    private drawTacticDeckIconCellFallback(option: DeckTacticOptionView): void {
        const theme = this.getTacticDeckTheme(option.kind);
        const graphics = option.iconCellNode.getComponent(Graphics)!;
        graphics.clear();
        graphics.fillColor = new Color(255, 249, 224, 255);
        graphics.roundRect(-51, -63, 102, 126, 20);
        graphics.fill();
        graphics.fillColor = new Color(theme.accent.r, theme.accent.g, theme.accent.b, 72);
        graphics.roundRect(-46, -58, 92, 116, 17);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = theme.accent;
        graphics.roundRect(-49, -61, 98, 122, 19);
        graphics.stroke();
    }

    private drawTacticDeckFreezeOverlay(graphics: Graphics): void {
        graphics.clear();
        graphics.fillColor = new Color(219, 247, 255, 55);
        graphics.circle(0, 0, 27);
        graphics.fill();
        graphics.lineCap = Graphics.LineCap.ROUND;
        graphics.lineJoin = Graphics.LineJoin.ROUND;
        graphics.lineWidth = 4;
        graphics.strokeColor = new Color(232, 250, 255, 255);
        const length = 23;
        for (let index = 0; index < 3; index += 1) {
            const angle = index * Math.PI / 3;
            const dx = Math.cos(angle) * length;
            const dy = Math.sin(angle) * length;
            graphics.moveTo(-dx, -dy);
            graphics.lineTo(dx, dy);
            for (const sign of [-1, 1]) {
                const tipX = dx * sign;
                const tipY = dy * sign;
                const baseX = dx * sign * 0.62;
                const baseY = dy * sign * 0.62;
                const sideAngleA = angle + (sign > 0 ? Math.PI * 0.78 : -Math.PI * 0.22);
                const sideAngleB = angle + (sign > 0 ? -Math.PI * 0.78 : Math.PI * 0.22);
                graphics.moveTo(baseX, baseY);
                graphics.lineTo(tipX + Math.cos(sideAngleA) * 7, tipY + Math.sin(sideAngleA) * 7);
                graphics.moveTo(baseX, baseY);
                graphics.lineTo(tipX + Math.cos(sideAngleB) * 7, tipY + Math.sin(sideAngleB) * 7);
            }
        }
        graphics.stroke();
        graphics.fillColor = new Color(255, 255, 255, 255);
        graphics.circle(0, 0, 4);
        graphics.fill();
    }

    private drawTacticDeckOption(option: DeckTacticOptionView, selected: boolean): void {
        const theme = this.getTacticDeckTheme(option.kind);
        option.graphics.enabled = !option.cardShellSprite;
        if (option.graphics.enabled) {
            option.graphics.clear();
            option.graphics.fillColor = selected
                ? new Color(255, 246, 207, 255) : new Color(255, 250, 232, 255);
            option.graphics.roundRect(
                -TACTIC_DECK_CARD_WIDTH / 2,
                -TACTIC_DECK_CARD_HEIGHT / 2,
                TACTIC_DECK_CARD_WIDTH,
                TACTIC_DECK_CARD_HEIGHT,
                21,
            );
            option.graphics.fill();
        }
        if (option.cardShellSprite) {
            option.cardShellSprite.color = selected
                ? new Color(255, 247, 211, 255) : Color.WHITE;
        }

        const glow = option.selectionGlowGraphics;
        glow.clear();
        glow.fillColor = selected
            ? new Color(255, 221, 94, 42)
            : new Color(theme.softFill.r, theme.softFill.g, theme.softFill.b, 24);
        glow.roundRect(
            -TACTIC_DECK_CARD_WIDTH / 2 + 5,
            -TACTIC_DECK_CARD_HEIGHT / 2 + 5,
            TACTIC_DECK_CARD_WIDTH - 10,
            TACTIC_DECK_CARD_HEIGHT - 10,
            18,
        );
        glow.fill();
        glow.lineWidth = selected ? 5 : 3;
        glow.strokeColor = selected ? new Color(246, 190, 49, 255) : theme.accent;
        glow.roundRect(
            -TACTIC_DECK_CARD_WIDTH / 2 + 3,
            -TACTIC_DECK_CARD_HEIGHT / 2 + 3,
            TACTIC_DECK_CARD_WIDTH - 6,
            TACTIC_DECK_CARD_HEIGHT - 6,
            19,
        );
        glow.stroke();

        option.checkBadgeNode.active = selected;
        option.checkBadgeGraphics.clear();
        if (selected) {
            option.checkBadgeGraphics.fillColor = new Color(56, 151, 86, 255);
            option.checkBadgeGraphics.circle(0, 0, 19);
            option.checkBadgeGraphics.fill();
            option.checkBadgeGraphics.lineWidth = 4;
            option.checkBadgeGraphics.strokeColor = new Color(255, 216, 83, 255);
            option.checkBadgeGraphics.circle(0, 0, 20);
            option.checkBadgeGraphics.stroke();
            option.checkLabel.string = '✓';
        }
        option.titleLabel.color = new Color(78, 55, 31, 255);
        option.conditionLabel.color = new Color(107, 98, 86, 255);
        option.effectLabel.color = new Color(86, 73, 59, 255);
    }

    private beginTacticDeckOptionPress(option: DeckTacticOptionView): void {
        if (!this.tacticDeckPanel.active || this.tacticDeckConfirmLocked) return;
        option.pressArmed = true;
        Tween.stopAllByTarget(option.visualRoot);
        option.visualRoot.setPosition(0, 0, 0);
        option.visualRoot.setScale(0.985, 0.985, 1);
    }

    private endTacticDeckOptionPress(option: DeckTacticOptionView): void {
        const shouldToggle = option.pressArmed && !this.tacticDeckConfirmLocked;
        option.pressArmed = false;
        Tween.stopAllByTarget(option.visualRoot);
        option.visualRoot.setPosition(0, 0, 0);
        option.visualRoot.setScale(1, 1, 1);
        if (shouldToggle) this.toggleTacticDeckOption(option.kind);
    }

    private cancelTacticDeckOptionPress(option: DeckTacticOptionView): void {
        option.pressArmed = false;
        Tween.stopAllByTarget(option.visualRoot);
        option.visualRoot.setPosition(0, 0, 0);
        tween(option.visualRoot)
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
            .start();
    }

    private playTacticDeckOptionPulse(option: DeckTacticOptionView): void {
        Tween.stopAllByTarget(option.visualRoot);
        option.visualRoot.setPosition(0, 0, 0);
        option.visualRoot.setScale(1, 1, 1);
        tween(option.visualRoot)
            .to(0.08, { scale: new Vec3(1.03, 1.03, 1) }, { easing: 'quadOut' })
            .to(0.13, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    private playTacticDeckOptionShake(option: DeckTacticOptionView): void {
        Tween.stopAllByTarget(option.visualRoot);
        option.visualRoot.setScale(1, 1, 1);
        option.visualRoot.setPosition(0, 0, 0);
        tween(option.visualRoot)
            .to(0.045, { position: new Vec3(-7, 0, 0) })
            .to(0.055, { position: new Vec3(7, 0, 0) })
            .to(0.055, { position: new Vec3(-5, 0, 0) })
            .to(0.055, { position: new Vec3(5, 0, 0) })
            .to(0.055, { position: new Vec3(0, 0, 0) }, { easing: 'quadOut' })
            .start();
    }

    private showTacticDeckFeedback(text: string, color: Color): void {
        Tween.stopAllByTarget(this.tacticDeckFeedbackOpacity);
        this.tacticDeckFeedbackLabel.string = text;
        this.tacticDeckFeedbackLabel.color = color;
        this.tacticDeckFeedbackOpacity.opacity = 255;
        tween(this.tacticDeckFeedbackOpacity)
            .delay(1.35)
            .to(0.2, { opacity: 0 }, { easing: 'quadOut' })
            .start();
    }

    private clearTacticDeckFeedback(): void {
        if (!this.tacticDeckFeedbackOpacity) return;
        Tween.stopAllByTarget(this.tacticDeckFeedbackOpacity);
        this.tacticDeckFeedbackOpacity.opacity = 0;
        this.tacticDeckFeedbackLabel.string = '';
    }

    private attachTacticDeckConfirmPressFeedback(): void {
        const button = this.tacticDeckConfirmButton;
        const release = (): void => {
            Tween.stopAllByTarget(button.node);
            tween(button.node)
                .to(0.14, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        };
        button.node.on(NodeEventType.TOUCH_START, () => {
            if (this.pendingDeckSelection.length !== 3 || this.tacticDeckConfirmLocked) return;
            Tween.stopAllByTarget(button.node);
            button.node.setScale(0.97, 0.97, 1);
        }, this);
        button.node.on(NodeEventType.TOUCH_END, release, this);
        button.node.on(NodeEventType.TOUCH_CANCEL, release, this);
    }

    private playTacticDeckConfirmShake(): void {
        const node = this.tacticDeckConfirmButton.node;
        Tween.stopAllByTarget(node);
        node.setScale(1, 1, 1);
        node.setPosition(0, -306, 0);
        tween(node)
            .to(0.05, { position: new Vec3(-6, -306, 0) })
            .to(0.06, { position: new Vec3(6, -306, 0) })
            .to(0.06, { position: new Vec3(-4, -306, 0) })
            .to(0.06, { position: new Vec3(0, -306, 0) }, { easing: 'quadOut' })
            .start();
    }

    private createBattleLevelBadge(): void {
        this.levelBadge = this.createGraphicsNode(
            'BattleLevelBadge',
            LEVEL_BADGE_WIDTH,
            LEVEL_BADGE_HEIGHT,
            LEVEL_BADGE_X,
            LEVEL_BADGE_Y,
            this.hudLayer,
        );
        const graphics = this.levelBadge.getComponent(Graphics)!;
        graphics.fillColor = new Color(20, 38, 58, 224);
        graphics.roundRect(
            -LEVEL_BADGE_WIDTH / 2,
            -LEVEL_BADGE_HEIGHT / 2,
            LEVEL_BADGE_WIDTH,
            LEVEL_BADGE_HEIGHT,
            12,
        );
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(103, 134, 163, 170);
        graphics.roundRect(
            -LEVEL_BADGE_WIDTH / 2,
            -LEVEL_BADGE_HEIGHT / 2,
            LEVEL_BADGE_WIDTH,
            LEVEL_BADGE_HEIGHT,
            12,
        );
        graphics.stroke();

        this.levelBadgeContent = new Node('LevelBadgeContent');
        this.levelBadgeContent.setParent(this.levelBadge);
        const contentTransform = this.levelBadgeContent.addComponent(UITransform);
        contentTransform.setContentSize(LEVEL_BADGE_CONTENT_WIDTH, LEVEL_BADGE_CONTENT_HEIGHT);
        contentTransform.setAnchorPoint(0.5, 0.5);
        this.levelBadgeContent.setPosition(0, 0, 0);
        this.levelBadgeChapterLabel = this.createLabel(
            this.levelBadgeContent,
            'LevelChapter',
            '',
            0,
            9.5,
            LEVEL_BADGE_CONTENT_WIDTH,
            22,
            22,
            new Color(255, 239, 190, 255),
        );
        this.levelBadgeTitleLabel = this.createLabel(
            this.levelBadgeContent,
            'LevelTitle',
            '',
            0,
            -12.5,
            LEVEL_BADGE_CONTENT_WIDTH,
            15,
            14,
            new Color(73, 91, 67, 255),
        );
        this.configureSingleLineLabel(this.levelBadgeChapterLabel, UI_TEXT_PRIMARY);
        this.configureSingleLineLabel(this.levelBadgeTitleLabel, new Color(73, 91, 67, 255));
        this.refreshBattleLevelBadge();
        this.levelBadge.active = false;
    }

    private refreshBattleLevelBadge(): void {
        if (!this.levelBadge || !this.levelBadgeChapterLabel || !this.levelBadgeTitleLabel) {
            return;
        }
        const level = this.getCurrentLevelConfig();
        this.levelBadgeChapterLabel.string = `\u7B2C ${this.currentLevel} \u5173`;
        this.levelBadgeTitleLabel.string = level.title;
    }

    private createPauseControls(): void {
        this.pauseButton = this.createButton(this.rightControlBar, 'PauseButton', '\u2161 \u6682\u505C', PAUSE_BUTTON_X, PAUSE_BUTTON_Y,
            PAUSE_BUTTON_WIDTH, PAUSE_BUTTON_HEIGHT, 18, () => this.pauseGame());
        this.pauseButton.label.color = new Color(255, 238, 180, 255);
        this.pauseButton.node.setScale(1, 1, 1);
        this.resizeAndPositionLabel(this.pauseButton.label, 0, 0, PAUSE_BUTTON_WIDTH - 24, PAUSE_BUTTON_HEIGHT - 12);
        this.configureSingleLineLabel(this.pauseButton.label, new Color(255, 238, 180, 255));
        this.drawButton(this.pauseButton, new Color(28, 48, 76, 250), new Color(255, 222, 126, 255));
        this.pauseButton.node.active = false;

        this.pausePanel = new Node('PausePanel');
        this.pausePanel.setParent(this.modalLayer);
        this.pausePanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackdropOnly(this.pausePanel);
        this.pauseContent = this.createGraphicsNode('PauseContent', PAUSE_PANEL_WIDTH, PAUSE_PANEL_HEIGHT, 0, 0, this.pausePanel);
        const pauseContentGraphics = this.pauseContent.getComponent(Graphics)!;
        pauseContentGraphics.fillColor = new Color(246, 231, 193, 255);
        pauseContentGraphics.roundRect(-PAUSE_PANEL_WIDTH / 2, -PAUSE_PANEL_HEIGHT / 2, PAUSE_PANEL_WIDTH, PAUSE_PANEL_HEIGHT, 34);
        pauseContentGraphics.fill();
        pauseContentGraphics.lineWidth = 4;
        pauseContentGraphics.strokeColor = new Color(151, 101, 52, 255);
        pauseContentGraphics.roundRect(-PAUSE_PANEL_WIDTH / 2, -PAUSE_PANEL_HEIGHT / 2, PAUSE_PANEL_WIDTH, PAUSE_PANEL_HEIGHT, 34);
        pauseContentGraphics.stroke();
        this.pauseContentRoot = new Node('PauseContentRoot');
        this.pauseContentRoot.setParent(this.pauseContent);
        this.pauseContentRoot.addComponent(UITransform).setContentSize(PAUSE_CONTENT_ROOT_WIDTH, PAUSE_CONTENT_ROOT_HEIGHT);
        this.pauseContentRoot.setPosition(0, 0, 0);

        this.createLabel(this.pauseContentRoot, 'PauseTitle', '\u6E38\u620F\u5DF2\u6682\u505C', 0, 240, 410, 46, 34, UI_TEXT_PRIMARY);
        this.createLabel(this.pauseContentRoot, 'PauseHint', '\u6218\u573A\u3001AI \u548C\u8D44\u6E90\u6062\u590D\u5747\u5DF2\u51BB\u7ED3', 0, 204, 410, 24, 16, UI_TEXT_SECONDARY);
        this.createButton(this.pauseContentRoot, 'ResumeButton', '\u7EE7\u7EED\u6218\u6597', -PAUSE_ACTION_COLUMN_X, 148,
            PAUSE_ACTION_BUTTON_WIDTH, PAUSE_ACTION_BUTTON_HEIGHT, 20, () => this.resumeGame());
        this.createButton(this.pauseContentRoot, 'PauseRestartButton', '\u91CD\u65B0\u5F00\u59CB', PAUSE_ACTION_COLUMN_X, 148,
            PAUSE_ACTION_BUTTON_WIDTH, PAUSE_ACTION_BUTTON_HEIGHT, 20, () => this.restartGame());
        this.createButton(this.pauseContentRoot, 'HelpButton', '\u73A9\u6CD5\u8BF4\u660E', -PAUSE_ACTION_COLUMN_X, 96,
            PAUSE_ACTION_BUTTON_WIDTH, PAUSE_ACTION_BUTTON_HEIGHT, 20, () => this.openHelpPanel());
        this.createButton(this.pauseContentRoot, 'ReturnTitleButton', '\u8FD4\u56DE\u6807\u9898', PAUSE_ACTION_COLUMN_X, 96,
            PAUSE_ACTION_BUTTON_WIDTH, PAUSE_ACTION_BUTTON_HEIGHT, 20, () => this.returnToTitle());
        this.createBgmTrackSelector(this.pauseContentRoot, -28);
        this.musicVolumeControl = this.createVolumeControl(
            this.pauseContentRoot,
            'MusicVolume',
            'music',
            '\u97F3\u4E50',
            -166,
            new Color(111, 148, 213, 255),
        );
        this.sfxVolumeControl = this.createVolumeControl(
            this.pauseContentRoot,
            'SfxVolume',
            'sfx',
            '\u97F3\u6548',
            -230,
            new Color(77, 174, 144, 255),
        );
        this.refreshAudioVolumeControls();
        this.refreshBgmTrackSelector();
        this.pausePanel.active = false;

        this.helpPanel = new Node('HelpPanel');
        this.helpPanel.setParent(this.modalLayer);
        this.helpPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.helpPanel, 780, 600);
        this.createLabel(this.helpPanel, 'HelpTitle', '\u73A9\u6CD5\u8BF4\u660E', 0, 245, 620, 48, 32, new Color(255, 244, 207, 255));
        this.helpTextLabel = this.createLabel(this.helpPanel, 'HelpText', '', 0, 154, 650, 120, 19,
            new Color(226, 233, 240, 255));
        this.refreshHelpText();
        this.createLabel(this.helpPanel, 'TierLegendTitle', '\u56DB\u6863\u5355\u4F4D', 0, 80, 620, 32, 20, new Color(255, 231, 157, 255));
        this.createUnitTierLegend(this.helpPanel, 42);
        this.replayLevelOneTutorialButton = this.createButton(
            this.helpPanel,
            'ReplayLevelOneTutorialButton',
            '重看第1关引导',
            0,
            -185,
            250,
            46,
            18,
            () => this.requestLevelOneTutorialReplay(),
        );
        this.createButton(this.helpPanel, 'HelpBackButton', '\u8FD4\u56DE\u6682\u505C\u83DC\u5355', 0, -252, 250, 50, 19, () => this.closeHelpPanel());
        this.helpPanel.active = false;

        this.replayLevelOneTutorialConfirmPanel = new Node('ReplayLevelOneTutorialConfirmPanel');
        this.replayLevelOneTutorialConfirmPanel.setParent(this.modalLayer);
        this.replayLevelOneTutorialConfirmPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.replayLevelOneTutorialConfirmPanel, 650, 270);
        this.createLabel(
            this.replayLevelOneTutorialConfirmPanel,
            'ReplayTutorialConfirmTitle',
            '重看第1关引导',
            0,
            76,
            530,
            42,
            28,
            new Color(255, 244, 207, 255),
        );
        const replayConfirmBody = this.createLabel(
            this.replayLevelOneTutorialConfirmPanel,
            'ReplayTutorialConfirmBody',
            '重看引导将重新开始第1关，当前战斗进度不会保留，是否继续？',
            0,
            20,
            530,
            70,
            18,
            new Color(226, 233, 240, 255),
        );
        replayConfirmBody.horizontalAlign = HorizontalTextAlignment.CENTER;
        replayConfirmBody.verticalAlign = VerticalTextAlignment.CENTER;
        replayConfirmBody.enableWrapText = true;
        replayConfirmBody.overflow = Label.Overflow.CLAMP;
        replayConfirmBody.lineHeight = 24;
        this.createButton(
            this.replayLevelOneTutorialConfirmPanel,
            'ReplayTutorialCancelButton',
            '取消',
            -118,
            -82,
            180,
            48,
            18,
            () => this.cancelLevelOneTutorialReplay(),
        );
        this.createButton(
            this.replayLevelOneTutorialConfirmPanel,
            'ReplayTutorialConfirmButton',
            '确认重看',
            118,
            -82,
            180,
            48,
            18,
            () => this.confirmLevelOneTutorialReplay(),
        );
        this.replayLevelOneTutorialConfirmPanel.active = false;
    }

    private createUnitTierLegend(parent: Node, topY: number): void {
        const descriptions: Readonly<Record<SheepType, string>> = {
            [SheepType.Small]: '\u901F\u5EA6\u8F83\u5FEB\u3001\u6D88\u8017\u8F83\u4F4E',
            [SheepType.Medium]: '\u5747\u8861\u5355\u4F4D',
            [SheepType.Large]: '\u751F\u547D\u548C\u653B\u51FB\u8F83\u9AD8',
            [SheepType.Giant]: '\u6700\u5F3A\u4F46\u80FD\u91CF\u6D88\u8017\u6700\u9AD8',
        };
        const rowWidth = 650;
        const rowHeight = 36;
        const rowGap = 5;
        for (let index = 0; index < UNIT_ORDER.length; index += 1) {
            const type = UNIT_ORDER[index];
            const tier = UNIT_TIER_VISUALS[type];
            const rowY = topY - index * (rowHeight + rowGap);
            const row = this.createGraphicsNode(`TierLegend${type}`, rowWidth, rowHeight, 0, rowY, parent);
            const rowGraphics = row.getComponent(Graphics)!;
            rowGraphics.fillColor = new Color(14, 25, 40, 225);
            rowGraphics.roundRect(-rowWidth / 2, -rowHeight / 2, rowWidth, rowHeight, 9);
            rowGraphics.fill();
            rowGraphics.lineWidth = 1;
            rowGraphics.strokeColor = new Color(tier.accentColor.r, tier.accentColor.g, tier.accentColor.b, 115);
            rowGraphics.roundRect(-rowWidth / 2, -rowHeight / 2, rowWidth, rowHeight, 9);
            rowGraphics.stroke();

            const badge = this.createGraphicsNode('TierBadge', 30, 30, -292, 0, row);
            const badgeLabel = this.createLabel(badge, 'TierLabel', '', 0, 0, 26, 28, 15, tier.accentColor);
            this.drawTierBadge(badge.getComponent(Graphics)!, badgeLabel, type, 28);
            this.createLabel(row, 'Roman', tier.roman, -244, 0, 44, rowHeight, 18, tier.accentColor);
            const description = this.createLabel(row, 'Description', descriptions[type], 36, 0, 490, rowHeight, 16,
                new Color(223, 232, 241, 255));
            description.horizontalAlign = HorizontalTextAlignment.LEFT;
        }
    }

    private pauseGame(): void {
        if (!this.isStarted || this.isFinished || this.isPaused || this.tutorialFlowActive) {
            return;
        }
        this.isPaused = true;
        this.cancelFreezeLaneSelection(false);
        this.resetAllTacticCardPressStates(true);
        Tween.stopAllByTarget(this.statusToastOpacity);
        this.statusToastRemaining = 0;
        this.statusToast.active = false;
        this.setBattleTweensPaused(true);
        this.audioManager.setBattlePaused(true);
        this.pauseButton.node.active = false;
        this.refreshAudioVolumeControls();
        this.refreshBgmTrackSelector();
        void this.preparePauseArt();
        this.showModal(this.pausePanel);
        this.refreshLaneSpawnMarkers();
        this.updatePilotAIGate(0);
    }

    private async preparePauseArt(): Promise<void> {
        if (!ART_FULL_ENABLED) return;
        await this.artResourceManager.preloadGroups(['pause']);
        await this.artResourceManager.preloadKeys([
            ArtPilotResourceKey.LevelCardUnlocked,
            ArtPilotResourceKey.LevelCardSelected,
        ]);
        if (!this.node.isValid || !this.pauseContent) return;
        const panelArt = this.applyChildSprite(this.pauseContent, 'PausePanelArt', ArtPilotResourceKey.PausePanel,
            PAUSE_PANEL_ART_WIDTH, PAUSE_PANEL_HEIGHT);
        if (panelArt) {
            this.pauseContent.getComponent(Graphics)!.enabled = false;
            panelArt.node.setSiblingIndex(0);
        }
        this.applyVolumeControlArt(this.musicVolumeControl, ArtPilotResourceKey.MusicIcon);
        this.applyVolumeControlArt(this.sfxVolumeControl, ArtPilotResourceKey.SfxIcon);
        const selectorNode = this.pauseContentRoot.getChildByName('BgmSelector');
        if (selectorNode) {
            const obsoleteSelectorArt = selectorNode.getChildByName('BgmSelectorPanelArt');
            if (obsoleteSelectorArt) {
                obsoleteSelectorArt.removeFromParent();
                obsoleteSelectorArt.destroy();
            }
            const selectorGraphics = selectorNode.getComponent(Graphics);
            if (selectorGraphics) selectorGraphics.enabled = true;
        }
        for (const option of this.bgmStyleOptions.values()) {
            option.musicIconSprite = this.applyChildSprite(
                option.root,
                'CardMusicIconSprite',
                ArtPilotResourceKey.MusicIcon,
                38,
                38,
                -173,
                0,
            );
            option.backgroundSprite = this.applyTacticRegionSprite(
                option.root,
                'CardBackgroundSprite',
                option.track.id === this.audioManager.getSelectedBgmId()
                    ? ArtPilotResourceKey.LevelCardSelected
                    : ArtPilotResourceKey.LevelCardUnlocked,
                400,
                68,
                true,
                18,
            );
            option.backgroundSprite?.node.setSiblingIndex(0);
            option.musicIconSprite?.node.setSiblingIndex(1);
            option.touchArea.setSiblingIndex(option.root.children.length - 1);
        }
        this.applyGenericButtonSkins();
        this.applyPauseFormalStyles();
        this.refreshBgmTrackSelector();
    }

    private applyVolumeControlArt(control: VolumeControlView | undefined, iconKey: ArtPilotResourceKey): void {
        if (!control) return;
        const icon = this.applyChildSprite(control.muteButton.node, 'AudioIconArt', iconKey, 30, 30);
        const track = this.applyChildSprite(control.trackNode, 'SliderTrackArt',
            ArtPilotResourceKey.VolumeSliderTrack, control.trackWidth, 33);
        const knob = this.applyChildSprite(control.knobNode, 'SliderKnobArt', ArtPilotResourceKey.VolumeSliderKnob, 26, 26);
        control.muteIconSprite = icon;
        control.formalIconReady = !!icon;
        control.formalTrackReady = !!track;
        control.formalKnobReady = !!knob;
        control.muteButton.label.string = '';
        control.muteButton.graphics.enabled = !icon;
        control.fallbackMuteIconNode.active = !icon;
        control.trackGraphics.enabled = !track;
        control.knobGraphics.enabled = !knob;
        if (track) track.node.setSiblingIndex(0);
        control.fillClipNode.setSiblingIndex(1);
        control.knobNode.setSiblingIndex(2);
        if (knob) knob.node.setSiblingIndex(0);
        const genericMuteArt = control.muteButton.node.getChildByName('ButtonArt');
        if (genericMuteArt) genericMuteArt.active = false;
        this.refreshAudioVolumeControls();
    }

    private applyPauseFormalStyles(): void {
        if (!this.pauseContentRoot) return;
        const title = this.pauseContentRoot.getChildByName('PauseTitle')?.getComponent(Label);
        const hint = this.pauseContentRoot.getChildByName('PauseHint')?.getComponent(Label);
        if (title) {
            title.fontSize = 34;
            title.lineHeight = 40;
            this.configureSingleLineLabel(title, UI_TEXT_PRIMARY);
        }
        if (hint) {
            hint.fontSize = 16;
            hint.lineHeight = 21;
            this.configureSingleLineLabel(hint, UI_TEXT_SECONDARY);
        }
        const actionNames = ['ResumeButton', 'PauseRestartButton', 'HelpButton', 'ReturnTitleButton'];
        for (const name of actionNames) {
            const node = this.pauseContentRoot.getChildByName(name);
            const graphics = node?.getComponent(Graphics);
            const label = node?.getChildByName('Text')?.getComponent(Label);
            if (node && graphics) {
                const size = node.getComponent(UITransform)!.contentSize;
                const art = this.applyChildSprite(node, 'ButtonArt', ArtPilotResourceKey.ButtonSecondary, size.width, size.height);
                if (art) graphics.enabled = false;
            }
            if (label && node) {
                label.fontSize = 20;
                label.lineHeight = 25;
                this.resizeAndPositionLabel(label, 0, 0,
                    node.getComponent(UITransform)!.contentSize.width - 16,
                    node.getComponent(UITransform)!.contentSize.height - 8);
                this.configureSingleLineLabel(label, UI_TEXT_PRIMARY);
            }
        }
        const bgmSelector = this.pauseContentRoot.getChildByName('BgmSelector');
        const bgmTitle = bgmSelector?.getChildByName('BgmTrackTitle')?.getComponent(Label);
        const bgmHint = bgmSelector?.getChildByName('BgmTrackHint')?.getComponent(Label);
        if (bgmTitle) {
            this.applyTargetTypography(bgmTitle, 'BgmSectionTitle');
        }
        if (bgmHint) {
            this.applyTargetTypography(bgmHint, 'BgmSectionHint');
        }
        this.refreshBgmTrackSelector();
        for (const control of [this.musicVolumeControl, this.sfxVolumeControl]) {
            if (!control) continue;
            const title = control.root.getChildByName(`${control.root.name}Title`)?.getComponent(Label);
            if (title) {
                this.applyTargetTypography(title, 'VolumeTitle');
            }
            this.applyTargetTypography(control.percentLabel, 'VolumePercent');
            for (const node of control.root.children) {
                const buttonLabel = node.getChildByName('Text')?.getComponent(Label);
                if (buttonLabel) {
                    this.applyTargetTypography(buttonLabel, 'VolumeButton');
                }
            }
        }
    }

    private createBgmTrackSelector(parent: Node, y: number): void {
        const selector = this.createGraphicsNode('BgmSelector', PAUSE_SETTINGS_ROW_WIDTH, PAUSE_BGM_ROW_HEIGHT, 0, y, parent);
        const graphics = selector.getComponent(Graphics)!;
        graphics.fillColor = new Color(255, 247, 220, 224);
        graphics.roundRect(-PAUSE_SETTINGS_ROW_WIDTH / 2, -PAUSE_BGM_ROW_HEIGHT / 2,
            PAUSE_SETTINGS_ROW_WIDTH, PAUSE_BGM_ROW_HEIGHT, 16);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(194, 146, 68, 210);
        graphics.roundRect(-PAUSE_SETTINGS_ROW_WIDTH / 2 + 0.75, -PAUSE_BGM_ROW_HEIGHT / 2 + 0.75,
            PAUSE_SETTINGS_ROW_WIDTH - 1.5, PAUSE_BGM_ROW_HEIGHT - 1.5, 15);
        graphics.stroke();
        const title = this.createLabel(selector, 'BgmTrackTitle', '背景音乐风格', -111, 82, 176, 30, 22,
            new Color(74, 56, 39, 255));
        this.applyTargetTypography(title, 'BgmSectionTitle');
        const hint = this.createLabel(selector, 'BgmTrackHint', '点击卡片立即试听并保存', 95, 82, 208, 24, 14,
            new Color(116, 100, 82, 255));
        this.applyTargetTypography(hint, 'BgmSectionHint');

        const cardsContainer = new Node('BgmStyleCards');
        cardsContainer.setParent(selector);
        cardsContainer.setPosition(0, 0, 0);
        cardsContainer.addComponent(UITransform).setContentSize(400, 146);
        const tracks = this.audioManager.getAvailableBgmTracks();
        for (let index = 0; index < tracks.length; index += 1) {
            const track = tracks[index];
            const option = this.createBgmStyleOption(cardsContainer, track, 0, index === 0 ? 24 : -54);
            this.bgmStyleOptions.set(track.id, option);
        }
        this.refreshBgmTrackSelector();
    }

    private createBgmStyleOption(
        parent: Node,
        track: BgmTrackConfig,
        x: number,
        y: number,
    ): BgmStyleOptionView {
        const root = this.createGraphicsNode(`BgmStyle_${track.id}`, 400, 68, x, y, parent);
        const optionGraphics = root.getComponent(Graphics)!;
        const titleLabel = this.createLabel(root, 'Title', track.displayName, -10, 18, 236, 22, 18,
            new Color(74, 56, 39, 255));
        this.applyTargetTypography(titleLabel, 'BgmCardTitle');
        const subtitleLabel = this.createLabel(root, 'Subtitle', track.subtitle, -10, 0, 236, 18, 14,
            new Color(100, 87, 61, 255));
        this.applyTargetTypography(subtitleLabel, 'BgmCardBody');
        const auxiliaryLabel = this.createLabel(root, 'Auxiliary', track.auxiliaryName ?? '', -10, -18, 236, 16, 12,
            new Color(120, 96, 57, 230));
        this.applyTargetTypography(auxiliaryLabel, 'BgmCardSource');
        const statusLabel = this.createLabel(root, 'Status', '', 156, -12, 66, 20, 13,
            new Color(126, 84, 25, 255));
        this.applyTargetTypography(statusLabel, 'BgmCardState');
        const checkNode = this.createGraphicsNode('SelectedCheck', 22, 22, 178, 17, root);
        const checkGraphics = checkNode.getComponent(Graphics)!;
        const checkLabel = this.createLabel(checkNode, 'Check', '✓', 0, 0, 18, 18, 13, Color.WHITE);
        this.applyTargetTypography(checkLabel, 'BgmCardState', Color.WHITE);
        const touchArea = new Node('TouchArea');
        touchArea.setParent(root);
        touchArea.addComponent(UITransform).setContentSize(400, 68);
        touchArea.on(NodeEventType.TOUCH_START, () => root.setScale(0.985, 0.985, 1), this);
        touchArea.on(NodeEventType.TOUCH_CANCEL, () => root.setScale(1, 1, 1), this);
        touchArea.on(NodeEventType.TOUCH_END, () => {
            root.setScale(1, 1, 1);
            this.audioManager.activateAudio();
            this.audioManager.selectBgmTrack(track.id);
            this.audioManager.playSfx('ui_click');
            this.refreshBgmTrackSelector();
            this.refreshAudioUnlockHint();
        }, this);
        touchArea.setSiblingIndex(root.children.length - 1);
        return {
            track,
            root,
            graphics: optionGraphics,
            titleLabel,
            subtitleLabel,
            auxiliaryLabel,
            statusLabel,
            checkNode,
            checkGraphics,
            checkLabel,
            touchArea,
            backgroundSprite: undefined,
            musicIconSprite: undefined,
        };
    }

    private refreshBgmTrackSelector(): void {
        const selectedId = this.audioManager.getSelectedBgmId();
        for (const option of this.bgmStyleOptions.values()) {
            const selected = option.track.id === selectedId;
            const graphics = option.graphics;
            graphics.clear();
            const formalFrame = this.artResourceManager.getFrame(selected
                ? ArtPilotResourceKey.LevelCardSelected
                : ArtPilotResourceKey.LevelCardUnlocked);
            if (option.backgroundSprite && formalFrame) {
                option.backgroundSprite.spriteFrame = formalFrame;
                option.backgroundSprite.node.active = true;
                option.backgroundSprite.node.setSiblingIndex(0);
                graphics.enabled = false;
            } else {
                graphics.enabled = true;
                graphics.fillColor = selected
                    ? new Color(255, 244, 192, 255)
                    : new Color(240, 249, 232, 255);
                graphics.roundRect(-200, -34, 400, 68, 14);
                graphics.fill();
                graphics.lineWidth = selected ? 3 : 2;
                graphics.strokeColor = selected
                    ? new Color(229, 174, 43, 255) : new Color(89, 177, 176, 220);
                graphics.roundRect(-199, -33, 398, 66, 13);
                graphics.stroke();
                graphics.lineWidth = 1;
                graphics.strokeColor = selected
                    ? new Color(188, 137, 26, 180) : new Color(85, 165, 145, 170);
                graphics.moveTo(-148, -25);
                graphics.lineTo(-148, 25);
                graphics.moveTo(120, -25);
                graphics.lineTo(120, 25);
                graphics.stroke();
            }
            option.statusLabel.string = selected ? '当前使用' : '点击试听';
            option.checkNode.active = selected;
            option.checkGraphics.clear();
            if (selected) {
                option.checkGraphics.fillColor = new Color(226, 171, 38, 255);
                option.checkGraphics.circle(0, 0, 10);
                option.checkGraphics.fill();
                option.checkGraphics.lineWidth = 1.5;
                option.checkGraphics.strokeColor = new Color(255, 247, 205, 255);
                option.checkGraphics.circle(0, 0, 10);
                option.checkGraphics.stroke();
            }
            option.root.setScale(1, 1, 1);
            option.touchArea.setSiblingIndex(option.root.children.length - 1);
        }
    }

    private resumeGame(): void {
        if (!this.isPaused) {
            return;
        }
        this.setBattleTweensPaused(false);
        this.isPaused = false;
        this.resetAllTacticCardPressStates(true);
        this.audioManager.setBattlePaused(false);
        this.helpPanel.active = false;
        this.pausePanel.active = false;
        this.pauseButton.node.active = true;
        this.resetLaneLivenessTimers();
        this.refreshLaneSpawnMarkers();
        this.updatePilotAIGate(0);
        this.refreshHud('\u5DF2\u7EE7\u7EED\u6218\u6597\u3002');
    }

    private createVolumeControl(
        parent: Node,
        name: string,
        channel: AudioChannel,
        title: string,
        y: number,
        accent: Color,
    ): VolumeControlView {
        const root = this.createGraphicsNode(name, PAUSE_SETTINGS_ROW_WIDTH, PAUSE_VOLUME_ROW_HEIGHT, 0, y, parent);
        const background = root.getComponent(Graphics)!;
        background.fillColor = new Color(250, 239, 207, 174);
        background.roundRect(-PAUSE_SETTINGS_ROW_WIDTH / 2, -PAUSE_VOLUME_ROW_HEIGHT / 2,
            PAUSE_SETTINGS_ROW_WIDTH, PAUSE_VOLUME_ROW_HEIGHT, 13);
        background.fill();
        background.lineWidth = 1.5;
        background.strokeColor = new Color(167, 118, 62, 165);
        background.roundRect(-PAUSE_SETTINGS_ROW_WIDTH / 2 + 0.75, -PAUSE_VOLUME_ROW_HEIGHT / 2 + 0.75,
            PAUSE_SETTINGS_ROW_WIDTH - 1.5, PAUSE_VOLUME_ROW_HEIGHT - 1.5, 12);
        background.stroke();

        const titleLabel = this.createLabel(root, `${name}Title`, title, -185, 0, 54, 40, 18, UI_TEXT_PRIMARY);
        this.applyTargetTypography(titleLabel, 'VolumeTitle');
        const muteButton = this.createButton(root, `${name}Mute`, '', -139, 0, 38, 40, 20, () => {
            if (channel === 'music') {
                this.audioManager.toggleMusicMute();
            } else {
                this.audioManager.toggleSfxMute();
            }
            this.refreshAudioVolumeControls();
            this.refreshAudioUnlockHint();
        });
        const minusButton = this.createButton(root, `${name}Minus`, '\u2212', -99, 0, 34, 40, 20, () => {
            this.adjustAudioVolume(channel, -5);
        });
        const plusButton = this.createButton(root, `${name}Plus`, '+', 125, 0, 34, 40, 20, () => {
            this.adjustAudioVolume(channel, 5);
        });
        this.applyTargetTypography(minusButton.label, 'VolumeButton');
        this.applyTargetTypography(plusButton.label, 'VolumeButton');
        this.drawButton(muteButton, new Color(241, 224, 181, 255), new Color(accent.r, accent.g, accent.b, 220));
        this.drawButton(minusButton, new Color(241, 224, 181, 255), new Color(167, 118, 62, 220));
        this.drawButton(plusButton, new Color(241, 224, 181, 255), new Color(167, 118, 62, 220));

        const trackWidth = 176;
        const valueWidth = 146;
        const trackNode = this.createGraphicsNode(`${name}Track`, trackWidth, 42, 15, 0, root);
        const trackGraphics = trackNode.getComponent(Graphics)!;
        trackGraphics.fillColor = new Color(99, 87, 72, 180);
        trackGraphics.roundRect(-trackWidth / 2, -7, trackWidth, 14, 7);
        trackGraphics.fill();
        trackGraphics.lineWidth = 2;
        trackGraphics.strokeColor = new Color(127, 99, 67, 230);
        trackGraphics.roundRect(-trackWidth / 2, -7, trackWidth, 14, 7);
        trackGraphics.stroke();

        const fillClipNode = new Node(`${name}FillClip`);
        fillClipNode.setParent(trackNode);
        fillClipNode.setPosition(0, 0, 0);
        fillClipNode.addComponent(UITransform).setContentSize(valueWidth, 12);
        const fillMask = fillClipNode.addComponent(Mask);
        fillMask.type = Mask.Type.GRAPHICS_RECT;
        const fillNode = this.createGraphicsNode(`${name}Fill`, valueWidth, 12, -valueWidth / 2, 0, fillClipNode);
        const fillGraphics = fillNode.getComponent(Graphics)!;
        fillGraphics.fillColor = accent;
        fillGraphics.roundRect(0, -5, valueWidth, 10, 5);
        fillGraphics.fill();

        const knobNode = this.createGraphicsNode(`${name}Knob`, 28, 28, -valueWidth / 2, 0, trackNode);
        const knobGraphics = knobNode.getComponent(Graphics)!;
        knobGraphics.fillColor = new Color(241, 247, 252, 255);
        knobGraphics.circle(0, 0, 11);
        knobGraphics.fill();
        knobGraphics.lineWidth = 3;
        knobGraphics.strokeColor = accent;
        knobGraphics.circle(0, 0, 11);
        knobGraphics.stroke();

        const fallbackMuteIconNode = this.createGraphicsNode(`${name}FallbackAudioIcon`, 30, 30, 0, 0, muteButton.node);
        const fallbackMuteIconGraphics = fallbackMuteIconNode.getComponent(Graphics)!;

        const percentLabel = this.createLabel(
            root,
            `${name}Percent`,
            '0%',
            181,
            0,
            52,
            40,
            18,
            UI_TEXT_PRIMARY,
        );
        this.applyTargetTypography(percentLabel, 'VolumePercent');

        const control: VolumeControlView = {
            channel,
            root,
            accent,
            trackNode,
            trackGraphics,
            fillClipNode,
            fillNode,
            knobNode,
            knobGraphics,
            fallbackMuteIconNode,
            fallbackMuteIconGraphics,
            percentLabel,
            muteButton,
            trackWidth,
            valueWidth,
            formalTrackReady: false,
            formalKnobReady: false,
            formalIconReady: false,
            dragging: false,
        };
        this.drawFallbackAudioIcon(control, false);
        trackNode.on(NodeEventType.TOUCH_START, (event: EventTouch) => {
            control.dragging = true;
            this.setVolumeFromTouch(control, event);
        }, this);
        trackNode.on(NodeEventType.TOUCH_MOVE, (event: EventTouch) => {
            if (control.dragging) {
                this.setVolumeFromTouch(control, event);
            }
        }, this);
        trackNode.on(NodeEventType.TOUCH_END, (event: EventTouch) => {
            this.setVolumeFromTouch(control, event);
            control.dragging = false;
            if (control.channel === 'sfx' && this.audioManager.getSfxVolume() > 0) {
                this.audioManager.playSfx('ui_click');
            }
        }, this);
        trackNode.on(NodeEventType.TOUCH_CANCEL, () => {
            control.dragging = false;
        }, this);
        return control;
    }

    private drawFallbackAudioIcon(control: VolumeControlView, muted: boolean): void {
        const graphics = control.fallbackMuteIconGraphics;
        graphics.clear();
        graphics.fillColor = muted ? new Color(137, 126, 108, 255) : control.accent;
        graphics.moveTo(-10, -4);
        graphics.lineTo(-5, -4);
        graphics.lineTo(2, -10);
        graphics.lineTo(2, 10);
        graphics.lineTo(-5, 4);
        graphics.lineTo(-10, 4);
        graphics.close();
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = muted ? new Color(137, 126, 108, 255) : control.accent;
        graphics.arc(3, 0, 6, -0.8, 0.8, false);
        graphics.stroke();
        if (muted) {
            graphics.lineWidth = 3;
            graphics.strokeColor = new Color(141, 65, 54, 255);
            graphics.moveTo(-9, 10);
            graphics.lineTo(10, -9);
            graphics.stroke();
        }
    }

    private adjustAudioVolume(channel: AudioChannel, deltaPercent: number): void {
        const current = channel === 'music'
            ? this.audioManager.getMusicVolume()
            : this.audioManager.getSfxVolume();
        const currentPercent = Math.round(current * 100);
        this.setAudioVolume(channel, currentPercent + deltaPercent);
    }

    private setVolumeFromTouch(control: VolumeControlView, event: EventTouch): void {
        const location = event.getUILocation();
        const local = control.trackNode.getComponent(UITransform)!.convertToNodeSpaceAR(
            new Vec3(location.x, location.y, 0),
        );
        const ratio = Math.max(0, Math.min(1, (local.x + control.valueWidth / 2) / control.valueWidth));
        this.setAudioVolume(control.channel, Math.round(ratio * 100));
    }

    private setAudioVolume(channel: AudioChannel, percent: number): void {
        const normalized = Math.max(0, Math.min(100, Math.round(percent))) / 100;
        if (channel === 'music') {
            this.audioManager.setMusicVolume(normalized);
        } else {
            this.audioManager.setSfxVolume(normalized);
        }
        this.refreshAudioVolumeControls();
        this.refreshAudioUnlockHint();
    }

    private refreshAudioVolumeControls(): void {
        if (!this.musicVolumeControl || !this.sfxVolumeControl) {
            return;
        }
        this.refreshAudioVolumeControl(this.musicVolumeControl, this.audioManager.getMusicVolume());
        this.refreshAudioVolumeControl(this.sfxVolumeControl, this.audioManager.getSfxVolume());
    }

    private refreshAudioVolumeControl(control: VolumeControlView, volume: number): void {
        const ratio = Math.max(0, Math.min(1, volume));
        const percentage = Math.round(ratio * 100);
        control.percentLabel.string = `${percentage}%`;
        control.percentLabel.color = percentage > 0
            ? UI_TEXT_PRIMARY : UI_TEXT_SECONDARY;
        control.muteButton.label.string = '';
        control.fillNode.setScale(Math.max(0.0001, ratio), 1, 1);
        control.fillNode.active = percentage > 0;
        control.knobNode.setPosition(-control.valueWidth / 2 + control.valueWidth * ratio, 0, 0);
        if (control.muteIconSprite) {
            control.muteIconSprite.color = percentage > 0 ? Color.WHITE : new Color(145, 145, 145, 255);
            const opacity = control.muteIconSprite.node.getComponent(UIOpacity)
                ?? control.muteIconSprite.node.addComponent(UIOpacity);
            opacity.opacity = percentage > 0 ? 255 : 135;
        }
        control.fallbackMuteIconNode.active = !control.formalIconReady;
        this.drawFallbackAudioIcon(control, percentage === 0);
        if (!control.formalIconReady) {
            control.muteButton.graphics.enabled = true;
            this.drawButton(
                control.muteButton,
                percentage > 0 ? new Color(241, 224, 181, 255) : new Color(220, 211, 190, 255),
                percentage > 0 ? control.accent : new Color(137, 126, 108, 255),
            );
        }
    }

    private openHelpPanel(): void {
        if (!this.isPaused) {
            return;
        }
        this.pausePanel.active = false;
        this.refreshHelpText();
        this.refreshLevelOneTutorialReplayButton();
        this.showModal(this.helpPanel);
    }

    private refreshHelpText(): void {
        if (!this.helpTextLabel) return;
        const baseText = '• 选择兵种后，点击对应道路出兵。\n'
            + '• 能量用于出兵；占领补给点可获得补给。\n'
            + '• 补给可使用战术；摧毁敌方基地获胜。';
        this.helpTextLabel.string = this.currentLevel === 4
            ? `${baseText}\n• 第2路泥泞：双方移速－30%；第3路花径：羊方减伤12%。\n• 道路冻结：选路后冻结该路敌人${FREEZE_DURATION_SECONDS}秒。`
            : this.currentLevel === 5
                ? `${baseText}\n• 本关双方能量高速恢复，小羊可持续下达部署命令。\n• 能量涌流：${ENERGY_SURGE_DURATION_SECONDS}秒内能量恢复速度翻倍。`
                : this.currentLevel === 6
                    ? `${baseText}\n• 黄金补给线12秒首次出现，之后每20秒轮换，生效14秒。\n• 补给强化：下一次黄金占领与守点奖励各额外+1。`
                    : baseText;
        this.helpTextLabel.fontSize = this.currentLevel >= 4 ? 16 : 19;
        this.helpTextLabel.lineHeight = this.currentLevel >= 4 ? 20 : 23;
        this.helpTextLabel.enableWrapText = true;
        this.helpTextLabel.overflow = Label.Overflow.CLAMP;
        this.helpTextLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        this.refreshLevelOneTutorialReplayButton();
    }

    private closeHelpPanel(): void {
        if (this.replayLevelOneTutorialConfirmPanel?.isValid) {
            this.replayLevelOneTutorialConfirmPanel.active = false;
        }
        this.helpPanel.active = false;
        if (this.isPaused) {
            this.refreshAudioVolumeControls();
            this.showModal(this.pausePanel);
        }
    }

    private refreshLevelOneTutorialReplayButton(): void {
        if (!this.replayLevelOneTutorialButton?.node?.isValid) return;
        this.replayLevelOneTutorialButton.node.active = this.currentLevel === 1 && this.isPaused;
    }

    private requestLevelOneTutorialReplay(): void {
        if (this.currentLevel !== 1 || !this.isPaused) return;
        this.showModal(this.replayLevelOneTutorialConfirmPanel);
    }

    private cancelLevelOneTutorialReplay(): void {
        if (!this.replayLevelOneTutorialConfirmPanel?.isValid) return;
        this.replayLevelOneTutorialConfirmPanel.active = false;
        if (this.helpPanel?.isValid) this.showModal(this.helpPanel);
    }

    private confirmLevelOneTutorialReplay(): void {
        if (this.currentLevel !== 1 || !this.isPaused) {
            this.cancelLevelOneTutorialReplay();
            return;
        }
        this.replayLevelOneTutorialConfirmPanel.active = false;
        this.helpPanel.active = false;
        this.pausePanel.active = false;
        this.setBattleTweensPaused(false);
        this.isPaused = false;
        this.audioManager.setBattlePaused(false);
        this.restartGame();
        this.beginLevelOneTutorial();
    }

    private setBattleTweensPaused(paused: boolean): void {
        const toggleTween = paused ? Tween.pauseAllByTarget : Tween.resumeAllByTarget;
        for (const unit of [...this.units, ...this.dyingUnits]) {
            toggleTween(unit.node);
        }
        if (this.tacticNotice) {
            toggleTween(this.tacticNotice);
        }
        if (this.tacticNoticeOpacity) {
            toggleTween(this.tacticNoticeOpacity);
        }
        if (this.levelFiveRushNotice) toggleTween(this.levelFiveRushNotice);
        if (this.levelFiveRushNoticeOpacity) toggleTween(this.levelFiveRushNoticeOpacity);
        toggleTween(this.battleLayer);
    }

    private returnToTitle(): void {
        this.isStarted = false;
        this.restartGame();
        this.isPaused = false;
        this.startMenuActionLocked = false;
        this.resetAllTacticCardPressStates(true, true);
        this.audioManager.setBattlePaused(false);
        this.audioManager.requestMenuBgm();
        this.audioManager.stopBattleSfx();
        this.pauseButton.node.active = false;
        this.levelBadge.active = false;
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        if (this.replayLevelOneTutorialConfirmPanel?.isValid) {
            this.replayLevelOneTutorialConfirmPanel.active = false;
        }
        this.tutorialPanel.active = false;
        this.specialRoadTutorialPanel.active = false;
        this.levelFiveTutorialPanel.active = false;
        this.tacticDeckPanel.active = false;
        this.levelSelectPanel.active = false;
        this.prepareLevelSelection();
        this.showModal(this.startPanel);
        this.statusToast.active = false;
        this.refreshStartPanel();
    }

    private drawModalBackground(panel: Node, cardWidth: number, cardHeight: number): void {
        if (!panel.getComponent(BlockInputEvents)) {
            panel.addComponent(BlockInputEvents);
        }
        const backdropColor = new Color(8, 14, 24, 218);
        const backdrop = this.createGraphicsNode('FullscreenBackdrop', this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight, 0, 0, panel);
        this.fullscreenBackdropColors.set(backdrop, backdropColor);
        this.redrawFullscreenBackdrop(backdrop, backdropColor);
        backdrop.setSiblingIndex(0);

        const card = this.createGraphicsNode('ModalCardBackground', cardWidth, cardHeight, 0, 0, panel);
        const cardGraphics = card.getComponent(Graphics)!;
        cardGraphics.fillColor = new Color(22, 34, 52, 250);
        cardGraphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 30);
        cardGraphics.fill();
        cardGraphics.lineWidth = 4;
        cardGraphics.strokeColor = new Color(217, 235, 251, 255);
        cardGraphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 30);
        cardGraphics.stroke();
        card.setSiblingIndex(1);
    }

    private drawModalBackdropOnly(panel: Node): void {
        if (!panel.getComponent(BlockInputEvents)) {
            panel.addComponent(BlockInputEvents);
        }
        const backdropColor = new Color(8, 14, 24, 205);
        const backdrop = this.createGraphicsNode('FullscreenBackdrop', this.screenMetrics.visibleWidth,
            this.screenMetrics.visibleHeight, 0, 0, panel);
        this.fullscreenBackdropColors.set(backdrop, backdropColor);
        this.redrawFullscreenBackdrop(backdrop, backdropColor);
        backdrop.setSiblingIndex(0);
    }

    private showModal(panel: Node): void {
        this.ensureOverlayLayerOrder();
        this.modalLayer.setSiblingIndex(this.node.children.length - 1);
        panel.setSiblingIndex(this.modalLayer.children.length - 1);
        panel.active = true;
        this.refreshAudioUnlockHint();
    }

    private beginBattle(): void {
        this.enforceMandatoryLevelOneGateSelection();
        this.audioManager.unlockAudio();
        this.audioManager.requestMenuBgm();
        this.audioManager.preloadBattleBgm();
        if (ART_FULL_ENABLED) {
            void this.beginBattleAfterArtLoad();
            return;
        }
        this.enterBattleFlow();
    }

    private async beginBattleAfterArtLoad(): Promise<void> {
        if (this.battleArtPreparing) return;
        this.battleArtPreparing = true;
        if (this.artLoadingPanel) {
            Tween.stopAllByTarget(this.artLoadingPanel.getComponent(UIOpacity)!);
            this.artLoadingPanel.getComponent(UIOpacity)!.opacity = 255;
            this.artLoadingPanel.active = true;
            this.artLoadingPanel.setSiblingIndex(this.modalLayer.children.length - 1);
            this.resetArtLoadingProgress();
            this.updateArtLoadingProgress(0, 1);
        }
        const summary = await this.artResourceManager.preloadGroups(
            ['battle-core', 'unit-small', 'vfx-core'],
            (completed, total) => this.updateArtLoadingProgress(completed, total),
        );
        if (!this.node.isValid) return;
        this.applyPilotStaticArt();
        this.finishArtLoading(summary.failed.length, () => {
            this.battleArtPreparing = false;
            this.enterBattleFlow();
        });
    }

    private enterBattleFlow(): void {
        this.enforceMandatoryLevelOneGateSelection();
        this.startPanel.active = false;
        this.applyLevelStartingResources();
        if (this.currentLevel === 4) {
            this.freezeUnlocked = true;
            if (!this.specialRoadTutorialSeen) {
                this.showModal(this.specialRoadTutorialPanel);
            } else {
                this.showTacticDeckSelection();
            }
            return;
        }
        if (this.currentLevel === 5) {
            this.freezeUnlocked = true;
            if (!this.levelFiveTutorialSeen) {
                this.showModal(this.levelFiveTutorialPanel);
            } else {
                this.showTacticDeckSelection();
            }
            return;
        }
        if (this.currentLevel === 6) {
            this.freezeUnlocked = true;
            this.showTacticDeckSelection();
            return;
        }
        this.activateBattle();
        if (this.currentLevel === 1 && !this.levelOneTutorialCompleted) {
            this.beginLevelOneTutorial();
        }
    }

    private activateBattle(): void {
        this.isStarted = true;
        this.isPaused = false;
        this.audioManager.setBattlePaused(false);
        this.audioManager.requestBattleBgm();
        const level = this.getCurrentLevelConfig();
        this.aiDecisionCooldown = level.aiInitialDecisionDelay;
        this.battleElapsedSeconds = 0;
        this.applyCurrentTacticDeckLayout();
        this.refreshLaneEffectVisuals();
        this.pauseButton.node.active = true;
        this.updatePilotAIGate(0);
        this.refreshBattleLevelBadge();
        this.levelBadge.active = true;
        const openingHint = level.id === 1
            ? '\u9009\u62E9\u5175\u79CD\uFF0C\u70B9\u51FB\u5BF9\u5E94\u9053\u8DEF\u4EFB\u610F\u4F4D\u7F6E\u51FA\u5175\uFF1B\u5355\u4F4D\u4F1A\u4ECE\u672C\u65B9\u5165\u53E3\u51FA\u53D1\u3002'
            : `\u7B2C ${level.id} \u5173\u5F00\u59CB\uFF1A${level.title}\u3002`;
        this.refreshHud(openingHint);
    }

    private isLevelFiveContinuousSmallDefinition(definition: UnitDefinition): boolean {
        return this.getCurrentLevelConfig().continuousSmallUnitDeployment === true
            && definition.type === SheepType.Small;
    }

    private getPendingSmallDeploymentCount(team: Team, lane: number): number {
        return this.pendingSmallDeployments[team]?.[lane] ?? 0;
    }

    private getLaneCombinedActiveUnitCount(lane: number): number {
        return this.getLaneFormation(Team.Player, lane).length
            + this.getLaneFormation(Team.AI, lane).length;
    }

    private enqueueSmallDeployment(team: Team, lane: number): void {
        this.pendingSmallDeployments[team][lane] += 1;
    }

    private clearPendingSmallDeployments(): void {
        for (const teamQueues of this.pendingSmallDeployments) teamQueues.fill(0);
        this.pendingSmallDeploymentLaneCursor = 0;
    }

    private processPendingSmallDeployments(): void {
        if (this.currentLevel !== 5 || this.isPaused || this.isFinished || !this.isStarted) return;
        let spawned = 0;
        const slots = LANE_X.length * 2;
        for (let offset = 0; offset < slots && spawned < LEVEL_FIVE_PENDING_SPAWNS_PER_FRAME; offset += 1) {
            const slot = (this.pendingSmallDeploymentLaneCursor + offset) % slots;
            const team = slot < LANE_X.length ? Team.Player : Team.AI;
            const lane = slot % LANE_X.length;
            if (this.getPendingSmallDeploymentCount(team, lane) <= 0) continue;
            const definition = UNIT_DEFINITIONS[SheepType.Small];
            if (!this.canSpawnUnitInLane(team, lane, definition)) continue;
            if (!this.spawnUnit(team, lane, definition)) continue;
            this.pendingSmallDeployments[team][lane] -= 1;
            spawned += 1;
        }
        this.pendingSmallDeploymentLaneCursor = (this.pendingSmallDeploymentLaneCursor + 1) % slots;
    }

    private issueLevelFiveSmallDeployment(team: Team, lane: number): boolean {
        const definition = UNIT_DEFINITIONS[SheepType.Small];
        const currentEnergy = team === Team.Player ? this.playerEnergy : this.aiEnergy;
        if (currentEnergy < definition.cost) return false;
        if (team === Team.Player) this.playerEnergy -= definition.cost;
        else this.aiEnergy -= definition.cost;
        const spawnedImmediately = this.spawnUnit(team, lane, definition);
        if (!spawnedImmediately) this.enqueueSmallDeployment(team, lane);
        if (team === Team.Player) {
            this.audioManager.playSfx('deploy');
            this.recordLevelFivePlayerDeployment(lane);
            const pending = this.getPendingSmallDeploymentCount(team, lane);
            this.refreshHud(pending > 0
                ? `第${lane + 1}线已接收小羊命令 · 待部署${pending}`
                : `第${lane + 1}线派出小羊 · 消耗${definition.cost}能量`);
        } else {
            if (ART_PILOT_ENABLED && (ART_FULL_ENABLED || lane === ART_PILOT_LANE_INDEX)) {
                this.aiSpawnGateSelectedRemaining[lane] = 0.18;
            }
            this.showAIDeployNotice(lane, SheepType.Small);
        }
        return true;
    }

    private tryDeploySelectedUnit(lane: number): boolean {
        const tutorialExpected = this.tutorialFlowActive
            ? LEVEL_ONE_TUTORIAL_DEPLOYMENTS[this.tutorialDeploymentIndex] : undefined;
        if (this.tutorialFlowActive && (this.tutorialProgress !== 'deploy-four-sheep'
            || LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] !== 'deploy-four-sheep'
            || !tutorialExpected)) return false;
        if (!this.isStarted || this.isFinished || this.isPaused) {
            return false;
        }

        const selectedType = this.selectedSheepType;
        if (!selectedType) {
            this.refreshHud('请先选择出兵单位。');
            return false;
        }
        if (this.tutorialFlowActive && (selectedType !== tutorialExpected?.type || lane !== tutorialExpected.lane
            || this.tutorialCompletedDeploymentTypes.has(selectedType)
            || this.tutorialCompletedDeploymentLanes.has(lane))) {
            this.refreshHud(`请按任务顺序选择${this.getUnitDisplayName(tutorialExpected!.type, Team.Player)}并派往第${tutorialExpected!.lane + 1}线。`);
            return false;
        }
        const definition = UNIT_DEFINITIONS[selectedType];
        if (!this.isUnitTypeUnlocked(selectedType)) {
            this.showStatusToast(`${this.getUnitDisplayName(selectedType, Team.Player)}尚未解锁。`);
            return false;
        }
        if (this.isLevelFiveContinuousSmallDefinition(definition)) {
            if (this.playerEnergy < definition.cost) {
                this.triggerDeployFailureFeedback(lane);
                const missing = Math.max(1, Math.ceil(definition.cost - this.playerEnergy));
                this.refreshHud(`能量不足，还差${missing}点`);
                return false;
            }
            const deployed = this.issueLevelFiveSmallDeployment(Team.Player, lane);
            this.refreshLaneSpawnMarkers();
            return deployed;
        }
        if (this.getLaneUnitCount(Team.Player, lane) >= TEAM_MAX_UNITS_PER_LANE) {
            this.showLaneQueueFull(lane);
            this.triggerDeployFailureFeedback(lane);
            this.refreshHud(`第${lane + 1}线已满`);
            return false;
        }
        if (!this.canSpawnUnitInLane(Team.Player, lane, definition)) {
            this.showLaneQueueFull(lane);
            this.triggerDeployFailureFeedback(lane);
            this.refreshHud(`第${lane + 1}线已满`);
            return false;
        }
        if (this.getActiveUnitCount(Team.Player) >= PLAYER_MAX_ACTIVE_UNITS) {
            this.triggerDeployFailureFeedback(lane);
            this.refreshHud('\u5DF1\u65B9\u5DF2\u8FBE\u5230 8 \u4E2A\u5B58\u6D3B\u5355\u4F4D\u4E0A\u9650\u3002');
            return false;
        }

        if (this.playerSpawnCooldown > 0) {
            this.triggerDeployFailureFeedback(lane);
            this.refreshHud('出兵操作过快，请稍候。');
            return false;
        }
        const tutorialEnergySubsidy = this.tutorialFlowActive
            ? this.grantLevelOneTutorialEnergySubsidy(selectedType) : 0;
        if (this.playerEnergy < definition.cost) {
            this.triggerDeployFailureFeedback(lane);
            const missing = Math.max(1, Math.ceil(definition.cost - this.playerEnergy));
            this.refreshHud(`能量不足，还差${missing}点`);
            return false;
        }

        if (!this.spawnUnit(Team.Player, lane, definition)) {
            this.showLaneQueueFull(lane);
            this.triggerDeployFailureFeedback(lane);
            this.refreshHud(`\u7B2C ${lane + 1} \u7EBF\u961F\u5217\u5DF2\u6EE1\uFF0C\u672C\u6B21\u51FA\u5175\u672A\u6263\u9664\u80FD\u91CF\u3002`);
            return false;
        }
        this.playerEnergy -= definition.cost;
        this.playerSpawnCooldown = PLAYER_SPAWN_COOLDOWN;
        if (this.tutorialFlowActive) {
            this.tutorialEnergySubsidiesRemaining.set(selectedType, 0);
        }
        this.audioManager.playSfx('deploy');
        this.refreshLaneSpawnMarkers();
        this.refreshHud(tutorialEnergySubsidy > 0
            ? `教学临时补足${tutorialEnergySubsidy}点能量；第${lane + 1}线真实出兵并扣除${definition.cost}点。`
            : `第${lane + 1}线派出${this.getUnitDisplayName(definition.type, Team.Player)} · 消耗${definition.cost}能量`);
        if (this.tutorialFlowActive && this.tutorialProgress === 'deploy-four-sheep') {
            const spawnedUnitId = this.nextUnitId - 1;
            this.tutorialCompletedDeploymentTypes.add(selectedType);
            this.tutorialCompletedDeploymentLanes.add(lane);
            this.tutorialDeploymentUnitIds.set(selectedType, spawnedUnitId);
            if (selectedType === SheepType.Small && lane === 0) {
                this.tutorialDeploymentLane = lane;
                this.tutorialDeployedUnitId = spawnedUnitId;
            }
            this.tutorialDeploymentIndex += 1;
            this.playerSpawnCooldown = 0;
            this.lastUnitButtonState = '';
            if (this.tutorialDeploymentIndex >= LEVEL_ONE_TUTORIAL_DEPLOYMENTS.length
                && this.tutorialCompletedDeploymentTypes.size === LEVEL_ONE_TUTORIAL_DEPLOYMENTS.length
                && this.tutorialCompletedDeploymentLanes.size === LEVEL_ONE_TUTORIAL_DEPLOYMENTS.length) {
                this.tutorialProgress = 'deploy-four-sheep-complete';
                this.refreshHud('四种羊已分别真实派往四条道路，请点击“下一步”。');
            }
            this.refreshUnitTypeButtons();
            this.refreshLaneSpawnMarkers();
            this.refreshLevelOneTutorialPresentation();
        }
        return true;
    }

    private trySpawnAIUnit(): number {
        const levelConfig = this.getCurrentLevelConfig();
        if (this.isPaused) {
            return levelConfig.aiIdleDecisionInterval;
        }
        if (levelConfig.id === 5 && levelConfig.continuousSmallUnitDeployment) {
            return this.trySpawnLevelFiveAIUnit(levelConfig);
        }
        if (this.getActiveUnitCount(Team.AI) >= levelConfig.aiMaxActiveUnits) {
            return levelConfig.aiIdleDecisionInterval;
        }

        const affordableTypes = this.getCurrentAIAllowedUnitTypes(levelConfig)
            .filter((type) => UNIT_DEFINITIONS[type].cost <= this.aiEnergy);
        if (affordableTypes.length === 0) {
            return levelConfig.aiIdleDecisionInterval;
        }

        const lane = this.chooseAILane(affordableTypes);
        if (lane === undefined) {
            return levelConfig.aiIdleDecisionInterval;
        }
        const lanePressure = this.getLanePressure(lane);
        const spawnableTypes = affordableTypes.filter((type) => this.canSpawnUnitInLane(Team.AI, lane, UNIT_DEFINITIONS[type]));
        const type = this.chooseAIUnitType(spawnableTypes, lanePressure, lane);
        if (type === undefined) {
            return levelConfig.aiIdleDecisionInterval;
        }
        const definition = UNIT_DEFINITIONS[type];
        if (!this.spawnUnit(Team.AI, lane, definition)) {
            return levelConfig.aiIdleDecisionInterval;
        }
        this.aiEnergy -= definition.cost;
        if (ART_PILOT_ENABLED && (ART_FULL_ENABLED || lane === ART_PILOT_LANE_INDEX)) {
            this.aiSpawnGateSelectedRemaining[lane] = 0.18;
            this.updatePilotAIGate(0);
        }
        this.showAIDeployNotice(lane, type);
        return this.getAIDeployCooldown(definition);
    }

    private trySpawnLevelFiveAIUnit(levelConfig: LevelConfig): number {
        const allowed = this.getCurrentAIAllowedUnitTypes(levelConfig)
            .filter((type) => UNIT_DEFINITIONS[type].cost <= this.aiEnergy);
        if (allowed.length === 0) return LEVEL_FIVE_AI_MIN_DECISION_INTERVAL;
        let nonSmallActive = 0;
        for (const unit of this.units) {
            if (unit.team === Team.AI && unit.definition.type !== SheepType.Small
                && this.isActiveBattleUnit(unit)) nonSmallActive += 1;
        }
        const weightedTypes: readonly [SheepType, number][] = [
            [SheepType.Small, 55],
            [SheepType.Medium, 25],
            [SheepType.Large, 15],
            [SheepType.Giant, 5],
        ];
        const eligible = weightedTypes.filter(([type]) => allowed.indexOf(type) >= 0
            && (type === SheepType.Small || nonSmallActive < levelConfig.aiMaxActiveUnits));
        let roll = Math.random() * eligible.reduce((sum, [, weight]) => sum + weight, 0);
        let selectedType = eligible[0]?.[0] ?? SheepType.Small;
        for (const [type, weight] of eligible) {
            roll -= weight;
            if (roll <= 0) {
                selectedType = type;
                break;
            }
        }
        if (selectedType === SheepType.Small) {
            const lane = this.chooseLevelFiveAILane();
            if (this.issueLevelFiveSmallDeployment(Team.AI, lane)) {
                return Math.max(LEVEL_FIVE_AI_MIN_DECISION_INTERVAL,
                    this.getAIDeployCooldown(UNIT_DEFINITIONS[SheepType.Small]));
            }
            return LEVEL_FIVE_AI_MIN_DECISION_INTERVAL;
        }
        const lane = this.chooseAILane([selectedType]);
        if (lane !== undefined) {
            const definition = UNIT_DEFINITIONS[selectedType];
            if (this.spawnUnit(Team.AI, lane, definition)) {
                this.aiEnergy -= definition.cost;
                this.aiSpawnGateSelectedRemaining[lane] = 0.18;
                this.showAIDeployNotice(lane, selectedType);
                return Math.max(LEVEL_FIVE_AI_MIN_DECISION_INTERVAL, this.getAIDeployCooldown(definition));
            }
        }
        if (allowed.indexOf(SheepType.Small) >= 0) {
            const fallbackLane = this.chooseLevelFiveAILane();
            if (this.issueLevelFiveSmallDeployment(Team.AI, fallbackLane)) {
                return Math.max(LEVEL_FIVE_AI_MIN_DECISION_INTERVAL,
                    this.getAIDeployCooldown(UNIT_DEFINITIONS[SheepType.Small]));
            }
        }
        return LEVEL_FIVE_AI_MIN_DECISION_INTERVAL;
    }

    private chooseLevelFiveAILane(): number {
        const candidates = LANE_X.map((_, lane) => ({
            lane,
            score: this.getAILanePriority(lane)
                - this.getPendingSmallDeploymentCount(Team.AI, lane) * 7
                - this.getLaneUnitCount(Team.AI, lane) * 2,
        }));
        const highest = Math.max(...candidates.map((candidate) => candidate.score));
        const nearHighest = candidates.filter((candidate) => candidate.score >= highest - 8);
        return nearHighest[Math.floor(Math.random() * nearHighest.length)].lane;
    }

    private showAIDeployNotice(lane: number, type: SheepType): void {
        if (this.aiDeployNoticeCooldown > 0) {
            return;
        }
        this.aiDeployNoticeCooldown = AI_DEPLOY_NOTICE_MIN_INTERVAL;
        const wolfName = this.getUnitDisplayName(type, Team.AI);
        this.refreshHud(`AI\u5728\u7B2C${lane + 1}\u8DEF\u6D3E\u51FA${wolfName}`);
    }

    private getUnitDisplayName(type: SheepType, team: Team): string {
        const displayName = UNIT_TIER_VISUALS[type].displayName;
        return team === Team.Player ? displayName.sheep : displayName.wolf;
    }

    private chooseAILane(affordableTypes: readonly SheepType[]): number | undefined {
        const levelConfig = this.getCurrentLevelConfig();
        let laneStates = LANE_X.map((_, lane) => ({
            lane,
            priority: this.getAILanePriority(lane) + this.getAILaneTerrainBias(levelConfig, lane),
            aiCount: this.getLaneUnitCount(Team.AI, lane),
        })).filter((state) => state.aiCount < TEAM_MAX_UNITS_PER_LANE
            && affordableTypes.some((type) => this.canSpawnUnitInLane(Team.AI, state.lane, UNIT_DEFINITIONS[type])));

        if (laneStates.length === 0) {
            return undefined;
        }

        if (levelConfig.id === 6 && this.goldenActiveRemaining > 0 && this.goldenLane >= 0) {
            const goldenState = laneStates.find((state) => state.lane === this.goldenLane);
            if (goldenState && Math.random() < LEVEL_SIX_AI_GOLDEN_LANE_WEIGHT) {
                this.levelSixAILaneDecisions[goldenState.lane] += 1;
                return goldenState.lane;
            }
            const otherLanes = laneStates.filter((state) => state.lane !== this.goldenLane);
            if (otherLanes.length > 0) {
                let totalWeight = 0;
                for (const state of otherLanes) {
                    totalWeight += Math.max(1, 18 + state.priority - state.aiCount * 3);
                }
                let roll = Math.random() * totalWeight;
                for (const state of otherLanes) {
                    roll -= Math.max(1, 18 + state.priority - state.aiCount * 3);
                    if (roll <= 0) {
                        this.levelSixAILaneDecisions[state.lane] += 1;
                        return state.lane;
                    }
                }
                const fallbackLane = otherLanes[otherLanes.length - 1].lane;
                this.levelSixAILaneDecisions[fallbackLane] += 1;
                return fallbackLane;
            }
        }

        const priorityLanes = laneStates.filter((state) => state.priority > 0);
        if (priorityLanes.length > 0) {
            const highestPriority = Math.max(...priorityLanes.map((state) => state.priority));
            const highestPriorityLanes = priorityLanes.filter((state) => state.priority === highestPriority);
            const fewestDefenders = Math.min(...highestPriorityLanes.map((state) => state.aiCount));
            const candidates = highestPriorityLanes.filter((state) => state.aiCount === fewestDefenders);
            const lane = candidates[Math.floor(Math.random() * candidates.length)].lane;
            if (levelConfig.id === 6) this.levelSixAILaneDecisions[lane] += 1;
            return lane;
        }

        const fewestUnits = Math.min(...laneStates.map((state) => state.aiCount));
        const candidates = laneStates.filter((state) => state.aiCount === fewestUnits);
        const lane = candidates[Math.floor(Math.random() * candidates.length)].lane;
        if (levelConfig.id === 6) this.levelSixAILaneDecisions[lane] += 1;
        return lane;
    }

    private getAILanePriority(lane: number): number {
        return this.getPlayerThreatScore(lane) + this.getAISupplyPriority(lane);
    }

    private getAILaneTerrainBias(levelConfig: LevelConfig, lane: number): number {
        if (levelConfig.laneTypes[lane] !== 'mud') return 0;
        const awarenessChance = levelConfig.aiMudAwarenessChance ?? 0;
        return Math.random() < awarenessChance ? -(levelConfig.aiMudAvoidancePenalty ?? 0) : 0;
    }

    private getPlayerThreatScore(lane: number): number {
        const playerUnits = this.getLaneFormation(Team.Player, lane);
        if (playerUnits.length === 0) {
            return 0;
        }

        let playerPower = 0;
        let forwardMostPosition = Number.NEGATIVE_INFINITY;
        let hasEnteredAiTerritory = false;
        for (const unit of playerUnits) {
            playerPower += unit.definition.battlePower * unit.health / unit.definition.maxHealth;
            forwardMostPosition = Math.max(forwardMostPosition, unit.node.position.y);
            hasEnteredAiTerritory ||= unit.node.position.y > 0;
        }
        const aiPower = this.getLanePower(Team.AI, lane);
        const playerAdvantage = Math.max(0, playerPower - aiPower) * 1.6;
        const nearAiBase = Math.max(0, forwardMostPosition - 60) * 0.34;
        const aiTerritoryThreat = hasEnteredAiTerritory ? 18 : 0;
        return playerAdvantage + nearAiBase + aiTerritoryThreat;
    }

    private getLanePower(team: Team, lane: number): number {
        let total = 0;
        for (const unit of this.getLaneFormation(team, lane)) {
            total += unit.definition.battlePower * unit.health / unit.definition.maxHealth;
        }
        return total;
    }

    private getActiveUnitCount(team: Team): number {
        let count = 0;
        for (const unit of this.units) {
            if (unit.team === team && this.isActiveBattleUnit(unit)) count += 1;
        }
        return count;
    }

    private getLaneUnitCount(team: Team, lane: number): number {
        return this.getLaneFormation(team, lane).length;
    }

    private createEmptyBattleStats(): BattleStats {
        return {
            unitsSpawned: 0,
            supplyEarned: 0,
            shockUses: 0,
            sprintUses: 0,
            healUses: 0,
            freezeUses: 0,
            surgeUses: 0,
            supplyBoostUses: 0,
        };
    }

    private getBattleStats(team: Team): BattleStats {
        return team === Team.Player ? this.playerStats : this.aiStats;
    }

    private chooseAIUnitType(affordableTypes: readonly SheepType[], lanePressure: number, lane: number): SheepType | undefined {
        const canDeploy = (type: SheepType): boolean => affordableTypes.indexOf(type) >= 0;
        const playerHasHeavyUnit = this.getLaneFormation(Team.Player, lane).some((unit) =>
            unit.definition.type === SheepType.Large || unit.definition.type === SheepType.Giant);

        if (canDeploy(SheepType.Giant) && (this.aiEnergy >= 90 || lanePressure >= 80 || playerHasHeavyUnit)) {
            return SheepType.Giant;
        }
        if (canDeploy(SheepType.Large) && (lanePressure >= 36 || this.aiEnergy >= 55)) {
            return SheepType.Large;
        }
        if (canDeploy(SheepType.Medium) && (lanePressure > 0 || this.aiEnergy >= 40)) {
            return SheepType.Medium;
        }
        if (canDeploy(SheepType.Small) && lanePressure > 0) {
            return SheepType.Small;
        }
        return undefined;
    }

    private getAIDeployCooldown(definition: UnitDefinition): number {
        const levelConfig = this.getCurrentLevelConfig();
        const earlyMultiplier = levelConfig.earlyAIPhaseSeconds !== undefined
            && this.battleElapsedSeconds < levelConfig.earlyAIPhaseSeconds
            ? levelConfig.earlyAIDeployCooldownMultiplier ?? 1 : 1;
        const cooldown = (1.6 + definition.cost * 0.04)
            * levelConfig.aiDeployCooldownMultiplier * earlyMultiplier;
        return Math.max(levelConfig.aiMinimumDeployCooldown ?? 0, cooldown);
    }

    private getCurrentAIAllowedUnitTypes(levelConfig: LevelConfig): readonly SheepType[] {
        if (levelConfig.earlyAIUnitTypes && levelConfig.earlyAIPhaseSeconds !== undefined
            && this.battleElapsedSeconds < levelConfig.earlyAIPhaseSeconds) {
            return levelConfig.earlyAIUnitTypes;
        }
        return levelConfig.aiAllowedUnitTypes;
    }

    private getLanePressure(lane: number): number {
        let playerPower = 0;
        let aiPower = 0;
        for (const unit of this.units) {
            if (unit.lane !== lane) {
                continue;
            }
            const currentPower = unit.definition.battlePower * Math.max(0, unit.health) / unit.definition.maxHealth;
            if (unit.team === Team.Player) {
                playerPower += currentPower;
            } else {
                aiPower += currentPower;
            }
        }
        return playerPower - aiPower;
    }

    private getAISupplyPriority(lane: number): number {
        const point = this.supplyPoints.find((entry) => entry.lane === lane);
        if (!point || point.owner === Team.AI) {
            return 0;
        }
        return point.owner === Team.Player ? 26 : 10;
    }

    private spawnUnit(team: Team, lane: number, definition: UnitDefinition): boolean {
        if (!this.canSpawnUnitInLane(team, lane, definition)) {
            return false;
        }
        const startY = this.getUnitSpawnY(team, lane, definition);
        if (startY === undefined) {
            return false;
        }
        const safeStartY = this.clampRoadY(this.getRoadBoundsForRadius(definition.radius), startY);
        const pooledUnit = this.acquirePooledSmallUnit(team, lane, definition, safeStartY);
        if (pooledUnit) {
            return this.registerSpawnedUnit(pooledUnit);
        }
        const node = new Node(`${team === Team.Player ? 'Sheep' : 'Wolf'}_${definition.type}_${this.nextUnitId}`);
        node.setParent(this.unitsAndVfxLayer);
        node.setPosition(LANE_X[lane], safeStartY, 0);
        node.addComponent(UITransform).setContentSize(definition.radius * 2 + 12, definition.radius * 2 + 28);
        const shadowSize = this.getUnitGroundShadowSize(definition.type);
        const groundShadowNode = this.createGraphicsNode('GroundShadow', shadowSize.width, shadowSize.height,
            0, -definition.radius * 0.72, node);
        const groundShadowGraphics = groundShadowNode.getComponent(Graphics)!;
        groundShadowGraphics.fillColor = new Color(40, 66, 52, 82);
        groundShadowGraphics.roundRect(-shadowSize.width / 2, -shadowSize.height / 2,
            shadowSize.width, shadowSize.height, shadowSize.height / 2);
        groundShadowGraphics.fill();
        const groundShadowOpacity = groundShadowNode.addComponent(UIOpacity);
        const visualExtent = UNIT_VISUAL_BASE_RADIUS * UNIT_TIER_VISUALS[definition.type].visualScale;
        const visualNode = this.createGraphicsNode('VisualNode', visualExtent * 2 + 12, visualExtent * 2 + 12, 0, 0, node);
        const freezeVisualNode = this.createGraphicsNode(
            'FreezeVisual',
            visualExtent * 2 + 18,
            visualExtent * 2 + 18,
            0,
            0,
            visualNode,
        );
        const freezeVisualGraphics = freezeVisualNode.getComponent(Graphics)!;
        freezeVisualGraphics.fillColor = new Color(148, 226, 255, 45);
        freezeVisualGraphics.circle(0, 0, visualExtent + 5);
        freezeVisualGraphics.fill();
        freezeVisualGraphics.lineWidth = 2.5;
        freezeVisualGraphics.strokeColor = new Color(196, 241, 255, 210);
        freezeVisualGraphics.circle(0, 0, visualExtent + 4);
        freezeVisualGraphics.stroke();
        freezeVisualNode.active = false;
        const freezeFootRingNode = this.createGraphicsNode(
            'FreezeFootRing',
            visualExtent * 2 + 24,
            visualExtent + 22,
            0,
            -visualExtent * 0.58,
            visualNode,
        );
        const freezeFootRingGraphics = freezeFootRingNode.getComponent(Graphics)!;
        freezeFootRingNode.active = false;
        const freezeSnowNode = this.createGraphicsNode(
            'FreezeSnowflakes',
            visualExtent * 2 + 26,
            visualExtent * 2 + 32,
            0,
            visualExtent * 0.22,
            visualNode,
        );
        const freezeSnowGraphics = freezeSnowNode.getComponent(Graphics)!;
        freezeSnowNode.active = false;
        const hitFlashNode = this.createGraphicsNode('HitFlashNode', visualExtent * 2 + 12, visualExtent * 2 + 12, 0, 0, node);
        const healthNode = new Node('HealthUI');
        healthNode.setParent(node);
        healthNode.setPosition(0, 0, 0);
        healthNode.addComponent(UITransform).setContentSize(definition.radius * 2 + 70, 66);
        const healthBackgroundNode = this.createGraphicsNode(
            'HealthBackground',
            definition.radius * 2 + 2,
            10,
            0,
            0,
            healthNode,
        );
        const healthFillNode = this.createGraphicsNode('HealthFill', definition.radius * 2, 8, 0, 0, healthNode);
        healthFillNode.getComponent(UITransform)!.setAnchorPoint(0, 0);
        const tierBadgeSize = this.getTierBadgeSize(definition.type);
        const tierBadgeNode = this.createGraphicsNode('TypeBadge', tierBadgeSize, tierBadgeSize, 0, 0, healthNode);
        const tierBadgeLabel = this.createLabel(
            tierBadgeNode,
            'TierLabel',
            '',
            0,
            0,
            tierBadgeSize - 2,
            tierBadgeSize - 2,
            UNIT_TYPE_BADGE_FONT_SIZE,
            new Color(255, 250, 232, 255),
        );
        tierBadgeLabel.isBold = true;
        tierBadgeLabel.enableOutline = true;
        tierBadgeLabel.outlineColor = new Color(42, 31, 28, 255);
        tierBadgeLabel.outlineWidth = 2;
        tierBadgeLabel.enableShadow = true;
        tierBadgeLabel.shadowColor = new Color(10, 18, 26, 150);
        tierBadgeLabel.shadowOffset = new Vec2(1, -1);
        tierBadgeLabel.shadowBlur = 1;
        const laneBuffBadgeNode = this.createGraphicsNode('LaneBuffBadge', 18, 18, 0, 0, healthNode);
        const laneBuffBadgeGraphics = laneBuffBadgeNode.getComponent(Graphics)!;
        this.drawFlowerShieldIcon(laneBuffBadgeGraphics);
        laneBuffBadgeNode.active = team === Team.Player && this.getLaneType(lane) === 'flower';
        const freezeStatusIconNode = this.createGraphicsNode('FreezeStatusIcon', 18, 18, 0, 0, healthNode);
        const freezeStatusIconGraphics = freezeStatusIconNode.getComponent(Graphics)!;
        this.drawSnowflakeIcon(freezeStatusIconGraphics, 7);
        freezeStatusIconNode.active = false;
        const unit: BattleUnit = {
            id: this.nextUnitId,
            queueOrder: this.nextUnitId,
            team,
            lane,
            definition,
            node,
            visualNode,
            visualGraphics: visualNode.getComponent(Graphics)!,
            groundShadowNode,
            groundShadowOpacity,
            hitFlashNode,
            hitFlashOpacity: hitFlashNode.addComponent(UIOpacity),
            healthNode,
            healthGraphics: healthBackgroundNode.getComponent(Graphics)!,
            healthFillNode,
            healthFillGraphics: healthFillNode.getComponent(Graphics)!,
            tierBadgeNode,
            tierBadgeGraphics: tierBadgeNode.getComponent(Graphics)!,
            tierBadgeLabel,
            laneBuffBadgeNode,
            laneBuffBadgeGraphics,
            freezeVisualNode,
            freezeVisualGraphics,
            freezeFootRingNode,
            freezeFootRingGraphics,
            freezeSnowNode,
            freezeSnowGraphics,
            freezeStatusIconNode,
            freezeStatusIconGraphics,
            opacity: node.addComponent(UIOpacity),
            pilotDustCooldown: (this.nextUnitId % 3) * 0.08,
            mudTrailCooldown: (this.nextUnitId % 4) * 0.09,
            freezeVisualRefreshRemaining: 0,
            health: definition.maxHealth,
            displayHealth: definition.maxHealth,
            attackCooldown: 0,
            walkPhase: this.nextUnitId * 0.91,
            isMoving: false,
            hitFlashRemaining: 0,
            attackKickRemaining: 0,
            hitRecoilRemaining: 0,
            isDying: false,
            deathRemaining: 0,
            frozenRemaining: 0,
        };
        this.nextUnitId += 1;
        return this.registerSpawnedUnit(unit);
    }

    private registerSpawnedUnit(unit: BattleUnit): boolean {
        this.units.push(unit);
        this.laneFormationCacheDirty = true;
        this.repairLaneInvariants(unit.lane);
        this.getBattleStats(unit.team).unitsSpawned += 1;
        this.drawUnitVisual(unit);
        this.drawHitFlash(unit);
        this.createUnitHealthBar(unit);
        this.tryBindPilotUnitArt(unit);
        this.tryBindUnitGroundShadow(unit);
        if (this.getLaneType(unit.lane) === 'mud') {
            this.createMudEntryVfx(unit);
        }
        if (ART_FULL_ENABLED && !unit.artAnimator) {
            void this.ensureUnitArtLoaded(unit.definition.type);
        }
        if (this.isPilotArtUnit(unit)) {
            this.playPilotVfx(
                unit.team === Team.Player ? ArtPilotResourceKey.SheepDeploy : ArtPilotResourceKey.WolfDeploy,
                unit.node.position.x,
                unit.node.position.y,
                96,
                14,
            );
        }
        unit.hitFlashNode.active = false;
        return true;
    }

    private acquirePooledSmallUnit(
        team: Team,
        lane: number,
        definition: UnitDefinition,
        safeStartY: number,
    ): BattleUnit | undefined {
        if (this.currentLevel !== 5 || definition.type !== SheepType.Small) return undefined;
        const poolIndex = this.levelFiveSmallUnitPool.findIndex((unit) => unit.team === team
            && unit.definition.type === definition.type && unit.node.isValid);
        if (poolIndex < 0) return undefined;
        const [unit] = this.levelFiveSmallUnitPool.splice(poolIndex, 1);
        Tween.stopAllByTarget(unit.node);
        Tween.stopAllByTarget(unit.visualNode);
        Tween.stopAllByTarget(unit.opacity);
        unit.id = this.nextUnitId;
        unit.queueOrder = this.nextUnitId;
        unit.lane = lane;
        this.nextUnitId += 1;
        unit.node.name = `${team === Team.Player ? 'Sheep' : 'Wolf'}_${definition.type}_${unit.id}`;
        unit.node.setParent(this.unitsAndVfxLayer);
        unit.node.setPosition(LANE_X[lane], safeStartY, 0);
        unit.node.setScale(1, 1, 1);
        unit.node.active = true;
        unit.opacity.opacity = 255;
        unit.visualNode.setPosition(0, 0, 0);
        unit.visualNode.setScale(1, 1, 1);
        unit.visualNode.active = true;
        unit.groundShadowNode.active = true;
        unit.groundShadowOpacity.opacity = 255;
        unit.healthNode.active = true;
        unit.hitFlashNode.active = false;
        unit.hitFlashOpacity.opacity = 0;
        unit.freezeVisualNode.active = false;
        unit.freezeFootRingNode.active = false;
        unit.freezeSnowNode.active = false;
        unit.freezeStatusIconNode.active = false;
        unit.laneBuffBadgeNode.active = team === Team.Player && this.getLaneType(lane) === 'flower';
        unit.health = definition.maxHealth;
        unit.displayHealth = definition.maxHealth;
        unit.attackCooldown = 0;
        unit.walkPhase = unit.id * 0.91;
        unit.isMoving = false;
        unit.hitFlashRemaining = 0;
        unit.attackKickRemaining = 0;
        unit.hitRecoilRemaining = 0;
        unit.isDying = false;
        unit.deathRemaining = 0;
        unit.frozenRemaining = 0;
        unit.pilotDustCooldown = (unit.id % 3) * 0.08;
        unit.mudTrailCooldown = (unit.id % 4) * 0.09;
        unit.freezeVisualRefreshRemaining = 0;
        unit.artAnimator?.reset();
        if (unit.artSprite) {
            unit.artSprite.node.active = true;
            unit.artSprite.node.setScale(1, 1, 1);
            unit.artSprite.color = Color.WHITE;
        }
        if (unit.artHealthFillSprite) unit.artHealthFillSprite.node.active = true;
        return unit;
    }

    private isPilotArtUnit(unit: BattleUnit): boolean {
        return ART_PILOT_ENABLED && (ART_FULL_ENABLED
            || (unit.lane === ART_PILOT_LANE_INDEX && unit.definition.type === SheepType.Small));
    }

    private getUnitGroundShadowSize(type: SheepType): { readonly width: number; readonly height: number } {
        switch (type) {
            case SheepType.Small: return { width: 36, height: 14 };
            case SheepType.Medium: return { width: 44, height: 17 };
            case SheepType.Large: return { width: 54, height: 20 };
            case SheepType.Giant: return { width: 66, height: 24 };
            default: return { width: 36, height: 14 };
        }
    }

    private tryBindUnitGroundShadow(unit: BattleUnit): void {
        if (!ART_FULL_ENABLED || !unit.groundShadowNode?.isValid) return;
        const frame = this.artResourceManager.getFrame(ArtPilotResourceKey.UnitGroundShadow);
        if (!frame) return;
        const size = this.getUnitGroundShadowSize(unit.definition.type);
        const sprite = this.applyChildSprite(unit.groundShadowNode, 'GroundShadowArt',
            ArtPilotResourceKey.UnitGroundShadow, size.width, size.height);
        if (!sprite) return;
        unit.groundShadowSprite = sprite;
        sprite.color = new Color(67, 82, 53, 210);
        unit.groundShadowNode.getComponent(Graphics)!.enabled = false;
        unit.groundShadowNode.setSiblingIndex(0);
    }

    private getUnitArtKeys(type: SheepType): { sheep: ArtPilotResourceKey; wolf: ArtPilotResourceKey } {
        return {
            [SheepType.Small]: { sheep: ArtPilotResourceKey.SheepSmall, wolf: ArtPilotResourceKey.WolfSmall },
            [SheepType.Medium]: { sheep: ArtPilotResourceKey.SheepMedium, wolf: ArtPilotResourceKey.WolfMedium },
            [SheepType.Large]: { sheep: ArtPilotResourceKey.SheepLarge, wolf: ArtPilotResourceKey.WolfLarge },
            [SheepType.Giant]: { sheep: ArtPilotResourceKey.SheepGiant, wolf: ArtPilotResourceKey.WolfGiant },
        }[type];
    }

    private async ensureUnitArtLoaded(type: SheepType): Promise<void> {
        if (!ART_FULL_ENABLED) return;
        const group = `unit-${type}` as ArtResourceGroup;
        await this.artResourceManager.preloadGroups([group]);
        if (!this.node.isValid) return;
        for (const unit of [...this.units, ...this.dyingUnits]) {
            if (unit.definition.type === type) {
                this.tryBindPilotUnitArt(unit);
            }
        }
    }

    private tryBindPilotUnitArt(unit: BattleUnit): void {
        if (!this.isPilotArtUnit(unit) || !unit.node.isValid) {
            return;
        }
        if (!unit.artAnimator) {
            const keys = this.getUnitArtKeys(unit.definition.type);
            const characterKey = unit.team === Team.Player ? keys.sheep : keys.wolf;
            const frames = this.artResourceManager.getFrames(characterKey);
            if (frames?.length === 23) {
                const fullSize = FULL_UNIT_SPRITE_SIZE[unit.definition.type];
                const spriteSize = ART_FULL_ENABLED
                    ? (unit.team === Team.Player ? fullSize.sheep : fullSize.wolf)
                    : (unit.team === Team.Player ? PILOT_UNIT_SPRITE_SIZE - 2 : PILOT_UNIT_SPRITE_SIZE - 12);
                const artSlot = this.createSpriteSlot('ArtSprite', unit.visualNode, spriteSize, spriteSize, 0, 0, 0.5, 0.42);
                artSlot.sprite.spriteFrame = frames[0];
                artSlot.node.active = true;
                unit.visualGraphics.enabled = false;
                unit.artSprite = artSlot.sprite;
                unit.artAnimator = new UnitSpriteAnimator(artSlot.sprite, frames);
                if (unit.isDying) {
                    unit.artAnimator.playDeath();
                    unit.deathRemaining = Math.max(unit.deathRemaining, PILOT_UNIT_DEATH_VISUAL_SECONDS);
                }
            }
        }
        this.tryBindPilotUnitHealthArt(unit);
    }

    private tryBindPilotUnitHealthArt(unit: BattleUnit): void {
        if (unit.artHealthFillSprite) {
            return;
        }
        const healthFrame = this.artResourceManager.getFrame(
            unit.team === Team.Player ? ArtPilotResourceKey.FriendlyHealthBar : ArtPilotResourceKey.EnemyHealthBar,
        );
        const fillFrame = this.artResourceManager.getFrame(ArtPilotResourceKey.HealthFillMask);
        if (!healthFrame || !fillFrame) {
            return;
        }

        const barWidth = unit.definition.radius * 2;
        const formalBarCenterY = ART_FULL_ENABLED ? unit.healthGraphics.node.position.y : 48;
        unit.healthGraphics.node.setPosition(0, formalBarCenterY, 0);
        unit.healthFillNode.setPosition(-barWidth / 2 + 1, formalBarCenterY, 0);
        const badgeSize = this.getTierBadgeSize(unit.definition.type);
        unit.tierBadgeNode.setPosition(
            -barWidth / 2 - UNIT_TIER_BADGE_GAP - badgeSize / 2,
            formalBarCenterY,
            0,
        );
        const backgroundSlot = this.createSpriteSlot(
            'HealthFrameArt',
            unit.healthGraphics.node,
            barWidth + 2,
            10,
            0,
            0,
        );
        backgroundSlot.sprite.spriteFrame = healthFrame;
        backgroundSlot.node.active = true;
        unit.healthGraphics.enabled = false;

        const fillSlot = this.createSpriteSlot(
            'HealthFillArt',
            unit.healthFillNode,
            barWidth,
            8,
            0,
            0,
            0,
            0.5,
        );
        fillSlot.sprite.spriteFrame = fillFrame;
        fillSlot.sprite.color = unit.team === Team.Player
            ? new Color(66, 213, 122, 255) : new Color(239, 83, 80, 255);
        fillSlot.node.active = true;
        unit.healthFillGraphics.enabled = false;
        unit.artHealthFillSprite = fillSlot.sprite;

        const staleBadgeArt = unit.tierBadgeNode.getChildByName('TierBadgeArt');
        if (staleBadgeArt) staleBadgeArt.active = false;
        unit.tierBadgeGraphics.enabled = true;
        this.drawTierBadge(
            unit.tierBadgeGraphics,
            unit.tierBadgeLabel,
            unit.definition.type,
            badgeSize,
            unit.team,
        );
        unit.tierBadgeLabel.node.setSiblingIndex(unit.tierBadgeNode.children.length - 1);
    }

    private updateUnits(deltaTime: number): void {
        const safeDeltaTime = this.sanitizeLogicDeltaTime(deltaTime);
        const pendingDamage = this.pendingCombatDamage;
        pendingDamage.clear();

        for (const unit of this.units) {
            if (this.isActiveBattleUnit(unit)) {
                unit.isMoving = false;
                this.updateUnitStatusEffects(unit, safeDeltaTime);
            } else {
                this.laneFormationCacheDirty = true;
            }
        }

        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.repairLaneInvariants(lane);
        }
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.updateLaneFrontMovement(lane, safeDeltaTime);
        }
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.updateLaneFollowerMovement(lane, safeDeltaTime);
        }
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.updateLaneCombat(lane, safeDeltaTime, pendingDamage);
        }

        this.resolvePendingCombatDamage(pendingDamage);

        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.repairLaneInvariants(lane);
            this.checkLaneBreakthrough(lane);
            if (this.isFinished) {
                return;
            }
            this.validateLaneLiveness(lane, safeDeltaTime);
        }
    }

    private isActiveBattleUnit(unit: BattleUnit | undefined): unit is BattleUnit {
        return unit !== undefined && unit.health > 0 && !unit.isDying && unit.node.isValid;
    }

    private updateUnitStatusEffects(unit: BattleUnit, deltaTime: number): void {
        const wasFrozen = unit.frozenRemaining > 0;
        unit.frozenRemaining = Math.max(0, unit.frozenRemaining - deltaTime);
        const isFrozen = unit.frozenRemaining > 0;
        if (isFrozen) {
            unit.isMoving = false;
            unit.freezeVisualNode.setSiblingIndex(unit.visualNode.children.length - 1);
            unit.freezeFootRingNode.setSiblingIndex(unit.visualNode.children.length - 1);
            unit.freezeSnowNode.setSiblingIndex(unit.visualNode.children.length - 1);
            unit.freezeVisualRefreshRemaining -= deltaTime;
            if (unit.freezeVisualRefreshRemaining <= 0) {
                unit.freezeVisualRefreshRemaining = FREEZE_VISUAL_REFRESH_INTERVAL_SECONDS;
                this.drawFrozenUnitVisual(unit);
            }
        }
        if (wasFrozen !== isFrozen || unit.freezeVisualNode.active !== isFrozen) {
            unit.freezeVisualNode.active = isFrozen;
            unit.freezeFootRingNode.active = isFrozen;
            unit.freezeSnowNode.active = isFrozen;
            unit.freezeStatusIconNode.active = isFrozen;
            if (!wasFrozen && isFrozen) {
                unit.freezeVisualRefreshRemaining = 0;
                this.drawFrozenUnitVisual(unit);
            } else if (wasFrozen && !isFrozen) {
                this.createFreezeShatterVfx(unit);
                unit.freezeVisualRefreshRemaining = 0;
            }
        }
    }

    private getLaneFormation(team: Team, lane: number): readonly BattleUnit[] {
        this.rebuildLaneFormationCache();
        return this.laneFormations[team][lane];
    }

    private rebuildLaneFormationCache(): void {
        if (!this.laneFormationCacheDirty) return;
        for (const teamFormations of this.laneFormations) {
            for (const formation of teamFormations) formation.length = 0;
        }
        for (const unit of this.units) {
            if (!this.isActiveBattleUnit(unit)) continue;
            this.laneFormations[unit.team][unit.lane].push(unit);
        }
        for (const teamFormations of this.laneFormations) {
            for (const formation of teamFormations) {
                formation.sort((left, right) => left.queueOrder - right.queueOrder);
            }
        }
        this.laneFormationCacheDirty = false;
    }

    private getUnitQueueSpacing(frontUnit: BattleUnit, rearUnit: BattleUnit): number {
        return frontUnit.definition.radius + rearUnit.definition.radius + UNIT_QUEUE_GAP;
    }

    private getEnemyContactDistance(playerFront: BattleUnit, aiFront: BattleUnit): number {
        return playerFront.definition.radius + aiFront.definition.radius + UNIT_ENEMY_CONTACT_GAP;
    }

    private getRoadBoundsForRadius(radius: number): RoadBounds {
        const cached = this.roadBoundsCache.get(radius);
        if (cached) return cached;
        const bounds: RoadBounds = {
            minY: LANE_BOTTOM_Y + radius + UNIT_ROAD_SAFETY_MARGIN,
            maxY: LANE_TOP_Y - radius - UNIT_ROAD_SAFETY_MARGIN,
        };
        this.roadBoundsCache.set(radius, bounds);
        return bounds;
    }

    private getUnitRoadBounds(unit: BattleUnit): RoadBounds {
        return this.getRoadBoundsForRadius(unit.definition.radius);
    }

    private clampRoadY(bounds: RoadBounds, y: number): number {
        return Math.max(bounds.minY, Math.min(bounds.maxY, y));
    }

    private sanitizeLogicDeltaTime(deltaTime: number): number {
        if (!Number.isFinite(deltaTime) || deltaTime < 0) {
            console.error('[WolfSheepBattle][LaneNumeric] 非法 deltaTime，已忽略本帧道路推进。', { deltaTime });
            return 0;
        }
        return Math.min(deltaTime, MAX_LOGIC_DELTA_TIME);
    }

    private setUnitLogicY(unit: BattleUnit, y: number): void {
        const bounds = this.getUnitRoadBounds(unit);
        const safeY = this.clampRoadY(bounds, Number.isFinite(y)
            ? y
            : unit.team === Team.Player ? bounds.minY : bounds.maxY);
        const previousY = unit.node.position.y;
        unit.node.setPosition(unit.node.position.x, safeY);
        if (Number.isFinite(previousY) && Math.abs(safeY - previousY) > LANE_PROGRESS_VALUE_EPSILON) {
            unit.isMoving = true;
        }
    }

    private sanitizeUnitRuntime(unit: BattleUnit): void {
        const bounds = this.getUnitRoadBounds(unit);
        if (!Number.isFinite(unit.node.position.y)) {
            console.error('[WolfSheepBattle][LaneNumeric] 单位坐标非法，已恢复到本方出生端。', {
                lane: unit.lane + 1,
                unitId: unit.id,
                team: unit.team === Team.Player ? 'player' : 'ai',
                y: unit.node.position.y,
            });
            this.setUnitLogicY(unit, unit.team === Team.Player ? bounds.minY : bounds.maxY);
        } else if (unit.node.position.y < bounds.minY || unit.node.position.y > bounds.maxY) {
            this.reportLaneInvariant(
                unit.lane,
                unit,
                'out-of-bounds',
                this.clampRoadY(bounds, unit.node.position.y),
                undefined,
                true,
                false,
                false,
            );
            this.setUnitLogicY(unit, unit.node.position.y);
        }
        if (!Number.isFinite(unit.health)) {
            console.error('[WolfSheepBattle][LaneNumeric] 单位生命值非法，已恢复为最大生命。', {
                lane: unit.lane + 1,
                unitId: unit.id,
                health: unit.health,
            });
            unit.health = unit.definition.maxHealth;
        }
        if (!Number.isFinite(unit.attackCooldown)) {
            console.error('[WolfSheepBattle][LaneNumeric] 攻击计时非法，已恢复为可攻击状态。', {
                lane: unit.lane + 1,
                unitId: unit.id,
                attackCooldown: unit.attackCooldown,
            });
            unit.attackCooldown = 0;
        } else {
            unit.attackCooldown = Math.max(0, Math.min(unit.definition.attackInterval, unit.attackCooldown));
        }
        if (!Number.isFinite(unit.frozenRemaining)) {
            unit.frozenRemaining = 0;
            unit.freezeVisualNode.active = false;
            unit.freezeStatusIconNode.active = false;
        }
    }

    private repairAllLaneInvariants(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.repairLaneInvariants(lane);
        }
    }

    /**
     * Repairs only invalid coordinates/order/overlap. Normal rear-unit following
     * is handled separately and is always speed-limited.
     */
    private repairLaneInvariants(lane: number): void {
        const playerFormation = this.getLaneFormation(Team.Player, lane);
        const aiFormation = this.getLaneFormation(Team.AI, lane);
        for (const unit of playerFormation) this.sanitizeUnitRuntime(unit);
        for (const unit of aiFormation) this.sanitizeUnitRuntime(unit);

        this.applyPendingLaneShift(Team.Player, lane, playerFormation);
        this.applyPendingLaneShift(Team.AI, lane, aiFormation);
        this.repairTeamOrder(lane, Team.Player, playerFormation);
        this.repairTeamOrder(lane, Team.AI, aiFormation);

        const playerFront = playerFormation[0];
        const aiFront = aiFormation[0];
        if (playerFront && aiFront) {
            const contactDistance = this.getEnemyContactDistance(playerFront, aiFront);
            const gap = aiFront.node.position.y - playerFront.node.position.y;
            const enemyOrderWrong = gap <= 0;
            const enemyOverlap = gap < contactDistance - LANE_CONTACT_EPSILON;
            if (enemyOrderWrong || enemyOverlap) {
                this.reportLaneInvariant(
                    lane,
                    playerFront,
                    enemyOrderWrong ? 'enemy-order' : 'enemy-overlap',
                    aiFront.node.position.y - contactDistance,
                    aiFront,
                    false,
                    enemyOverlap,
                    enemyOrderWrong,
                );
                this.alignLaneFrontsAtContact(playerFront, aiFront);
                this.repairTeamOrder(lane, Team.Player, playerFormation);
                this.repairTeamOrder(lane, Team.AI, aiFormation);
            }
        }
        this.validateResolvedLane(lane, playerFormation, aiFormation);
    }

    private applyPendingLaneShift(team: Team, lane: number, formation: readonly BattleUnit[]): void {
        const requestedShift = this.consumeLaneShift(team, lane);
        const allowedShift = this.getAllowedTeamShift(formation, requestedShift);
        if (Math.abs(allowedShift) <= LANE_PROGRESS_VALUE_EPSILON) {
            return;
        }
        for (const unit of formation) {
            this.setUnitLogicY(unit, unit.node.position.y + allowedShift);
        }
    }

    private repairTeamOrder(lane: number, team: Team, formation: readonly BattleUnit[]): void {
        for (let index = 1; index < formation.length; index += 1) {
            const frontUnit = formation[index - 1];
            const rearUnit = formation[index];
            const spacing = this.getUnitQueueSpacing(frontUnit, rearUnit);
            const desiredY = frontUnit.node.position.y + (team === Team.Player ? -spacing : spacing);
            const currentY = rearUnit.node.position.y;
            const orderInvalid = team === Team.Player
                ? currentY > desiredY + LANE_CONTACT_EPSILON
                : currentY < desiredY - LANE_CONTACT_EPSILON;
            if (!orderInvalid) {
                continue;
            }
            const bounds = this.getUnitRoadBounds(rearUnit);
            const repairedY = this.clampRoadY(bounds, desiredY);
            this.reportLaneInvariant(
                lane,
                rearUnit,
                'ally-overlap',
                repairedY,
                frontUnit,
                repairedY === bounds.minY || repairedY === bounds.maxY,
                true,
                false,
            );
            this.setUnitLogicY(rearUnit, repairedY);
        }
    }

    private alignLaneFrontsAtContact(playerFront: BattleUnit, aiFront: BattleUnit): void {
        const contactDistance = this.getEnemyContactDistance(playerFront, aiFront);
        const playerBounds = this.getUnitRoadBounds(playerFront);
        const aiBounds = this.getUnitRoadBounds(aiFront);
        if (playerFront.frozenRemaining > 0 && aiFront.frozenRemaining <= 0) {
            this.setUnitLogicY(aiFront, playerFront.node.position.y + contactDistance);
            return;
        }
        if (aiFront.frozenRemaining > 0 && playerFront.frozenRemaining <= 0) {
            this.setUnitLogicY(playerFront, aiFront.node.position.y - contactDistance);
            return;
        }
        const minimumPlayerY = Math.max(playerBounds.minY, aiBounds.minY - contactDistance);
        const maximumPlayerY = Math.min(playerBounds.maxY, aiBounds.maxY - contactDistance);
        const midpointPlayerY = (playerFront.node.position.y + aiFront.node.position.y - contactDistance) * 0.5;
        const playerY = minimumPlayerY <= maximumPlayerY
            ? Math.max(minimumPlayerY, Math.min(maximumPlayerY, midpointPlayerY))
            : this.clampRoadY(playerBounds, midpointPlayerY);
        this.setUnitLogicY(playerFront, playerY);
        this.setUnitLogicY(aiFront, playerY + contactDistance);
    }

    private updateLaneFrontMovement(lane: number, deltaTime: number): void {
        const playerFront = this.getLaneFormation(Team.Player, lane)[0];
        const aiFront = this.getLaneFormation(Team.AI, lane)[0];
        if (playerFront && aiFront) {
            const contactDistance = this.getEnemyContactDistance(playerFront, aiFront);
            const gap = aiFront.node.position.y - playerFront.node.position.y;
            if (!Number.isFinite(gap) || !Number.isFinite(contactDistance)) {
                console.error('[WolfSheepBattle][LaneNumeric] 前排距离非法，已执行道路修复。', {
                    lane: lane + 1,
                    playerFrontId: playerFront.id,
                    aiFrontId: aiFront.id,
                    gap,
                    contactDistance,
                });
                this.repairLaneInvariants(lane);
                return;
            }
            if (gap <= contactDistance + LANE_CONTACT_EPSILON) {
                this.alignLaneFrontsAtContact(playerFront, aiFront);
                return;
            }

            const availableDistance = gap - contactDistance;
            const playerMovement = this.getUnitMovementDistance(playerFront, deltaTime);
            const aiMovement = this.getUnitMovementDistance(aiFront, deltaTime);
            const totalMovement = playerMovement + aiMovement;
            const movementScale = totalMovement > 0 ? Math.min(1, availableDistance / totalMovement) : 0;
            this.setUnitLogicY(playerFront, playerFront.node.position.y + playerMovement * movementScale);
            this.setUnitLogicY(aiFront, aiFront.node.position.y - aiMovement * movementScale);

            const finalGap = aiFront.node.position.y - playerFront.node.position.y;
            if (finalGap <= contactDistance + LANE_CONTACT_EPSILON) {
                this.alignLaneFrontsAtContact(playerFront, aiFront);
            }
            return;
        }

        if (playerFront) {
            const endpoint = this.getBaseEndpointY(playerFront);
            this.setUnitLogicY(
                playerFront,
                Math.min(endpoint, playerFront.node.position.y + this.getUnitMovementDistance(playerFront, deltaTime)),
            );
        }
        if (aiFront) {
            const endpoint = this.getBaseEndpointY(aiFront);
            this.setUnitLogicY(
                aiFront,
                Math.max(endpoint, aiFront.node.position.y - this.getUnitMovementDistance(aiFront, deltaTime)),
            );
        }
    }

    private updateLaneFollowerMovement(lane: number, deltaTime: number): void {
        this.updateTeamFollowerMovement(Team.Player, this.getLaneFormation(Team.Player, lane), deltaTime);
        this.updateTeamFollowerMovement(Team.AI, this.getLaneFormation(Team.AI, lane), deltaTime);
    }

    private updateTeamFollowerMovement(
        team: Team,
        formation: readonly BattleUnit[],
        deltaTime: number,
    ): void {
        const direction = team === Team.Player ? 1 : -1;
        for (let index = 1; index < formation.length; index += 1) {
            const frontUnit = formation[index - 1];
            const rearUnit = formation[index];
            if (rearUnit.frozenRemaining > 0) {
                continue;
            }
            const spacing = this.getUnitQueueSpacing(frontUnit, rearUnit);
            const desiredY = frontUnit.node.position.y - direction * spacing;
            const forwardDistance = direction * (desiredY - rearUnit.node.position.y);
            if (forwardDistance <= LANE_PROGRESS_VALUE_EPSILON) {
                continue;
            }
            const movement = Math.min(this.getUnitMovementDistance(rearUnit, deltaTime), forwardDistance);
            this.setUnitLogicY(rearUnit, rearUnit.node.position.y + direction * movement);
        }
    }

    private updateLaneCombat(
        lane: number,
        deltaTime: number,
        pendingDamage: Map<BattleUnit, number>,
    ): void {
        const playerFront = this.getLaneFormation(Team.Player, lane)[0];
        const aiFront = this.getLaneFormation(Team.AI, lane)[0];
        if (!playerFront || !aiFront) {
            return;
        }
        const contactDistance = this.getEnemyContactDistance(playerFront, aiFront);
        const gap = aiFront.node.position.y - playerFront.node.position.y;
        if (!Number.isFinite(gap) || gap > contactDistance + LANE_CONTACT_EPSILON) {
            return;
        }
        this.alignLaneFrontsAtContact(playerFront, aiFront);
        this.collectFrontAttack(playerFront, aiFront, deltaTime, pendingDamage);
        this.collectFrontAttack(aiFront, playerFront, deltaTime, pendingDamage);
    }

    private checkLaneBreakthrough(lane: number): void {
        const playerFormation = this.getLaneFormation(Team.Player, lane);
        const aiFormation = this.getLaneFormation(Team.AI, lane);
        const playerFront = playerFormation[0];
        const aiFront = aiFormation[0];
        let breakthrough: BattleUnit | undefined;
        if (playerFront && aiFormation.length === 0
            && playerFront.node.position.y >= this.getBaseEndpointY(playerFront) - LANE_CONTACT_EPSILON) {
            breakthrough = playerFront;
        } else if (aiFront && playerFormation.length === 0
            && aiFront.node.position.y <= this.getBaseEndpointY(aiFront) + LANE_CONTACT_EPSILON) {
            breakthrough = aiFront;
        }
        if (!breakthrough || !this.isActiveBattleUnit(breakthrough)) {
            return;
        }
        if (breakthrough.frozenRemaining > 0) return;
        this.damageBase(breakthrough.team === Team.Player ? Team.AI : Team.Player, breakthrough);
        this.startUnitDeath(breakthrough);
    }

    private getLaneActivityState(lane: number): LaneActivityState {
        const playerFront = this.getLaneFormation(Team.Player, lane)[0];
        const aiFront = this.getLaneFormation(Team.AI, lane)[0];
        if (!playerFront || !aiFront) {
            return 'breakthrough';
        }
        const gap = aiFront.node.position.y - playerFront.node.position.y;
        const contactDistance = this.getEnemyContactDistance(playerFront, aiFront);
        return gap <= contactDistance + LANE_CONTACT_EPSILON ? 'fighting' : 'marching';
    }

    private validateLaneLiveness(lane: number, deltaTime: number): void {
        const runtime = this.laneRuntimeStates[lane];
        const playerFormation = this.getLaneFormation(Team.Player, lane);
        const aiFormation = this.getLaneFormation(Team.AI, lane);
        const playerFront = playerFormation[0];
        const aiFront = aiFormation[0];
        const playerHealthTotal = playerFormation.reduce((sum, unit) => sum + unit.health, 0);
        const aiHealthTotal = aiFormation.reduce((sum, unit) => sum + unit.health, 0);
        const unitCount = playerFormation.length + aiFormation.length;
        const hasIntentionalFreeze = [...playerFormation, ...aiFormation]
            .some((unit) => unit.frozenRemaining > 0);
        const playerMoved = this.hasLanePositionProgress(runtime.previousPlayerFrontY, playerFront?.node.position.y);
        const aiMoved = this.hasLanePositionProgress(runtime.previousAIFrontY, aiFront?.node.position.y);
        const healthChanged = Math.abs(playerHealthTotal - runtime.previousPlayerHealthTotal) > LANE_PROGRESS_VALUE_EPSILON
            || Math.abs(aiHealthTotal - runtime.previousAIHealthTotal) > LANE_PROGRESS_VALUE_EPSILON;
        const countChanged = unitCount !== runtime.previousUnitCount;
        const baseDamaged = runtime.baseHitCount !== runtime.previousBaseHitCount;
        const hasProgress = playerMoved || aiMoved || healthChanged || countChanged || baseDamaged;

        if (unitCount === 0 || hasProgress || hasIntentionalFreeze) {
            runtime.stalledSeconds = 0;
            runtime.warningIssued = false;
        } else {
            runtime.stalledSeconds += deltaTime;
        }

        this.updateLaneRuntimeSnapshot(
            runtime,
            playerFront,
            aiFront,
            playerHealthTotal,
            aiHealthTotal,
            unitCount,
        );

        if (unitCount > 0 && runtime.stalledSeconds >= LANE_STALL_RECOVERY_SECONDS) {
            const state = this.getLaneActivityState(lane);
            if (!runtime.warningIssued) {
                console.warn('[WolfSheepBattle][LaneLiveness] 道路超过 2 秒无有效进展，执行无伤害恢复。', {
                    lane: lane + 1,
                    playerFront: this.describeLaneFront(playerFront),
                    aiFront: this.describeLaneFront(aiFront),
                    gap: playerFront && aiFront ? aiFront.node.position.y - playerFront.node.position.y : undefined,
                    contactDistance: playerFront && aiFront
                        ? this.getEnemyContactDistance(playerFront, aiFront)
                        : undefined,
                    unitCount,
                    stalledSeconds: runtime.stalledSeconds,
                    state,
                });
                runtime.warningIssued = true;
            }
            runtime.recoveryCount += 1;
            this.recoverStalledLane(lane, state);
            runtime.stalledSeconds = 0;
        }
    }

    private hasLanePositionProgress(previousY: number | undefined, currentY: number | undefined): boolean {
        if (previousY === undefined || currentY === undefined) {
            return previousY !== currentY;
        }
        return Number.isFinite(currentY)
            && Math.abs(currentY - previousY) > LANE_PROGRESS_POSITION_EPSILON;
    }

    private updateLaneRuntimeSnapshot(
        runtime: LaneRuntimeState,
        playerFront: BattleUnit | undefined,
        aiFront: BattleUnit | undefined,
        playerHealthTotal: number,
        aiHealthTotal: number,
        unitCount: number,
    ): void {
        runtime.previousPlayerFrontY = playerFront?.node.position.y;
        runtime.previousAIFrontY = aiFront?.node.position.y;
        runtime.previousPlayerHealthTotal = playerHealthTotal;
        runtime.previousAIHealthTotal = aiHealthTotal;
        runtime.previousUnitCount = unitCount;
        runtime.previousBaseHitCount = runtime.baseHitCount;
    }

    private describeLaneFront(unit: BattleUnit | undefined): object | undefined {
        if (!unit) {
            return undefined;
        }
        return {
            id: unit.id,
            queueOrder: unit.queueOrder,
            y: unit.node.position.y,
            health: unit.health,
            attackCooldown: unit.attackCooldown,
        };
    }

    private recoverStalledLane(lane: number, state: LaneActivityState): void {
        this.repairLaneInvariants(lane);
        const playerFront = this.getLaneFormation(Team.Player, lane)[0];
        const aiFront = this.getLaneFormation(Team.AI, lane)[0];
        if (state === 'fighting' && playerFront && aiFront) {
            this.alignLaneFrontsAtContact(playerFront, aiFront);
            playerFront.attackCooldown = 0;
            aiFront.attackCooldown = 0;
            return;
        }
        this.updateLaneFrontMovement(lane, 1 / 60);
    }

    private resetLaneRuntimeStates(): void {
        for (const state of this.laneRuntimeStates) {
            state.previousPlayerFrontY = undefined;
            state.previousAIFrontY = undefined;
            state.previousPlayerHealthTotal = 0;
            state.previousAIHealthTotal = 0;
            state.previousUnitCount = 0;
            state.previousBaseHitCount = 0;
            state.baseHitCount = 0;
            state.stalledSeconds = 0;
            state.warningIssued = false;
            state.recoveryCount = 0;
        }
    }

    private resetLaneLivenessTimers(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const state = this.laneRuntimeStates[lane];
            const playerFormation = this.getLaneFormation(Team.Player, lane);
            const aiFormation = this.getLaneFormation(Team.AI, lane);
            state.stalledSeconds = 0;
            state.warningIssued = false;
            this.updateLaneRuntimeSnapshot(
                state,
                playerFormation[0],
                aiFormation[0],
                playerFormation.reduce((sum, unit) => sum + unit.health, 0),
                aiFormation.reduce((sum, unit) => sum + unit.health, 0),
                playerFormation.length + aiFormation.length,
            );
        }
    }

    private reportLaneInvariant(
        lane: number,
        unit: BattleUnit,
        status: string,
        targetY: number,
        frontUnit: BattleUnit | undefined,
        outOfBounds: boolean,
        overlap: boolean,
        enemyOrderWrong: boolean,
    ): void {
        if (!DEBUG_LANE_ASSERT) {
            return;
        }
        const signature = `${lane}:${unit.id}:${status}:${frontUnit?.id ?? 0}`;
        if (this.laneDebugSignatures.has(signature)) {
            return;
        }
        this.laneDebugSignatures.add(signature);
        console.warn('[WolfSheepBattle][LaneAssert]', {
            lane: lane + 1,
            unitId: unit.id,
            team: unit.team === Team.Player ? 'player' : 'ai',
            queueOrder: unit.queueOrder,
            status,
            y: Math.round(unit.node.position.y * 10) / 10,
            targetY: Math.round(targetY * 10) / 10,
            frontUnitId: frontUnit?.id,
            outOfBounds,
            overlap,
            enemyOrderWrong,
        });
    }

    private diagnoseTeamFormation(lane: number, team: Team, formation: readonly BattleUnit[]): void {
        for (let index = 0; index < formation.length; index += 1) {
            const unit = formation[index];
            const bounds = this.getUnitRoadBounds(unit);
            const invalidCoordinate = !Number.isFinite(unit.node.position.y);
            const outOfBounds = invalidCoordinate
                || unit.node.position.y < bounds.minY - 0.001
                || unit.node.position.y > bounds.maxY + 0.001;
            const frontUnit = index > 0 ? formation[index - 1] : undefined;
            const targetY = frontUnit
                ? frontUnit.node.position.y + (team === Team.Player ? -1 : 1) * this.getUnitQueueSpacing(frontUnit, unit)
                : this.clampRoadY(bounds, unit.node.position.y);
            const overlap = frontUnit
                ? invalidCoordinate || !Number.isFinite(frontUnit.node.position.y) || (team === Team.Player
                    ? frontUnit.node.position.y - unit.node.position.y
                    : unit.node.position.y - frontUnit.node.position.y) < this.getUnitQueueSpacing(frontUnit, unit) - 0.001
                : false;
            if (outOfBounds || overlap) {
                this.reportLaneInvariant(
                    lane,
                    unit,
                    invalidCoordinate ? 'invalid-coordinate' : outOfBounds ? 'out-of-bounds' : 'ally-overlap',
                    targetY,
                    frontUnit,
                    outOfBounds,
                    overlap,
                    false,
                );
            }
        }
    }

    private getAllowedTeamShift(formation: readonly BattleUnit[], requestedShift: number): number {
        if (formation.length === 0 || Math.abs(requestedShift) <= 0.001) {
            return 0;
        }
        let minimumShift = Number.NEGATIVE_INFINITY;
        let maximumShift = Number.POSITIVE_INFINITY;
        for (const unit of formation) {
            if (!Number.isFinite(unit.node.position.y)) {
                return 0;
            }
            const bounds = this.getUnitRoadBounds(unit);
            minimumShift = Math.max(minimumShift, bounds.minY - unit.node.position.y);
            maximumShift = Math.min(maximumShift, bounds.maxY - unit.node.position.y);
        }
        return Math.max(minimumShift, Math.min(maximumShift, requestedShift));
    }

    private validateResolvedLane(
        lane: number,
        playerFormation: readonly BattleUnit[],
        aiFormation: readonly BattleUnit[],
    ): void {
        this.diagnoseTeamFormation(lane, Team.Player, playerFormation);
        this.diagnoseTeamFormation(lane, Team.AI, aiFormation);
        const playerFront = playerFormation[0];
        const aiFront = aiFormation[0];
        if (!playerFront || !aiFront) {
            return;
        }
        const contactDistance = this.getEnemyContactDistance(playerFront, aiFront);
        const enemyOrderWrong = playerFront.node.position.y >= aiFront.node.position.y;
        const enemyOverlap = playerFront.node.position.y + contactDistance > aiFront.node.position.y + 0.001;
        if (enemyOrderWrong || enemyOverlap) {
            this.reportLaneInvariant(
                lane,
                playerFront,
                enemyOrderWrong ? 'enemy-order' : 'enemy-overlap',
                aiFront.node.position.y - contactDistance,
                aiFront,
                false,
                enemyOverlap,
                enemyOrderWrong,
            );
        }
    }

    private queueLaneShift(team: Team, lane: number, shiftY: number): void {
        this.pendingLaneShifts[team][lane] += shiftY;
    }

    private consumeLaneShift(team: Team, lane: number): number {
        const shift = this.pendingLaneShifts[team][lane];
        this.pendingLaneShifts[team][lane] = 0;
        return shift;
    }

    private getBaseEndpointY(unit: BattleUnit): number {
        const bounds = this.getUnitRoadBounds(unit);
        return unit.team === Team.Player ? bounds.maxY : bounds.minY;
    }

    private canSpawnUnitInLane(team: Team, lane: number, definition: UnitDefinition): boolean {
        const withinCapacity = this.isLevelFiveContinuousSmallDefinition(definition)
            ? this.getLaneCombinedActiveUnitCount(lane) < LEVEL_FIVE_LANE_ACTIVE_UNIT_SOFT_BUDGET
            : this.getLaneUnitCount(team, lane) < TEAM_MAX_UNITS_PER_LANE;
        return withinCapacity
            && this.getUnitSpawnY(team, lane, definition) !== undefined
            && this.canFitProjectedLaneFormation(team, lane, definition);
    }

    private getUnitSpawnY(team: Team, lane: number, definition: UnitDefinition): number | undefined {
        const bounds = this.getRoadBoundsForRadius(definition.radius);
        // A unit always enters at its own base-side road endpoint. Queue state
        // may reject this spawn, but must never move it forward into the lane.
        const fixedSpawnY = team === Team.Player ? bounds.minY : bounds.maxY;
        const formation = this.getLaneFormation(team, lane);
        const rearUnit = formation[formation.length - 1];
        if (!rearUnit) {
            return fixedSpawnY;
        }
        const direction = team === Team.Player ? 1 : -1;
        const requiredSpacing = rearUnit.definition.radius + definition.radius + UNIT_QUEUE_GAP;
        const availableSpacing = direction * (rearUnit.node.position.y - fixedSpawnY);
        return availableSpacing >= requiredSpacing - 0.001 ? fixedSpawnY : undefined;
    }

    private canFitProjectedLaneFormation(team: Team, lane: number, definition: UnitDefinition): boolean {
        const playerDefinitions = this.playerDefinitionScratch;
        const aiDefinitions = this.aiDefinitionScratch;
        playerDefinitions.length = 0;
        aiDefinitions.length = 0;
        for (const unit of this.getLaneFormation(Team.Player, lane)) playerDefinitions.push(unit.definition);
        for (const unit of this.getLaneFormation(Team.AI, lane)) aiDefinitions.push(unit.definition);
        (team === Team.Player ? playerDefinitions : aiDefinitions).push(definition);
        const playerMinimumFrontY = this.getMinimumPlayerFrontYForDefinitions(playerDefinitions);
        const aiMaximumFrontY = this.getMaximumAIFrontYForDefinitions(aiDefinitions);
        if (playerMinimumFrontY === undefined || aiMaximumFrontY === undefined) {
            return false;
        }
        if (playerDefinitions.length === 0 || aiDefinitions.length === 0) {
            return true;
        }
        const contactDistance = playerDefinitions[0].radius + aiDefinitions[0].radius + UNIT_ENEMY_CONTACT_GAP;
        return playerMinimumFrontY + contactDistance <= aiMaximumFrontY + 0.001;
    }

    private getMinimumPlayerFrontYForDefinitions(definitions: readonly UnitDefinition[]): number | undefined {
        if (definitions.length === 0) {
            return 0;
        }
        let positionY = this.getRoadBoundsForRadius(definitions[definitions.length - 1].radius).minY;
        for (let index = definitions.length - 2; index >= 0; index -= 1) {
            const frontDefinition = definitions[index];
            const rearDefinition = definitions[index + 1];
            positionY += frontDefinition.radius + rearDefinition.radius + UNIT_QUEUE_GAP;
            if (positionY > this.getRoadBoundsForRadius(frontDefinition.radius).maxY + 0.001) {
                return undefined;
            }
        }
        return positionY;
    }

    private getMaximumAIFrontYForDefinitions(definitions: readonly UnitDefinition[]): number | undefined {
        if (definitions.length === 0) {
            return 0;
        }
        let positionY = this.getRoadBoundsForRadius(definitions[definitions.length - 1].radius).maxY;
        for (let index = definitions.length - 2; index >= 0; index -= 1) {
            const frontDefinition = definitions[index];
            const rearDefinition = definitions[index + 1];
            positionY -= frontDefinition.radius + rearDefinition.radius + UNIT_QUEUE_GAP;
            if (positionY < this.getRoadBoundsForRadius(frontDefinition.radius).minY - 0.001) {
                return undefined;
            }
        }
        return positionY;
    }

    private collectFrontAttack(attacker: BattleUnit, target: BattleUnit, deltaTime: number, pendingDamage: Map<BattleUnit, number>): void {
        if (!this.isActiveBattleUnit(attacker) || !this.isActiveBattleUnit(target)
            || attacker.lane !== target.lane) {
            return;
        }
        if (attacker.frozenRemaining > 0) return;
        attacker.attackCooldown -= deltaTime;
        if (attacker.attackCooldown > 0) {
            return;
        }
        attacker.attackCooldown = attacker.definition.attackInterval;
        const accumulatedDamage = pendingDamage.get(target) ?? 0;
        pendingDamage.set(target, accumulatedDamage + attacker.definition.damage);
        this.triggerUnitImpact(attacker, false);
        this.createImpactSpark(attacker, target);
    }

    private getUnitMovementDistance(unit: BattleUnit, deltaTime: number): number {
        if (unit.frozenRemaining > 0) return 0;
        return unit.definition.speed
            * GLOBAL_MOVE_SPEED_MULTIPLIER
            * this.getLaneMoveSpeedMultiplier(unit.lane)
            * this.getSprintMultiplier(unit.team)
            * deltaTime;
    }

    private getLaneType(lane: number): LaneType {
        return this.getCurrentLevelConfig().laneTypes[lane] ?? 'normal';
    }

    private getLaneMoveSpeedMultiplier(lane: number): number {
        return this.getLaneType(lane) === 'mud' ? MUD_MOVE_SPEED_MULTIPLIER : 1;
    }

    private getIncomingDamageMultiplier(target: BattleUnit): number {
        return target.team === Team.Player && this.getLaneType(target.lane) === 'flower'
            ? 1 - FLOWER_DAMAGE_REDUCTION : 1;
    }

    private applyUnitDamage(target: BattleUnit, rawDamage: number, minimumHealth = 0): number {
        const finalDamage = Math.max(0, rawDamage * this.getIncomingDamageMultiplier(target));
        const previousHealth = target.health;
        target.health = Math.max(minimumHealth, target.health - finalDamage);
        return Math.max(0, previousHealth - target.health);
    }

    private resolvePendingCombatDamage(pendingDamage: ReadonlyMap<BattleUnit, number>): void {
        if (pendingDamage.size === 0) {
            return;
        }

        let damageApplied = false;
        for (const [target, damage] of pendingDamage) {
            if (target.health > 0 && target.node.isValid) {
                this.applyUnitDamage(target, damage);
                this.triggerUnitImpact(target, true);
                damageApplied = true;
            }
        }
        if (damageApplied) {
            this.audioManager.playSfx('unit_hit');
        }

        for (const target of pendingDamage.keys()) {
            if (target.health <= 0 || !target.node.isValid) {
                this.startUnitDeath(target);
            }
        }
    }

    private triggerUnitImpact(unit: BattleUnit, shouldFlash: boolean): void {
        if (unit.isDying || !unit.node.isValid) {
            return;
        }
        if (shouldFlash) {
            unit.hitFlashRemaining = UNIT_HIT_FLASH_DURATION;
            unit.hitRecoilRemaining = UNIT_IMPACT_DURATION;
            unit.artAnimator?.playHit();
        } else {
            unit.attackKickRemaining = UNIT_IMPACT_DURATION;
            unit.artAnimator?.playAttack();
            if (unit.artAnimator) {
                this.playPilotVfx(
                    unit.team === Team.Player ? ArtPilotResourceKey.SheepAttack : ArtPilotResourceKey.WolfAttack,
                    unit.node.position.x,
                    unit.node.position.y + (unit.team === Team.Player ? 22 : -22),
                    96,
                    16,
                );
            }
        }
    }

    private startUnitDeath(unit: BattleUnit): void {
        if (unit.isDying || !unit.node.isValid) {
            return;
        }
        const activeIndex = this.units.indexOf(unit);
        if (activeIndex >= 0) {
            this.units.splice(activeIndex, 1);
        }
        this.laneFormationCacheDirty = true;
        unit.health = 0;
        unit.isMoving = false;
        unit.isDying = true;
        unit.frozenRemaining = 0;
        unit.freezeVisualNode.active = false;
        unit.freezeFootRingNode.active = false;
        unit.freezeSnowNode.active = false;
        unit.freezeStatusIconNode.active = false;
        unit.artAnimator?.playDeath();
        unit.deathRemaining = unit.artAnimator ? PILOT_UNIT_DEATH_VISUAL_SECONDS : UNIT_DEATH_DURATION;
        unit.hitFlashRemaining = 0;
        unit.attackKickRemaining = 0;
        unit.hitRecoilRemaining = 0;
        unit.hitFlashNode.active = false;
        this.dyingUnits.push(unit);
        if (unit.artAnimator) {
            this.playPilotVfx(
                ArtPilotResourceKey.UnitDisappear,
                unit.node.position.x,
                unit.node.position.y,
                96,
                13,
            );
        }
        this.audioManager.playSfx('unit_death');
        this.repairLaneInvariants(unit.lane);
    }

    private updateUnitVisuals(deltaTime: number): void {
        const visualUnits = this.depthOrderScratch;
        visualUnits.length = 0;
        for (const unit of this.units) visualUnits.push(unit);
        for (const unit of this.dyingUnits) visualUnits.push(unit);
        const reduceSecondaryVfx = this.currentLevel === 5
            && this.units.length >= LEVEL_FIVE_SECONDARY_VFX_UNIT_THRESHOLD;
        for (const unit of visualUnits) {
            if (!unit.node.isValid) {
                this.removeUnit(unit);
                continue;
            }

            if (unit.isDying) {
                unit.artAnimator?.update(deltaTime);
                unit.deathRemaining = Math.max(0, unit.deathRemaining - deltaTime);
                this.updateUnitHealthBarDisplay(unit, deltaTime);
                const deathDuration = unit.artAnimator ? PILOT_UNIT_DEATH_VISUAL_SECONDS : UNIT_DEATH_DURATION;
                const progress = 1 - unit.deathRemaining / deathDuration;
                const deathScale = Math.max(0.28, 1 - progress * 0.72);
                const tierScale = UNIT_TIER_VISUALS[unit.definition.type].visualScale;
                const depthScale = this.getUnitVisualDepthScale(unit.node.position.y);
                unit.visualNode.setPosition(0, 0, 0);
                unit.visualNode.setScale(tierScale * depthScale * deathScale, tierScale * depthScale * deathScale, 1);
                unit.groundShadowNode.setScale(depthScale * deathScale, depthScale * deathScale, 1);
                unit.groundShadowOpacity.opacity = Math.round(110 * (1 - progress));
                unit.healthNode.setScale(deathScale, deathScale, 1);
                unit.opacity.opacity = Math.round(255 * (1 - progress));
                if (unit.deathRemaining <= 0) {
                    this.removeUnit(unit);
                }
                continue;
            }

            const stepRate = unit.isMoving ? 6.5 : 2.2;
            const bobAmplitude = unit.isMoving ? 1.7 : 0.45;
            unit.walkPhase += deltaTime * stepRate;
            unit.artAnimator?.setLocomotion(unit.isMoving);
            unit.artAnimator?.update(deltaTime);
            if (unit.artAnimator) {
                unit.pilotDustCooldown = Math.max(0, unit.pilotDustCooldown - deltaTime);
                if (unit.isMoving && unit.pilotDustCooldown <= 0) {
                    if (!reduceSecondaryVfx || unit.id % 3 === 0) {
                        this.playPilotVfx(
                            ArtPilotResourceKey.MovementDust,
                            unit.node.position.x,
                            unit.node.position.y - unit.definition.radius * 0.72,
                            64,
                            12,
                        );
                    }
                    unit.pilotDustCooldown = reduceSecondaryVfx
                        ? PILOT_MOVE_DUST_INTERVAL * 2 : PILOT_MOVE_DUST_INTERVAL;
                }
            }
            this.updateMudTrailVfx(unit, deltaTime);
            unit.hitFlashRemaining = Math.max(0, unit.hitFlashRemaining - deltaTime);
            unit.attackKickRemaining = Math.max(0, unit.attackKickRemaining - deltaTime);
            unit.hitRecoilRemaining = Math.max(0, unit.hitRecoilRemaining - deltaTime);
            const forward = unit.team === Team.Player ? 1 : -1;
            const attackKick = Math.sin(Math.PI * unit.attackKickRemaining / UNIT_IMPACT_DURATION) * 1.7;
            const hitRecoil = Math.sin(Math.PI * unit.hitRecoilRemaining / UNIT_IMPACT_DURATION) * 1.3;
            const visualY = Math.sin(unit.walkPhase) * bobAmplitude + forward * (attackKick - hitRecoil);
            const tierScale = UNIT_TIER_VISUALS[unit.definition.type].visualScale;
            const depthScale = this.getUnitVisualDepthScale(unit.node.position.y);
            const visualScale = tierScale * depthScale * (1 + hitRecoil * 0.022);
            unit.visualNode.setPosition(0, visualY, 0);
            unit.visualNode.setScale(visualScale, visualScale, 1);
            unit.groundShadowNode.setScale(depthScale, depthScale, 1);
            unit.groundShadowOpacity.opacity = 110;
            unit.healthNode.setScale(1, 1, 1);
            unit.hitFlashNode.setPosition(0, visualY, 0);
            unit.hitFlashNode.setScale(visualScale, visualScale, 1);
            unit.hitFlashNode.active = !unit.artAnimator && unit.hitFlashRemaining > 0;
            unit.hitFlashOpacity.opacity = Math.round(220 * unit.hitFlashRemaining / UNIT_HIT_FLASH_DURATION);
            unit.opacity.opacity = 255;
            this.updateUnitHealthBarDisplay(unit, deltaTime);
        }
        this.updateUnitDepthOrder();
    }

    private getUnitVisualDepthScale(y: number): number {
        if (BATTLEFIELD_VISUAL_MODE !== 'topdown_v02') return 1;
        const ratio = Math.max(0, Math.min(1, (y - LANE_BOTTOM_Y) / LANE_LENGTH));
        return 1.03 + (0.94 - 1.03) * ratio;
    }

    private updateUnitDepthOrder(): void {
        if (!this.unitsAndVfxLayer?.isValid) return;
        const orderedUnits = this.depthOrderScratch;
        orderedUnits.length = 0;
        for (const unit of this.units) if (unit.node.isValid) orderedUnits.push(unit);
        for (const unit of this.dyingUnits) if (unit.node.isValid) orderedUnits.push(unit);
        orderedUnits.sort((a, b) => b.node.position.y - a.node.position.y || a.queueOrder - b.queueOrder);
        for (let index = 0; index < orderedUnits.length; index += 1) {
            orderedUnits[index].node.setSiblingIndex(index);
        }
    }

    private createImpactSpark(attacker: BattleUnit, target: BattleUnit): void {
        if (!attacker.node.isValid || !target.node.isValid) {
            return;
        }
        if ((attacker.artAnimator || target.artAnimator) && this.playPilotVfx(
            ArtPilotResourceKey.HitImpact,
            attacker.node.position.x,
            (attacker.node.position.y + target.node.position.y) * 0.5,
            64,
            18,
        )) {
            return;
        }
        if (this.currentLevel === 5 && this.units.length >= LEVEL_FIVE_SECONDARY_VFX_UNIT_THRESHOLD
            && (attacker.id + target.id) % 3 !== 0) {
            return;
        }
        const effect = this.acquireBattleVfx(
            'hit-spark',
            attacker.lane,
            undefined,
            attacker.node.position.x,
            (attacker.node.position.y + target.node.position.y) * 0.5,
            34,
            34,
            0.1,
        );
        if (!effect) return;
        const graphics = effect.graphics;
        graphics.clear();
        graphics.lineWidth = 3;
        graphics.strokeColor = new Color(255, 226, 130, 255);
        graphics.moveTo(-10, -3);
        graphics.lineTo(10, 3);
        graphics.moveTo(-4, -10);
        graphics.lineTo(4, 10);
        graphics.moveTo(-8, 8);
        graphics.lineTo(8, -8);
        graphics.stroke();
    }

    private updateMudTrailVfx(unit: BattleUnit, deltaTime: number): void {
        if (this.getLaneType(unit.lane) !== 'mud' || !unit.isMoving || unit.isDying) {
            return;
        }
        unit.mudTrailCooldown = Math.max(0, unit.mudTrailCooldown - deltaTime);
        if (unit.mudTrailCooldown > 0) {
            return;
        }
        unit.mudTrailCooldown = MUD_TRAIL_INTERVAL_SECONDS;
        if (this.countActiveMudVfx(unit.lane) >= MUD_MAX_ACTIVE_TRAILS_PER_LANE
            || this.countActiveMudVfx(unit.lane, unit.id) >= MUD_MAX_ACTIVE_TRAILS_PER_UNIT) {
            return;
        }
        const effect = this.acquireBattleVfx(
            'mud-trail', unit.lane, unit.id,
            unit.node.position.x,
            unit.node.position.y - unit.definition.radius * 0.72,
            46,
            22,
            MUD_TRAIL_VFX_DURATION_SECONDS,
        );
        if (!effect) return;
        const graphics = effect.graphics;
        graphics.clear();
        graphics.fillColor = new Color(107, 70, 43, 72);
        graphics.ellipse(0, 0, 16, 5.5);
        graphics.fill();
        graphics.fillColor = new Color(217, 180, 126, 65);
        graphics.ellipse(-2, 1.5, 8, 1.8);
        graphics.fill();
    }

    private createMudEntryVfx(unit: BattleUnit): void {
        if (this.countActiveMudVfx(unit.lane) >= MUD_MAX_ACTIVE_TRAILS_PER_LANE
            || this.countActiveMudVfx(unit.lane, unit.id) >= MUD_MAX_ACTIVE_TRAILS_PER_UNIT) {
            return;
        }
        const effect = this.acquireBattleVfx(
            'mud-entry', unit.lane, unit.id,
            unit.node.position.x,
            unit.node.position.y - unit.definition.radius * 0.72,
            76,
            34,
            MUD_ENTRY_VFX_DURATION_SECONDS,
        );
        if (!effect) return;
        const graphics = effect.graphics;
        graphics.clear();
        graphics.lineWidth = 2.5;
        graphics.strokeColor = new Color(169, 112, 69, 175);
        graphics.ellipse(0, 0, 22, 7);
        graphics.stroke();
        graphics.lineWidth = 1.5;
        graphics.strokeColor = new Color(239, 207, 157, 150);
        graphics.ellipse(0, 0, 13, 3.8);
        graphics.stroke();
        graphics.fillColor = new Color(131, 83, 48, 96);
        for (const [x, y, radius] of [[-20, 5, 2.6], [18, 4, 2.2], [-11, -4, 1.8], [10, -5, 1.6]] as const) {
            graphics.circle(x, y, radius);
        }
        graphics.fill();
    }

    private createFreezeCastWaveVfx(lane: number): void {
        const effect = this.acquireBattleVfx(
            'freeze-cast-wave', lane, undefined,
            this.getLaneCenterX(lane),
            (LANE_BOTTOM_Y + LANE_TOP_Y) * 0.5,
            LANE_WIDTH - 8,
            LANE_LENGTH - 12,
            FREEZE_CAST_WAVE_DURATION_SECONDS,
        );
        if (!effect) return;
        const graphics = effect.graphics;
        graphics.clear();
        const halfWidth = (LANE_WIDTH - 8) / 2;
        const halfHeight = (LANE_LENGTH - 12) / 2;
        graphics.fillColor = new Color(132, 222, 255, 28);
        graphics.roundRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2, 20);
        graphics.fill();
        graphics.lineWidth = 2.5;
        graphics.strokeColor = new Color(194, 244, 255, 180);
        graphics.moveTo(-halfWidth + 10, -halfHeight + 18);
        graphics.lineTo(-halfWidth + 10, halfHeight - 18);
        graphics.moveTo(halfWidth - 10, -halfHeight + 18);
        graphics.lineTo(halfWidth - 10, halfHeight - 18);
        graphics.stroke();
        graphics.lineWidth = 1.5;
        graphics.strokeColor = new Color(228, 251, 255, 205);
        for (const y of [-150, -60, 30, 120] as const) {
            graphics.ellipse(0, y, 32, 7);
            graphics.stroke();
        }
    }

    private createFreezeUnitBurstVfx(unit: BattleUnit): void {
        if (!this.canAllocateFreezeParticles(FREEZE_MAX_VISIBLE_PARTICLES_PER_UNIT)) {
            return;
        }
        const effect = this.acquireBattleVfx(
            'freeze-unit-burst', unit.lane, unit.id,
            unit.node.position.x,
            unit.node.position.y - unit.definition.radius * 0.46,
            78,
            78,
            FREEZE_UNIT_BURST_DURATION_SECONDS,
            FREEZE_MAX_VISIBLE_PARTICLES_PER_UNIT,
        );
        if (!effect) return;
        this.drawFreezeBurst(effect.graphics, false);
    }

    private createFreezeShatterVfx(unit: BattleUnit): void {
        if (!this.canAllocateFreezeParticles(FREEZE_MAX_VISIBLE_PARTICLES_PER_UNIT)) {
            return;
        }
        const effect = this.acquireBattleVfx(
            'freeze-shatter', unit.lane, unit.id,
            unit.node.position.x,
            unit.node.position.y - unit.definition.radius * 0.44,
            82,
            74,
            FREEZE_SHATTER_DURATION_SECONDS,
            FREEZE_MAX_VISIBLE_PARTICLES_PER_UNIT,
        );
        if (!effect) return;
        this.drawFreezeBurst(effect.graphics, true);
    }

    private drawFreezeBurst(graphics: Graphics, shattered: boolean): void {
        graphics.clear();
        graphics.lineWidth = 1.5;
        graphics.strokeColor = shattered ? new Color(211, 247, 255, 220) : new Color(239, 254, 255, 230);
        graphics.fillColor = shattered ? new Color(148, 222, 255, 140) : new Color(181, 236, 255, 170);
        const points = shattered
            ? [[-23, 10], [-8, 21], [14, 15], [26, -5]] as const
            : [[-20, 5], [-7, 18], [12, 16], [23, -2]] as const;
        for (const [x, y] of points) {
            graphics.moveTo(x, y + 7);
            graphics.lineTo(x - 4, y - 5);
            graphics.lineTo(x + 4, y - 5);
            graphics.close();
            graphics.fill();
            graphics.stroke();
        }
        graphics.strokeColor = new Color(220, 250, 255, 175);
        graphics.ellipse(0, -10, 25, 6);
        graphics.stroke();
    }

    private drawFrozenUnitVisual(unit: BattleUnit): void {
        const visualExtent = UNIT_VISUAL_BASE_RADIUS * UNIT_TIER_VISUALS[unit.definition.type].visualScale;
        const remainingRatio = Math.max(0, Math.min(1, unit.frozenRemaining / FREEZE_DURATION_SECONDS));
        const pulse = 0.92 + Math.sin((FREEZE_DURATION_SECONDS - unit.frozenRemaining) * Math.PI * 3.2) * 0.08;
        const aura = unit.freezeVisualGraphics;
        aura.clear();
        aura.fillColor = new Color(138, 220, 255, Math.round(42 + remainingRatio * 24));
        aura.circle(0, 0, visualExtent + 5);
        aura.fill();
        aura.lineWidth = 2.5;
        aura.strokeColor = new Color(205, 246, 255, Math.round(176 + remainingRatio * 52));
        aura.circle(0, 0, (visualExtent + 4) * pulse);
        aura.stroke();
        aura.lineWidth = 1.4;
        aura.strokeColor = new Color(236, 252, 255, 170);
        for (const angle of [0.2, 2.3, 4.4] as const) {
            const x = Math.cos(angle) * (visualExtent + 5);
            const y = Math.sin(angle) * (visualExtent + 5);
            aura.moveTo(x, y);
            aura.lineTo(x + Math.cos(angle + 0.8) * 6, y + Math.sin(angle + 0.8) * 6);
        }
        aura.stroke();

        const footRing = unit.freezeFootRingGraphics;
        footRing.clear();
        footRing.fillColor = new Color(118, 210, 247, Math.round(48 + remainingRatio * 34));
        footRing.ellipse(0, 0, visualExtent * 0.78 * pulse, visualExtent * 0.20 * pulse);
        footRing.fill();
        footRing.lineWidth = 1.6;
        footRing.strokeColor = new Color(211, 249, 255, 210);
        footRing.ellipse(0, 0, visualExtent * 0.82 * pulse, visualExtent * 0.22 * pulse);
        footRing.stroke();

        const snow = unit.freezeSnowGraphics;
        snow.clear();
        snow.lineWidth = 1.35;
        snow.strokeColor = new Color(235, 252, 255, 210);
        const phase = (FREEZE_DURATION_SECONDS - unit.frozenRemaining) * 1.45;
        for (let index = 0; index < FREEZE_MAX_VISIBLE_PARTICLES_PER_UNIT; index += 1) {
            const x = -visualExtent * 0.62 + index * visualExtent * 0.42;
            const y = visualExtent * 0.7 - ((phase * 18 + index * 13) % (visualExtent * 1.35));
            const radius = index % 2 === 0 ? 2.6 : 2.1;
            snow.moveTo(x - radius, y);
            snow.lineTo(x + radius, y);
            snow.moveTo(x, y - radius);
            snow.lineTo(x, y + radius);
        }
        snow.stroke();
    }

    private acquireBattleVfx(
        kind: BattleVfxKind,
        lane: number,
        unitId: number | undefined,
        x: number,
        y: number,
        width: number,
        height: number,
        duration: number,
        particleCount = 0,
    ): BattleVfxEffect | undefined {
        if (!this.unitsAndVfxLayer?.isValid || this.activeBattleVfx.length >= BATTLE_VFX_POOL_LIMIT) {
            return undefined;
        }
        const effect = this.battleVfxPool.pop() ?? (() => {
            const node = this.createGraphicsNode('RuntimeBattleVfx', width, height, x, y, this.unitsAndVfxLayer);
            return {
                node,
                graphics: node.getComponent(Graphics)!,
                opacity: node.addComponent(UIOpacity),
                kind,
                lane,
                unitId,
                duration,
                elapsed: 0,
                particleCount,
            };
        })();
        if (!effect.node.isValid) {
            return undefined;
        }
        effect.node.setParent(this.unitsAndVfxLayer);
        effect.node.getComponent(UITransform)?.setContentSize(width, height);
        effect.node.setPosition(x, y, 0);
        effect.node.setScale(1, 1, 1);
        effect.node.active = true;
        effect.opacity.opacity = 255;
        effect.kind = kind;
        effect.lane = lane;
        effect.unitId = unitId;
        effect.duration = duration;
        effect.elapsed = 0;
        effect.particleCount = particleCount;
        this.activeBattleVfx.push(effect);
        return effect;
    }

    private updateBattleVfx(deltaTime: number): void {
        for (let index = this.activeBattleVfx.length - 1; index >= 0; index -= 1) {
            const effect = this.activeBattleVfx[index];
            if (!effect.node.isValid) {
                this.activeBattleVfx.splice(index, 1);
                continue;
            }
            effect.elapsed = Math.min(effect.duration, effect.elapsed + deltaTime);
            const progress = effect.duration > 0 ? effect.elapsed / effect.duration : 1;
            const fade = Math.max(0, 1 - progress);
            effect.opacity.opacity = Math.round(255 * fade * fade);
            if (effect.kind === 'mud-entry') {
                const scale = 0.78 + progress * 0.52;
                effect.node.setScale(scale, scale, 1);
            } else if (effect.kind === 'mud-trail') {
                const scale = 0.78 + progress * 0.3;
                effect.node.setScale(scale, scale, 1);
            } else if (effect.kind === 'freeze-cast-wave') {
                effect.node.setScale(0.92 + progress * 0.1, 0.88 + progress * 0.16, 1);
            } else {
                const scale = effect.kind === 'freeze-shatter' ? 0.85 + progress * 0.5 : 0.72 + progress * 0.38;
                effect.node.setScale(scale, scale, 1);
            }
            if (progress < 1) continue;
            this.activeBattleVfx.splice(index, 1);
            this.recycleBattleVfx(effect);
        }
    }

    private recycleBattleVfx(effect: BattleVfxEffect): void {
        if (!effect.node.isValid) return;
        effect.graphics.clear();
        effect.node.active = false;
        effect.node.setScale(1, 1, 1);
        effect.unitId = undefined;
        effect.particleCount = 0;
        if (this.battleVfxPool.length < BATTLE_VFX_POOL_LIMIT) {
            this.battleVfxPool.push(effect);
        } else {
            effect.node.destroy();
        }
    }

    private clearBattleVfx(): void {
        for (const effect of this.activeBattleVfx) {
            this.recycleBattleVfx(effect);
        }
        this.activeBattleVfx.length = 0;
    }

    private countActiveBattleVfx(kind: BattleVfxKind, lane: number, unitId?: number): number {
        let count = 0;
        for (const effect of this.activeBattleVfx) {
            if (effect.kind === kind && effect.lane === lane
                && (unitId === undefined || effect.unitId === unitId)) count += 1;
        }
        return count;
    }

    private countActiveMudVfx(lane: number, unitId?: number): number {
        let count = 0;
        for (const effect of this.activeBattleVfx) {
            if ((effect.kind === 'mud-entry' || effect.kind === 'mud-trail')
                && effect.lane === lane && (unitId === undefined || effect.unitId === unitId)) count += 1;
        }
        return count;
    }

    private canAllocateFreezeParticles(nextParticleCount: number): boolean {
        let persistent = 0;
        for (const unit of this.units) {
            if (this.isActiveBattleUnit(unit) && unit.frozenRemaining > 0) {
                persistent += FREEZE_MAX_VISIBLE_PARTICLES_PER_UNIT;
            }
        }
        let transient = 0;
        for (const effect of this.activeBattleVfx) {
            if (effect.kind === 'freeze-unit-burst' || effect.kind === 'freeze-shatter') {
                transient += effect.particleCount;
            }
        }
        return persistent + transient + nextParticleCount <= FREEZE_MAX_ACTIVE_PARTICLES;
    }

    private playPilotVfx(
        key: ArtPilotResourceKey,
        x: number,
        y: number,
        size: number,
        fps: number,
    ): boolean {
        if (!ART_PILOT_ENABLED || !this.battleLayer?.isValid || this.activePilotVfx.length >= PILOT_VFX_MAX_ACTIVE) {
            return false;
        }
        const frames = this.artResourceManager.getFrames(key);
        if (!frames?.length) {
            return false;
        }
        const effect = this.pilotVfxPool.pop() ?? new VfxSpriteAnimator();
        effect.play(this.unitsAndVfxLayer, frames, x, y, size, size, fps);
        this.activePilotVfx.push(effect);
        return true;
    }

    private updatePilotVfx(deltaTime: number): void {
        for (let index = this.activePilotVfx.length - 1; index >= 0; index -= 1) {
            const effect = this.activePilotVfx[index];
            if (effect.update(deltaTime)) {
                continue;
            }
            this.activePilotVfx.splice(index, 1);
            if (this.pilotVfxPool.length < PILOT_VFX_POOL_LIMIT) {
                this.pilotVfxPool.push(effect);
            } else {
                effect.destroy();
            }
        }
    }

    private clearActivePilotVfx(): void {
        for (const effect of this.activePilotVfx) {
            effect.stop();
            if (this.pilotVfxPool.length < PILOT_VFX_POOL_LIMIT) {
                this.pilotVfxPool.push(effect);
            } else {
                effect.destroy();
            }
        }
        this.activePilotVfx.length = 0;
    }

    onDestroy(): void {
        this.cleanupLevelOneTutorial(false);
        game.off(Game.EVENT_HIDE, this.handleLevelOneTutorialGameHide, this);
        game.off(Game.EVENT_SHOW, this.handleLevelOneTutorialGameShow, this);
        this.audioManager?.offBgmPlaybackStarted(this.handleBgmPlaybackStarted);
        this.screenAdapter?.unsubscribe(this.handleLandscapeLayoutChanged);
        this.artPilotLoadGeneration += 1;
        if (this.resultPanelCroppedFrame?.isValid) {
            this.resultPanelCroppedFrame.destroy();
        }
        this.resultPanelCroppedFrame = undefined;
        for (const effect of [...this.activePilotVfx, ...this.pilotVfxPool]) {
            effect.destroy();
        }
        this.activePilotVfx.length = 0;
        this.pilotVfxPool.length = 0;
        for (const effect of [...this.activeBattleVfx, ...this.battleVfxPool]) {
            if (effect.node.isValid) effect.node.destroy();
        }
        this.activeBattleVfx.length = 0;
        this.battleVfxPool.length = 0;
        for (const unit of this.levelFiveSmallUnitPool) {
            if (unit.node.isValid) unit.node.destroy();
        }
        this.levelFiveSmallUnitPool.length = 0;
    }

    private damageBase(target: Team, attacker: BattleUnit): void {
        const damage = attacker.definition.baseDamage;
        this.laneRuntimeStates[attacker.lane].baseHitCount += 1;
        this.audioManager.playSfx('base_hit');
        if (ART_FULL_ENABLED) {
            this.playPilotVfx(ArtPilotResourceKey.Breakthrough, attacker.node.position.x, attacker.node.position.y, 118, 14);
            this.playPilotVfx(ArtPilotResourceKey.BaseHit, attacker.node.position.x,
                target === Team.Player ? LANE_BOTTOM_Y + 26 : LANE_TOP_Y - 26, 128, 14);
        }
        let message: string;
        if (target === Team.Player) {
            this.playerBaseHealth = Math.max(0, this.playerBaseHealth - damage);
            this.playerBaseFlashRemaining = BASE_HIT_FLASH_DURATION;
            this.createFloatingFeedback(`-${damage}`, 0, PLAYER_BASE_Y + 64, new Color(151, 221, 255, 255), 0.7, 24, 120, 24);
            message = `AI 的${this.getUnitDisplayName(attacker.definition.type, Team.AI)}突破防线，基地受到 ${damage} 点伤害！`;
        } else {
            this.aiBaseHealth = Math.max(0, this.aiBaseHealth - damage);
            this.aiBaseFlashRemaining = BASE_HIT_FLASH_DURATION;
            this.createFloatingFeedback(`-${damage}`, 0, AI_BASE_Y - 48, new Color(255, 183, 168, 255), 0.7, -24, 120, 24);
            message = `${this.getUnitDisplayName(attacker.definition.type, Team.Player)}突破防线，AI 基地受到 ${damage} 点伤害！`;
        }

        if (this.unlockShockIfNeeded(target)) {
            message += target === Team.Player ? ' 领地震荡已解锁！' : ' AI 的领地震荡已解锁！';
        }
        this.refreshHud(message);

        if (this.playerBaseHealth <= 0 || this.aiBaseHealth <= 0) {
            this.finishGame(this.aiBaseHealth <= 0);
        }
    }

    private finishGame(playerWon: boolean): void {
        if (this.isFinished) {
            return;
        }
        this.cleanupLevelOneTutorial(false);
        this.selectedSheepType = undefined;
        this.lastUnitButtonState = '';
        this.isFinished = true;
        this.cancelFreezeLaneSelection(false);
        this.isPaused = false;
        this.resetAllTacticCardPressStates(true);
        this.setBattleTweensPaused(true);
        this.audioManager.stopBattleSfx();
        this.audioManager.fadeOutBgm(0.4);
        this.clearFeedbackEffects();
        this.clearBattleVfx();
        this.hideTacticNotice();
        this.pauseButton.node.active = false;
        this.refreshLevelSixGoldenHud();
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        if (this.replayLevelOneTutorialConfirmPanel?.isValid) {
            this.replayLevelOneTutorialConfirmPanel.active = false;
        }
        this.refreshHud(playerWon
            ? '\u654C\u65B9\u57FA\u5730\u5DF2\u88AB\u6467\u6BC1\uFF0C\u6218\u6597\u80DC\u5229\uFF01'
            : '\u73A9\u5BB6\u57FA\u5730\u5DF2\u88AB\u6467\u6BC1\uFF0C\u6311\u6218\u5931\u8D25\u3002');

        const level = this.getCurrentLevelConfig();
        const nextLevel = this.getNextImplementedLevelConfig(level.id);
        const wasAlreadyCompleted = this.completedLevels.has(level.id);
        let resultHint: string;
        if (playerWon) {
            this.completedLevels.add(level.id);
            if (level.id === 1) {
                this.levelOneTutorialCompleted = true;
                this.levelOneTutorialVersion = LEVEL_ONE_TUTORIAL_VERSION;
            }
            // Keep the legacy high-water mark for rollback only. It is no longer an entry gate.
            this.highestUnlockedLevel = level.id === 1
                ? Math.max(...LEVEL_CONFIGS.filter((config) => this.isLevelImplemented(config))
                    .map((config) => config.id))
                : Math.max(this.highestUnlockedLevel, nextLevel?.id ?? level.id);
            if ((nextLevel?.id ?? level.id) >= 4) this.freezeUnlocked = true;
            if (level.id === 6) this.updateLevelSixBestResult();
            this.saveLevelProgress();
            resultHint = level.id === 1 && !wasAlreadyCompleted
                ? '第1关教学已通关，第2至第6关现已全部开放。'
                : wasAlreadyCompleted
                ? '\u672C\u5173\u5DF2\u518D\u6B21\u5B8C\u6210\uFF0C\u53EF\u91CD\u65B0\u6311\u6218\u6216\u9009\u62E9\u5176\u4ED6\u5173\u5361\u3002'
                : nextLevel
                    ? `\u53EF\u7EE7\u7EED\u6311\u6218\u7B2C ${nextLevel.id} \u5173\uFF0C\u4E5F\u53EF\u4EE5\u8FD4\u56DE\u9009\u5173\u3002`
                    : '\u5F53\u524D\u5DF2\u5B8C\u6210\u5168\u90E8\u5F00\u653E\u5173\u5361\u3002';
        } else {
            resultHint = '\u53EF\u91CD\u65B0\u6311\u6218\uFF0C\u4E5F\u53EF\u4EE5\u8FD4\u9009\u5173\u8C03\u6574\u9635\u5BB9\u3002';
        }

        this.resultTitleLabel.string = playerWon ? '\u6218\u6597\u80DC\u5229' : '\u6218\u6597\u5931\u8D25';
        this.resultTitleLabel.color = playerWon
            ? new Color(59, 105, 51, 255) : new Color(142, 68, 58, 255);
        this.resultSummaryLabel.string = playerWon
            ? `\u7B2C ${level.id} \u5173\u00B7${level.title} \u6311\u6218\u6210\u529F\n\u6210\u529F\u51FB\u7834\u654C\u65B9\u57FA\u5730`
            : `\u7B2C ${level.id} \u5173\u00B7${level.title} \u6311\u6218\u672A\u5B8C\u6210\n\u73A9\u5BB6\u57FA\u5730\u5DF2\u88AB\u51FB\u7834`;
        this.updateResultDataCard(this.resultPlayerDataCard, this.playerStats, this.playerBaseHealth);
        this.updateResultDataCard(this.resultAiDataCard, this.aiStats, this.aiBaseHealth);
        this.resultHintLabel.string = resultHint;
        this.layoutResultButtons(playerWon && !!nextLevel);
        this.drawResultCard(playerWon);
        this.drawResultBadge(playerWon);
        void this.prepareResultTransition(playerWon);
    }

    private updateLevelSixBestResult(): void {
        const previous = this.bestResultsByLevel.get(6);
        const result: LevelBestResultSave = {
            fastestWinSeconds: previous
                ? Math.min(previous.fastestWinSeconds, Math.max(0.1, this.battleElapsedSeconds))
                : Math.max(0.1, this.battleElapsedSeconds),
            highestBaseHealth: Math.max(previous?.highestBaseHealth ?? 0, this.playerBaseHealth),
            highestSupplyEarned: Math.max(previous?.highestSupplyEarned ?? 0, this.playerStats.supplyEarned),
        };
        this.bestResultsByLevel.set(6, result);
    }

    private async prepareResultTransition(playerWon: boolean): Promise<void> {
        if (ART_FULL_ENABLED) {
            await this.artResourceManager.preloadGroups(['result']);
            if (!this.node.isValid || !this.isFinished) return;
            this.applyResultArt(playerWon);
        }
        this.playResultTransition(playerWon);
    }

    private startNextLevel(): void {
        const nextLevel = this.getNextImplementedLevelConfig(this.currentLevel);
        if (!nextLevel || !this.canChallengeLevel(nextLevel.id)) {
            return;
        }
        if (ART_FULL_ENABLED) {
            this.playFormalLevelTransition();
            return;
        }
        this.enterNextLevelImmediately();
    }

    private enterNextLevelImmediately(): void {
        const nextLevel = this.getNextImplementedLevelConfig(this.currentLevel);
        if (!nextLevel || !this.canChallengeLevel(nextLevel.id)) return;
        this.currentLevel = nextLevel.id;
        this.restartGame();
        if (this.currentLevel >= 4) {
            this.isStarted = false;
            this.pauseButton.node.active = false;
            this.enterBattleFlow();
        } else {
            this.activateBattle();
        }
    }

    private playFormalLevelTransition(): void {
        if (this.levelTransitionActive) return;
        const nextLevel = this.getNextImplementedLevelConfig(this.currentLevel);
        if (!nextLevel || !this.canChallengeLevel(nextLevel.id)) return;
        this.levelTransitionActive = true;
        void this.artResourceManager.preloadGroups(['result']).then(() => {
            if (!this.node.isValid) return;
            const overlay = new Node('FormalLevelTransition');
            overlay.setParent(this.modalLayer);
            overlay.addComponent(UITransform).setContentSize(this.screenMetrics.visibleWidth, this.screenMetrics.visibleHeight);
            overlay.addComponent(BlockInputEvents);
            const opacity = overlay.addComponent(UIOpacity);
            opacity.opacity = 0;
            const transitionBackground = this.applyChildSprite(overlay, 'TransitionBackground',
                ArtPilotResourceKey.LevelTransitionBackground, DESIGN_WIDTH, DESIGN_HEIGHT);
            if (transitionBackground) this.setNodeCoverSize(transitionBackground.node, DESIGN_WIDTH / DESIGN_HEIGHT);
            const transitionBanner = this.applyChildSprite(overlay, 'TransitionBanner',
                ArtPilotResourceKey.LevelTransitionBanner, 560, 210,
                this.screenMetrics.safeCenterX, this.screenMetrics.safeCenterY);
            const wipeFrames = this.artResourceManager.getFrames(ArtPilotResourceKey.LevelTransitionWipe);
            const wipe = this.createSpriteSlot('TransitionWipe', overlay, DESIGN_WIDTH, DESIGN_HEIGHT, 0, 0);
            this.setNodeCoverSize(wipe.node, DESIGN_WIDTH / DESIGN_HEIGHT);
            if (wipeFrames?.length) {
                wipe.sprite.spriteFrame = wipeFrames[0];
                wipe.node.active = true;
                wipeFrames.forEach((frame, index) => this.scheduleOnce(() => {
                    if (wipe.node.isValid) wipe.sprite.spriteFrame = frame;
                }, index * 0.05));
            }
            this.createLabel(overlay, 'TransitionText', `\u7B2C ${nextLevel.id} \u5173`,
                this.screenMetrics.safeCenterX, this.screenMetrics.safeCenterY, 420, 70, 34,
                new Color(255, 244, 204, 255));
            this.showModal(overlay);
            tween(opacity)
                .to(0.18, { opacity: 255 }, { easing: 'quadOut' })
                .delay(0.25)
                .call(() => this.enterNextLevelImmediately())
                .to(0.28, { opacity: 0 }, { easing: 'quadIn' })
                .call(() => {
                    if (overlay.isValid) overlay.destroy();
                    this.levelTransitionActive = false;
                })
                .start();
        });
    }

    private leaveBattleToLevelSelect(): void {
        this.isStarted = false;
        this.restartGame();
        this.isPaused = false;
        this.audioManager.requestMenuBgm();
        this.audioManager.stopBattleSfx();
        this.pauseButton.node.active = false;
        this.levelBadge.active = false;
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        this.tutorialPanel.active = false;
        this.specialRoadTutorialPanel.active = false;
        this.levelFiveTutorialPanel.active = false;
        this.tacticDeckPanel.active = false;
        this.resultPanel.active = false;
        this.startPanel.active = false;
        this.prepareLevelSelection();
        this.showModal(this.levelSelectPanel);
        this.statusToast.active = false;
        this.refreshLevelSelectPanel();
    }

    private applyLevelStartingResources(): void {
        const level = this.getCurrentLevelConfig();
        this.playerEnergy = level.playerStartEnergy;
        this.aiEnergy = level.aiStartEnergy;
        this.aiDecisionCooldown = level.aiInitialDecisionDelay;
        this.snapEnergyBarsToCurrentValues();
    }

    private restartGame(): void {
        this.enforceMandatoryLevelOneGateSelection();
        this.cleanupLevelOneTutorial(false);
        this.audioManager.stopBattleSfx();
        this.audioManager.setBattlePaused(false);
        this.resetResultPresentation();
        this.setBattleTweensPaused(false);
        this.clearBattleUnits();
        this.playerBaseHealth = BASE_MAX_HEALTH;
        this.aiBaseHealth = BASE_MAX_HEALTH;
        this.playerBaseFlashRemaining = 0;
        this.aiBaseFlashRemaining = 0;
        this.clearFeedbackEffects();
        this.hideTacticNotice();
        this.cancelFreezeLaneSelection(false);
        this.applyLevelStartingResources();
        this.playerSupply = 0;
        this.aiSupply = 0;
        this.selectedSheepType = undefined;
        this.playerSpawnCooldown = 0;
        this.aiDeployNoticeCooldown = 0;
        this.playerShockUnlocked = false;
        this.aiShockUnlocked = false;
        this.playerShockUsed = false;
        this.aiShockUsed = false;
        this.playerSprintRemaining = 0;
        this.aiSprintRemaining = 0;
        this.playerSprintCooldown = 0;
        this.aiSprintCooldown = 0;
        this.playerHealCooldown = 0;
        this.aiHealCooldown = 0;
        this.playerFreezeCooldown = 0;
        this.playerEnergySurgeRemaining = 0;
        this.playerEnergySurgeCooldown = 0;
        this.playerSupplyBoostRemaining = 0;
        this.playerSupplyBoostCooldown = 0;
        this.levelFiveRecentPlayerDeployTimes.length = 0;
        this.levelFiveRushHighestAnnounced = 0;
        this.levelFivePlayerFullFlashRemaining = 0;
        this.levelFiveAiFullFlashRemaining = 0;
        if (this.levelFiveRushNotice) {
            Tween.stopAllByTarget(this.levelFiveRushNotice);
            this.levelFiveRushNotice.active = false;
        }
        if (this.levelFiveRushNoticeOpacity) Tween.stopAllByTarget(this.levelFiveRushNoticeOpacity);
        this.battleElapsedSeconds = 0;
        this.playerStats = this.createEmptyBattleStats();
        this.aiStats = this.createEmptyBattleStats();
        this.resetLevelSixGoldenState();
        for (const point of this.supplyPoints) {
            point.owner = null;
            point.capturingTeam = null;
            point.captureTime = 0;
            this.drawSupplyPoint(point);
        }
        this.resetLaneSpawnMarkers();
        this.aiSpawnGateSelectedRemaining.fill(0);
        this.aiSpawnGateFrameIndices.fill(-1);
        this.updatePilotAIGate(0);
        this.isFinished = false;
        this.isPaused = false;
        this.lastBaseHudState = '';
        this.lastUnitButtonState = '';
        this.lastTacticHudState = '';
        this.tacticDisplayRefreshCooldown = 0;
        this.resetAllTacticCardPressStates(false, true);
        this.applyCurrentTacticDeckLayout();
        this.refreshLaneEffectVisuals();
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        if (this.replayLevelOneTutorialConfirmPanel?.isValid) {
            this.replayLevelOneTutorialConfirmPanel.active = false;
        }
        this.pauseButton.node.active = true;
        this.refreshBattleLevelBadge();
        this.levelBadge.active = this.isStarted;
        this.refreshLevelSixGoldenHud();
        this.resultSummaryLabel.string = '';
        this.resultHintLabel.string = '';
        if (this.isStarted) {
            this.audioManager.requestBattleBgm();
        }
        const level = this.getCurrentLevelConfig();
        this.refreshHud(`新的战斗开始：玩家${level.playerStartEnergy}点、AI ${level.aiStartEnergy}点指挥能量。`);
    }

    private removeUnit(unit: BattleUnit): void {
        const activeIndex = this.units.indexOf(unit);
        if (activeIndex >= 0) {
            this.units.splice(activeIndex, 1);
        }
        const dyingIndex = this.dyingUnits.indexOf(unit);
        if (dyingIndex >= 0) {
            this.dyingUnits.splice(dyingIndex, 1);
        }
        this.laneFormationCacheDirty = true;
        this.recycleOrDestroyUnit(unit);
        this.repairLaneInvariants(unit.lane);
    }

    private recycleOrDestroyUnit(unit: BattleUnit): void {
        if (!unit.node.isValid) return;
        const canPool = this.currentLevel === 5
            && unit.definition.type === SheepType.Small
            && this.levelFiveSmallUnitPool.length < LEVEL_FIVE_SMALL_UNIT_POOL_LIMIT;
        if (!canPool) {
            unit.node.destroy();
            return;
        }
        Tween.stopAllByTarget(unit.node);
        Tween.stopAllByTarget(unit.visualNode);
        Tween.stopAllByTarget(unit.opacity);
        unit.isMoving = false;
        unit.isDying = false;
        unit.frozenRemaining = 0;
        unit.freezeVisualNode.active = false;
        unit.freezeFootRingNode.active = false;
        unit.freezeSnowNode.active = false;
        unit.freezeStatusIconNode.active = false;
        unit.hitFlashNode.active = false;
        unit.healthNode.active = false;
        unit.node.setScale(1, 1, 1);
        unit.node.active = false;
        if (this.levelFiveSmallUnitPool.indexOf(unit) < 0) this.levelFiveSmallUnitPool.push(unit);
    }

    private clearBattleUnits(): void {
        this.clearActivePilotVfx();
        this.clearBattleVfx();
        for (const unit of this.units) this.recycleOrDestroyUnit(unit);
        for (const unit of this.dyingUnits) this.recycleOrDestroyUnit(unit);
        this.units.length = 0;
        this.dyingUnits.length = 0;
        this.laneFormationCacheDirty = true;
        this.laneDebugSignatures.clear();
        for (const teamShifts of this.pendingLaneShifts) teamShifts.fill(0);
        this.clearPendingSmallDeployments();
        if (this.currentLevel !== 5) {
            for (const pooledUnit of this.levelFiveSmallUnitPool) {
                if (pooledUnit.node.isValid) pooledUnit.node.destroy();
            }
            this.levelFiveSmallUnitPool.length = 0;
        }
        this.resetLaneRuntimeStates();
    }

    private refreshHud(status?: string): void {
        if (status !== undefined) {
            this.statusMessage = status;
            if (!this.tacticNotice?.active) {
                this.showStatusToast(status);
            }
        }
        if (!this.playerBaseLabel || !this.aiBaseLabel || !this.playerBaseShadowLabel || !this.aiBaseShadowLabel
            || !this.statusLabel || !this.statusToast) {
            return;
        }

        this.playerBaseLabel.string = `玩家基地  ${this.playerBaseHealth} / ${BASE_MAX_HEALTH}`;
        this.aiBaseLabel.string = `AI 基地  ${this.aiBaseHealth} / ${BASE_MAX_HEALTH}`;
        this.playerEnergyLabel.string = `玩家能量  ${Math.floor(this.playerEnergy)} / ${ENERGY_MAX}`;
        this.aiEnergyLabel.string = `AI 能量  ${Math.floor(this.aiEnergy)} / ${ENERGY_MAX}`;
        this.playerSupplyLabel.string = `玩家补给  ${Math.floor(this.playerSupply)} / ${SUPPLY_MAX}  (+${this.getSupplyIncome(Team.Player)}/秒)`;
        this.aiSupplyLabel.string = `AI 补给  ${Math.floor(this.aiSupply)} / ${SUPPLY_MAX}  (+${this.getSupplyIncome(Team.AI)}/秒)`;
        this.refreshBaseBars();
        this.playerBaseLabel.string = `\u73A9\u5BB6\u57FA\u5730  ${this.playerBaseHealth} / ${BASE_MAX_HEALTH}`;
        this.playerBaseShadowLabel.string = this.playerBaseLabel.string;
        this.aiBaseLabel.string = `AI \u57FA\u5730  ${this.aiBaseHealth} / ${BASE_MAX_HEALTH}`;
        this.aiBaseShadowLabel.string = this.aiBaseLabel.string;
        this.aiSupplyLabel.string = `AI \u8865\u7ED9 ${Math.floor(this.aiSupply)} / ${SUPPLY_MAX}`;
        this.aiEnergyLabel.string = `AI \u80FD\u91CF ${Math.floor(this.aiEnergy)} / ${ENERGY_MAX}`;
        this.playerEnergyLabel.string = `\u80FD\u91CF ${Math.floor(this.playerEnergy)} / ${ENERGY_MAX}`;
        this.aiEnergyBar.shadowLabel.string = this.aiEnergyLabel.string;
        this.playerEnergyBar.shadowLabel.string = this.playerEnergyLabel.string;
        this.playerSupplyLabel.string = `\u8865\u7ED9 ${Math.floor(this.playerSupply)} / ${SUPPLY_MAX}`;
        const unitButtonState = `${this.selectedSheepType ?? 'none'}:${UNIT_ORDER.map((type) => this.playerEnergy >= UNIT_DEFINITIONS[type].cost ? '1' : '0').join('')}`;
        if (unitButtonState !== this.lastUnitButtonState) {
            this.lastUnitButtonState = unitButtonState;
            this.refreshUnitTypeButtons();
        }
        this.refreshTacticCards();
    }

    private showStatusToast(message: string): void {
        if (!this.statusToast || !this.statusLabel || !this.statusToastOpacity) {
            return;
        }
        Tween.stopAllByTarget(this.statusToast);
        Tween.stopAllByTarget(this.statusToastOpacity);
        this.ensureOverlayLayerOrder();
        this.statusLabel.string = message;
        this.statusToast.active = true;
        this.statusToast.setPosition(STATUS_TOAST_X, STATUS_TOAST_Y, 0);
        this.statusToast.setScale(1, 1, 1);
        this.statusToastOpacity.opacity = 0;
        this.statusToastRemaining = STATUS_TOAST_FADE_IN_SECONDS
            + STATUS_TOAST_HOLD_SECONDS + STATUS_TOAST_FADE_OUT_SECONDS;
        tween(this.statusToastOpacity)
            .to(STATUS_TOAST_FADE_IN_SECONDS, { opacity: 255 }, { easing: 'quadOut' })
            .delay(STATUS_TOAST_HOLD_SECONDS)
            .to(STATUS_TOAST_FADE_OUT_SECONDS, { opacity: 0 }, { easing: 'quadIn' })
            .call(() => {
                if (this.statusToastOpacity.opacity <= 0) {
                    this.statusToast.active = false;
                }
            })
            .start();
    }

    private ensureOverlayLayerOrder(): void {
        if (!this.node?.isValid || !this.fullscreenBackgroundRoot?.isValid || !this.gameLayer?.isValid
            || !this.safeUiRoot?.isValid || !this.toastLayer?.isValid || !this.modalLayer?.isValid) return;
        this.fullscreenBackgroundRoot.setSiblingIndex(0);
        this.gameLayer.setSiblingIndex(1);
        this.safeUiRoot.setSiblingIndex(2);
        this.hudLayer.setSiblingIndex(0);
        this.toastLayer.setSiblingIndex(Math.min(1, this.safeUiRoot.children.length - 1));
        if (this.capsuleExclusion?.isValid) {
            this.capsuleExclusion.setSiblingIndex(this.safeUiRoot.children.length - 1);
        }
        this.modalLayer.setSiblingIndex(this.node.children.length - 1);
    }

    private refreshUnitTypeButtons(): void {
        for (const type of UNIT_ORDER) {
            const button = this.typeButtons.get(type);
            if (!button) {
                continue;
            }
            const definition = UNIT_DEFINITIONS[type];
            const tier = UNIT_TIER_VISUALS[type];
            const state = this.getUnitCardVisualState(type, button);
            const isUnlocked = this.isUnitTypeUnlocked(type);
            const hasEnoughEnergy = this.playerEnergy >= definition.cost;
            const statusState: UnitCardVisualState = state === 'selected' || state === 'selected-insufficient'
                ? state : !isUnlocked ? 'locked' : hasEnoughEnergy ? 'available' : 'insufficient';
            const tutorialExpected = this.tutorialFlowActive && this.tutorialProgress === 'deploy-four-sheep'
                ? LEVEL_ONE_TUTORIAL_DEPLOYMENTS[this.tutorialDeploymentIndex] : undefined;
            const isTutorialCardTarget = tutorialExpected?.type === type && this.selectedSheepType !== type;
            button.visualState = state;
            const isSelected = state === 'selected' || state === 'selected-insufficient';
            const isAvailable = state === 'available' || state === 'selected' || state === 'pressed';
            const fillColor = isSelected
                ? state === 'selected-insufficient'
                    ? new Color(222, 188, 107, 255) : new Color(250, 224, 141, 255)
                : state === 'pressed' ? new Color(188, 219, 174, 255)
                    : isAvailable ? new Color(226, 239, 205, 255) : new Color(181, 175, 151, 255);
            const borderColor = isSelected
                ? new Color(190, 126, 21, 255)
                : isAvailable ? new Color(91, 139, 70, 255) : new Color(126, 105, 72, 255);
            const usesPilotCard = !!button.artSprite?.node.active && !!button.artSprite.spriteFrame;
            if (usesPilotCard && button.artSprite) {
                button.graphics.enabled = false;
                button.artSprite.color = isAvailable
                    ? (state === 'pressed' ? new Color(225, 235, 226, 255) : Color.WHITE)
                    : state === 'locked' ? new Color(142, 142, 138, 255) : new Color(178, 180, 174, 255);
                if (button.artSelectionGraphics) {
                    const selectionNode = button.artSelectionGraphics.node;
                    selectionNode.active = isSelected;
                    button.artSelectionGraphics.clear();
                    if (isSelected) {
                        button.artSelectionGraphics.fillColor = new Color(255, 223, 115, 92);
                        button.artSelectionGraphics.roundRect(
                            -UNIT_CARD_WIDTH / 2 + 1,
                            -UNIT_CARD_HEIGHT / 2 + 1,
                            UNIT_CARD_WIDTH - 2,
                            UNIT_CARD_HEIGHT - 2,
                            11,
                        );
                        button.artSelectionGraphics.fill();
                        button.artSelectionGraphics.lineWidth = 4;
                        button.artSelectionGraphics.strokeColor = new Color(245, 190, 47, 255);
                        button.artSelectionGraphics.roundRect(
                            -UNIT_CARD_WIDTH / 2 + 1.5,
                            -UNIT_CARD_HEIGHT / 2 + 1.5,
                            UNIT_CARD_WIDTH - 3,
                            UNIT_CARD_HEIGHT - 3,
                            10,
                        );
                        button.artSelectionGraphics.stroke();
                    }
                }
            } else {
                button.graphics.enabled = true;
                if (button.artSelectionGraphics) {
                    button.artSelectionGraphics.node.active = false;
                }
                this.drawButton(button, fillColor, borderColor);
            }
            Tween.stopAllByTarget(button.node);
            const targetScale = state === 'pressed' ? 0.98 : 1;
            button.node.setScale(targetScale, targetScale, 1);
            button.label.string = `${tier.displayName.sheep}\n${definition.cost}\u80FD`;
            button.label.color = usesPilotCard
                ? (isSelected ? new Color(76, 50, 30, 255) : isAvailable ? UI_TEXT_PRIMARY : UI_TEXT_SECONDARY)
                : (isSelected ? new Color(76, 50, 30, 255)
                    : isAvailable ? new Color(43, 75, 40, 255) : new Color(92, 81, 66, 255));
            button.stateLabel.string = isTutorialCardTarget ? '\u6559\u7A0B'
                : statusState === 'locked' ? '\u9501\u5B9A'
                : statusState === 'insufficient' ? '\u7F3A\u80FD'
                    : statusState === 'selected-insufficient' ? '\u9009\u4E2D\u7F3A\u80FD'
                        : statusState === 'selected' ? '\u5DF2\u9009' : '\u53EF\u7528';
            this.drawUnitCardStatus(button, statusState);
            button.tierBadgeNode.getComponent(UIOpacity)!.opacity = isUnlocked ? 255 : 185;
            this.orderUnitCardChildren(button);
        }
    }

    private drawUnitCardStatus(button: UnitTypeButtonView, state: UnitCardVisualState): void {
        const graphics = button.statusBackgroundGraphics;
        const palette = state === 'insufficient'
                ? { fill: new Color(255, 222, 199, 255), border: new Color(205, 111, 78, 255), text: new Color(174, 67, 43, 255) }
                : state === 'selected-insufficient'
                    ? { fill: new Color(255, 226, 154, 255), border: new Color(190, 126, 21, 255), text: new Color(139, 66, 25, 255) }
                    : state === 'selected'
                        ? { fill: new Color(255, 238, 166, 255), border: new Color(190, 126, 21, 255), text: new Color(103, 69, 22, 255) }
                : state === 'locked'
                    ? { fill: new Color(113, 105, 98, 255), border: new Color(82, 76, 71, 255), text: new Color(239, 232, 219, 255) }
                    : { fill: new Color(188, 231, 199, 255), border: new Color(76, 145, 91, 255), text: new Color(38, 91, 52, 255) };
        graphics.clear();
        graphics.fillColor = palette.fill;
        graphics.roundRect(
            -UNIT_CARD_STATUS_BOX_WIDTH / 2,
            -UNIT_CARD_STATUS_BOX_HEIGHT / 2,
            UNIT_CARD_STATUS_BOX_WIDTH,
            UNIT_CARD_STATUS_BOX_HEIGHT,
            5,
        );
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = palette.border;
        graphics.roundRect(
            -UNIT_CARD_STATUS_BOX_WIDTH / 2 + 1,
            -UNIT_CARD_STATUS_BOX_HEIGHT / 2 + 1,
            UNIT_CARD_STATUS_BOX_WIDTH - 2,
            UNIT_CARD_STATUS_BOX_HEIGHT - 2,
            4,
        );
        graphics.stroke();
        button.stateLabel.color = palette.text;
    }

    private orderUnitCardChildren(button: UnitTypeButtonView): void {
        let nextIndex = 0;
        if (button.artSprite?.node.isValid) {
            button.artSprite.node.setSiblingIndex(nextIndex);
            nextIndex += 1;
        }
        if (button.artSelectionGraphics?.node.isValid) {
            button.artSelectionGraphics.node.setSiblingIndex(nextIndex);
            nextIndex += 1;
        }
        button.statusBackgroundNode.setSiblingIndex(nextIndex);
        button.tierBadgeNode.setSiblingIndex(button.node.children.length - 1);
        button.label.node.setSiblingIndex(button.node.children.length - 1);
        button.stateLabel.node.setSiblingIndex(button.node.children.length - 1);
    }

    private getUnitCardVisualState(type: SheepType, button: UnitTypeButtonView): UnitCardVisualState {
        if (!this.isUnitTypeUnlocked(type)) return 'locked';
        if (this.selectedSheepType === type) {
            return this.playerEnergy < UNIT_DEFINITIONS[type].cost ? 'selected-insufficient' : 'selected';
        }
        if (button.pressed) return 'pressed';
        if (this.playerEnergy < UNIT_DEFINITIONS[type].cost) return 'insufficient';
        return 'available';
    }

    private isUnitTypeUnlocked(_type: SheepType): boolean {
        return true;
    }

    private unlockShockIfNeeded(team: Team): boolean {
        if (team === Team.Player) {
            if (this.playerShockUnlocked || this.playerBaseHealth >= SHOCK_UNLOCK_HEALTH) {
                return false;
            }
            this.playerShockUnlocked = true;
            return true;
        }

        if (this.aiShockUnlocked || this.aiBaseHealth >= SHOCK_UNLOCK_HEALTH) {
            return false;
        }
        this.aiShockUnlocked = true;
        return true;
    }

    private tryUseAIShock(): void {
        const levelConfig = this.getCurrentLevelConfig();
        if (!levelConfig.allowAITactics || !this.aiShockUnlocked || this.aiShockUsed || this.isFinished || this.isPaused) {
            return;
        }

        const threats = this.getEnemiesInTerritory(Team.AI);
        if (threats.length === 0) {
            return;
        }

        const threatPower = threats.reduce((total, unit) => total + unit.definition.battlePower * unit.health / unit.definition.maxHealth, 0);
        const enemyNearBase = threats.some((unit) => unit.node.position.y >= this.getBaseEndpointY(unit) - 115);
        if (threats.length >= levelConfig.aiShockMinTargets || threatPower >= levelConfig.aiShockPowerThreshold || enemyNearBase) {
            this.tryUseShock(Team.AI);
        }
    }

    private tryUseShock(owner: Team): void {
        if (!this.isStarted || this.isFinished || this.isPaused
            || (owner === Team.Player && this.tutorialFlowActive)) {
            return;
        }

        const isPlayer = owner === Team.Player;
        const isUnlocked = isPlayer ? this.playerShockUnlocked : this.aiShockUnlocked;
        const isUsed = isPlayer ? this.playerShockUsed : this.aiShockUsed;
        if (isUsed) {
            if (isPlayer) {
                this.refreshHud('领地震荡本局已使用。');
            }
            return;
        }
        if (!isUnlocked) {
            if (isPlayer) {
                this.refreshHud('基地血量低于 50% 后，才能解锁领地震荡。');
            }
            return;
        }

        const targets = this.getEnemiesInTerritory(owner);
        if (targets.length === 0) {
            if (isPlayer) {
                this.refreshHud('本方领地内没有敌军，领地震荡已保留。');
            }
            return;
        }

        if (isPlayer) {
            this.playerShockUsed = true;
        } else {
            this.aiShockUsed = true;
        }
        this.getBattleStats(owner).shockUses += 1;
        this.audioManager.playSfx('tactic_shock');
        this.playFormalTacticVfx(ArtPilotResourceKey.TacticShock, owner, true);

        let defeatedCount = 0;
        let repelledCount = 0;
        const shiftedLanes = new Set<number>();
        for (const target of targets) {
            const isLightUnit = target.definition.type === SheepType.Small || target.definition.type === SheepType.Medium;
            if (isLightUnit) {
                this.startUnitDeath(target);
                defeatedCount += 1;
                continue;
            }

            const damage = Math.ceil(target.definition.maxHealth * SHOCK_HEAVY_DAMAGE_RATIO);
            this.applyUnitDamage(target, damage, 1);
            this.triggerUnitImpact(target, true);
            shiftedLanes.add(target.lane);
            repelledCount += 1;
        }

        const knockbackDirection = owner === Team.Player ? 1 : -1;
        const targetTeam = owner === Team.Player ? Team.AI : Team.Player;
        for (const lane of shiftedLanes) {
            this.queueLaneShift(targetTeam, lane, knockbackDirection * SHOCK_KNOCKBACK_DISTANCE);
        }
        this.createShockEffect(owner);
        this.triggerBattleLayerShake();
        this.repairAllLaneInvariants();
        this.showTacticNotice(owner, '\u9886\u5730\u9707\u8361');
        const ownerName = isPlayer ? '玩家' : 'AI';
        this.refreshHud(`${ownerName}释放领地震荡：消灭 ${defeatedCount} 名轻型敌军，击退 ${repelledCount} 名重型敌军。`);
    }

    private toggleFreezeLaneSelection(): void {
        if (this.freezeLaneSelectionActive) {
            this.cancelFreezeLaneSelection(true);
            return;
        }
        this.beginFreezeLaneSelection();
    }

    private beginFreezeLaneSelection(): void {
        if (this.tutorialFlowActive) return;
        const availability = this.getPlayerTacticAvailability('freeze');
        if (!availability.enabled || this.getActiveTacticDeck().indexOf('freeze') < 0) {
            this.refreshHud(availability.statusText);
            return;
        }
        this.freezeLaneSelectionActive = true;
        this.freezeSelectionCancelLayer.active = true;
        this.freezeSelectionCancelLayer.setSiblingIndex(0);
        this.freezeSelectionCancelButton.node.active = true;
        for (let lane = 0; lane < this.freezeLaneHighlightNodes.length; lane += 1) {
            const highlight = this.freezeLaneHighlightNodes[lane];
            Tween.stopAllByTarget(this.freezeLaneHighlightOpacities[lane]);
            this.freezeLaneHighlightOpacities[lane].opacity = 255;
            highlight.active = true;
        }
        this.refreshTacticCards(true);
        this.refreshHud('请点击要冻结的道路，或点击取消。');
    }

    private cancelFreezeLaneSelection(showMessage: boolean): void {
        this.freezeLaneSelectionActive = false;
        if (this.freezeSelectionCancelLayer) this.freezeSelectionCancelLayer.active = false;
        if (this.freezeSelectionCancelButton) this.freezeSelectionCancelButton.node.active = false;
        for (let lane = 0; lane < this.freezeLaneHighlightNodes.length; lane += 1) {
            Tween.stopAllByTarget(this.freezeLaneHighlightOpacities[lane]);
            this.freezeLaneHighlightNodes[lane].active = false;
        }
        if (showMessage) this.refreshHud('已取消道路冻结，未消耗补给。');
        if (this.playerFreezeCard) this.refreshTacticCards(true);
    }

    private tryConfirmFreezeLane(lane: number): void {
        if (!this.freezeLaneSelectionActive || this.isPaused || this.isFinished) return;
        const targets = this.units.filter((unit) => unit.team === Team.AI && unit.lane === lane
            && this.isActiveBattleUnit(unit));
        if (targets.length === 0) {
            this.refreshHud('该道路暂无可冻结的敌人');
            return;
        }
        if (this.playerSupply < FREEZE_SUPPLY_COST || this.playerFreezeCooldown > 0) {
            this.cancelFreezeLaneSelection(false);
            this.refreshHud(this.playerSupply < FREEZE_SUPPLY_COST ? '补给不足' : '道路冻结冷却中');
            return;
        }
        this.playerSupply -= FREEZE_SUPPLY_COST;
        this.playerFreezeCooldown = FREEZE_COOLDOWN_SECONDS;
        this.playerStats.freezeUses += 1;
        this.createFreezeCastWaveVfx(lane);
        for (const target of targets) {
            target.frozenRemaining = Math.max(target.frozenRemaining, FREEZE_DURATION_SECONDS);
            target.isMoving = false;
            target.freezeVisualNode.active = true;
            target.freezeFootRingNode.active = true;
            target.freezeSnowNode.active = true;
            target.freezeStatusIconNode.active = true;
            target.freezeVisualRefreshRemaining = 0;
            this.drawFrozenUnitVisual(target);
            this.createFreezeUnitBurstVfx(target);
        }
        this.freezeLaneSelectionActive = false;
        this.freezeSelectionCancelLayer.active = false;
        this.freezeSelectionCancelButton.node.active = false;
        for (let index = 0; index < this.freezeLaneHighlightNodes.length; index += 1) {
            const highlight = this.freezeLaneHighlightNodes[index];
            const opacity = this.freezeLaneHighlightOpacities[index];
            Tween.stopAllByTarget(opacity);
            if (index !== lane) {
                highlight.active = false;
                continue;
            }
            highlight.active = true;
            opacity.opacity = 255;
            tween(opacity)
                .to(0.45, { opacity: 0 }, { easing: 'quadOut' })
                .call(() => { highlight.active = false; })
                .start();
        }
        this.audioManager.playSfx('ui_click');
        this.showTacticNotice(Team.Player, '道路冻结');
        this.refreshTacticCards(true);
        this.refreshHud(`第${lane + 1}路已冻结${targets.length}名敌人，持续${FREEZE_DURATION_SECONDS}秒。`);
    }

    private getEnemiesInTerritory(owner: Team): BattleUnit[] {
        return this.units.filter((unit) => {
            if (unit.team === owner || unit.health <= 0 || !unit.node.isValid) {
                return false;
            }
            return owner === Team.Player ? unit.node.position.y <= 0 : unit.node.position.y >= 0;
        });
    }

    private createShockEffect(owner: Team): void {
        const effect = this.createGraphicsNode('ShockWave', 1120, 330, 0, owner === Team.Player ? -150 : 150, this.unitsAndVfxLayer);
        const graphics = effect.getComponent(Graphics)!;
        const fillColor = owner === Team.Player ? new Color(90, 194, 255, 72) : new Color(255, 111, 91, 72);
        const strokeColor = owner === Team.Player ? new Color(170, 234, 255, 240) : new Color(255, 191, 177, 240);
        graphics.fillColor = fillColor;
        graphics.roundRect(-560, -165, 1120, 330, 28);
        graphics.fill();
        graphics.lineWidth = 7;
        graphics.strokeColor = strokeColor;
        graphics.roundRect(-560, -165, 1120, 330, 28);
        graphics.stroke();
        this.scheduleOnce(() => {
            if (effect.isValid) {
                effect.destroy();
            }
        }, 0.35);
    }

    private triggerBattleLayerShake(): void {
        Tween.stopAllByTarget(this.battleLayer);
        this.battleLayer.setPosition(0, 0, 0);
        tween(this.battleLayer)
            .by(0.04, { position: new Vec3(3, 1, 0) }, { easing: 'quadOut' })
            .by(0.04, { position: new Vec3(-6, -2, 0) }, { easing: 'quadInOut' })
            .by(0.04, { position: new Vec3(5, 2, 0) }, { easing: 'quadInOut' })
            .by(0.04, { position: new Vec3(-2, -1, 0) }, { easing: 'quadIn' })
            .call(() => {
                if (this.battleLayer.isValid) {
                    this.battleLayer.setPosition(0, 0, 0);
                }
            })
            .start();
    }

    private playFormalTacticVfx(key: ArtPilotResourceKey, team: Team, laneWide = false): void {
        if (!ART_FULL_ENABLED) return;
        void this.artResourceManager.preloadGroups(['tactics']).then(() => {
            if (!this.node.isValid || this.isFinished) return;
            if (laneWide) {
                const y = team === Team.Player ? -150 : 150;
                for (const laneX of LANE_X) {
                    this.playPilotVfx(key, laneX, y, 118, 12);
                }
                return;
            }
            const targets = this.units.filter((unit) => unit.team === team && unit.health > 0 && unit.node.isValid);
            for (const unit of targets) {
                this.playPilotVfx(key, unit.node.position.x, unit.node.position.y, 92, 12);
            }
        });
    }

    private getSprintMultiplier(team: Team): number {
        const remaining = team === Team.Player ? this.playerSprintRemaining : this.aiSprintRemaining;
        return remaining > 0 ? SPRINT_SPEED_MULTIPLIER : 1;
    }

    private tryUseEnergySurge(): void {
        if (!this.isStarted || this.isFinished || this.isPaused || this.tutorialFlowActive || this.currentLevel < 5) return;
        const availability = this.getPlayerTacticAvailability('surge');
        if (!availability.enabled || this.getActiveTacticDeck().indexOf('surge') < 0) {
            this.refreshHud(availability.statusText);
            return;
        }
        this.playerSupply -= ENERGY_SURGE_SUPPLY_COST;
        this.playerEnergySurgeRemaining = ENERGY_SURGE_DURATION_SECONDS;
        this.playerEnergySurgeCooldown = ENERGY_SURGE_COOLDOWN_SECONDS;
        this.playerStats.surgeUses += 1;
        this.audioManager.playSfx('tactic_sprint');
        this.showTacticNotice(Team.Player, '能量涌流');
        this.refreshTacticCards(true);
        this.refreshHud(`能量涌流启动：${ENERGY_SURGE_DURATION_SECONDS}秒内能量恢复速度翻倍。`);
    }

    private tryUseSupplyBoost(): void {
        if (!this.isStarted || this.isFinished || this.isPaused || this.tutorialFlowActive || this.currentLevel !== 6) return;
        const availability = this.getPlayerTacticAvailability('supplyBoost');
        if (!availability.enabled || this.getActiveTacticDeck().indexOf('supplyBoost') < 0) {
            this.refreshHud(availability.statusText);
            return;
        }
        this.playerSupply -= SUPPLY_BOOST_SUPPLY_COST;
        this.playerSupplyBoostRemaining = SUPPLY_BOOST_DURATION_SECONDS;
        this.playerSupplyBoostCooldown = SUPPLY_BOOST_COOLDOWN_SECONDS;
        this.supplyBoostTriggeredRound = 0;
        this.playerStats.supplyBoostUses += 1;
        this.audioManager.playSfx('tactic_sprint');
        this.showTacticNotice(Team.Player, '补给强化');
        this.refreshTacticCards(true);
        this.refreshHud(`补给强化已启动：${SUPPLY_BOOST_DURATION_SECONDS}秒内等待下一次黄金补给点占领。`);
    }

    private tryUseSprint(team: Team): void {
        const tutorialSprintAllowed = team === Team.Player && this.tutorialFlowActive
            && this.tutorialProgress === 'use-sprint'
            && LEVEL_ONE_TUTORIAL_PAGES[this.tutorialVisiblePage] === 'use-sprint';
        if (!this.isStarted || this.isFinished || this.isPaused
            || (team === Team.Player && this.tutorialFlowActive && !tutorialSprintAllowed)) {
            return;
        }

        const isPlayer = team === Team.Player;
        const supplyBefore = isPlayer ? this.playerSupply : this.aiSupply;
        const sprintUsesBefore = this.getBattleStats(team).sprintUses;
        const remaining = isPlayer ? this.playerSprintRemaining : this.aiSprintRemaining;
        const cooldown = isPlayer ? this.playerSprintCooldown : this.aiSprintCooldown;
        const supply = isPlayer ? this.playerSupply : this.aiSupply;
        const tacticName = '\u5168\u4F53\u51B2\u523A';
        if (remaining > 0 || cooldown > 0) {
            if (isPlayer) {
                this.refreshHud(`${tacticName}\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7B49\u5F85 ${Math.max(1, Math.ceil(Math.max(remaining, cooldown)))} \u79D2\u3002`);
            }
            return;
        }
        if (supply < SPRINT_SUPPLY_COST) {
            if (isPlayer) {
                this.refreshHud(`${tacticName}\u9700\u8981 ${SPRINT_SUPPLY_COST} \u70B9\u8865\u7ED9\u3002`);
            }
            return;
        }
        if (!this.units.some((unit) => unit.team === team && unit.health > 0 && unit.node.isValid)) {
            if (isPlayer) {
                this.refreshHud('\u6218\u573A\u4E0A\u6CA1\u6709\u53EF\u51B2\u523A\u7684\u5DF1\u65B9\u5355\u4F4D\u3002');
            }
            return;
        }

        if (isPlayer) {
            this.playerSupply -= SPRINT_SUPPLY_COST;
            this.playerSprintRemaining = SPRINT_DURATION_SECONDS;
            this.playerSprintCooldown = SPRINT_COOLDOWN_SECONDS;
        } else {
            this.aiSupply -= SPRINT_SUPPLY_COST;
            this.aiSprintRemaining = SPRINT_DURATION_SECONDS;
            this.aiSprintCooldown = SPRINT_COOLDOWN_SECONDS;
        }
        this.getBattleStats(team).sprintUses += 1;
        this.audioManager.playSfx('tactic_sprint');
        this.playFormalTacticVfx(ArtPilotResourceKey.TacticSprint, team);
        this.repairAllLaneInvariants();
        this.showTacticNotice(team, tacticName);
        this.refreshHud(`${isPlayer ? '\u73A9\u5BB6' : 'AI'} \u4F7F\u7528${tacticName}\uFF1A\u5168\u90E8\u5B58\u6D3B\u5355\u4F4D\u79FB\u52A8\u901F\u5EA6 +50%\uFF0C\u6301\u7EED ${SPRINT_DURATION_SECONDS} \u79D2\u3002`);
        if (tutorialSprintAllowed) {
            const actuallyDeducted = Math.abs((supplyBefore - this.playerSupply) - SPRINT_SUPPLY_COST) < 0.001;
            const actuallyApplied = this.playerSprintRemaining > 0
                && this.playerSprintCooldown > 0
                && this.playerStats.sprintUses === sprintUsesBefore + 1;
            if (actuallyDeducted && actuallyApplied) {
                // A subsidy is calculated only up to the missing part of this exact cost,
                // so a successful deduction consumes all of it and leaves no gift behind.
                this.tutorialSprintSubsidyRemaining = 0;
                this.tutorialSprintSubsidyGranted = false;
                this.tutorialProgress = 'use-sprint-complete';
                this.tutorialSimulationFrozen = true;
                this.refreshLevelOneTutorialPresentation();
                this.refreshHud('全体冲刺已真实扣除2点补给并生效，请点击“下一步”。');
            }
        }
    }

    private tryUseHeal(team: Team): void {
        if (!this.isStarted || this.isFinished || this.isPaused
            || (team === Team.Player && this.tutorialFlowActive)) {
            return;
        }

        const isPlayer = team === Team.Player;
        const cooldown = isPlayer ? this.playerHealCooldown : this.aiHealCooldown;
        const supply = isPlayer ? this.playerSupply : this.aiSupply;
        const tacticName = '\u6218\u5730\u6025\u6551';
        if (cooldown > 0) {
            if (isPlayer) {
                this.refreshHud(`${tacticName}\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7B49\u5F85 ${Math.max(1, Math.ceil(cooldown))} \u79D2\u3002`);
            }
            return;
        }
        if (supply < HEAL_SUPPLY_COST) {
            if (isPlayer) {
                this.refreshHud(`${tacticName}\u9700\u8981 ${HEAL_SUPPLY_COST} \u70B9\u8865\u7ED9\u3002`);
            }
            return;
        }

        const damagedUnits = this.units.filter((unit) => unit.team === team && unit.health > 0 && unit.node.isValid
            && unit.health < unit.definition.maxHealth);
        if (damagedUnits.length === 0) {
            if (isPlayer) {
                this.refreshHud('\u6CA1\u6709\u53D7\u4F24\u7684\u5DF1\u65B9\u5355\u4F4D\u53EF\u4EE5\u6025\u6551\u3002');
            }
            return;
        }

        for (const unit of damagedUnits) {
            const healAmount = Math.ceil(unit.definition.maxHealth * HEAL_AMOUNT_RATIO);
            unit.health = Math.min(unit.definition.maxHealth, unit.health + healAmount);
        }
        if (isPlayer) {
            this.playerSupply -= HEAL_SUPPLY_COST;
            this.playerHealCooldown = HEAL_COOLDOWN_SECONDS;
        } else {
            this.aiSupply -= HEAL_SUPPLY_COST;
            this.aiHealCooldown = HEAL_COOLDOWN_SECONDS;
        }
        this.getBattleStats(team).healUses += 1;
        this.audioManager.playSfx('tactic_heal');
        this.playFormalTacticVfx(ArtPilotResourceKey.TacticHeal, team);
        this.repairAllLaneInvariants();
        this.showTacticNotice(team, tacticName);
        this.refreshHud(`${isPlayer ? '\u73A9\u5BB6' : 'AI'} \u4F7F\u7528${tacticName}\uFF1A${damagedUnits.length} \u4E2A\u5B58\u6D3B\u5355\u4F4D\u6062\u590D\u4E86 40% \u6700\u5927\u751F\u547D\u3002`);
    }

    private tryUseAITacticCards(): void {
        if (this.isFinished || this.isPaused) {
            return;
        }

        const levelConfig = this.getCurrentLevelConfig();
        if (!levelConfig.allowAITactics) {
            return;
        }
        const aiUnits = this.units.filter((unit) => unit.team === Team.AI && unit.health > 0 && unit.node.isValid);
        const injuredUnits = aiUnits.filter((unit) => unit.health / unit.definition.maxHealth <= levelConfig.aiHealHealthRatio);
        if (injuredUnits.length >= levelConfig.aiHealInjuredUnitCount && this.aiSupply >= HEAL_SUPPLY_COST && this.aiHealCooldown <= 0) {
            this.tryUseHeal(Team.AI);
            return;
        }

        if (aiUnits.length < 2 || this.aiSupply < SPRINT_SUPPLY_COST
            || this.aiSprintRemaining > 0 || this.aiSprintCooldown > 0) {
            return;
        }
        const aiPower = this.getTeamBattlePower(Team.AI);
        const playerPower = this.getTeamBattlePower(Team.Player);
        const hasAdvancedUnit = aiUnits.some((unit) => unit.node.position.y < levelConfig.aiSprintAdvanceY);
        if (hasAdvancedUnit && aiPower >= Math.max(36, playerPower * levelConfig.aiSprintPowerRatio)) {
            this.tryUseSprint(Team.AI);
        }
    }

    private getTeamBattlePower(team: Team): number {
        return this.units.filter((unit) => unit.team === team && unit.health > 0 && unit.node.isValid)
            .reduce((total, unit) => total + unit.definition.battlePower * unit.health / unit.definition.maxHealth, 0);
    }

    /*
     * Removed in v0.9: the previous bottom toggle and popup tactic controls.
     * The fixed sidebar above owns tactic state rendering now.
     *
    private refreshSprintButton(): void {
        const tacticName = '\u5168\u4F53\u51B2\u523A';
        let text: string;
        let fill: Color;
        let border: Color;
        if (this.playerSprintRemaining > 0) {
            text = `${tacticName} \u00B7 \u5DF2\u542F\u52A8 ${Math.max(1, Math.ceil(this.playerSprintRemaining))}\u79D2`;
            fill = new Color(47, 150, 184, 255);
            border = new Color(195, 247, 255, 255);
        } else if (this.playerSprintCooldown > 0) {
            text = `${tacticName} \u00B7 \u51B7\u5374 ${Math.max(1, Math.ceil(this.playerSprintCooldown))}\u79D2`;
            fill = new Color(57, 63, 71, 255);
            border = new Color(105, 114, 126, 255);
        } else if (this.playerSupply < SPRINT_SUPPLY_COST) {
            text = `${tacticName} \u00B7 ${SPRINT_SUPPLY_COST}\u8865\u7ED9\uFF08\u4E0D\u8DB3\uFF09`;
            fill = new Color(57, 63, 71, 255);
            border = new Color(105, 114, 126, 255);
        } else {
            text = `${tacticName} \u00B7 ${SPRINT_SUPPLY_COST}\u8865\u7ED9`;
            fill = new Color(47, 125, 190, 255);
            border = new Color(194, 237, 255, 255);
        }
        this.playerSprintButton.label.string = text;
        this.playerSprintButton.label.color = this.playerSprintRemaining > 0
            || (this.playerSprintCooldown <= 0 && this.playerSupply >= SPRINT_SUPPLY_COST)
            ? Color.WHITE : new Color(177, 184, 193, 255);
        this.drawButton(this.playerSprintButton, fill, border);
    }

    private refreshHealButton(): void {
        const tacticName = '\u6218\u5730\u6025\u6551';
        let text: string;
        let fill: Color;
        let border: Color;
        if (this.playerHealCooldown > 0) {
            text = `${tacticName} \u00B7 \u51B7\u5374 ${Math.max(1, Math.ceil(this.playerHealCooldown))}\u79D2`;
            fill = new Color(57, 63, 71, 255);
            border = new Color(105, 114, 126, 255);
        } else if (this.playerSupply < HEAL_SUPPLY_COST) {
            text = `${tacticName} \u00B7 ${HEAL_SUPPLY_COST}\u8865\u7ED9\uFF08\u4E0D\u8DB3\uFF09`;
            fill = new Color(57, 63, 71, 255);
            border = new Color(105, 114, 126, 255);
        } else {
            text = `${tacticName} \u00B7 ${HEAL_SUPPLY_COST}\u8865\u7ED9`;
            fill = new Color(65, 145, 103, 255);
            border = new Color(201, 245, 207, 255);
        }
        this.playerHealButton.label.string = text;
        this.playerHealButton.label.color = this.playerHealCooldown <= 0 && this.playerSupply >= HEAL_SUPPLY_COST
            ? Color.WHITE : new Color(177, 184, 193, 255);
        this.drawButton(this.playerHealButton, fill, border);
    }

    private getAITacticStatusText(): string {
        const shockState = this.aiShockUsed ? '\u5DF2\u4F7F\u7528' : this.aiShockUnlocked ? '\u5DF2\u5C31\u7EEA' : '\u672A\u89E3\u9501';
        const sprintState = this.aiSprintRemaining > 0
            ? `\u51B2\u523A ${Math.max(1, Math.ceil(this.aiSprintRemaining))}\u79D2`
            : this.aiSprintCooldown > 0 ? `\u51B2\u523A\u51B7\u5374 ${Math.max(1, Math.ceil(this.aiSprintCooldown))}\u79D2` : '\u51B2\u523A\u53EF\u7528';
        const healState = this.aiHealCooldown > 0
            ? `\u6025\u6551\u51B7\u5374 ${Math.max(1, Math.ceil(this.aiHealCooldown))}\u79D2` : '\u6025\u6551\u53EF\u7528';
        return `AI \u6218\u672F\uFF1A\u9707\u8361 ${shockState}  |  ${sprintState}  |  ${healState}`;
    }

    private refreshTacticUi(): void {
        if (!this.playerShockButton || !this.playerSprintButton || !this.playerHealButton
            || !this.playerTacticToggleButton || !this.aiTacticLabel) {
            return;
        }

        let playerText: string;
        let playerFill: Color;
        let playerBorder: Color;
        if (this.playerShockUsed) {
            playerText = '领地震荡 · 本局已使用';
            playerFill = new Color(57, 63, 71, 255);
            playerBorder = new Color(105, 114, 126, 255);
        } else if (this.playerShockUnlocked) {
            playerText = '领地震荡 · 立即施放';
            playerFill = new Color(67, 155, 220, 255);
            playerBorder = new Color(210, 245, 255, 255);
        } else {
            playerText = '领地震荡 · 基地低于 50% 解锁';
            playerFill = new Color(57, 63, 71, 255);
            playerBorder = new Color(105, 114, 126, 255);
        }
        this.playerShockButton.label.string = playerText;
        this.playerShockButton.label.color = this.playerShockUnlocked && !this.playerShockUsed
            ? Color.WHITE : new Color(177, 184, 193, 255);
        this.drawButton(this.playerShockButton, playerFill, playerBorder);
        this.refreshSprintButton();
        this.refreshHealButton();
        this.playerTacticToggleButton.label.string = this.isTacticPanelOpen
            ? '\u6218\u672F\u724C  \u25B2' : '\u6218\u672F\u724C  \u25BC';
        this.playerTacticToggleButton.label.color = Color.WHITE;
        this.drawButton(this.playerTacticToggleButton,
            this.isTacticPanelOpen ? new Color(44, 121, 196, 255) : new Color(22, 74, 133, 255),
            new Color(255, 224, 132, 255));

        const aiState = this.aiShockUsed ? '已使用' : this.aiShockUnlocked ? '已就绪' : '未解锁（基地低于 50%）';
        this.aiTacticLabel.string = `AI 领地震荡：${aiState}`;
        this.aiTacticLabel.string = this.getAITacticStatusText();
    }

    */

    private drawUnitVisual(unit: BattleUnit): void {
        const graphics = unit.visualGraphics;
        const { definition } = unit;
        const radius = UNIT_VISUAL_BASE_RADIUS;
        const tier = UNIT_TIER_VISUALS[definition.type];
        const isPlayer = unit.team === Team.Player;
        const [red, green, blue] = definition.color;
        const sheepColor = new Color(red, green, blue, 255);
        const wolfColor = new Color(Math.max(110, red - 35), Math.max(48, green - 130), Math.max(42, blue - 125), 255);
        const outlineColor = isPlayer ? new Color(55, 132, 204, 255) : new Color(115, 38, 42, 255);
        graphics.clear();
        if (isPlayer) {
            this.drawSheepUnit(graphics, definition.type, radius, 0, sheepColor, outlineColor, tier.accentColor);
        } else {
            this.drawWolfUnit(graphics, definition.type, radius, 0, wolfColor, outlineColor, tier.accentColor);
        }
        unit.visualNode.setScale(tier.visualScale, tier.visualScale, 1);
    }

    private drawHitFlash(unit: BattleUnit): void {
        const graphics = unit.hitFlashNode.getComponent(Graphics)!;
        const radius = UNIT_VISUAL_BASE_RADIUS;
        graphics.clear();
        graphics.fillColor = new Color(255, 255, 238, 235);
        if (unit.team === Team.Player) {
            graphics.circle(-radius * 0.38, 0, radius * 0.47);
            graphics.circle(radius * 0.38, 0, radius * 0.47);
            graphics.circle(0, radius * 0.2, radius * 0.53);
            graphics.fill();
            return;
        }
        graphics.moveTo(-radius * 0.7, -radius * 0.5);
        graphics.lineTo(-radius * 0.46, radius * 0.7);
        graphics.lineTo(0, radius * 0.35);
        graphics.lineTo(radius * 0.46, radius * 0.7);
        graphics.lineTo(radius * 0.7, -radius * 0.5);
        graphics.lineTo(0, -radius * 0.72);
        graphics.close();
        graphics.fill();
    }

    private createUnitHealthBar(unit: BattleUnit): void {
        const graphics = unit.healthGraphics;
        const radius = unit.definition.radius;
        const tier = UNIT_TIER_VISUALS[unit.definition.type];
        const barHeight = 10;
        const visualExtent = UNIT_VISUAL_BASE_RADIUS * tier.visualScale;
        const barCenterY = Math.max(radius, visualExtent) + 18;
        const barWidth = radius * 2 + 2;
        graphics.clear();
        graphics.fillColor = new Color(18, 25, 34, 255);
        graphics.roundRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 4);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(142, 158, 174, 255);
        graphics.roundRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 4);
        graphics.stroke();
        graphics.node.setPosition(0, barCenterY, 0);
        unit.healthFillNode.setPosition(-barWidth / 2 + 1, barCenterY, 0);
        const badgeSize = this.getTierBadgeSize(unit.definition.type);
        unit.tierBadgeNode.setPosition(
            -barWidth / 2 - UNIT_TIER_BADGE_GAP - badgeSize / 2,
            barCenterY,
            0,
        );
        unit.laneBuffBadgeNode.setPosition(
            -barWidth / 2 - UNIT_TIER_BADGE_GAP - badgeSize - 11,
            barCenterY,
            0,
        );
        unit.freezeStatusIconNode.setPosition(barWidth / 2 + 12, barCenterY, 0);
        this.drawTierBadge(
            unit.tierBadgeGraphics,
            unit.tierBadgeLabel,
            unit.definition.type,
            badgeSize,
            unit.team,
        );
        this.drawUnitHealthFill(unit);
        this.updateUnitHealthBarDisplay(unit, 0);
    }

    private drawFlowerShieldIcon(graphics: Graphics): void {
        graphics.clear();
        graphics.fillColor = new Color(126, 205, 126, 235);
        graphics.strokeColor = new Color(238, 255, 220, 245);
        graphics.lineWidth = 1.5;
        graphics.moveTo(0, 8);
        graphics.lineTo(7, 4);
        graphics.lineTo(5, -4);
        graphics.lineTo(0, -8);
        graphics.lineTo(-5, -4);
        graphics.lineTo(-7, 4);
        graphics.close();
        graphics.fill();
        graphics.stroke();
        graphics.moveTo(-1, -4);
        graphics.lineTo(2, 4);
        graphics.stroke();
    }

    private drawSnowflakeIcon(graphics: Graphics, radius: number): void {
        graphics.clear();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(185, 238, 255, 255);
        for (let index = 0; index < 3; index += 1) {
            const angle = index * Math.PI / 3;
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            graphics.moveTo(-dx, -dy);
            graphics.lineTo(dx, dy);
        }
        graphics.stroke();
    }

    private drawUnitHealthFill(unit: BattleUnit): void {
        const graphics = unit.healthFillGraphics;
        const barWidth = unit.definition.radius * 2;
        const barHeight = 8;
        graphics.clear();
        graphics.fillColor = unit.team === Team.Player
            ? new Color(66, 213, 122, 255)
            : new Color(239, 83, 80, 255);
        graphics.roundRect(0, -barHeight / 2, barWidth, barHeight, 3);
        graphics.fill();
    }

    private updateUnitHealthBarDisplay(unit: BattleUnit, deltaTime: number): void {
        const targetHealth = unit.isDying ? 0 : Math.max(0, unit.health);
        if (deltaTime <= 0 || Math.abs(unit.displayHealth - targetHealth) <= 0.01) {
            unit.displayHealth = targetHealth;
        } else {
            const duration = unit.isDying ? UNIT_HEALTH_DEATH_DISPLAY_SECONDS
                : targetHealth < unit.displayHealth ? UNIT_HEALTH_DAMAGE_DISPLAY_SECONDS : UNIT_HEALTH_HEAL_DISPLAY_SECONDS;
            const factor = 1 - Math.exp(-4.6 * deltaTime / duration);
            unit.displayHealth += (targetHealth - unit.displayHealth) * factor;
        }
        const displayRatio = Math.max(0, Math.min(1, unit.displayHealth / unit.definition.maxHealth));
        unit.healthFillNode.setScale(displayRatio, 1, 1);
    }

    private drawSheepUnit(
        graphics: Graphics,
        type: SheepType,
        radius: number,
        drawY: number,
        bodyColor: Color,
        outlineColor: Color,
        accentColor: Color,
    ): void {
        const isSmall = type === SheepType.Small;
        const isMedium = type === SheepType.Medium;
        const isLarge = type === SheepType.Large;
        const width = isSmall ? 0.58 : isMedium ? 0.68 : isLarge ? 0.78 : 0.86;

        graphics.fillColor = bodyColor;
        graphics.circle(-radius * width * 0.48, drawY + radius * 0.02, radius * (isSmall ? 0.42 : 0.48));
        graphics.circle(radius * width * 0.48, drawY + radius * 0.02, radius * (isSmall ? 0.42 : 0.48));
        graphics.circle(0, drawY + radius * 0.2, radius * (isSmall ? 0.48 : 0.54));
        if (!isSmall) {
            graphics.circle(-radius * 0.48, drawY + radius * 0.22, radius * 0.32);
            graphics.circle(radius * 0.48, drawY + radius * 0.22, radius * 0.32);
        }
        if (type === SheepType.Giant) {
            graphics.circle(0, drawY + radius * 0.48, radius * 0.34);
        }
        graphics.fill();

        graphics.lineWidth = isSmall ? 2.4 : 3;
        graphics.strokeColor = outlineColor;
        graphics.circle(0, drawY + radius * 0.08, radius * width);
        graphics.stroke();

        graphics.fillColor = new Color(55, 72, 94, 255);
        graphics.circle(0, drawY - radius * 0.18, radius * (isSmall ? 0.34 : 0.39));
        graphics.fill();
        graphics.fillColor = new Color(244, 250, 255, 255);
        graphics.circle(-radius * 0.14, drawY - radius * 0.12, Math.max(2, radius * 0.085));
        graphics.circle(radius * 0.14, drawY - radius * 0.12, Math.max(2, radius * 0.085));
        graphics.fill();

        const earLength = isSmall ? 0.5 : 0.68;
        graphics.fillColor = new Color(188, 211, 228, 255);
        graphics.moveTo(-radius * 0.38, drawY + radius * 0.2);
        graphics.lineTo(-radius * earLength, drawY + radius * (isSmall ? 0.42 : 0.56));
        graphics.lineTo(-radius * 0.24, drawY + radius * 0.4);
        graphics.close();
        graphics.moveTo(radius * 0.38, drawY + radius * 0.2);
        graphics.lineTo(radius * earLength, drawY + radius * (isSmall ? 0.42 : 0.56));
        graphics.lineTo(radius * 0.24, drawY + radius * 0.4);
        graphics.close();
        graphics.fill();

        if (isSmall) {
            graphics.fillColor = accentColor;
            graphics.circle(0, drawY + radius * 0.54, radius * 0.11);
            graphics.fill();
            return;
        }

        graphics.fillColor = accentColor;
        if (isMedium) {
            graphics.roundRect(-radius * 0.38, drawY - radius * 0.5, radius * 0.76, radius * 0.13, 3);
            graphics.fill();
            graphics.moveTo(radius * 0.18, drawY - radius * 0.48);
            graphics.lineTo(radius * 0.36, drawY - radius * 0.72);
            graphics.lineTo(radius * 0.06, drawY - radius * 0.53);
            graphics.close();
            graphics.fill();
            return;
        }

        graphics.roundRect(-radius * 0.72, drawY - radius * 0.08, radius * 0.28, radius * 0.34, 5);
        graphics.roundRect(radius * 0.44, drawY - radius * 0.08, radius * 0.28, radius * 0.34, 5);
        graphics.fill();
        if (isLarge) {
            graphics.roundRect(-radius * 0.36, drawY + radius * 0.24, radius * 0.72, radius * 0.15, 4);
            graphics.fill();
            graphics.lineWidth = 3;
            graphics.strokeColor = accentColor;
            graphics.moveTo(-radius * 0.52, drawY + radius * 0.45);
            graphics.lineTo(-radius * 0.72, drawY + radius * 0.65);
            graphics.moveTo(radius * 0.52, drawY + radius * 0.45);
            graphics.lineTo(radius * 0.72, drawY + radius * 0.65);
            graphics.stroke();
            return;
        }

        graphics.roundRect(-radius * 0.42, drawY + radius * 0.18, radius * 0.84, radius * 0.18, 5);
        graphics.fill();
        graphics.moveTo(-radius * 0.34, drawY + radius * 0.54);
        graphics.lineTo(-radius * 0.18, drawY + radius * 0.78);
        graphics.lineTo(0, drawY + radius * 0.57);
        graphics.lineTo(radius * 0.18, drawY + radius * 0.78);
        graphics.lineTo(radius * 0.34, drawY + radius * 0.54);
        graphics.close();
        graphics.fill();
    }

    private drawWolfUnit(
        graphics: Graphics,
        type: SheepType,
        radius: number,
        drawY: number,
        bodyColor: Color,
        outlineColor: Color,
        accentColor: Color,
    ): void {
        const isSmall = type === SheepType.Small;
        const isMedium = type === SheepType.Medium;
        const isLarge = type === SheepType.Large;
        const width = isSmall ? 0.55 : isMedium ? 0.67 : isLarge ? 0.78 : 0.88;

        if (type === SheepType.Giant) {
            graphics.fillColor = new Color(72, 38, 43, 255);
            graphics.circle(-radius * 0.48, drawY + radius * 0.04, radius * 0.5);
            graphics.circle(radius * 0.48, drawY + radius * 0.04, radius * 0.5);
            graphics.circle(0, drawY + radius * 0.34, radius * 0.58);
            graphics.fill();
        }

        graphics.fillColor = bodyColor;
        graphics.moveTo(-radius * width, drawY - radius * 0.38);
        graphics.lineTo(-radius * (isSmall ? 0.36 : 0.5), drawY + radius * (isSmall ? 0.72 : 0.82));
        graphics.lineTo(-radius * 0.1, drawY + radius * 0.46);
        graphics.lineTo(0, drawY + radius * (isSmall ? 0.34 : 0.42));
        graphics.lineTo(radius * 0.1, drawY + radius * 0.46);
        graphics.lineTo(radius * (isSmall ? 0.36 : 0.5), drawY + radius * (isSmall ? 0.72 : 0.82));
        graphics.lineTo(radius * width, drawY - radius * 0.38);
        if (!isSmall) {
            graphics.lineTo(radius * 0.62, drawY - radius * 0.24);
            graphics.lineTo(radius * 0.76, drawY - radius * 0.06);
        }
        graphics.lineTo(0, drawY - radius * (isSmall ? 0.78 : 0.86));
        if (!isSmall) {
            graphics.lineTo(-radius * 0.76, drawY - radius * 0.06);
            graphics.lineTo(-radius * 0.62, drawY - radius * 0.24);
        }
        graphics.close();
        graphics.fill();
        graphics.lineWidth = isSmall ? 2.4 : 3;
        graphics.strokeColor = outlineColor;
        graphics.stroke();

        graphics.fillColor = new Color(238, 222, 201, 255);
        graphics.moveTo(-radius * (isSmall ? 0.38 : 0.5), drawY - radius * 0.12);
        graphics.lineTo(0, drawY - radius * (isSmall ? 0.62 : 0.7));
        graphics.lineTo(radius * (isSmall ? 0.38 : 0.5), drawY - radius * 0.12);
        graphics.lineTo(0, drawY + radius * 0.1);
        graphics.close();
        graphics.fill();

        graphics.fillColor = new Color(255, 206, 82, 255);
        graphics.circle(-radius * 0.22, drawY + radius * 0.03, Math.max(2, radius * 0.095));
        graphics.circle(radius * 0.22, drawY + radius * 0.03, Math.max(2, radius * 0.095));
        graphics.fill();
        graphics.fillColor = new Color(49, 27, 30, 255);
        graphics.circle(-radius * 0.22, drawY + radius * 0.03, Math.max(1, radius * 0.043));
        graphics.circle(radius * 0.22, drawY + radius * 0.03, Math.max(1, radius * 0.043));
        graphics.fill();

        graphics.fillColor = accentColor;
        if (isSmall) {
            graphics.moveTo(0, drawY - radius * 0.76);
            graphics.lineTo(-radius * 0.09, drawY - radius * 0.62);
            graphics.lineTo(radius * 0.09, drawY - radius * 0.62);
            graphics.close();
            graphics.fill();
            return;
        }
        if (isMedium) {
            graphics.roundRect(-radius * 0.38, drawY + radius * 0.27, radius * 0.76, radius * 0.12, 3);
            graphics.fill();
            graphics.moveTo(-radius * 0.5, drawY - radius * 0.16);
            graphics.lineTo(-radius * 0.7, drawY - radius * 0.02);
            graphics.lineTo(-radius * 0.54, drawY + radius * 0.12);
            graphics.close();
            graphics.moveTo(radius * 0.5, drawY - radius * 0.16);
            graphics.lineTo(radius * 0.7, drawY - radius * 0.02);
            graphics.lineTo(radius * 0.54, drawY + radius * 0.12);
            graphics.close();
            graphics.fill();
            return;
        }

        graphics.roundRect(-radius * 0.48, drawY + radius * 0.22, radius * 0.96, radius * 0.17, 4);
        graphics.fill();
        graphics.roundRect(-radius * 0.82, drawY - radius * 0.22, radius * 0.3, radius * 0.36, 5);
        graphics.roundRect(radius * 0.52, drawY - radius * 0.22, radius * 0.3, radius * 0.36, 5);
        graphics.fill();
        if (isLarge) {
            graphics.lineWidth = 3;
            graphics.strokeColor = accentColor;
            graphics.moveTo(-radius * 0.42, drawY + radius * 0.08);
            graphics.lineTo(-radius * 0.1, drawY - radius * 0.02);
            graphics.moveTo(radius * 0.42, drawY + radius * 0.08);
            graphics.lineTo(radius * 0.1, drawY - radius * 0.02);
            graphics.stroke();
            return;
        }

        graphics.moveTo(-radius * 0.38, drawY + radius * 0.55);
        graphics.lineTo(-radius * 0.2, drawY + radius * 0.8);
        graphics.lineTo(0, drawY + radius * 0.58);
        graphics.lineTo(radius * 0.2, drawY + radius * 0.8);
        graphics.lineTo(radius * 0.38, drawY + radius * 0.55);
        graphics.close();
        graphics.fill();
    }

    private getTierBadgeSize(_type: SheepType): number {
        return UNIT_TYPE_BADGE_SIZE;
    }

    private drawTierBadge(
        graphics: Graphics,
        label: Label,
        type: SheepType,
        size: number,
        team: Team = Team.Player,
    ): void {
        const tier = UNIT_TIER_VISUALS[type];
        const half = size / 2;
        const factionRingColor = team === Team.Player
            ? PLAYER_TYPE_BADGE_RING_COLOR : AI_TYPE_BADGE_RING_COLOR;
        graphics.clear();
        graphics.fillColor = new Color(8, 18, 30, 115);
        graphics.circle(1, -1, half);
        graphics.fill();
        graphics.fillColor = factionRingColor;
        graphics.circle(0, 0, half);
        graphics.fill();
        graphics.fillColor = tier.accentColor;
        graphics.circle(0, 0, half - 3);
        graphics.fill();
        graphics.lineWidth = 1.5;
        graphics.strokeColor = new Color(39, 31, 33, 220);
        graphics.circle(0, 0, half - 3);
        graphics.stroke();
        label.string = tier.label;
        label.color = new Color(255, 250, 232, 255);
        label.fontSize = UNIT_TYPE_BADGE_FONT_SIZE;
        label.lineHeight = UNIT_TYPE_BADGE_FONT_SIZE + 2;
        label.isBold = true;
        label.enableOutline = true;
        label.outlineColor = new Color(42, 31, 28, 255);
        label.outlineWidth = 2;
        label.enableShadow = true;
        label.shadowColor = new Color(10, 18, 26, 150);
        label.shadowOffset = new Vec2(1, -1);
        label.shadowBlur = 1;
    }

    private createGraphicsNode(name: string, width: number, height: number, x: number, y: number, parent: Node): Node {
        const node = new Node(name);
        node.setParent(parent);
        node.setPosition(new Vec3(x, y, 0));
        node.addComponent(UITransform).setContentSize(width, height);
        node.addComponent(Graphics);
        return node;
    }

    private configureSingleLineLabel(
        label: Label,
        color: Color,
        horizontalAlign: HorizontalTextAlignment = HorizontalTextAlignment.CENTER,
    ): void {
        label.color = color;
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = false;
        label.horizontalAlign = horizontalAlign;
        label.verticalAlign = VerticalTextAlignment.CENTER;
    }

    private resizeAndPositionLabel(
        label: Label,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        label.node.setPosition(x, y, 0);
        label.node.getComponent(UITransform)?.setContentSize(width, height);
    }

    private applyFormalUiFont(label: Label): void {
        if (this.formalUiFont) {
            label.font = this.formalUiFont;
            label.useSystemFont = false;
        }
    }

    private applyTargetTypography(
        label: Label,
        role: TargetTypographyRole,
        colorOverride?: Color,
    ): void {
        const style = TARGET_TYPOGRAPHY_STYLES[role];
        this.targetTypographyBindings.set(label, role);
        if (this.targetTypographyFont) {
            label.font = this.targetTypographyFont;
            label.useSystemFont = false;
        } else {
            this.applyFormalUiFont(label);
        }
        label.fontSize = style.fontSize;
        label.lineHeight = style.lineHeight;
        label.isBold = style.isBold;
        label.color = colorOverride ?? style.color;
        label.overflow = style.overflow;
        label.enableWrapText = style.enableWrapText;
        label.horizontalAlign = style.horizontalAlign;
        label.verticalAlign = style.verticalAlign;
        label.enableOutline = style.enableOutline ?? false;
        if (style.enableOutline) {
            label.outlineColor = style.outlineColor ?? Color.BLACK;
            label.outlineWidth = style.outlineWidth ?? 1;
        }
        label.enableShadow = style.enableShadow ?? false;
        if (style.enableShadow) {
            label.shadowColor = style.shadowColor ?? Color.BLACK;
            label.shadowOffset = style.shadowOffset ?? new Vec2(0, 0);
            label.shadowBlur = style.shadowBlur ?? 0;
        }
    }

    private createLabel(parent: Node, name: string, text: string, x: number, y: number, width: number, height: number, fontSize: number, color: Color): Label {
        const node = new Node(name);
        node.setParent(parent);
        node.setPosition(new Vec3(x, y, 0));
        node.addComponent(UITransform).setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
        label.color = color;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        this.applyFormalUiFont(label);
        return label;
    }

    private createTitleActionButton(
        parent: Node,
        name: string,
        text: string,
        y: number,
        width: number,
        height: number,
        fontSize: number,
        role: TitleActionButtonRole,
        onClick: () => void,
    ): TitleActionButtonView {
        const node = this.createGraphicsNode(name, width, height, 0, y, parent);
        const opacity = node.addComponent(UIOpacity);
        const iconNode = this.createGraphicsNode(
            'ActionIcon',
            46,
            46,
            -width / 2 + 43,
            0,
            node,
        );
        const label = this.createLabel(
            node,
            'Text',
            text,
            18,
            0,
            width - 104,
            height - 12,
            fontSize,
            new Color(78, 55, 31, 255),
        );
        this.configureSingleLineLabel(label, new Color(78, 55, 31, 255));
        const view: TitleActionButtonView = {
            node,
            graphics: node.getComponent(Graphics)!,
            label,
            width,
            height,
            role,
            opacity,
            iconNode,
            enabled: true,
            pressed: false,
            pressArmed: false,
            lastActivationTimeMs: 0,
        };
        this.drawTitleActionButton(view);
        this.drawTitleActionIcon(view);

        const releaseVisual = (): void => {
            view.pressed = false;
            this.drawTitleActionButton(view);
            Tween.stopAllByTarget(view.node);
            Tween.stopAllByTarget(view.opacity);
            tween(view.node)
                .to(START_BUTTON_RELEASE_SECONDS, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
                .start();
            tween(view.opacity)
                .to(START_BUTTON_RELEASE_SECONDS, { opacity: view.enabled ? 255 : 150 }, { easing: 'quadOut' })
                .start();
        };
        node.on(NodeEventType.TOUCH_START, () => {
            if (!view.enabled) return;
            view.pressArmed = true;
            view.pressed = true;
            Tween.stopAllByTarget(view.node);
            Tween.stopAllByTarget(view.opacity);
            view.node.setScale(0.97, 0.97, 1);
            view.opacity.opacity = 224;
            this.drawTitleActionButton(view);
        }, this);
        node.on(NodeEventType.TOUCH_END, () => {
            const shouldActivate = view.enabled && view.pressArmed;
            view.pressArmed = false;
            releaseVisual();
            if (!shouldActivate) return;
            const now = Date.now();
            if (now - view.lastActivationTimeMs < START_BUTTON_PRESS_DEBOUNCE_MS) return;
            view.lastActivationTimeMs = now;
            onClick();
            this.audioManager.playSfx('ui_click');
        }, this);
        node.on(NodeEventType.TOUCH_CANCEL, () => {
            view.pressArmed = false;
            releaseVisual();
        }, this);
        return view;
    }

    private setTitleActionButtonEnabled(view: TitleActionButtonView, enabled: boolean): void {
        view.enabled = enabled;
        view.pressed = false;
        view.pressArmed = false;
        Tween.stopAllByTarget(view.node);
        Tween.stopAllByTarget(view.opacity);
        view.node.setScale(1, 1, 1);
        view.opacity.opacity = enabled ? 255 : 150;
        this.drawTitleActionButton(view);
        this.drawTitleActionIcon(view);
    }

    private drawTitleActionButton(view: TitleActionButtonView): void {
        const { graphics, width, height, role } = view;
        graphics.clear();
        const radius = role === 'primary' ? 18 : 16;
        const disabled = !view.enabled;
        const pressed = view.pressed;
        const outer = disabled
            ? new Color(170, 163, 145, 255)
            : role === 'primary'
                ? new Color(255, 222, 127, 255)
                : new Color(238, 224, 184, 255);
        const base = disabled
            ? new Color(137, 145, 139, 255)
            : role === 'primary'
                ? pressed ? new Color(72, 160, 131, 255) : new Color(103, 205, 157, 255)
                : pressed ? new Color(67, 139, 80, 255) : new Color(103, 178, 105, 255);
        const top = disabled
            ? new Color(174, 181, 174, 145)
            : role === 'primary'
                ? new Color(202, 246, 195, pressed ? 105 : 180)
                : new Color(185, 226, 168, pressed ? 100 : 150);
        const bottom = disabled
            ? new Color(98, 104, 101, 120)
            : role === 'primary'
                ? new Color(48, 124, 98, pressed ? 150 : 112)
                : new Color(43, 110, 59, pressed ? 145 : 105);

        graphics.fillColor = new Color(30, 42, 30, pressed ? 52 : 92);
        graphics.roundRect(-width / 2 + 4, -height / 2 - 5, width - 8, height, radius);
        graphics.fill();
        graphics.fillColor = outer;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();
        graphics.fillColor = base;
        graphics.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, radius - 3);
        graphics.fill();
        graphics.fillColor = bottom;
        graphics.roundRect(-width / 2 + 7, -height / 2 + 6, width - 14, height * 0.42, radius - 5);
        graphics.fill();
        graphics.fillColor = top;
        graphics.roundRect(-width / 2 + 8, 1, width - 16, height * 0.36, radius - 6);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = disabled
            ? new Color(112, 108, 98, 210)
            : role === 'primary'
                ? new Color(190, 132, 38, 240)
                : new Color(153, 120, 65, 220);
        graphics.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, radius - 2);
        graphics.stroke();
        view.label.color = disabled
            ? new Color(91, 91, 85, 255) : new Color(78, 55, 31, 255);
    }

    private drawTitleActionIcon(view: TitleActionButtonView): void {
        const graphics = view.iconNode.getComponent(Graphics)!;
        graphics.clear();
        const disabled = !view.enabled;
        graphics.fillColor = disabled
            ? new Color(205, 201, 187, 190) : new Color(255, 242, 202, 230);
        graphics.circle(0, 0, 19);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = disabled
            ? new Color(105, 104, 99, 210) : new Color(126, 83, 35, 245);
        graphics.circle(0, 0, 19);
        graphics.stroke();
        graphics.lineWidth = 3;
        if (view.node.name === 'StartBattleButton') {
            graphics.moveTo(-7, -10);
            graphics.lineTo(-7, 11);
            graphics.stroke();
            graphics.fillColor = disabled
                ? new Color(132, 132, 126, 220) : new Color(238, 126, 75, 255);
            graphics.moveTo(-5, 10);
            graphics.lineTo(10, 6);
            graphics.lineTo(-5, 1);
            graphics.close();
            graphics.fill();
        } else {
            graphics.moveTo(-11, 9);
            graphics.lineTo(-4, 12);
            graphics.lineTo(4, 8);
            graphics.lineTo(11, 11);
            graphics.lineTo(11, -10);
            graphics.lineTo(4, -7);
            graphics.lineTo(-4, -11);
            graphics.lineTo(-11, -8);
            graphics.close();
            graphics.stroke();
            graphics.moveTo(-4, 12);
            graphics.lineTo(-4, -11);
            graphics.moveTo(4, 8);
            graphics.lineTo(4, -7);
            graphics.stroke();
        }
    }

    private createButton(parent: Node, name: string, text: string, x: number, y: number, width: number, height: number, fontSize: number, onClick: () => void): ButtonView {
        const node = this.createGraphicsNode(name, width, height, x, y, parent);
        const label = this.createLabel(node, 'Text', text, 0, 0, width - 10, height, fontSize, Color.WHITE);
        const button: ButtonView = {
            node,
            graphics: node.getComponent(Graphics)!,
            label,
            width,
            height,
        };
        this.drawButton(button, new Color(42, 121, 181, 255), new Color(179, 224, 255, 255));
        node.on(NodeEventType.TOUCH_END, () => {
            onClick();
            this.audioManager.playSfx('ui_click');
        }, this);
        return button;
    }

    private drawButton(button: ButtonView, fillColor: Color, borderColor: Color): void {
        const { graphics, width, height } = button;
        graphics.clear();
        graphics.fillColor = fillColor;
        graphics.roundRect(-width / 2, -height / 2, width, height, 12);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = borderColor;
        graphics.roundRect(-width / 2, -height / 2, width, height, 12);
        graphics.stroke();
    }
}
