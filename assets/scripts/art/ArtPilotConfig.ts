/**
 * Release art pipeline. The former art04 Pilot PNGs were archived in art07;
 * a failed bundle/key falls back directly to the lightweight Graphics renderer.
 */
export type ArtRenderMode = 'placeholder' | 'full';
const ART_MODE_CONFIG: { readonly mode: ArtRenderMode } = { mode: 'full' };
export const ART_RENDER_MODE: ArtRenderMode = ART_MODE_CONFIG.mode;
export const ART_PILOT_ENABLED = ART_RENDER_MODE === 'full';
export const ART_FULL_ENABLED = ART_RENDER_MODE === 'full';
export const ART_PILOT_LANE_INDEX = 0;
export const ART_PILOT_BATCH = 'v1.2.0-dev-mobilefix01';

export type BattlefieldVisualMode = 'legacy_v01' | 'topdown_v02' | 'plush_20x9_v01' | 'cartoon_20x9_v02';
/** Switch to legacy_v01 for an immediate, resource-safe visual rollback. */
export const BATTLEFIELD_VISUAL_MODE: BattlefieldVisualMode = 'cartoon_20x9_v02';

export type PilotUnitSpecies = 'sheep' | 'wolf';
export type UnitSpriteAnimationState = 'idle' | 'move' | 'attack' | 'hit' | 'death';
export type ArtResourceGroup =
    | 'title'
    | 'battle-core'
    | 'unit-small'
    | 'unit-medium'
    | 'unit-large'
    | 'unit-giant'
    | 'vfx-core'
    | 'tactics'
    | 'pause'
    | 'result';
export type ArtBundleName =
    | 'art_boot'
    | 'art_battlefield'
    | 'art_units'
    | 'art_ui'
    | 'art_vfx';

export enum ArtPilotResourceKey {
    BattleBackground = 'battle-background',
    BattleBackgroundTopdown = 'battle-background-topdown',
    BattleBackgroundPlush = 'battle-background-plush',
    BattleBackgroundCartoon = 'battle-background-cartoon',
    PlayerBase = 'player-base',
    AIBase = 'ai-base',
    RoadLane01 = 'road-lane-01',
    RoadLane02 = 'road-lane-02',
    RoadLane03 = 'road-lane-03',
    RoadLane04 = 'road-lane-04',
    PlayerSpawnGate = 'player-spawn-gate',
    AISpawnGate = 'ai-spawn-gate',
    SupplyPoint = 'supply-point',

    SheepSmall = 'sheep-small',
    SheepMedium = 'sheep-medium',
    SheepLarge = 'sheep-large',
    SheepGiant = 'sheep-giant',
    WolfSmall = 'wolf-small',
    WolfMedium = 'wolf-medium',
    WolfLarge = 'wolf-large',
    WolfGiant = 'wolf-giant',

    UnitCardSmall = 'unit-card-small',
    UnitCardMedium = 'unit-card-medium',
    UnitCardLarge = 'unit-card-large',
    UnitCardGiant = 'unit-card-giant',
    UnitCardShell = 'unit-card-shell',
    FriendlyHealthBar = 'friendly-health-bar',
    EnemyHealthBar = 'enemy-health-bar',
    HealthFillMask = 'health-fill-mask',
    TierBadgeSmall = 'tier-badge-small',
    TierBadgeMedium = 'tier-badge-medium',
    TierBadgeLarge = 'tier-badge-large',
    TierBadgeGiant = 'tier-badge-giant',
    UnitGroundShadow = 'unit-ground-shadow',
    PlayerBaseHealthFrame = 'player-base-health-frame',
    AIBaseHealthFrame = 'ai-base-health-frame',
    BaseHealthFillMask = 'base-health-fill-mask',
    PlayerEnergyFrame = 'player-energy-frame',
    AIEnergyFrame = 'ai-energy-frame',
    PlayerSupplyFrame = 'player-supply-frame',
    AISupplyFrame = 'ai-supply-frame',
    EnergyIcon = 'energy-icon',
    SupplyIcon = 'supply-icon',
    LevelBadge = 'level-badge',
    NoticeBanner = 'notice-banner',

    TacticCardShell = 'tactic-card-shell',
    TacticIconCellSprint = 'tactic-icon-cell-sprint',
    TacticIconCellHeal = 'tactic-icon-cell-heal',
    TacticIconCellShock = 'tactic-icon-cell-shock',
    TacticSkillSprint = 'tactic-skill-sprint',
    TacticSkillHeal = 'tactic-skill-heal',
    TacticSkillShock = 'tactic-skill-shock',
    TacticTextCellSprint = 'tactic-text-cell-sprint',
    TacticTextCellHeal = 'tactic-text-cell-heal',
    TacticTextCellShock = 'tactic-text-cell-shock',
    TacticDivider = 'tactic-divider',
    TacticInfoCellNeutral = 'tactic-info-cell-neutral',
    TacticInfoCellReady = 'tactic-info-cell-ready',
    TacticInfoCellInsufficient = 'tactic-info-cell-insufficient',
    TacticInfoCellCooldown = 'tactic-info-cell-cooldown',
    TacticStateCellAvailable = 'tactic-state-cell-available',
    TacticStateCellInsufficient = 'tactic-state-cell-insufficient',
    TacticStateCellUnavailable = 'tactic-state-cell-unavailable',
    TacticStateCellCooldown = 'tactic-state-cell-cooldown',
    TacticStateCellLocked = 'tactic-state-cell-locked',
    TacticStateCellUsed = 'tactic-state-cell-used',
    TacticStateReady = 'tactic-state-ready',
    TacticStateClock = 'tactic-state-clock',
    TacticStateLock = 'tactic-state-lock',
    TacticStateBlocked = 'tactic-state-blocked',
    TacticStateOnce = 'tactic-state-once',
    PauseButton = 'pause-button',
    PausePanel = 'pause-panel',
    ButtonPrimary = 'button-primary',
    ButtonSecondary = 'button-secondary',
    ButtonWarning = 'button-warning',
    ButtonClose = 'button-close',
    MusicIcon = 'music-icon',
    SfxIcon = 'sfx-icon',
    VolumeSliderTrack = 'volume-slider-track',
    VolumeSliderKnob = 'volume-slider-knob',
    BgmSelectorPanel = 'bgm-selector-panel',
    BgmPreviousButton = 'bgm-previous-button',
    BgmNextButton = 'bgm-next-button',
    LevelSelectOverlay = 'level-select-overlay',
    LevelSelectPanel = 'level-select-panel',
    LevelCardSelected = 'level-card-selected',
    LevelCardUnlocked = 'level-card-unlocked',
    LevelCardCompleted = 'level-card-completed',
    LevelCardLocked = 'level-card-locked',
    LevelNumberBadge = 'level-number-badge',
    LevelStateSelected = 'level-state-selected',
    LevelStateAvailable = 'level-state-available',
    LevelStateCompleted = 'level-state-completed',
    LevelStateLocked = 'level-state-locked',
    LevelProgressPanel = 'level-progress-panel',
    LevelBackButton = 'level-back-button',
    LevelDebugResetButton = 'level-debug-reset-button',

    SplashScreen = 'splash-screen',
    GameLogoWordmark = 'game-logo-wordmark',
    GameLogoEmblem = 'game-logo-emblem',
    LoadingBackground = 'loading-background',
    LoadingBarFrame = 'loading-bar-frame',
    LoadingMascot = 'loading-mascot',
    ResultPanel = 'result-panel',
    VictoryEmblem = 'victory-emblem',
    VictoryOverlay = 'victory-overlay',
    DefeatEmblem = 'defeat-emblem',
    DefeatOverlay = 'defeat-overlay',
    LevelTransitionBackground = 'level-transition-background',
    LevelTransitionBanner = 'level-transition-banner',
    LevelTransitionWipe = 'level-transition-wipe',

    MovementDust = 'movement-dust',
    SheepAttack = 'sheep-attack',
    WolfAttack = 'wolf-attack',
    HitImpact = 'hit-impact',
    UnitDisappear = 'unit-disappear',
    SheepDeploy = 'sheep-deploy',
    WolfDeploy = 'wolf-deploy',
    Breakthrough = 'breakthrough',
    BaseHit = 'base-hit',
    TacticSprint = 'tactic-sprint',
    TacticHeal = 'tactic-heal',
    TacticShock = 'tactic-shock',
}

export interface ArtPilotSheetConfig {
    readonly key: ArtPilotResourceKey;
    readonly bundleName: ArtBundleName;
    /** Relative to the custom Asset Bundle, without extension or the imported /texture suffix. */
    readonly resourcePath: string;
    readonly group: ArtResourceGroup;
    readonly width: number;
    readonly height: number;
    readonly columns: number;
    readonly rows: number;
    readonly cellWidth: number;
    readonly cellHeight: number;
    readonly frameCount: number;
}

interface ResourceDefinition {
    readonly key: ArtPilotResourceKey;
    readonly fullPath: string;
    readonly group: ArtResourceGroup;
    readonly width: number;
    readonly height: number;
    readonly columns?: number;
    readonly rows?: number;
    readonly frameCount?: number;
}

const define = (
    key: ArtPilotResourceKey,
    fullPath: string,
    group: ArtResourceGroup,
    width: number,
    height: number,
    columns = 1,
    rows = 1,
    frameCount = columns * rows,
): ResourceDefinition => ({ key, fullPath, group, width, height, columns, rows, frameCount });

const full = (relative: string): string => relative.replace(/(_v\d+)?$/, '_runtime_v01');

const bundleForPath = (path: string): ArtBundleName => {
    if (path.startsWith('branding/') || path.startsWith('ui/fonts/')) return 'art_boot';
    if (path.startsWith('backgrounds/') || path.startsWith('bases/') || path.startsWith('battlefield/')
        || path.startsWith('battlefield_ground_')) {
        return 'art_battlefield';
    }
    if (path.startsWith('characters/') || path.startsWith('ui/unit_cards/')
        || path.startsWith('ui/hud/unit_health/') || path.startsWith('ui/hud/tier_badges/')) {
        return 'art_units';
    }
    if (path.startsWith('vfx/')) return 'art_vfx';
    return 'art_ui';
};

const DEFINITIONS: readonly ResourceDefinition[] = [
    define(ArtPilotResourceKey.BattleBackground, full('backgrounds/battlefield/battle_background_v01'), 'battle-core', 1280, 720),
    define(ArtPilotResourceKey.BattleBackgroundTopdown, 'battlefield/backgrounds/battlefield_ground_topdown_runtime_v01', 'battle-core', 1280, 720),
    define(ArtPilotResourceKey.BattleBackgroundPlush, 'battlefield_ground_plush_20x9_runtime_v01', 'battle-core', 1680, 720),
    define(ArtPilotResourceKey.BattleBackgroundCartoon, 'battlefield_ground_cartoon_20x9_runtime_v02', 'battle-core', 1600, 720),
    define(ArtPilotResourceKey.PlayerBase, full('bases/player/player_base_v02'), 'battle-core', 1024, 384),
    define(ArtPilotResourceKey.AIBase, full('bases/ai/ai_base_v02'), 'battle-core', 1024, 384),
    define(ArtPilotResourceKey.RoadLane01, full('battlefield/roads/road_lane_01_v02'), 'battle-core', 360, 1030),
    define(ArtPilotResourceKey.RoadLane02, full('battlefield/roads/road_lane_02_v02'), 'battle-core', 360, 1030),
    define(ArtPilotResourceKey.RoadLane03, full('battlefield/roads/road_lane_03_v02'), 'battle-core', 360, 1030),
    define(ArtPilotResourceKey.RoadLane04, full('battlefield/roads/road_lane_04_v02'), 'battle-core', 360, 1030),
    define(ArtPilotResourceKey.PlayerSpawnGate, full('battlefield/spawn/player/player_spawn_gate_states_v01'), 'battle-core', 512, 128, 4, 1, 4),
    define(ArtPilotResourceKey.AISpawnGate, full('battlefield/spawn/ai/ai_spawn_gate_states_v01'), 'battle-core', 512, 128, 4, 1, 4),
    define(ArtPilotResourceKey.SupplyPoint, 'battlefield/supply_points/supply_point_states_runtime_v02', 'battle-core', 512, 128, 4, 1, 4),

    define(ArtPilotResourceKey.SheepSmall, full('characters/sheep/small/unit_sheep_small_sheet'), 'unit-small', 1024, 512, 8, 4, 23),
    define(ArtPilotResourceKey.WolfSmall, full('characters/wolf/small/unit_wolf_small_sheet'), 'unit-small', 1024, 512, 8, 4, 23),
    define(ArtPilotResourceKey.SheepMedium, full('characters/sheep/medium/unit_sheep_medium_sheet'), 'unit-medium', 1024, 512, 8, 4, 23),
    define(ArtPilotResourceKey.WolfMedium, full('characters/wolf/medium/unit_wolf_medium_sheet'), 'unit-medium', 1024, 512, 8, 4, 23),
    define(ArtPilotResourceKey.SheepLarge, full('characters/sheep/large/unit_sheep_large_sheet'), 'unit-large', 1280, 640, 8, 4, 23),
    define(ArtPilotResourceKey.WolfLarge, full('characters/wolf/large/unit_wolf_large_sheet'), 'unit-large', 1280, 640, 8, 4, 23),
    define(ArtPilotResourceKey.SheepGiant, full('characters/sheep/giant/unit_sheep_giant_sheet'), 'unit-giant', 1536, 768, 8, 4, 23),
    define(ArtPilotResourceKey.WolfGiant, full('characters/wolf/giant/unit_wolf_giant_sheet'), 'unit-giant', 1536, 768, 8, 4, 23),

    define(ArtPilotResourceKey.UnitCardSmall,
        full('ui/unit_cards/small/unit_card_small'), 'battle-core', 768, 461),
    define(ArtPilotResourceKey.UnitCardMedium,
        full('ui/unit_cards/medium/unit_card_medium'), 'battle-core', 768, 462),
    define(ArtPilotResourceKey.UnitCardLarge,
        full('ui/unit_cards/large/unit_card_large'), 'battle-core', 768, 462),
    define(ArtPilotResourceKey.UnitCardGiant,
        full('ui/unit_cards/giant/unit_card_giant'), 'battle-core', 768, 461),
    define(ArtPilotResourceKey.UnitCardShell,
        'ui/level_select/v06/level_progress_panel_runtime_v06', 'battle-core', 650, 46),
    define(ArtPilotResourceKey.FriendlyHealthBar, full('ui/hud/unit_health/friendly_unit_health_bar_v01'), 'battle-core', 256, 64),
    define(ArtPilotResourceKey.EnemyHealthBar, full('ui/hud/unit_health/enemy_unit_health_bar_v01'), 'battle-core', 256, 64),
    define(ArtPilotResourceKey.HealthFillMask, full('ui/hud/unit_health/unit_health_fill_mask_v01'), 'battle-core', 256, 64),
    define(ArtPilotResourceKey.TierBadgeSmall, full('ui/hud/tier_badges/tier_badge_small_v01'), 'battle-core', 128, 128),
    define(ArtPilotResourceKey.TierBadgeMedium, full('ui/hud/tier_badges/tier_badge_medium_v01'), 'battle-core', 128, 128),
    define(ArtPilotResourceKey.TierBadgeLarge, full('ui/hud/tier_badges/tier_badge_large_v01'), 'battle-core', 128, 128),
    define(ArtPilotResourceKey.TierBadgeGiant, full('ui/hud/tier_badges/tier_badge_giant_v01'), 'battle-core', 128, 128),
    define(ArtPilotResourceKey.UnitGroundShadow, 'characters/shared/unit_ground_shadow_runtime_v01', 'battle-core', 128, 64),
    define(ArtPilotResourceKey.PlayerBaseHealthFrame, full('ui/hud/base_health/player_base_health_frame_v01'), 'battle-core', 1024, 256),
    define(ArtPilotResourceKey.AIBaseHealthFrame, full('ui/hud/base_health/ai_base_health_frame_v01'), 'battle-core', 1024, 256),
    define(ArtPilotResourceKey.BaseHealthFillMask, full('ui/hud/base_health/base_health_fill_mask_v01'), 'battle-core', 1024, 256),
    define(ArtPilotResourceKey.PlayerEnergyFrame, full('ui/hud/resources/player_energy_frame_v01'), 'battle-core', 768, 192),
    define(ArtPilotResourceKey.AIEnergyFrame, full('ui/hud/resources/ai_energy_frame_v01'), 'battle-core', 768, 192),
    define(ArtPilotResourceKey.PlayerSupplyFrame, full('ui/hud/resources/player_supply_frame_v01'), 'battle-core', 512, 192),
    define(ArtPilotResourceKey.AISupplyFrame, full('ui/hud/resources/ai_supply_frame_v01'), 'battle-core', 512, 192),
    define(ArtPilotResourceKey.EnergyIcon, full('ui/hud/resources/icon_energy_v01'), 'battle-core', 128, 128),
    define(ArtPilotResourceKey.SupplyIcon, full('ui/hud/resources/icon_supply_v01'), 'battle-core', 128, 128),
    define(ArtPilotResourceKey.LevelBadge, full('ui/hud/level_badge/level_badge_v01'), 'battle-core', 384, 192),
    define(ArtPilotResourceKey.NoticeBanner, full('ui/hud/notices/notice_banner_v01'), 'battle-core', 768, 192),

    define(ArtPilotResourceKey.TacticCardShell,
        'ui/tactic_cards/v05/tactic_card_shell_runtime_v05', 'battle-core', 216, 124),
    define(ArtPilotResourceKey.TacticIconCellSprint,
        'ui/tactic_cards/v05/tactic_icon_cell_sprint_runtime_v05', 'battle-core', 68, 80),
    define(ArtPilotResourceKey.TacticIconCellHeal,
        'ui/tactic_cards/v05/tactic_icon_cell_heal_runtime_v05', 'battle-core', 68, 80),
    define(ArtPilotResourceKey.TacticIconCellShock,
        'ui/tactic_cards/v05/tactic_icon_cell_shock_runtime_v05', 'battle-core', 68, 80),
    define(ArtPilotResourceKey.TacticSkillSprint,
        'ui/tactic_cards/v05/tactic_skill_sprint_runtime_v05', 'battle-core', 54, 54),
    define(ArtPilotResourceKey.TacticSkillHeal,
        'ui/tactic_cards/v05/tactic_skill_heal_runtime_v05', 'battle-core', 54, 54),
    define(ArtPilotResourceKey.TacticSkillShock,
        'ui/tactic_cards/v05/tactic_skill_shock_runtime_v05', 'battle-core', 54, 54),
    define(ArtPilotResourceKey.TacticTextCellSprint,
        'ui/tactic_cards/v05/tactic_text_cell_sprint_runtime_v05', 'battle-core', 136, 80),
    define(ArtPilotResourceKey.TacticTextCellHeal,
        'ui/tactic_cards/v05/tactic_text_cell_heal_runtime_v05', 'battle-core', 136, 80),
    define(ArtPilotResourceKey.TacticTextCellShock,
        'ui/tactic_cards/v05/tactic_text_cell_shock_runtime_v05', 'battle-core', 136, 80),
    define(ArtPilotResourceKey.TacticDivider,
        'ui/tactic_cards/v05/tactic_divider_runtime_v05', 'battle-core', 208, 2),
    define(ArtPilotResourceKey.TacticInfoCellNeutral,
        'ui/tactic_cards/v05/tactic_info_cell_neutral_runtime_v05', 'battle-core', 60, 28),
    define(ArtPilotResourceKey.TacticInfoCellReady,
        'ui/tactic_cards/v05/tactic_info_cell_ready_runtime_v05', 'battle-core', 60, 28),
    define(ArtPilotResourceKey.TacticInfoCellInsufficient,
        'ui/tactic_cards/v05/tactic_info_cell_insufficient_runtime_v05', 'battle-core', 60, 28),
    define(ArtPilotResourceKey.TacticInfoCellCooldown,
        'ui/tactic_cards/v05/tactic_info_cell_cooldown_runtime_v05', 'battle-core', 60, 28),
    define(ArtPilotResourceKey.TacticStateCellAvailable,
        'ui/tactic_cards/v05/tactic_state_available_runtime_v05', 'battle-core', 84, 28),
    define(ArtPilotResourceKey.TacticStateCellInsufficient,
        'ui/tactic_cards/v05/tactic_state_insufficient_runtime_v05', 'battle-core', 84, 28),
    define(ArtPilotResourceKey.TacticStateCellUnavailable,
        'ui/tactic_cards/v05/tactic_state_unavailable_runtime_v05', 'battle-core', 84, 28),
    define(ArtPilotResourceKey.TacticStateCellCooldown,
        'ui/tactic_cards/v05/tactic_state_cooldown_runtime_v05', 'battle-core', 84, 28),
    define(ArtPilotResourceKey.TacticStateCellLocked,
        'ui/tactic_cards/v05/tactic_state_locked_runtime_v05', 'battle-core', 84, 28),
    define(ArtPilotResourceKey.TacticStateCellUsed,
        'ui/tactic_cards/v05/tactic_state_used_runtime_v05', 'battle-core', 84, 28),
    define(ArtPilotResourceKey.TacticStateReady,
        'ui/tactic_cards/status_icons/tactic_state_ready_runtime_v03', 'battle-core', 64, 64),
    define(ArtPilotResourceKey.TacticStateClock,
        'ui/tactic_cards/status_icons/tactic_state_clock_runtime_v03', 'battle-core', 64, 64),
    define(ArtPilotResourceKey.TacticStateLock,
        'ui/tactic_cards/status_icons/tactic_state_lock_runtime_v03', 'battle-core', 64, 64),
    define(ArtPilotResourceKey.TacticStateBlocked,
        'ui/tactic_cards/status_icons/tactic_state_blocked_runtime_v03', 'battle-core', 64, 64),
    define(ArtPilotResourceKey.TacticStateOnce,
        'ui/tactic_cards/status_icons/tactic_state_once_runtime_v03', 'battle-core', 64, 64),
    define(ArtPilotResourceKey.PauseButton, full('ui/common/pause/pause_button_v01'), 'battle-core', 128, 128),
    define(ArtPilotResourceKey.ButtonPrimary, full('ui/common/buttons/button_primary_v01'), 'battle-core', 384, 128),
    define(ArtPilotResourceKey.ButtonSecondary, full('ui/common/buttons/button_secondary_v01'), 'battle-core', 384, 128),
    define(ArtPilotResourceKey.ButtonWarning, full('ui/common/buttons/button_warning_v01'), 'battle-core', 384, 128),
    define(ArtPilotResourceKey.ButtonClose, full('ui/common/buttons/button_close_v01'), 'battle-core', 128, 128),
    define(ArtPilotResourceKey.PausePanel, full('ui/common/pause/pause_panel_v01'), 'pause', 768, 768),
    define(ArtPilotResourceKey.MusicIcon, full('ui/common/audio/music_icon_v01'), 'pause', 128, 128),
    define(ArtPilotResourceKey.SfxIcon, full('ui/common/audio/sfx_icon_v01'), 'pause', 128, 128),
    define(ArtPilotResourceKey.VolumeSliderTrack, full('ui/common/audio/volume_slider_track_v01'), 'pause', 512, 96),
    define(ArtPilotResourceKey.VolumeSliderKnob, full('ui/common/audio/volume_slider_knob_v01'), 'pause', 128, 128),
    define(ArtPilotResourceKey.BgmSelectorPanel, full('ui/common/audio/bgm_selector_panel_v01'), 'pause', 768, 240),
    define(ArtPilotResourceKey.BgmPreviousButton, full('ui/common/audio/bgm_previous_button_v01'), 'pause', 128, 128),
    define(ArtPilotResourceKey.BgmNextButton, full('ui/common/audio/bgm_next_button_v01'), 'pause', 128, 128),
    define(ArtPilotResourceKey.LevelSelectOverlay,
        'ui/level_select/v06/level_select_overlay_runtime_v06', 'title', 64, 64),
    define(ArtPilotResourceKey.LevelSelectPanel,
        'ui/level_select/v06/level_select_panel_runtime_v06', 'title', 780, 520),
    define(ArtPilotResourceKey.LevelCardSelected,
        'ui/level_select/v06/level_card_selected_runtime_v06', 'title', 650, 82),
    define(ArtPilotResourceKey.LevelCardUnlocked,
        'ui/level_select/v06/level_card_unlocked_runtime_v06', 'title', 650, 82),
    define(ArtPilotResourceKey.LevelCardCompleted,
        'ui/level_select/v06/level_card_completed_runtime_v06', 'title', 650, 82),
    define(ArtPilotResourceKey.LevelCardLocked,
        'ui/level_select/v06/level_card_locked_runtime_v06', 'title', 650, 82),
    define(ArtPilotResourceKey.LevelNumberBadge,
        'ui/level_select/v06/level_number_badge_runtime_v06', 'title', 66, 60),
    define(ArtPilotResourceKey.LevelStateSelected,
        'ui/level_select/v06/level_state_selected_runtime_v06', 'title', 28, 28),
    define(ArtPilotResourceKey.LevelStateAvailable,
        'ui/level_select/v06/level_state_available_runtime_v06', 'title', 28, 28),
    define(ArtPilotResourceKey.LevelStateCompleted,
        'ui/level_select/v06/level_state_completed_runtime_v06', 'title', 28, 28),
    define(ArtPilotResourceKey.LevelStateLocked,
        'ui/level_select/v06/level_state_locked_runtime_v06', 'title', 28, 28),
    define(ArtPilotResourceKey.LevelProgressPanel,
        'ui/level_select/v06/level_progress_panel_runtime_v06', 'title', 650, 46),
    define(ArtPilotResourceKey.LevelBackButton,
        'ui/level_select/v06/level_back_button_runtime_v06', 'title', 238, 48),
    define(ArtPilotResourceKey.LevelDebugResetButton,
        'ui/level_select/v06/level_debug_reset_button_runtime_v06', 'title', 210, 42),

    define(ArtPilotResourceKey.SplashScreen, full('branding/splash/splash_screen_v01'), 'title', 1280, 720),
    define(ArtPilotResourceKey.GameLogoWordmark, full('branding/logo/game_logo_wordmark_v01'), 'title', 660, 330),
    define(ArtPilotResourceKey.GameLogoEmblem, full('branding/logo/game_logo_emblem_v01'), 'title', 192, 192),
    define(ArtPilotResourceKey.ResultPanel, full('ui/modals/result_panel_v01'), 'result', 960, 720),
    define(ArtPilotResourceKey.VictoryEmblem, full('vfx/results/victory/victory_emblem_v02'), 'result', 256, 256),
    define(ArtPilotResourceKey.VictoryOverlay, full('vfx/results/victory/victory_overlay_v01'), 'result', 1280, 720),
    define(ArtPilotResourceKey.DefeatEmblem, full('vfx/results/defeat/defeat_emblem_v02'), 'result', 256, 256),
    define(ArtPilotResourceKey.DefeatOverlay, full('vfx/results/defeat/defeat_overlay_v01'), 'result', 1280, 720),
    define(ArtPilotResourceKey.LevelTransitionBackground, full('vfx/results/level_transition/level_transition_background_v01'), 'result', 1280, 720),
    define(ArtPilotResourceKey.LevelTransitionBanner, full('vfx/results/level_transition/level_transition_banner_v01'), 'result', 768, 288),
    define(ArtPilotResourceKey.LevelTransitionWipe, full('vfx/results/level_transition/level_transition_wipe_sheet_v01'), 'result', 1024, 512, 4, 2, 8),

    define(ArtPilotResourceKey.MovementDust, full('vfx/movement/movement_dust_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.SheepAttack, full('vfx/combat/sheep_attack/sheep_attack_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.WolfAttack, full('vfx/combat/wolf_attack/wolf_attack_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.HitImpact, full('vfx/combat/hit/hit_impact_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.UnitDisappear, full('vfx/combat/death/unit_disappear_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.SheepDeploy, full('vfx/deploy/sheep/sheep_deploy_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.WolfDeploy, full('vfx/deploy/wolf/wolf_deploy_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.Breakthrough, full('vfx/breakthrough/breakthrough_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.BaseHit, full('vfx/breakthrough/base_hit_fx_sheet_v02'), 'vfx-core', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.TacticSprint, full('vfx/tactics/sprint/tactic_sprint_fx_sheet_v02'), 'tactics', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.TacticHeal, full('vfx/tactics/heal/tactic_heal_fx_sheet_v02'), 'tactics', 512, 256, 4, 2, 8),
    define(ArtPilotResourceKey.TacticShock, full('vfx/tactics/shock/tactic_shock_fx_sheet_v02'), 'tactics', 512, 256, 4, 2, 8),
];

const toConfig = (definition: ResourceDefinition): ArtPilotSheetConfig | undefined => {
    const resourcePath = definition.fullPath;
    const columns = definition.columns ?? 1;
    const rows = definition.rows ?? 1;
    return {
        key: definition.key,
        bundleName: bundleForPath(resourcePath),
        resourcePath,
        group: definition.group,
        width: definition.width,
        height: definition.height,
        columns,
        rows,
        cellWidth: definition.width / columns,
        cellHeight: definition.height / rows,
        frameCount: definition.frameCount ?? columns * rows,
    };
};

export const ART_PILOT_RESOURCES: readonly ArtPilotSheetConfig[] = ART_RENDER_MODE === 'placeholder'
    ? [] : DEFINITIONS.map(toConfig).filter((value): value is ArtPilotSheetConfig => value !== undefined);

export const ART_RESOURCE_CONFIG_BY_KEY = new Map(
    ART_PILOT_RESOURCES.map((config) => [config.key, config] as const),
);

export const UNIT_ANIMATION_RANGES: Readonly<Record<UnitSpriteAnimationState, {
    readonly start: number;
    readonly count: number;
    readonly fps: number;
    readonly loop: boolean;
}>> = {
    idle: { start: 0, count: 4, fps: 5, loop: true },
    move: { start: 4, count: 6, fps: 8, loop: true },
    attack: { start: 10, count: 5, fps: 12, loop: false },
    hit: { start: 15, count: 2, fps: 10, loop: false },
    death: { start: 17, count: 6, fps: 10, loop: false },
};

export const FULL_UNIT_SPRITE_SIZE = {
    small: { sheep: 78, wolf: 68 },
    medium: { sheep: 92, wolf: 82 },
    large: { sheep: 106, wolf: 96 },
    giant: { sheep: 120, wolf: 110 },
} as const;
export const PILOT_UNIT_SPRITE_SIZE = 80;
export const PILOT_UNIT_DEATH_VISUAL_SECONDS = UNIT_ANIMATION_RANGES.death.count / UNIT_ANIMATION_RANGES.death.fps;
export const PILOT_VFX_MAX_ACTIVE = 28;
export const PILOT_VFX_POOL_LIMIT = 36;
export const PILOT_MOVE_DUST_INTERVAL = 0.34;
