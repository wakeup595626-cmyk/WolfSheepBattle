import {
    _decorator,
    BlockInputEvents,
    Canvas,
    Color,
    Component,
    Graphics,
    HorizontalTextAlignment,
    Label,
    Node,
    NodeEventType,
    ResolutionPolicy,
    UIOpacity,
    UITransform,
    Vec3,
    VerticalTextAlignment,
    view,
    tween,
    Tween,
    sys,
} from 'cc';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
const GAME_VERSION = 'v1.1.3';
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
const AI_HUD_Y = 308;
const PLAYER_HUD_Y = -284;
const BASE_BAR_HEIGHT = 48;
const HUD_BASE_BAR_WIDTH = 400;
const PLAYER_RESOURCE_BADGE_WIDTH = 170;
const PLAYER_RESOURCE_BADGE_HEIGHT = 44;
const ENERGY_BAR_WIDTH = 300;
const ENERGY_BAR_HEIGHT = 44;
const ENERGY_BAR_ICON_BOX_WIDTH = 30;
const ENERGY_BAR_FILL_LEFT = -ENERGY_BAR_WIDTH / 2 + 42;
const ENERGY_BAR_FILL_WIDTH = ENERGY_BAR_WIDTH - 50;
const ENERGY_BAR_FILL_HEIGHT = 24;
const HUD_RESOURCE_GAP = 14;
const AI_HUD_CENTER_X = BATTLEFIELD_CENTER_X - 60;
const PLAYER_HUD_SUPPLY_X = BATTLEFIELD_CENTER_X - HUD_BASE_BAR_WIDTH / 2 - HUD_RESOURCE_GAP - PLAYER_RESOURCE_BADGE_WIDTH / 2;
const PLAYER_HUD_ENERGY_X = BATTLEFIELD_CENTER_X + HUD_BASE_BAR_WIDTH / 2 + HUD_RESOURCE_GAP + ENERGY_BAR_WIDTH / 2;
const AI_HUD_SUPPLY_X = AI_HUD_CENTER_X - HUD_BASE_BAR_WIDTH / 2 - HUD_RESOURCE_GAP - PLAYER_RESOURCE_BADGE_WIDTH / 2;
const AI_HUD_ENERGY_X = AI_HUD_CENTER_X + HUD_BASE_BAR_WIDTH / 2 + HUD_RESOURCE_GAP + ENERGY_BAR_WIDTH / 2;
const FUNCTION_SIDEBAR_X = 530;
const FUNCTION_SIDEBAR_WIDTH = 200;
const FUNCTION_HEADER_HEIGHT = 34;
const PAUSE_BUTTON_Y = 338;
const TACTIC_HEADER_Y = 232;
const TACTIC_CARD_HEIGHT = 86;
const TACTIC_CARD_GAP = 18;
const TACTIC_FIRST_CARD_Y = TACTIC_HEADER_Y - FUNCTION_HEADER_HEIGHT / 2 - 13 - TACTIC_CARD_HEIGHT / 2;
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
// Root positions stay inside these bounds. The margin also reserves room for
// the health bar and keeps units away from the surrounding HUD/base visuals.
const UNIT_ROAD_SAFETY_MARGIN = 22;
const QUEUE_FULL_MARKER_SECONDS = 0.55;
const SPAWN_BUTTON_WIDTH = LANE_WIDTH - 16;
const SPAWN_BUTTON_HEIGHT = 52;
const SPAWN_BUTTON_Y = -216;
// Development-only lane diagnostics. Keep this false for normal Creator and
// WeChat builds: warnings are emitted only when an invariant is actually broken.
const DEBUG_LANE_ASSERT = false;
const SUPPLY_CAPTURE_RADIUS = 62;
const SUPPLY_CAPTURE_SECONDS = 1.7;
const SUPPLY_VALUE_PER_POINT_PER_SECOND = 2;
const SUPPLY_MAX = 5;
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
const UNIT_HIT_FLASH_DURATION = 0.12;
const UNIT_IMPACT_DURATION = 0.14;
const UNIT_DEATH_DURATION = 0.28;
const UNIT_HEALTH_DAMAGE_DISPLAY_SECONDS = 0.15;
const UNIT_HEALTH_HEAL_DISPLAY_SECONDS = 0.2;
const UNIT_HEALTH_DEATH_DISPLAY_SECONDS = 0.08;
const BASE_HIT_FLASH_DURATION = 0.32;
const HUD_DYNAMIC_REFRESH_INTERVAL = 0.25;
const TACTIC_NOTICE_FADE_IN_SECONDS = 0.12;
const TACTIC_NOTICE_HOLD_SECONDS = 0.7;
const TACTIC_NOTICE_FADE_OUT_SECONDS = 0.22;
const LEVEL_PROGRESS_STORAGE_KEY = 'wolf-sheep-battle.v1.highest-unlocked-level';

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

interface BattleUnit {
    readonly id: number;
    readonly queueOrder: number;
    readonly team: Team;
    readonly lane: number;
    readonly definition: UnitDefinition;
    readonly node: Node;
    readonly visualNode: Node;
    readonly visualGraphics: Graphics;
    readonly hitFlashNode: Node;
    readonly hitFlashOpacity: UIOpacity;
    readonly healthNode: Node;
    readonly healthGraphics: Graphics;
    readonly healthFillNode: Node;
    readonly healthFillGraphics: Graphics;
    readonly opacity: UIOpacity;
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
}

interface RoadBounds {
    readonly minY: number;
    readonly maxY: number;
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

interface ButtonView {
    readonly node: Node;
    readonly graphics: Graphics;
    readonly label: Label;
    readonly width: number;
    readonly height: number;
}

interface EnergyBarView {
    readonly node: Node;
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
    fullRemaining: number;
    visualState: SpawnMarkerState;
    lastQueueText: string;
}

type SpawnMarkerState = 'ready' | 'energy' | 'full' | 'paused';
type TacticIcon = 'sprint' | 'heal' | 'shock';

interface TacticCardView {
    readonly node: Node;
    readonly graphics: Graphics;
    readonly iconGraphics: Graphics;
    readonly iconOpacity: UIOpacity;
    readonly titleLabel: Label;
    readonly statusLabel: Label;
    readonly pressOverlay: Node;
    readonly width: number;
    readonly height: number;
    enabled: boolean;
}

interface SupplyPoint {
    readonly lane: number;
    readonly node: Node;
    readonly graphics: Graphics;
    readonly label: Label;
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
}

interface LevelConfig {
    readonly id: number;
    readonly title: string;
    readonly description: string;
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
}

const LEVEL_CONFIGS: readonly LevelConfig[] = [
    {
        id: 1,
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
    },
    {
        id: 2,
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
    },
    {
        id: 3,
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
    private readonly units: BattleUnit[] = [];
    private readonly dyingUnits: BattleUnit[] = [];
    private readonly typeButtons = new Map<SheepType, ButtonView>();
    private readonly supplyPoints: SupplyPoint[] = [];
    private readonly feedbackEffects: FeedbackEffect[] = [];
    private readonly laneSpawnMarkers: LaneSpawnMarkerView[] = [];
    private readonly laneDebugSignatures = new Set<string>();
    private readonly pendingLaneShifts = new Map<string, number>();

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
    private selectedSheepType = SheepType.Small;
    private nextUnitId = 1;
    private playerSpawnCooldown = 0;
    private aiDecisionCooldown = AI_INITIAL_DECISION_DELAY;
    private hudRefreshCooldown = 0;
    private statusToastRemaining = 0;
    private lastBaseHudState = '';
    private lastUnitButtonState = '';
    private lastTacticHudState = '';
    private isStarted = false;
    private tutorialCompleted = false;
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
    private playerBaseFlashRemaining = 0;
    private aiBaseFlashRemaining = 0;
    private statusMessage = '选择兵种后，点击一条通道出兵。';

    private gameLayer!: Node;
    private battleLayer!: Node;
    private hudLayer!: Node;
    private modalLayer!: Node;
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
    private aiTacticLabel!: Label;
    private statusLabel!: Label;
    private statusToast!: Node;
    private tacticNotice!: Node;
    private tacticNoticeLabel!: Label;
    private tacticNoticeOpacity!: UIOpacity;
    private resultPanel!: Node;
    private startPanel!: Node;
    private levelSelectPanel!: Node;
    private tutorialPanel!: Node;
    private pausePanel!: Node;
    private helpPanel!: Node;
    private playerSprintCard!: TacticCardView;
    private playerHealCard!: TacticCardView;
    private playerShockCard!: TacticCardView;
    private pauseButton!: ButtonView;
    private startSelectedLevelLabel!: Label;
    private levelSelectHintLabel!: Label;
    private readonly levelButtons = new Map<number, ButtonView>();

    onLoad(): void {
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.SHOW_ALL);

        if (!this.node.getComponent(Canvas)) {
            console.error('[WolfSheepBattle] GameController 必须挂在 Canvas 节点上。');
            return;
        }

        const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.loadLevelProgress();
        this.buildGame();
    }

    update(deltaTime: number): void {
        if (!this.isStarted || this.isFinished || this.isPaused) {
            return;
        }

        this.playerSpawnCooldown = Math.max(0, this.playerSpawnCooldown - deltaTime);
        this.statusToastRemaining = Math.max(0, this.statusToastRemaining - deltaTime);
        if (this.statusToastRemaining <= 0 && this.statusToast?.active) {
            this.statusToast.active = false;
        }
        this.aiDecisionCooldown -= deltaTime;
        this.playerSprintRemaining = Math.max(0, this.playerSprintRemaining - deltaTime);
        this.aiSprintRemaining = Math.max(0, this.aiSprintRemaining - deltaTime);
        this.playerSprintCooldown = Math.max(0, this.playerSprintCooldown - deltaTime);
        this.aiSprintCooldown = Math.max(0, this.aiSprintCooldown - deltaTime);
        this.playerHealCooldown = Math.max(0, this.playerHealCooldown - deltaTime);
        this.aiHealCooldown = Math.max(0, this.aiHealCooldown - deltaTime);
        this.playerEnergy = Math.min(ENERGY_MAX, this.playerEnergy + ENERGY_RECOVERY_PER_SECOND * deltaTime);
        this.aiEnergy = Math.min(ENERGY_MAX, this.aiEnergy + ENERGY_RECOVERY_PER_SECOND * deltaTime);

        if (this.aiDecisionCooldown <= 0) {
            this.aiDecisionCooldown += this.trySpawnAIUnit();
        }

        this.updateEnergyBars(deltaTime);
        this.updateUnits(deltaTime);
        this.updateLaneSpawnMarkers(deltaTime);
        this.updateUnitVisuals(deltaTime);
        this.updateBaseHitFeedback(deltaTime);
        this.updateSupplyPoints(deltaTime);
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
        this.gameLayer = new Node('GameLayer');
        this.gameLayer.setParent(this.node);
        this.gameLayer.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.battleLayer = this.createUiLayer('BattleLayer');
        this.hudLayer = this.createUiLayer('HudLayer');
        this.modalLayer = this.createUiLayer('ModalLayer');

        this.drawBoard();
        this.createLaneNumberBadges();
        this.createBaseBars();
        this.createSupplyPoints();
        this.createHud();
        this.createLaneSpawnZones();
        this.createUnitTypeButtons();
        this.createTacticButtons();
        this.createResultPanel();
        this.createStartPanel();
        this.createLevelSelectPanel();
        this.createTutorialPanel();
        this.createPauseControls();
        this.refreshStartPanel();
        this.refreshLevelSelectPanel();
        this.refreshHud(this.statusMessage);
    }

    private createUiLayer(name: string): Node {
        const layer = new Node(name);
        layer.setParent(this.gameLayer);
        layer.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        return layer;
    }

    private drawBoard(): void {
        const board = this.createGraphicsNode('Board', DESIGN_WIDTH, DESIGN_HEIGHT, 0, 0, this.battleLayer);
        const graphics = board.getComponent(Graphics)!;

        graphics.fillColor = new Color(24, 32, 48, 255);
        graphics.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
        graphics.fill();

        graphics.fillColor = new Color(38, 51, 70, 255);
        graphics.roundRect(-630, -250, 1260, 520, 28);
        graphics.fill();

        graphics.lineWidth = 4;
        graphics.strokeColor = new Color(105, 126, 150, 255);
        for (const laneX of LANE_X) {
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

    }

    private createLaneNumberBadges(): void {
        const numberY = LANE_TOP_Y - 24;
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.createLabel(
                this.battleLayer,
                `LaneNumber${lane + 1}`,
                `${lane + 1}`,
                LANE_X[lane],
                numberY,
                36,
                30,
                22,
                new Color(175, 194, 216, 110),
            );
        }
    }

    private createBaseBars(): void {
        const aiBaseNode = this.createGraphicsNode('AIBaseBar', HUD_BASE_BAR_WIDTH, BASE_BAR_HEIGHT, AI_HUD_CENTER_X, AI_HUD_Y, this.hudLayer);
        const playerBaseNode = this.createGraphicsNode('PlayerBaseBar', HUD_BASE_BAR_WIDTH, BASE_BAR_HEIGHT, BATTLEFIELD_CENTER_X, PLAYER_HUD_Y, this.hudLayer);
        this.aiBaseGraphics = aiBaseNode.getComponent(Graphics)!;
        this.playerBaseGraphics = playerBaseNode.getComponent(Graphics)!;
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
        const effect = this.createGraphicsNode('BattleFeedback', width, 42, x, y, this.battleLayer);
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
        for (const effect of [...this.feedbackEffects]) {
            if (!effect.node.isValid) {
                this.removeFeedbackEffect(effect);
                continue;
            }
            effect.elapsed += deltaTime;
            const progress = Math.min(1, effect.elapsed / effect.duration);
            effect.node.setPosition(effect.startX, effect.startY + effect.yOffset * progress);
            effect.node.setScale(1 - progress * 0.08, 1 - progress * 0.08, 1);
            effect.opacity.opacity = Math.round(255 * (1 - progress));
            if (progress >= 1) {
                this.removeFeedbackEffect(effect);
            }
        }
    }

    private removeFeedbackEffect(effect: FeedbackEffect): void {
        const index = this.feedbackEffects.indexOf(effect);
        if (index >= 0) {
            this.feedbackEffects.splice(index, 1);
        }
        if (effect.node.isValid) {
            effect.node.destroy();
        }
    }

    private clearFeedbackEffects(): void {
        for (const effect of [...this.feedbackEffects]) {
            this.removeFeedbackEffect(effect);
        }
    }

    private createSupplyPoints(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const node = this.createGraphicsNode(`SupplyPoint${lane}`, 76, 74, LANE_X[lane], 0, this.battleLayer);
            const label = this.createLabel(node, 'Label', '', 4, -8, 66, 22, 10, Color.WHITE);
            const point: SupplyPoint = {
                lane,
                node,
                graphics: node.getComponent(Graphics)!,
                label,
                owner: null,
                capturingTeam: null,
                captureTime: 0,
            };
            this.supplyPoints.push(point);
            this.drawSupplyPoint(point);
        }
    }

    private drawSupplyPoint(point: SupplyPoint): void {
        const graphics = point.graphics;
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

        const ownerText = point.owner === Team.Player ? '羊群控制' : point.owner === Team.AI ? '狼群控制' : '中立';
        const captureText = point.capturingTeam === null ? ownerText : `夺取 ${Math.ceil(point.captureTime / SUPPLY_CAPTURE_SECONDS * 100)}%`;
        point.label.string = `补给点\n${captureText}`;
        const compactOwnerText = point.owner === Team.Player ? '\u7F8A' : point.owner === Team.AI ? '\u72FC' : '\u4E2D';
        point.label.string = point.capturingTeam === null
            ? compactOwnerText : `\u593A\u53D6 ${Math.ceil(point.captureTime / SUPPLY_CAPTURE_SECONDS * 100)}%`;
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

    private countUnitsInSupplyRange(lane: number, team: Team): number {
        return this.units.filter((unit) => unit.team === team && unit.lane === lane
            && unit.health > 0 && unit.node.isValid && Math.abs(unit.node.position.y) <= SUPPLY_CAPTURE_RADIUS).length;
    }

    private getSupplyIncome(team: Team): number {
        const controlledCount = this.supplyPoints.filter((point) => point.owner === team).length;
        return controlledCount * SUPPLY_VALUE_PER_POINT_PER_SECOND;
    }

    private createHud(): void {
        this.aiBaseShadowLabel = this.createLabel(this.hudLayer, 'AIBaseHealthShadow', '', AI_HUD_CENTER_X + 2, AI_HUD_Y, 400, 34, 23, new Color(3, 9, 17, 255));
        this.aiBaseLabel = this.createLabel(this.hudLayer, 'AIBaseHealth', '', AI_HUD_CENTER_X, AI_HUD_Y + 2, 400, 34, 23, Color.WHITE);
        const aiSupplyBadge = this.createResourceBadge('AISupplyBadge', AI_HUD_SUPPLY_X, AI_HUD_Y,
            new Color(47, 34, 40, 255), new Color(178, 108, 116, 255));
        this.aiSupplyLabel = this.createLabel(aiSupplyBadge, 'Text', '', 0, 0, PLAYER_RESOURCE_BADGE_WIDTH - 8, 40, 16, new Color(215, 255, 236, 255));
        this.aiEnergyBar = this.createEnergyBar('AIEnergyBar', AI_HUD_ENERGY_X, AI_HUD_Y,
            new Color(238, 137, 76, 255), new Color(211, 113, 94, 255), new Color(255, 202, 133, 255), '\u26A1 AI \u80FD\u91CF');
        this.aiEnergyLabel = this.aiEnergyBar.label;
        this.aiTacticLabel = this.createLabel(this.hudLayer, 'AITactic', '', 0, 0, 1, 1, 1, Color.WHITE);
        this.aiTacticLabel.node.active = false;

        this.playerBaseShadowLabel = this.createLabel(this.hudLayer, 'PlayerBaseHealthShadow', '', BATTLEFIELD_CENTER_X + 2, PLAYER_HUD_Y - 1, 400, 34, 23, new Color(3, 9, 17, 255));
        this.playerBaseLabel = this.createLabel(this.hudLayer, 'PlayerBaseHealth', '', BATTLEFIELD_CENTER_X, PLAYER_HUD_Y + 1, 400, 34, 23, Color.WHITE);
        this.playerSupplyBadge = this.createResourceBadge('PlayerSupplyBadge', PLAYER_HUD_SUPPLY_X, PLAYER_HUD_Y,
            new Color(10, 43, 46, 255), new Color(164, 244, 220, 255));
        this.playerSupplyLabel = this.createLabel(this.playerSupplyBadge, 'Text', '', 0, 0, PLAYER_RESOURCE_BADGE_WIDTH - 8, 40, 16, new Color(230, 255, 242, 255));
        this.playerEnergyBar = this.createEnergyBar('PlayerEnergyBar', PLAYER_HUD_ENERGY_X, PLAYER_HUD_Y,
            new Color(48, 195, 255, 255), new Color(137, 220, 255, 255), new Color(255, 216, 90, 255), '\u26A1 \u80FD\u91CF');
        this.playerEnergyLabel = this.playerEnergyBar.label;
        this.snapEnergyBarsToCurrentValues();

        this.statusToast = this.createGraphicsNode('StatusToast', 440, 32, 0, 226, this.hudLayer);
        const toastGraphics = this.statusToast.getComponent(Graphics)!;
        toastGraphics.fillColor = new Color(10, 18, 29, 220);
        toastGraphics.roundRect(-220, -16, 440, 32, 14);
        toastGraphics.fill();
        toastGraphics.lineWidth = 2;
        toastGraphics.strokeColor = new Color(188, 220, 242, 190);
        toastGraphics.roundRect(-220, -16, 440, 32, 14);
        toastGraphics.stroke();
        this.statusLabel = this.createLabel(this.statusToast, 'Text', '', 0, 0, 420, 30, 14, new Color(232, 237, 244, 255));
        this.statusToast.active = false;
        this.createTacticNotice();
    }

    private createTacticNotice(): void {
        this.tacticNotice = this.createGraphicsNode('TacticNotice', 300, 42, 0, 150, this.hudLayer);
        const graphics = this.tacticNotice.getComponent(Graphics)!;
        graphics.fillColor = new Color(8, 16, 27, 236);
        graphics.roundRect(-150, -21, 300, 42, 14);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(210, 235, 250, 255);
        graphics.roundRect(-150, -21, 300, 42, 14);
        graphics.stroke();
        this.tacticNoticeLabel = this.createLabel(this.tacticNotice, 'Text', '', 0, 0, 280, 38, 19, Color.WHITE);
        this.tacticNoticeOpacity = this.tacticNotice.addComponent(UIOpacity);
        this.tacticNotice.active = false;
    }

    private showTacticNotice(team: Team, tacticName: string): void {
        if (!this.tacticNotice || !this.tacticNoticeLabel || !this.tacticNoticeOpacity) {
            return;
        }
        Tween.stopAllByTarget(this.tacticNotice);
        Tween.stopAllByTarget(this.tacticNoticeOpacity);
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
        graphics.fillColor = new Color(4, 12, 21, 255);
        graphics.roundRect(ENERGY_BAR_FILL_LEFT, -ENERGY_BAR_FILL_HEIGHT / 2, ENERGY_BAR_FILL_WIDTH, ENERGY_BAR_FILL_HEIGHT, 9);
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

        const fillNode = new Node('Fill');
        fillNode.setParent(bar);
        const fillTransform = fillNode.addComponent(UITransform);
        fillTransform.setContentSize(ENERGY_BAR_FILL_WIDTH, ENERGY_BAR_FILL_HEIGHT);
        fillTransform.setAnchorPoint(0, 0.5);
        fillNode.setPosition(ENERGY_BAR_FILL_LEFT, 0, 0);
        const fillGraphics = fillNode.addComponent(Graphics);
        fillGraphics.fillColor = fillColor;
        fillGraphics.roundRect(0, -ENERGY_BAR_FILL_HEIGHT / 2, ENERGY_BAR_FILL_WIDTH, ENERGY_BAR_FILL_HEIGHT, 9);
        fillGraphics.fill();
        fillNode.setScale(0, 1, 1);

        const shadowLabel = this.createLabel(bar, 'TextShadow', `${labelPrefix} 0 / ${ENERGY_MAX}`, 19, -2,
            ENERGY_BAR_FILL_WIDTH - 2, ENERGY_BAR_HEIGHT - 4, 17, new Color(7, 12, 20, 255));
        const label = this.createLabel(bar, 'Text', `${labelPrefix} 0 / ${ENERGY_MAX}`, 17, 0,
            ENERGY_BAR_FILL_WIDTH - 2, ENERGY_BAR_HEIGHT - 4, 17, labelColor);
        return {
            node: bar,
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
    }

    private createLaneButtons(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.createButton(this.hudLayer, `SpawnButton${lane}`, `第 ${lane + 1} 线\n出兵`, LANE_X[lane], -178, 120, 44, 15, () => {
                this.trySpawnPlayerUnit(lane);
            });
        }
    }

    private createLaneSpawnZones(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const marker = this.createGraphicsNode(
                `SpawnMarker${lane}`,
                SPAWN_BUTTON_WIDTH,
                SPAWN_BUTTON_HEIGHT,
                LANE_X[lane],
                SPAWN_BUTTON_Y,
                this.hudLayer,
            );
            marker.on(NodeEventType.TOUCH_END, () => this.trySpawnPlayerUnit(lane), this);
            const markerView: LaneSpawnMarkerView = {
                node: marker,
                graphics: marker.getComponent(Graphics)!,
                label: this.createLabel(marker, 'QueueState', '', SPAWN_BUTTON_WIDTH / 2 - 28, 5, 40, 24, 14, Color.WHITE),
                queueLabel: this.createLabel(marker, 'QueueCount', '', 0, -18, SPAWN_BUTTON_WIDTH - 12, 16, 11, new Color(255, 231, 157, 255)),
                fullRemaining: 0,
                visualState: 'paused',
                lastQueueText: '',
            };
            this.laneSpawnMarkers.push(markerView);
            this.drawLaneSpawnMarker(markerView, 'paused');
        }
    }

    private drawLaneSpawnMarker(marker: LaneSpawnMarkerView, state: SpawnMarkerState): void {
        const graphics = marker.graphics;
        const isReady = state === 'ready';
        const fillColor = isReady ? new Color(35, 137, 211, 245)
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
    }

    private showLaneQueueFull(lane: number): void {
        const marker = this.laneSpawnMarkers[lane];
        if (!marker) {
            return;
        }
        marker.fullRemaining = QUEUE_FULL_MARKER_SECONDS;
        this.refreshLaneSpawnMarker(lane, marker);
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
        const isAtCapacity = unitCount >= TEAM_MAX_UNITS_PER_LANE;
        const selectedDefinition = UNIT_DEFINITIONS[this.selectedSheepType];
        const isSpawnBlocked = !isAtCapacity && !this.canSpawnUnitInLane(Team.Player, lane, selectedDefinition);
        const isEnergyInsufficient = this.playerEnergy < selectedDefinition.cost;
        const isPaused = this.isPaused || !this.isStarted;
        const queueText = isPaused ? '\u5DF2\u6682\u505C'
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
                : isEnergyInsufficient ? 'energy' : 'ready';
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
        for (const marker of this.laneSpawnMarkers) {
            marker.fullRemaining = 0;
        }
        this.refreshLaneSpawnMarkers();
    }

    private createUnitTypeButtons(): void {
        const xPositions = [-480, -160, 160, 480];
        for (let index = 0; index < UNIT_ORDER.length; index += 1) {
            const type = UNIT_ORDER[index];
            const button = this.createButton(this.hudLayer, `TypeButton${type}`, '', xPositions[index], -330, 260, 40, 15, () => {
                if (this.isPaused) {
                    return;
                }
                this.selectedSheepType = type;
                this.refreshHud(`${UNIT_DEFINITIONS[type].name}已选中，选择通道出兵。`);
            });
            this.typeButtons.set(type, button);
        }
    }

    private createTacticButtons(): void {
        const header = this.createGraphicsNode('TacticSidebarHeader', FUNCTION_SIDEBAR_WIDTH, FUNCTION_HEADER_HEIGHT,
            FUNCTION_SIDEBAR_X, TACTIC_HEADER_Y, this.hudLayer);
        const headerGraphics = header.getComponent(Graphics)!;
        headerGraphics.fillColor = new Color(28, 48, 76, 250);
        headerGraphics.roundRect(-FUNCTION_SIDEBAR_WIDTH / 2, -FUNCTION_HEADER_HEIGHT / 2,
            FUNCTION_SIDEBAR_WIDTH, FUNCTION_HEADER_HEIGHT, 12);
        headerGraphics.fill();
        headerGraphics.lineWidth = 2;
        headerGraphics.strokeColor = new Color(255, 222, 126, 255);
        headerGraphics.roundRect(-FUNCTION_SIDEBAR_WIDTH / 2, -FUNCTION_HEADER_HEIGHT / 2,
            FUNCTION_SIDEBAR_WIDTH, FUNCTION_HEADER_HEIGHT, 12);
        headerGraphics.stroke();
        this.createLabel(header, 'Title', '\u6218\u672F', 0, 0, FUNCTION_SIDEBAR_WIDTH - 26, 30, 19, new Color(255, 238, 180, 255));

        this.playerSprintCard = this.createTacticCard('PlayerSprintCard', FUNCTION_SIDEBAR_X, TACTIC_FIRST_CARD_Y, 'sprint', () => {
            this.tryUseSprint(Team.Player);
        });
        this.playerHealCard = this.createTacticCard('PlayerHealCard', FUNCTION_SIDEBAR_X,
            TACTIC_FIRST_CARD_Y - TACTIC_CARD_HEIGHT - TACTIC_CARD_GAP, 'heal', () => {
            this.tryUseHeal(Team.Player);
        });
        this.playerShockCard = this.createTacticCard('PlayerShockCard', FUNCTION_SIDEBAR_X,
            TACTIC_FIRST_CARD_Y - (TACTIC_CARD_HEIGHT + TACTIC_CARD_GAP) * 2, 'shock', () => {
            this.tryUseShock(Team.Player);
        });
    }

    private createTacticCard(name: string, x: number, y: number, icon: TacticIcon, onClick: () => void): TacticCardView {
        const width = FUNCTION_SIDEBAR_WIDTH;
        const height = TACTIC_CARD_HEIGHT;
        const node = this.createGraphicsNode(name, width, height, x, y, this.hudLayer);
        const iconNode = this.createGraphicsNode('Icon', 50, 50, -width / 2 + 30, 0, node);
        const titleLabel = this.createLabel(node, 'Title', '', 15, 16, 120, 26, 17, Color.WHITE);
        const statusLabel = this.createLabel(node, 'Status', '', 15, -15, 120, 28, 12, new Color(209, 220, 230, 255));
        titleLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        statusLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
        const pressOverlay = this.createGraphicsNode('PressOverlay', width, height, 0, 0, node);
        const overlayGraphics = pressOverlay.getComponent(Graphics)!;
        overlayGraphics.fillColor = new Color(255, 255, 255, 38);
        overlayGraphics.roundRect(-width / 2, -height / 2, width, height, 16);
        overlayGraphics.fill();
        pressOverlay.active = false;

        const card: TacticCardView = {
            node,
            graphics: node.getComponent(Graphics)!,
            iconGraphics: iconNode.getComponent(Graphics)!,
            iconOpacity: iconNode.addComponent(UIOpacity),
            titleLabel,
            statusLabel,
            pressOverlay,
            width,
            height,
            enabled: false,
        };
        this.drawTacticIcon(card.iconGraphics, icon);
        const resetPressState = (): void => {
            node.setScale(1, 1, 1);
            pressOverlay.active = false;
        };
        node.on(NodeEventType.TOUCH_START, () => {
            if (!card.enabled || this.isPaused || !this.isStarted || this.isFinished) {
                return;
            }
            node.setScale(0.97, 0.97, 1);
            pressOverlay.active = true;
        }, this);
        node.on(NodeEventType.TOUCH_CANCEL, resetPressState, this);
        node.on(NodeEventType.TOUCH_END, () => {
            const canUse = card.enabled && this.isStarted && !this.isFinished && !this.isPaused;
            resetPressState();
            if (canUse) {
                onClick();
            }
        }, this);
        return card;
    }

    private drawTacticIcon(graphics: Graphics, icon: TacticIcon): void {
        const accent = icon === 'sprint' ? new Color(249, 203, 72, 255)
            : icon === 'heal' ? new Color(91, 219, 132, 255) : new Color(184, 132, 255, 255);
        graphics.fillColor = new Color(15, 26, 42, 255);
        graphics.roundRect(-25, -25, 50, 50, 13);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 230);
        graphics.roundRect(-25, -25, 50, 50, 13);
        graphics.stroke();
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

    private refreshTacticCards(): void {
        if (!this.playerSprintCard || !this.playerHealCard || !this.playerShockCard) {
            return;
        }
        const sprintActive = this.playerSprintRemaining > 0;
        const sprintEnabled = !sprintActive && this.playerSprintCooldown <= 0 && this.playerSupply >= SPRINT_SUPPLY_COST;
        const sprintStatus = sprintActive
            ? `\u51B2\u523A\u4E2D ${Math.max(1, Math.ceil(this.playerSprintRemaining))}\u79D2 \u00B7 \u6D88\u8017 ${SPRINT_SUPPLY_COST}`
            : this.playerSprintCooldown > 0
                ? `\u51B7\u5374\u4E2D ${Math.max(1, Math.ceil(this.playerSprintCooldown))}\u79D2 \u00B7 \u6D88\u8017 ${SPRINT_SUPPLY_COST}`
                : this.playerSupply < SPRINT_SUPPLY_COST ? `\u8865\u7ED9\u4E0D\u8DB3 \u00B7 \u6D88\u8017 ${SPRINT_SUPPLY_COST}` : `\u53EF\u7528 \u00B7 \u6D88\u8017 ${SPRINT_SUPPLY_COST}`;
        this.updateTacticCard(this.playerSprintCard, '\u5168\u4F53\u51B2\u523A', sprintStatus, sprintEnabled, sprintActive, new Color(249, 203, 72, 255));

        const healEnabled = this.playerHealCooldown <= 0 && this.playerSupply >= HEAL_SUPPLY_COST;
        const healStatus = this.playerHealCooldown > 0
            ? `\u51B7\u5374\u4E2D ${Math.max(1, Math.ceil(this.playerHealCooldown))}\u79D2 \u00B7 \u6D88\u8017 ${HEAL_SUPPLY_COST}`
            : this.playerSupply < HEAL_SUPPLY_COST ? `\u8865\u7ED9\u4E0D\u8DB3 \u00B7 \u6D88\u8017 ${HEAL_SUPPLY_COST}` : `\u53EF\u7528 \u00B7 \u6D88\u8017 ${HEAL_SUPPLY_COST}`;
        this.updateTacticCard(this.playerHealCard, '\u6218\u5730\u6025\u6551', healStatus, healEnabled, false, new Color(91, 219, 132, 255));

        const shockEnabled = this.playerShockUnlocked && !this.playerShockUsed;
        const shockStatus = this.playerShockUsed ? '\u5DF2\u4F7F\u7528 \u00B7 \u6D88\u8017 0'
            : this.playerShockUnlocked ? '\u53EF\u7528 \u00B7 \u6D88\u8017 0' : '\u57FA\u5730\u4F4E\u4E8E 50% \u89E3\u9501';
        this.updateTacticCard(this.playerShockCard, '\u9886\u5730\u9707\u8361', shockStatus, shockEnabled, false, new Color(184, 132, 255, 255));
    }

    private updateTacticCard(card: TacticCardView, title: string, status: string, enabled: boolean, active: boolean, accent: Color): void {
        const isLit = enabled || active;
        card.enabled = enabled;
        card.titleLabel.string = title;
        card.statusLabel.string = status;
        card.titleLabel.color = isLit ? Color.WHITE : new Color(181, 190, 199, 255);
        card.statusLabel.color = isLit ? new Color(225, 235, 242, 255) : new Color(151, 160, 171, 255);
        card.iconOpacity.opacity = isLit ? 255 : 105;
        const fill = active ? new Color(37, 91, 112, 255)
            : enabled ? new Color(37, 57, 77, 255) : new Color(38, 45, 54, 255);
        const border = isLit ? accent : new Color(92, 103, 116, 255);
        const graphics = card.graphics;
        graphics.clear();
        graphics.fillColor = fill;
        graphics.roundRect(-card.width / 2, -card.height / 2, card.width, card.height, 16);
        graphics.fill();
        if (isLit) {
            graphics.fillColor = new Color(accent.r, accent.g, accent.b, active ? 70 : 42);
            graphics.roundRect(-card.width / 2 + 2, card.height / 2 - 14, card.width - 4, 12, 14);
            graphics.fill();
        }
        graphics.lineWidth = 3;
        graphics.strokeColor = border;
        graphics.roundRect(-card.width / 2, -card.height / 2, card.width, card.height, 16);
        graphics.stroke();
    }

    private createResultPanel(): void {
        this.resultPanel = new Node('ResultPanel');
        this.resultPanel.setParent(this.modalLayer);
        this.resultPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.resultPanel.addComponent(BlockInputEvents);

        const background = this.resultPanel.addComponent(Graphics);
        background.fillColor = new Color(8, 14, 24, 218);
        background.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
        background.fill();
        background.fillColor = new Color(15, 22, 34, 238);
        background.roundRect(-360, -180, 720, 360, 28);
        background.fill();
        background.lineWidth = 4;
        background.strokeColor = new Color(238, 215, 133, 255);
        background.roundRect(-360, -180, 720, 360, 28);
        background.stroke();

        this.createLabel(this.resultPanel, 'ResultText', '', 0, 42, 460, 58, 36, new Color(255, 244, 207, 255));
        this.resultPanel.getChildByName('ResultText')?.setPosition(new Vec3(0, 128, 0));
        this.createLabel(this.resultPanel, 'ResultReport', '', 0, 30, 660, 110, 16, new Color(226, 233, 240, 255));
        this.createLabel(this.resultPanel, 'ResultHint', '重新开始会恢复双方基地与指挥能量。', 0, -10, 460, 34, 18, new Color(226, 233, 240, 255));
        this.createButton(this.resultPanel, 'RestartButton', '重新开始', 0, -72, 180, 48, 18, () => this.restartGame());
        this.resultPanel.getChildByName('ResultHint')?.setPosition(new Vec3(0, -96, 0));
        this.resultPanel.getChildByName('RestartButton')?.setPosition(new Vec3(0, -144, 0));
        this.resultPanel.getChildByName('RestartButton')?.destroy();
        this.resultPanel.getChildByName('ResultText')?.setPosition(new Vec3(0, 126, 0));
        this.resultPanel.getChildByName('ResultReport')?.setPosition(new Vec3(0, 28, 0));
        this.resultPanel.getChildByName('ResultHint')?.setPosition(new Vec3(0, -76, 0));
        this.createButton(this.resultPanel, 'RetryButton', '\u91CD\u65B0\u6311\u6218', -190, -140, 170, 46, 18, () => this.restartGame());
        this.createButton(this.resultPanel, 'NextLevelButton', '\u4E0B\u4E00\u5173', 0, -140, 170, 46, 18, () => this.startNextLevel());
        this.createButton(this.resultPanel, 'ResultLevelSelectButton', '\u8FD4\u56DE\u9009\u5173', 190, -140, 170, 46, 18, () => this.leaveBattleToLevelSelect());
        this.resultPanel.active = false;
    }

    private createStartPanel(): void {
        this.startPanel = new Node('StartPanel');
        this.startPanel.setParent(this.modalLayer);
        this.startPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.startPanel, 860, 480);

        this.createLabel(this.startPanel, 'StartTitle', '\u72FC\u7F8A\u56DB\u7EBF\u6218', 0, 126, 760, 58, 38, new Color(255, 244, 207, 255));
        this.createLabel(this.startPanel, 'StartSubtitle', '\u56DB\u7EBF\u6B63\u9762\u4EA4\u950B\u00B7\u593A\u53D6\u8865\u7ED9\u00B7\u5B88\u4F4F\u57FA\u5730', 0, 78, 760, 30, 18, new Color(190, 220, 242, 255));
        this.createLabel(this.startPanel, 'StartDescription', '\u9009\u62E9\u7F8A\u7FA4\uFF0C\u5728\u56DB\u6761\u901A\u9053\u51FA\u5175\u3002\n\u5360\u9886\u4E2D\u592E\u8865\u7ED9\u70B9\uFF0C\u79EF\u7D2F\u8865\u7ED9\u6765\u91CA\u653E\u6218\u672F\u3002\n\u51FB\u7834\u654C\u65B9\u57FA\u5730\u5373\u83B7\u80DC\u3002', 0, 5, 720, 120, 20, new Color(226, 233, 240, 255));
        this.createButton(this.startPanel, 'StartBattleButton', '\u5F00\u59CB\u6218\u6597', 0, -126, 260, 60, 22, () => this.beginBattle());
        this.startPanel.getChildByName('StartBattleButton')?.setPosition(new Vec3(0, -118, 0));
        this.startSelectedLevelLabel = this.createLabel(this.startPanel, 'StartSelectedLevel', '', 0, -70, 700, 30, 17, new Color(255, 225, 145, 255));
        this.createButton(this.startPanel, 'LevelSelectButton', '\u9009\u62E9\u5173\u5361', 0, -184, 260, 48, 19, () => this.showLevelSelect());
        this.createLabel(
            this.startPanel,
            'VersionLabel',
            `\u72FC\u7F8A\u56DB\u7EBF\u6218 ${GAME_VERSION}`,
            500,
            -328,
            230,
            24,
            14,
            new Color(132, 151, 169, 210),
        );
    }

    private createLevelSelectPanel(): void {
        this.levelSelectPanel = new Node('LevelSelectPanel');
        this.levelSelectPanel.setParent(this.modalLayer);
        this.levelSelectPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.levelSelectPanel, 900, 500);
        this.createLabel(this.levelSelectPanel, 'LevelSelectTitle', '\u5173\u5361\u9009\u62E9', 0, 166, 760, 50, 34, new Color(255, 244, 207, 255));
        this.createLabel(this.levelSelectPanel, 'LevelSelectSubtitle', '\u901A\u5173\u4E0A\u4E00\u5173\u540E\u89E3\u9501\u4E0B\u4E00\u5173\u3002', 0, 126, 760, 28, 17, new Color(190, 220, 242, 255));
        const levelButtonY = [66, 0, -66];
        for (const config of LEVEL_CONFIGS) {
            const button = this.createButton(this.levelSelectPanel, `LevelButton${config.id}`, '', 0, levelButtonY[config.id - 1], 640, 56, 16, () => {
                this.selectLevel(config.id);
            });
            this.levelButtons.set(config.id, button);
        }
        this.levelSelectHintLabel = this.createLabel(this.levelSelectPanel, 'LevelSelectHint', '', 0, -122, 760, 28, 16, new Color(226, 233, 240, 255));
        this.createButton(this.levelSelectPanel, 'LevelSelectBackButton', '\u8FD4\u56DE\u4E3B\u83DC\u5355', -170, -178, 250, 46, 18, () => this.returnToStartPanel());
        this.createButton(this.levelSelectPanel, 'ResetProgressButton', '\u91CD\u7F6E\u672C\u5730\u8FDB\u5EA6\uFF08\u6D4B\u8BD5\uFF09', 170, -178, 270, 46, 17, () => this.resetLocalProgress());
        this.levelSelectPanel.active = false;
    }

    private loadLevelProgress(): void {
        const maxLevel = LEVEL_CONFIGS.length;
        const savedValue = Number(sys.localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY));
        if (Number.isFinite(savedValue)) {
            this.highestUnlockedLevel = Math.max(1, Math.min(maxLevel, Math.floor(savedValue)));
        }
        this.currentLevel = Math.min(this.currentLevel, this.highestUnlockedLevel);
    }

    private saveLevelProgress(): void {
        sys.localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, `${this.highestUnlockedLevel}`);
    }

    private getCurrentLevelConfig(): LevelConfig {
        return LEVEL_CONFIGS[this.currentLevel - 1] ?? LEVEL_CONFIGS[0];
    }

    private refreshStartPanel(): void {
        if (!this.startSelectedLevelLabel || !this.startPanel) {
            return;
        }
        const level = this.getCurrentLevelConfig();
        this.startSelectedLevelLabel.string = `\u5F53\u524D\u5173\u5361\uFF1A\u7B2C ${level.id} \u5173 \u00B7 ${level.title}`;
        const startButtonLabel = this.startPanel.getChildByName('StartBattleButton')?.getChildByName('Text')?.getComponent(Label);
        if (startButtonLabel) {
            startButtonLabel.string = `\u6311\u6218\u7B2C ${level.id} \u5173`;
        }
    }

    private refreshLevelSelectPanel(message?: string): void {
        if (!this.levelSelectHintLabel) {
            return;
        }
        for (const config of LEVEL_CONFIGS) {
            const button = this.levelButtons.get(config.id);
            if (!button) {
                continue;
            }
            const unlocked = config.id <= this.highestUnlockedLevel;
            const selected = config.id === this.currentLevel;
            const stateText = unlocked ? (selected ? '\u5F53\u524D\u9009\u62E9' : '\u53EF\u6311\u6218') : '\u672A\u89E3\u9501';
            button.label.string = `\u7B2C ${config.id} \u5173 \u00B7 ${config.title}\n${config.description} \u00B7 ${stateText}`;
            button.label.color = unlocked ? Color.WHITE : new Color(158, 167, 178, 255);
            const fill = !unlocked ? new Color(48, 53, 62, 255)
                : selected ? new Color(43, 117, 177, 255) : new Color(47, 76, 103, 255);
            const border = !unlocked ? new Color(99, 109, 120, 255)
                : selected ? new Color(255, 226, 136, 255) : new Color(150, 199, 231, 255);
            this.drawButton(button, fill, border);
        }
        this.levelSelectHintLabel.string = message ?? `\u5DF2\u89E3\u9501\uFF1A${this.highestUnlockedLevel} / ${LEVEL_CONFIGS.length} \u5173`;
    }

    private showLevelSelect(): void {
        this.startPanel.active = false;
        this.showModal(this.levelSelectPanel);
        this.refreshLevelSelectPanel();
    }

    private returnToStartPanel(): void {
        this.levelSelectPanel.active = false;
        this.showModal(this.startPanel);
        this.refreshStartPanel();
    }

    private selectLevel(levelId: number): void {
        if (levelId > this.highestUnlockedLevel) {
            this.refreshLevelSelectPanel(`\u7B2C ${levelId - 1} \u5173\u901A\u5173\u540E\u624D\u80FD\u89E3\u9501\u3002`);
            return;
        }
        this.currentLevel = levelId;
        this.returnToStartPanel();
    }

    private resetLocalProgress(): void {
        this.highestUnlockedLevel = 1;
        this.currentLevel = 1;
        this.saveLevelProgress();
        this.refreshStartPanel();
        this.refreshLevelSelectPanel('\u672C\u5730\u8FDB\u5EA6\u5DF2\u91CD\u7F6E\uFF1A\u4EC5\u7B2C 1 \u5173\u53EF\u6311\u6218\u3002');
    }

    private createTutorialPanel(): void {
        this.tutorialPanel = new Node('TutorialPanel');
        this.tutorialPanel.setParent(this.modalLayer);
        this.tutorialPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.tutorialPanel, 900, 500);

        this.createLabel(this.tutorialPanel, 'TutorialTitle', '\u65B0\u624B\u5F15\u5BFC\u00B7\u7B2C\u4E00\u5C40', 0, 172, 800, 48, 32, new Color(255, 244, 207, 255));
        this.createLabel(this.tutorialPanel, 'TutorialSteps', '\u2460 \u5148\u70B9\u51FB\u5E95\u90E8\u5175\u79CD\u5361\u724C\u9009\u62E9\u7F8A\u7C7B\u578B\u3002\n\u2461 \u518D\u70B9\u51FB\u5BF9\u5E94\u9053\u8DEF\u7684\u4E0B\u534A\u6BB5\u51FA\u5175\uFF0C\u7BAD\u5934\u4F1A\u6807\u8BB0\u90E8\u7F72\u4F4D\u7F6E\u3002\n\u2462 \u80FD\u91CF\u4F1A\u81EA\u52A8\u6062\u590D\uFF0C\u7528\u4E8E\u6D3E\u51FA\u5355\u4F4D\u3002\n\u2463 \u5360\u9886\u4E2D\u592E\u8865\u7ED9\u70B9\u53EF\u83B7\u5F97\u8865\u7ED9\u503C\u3002\n\u2464 \u70B9\u51FB\u53F3\u4FA7\u6218\u672F\u5361\uFF0C\u4F7F\u7528\u8865\u7ED9\u503C\u91CA\u653E\u6548\u679C\u3002', 0, 32, 790, 230, 20, new Color(226, 233, 240, 255));
        this.createButton(this.tutorialPanel, 'TutorialConfirmButton', '\u77E5\u9053\u4E86\uFF0C\u5F00\u59CB\u4F5C\u6218', 0, -168, 280, 56, 20, () => this.completeTutorial());
        this.tutorialPanel.active = false;
    }

    private createPauseControls(): void {
        this.pauseButton = this.createButton(this.hudLayer, 'PauseButton', '\u2161 \u6682\u505C', FUNCTION_SIDEBAR_X, PAUSE_BUTTON_Y,
            FUNCTION_SIDEBAR_WIDTH, FUNCTION_HEADER_HEIGHT, 18, () => this.pauseGame());
        this.pauseButton.label.color = new Color(255, 238, 180, 255);
        this.drawButton(this.pauseButton, new Color(28, 48, 76, 250), new Color(255, 222, 126, 255));
        this.pauseButton.node.active = false;

        this.pausePanel = new Node('PausePanel');
        this.pausePanel.setParent(this.modalLayer);
        this.pausePanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.pausePanel, 500, 430);
        this.createLabel(this.pausePanel, 'PauseTitle', '\u6E38\u620F\u5DF2\u6682\u505C', 0, 148, 420, 50, 32, new Color(255, 244, 207, 255));
        this.createLabel(this.pausePanel, 'PauseHint', '\u6218\u573A\u3001AI \u548C\u8D44\u6E90\u6062\u590D\u5747\u5DF2\u51BB\u7ED3', 0, 106, 420, 28, 16, new Color(204, 225, 241, 255));
        this.createButton(this.pausePanel, 'ResumeButton', '\u7EE7\u7EED\u6218\u6597', 0, 50, 250, 48, 19, () => this.resumeGame());
        this.createButton(this.pausePanel, 'PauseRestartButton', '\u91CD\u65B0\u5F00\u59CB', 0, -12, 250, 48, 19, () => this.restartGame());
        this.createButton(this.pausePanel, 'HelpButton', '\u73A9\u6CD5\u8BF4\u660E', 0, -74, 250, 48, 19, () => this.openHelpPanel());
        this.createButton(this.pausePanel, 'ReturnTitleButton', '\u8FD4\u56DE\u6807\u9898', 0, -136, 250, 48, 19, () => this.returnToTitle());
        this.pausePanel.active = false;

        this.helpPanel = new Node('HelpPanel');
        this.helpPanel.setParent(this.modalLayer);
        this.helpPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.helpPanel, 760, 460);
        this.createLabel(this.helpPanel, 'HelpTitle', '\u73A9\u6CD5\u8BF4\u660E', 0, 150, 600, 48, 32, new Color(255, 244, 207, 255));
        this.createLabel(this.helpPanel, 'HelpText', '\u2022 \u9009\u62E9\u5175\u79CD\u540E\uFF0C\u70B9\u51FB\u5BF9\u5E94\u9053\u8DEF\u51FA\u5175\u3002\n\u2022 \u80FD\u91CF\u7528\u4E8E\u51FA\u5175\u3002\n\u2022 \u5360\u9886\u8865\u7ED9\u70B9\u83B7\u5F97\u8865\u7ED9\u3002\n\u2022 \u8865\u7ED9\u53EF\u4F7F\u7528\u6218\u672F\u3002\n\u2022 \u6467\u6BC1\u654C\u65B9\u57FA\u5730\u83B7\u80DC\u3002', 0, 28, 620, 220, 21, new Color(226, 233, 240, 255));
        this.createButton(this.helpPanel, 'HelpBackButton', '\u8FD4\u56DE\u6682\u505C\u83DC\u5355', 0, -158, 250, 50, 19, () => this.closeHelpPanel());
        this.helpPanel.active = false;
    }

    private pauseGame(): void {
        if (!this.isStarted || this.isFinished || this.isPaused) {
            return;
        }
        this.isPaused = true;
        this.setBattleTweensPaused(true);
        this.pauseButton.node.active = false;
        this.showModal(this.pausePanel);
        this.refreshLaneSpawnMarkers();
    }

    private resumeGame(): void {
        if (!this.isPaused) {
            return;
        }
        this.setBattleTweensPaused(false);
        this.isPaused = false;
        this.helpPanel.active = false;
        this.pausePanel.active = false;
        this.pauseButton.node.active = true;
        this.refreshLaneSpawnMarkers();
        this.refreshHud('\u5DF2\u7EE7\u7EED\u6218\u6597\u3002');
    }

    private openHelpPanel(): void {
        if (!this.isPaused) {
            return;
        }
        this.showModal(this.helpPanel);
    }

    private closeHelpPanel(): void {
        this.helpPanel.active = false;
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
    }

    private returnToTitle(): void {
        this.restartGame();
        this.isStarted = false;
        this.isPaused = false;
        this.pauseButton.node.active = false;
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        this.tutorialPanel.active = false;
        this.levelSelectPanel.active = false;
        this.showModal(this.startPanel);
        this.statusToast.active = false;
        this.refreshStartPanel();
    }

    private drawModalBackground(panel: Node, cardWidth: number, cardHeight: number): void {
        if (!panel.getComponent(BlockInputEvents)) {
            panel.addComponent(BlockInputEvents);
        }
        const graphics = panel.addComponent(Graphics);
        graphics.fillColor = new Color(8, 14, 24, 218);
        graphics.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
        graphics.fill();
        graphics.fillColor = new Color(22, 34, 52, 250);
        graphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 30);
        graphics.fill();
        graphics.lineWidth = 4;
        graphics.strokeColor = new Color(217, 235, 251, 255);
        graphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 30);
        graphics.stroke();
    }

    private showModal(panel: Node): void {
        this.modalLayer.setSiblingIndex(this.gameLayer.children.length - 1);
        panel.setSiblingIndex(this.modalLayer.children.length - 1);
        panel.active = true;
    }

    private beginBattle(): void {
        this.startPanel.active = false;
        this.applyLevelStartingResources();
        if (this.tutorialCompleted) {
            this.activateBattle();
            return;
        }
        this.showModal(this.tutorialPanel);
    }

    private completeTutorial(): void {
        this.tutorialCompleted = true;
        this.tutorialPanel.active = false;
        this.activateBattle();
    }

    private activateBattle(): void {
        this.isStarted = true;
        this.isPaused = false;
        const level = this.getCurrentLevelConfig();
        this.aiDecisionCooldown = level.aiInitialDecisionDelay;
        this.pauseButton.node.active = true;
        const openingHint = level.id === 1
            ? '\u9009\u62E9\u5175\u79CD\uFF0C\u70B9\u51FB\u9053\u8DEF\u5E95\u90E8\u7BAD\u5934\u51FA\u5175\uFF1B\u5148\u62A2\u8865\u7ED9\uFF0C\u518D\u7EC4\u7EC7\u63A8\u8FDB\u3002'
            : `\u7B2C ${level.id} \u5173\u5F00\u59CB\uFF1A${level.title}\u3002`;
        this.refreshHud(openingHint);
    }

    private trySpawnPlayerUnit(lane: number): void {
        if (!this.isStarted || this.isFinished || this.isPaused) {
            return;
        }

        const definition = UNIT_DEFINITIONS[this.selectedSheepType];
        if (this.getLaneUnitCount(Team.Player, lane) >= TEAM_MAX_UNITS_PER_LANE) {
            this.showLaneQueueFull(lane);
            this.refreshHud(`\u7B2C ${lane + 1} \u7EBF\u961F\u5217\u5DF2\u6EE1\uFF0C\u8BF7\u7B49\u5F85\u6216\u9009\u62E9\u5176\u4ED6\u9053\u8DEF\u3002`);
            return;
        }
        if (!this.canSpawnUnitInLane(Team.Player, lane, definition)) {
            this.showLaneQueueFull(lane);
            this.refreshHud(`\u7B2C ${lane + 1} \u7EBF\u961F\u5DF2\u6EE1\uFF0C\u8BF7\u7B49\u5F85\u6216\u9009\u62E9\u5176\u4ED6\u9053\u8DEF\u3002`);
            return;
        }
        if (this.getActiveUnitCount(Team.Player) >= PLAYER_MAX_ACTIVE_UNITS) {
            this.refreshHud('\u5DF1\u65B9\u5DF2\u8FBE\u5230 8 \u4E2A\u5B58\u6D3B\u5355\u4F4D\u4E0A\u9650\u3002');
            return;
        }

        if (this.playerSpawnCooldown > 0) {
            this.refreshHud('出兵操作过快，请稍候。');
            return;
        }
        if (this.playerEnergy < definition.cost) {
            this.refreshHud(`${definition.name}需要 ${definition.cost} 点指挥能量。`);
            return;
        }

        if (!this.spawnUnit(Team.Player, lane, definition)) {
            this.showLaneQueueFull(lane);
            this.refreshHud(`\u7B2C ${lane + 1} \u7EBF\u961F\u5217\u5DF2\u6EE1\uFF0C\u672C\u6B21\u51FA\u5175\u672A\u6263\u9664\u80FD\u91CF\u3002`);
            return;
        }
        this.playerEnergy -= definition.cost;
        this.playerSpawnCooldown = PLAYER_SPAWN_COOLDOWN;
        this.refreshLaneSpawnMarkers();
        this.refreshHud(`第 ${lane + 1} 线派出${definition.name}，消耗 ${definition.cost} 能量。`);
    }

    private trySpawnAIUnit(): number {
        const levelConfig = this.getCurrentLevelConfig();
        if (this.isPaused) {
            return levelConfig.aiIdleDecisionInterval;
        }
        if (this.getActiveUnitCount(Team.AI) >= levelConfig.aiMaxActiveUnits) {
            return levelConfig.aiIdleDecisionInterval;
        }

        const affordableTypes = levelConfig.aiAllowedUnitTypes.filter((type) => UNIT_DEFINITIONS[type].cost <= this.aiEnergy);
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
        this.refreshHud(`AI 在第 ${lane + 1} 线派出${definition.name.replace('羊', '狼')}。`);
        return this.getAIDeployCooldown(definition);
    }

    private chooseAILane(affordableTypes: readonly SheepType[]): number | undefined {
        const laneStates = LANE_X.map((_, lane) => ({
            lane,
            priority: this.getAILanePriority(lane),
            aiCount: this.getLaneUnitCount(Team.AI, lane),
        })).filter((state) => state.aiCount < TEAM_MAX_UNITS_PER_LANE
            && affordableTypes.some((type) => this.canSpawnUnitInLane(Team.AI, state.lane, UNIT_DEFINITIONS[type])));

        if (laneStates.length === 0) {
            return undefined;
        }

        const priorityLanes = laneStates.filter((state) => state.priority > 0);
        if (priorityLanes.length > 0) {
            const highestPriority = Math.max(...priorityLanes.map((state) => state.priority));
            const highestPriorityLanes = priorityLanes.filter((state) => state.priority === highestPriority);
            const fewestDefenders = Math.min(...highestPriorityLanes.map((state) => state.aiCount));
            const candidates = highestPriorityLanes.filter((state) => state.aiCount === fewestDefenders);
            return candidates[Math.floor(Math.random() * candidates.length)].lane;
        }

        const fewestUnits = Math.min(...laneStates.map((state) => state.aiCount));
        const candidates = laneStates.filter((state) => state.aiCount === fewestUnits);
        return candidates[Math.floor(Math.random() * candidates.length)].lane;
    }

    private getAILanePriority(lane: number): number {
        return this.getPlayerThreatScore(lane) + this.getAISupplyPriority(lane);
    }

    private getPlayerThreatScore(lane: number): number {
        const playerUnits = this.units.filter((unit) => unit.team === Team.Player && unit.lane === lane
            && unit.health > 0 && unit.node.isValid);
        if (playerUnits.length === 0) {
            return 0;
        }

        const playerPower = playerUnits.reduce((total, unit) => total + unit.definition.battlePower
            * unit.health / unit.definition.maxHealth, 0);
        const aiPower = this.getLanePower(Team.AI, lane);
        const playerAdvantage = Math.max(0, playerPower - aiPower) * 1.6;
        const forwardMostPosition = Math.max(...playerUnits.map((unit) => unit.node.position.y));
        const nearAiBase = Math.max(0, forwardMostPosition - 60) * 0.34;
        const aiTerritoryThreat = playerUnits.some((unit) => unit.node.position.y > 0) ? 18 : 0;
        return playerAdvantage + nearAiBase + aiTerritoryThreat;
    }

    private getLanePower(team: Team, lane: number): number {
        return this.units.filter((unit) => unit.team === team && unit.lane === lane
            && unit.health > 0 && unit.node.isValid)
            .reduce((total, unit) => total + unit.definition.battlePower * unit.health / unit.definition.maxHealth, 0);
    }

    private getActiveUnitCount(team: Team): number {
        return this.units.filter((unit) => unit.team === team && unit.health > 0 && unit.node.isValid).length;
    }

    private getLaneUnitCount(team: Team, lane: number): number {
        return this.units.filter((unit) => unit.team === team && unit.lane === lane
            && unit.health > 0 && unit.node.isValid).length;
    }

    private createEmptyBattleStats(): BattleStats {
        return {
            unitsSpawned: 0,
            supplyEarned: 0,
            shockUses: 0,
            sprintUses: 0,
            healUses: 0,
        };
    }

    private getBattleStats(team: Team): BattleStats {
        return team === Team.Player ? this.playerStats : this.aiStats;
    }

    private buildBattleReport(): string {
        return [
            `\u73A9\u5BB6\uFF1A\u57FA\u5730 ${this.playerBaseHealth} / ${BASE_MAX_HEALTH}  \u00B7  \u51FA\u5175 ${this.playerStats.unitsSpawned}  \u00B7  \u83B7\u5F97\u8865\u7ED9 ${this.formatSupplyEarned(this.playerStats)}`,
            `\u6218\u672F\uFF1A${this.formatTactics(this.playerStats)}`,
            `AI\uFF1A\u57FA\u5730 ${this.aiBaseHealth} / ${BASE_MAX_HEALTH}  \u00B7  \u51FA\u5175 ${this.aiStats.unitsSpawned}  \u00B7  \u83B7\u5F97\u8865\u7ED9 ${this.formatSupplyEarned(this.aiStats)}`,
            `\u6218\u672F\uFF1A${this.formatTactics(this.aiStats)}`,
        ].join('\n');
    }

    private formatSupplyEarned(stats: BattleStats): string {
        return stats.supplyEarned.toFixed(1);
    }

    private formatTactics(stats: BattleStats): string {
        const tactics: Array<[string, number]> = [
            ['\u9886\u5730\u9707\u8361', stats.shockUses],
            ['\u5168\u7EBF\u51B2\u523A', stats.sprintUses],
            ['\u6218\u5730\u6025\u6551', stats.healUses],
        ];
        const usedTactics = tactics.filter(([, count]) => count > 0)
            .map(([name, count]) => `${name}\u00D7${count}`);
        return usedTactics.length > 0 ? usedTactics.join('\u3001') : '\u672A\u4F7F\u7528';
    }

    private chooseAIUnitType(affordableTypes: readonly SheepType[], lanePressure: number, lane: number): SheepType | undefined {
        const canDeploy = (type: SheepType): boolean => affordableTypes.indexOf(type) >= 0;
        const playerHasHeavyUnit = this.units.some((unit) => unit.team === Team.Player && unit.lane === lane
            && (unit.definition.type === SheepType.Large || unit.definition.type === SheepType.Giant));

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
        return (1.6 + definition.cost * 0.04) * this.getCurrentLevelConfig().aiDeployCooldownMultiplier;
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
        const node = new Node(`${team === Team.Player ? 'Sheep' : 'Wolf'}_${definition.type}_${this.nextUnitId}`);
        node.setParent(this.battleLayer);
        node.setPosition(LANE_X[lane], safeStartY, 0);
        node.addComponent(UITransform).setContentSize(definition.radius * 2 + 12, definition.radius * 2 + 28);
        const visualNode = this.createGraphicsNode('Visual', definition.radius * 2 + 12, definition.radius * 2 + 12, 0, 0, node);
        const hitFlashNode = this.createGraphicsNode('HitFlash', definition.radius * 2 + 12, definition.radius * 2 + 12, 0, 0, node);
        const healthNode = this.createGraphicsNode('HealthBar', definition.radius * 2 + 10, 18, 0, 0, node);
        const healthFillNode = this.createGraphicsNode('HealthFill', definition.radius * 2 + 2, 10, 0, 0, healthNode);
        healthFillNode.getComponent(UITransform)!.setAnchorPoint(0, 0);
        const unit: BattleUnit = {
            id: this.nextUnitId,
            queueOrder: this.nextUnitId,
            team,
            lane,
            definition,
            node,
            visualNode,
            visualGraphics: visualNode.getComponent(Graphics)!,
            hitFlashNode,
            hitFlashOpacity: hitFlashNode.addComponent(UIOpacity),
            healthNode,
            healthGraphics: healthNode.getComponent(Graphics)!,
            healthFillNode,
            healthFillGraphics: healthFillNode.getComponent(Graphics)!,
            opacity: node.addComponent(UIOpacity),
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
        };
        this.nextUnitId += 1;
        this.units.push(unit);
        this.resolveLaneFormation(lane, 0);
        this.getBattleStats(team).unitsSpawned += 1;
        this.drawUnitVisual(unit);
        this.drawHitFlash(unit);
        this.createUnitHealthBar(unit);
        unit.hitFlashNode.active = false;
        unit.node.setScale(0.9, 0.9, 1);
        tween(unit.node)
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
            .start();
        return true;
    }

    private updateUnits(deltaTime: number): void {
        this.resolveAllLaneFormations(0);
        const pendingDamage = new Map<BattleUnit, number>();
        const playerFormations = LANE_X.map((_, lane) => this.getLaneFormation(Team.Player, lane));
        const aiFormations = LANE_X.map((_, lane) => this.getLaneFormation(Team.AI, lane));
        const engagedFronts = new Set<BattleUnit>();

        for (const unit of this.units) {
            if (this.isActiveBattleUnit(unit)) {
                unit.isMoving = false;
            }
        }

        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const playerFront = playerFormations[lane][0];
            const aiFront = aiFormations[lane][0];
            if (!this.isActiveBattleUnit(playerFront) || !this.isActiveBattleUnit(aiFront)) {
                continue;
            }
            if (!this.areFrontUnitsInContact(playerFront, aiFront)) {
                continue;
            }
            engagedFronts.add(playerFront);
            engagedFronts.add(aiFront);
            this.collectFrontAttack(playerFront, aiFront, deltaTime, pendingDamage);
            this.collectFrontAttack(aiFront, playerFront, deltaTime, pendingDamage);
        }

        this.resolvePendingCombatDamage(pendingDamage);

        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const breakthroughs = this.resolveLaneFormation(lane, deltaTime, engagedFronts);
            for (const unit of breakthroughs) {
                if (!this.isActiveBattleUnit(unit)) {
                    continue;
                }
                this.damageBase(unit.team === Team.Player ? Team.AI : Team.Player, unit);
                this.startUnitDeath(unit);
                if (this.isFinished) {
                    return;
                }
            }
        }
    }

    private isActiveBattleUnit(unit: BattleUnit | undefined): unit is BattleUnit {
        return unit !== undefined && unit.health > 0 && !unit.isDying && unit.node.isValid;
    }

    private getLaneFormation(team: Team, lane: number): BattleUnit[] {
        return this.units.filter((unit) => unit.team === team && unit.lane === lane && this.isActiveBattleUnit(unit))
            .sort((left, right) => left.queueOrder - right.queueOrder);
    }

    private getUnitQueueSpacing(frontUnit: BattleUnit, rearUnit: BattleUnit): number {
        return frontUnit.definition.radius + rearUnit.definition.radius + UNIT_QUEUE_GAP;
    }

    private getEnemyContactDistance(playerFront: BattleUnit, aiFront: BattleUnit): number {
        return playerFront.definition.radius + aiFront.definition.radius + UNIT_ENEMY_CONTACT_GAP;
    }

    private getRoadBoundsForRadius(radius: number): RoadBounds {
        return {
            minY: LANE_BOTTOM_Y + radius + UNIT_ROAD_SAFETY_MARGIN,
            maxY: LANE_TOP_Y - radius - UNIT_ROAD_SAFETY_MARGIN,
        };
    }

    private getUnitRoadBounds(unit: BattleUnit): RoadBounds {
        return this.getRoadBoundsForRadius(unit.definition.radius);
    }

    private clampRoadY(bounds: RoadBounds, y: number): number {
        return Math.max(bounds.minY, Math.min(bounds.maxY, y));
    }

    private resolveAllLaneFormations(deltaTime = 0, engagedFronts?: ReadonlySet<BattleUnit>): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.resolveLaneFormation(lane, deltaTime, engagedFronts);
        }
    }

    /**
     * The only method allowed to update a live BattleUnit root-node y position.
     * Queue order is immutable; current y never decides who is in front.
     */
    private resolveLaneFormation(
        lane: number,
        deltaTime = 0,
        engagedFronts?: ReadonlySet<BattleUnit>,
    ): BattleUnit[] {
        const playerFormation = this.getLaneFormation(Team.Player, lane);
        const aiFormation = this.getLaneFormation(Team.AI, lane);
        const playerFront = playerFormation[0];
        const aiFront = aiFormation[0];
        const playerRange = this.getPlayerFrontRange(playerFormation);
        const aiRange = this.getAIFrontRange(aiFormation);
        const playerShift = this.getAllowedTeamShift(
            playerFormation,
            this.consumeLaneShift(Team.Player, lane),
        );
        const aiShift = this.getAllowedTeamShift(
            aiFormation,
            this.consumeLaneShift(Team.AI, lane),
        );
        let playerFrontY = playerFront && playerRange
            ? this.clampRoadY(
                playerRange,
                Number.isFinite(playerFront.node.position.y)
                    ? playerFront.node.position.y + playerShift
                    : playerRange.minY,
            )
            : undefined;
        let aiFrontY = aiFront && aiRange
            ? this.clampRoadY(
                aiRange,
                Number.isFinite(aiFront.node.position.y)
                    ? aiFront.node.position.y + aiShift
                    : aiRange.maxY,
            )
            : undefined;

        this.diagnoseTeamFormation(lane, Team.Player, playerFormation);
        this.diagnoseTeamFormation(lane, Team.AI, aiFormation);

        if (playerFront && aiFront && playerRange && aiRange && playerFrontY !== undefined && aiFrontY !== undefined) {
            const contactDistance = this.getEnemyContactDistance(playerFront, aiFront);
            const frontsEngaged = engagedFronts?.has(playerFront) === true && engagedFronts.has(aiFront);
            let gap = aiFrontY - playerFrontY;
            if (gap > contactDistance + 0.001 && !frontsEngaged) {
                const availableDistance = gap - contactDistance;
                const playerMovement = this.getUnitMovementDistance(playerFront, deltaTime);
                const aiMovement = this.getUnitMovementDistance(aiFront, deltaTime);
                const totalMovement = playerMovement + aiMovement;
                const movementScale = totalMovement > 0 ? Math.min(1, availableDistance / totalMovement) : 0;
                playerFrontY = this.clampRoadY(playerRange, playerFrontY + playerMovement * movementScale);
                aiFrontY = this.clampRoadY(aiRange, aiFrontY - aiMovement * movementScale);
                gap = aiFrontY - playerFrontY;
            }

            const enemyOrderWrong = playerFrontY >= aiFrontY;
            const enemyOverlap = playerFrontY + contactDistance > aiFrontY + 0.001;
            if (enemyOrderWrong || enemyOverlap) {
                this.reportLaneInvariant(
                    lane,
                    playerFront,
                    enemyOrderWrong ? 'enemy-order' : 'enemy-overlap',
                    aiFrontY - contactDistance,
                    aiFront,
                    false,
                    enemyOverlap,
                    enemyOrderWrong,
                );
                const minimumPlayerY = Math.max(playerRange.minY, aiRange.minY - contactDistance);
                const maximumPlayerY = Math.min(playerRange.maxY, aiRange.maxY - contactDistance);
                const midpointPlayerY = (playerFrontY + aiFrontY - contactDistance) / 2;
                playerFrontY = minimumPlayerY <= maximumPlayerY
                    ? Math.max(minimumPlayerY, Math.min(maximumPlayerY, midpointPlayerY))
                    : this.clampRoadY(playerRange, midpointPlayerY);
                aiFrontY = playerFrontY + contactDistance;
            }
        } else {
            if (playerFront && playerRange && playerFrontY !== undefined) {
                playerFrontY = this.clampRoadY(
                    playerRange,
                    playerFrontY + this.getUnitMovementDistance(playerFront, deltaTime),
                );
            }
            if (aiFront && aiRange && aiFrontY !== undefined) {
                aiFrontY = this.clampRoadY(
                    aiRange,
                    aiFrontY - this.getUnitMovementDistance(aiFront, deltaTime),
                );
            }
        }

        this.applyResolvedTeamFormation(Team.Player, playerFormation, playerFrontY, deltaTime, playerShift);
        this.applyResolvedTeamFormation(Team.AI, aiFormation, aiFrontY, deltaTime, aiShift);
        this.validateResolvedLane(lane, playerFormation, aiFormation);

        const breakthroughs: BattleUnit[] = [];
        if (playerFront && aiFormation.length === 0
            && playerFront.node.position.y >= this.getBaseEndpointY(playerFront) - 0.001) {
            breakthroughs.push(playerFront);
        }
        if (aiFront && playerFormation.length === 0
            && aiFront.node.position.y <= this.getBaseEndpointY(aiFront) + 0.001) {
            breakthroughs.push(aiFront);
        }
        return breakthroughs;
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

    private applyResolvedTeamFormation(
        team: Team,
        formation: readonly BattleUnit[],
        frontY: number | undefined,
        deltaTime: number,
        teamShift: number,
    ): void {
        if (formation.length === 0 || frontY === undefined) {
            return;
        }
        let resolvedY = frontY;
        for (let index = 0; index < formation.length; index += 1) {
            const unit = formation[index];
            if (index > 0) {
                const frontUnit = formation[index - 1];
                const targetY = resolvedY + (team === Team.Player ? -1 : 1) * this.getUnitQueueSpacing(frontUnit, unit);
                const direction = team === Team.Player ? 1 : -1;
                const bounds = this.getUnitRoadBounds(unit);
                const shiftedY = unit.node.position.y + teamShift;
                const currentY = Number.isFinite(shiftedY)
                    ? this.clampRoadY(bounds, shiftedY)
                    : this.clampRoadY(bounds, targetY);
                const forwardDistance = direction * (targetY - currentY);
                if (forwardDistance < -0.001) {
                    // Immediate correction is reserved for overlap or an invalid
                    // ally order. It only moves the unit to the closest legal
                    // non-overlapping position behind the previous unit.
                    resolvedY = targetY;
                } else if (forwardDistance > 0.001) {
                    const movement = Math.min(this.getUnitMovementDistance(unit, deltaTime), forwardDistance);
                    resolvedY = currentY + direction * movement;
                } else {
                    resolvedY = currentY;
                }
                resolvedY = this.clampRoadY(bounds, resolvedY);
            }
            const previousY = unit.node.position.y;
            unit.node.setPosition(unit.node.position.x, resolvedY);
            unit.isMoving = Math.abs(resolvedY - previousY) > 0.001;
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

    private getLaneShiftKey(team: Team, lane: number): string {
        return `${team}:${lane}`;
    }

    private queueLaneShift(team: Team, lane: number, shiftY: number): void {
        const key = this.getLaneShiftKey(team, lane);
        const currentShift = this.pendingLaneShifts.get(key) ?? 0;
        this.pendingLaneShifts.set(key, currentShift + shiftY);
    }

    private consumeLaneShift(team: Team, lane: number): number {
        const key = this.getLaneShiftKey(team, lane);
        const shift = this.pendingLaneShifts.get(key) ?? 0;
        this.pendingLaneShifts.delete(key);
        return shift;
    }

    private getPlayerFrontRange(formation: readonly BattleUnit[]): RoadBounds | undefined {
        const frontUnit = formation[0];
        const minimumY = this.getMinimumPlayerFrontYForDefinitions(formation.map((unit) => unit.definition));
        if (!frontUnit || minimumY === undefined) {
            return undefined;
        }
        return { minY: minimumY, maxY: this.getUnitRoadBounds(frontUnit).maxY };
    }

    private getAIFrontRange(formation: readonly BattleUnit[]): RoadBounds | undefined {
        const frontUnit = formation[0];
        const maximumY = this.getMaximumAIFrontYForDefinitions(formation.map((unit) => unit.definition));
        if (!frontUnit || maximumY === undefined) {
            return undefined;
        }
        return { minY: this.getUnitRoadBounds(frontUnit).minY, maxY: maximumY };
    }

    private getBaseEndpointY(unit: BattleUnit): number {
        const bounds = this.getUnitRoadBounds(unit);
        return unit.team === Team.Player ? bounds.maxY : bounds.minY;
    }

    private canSpawnUnitInLane(team: Team, lane: number, definition: UnitDefinition): boolean {
        return this.getLaneUnitCount(team, lane) < TEAM_MAX_UNITS_PER_LANE
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
        const playerDefinitions = this.getLaneFormation(Team.Player, lane).map((unit) => unit.definition);
        const aiDefinitions = this.getLaneFormation(Team.AI, lane).map((unit) => unit.definition);
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

    private areFrontUnitsInContact(first: BattleUnit, second: BattleUnit): boolean {
        const collisionDistance = first.definition.radius + second.definition.radius + UNIT_ENEMY_CONTACT_GAP;
        return Math.abs(first.node.position.y - second.node.position.y) <= collisionDistance;
    }

    private collectFrontAttack(attacker: BattleUnit, target: BattleUnit, deltaTime: number, pendingDamage: Map<BattleUnit, number>): void {
        const currentAttackerFront = this.getLaneFormation(attacker.team, attacker.lane)[0];
        const currentTargetFront = this.getLaneFormation(target.team, target.lane)[0];
        if (currentAttackerFront !== attacker || currentTargetFront !== target || attacker.lane !== target.lane) {
            return;
        }
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
        return unit.definition.speed * this.getSprintMultiplier(unit.team) * deltaTime;
    }

    private resolvePendingCombatDamage(pendingDamage: ReadonlyMap<BattleUnit, number>): void {
        if (pendingDamage.size === 0) {
            return;
        }

        for (const [target, damage] of pendingDamage) {
            if (target.health > 0 && target.node.isValid) {
                target.health -= damage;
                this.triggerUnitImpact(target, true);
            }
        }

        const defeatedUnits: BattleUnit[] = [];
        for (const target of pendingDamage.keys()) {
            if (target.health <= 0 || !target.node.isValid) {
                defeatedUnits.push(target);
            }
        }
        for (const unit of defeatedUnits) {
            this.startUnitDeath(unit);
        }
    }

    private triggerUnitImpact(unit: BattleUnit, shouldFlash: boolean): void {
        if (unit.isDying || !unit.node.isValid) {
            return;
        }
        if (shouldFlash) {
            unit.hitFlashRemaining = UNIT_HIT_FLASH_DURATION;
            unit.hitRecoilRemaining = UNIT_IMPACT_DURATION;
        } else {
            unit.attackKickRemaining = UNIT_IMPACT_DURATION;
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
        unit.health = 0;
        unit.isMoving = false;
        unit.isDying = true;
        unit.deathRemaining = UNIT_DEATH_DURATION;
        unit.hitFlashRemaining = 0;
        unit.attackKickRemaining = 0;
        unit.hitRecoilRemaining = 0;
        unit.hitFlashNode.active = false;
        this.dyingUnits.push(unit);
        this.resolveLaneFormation(unit.lane, 0);
    }

    private updateUnitVisuals(deltaTime: number): void {
        for (const unit of [...this.units, ...this.dyingUnits]) {
            if (!unit.node.isValid) {
                this.removeUnit(unit);
                continue;
            }

            if (unit.isDying) {
                unit.deathRemaining = Math.max(0, unit.deathRemaining - deltaTime);
                this.updateUnitHealthBarDisplay(unit, deltaTime);
                const progress = 1 - unit.deathRemaining / UNIT_DEATH_DURATION;
                const deathScale = Math.max(0.28, 1 - progress * 0.72);
                unit.visualNode.setPosition(0, 0, 0);
                unit.visualNode.setScale(deathScale, deathScale, 1);
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
            unit.hitFlashRemaining = Math.max(0, unit.hitFlashRemaining - deltaTime);
            unit.attackKickRemaining = Math.max(0, unit.attackKickRemaining - deltaTime);
            unit.hitRecoilRemaining = Math.max(0, unit.hitRecoilRemaining - deltaTime);
            const forward = unit.team === Team.Player ? 1 : -1;
            const attackKick = Math.sin(Math.PI * unit.attackKickRemaining / UNIT_IMPACT_DURATION) * 1.7;
            const hitRecoil = Math.sin(Math.PI * unit.hitRecoilRemaining / UNIT_IMPACT_DURATION) * 1.3;
            const visualY = Math.sin(unit.walkPhase) * bobAmplitude + forward * (attackKick - hitRecoil);
            const visualScale = 1 + hitRecoil * 0.022;
            unit.visualNode.setPosition(0, visualY, 0);
            unit.visualNode.setScale(visualScale, visualScale, 1);
            unit.healthNode.setScale(1, 1, 1);
            unit.hitFlashNode.setPosition(0, visualY, 0);
            unit.hitFlashNode.setScale(visualScale, visualScale, 1);
            unit.hitFlashNode.active = unit.hitFlashRemaining > 0;
            unit.hitFlashOpacity.opacity = Math.round(220 * unit.hitFlashRemaining / UNIT_HIT_FLASH_DURATION);
            unit.opacity.opacity = 255;
            this.updateUnitHealthBarDisplay(unit, deltaTime);
        }
    }

    private createImpactSpark(attacker: BattleUnit, target: BattleUnit): void {
        if (!attacker.node.isValid || !target.node.isValid) {
            return;
        }
        const spark = this.createGraphicsNode('HitSpark', 34, 34, attacker.node.position.x,
            (attacker.node.position.y + target.node.position.y) * 0.5, this.battleLayer);
        const graphics = spark.getComponent(Graphics)!;
        graphics.lineWidth = 3;
        graphics.strokeColor = new Color(255, 226, 130, 255);
        graphics.moveTo(-10, -3);
        graphics.lineTo(10, 3);
        graphics.moveTo(-4, -10);
        graphics.lineTo(4, 10);
        graphics.moveTo(-8, 8);
        graphics.lineTo(8, -8);
        graphics.stroke();
        const opacity = spark.addComponent(UIOpacity);
        this.feedbackEffects.push({
            node: spark,
            opacity,
            startX: spark.position.x,
            startY: spark.position.y,
            yOffset: 0,
            duration: 0.1,
            elapsed: 0,
        });
    }

    private damageBase(target: Team, attacker: BattleUnit): void {
        const damage = attacker.definition.baseDamage;
        let message: string;
        if (target === Team.Player) {
            this.playerBaseHealth = Math.max(0, this.playerBaseHealth - damage);
            this.playerBaseFlashRemaining = BASE_HIT_FLASH_DURATION;
            this.createFloatingFeedback(`-${damage}`, 0, PLAYER_BASE_Y + 64, new Color(151, 221, 255, 255), 0.7, 24, 120, 24);
            message = `AI 的${attacker.definition.name.replace('羊', '狼')}突破防线，基地受到 ${damage} 点伤害！`;
        } else {
            this.aiBaseHealth = Math.max(0, this.aiBaseHealth - damage);
            this.aiBaseFlashRemaining = BASE_HIT_FLASH_DURATION;
            this.createFloatingFeedback(`-${damage}`, 0, AI_BASE_Y - 48, new Color(255, 183, 168, 255), 0.7, -24, 120, 24);
            message = `${attacker.definition.name}突破防线，AI 基地受到 ${damage} 点伤害！`;
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
        this.isFinished = true;
        this.clearBattleUnits();
        this.clearFeedbackEffects();
        this.hideTacticNotice();
        this.isPaused = false;
        this.pauseButton.node.active = false;
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        this.refreshHud(playerWon ? 'AI 基地归零，玩家获胜！' : '玩家基地归零，挑战失败。');
        const level = this.getCurrentLevelConfig();
        const nextLevelId = level.id + 1;
        let resultHint: string;
        if (playerWon && nextLevelId <= LEVEL_CONFIGS.length) {
            const newlyUnlocked = nextLevelId > this.highestUnlockedLevel;
            if (newlyUnlocked) {
                this.highestUnlockedLevel = nextLevelId;
                this.saveLevelProgress();
            }
            resultHint = newlyUnlocked
                ? `\u7B2C ${nextLevelId} \u5173\u5DF2\u89E3\u9501\uFF01\u53EF\u7EE7\u7EED\u6311\u6218\u3002`
                : `\u7B2C ${nextLevelId} \u5173\u5DF2\u53EF\u6311\u6218\u3002`;
        } else if (playerWon) {
            resultHint = '\u5168\u90E8\u5173\u5361\u5B8C\u6210\uFF01\u53EF\u4ECE\u9009\u5173\u91CD\u65B0\u6311\u6218\u3002';
        } else {
            resultHint = '\u5931\u8D25\u539F\u56E0\uFF1A\u73A9\u5BB6\u57FA\u5730\u88AB\u6467\u6BC1\u3002\u53EF\u91CD\u65B0\u6311\u6218\u6216\u8FD4\u56DE\u9009\u5173\u3002';
        }
        const resultText = this.resultPanel.getChildByName('ResultText')?.getComponent(Label);
        if (resultText) {
            resultText.string = playerWon ? '胜利！羊群守住了家园' : '失败！狼群攻破了基地';
        }
        const resultReport = this.resultPanel.getChildByName('ResultReport')?.getComponent(Label);
        if (resultReport) {
            resultReport.string = this.buildBattleReport();
        }
        if (resultText) {
            resultText.string = playerWon ? `\u7B2C ${level.id} \u5173\u901A\u5173\uFF01` : `\u7B2C ${level.id} \u5173\u5931\u8D25`;
        }
        const resultHintLabel = this.resultPanel.getChildByName('ResultHint')?.getComponent(Label);
        if (resultHintLabel) {
            resultHintLabel.string = resultHint;
        }
        const nextButton = this.resultPanel.getChildByName('NextLevelButton');
        if (nextButton) {
            nextButton.active = playerWon && nextLevelId <= LEVEL_CONFIGS.length;
        }
        this.showModal(this.resultPanel);
    }

    private startNextLevel(): void {
        if (this.currentLevel >= LEVEL_CONFIGS.length) {
            return;
        }
        this.currentLevel += 1;
        this.restartGame();
        this.activateBattle();
    }

    private leaveBattleToLevelSelect(): void {
        this.restartGame();
        this.isStarted = false;
        this.isPaused = false;
        this.pauseButton.node.active = false;
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        this.tutorialPanel.active = false;
        this.resultPanel.active = false;
        this.startPanel.active = false;
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
        this.clearBattleUnits();
        this.playerBaseHealth = BASE_MAX_HEALTH;
        this.aiBaseHealth = BASE_MAX_HEALTH;
        this.playerBaseFlashRemaining = 0;
        this.aiBaseFlashRemaining = 0;
        this.clearFeedbackEffects();
        this.hideTacticNotice();
        this.applyLevelStartingResources();
        this.playerSupply = 0;
        this.aiSupply = 0;
        this.selectedSheepType = SheepType.Small;
        this.playerSpawnCooldown = 0;
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
        this.playerStats = this.createEmptyBattleStats();
        this.aiStats = this.createEmptyBattleStats();
        for (const point of this.supplyPoints) {
            point.owner = null;
            point.capturingTeam = null;
            point.captureTime = 0;
            this.drawSupplyPoint(point);
        }
        this.resetLaneSpawnMarkers();
        this.isFinished = false;
        this.isPaused = false;
        this.lastBaseHudState = '';
        this.lastUnitButtonState = '';
        this.lastTacticHudState = '';
        this.resultPanel.active = false;
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        this.pauseButton.node.active = true;
        const resultReport = this.resultPanel.getChildByName('ResultReport')?.getComponent(Label);
        if (resultReport) {
            resultReport.string = '';
        }
        this.refreshHud('新的战斗开始，双方从 60 点指挥能量起步。');
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
        if (unit.node.isValid) {
            unit.node.destroy();
        }
        this.resolveLaneFormation(unit.lane, 0);
    }

    private clearBattleUnits(): void {
        for (const unit of [...this.units, ...this.dyingUnits]) {
            if (unit.node.isValid) {
                unit.node.destroy();
            }
        }
        this.units.length = 0;
        this.dyingUnits.length = 0;
        this.laneDebugSignatures.clear();
        this.pendingLaneShifts.clear();
        this.resolveAllLaneFormations(0);
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
        this.aiSupplyLabel.string = `\uD83D\uDCE6 AI \u8865\u7ED9 ${Math.floor(this.aiSupply)} / ${SUPPLY_MAX}`;
        this.aiEnergyLabel.string = `\u26A1 AI \u80FD\u91CF ${Math.floor(this.aiEnergy)} / ${ENERGY_MAX}`;
        this.playerEnergyLabel.string = `\u26A1 \u80FD\u91CF ${Math.floor(this.playerEnergy)} / ${ENERGY_MAX}`;
        this.aiEnergyBar.shadowLabel.string = this.aiEnergyLabel.string;
        this.playerEnergyBar.shadowLabel.string = this.playerEnergyLabel.string;
        this.playerSupplyLabel.string = `\uD83D\uDCE6 \u8865\u7ED9 ${Math.floor(this.playerSupply)} / ${SUPPLY_MAX}`;
        const unitButtonState = `${this.selectedSheepType}:${UNIT_ORDER.map((type) => this.playerEnergy >= UNIT_DEFINITIONS[type].cost ? '1' : '0').join('')}`;
        if (unitButtonState !== this.lastUnitButtonState) {
            this.lastUnitButtonState = unitButtonState;
            this.refreshUnitTypeButtons();
        }
        const tacticHudState = [
            this.playerShockUnlocked,
            this.playerShockUsed,
            Math.floor(this.playerSupply),
            Math.ceil(this.playerSprintRemaining),
            Math.ceil(this.playerSprintCooldown),
            Math.ceil(this.playerHealCooldown),
        ].join(':');
        if (tacticHudState !== this.lastTacticHudState) {
            this.lastTacticHudState = tacticHudState;
            this.refreshTacticCards();
        }
    }

    private showStatusToast(message: string): void {
        if (!this.statusToast || !this.statusLabel) {
            return;
        }
        this.statusLabel.string = message;
        this.statusToast.active = true;
        this.statusToastRemaining = 1.35;
    }

    private refreshUnitTypeButtons(): void {
        for (const type of UNIT_ORDER) {
            const button = this.typeButtons.get(type);
            if (!button) {
                continue;
            }
            const definition = UNIT_DEFINITIONS[type];
            const isSelected = this.selectedSheepType === type;
            const isAffordable = this.playerEnergy >= definition.cost;
            const fillColor = isSelected
                ? new Color(38, 133, 193, 255)
                : isAffordable ? new Color(58, 83, 108, 255) : new Color(55, 61, 70, 255);
            const borderColor = isSelected
                ? new Color(202, 241, 255, 255)
                : isAffordable ? new Color(135, 181, 216, 255) : new Color(105, 114, 126, 255);
            this.drawButton(button, fillColor, borderColor);
            button.label.string = `${isSelected ? '✓ ' : ''}${definition.name}  ${definition.cost} 能量`;
            button.label.color = isAffordable || isSelected ? Color.WHITE : new Color(170, 176, 184, 255);
        }
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
        if (!this.isStarted || this.isFinished || this.isPaused) {
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
            target.health = Math.max(1, target.health - damage);
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
        this.resolveAllLaneFormations(0);
        this.showTacticNotice(owner, '\u9886\u5730\u9707\u8361');
        const ownerName = isPlayer ? '玩家' : 'AI';
        this.refreshHud(`${ownerName}释放领地震荡：消灭 ${defeatedCount} 名轻型敌军，击退 ${repelledCount} 名重型敌军。`);
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
        const effect = this.createGraphicsNode('ShockWave', 1120, 330, 0, owner === Team.Player ? -150 : 150, this.battleLayer);
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

    private getSprintMultiplier(team: Team): number {
        const remaining = team === Team.Player ? this.playerSprintRemaining : this.aiSprintRemaining;
        return remaining > 0 ? SPRINT_SPEED_MULTIPLIER : 1;
    }

    private tryUseSprint(team: Team): void {
        if (!this.isStarted || this.isFinished || this.isPaused) {
            return;
        }

        const isPlayer = team === Team.Player;
        const remaining = isPlayer ? this.playerSprintRemaining : this.aiSprintRemaining;
        const cooldown = isPlayer ? this.playerSprintCooldown : this.aiSprintCooldown;
        const supply = isPlayer ? this.playerSupply : this.aiSupply;
        const tacticName = '\u5168\u7EBF\u51B2\u523A';
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
        this.resolveAllLaneFormations(0);
        this.showTacticNotice(team, tacticName);
        this.refreshHud(`${isPlayer ? '\u73A9\u5BB6' : 'AI'} \u4F7F\u7528${tacticName}\uFF1A\u5168\u90E8\u5B58\u6D3B\u5355\u4F4D\u79FB\u52A8\u901F\u5EA6 +50%\uFF0C\u6301\u7EED ${SPRINT_DURATION_SECONDS} \u79D2\u3002`);
    }

    private tryUseHeal(team: Team): void {
        if (!this.isStarted || this.isFinished || this.isPaused) {
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
        this.resolveAllLaneFormations(0);
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
        const tacticName = '\u5168\u7EBF\u51B2\u523A';
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
        const radius = definition.radius;
        const isPlayer = unit.team === Team.Player;
        const [red, green, blue] = definition.color;
        const sheepColor = new Color(red, green, blue, 255);
        const wolfColor = new Color(Math.max(110, red - 35), Math.max(48, green - 130), Math.max(42, blue - 125), 255);
        const outlineColor = isPlayer ? new Color(55, 132, 204, 255) : new Color(115, 38, 42, 255);
        const rankColor = isPlayer ? new Color(69, 151, 222, 255) : new Color(255, 194, 93, 255);
        graphics.clear();
        if (isPlayer) {
            this.drawSheepUnit(graphics, radius, 0, sheepColor, outlineColor);
        } else {
            this.drawWolfUnit(graphics, radius, 0, wolfColor, outlineColor);
        }
        this.drawUnitRankMark(graphics, definition.type, radius, 0, rankColor, isPlayer);
    }

    private drawHitFlash(unit: BattleUnit): void {
        const graphics = unit.hitFlashNode.getComponent(Graphics)!;
        const radius = unit.definition.radius;
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
        const barHeight = 10;
        const barY = radius + 9;
        const barWidth = radius * 2 + 2;
        graphics.clear();
        graphics.fillColor = new Color(18, 25, 34, 255);
        graphics.roundRect(-barWidth / 2, barY, barWidth, barHeight, 4);
        graphics.fill();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(142, 158, 174, 255);
        graphics.roundRect(-barWidth / 2, barY, barWidth, barHeight, 4);
        graphics.stroke();
        unit.healthFillNode.setPosition(-barWidth / 2 + 1, barY + 1, 0);
        this.drawUnitHealthFill(unit);
        this.updateUnitHealthBarDisplay(unit, 0);
    }

    private drawUnitHealthFill(unit: BattleUnit): void {
        const graphics = unit.healthFillGraphics;
        const barWidth = unit.definition.radius * 2;
        const barHeight = 8;
        graphics.clear();
        graphics.fillColor = unit.team === Team.Player
            ? new Color(66, 213, 122, 255)
            : new Color(239, 83, 80, 255);
        graphics.roundRect(0, 0, barWidth, barHeight, 3);
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

    private drawSheepUnit(graphics: Graphics, radius: number, drawY: number, bodyColor: Color, outlineColor: Color): void {
        graphics.fillColor = bodyColor;
        graphics.circle(-radius * 0.38, drawY, radius * 0.47);
        graphics.circle(radius * 0.38, drawY, radius * 0.47);
        graphics.circle(0, drawY + radius * 0.2, radius * 0.53);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = outlineColor;
        graphics.circle(0, drawY + radius * 0.08, radius * 0.73);
        graphics.stroke();

        graphics.fillColor = new Color(55, 72, 94, 255);
        graphics.circle(0, drawY - radius * 0.18, radius * 0.39);
        graphics.fill();
        graphics.fillColor = new Color(244, 250, 255, 255);
        graphics.circle(-radius * 0.15, drawY - radius * 0.12, Math.max(2, radius * 0.09));
        graphics.circle(radius * 0.15, drawY - radius * 0.12, Math.max(2, radius * 0.09));
        graphics.fill();

        graphics.fillColor = new Color(188, 211, 228, 255);
        graphics.moveTo(-radius * 0.46, drawY + radius * 0.23);
        graphics.lineTo(-radius * 0.72, drawY + radius * 0.56);
        graphics.lineTo(-radius * 0.28, drawY + radius * 0.43);
        graphics.close();
        graphics.moveTo(radius * 0.46, drawY + radius * 0.23);
        graphics.lineTo(radius * 0.72, drawY + radius * 0.56);
        graphics.lineTo(radius * 0.28, drawY + radius * 0.43);
        graphics.close();
        graphics.fill();
    }

    private drawWolfUnit(graphics: Graphics, radius: number, drawY: number, bodyColor: Color, outlineColor: Color): void {
        graphics.fillColor = bodyColor;
        graphics.moveTo(-radius * 0.7, drawY - radius * 0.5);
        graphics.lineTo(-radius * 0.46, drawY + radius * 0.7);
        graphics.lineTo(0, drawY + radius * 0.35);
        graphics.lineTo(radius * 0.46, drawY + radius * 0.7);
        graphics.lineTo(radius * 0.7, drawY - radius * 0.5);
        graphics.lineTo(0, drawY - radius * 0.72);
        graphics.close();
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = outlineColor;
        graphics.moveTo(-radius * 0.7, drawY - radius * 0.5);
        graphics.lineTo(-radius * 0.46, drawY + radius * 0.7);
        graphics.lineTo(0, drawY + radius * 0.35);
        graphics.lineTo(radius * 0.46, drawY + radius * 0.7);
        graphics.lineTo(radius * 0.7, drawY - radius * 0.5);
        graphics.lineTo(0, drawY - radius * 0.72);
        graphics.close();
        graphics.stroke();

        graphics.fillColor = new Color(238, 222, 201, 255);
        graphics.moveTo(-radius * 0.46, drawY - radius * 0.15);
        graphics.lineTo(0, drawY - radius * 0.52);
        graphics.lineTo(radius * 0.46, drawY - radius * 0.15);
        graphics.lineTo(0, drawY + radius * 0.1);
        graphics.close();
        graphics.fill();
        graphics.fillColor = new Color(255, 206, 82, 255);
        graphics.circle(-radius * 0.23, drawY + radius * 0.02, Math.max(2, radius * 0.1));
        graphics.circle(radius * 0.23, drawY + radius * 0.02, Math.max(2, radius * 0.1));
        graphics.fill();
        graphics.fillColor = new Color(49, 27, 30, 255);
        graphics.circle(-radius * 0.23, drawY + radius * 0.02, Math.max(1, radius * 0.045));
        graphics.circle(radius * 0.23, drawY + radius * 0.02, Math.max(1, radius * 0.045));
        graphics.fill();
    }

    private drawUnitRankMark(graphics: Graphics, type: SheepType, radius: number, drawY: number, color: Color, isPlayer: boolean): void {
        graphics.lineWidth = Math.max(2, radius * 0.09);
        graphics.strokeColor = color;
        graphics.fillColor = color;
        if (type === SheepType.Small) {
            graphics.circle(0, drawY - radius * 0.48, Math.max(2, radius * 0.11));
            graphics.fill();
            return;
        }
        if (type === SheepType.Medium) {
            graphics.moveTo(-radius * 0.22, drawY - radius * 0.47);
            graphics.lineTo(radius * 0.22, drawY - radius * 0.47);
            graphics.stroke();
            return;
        }
        if (type === SheepType.Large) {
            graphics.roundRect(-radius * 0.19, drawY - radius * 0.57, radius * 0.38, radius * 0.16, 3);
            graphics.fill();
            return;
        }

        const crownY = drawY - radius * 0.48;
        graphics.moveTo(-radius * 0.3, crownY);
        graphics.lineTo(-radius * 0.18, crownY - radius * 0.22);
        graphics.lineTo(0, crownY - radius * 0.04);
        graphics.lineTo(radius * 0.18, crownY - radius * 0.22);
        graphics.lineTo(radius * 0.3, crownY);
        graphics.close();
        graphics.fill();
        if (!isPlayer) {
            graphics.lineWidth = Math.max(2, radius * 0.07);
            graphics.strokeColor = new Color(112, 38, 42, 255);
            graphics.moveTo(-radius * 0.44, drawY + radius * 0.34);
            graphics.lineTo(-radius * 0.18, drawY + radius * 0.12);
            graphics.moveTo(radius * 0.44, drawY + radius * 0.34);
            graphics.lineTo(radius * 0.18, drawY + radius * 0.12);
            graphics.stroke();
        }
    }

    private createGraphicsNode(name: string, width: number, height: number, x: number, y: number, parent: Node): Node {
        const node = new Node(name);
        node.setParent(parent);
        node.setPosition(new Vec3(x, y, 0));
        node.addComponent(UITransform).setContentSize(width, height);
        node.addComponent(Graphics);
        return node;
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
        return label;
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
        node.on(NodeEventType.TOUCH_END, onClick, this);
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
