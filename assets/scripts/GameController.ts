import {
    _decorator,
    Canvas,
    Color,
    Component,
    Graphics,
    HorizontalTextAlignment,
    Label,
    Node,
    NodeEventType,
    ResolutionPolicy,
    UITransform,
    Vec3,
    VerticalTextAlignment,
    view,
} from 'cc';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
const LANE_X = [-405, -135, 135, 405];
const LANE_WIDTH = 180;
const LANE_BOTTOM_Y = -245;
const LANE_TOP_Y = 270;
const LANE_LENGTH = LANE_TOP_Y - LANE_BOTTOM_Y;
const PLAYER_BASE_Y = -270;
const AI_BASE_Y = 288;
const BASE_MAX_HEALTH = 100;
const ENERGY_MAX = 100;
const ENERGY_START = 60;
const ENERGY_RECOVERY_PER_SECOND = 4;
const PLAYER_SPAWN_COOLDOWN = 0.8;
const AI_INITIAL_DECISION_DELAY = 1.8;
const AI_IDLE_DECISION_INTERVAL = 1.1;
const TEAM_MAX_ACTIVE_UNITS = 5;
const TEAM_MAX_UNITS_PER_LANE = 2;
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
    readonly team: Team;
    readonly lane: number;
    readonly definition: UnitDefinition;
    readonly node: Node;
    readonly graphics: Graphics;
    health: number;
    attackCooldown: number;
}

interface ButtonView {
    readonly node: Node;
    readonly graphics: Graphics;
    readonly label: Label;
    readonly width: number;
    readonly height: number;
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

const UNIT_DEFINITIONS: Record<SheepType, UnitDefinition> = {
    [SheepType.Small]: {
        type: SheepType.Small,
        name: '小羊',
        cost: 12,
        maxHealth: 32,
        damage: 6,
        speed: 45,
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
        speed: 38,
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
        speed: 32,
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
        speed: 26,
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
    private readonly typeButtons = new Map<SheepType, ButtonView>();
    private readonly supplyPoints: SupplyPoint[] = [];

    private playerBaseHealth = BASE_MAX_HEALTH;
    private aiBaseHealth = BASE_MAX_HEALTH;
    private playerEnergy = ENERGY_START;
    private aiEnergy = ENERGY_START;
    private playerSupply = 0;
    private aiSupply = 0;
    private playerStats: BattleStats = this.createEmptyBattleStats();
    private aiStats: BattleStats = this.createEmptyBattleStats();
    private selectedSheepType = SheepType.Small;
    private nextUnitId = 1;
    private playerSpawnCooldown = 0;
    private aiDecisionCooldown = AI_INITIAL_DECISION_DELAY;
    private hudRefreshCooldown = 0;
    private statusToastRemaining = 0;
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
    private statusMessage = '选择兵种后，点击一条通道出兵。';

    private gameLayer!: Node;
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
    private playerEnergyBadge!: Node;
    private playerSupplyBadge!: Node;
    private aiTacticLabel!: Label;
    private statusLabel!: Label;
    private statusToast!: Node;
    private resultPanel!: Node;
    private tacticPanel!: Node;
    private startPanel!: Node;
    private tutorialPanel!: Node;
    private pausePanel!: Node;
    private helpPanel!: Node;
    private playerShockButton!: ButtonView;
    private playerSprintButton!: ButtonView;
    private playerHealButton!: ButtonView;
    private playerTacticToggleButton!: ButtonView;
    private pauseButton!: ButtonView;
    private isTacticPanelOpen = false;

    onLoad(): void {
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.SHOW_ALL);

        if (!this.node.getComponent(Canvas)) {
            console.error('[WolfSheepBattle] GameController 必须挂在 Canvas 节点上。');
            return;
        }

        const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
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

        this.updateUnits(deltaTime);
        this.updateSupplyPoints(deltaTime);
        this.tryUseAITacticCards();
        this.tryUseAIShock();
        this.hudRefreshCooldown -= deltaTime;
        if (this.hudRefreshCooldown <= 0) {
            this.hudRefreshCooldown = 0.12;
            this.refreshHud();
        }
    }

    private buildGame(): void {
        this.gameLayer = new Node('GameLayer');
        this.gameLayer.setParent(this.node);
        this.gameLayer.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);

        this.drawBoard();
        this.createBaseBars();
        this.createSupplyPoints();
        this.createHud();
        this.createLaneSpawnZones();
        this.createUnitTypeButtons();
        this.createTacticButtons();
        this.createResultPanel();
        this.createStartPanel();
        this.createTutorialPanel();
        this.createPauseControls();
        this.refreshHud(this.statusMessage);
    }

    private drawBoard(): void {
        const board = this.createGraphicsNode('Board', DESIGN_WIDTH, DESIGN_HEIGHT, 0, 0, this.gameLayer);
        const graphics = board.getComponent(Graphics)!;

        graphics.fillColor = new Color(24, 32, 48, 255);
        graphics.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
        graphics.fill();

        graphics.fillColor = new Color(38, 51, 70, 255);
        graphics.roundRect(-590, -250, 1180, 520, 28);
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

        this.createLabel(this.gameLayer, 'Title', '狼羊四线战 · 补给争夺原型', 0, 338, 620, 38, 27, new Color(247, 243, 233, 255));
        this.createLabel(this.gameLayer, 'AITitle', 'AI 狼群', -574, 266, 120, 28, 18, new Color(255, 203, 196, 255));
        this.createLabel(this.gameLayer, 'PlayerTitle', '玩家羊群', -574, -246, 120, 28, 18, new Color(192, 229, 255, 255));

        for (let index = 0; index < LANE_X.length; index += 1) {
            this.createLabel(this.gameLayer, `LaneNumber${index}`, `第 ${index + 1} 线`, LANE_X[index], 116, 110, 28, 16, new Color(180, 194, 210, 190));
        }
        this.gameLayer.getChildByName('Title')?.destroy();
        this.gameLayer.getChildByName('PlayerTitle')?.destroy();
        const aiTitle = this.gameLayer.getChildByName('AITitle');
        if (aiTitle) {
            aiTitle.setPosition(new Vec3(-520, 322, 0));
        }
        for (let index = 0; index < LANE_X.length; index += 1) {
            this.gameLayer.getChildByName(`LaneNumber${index}`)?.destroy();
        }
    }

    private createBaseBars(): void {
        const aiBaseNode = this.createGraphicsNode('AIBaseBar', 940, 48, 0, AI_BASE_Y, this.gameLayer);
        const playerBaseNode = this.createGraphicsNode('PlayerBaseBar', 940, 48, 0, PLAYER_BASE_Y, this.gameLayer);
        this.aiBaseGraphics = aiBaseNode.getComponent(Graphics)!;
        this.playerBaseGraphics = playerBaseNode.getComponent(Graphics)!;
        this.refreshBaseBars();
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
        const fillColor = team === Team.Player ? new Color(55, 154, 232, 255) : new Color(227, 78, 74, 255);
        const borderColor = team === Team.Player ? new Color(144, 219, 255, 255) : new Color(255, 170, 164, 255);

        graphics.clear();
        graphics.fillColor = new Color(13, 22, 34, 255);
        graphics.roundRect(-470, -24, 940, 48, 18);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = borderColor;
        graphics.roundRect(-470, -24, 940, 48, 18);
        graphics.stroke();

        const fillWidth = 928 * healthRatio;
        if (fillWidth > 0) {
            graphics.fillColor = fillColor;
            graphics.roundRect(-464, -18, fillWidth, 36, Math.min(14, fillWidth / 2));
            graphics.fill();
        }
    }

    private createSupplyPoints(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const node = this.createGraphicsNode(`SupplyPoint${lane}`, 76, 74, LANE_X[lane], 0, this.gameLayer);
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
        this.aiBaseShadowLabel = this.createLabel(this.gameLayer, 'AIBaseHealthShadow', '', 2, AI_BASE_Y, 400, 34, 23, new Color(3, 9, 17, 255));
        this.aiBaseLabel = this.createLabel(this.gameLayer, 'AIBaseHealth', '', 0, AI_BASE_Y + 2, 400, 34, 23, Color.WHITE);
        this.aiEnergyLabel = this.createLabel(this.gameLayer, 'AIEnergy', '', 0, 0, 1, 1, 1, Color.WHITE);
        this.aiSupplyLabel = this.createLabel(this.gameLayer, 'AISupply', '', 0, 0, 1, 1, 1, Color.WHITE);
        this.aiTacticLabel = this.createLabel(this.gameLayer, 'AITactic', '', 0, 0, 1, 1, 1, Color.WHITE);
        this.aiEnergyLabel.node.active = false;
        this.aiSupplyLabel.node.active = false;
        this.aiTacticLabel.node.active = false;

        this.playerBaseShadowLabel = this.createLabel(this.gameLayer, 'PlayerBaseHealthShadow', '', 2, PLAYER_BASE_Y - 1, 400, 34, 23, new Color(3, 9, 17, 255));
        this.playerBaseLabel = this.createLabel(this.gameLayer, 'PlayerBaseHealth', '', 0, PLAYER_BASE_Y + 1, 400, 34, 23, Color.WHITE);
        this.playerEnergyBadge = this.createPlayerResourceBadge('PlayerEnergyBadge', -390,
            new Color(9, 31, 51, 255), new Color(137, 220, 255, 255));
        this.playerEnergyLabel = this.createLabel(this.playerEnergyBadge, 'Text', '', 0, 0, 142, 40, 16, new Color(226, 248, 255, 255));
        this.playerSupplyBadge = this.createPlayerResourceBadge('PlayerSupplyBadge', 390,
            new Color(10, 43, 46, 255), new Color(164, 244, 220, 255));
        this.playerSupplyLabel = this.createLabel(this.playerSupplyBadge, 'Text', '', 0, 0, 142, 40, 16, new Color(230, 255, 242, 255));

        this.statusToast = this.createGraphicsNode('StatusToast', 440, 32, 0, 226, this.gameLayer);
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
    }

    private createPlayerResourceBadge(name: string, x: number, fillColor: Color, borderColor: Color): Node {
        const badge = this.createGraphicsNode(name, 150, 44, x, PLAYER_BASE_Y + 1, this.gameLayer);
        const graphics = badge.getComponent(Graphics)!;
        graphics.fillColor = fillColor;
        graphics.roundRect(-75, -22, 150, 44, 16);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = borderColor;
        graphics.roundRect(-75, -22, 150, 44, 16);
        graphics.stroke();
        return badge;
    }

    private createLaneButtons(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.createButton(this.gameLayer, `SpawnButton${lane}`, `第 ${lane + 1} 线\n出兵`, LANE_X[lane], -178, 120, 44, 15, () => {
                this.trySpawnPlayerUnit(lane);
            });
        }
    }

    private createLaneSpawnZones(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const touchZone = new Node(`LaneSpawnZone${lane}`);
            touchZone.setParent(this.gameLayer);
            touchZone.setPosition(new Vec3(LANE_X[lane], -170, 0));
            touchZone.addComponent(UITransform).setContentSize(LANE_WIDTH, 150);
            touchZone.on(NodeEventType.TOUCH_END, () => this.trySpawnPlayerUnit(lane), this);

            const marker = this.createGraphicsNode(`SpawnMarker${lane}`, 46, 46, LANE_X[lane], -216, this.gameLayer);
            const graphics = marker.getComponent(Graphics)!;
            graphics.fillColor = new Color(38, 127, 193, 230);
            graphics.circle(0, 0, 19);
            graphics.fill();
            graphics.lineWidth = 3;
            graphics.strokeColor = new Color(204, 242, 255, 255);
            graphics.circle(0, 0, 19);
            graphics.stroke();
            graphics.fillColor = Color.WHITE;
            graphics.moveTo(0, 11);
            graphics.lineTo(-10, -4);
            graphics.lineTo(-4, -4);
            graphics.lineTo(-4, -12);
            graphics.lineTo(4, -12);
            graphics.lineTo(4, -4);
            graphics.lineTo(10, -4);
            graphics.close();
            graphics.fill();
        }
    }

    private createUnitTypeButtons(): void {
        const xPositions = [-480, -160, 160, 480];
        for (let index = 0; index < UNIT_ORDER.length; index += 1) {
            const type = UNIT_ORDER[index];
            const button = this.createButton(this.gameLayer, `TypeButton${type}`, '', xPositions[index], -330, 260, 40, 15, () => {
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
        this.playerTacticToggleButton = this.createButton(this.gameLayer, 'PlayerTacticToggleButton', '', 555, -292, 150, 36, 16, () => {
            this.toggleTacticPanel();
        });

        this.tacticPanel = new Node('TacticPanel');
        this.tacticPanel.setParent(this.gameLayer);
        this.tacticPanel.setPosition(new Vec3(0, -144, 0));
        this.tacticPanel.addComponent(UITransform).setContentSize(740, 70);
        const panelGraphics = this.tacticPanel.addComponent(Graphics);
        panelGraphics.fillColor = new Color(13, 24, 38, 245);
        panelGraphics.roundRect(-370, -35, 740, 70, 18);
        panelGraphics.fill();
        panelGraphics.lineWidth = 2;
        panelGraphics.strokeColor = new Color(158, 211, 241, 230);
        panelGraphics.roundRect(-370, -35, 740, 70, 18);
        panelGraphics.stroke();

        this.playerSprintButton = this.createButton(this.tacticPanel, 'PlayerSprintButton', '', -240, 0, 210, 46, 14, () => {
            this.tryUseSprint(Team.Player);
            this.closeTacticPanel();
        });
        this.playerShockButton = this.createButton(this.tacticPanel, 'PlayerShockButton', '', 0, 0, 220, 46, 14, () => {
            this.tryUseShock(Team.Player);
            this.closeTacticPanel();
        });
        this.playerHealButton = this.createButton(this.tacticPanel, 'PlayerHealButton', '', 240, 0, 210, 46, 14, () => {
            this.tryUseHeal(Team.Player);
            this.closeTacticPanel();
        });
        this.tacticPanel.active = false;
    }

    private toggleTacticPanel(): void {
        if (!this.isStarted || this.isFinished || this.isPaused) {
            return;
        }
        this.isTacticPanelOpen = !this.isTacticPanelOpen;
        this.tacticPanel.active = this.isTacticPanelOpen;
        this.refreshTacticUi();
    }

    private closeTacticPanel(): void {
        this.isTacticPanelOpen = false;
        this.tacticPanel.active = false;
        this.refreshTacticUi();
    }

    private createResultPanel(): void {
        this.resultPanel = new Node('ResultPanel');
        this.resultPanel.setParent(this.gameLayer);
        this.resultPanel.addComponent(UITransform).setContentSize(720, 360);

        const background = this.resultPanel.addComponent(Graphics);
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
        this.resultPanel.active = false;
    }

    private createStartPanel(): void {
        this.startPanel = new Node('StartPanel');
        this.startPanel.setParent(this.gameLayer);
        this.startPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.startPanel, 860, 420);

        this.createLabel(this.startPanel, 'StartTitle', '\u72FC\u7F8A\u56DB\u7EBF\u6218', 0, 126, 760, 58, 38, new Color(255, 244, 207, 255));
        this.createLabel(this.startPanel, 'StartSubtitle', '\u56DB\u7EBF\u6B63\u9762\u4EA4\u950B\u00B7\u593A\u53D6\u8865\u7ED9\u00B7\u5B88\u4F4F\u57FA\u5730', 0, 78, 760, 30, 18, new Color(190, 220, 242, 255));
        this.createLabel(this.startPanel, 'StartDescription', '\u9009\u62E9\u7F8A\u7FA4\uFF0C\u5728\u56DB\u6761\u901A\u9053\u51FA\u5175\u3002\n\u5360\u9886\u4E2D\u592E\u8865\u7ED9\u70B9\uFF0C\u79EF\u7D2F\u8865\u7ED9\u6765\u91CA\u653E\u6218\u672F\u3002\n\u51FB\u7834\u654C\u65B9\u57FA\u5730\u5373\u83B7\u80DC\u3002', 0, 5, 720, 120, 20, new Color(226, 233, 240, 255));
        this.createButton(this.startPanel, 'StartBattleButton', '\u5F00\u59CB\u6218\u6597', 0, -126, 260, 60, 22, () => this.beginBattle());
    }

    private createTutorialPanel(): void {
        this.tutorialPanel = new Node('TutorialPanel');
        this.tutorialPanel.setParent(this.gameLayer);
        this.tutorialPanel.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.drawModalBackground(this.tutorialPanel, 900, 500);

        this.createLabel(this.tutorialPanel, 'TutorialTitle', '\u65B0\u624B\u5F15\u5BFC\u00B7\u7B2C\u4E00\u5C40', 0, 172, 800, 48, 32, new Color(255, 244, 207, 255));
        this.createLabel(this.tutorialPanel, 'TutorialSteps', '\u2460 \u5148\u70B9\u51FB\u5E95\u90E8\u5175\u79CD\u5361\u724C\u9009\u62E9\u7F8A\u7C7B\u578B\u3002\n\u2461 \u518D\u70B9\u51FB\u5BF9\u5E94\u9053\u8DEF\u7684\u4E0B\u534A\u6BB5\u51FA\u5175\uFF0C\u7BAD\u5934\u4F1A\u6807\u8BB0\u90E8\u7F72\u4F4D\u7F6E\u3002\n\u2462 \u80FD\u91CF\u4F1A\u81EA\u52A8\u6062\u590D\uFF0C\u7528\u4E8E\u6D3E\u51FA\u5355\u4F4D\u3002\n\u2463 \u5360\u9886\u4E2D\u592E\u8865\u7ED9\u70B9\u53EF\u83B7\u5F97\u8865\u7ED9\u503C\u3002\n\u2464 \u70B9\u51FB\u57FA\u5730\u65C1\u7684\u201C\u6218\u672F\u201D\u53EF\u5C55\u5F00\u5361\u724C\uFF0C\u4F7F\u7528\u8865\u7ED9\u503C\u91CA\u653E\u6548\u679C\u3002', 0, 32, 790, 230, 20, new Color(226, 233, 240, 255));
        this.createButton(this.tutorialPanel, 'TutorialConfirmButton', '\u77E5\u9053\u4E86\uFF0C\u5F00\u59CB\u4F5C\u6218', 0, -168, 280, 56, 20, () => this.completeTutorial());
        this.tutorialPanel.active = false;
    }

    private createPauseControls(): void {
        this.pauseButton = this.createButton(this.gameLayer, 'PauseButton', '\u6682\u505C', -565, 232, 100, 38, 16, () => this.pauseGame());
        this.drawButton(this.pauseButton, new Color(28, 82, 133, 255), new Color(194, 230, 255, 255));
        this.pauseButton.node.active = false;

        this.pausePanel = new Node('PausePanel');
        this.pausePanel.setParent(this.gameLayer);
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
        this.helpPanel.setParent(this.gameLayer);
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
        this.closeTacticPanel();
        this.pauseButton.node.active = false;
        this.pausePanel.active = true;
    }

    private resumeGame(): void {
        if (!this.isPaused) {
            return;
        }
        this.isPaused = false;
        this.helpPanel.active = false;
        this.pausePanel.active = false;
        this.pauseButton.node.active = true;
        this.refreshHud('\u5DF2\u7EE7\u7EED\u6218\u6597\u3002');
    }

    private openHelpPanel(): void {
        if (!this.isPaused) {
            return;
        }
        this.helpPanel.active = true;
    }

    private closeHelpPanel(): void {
        this.helpPanel.active = false;
    }

    private returnToTitle(): void {
        this.restartGame();
        this.isStarted = false;
        this.isPaused = false;
        this.pauseButton.node.active = false;
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        this.tutorialPanel.active = false;
        this.startPanel.active = true;
        this.statusToast.active = false;
    }

    private drawModalBackground(panel: Node, cardWidth: number, cardHeight: number): void {
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

    private beginBattle(): void {
        this.startPanel.active = false;
        if (this.tutorialCompleted) {
            this.activateBattle();
            return;
        }
        this.tutorialPanel.active = true;
    }

    private completeTutorial(): void {
        this.tutorialCompleted = true;
        this.tutorialPanel.active = false;
        this.activateBattle();
    }

    private activateBattle(): void {
        this.isStarted = true;
        this.isPaused = false;
        this.pauseButton.node.active = true;
        this.refreshHud('\u6307\u5F15\u5B8C\u6210\uFF1A\u9009\u62E9\u5175\u79CD\u540E\uFF0C\u70B9\u51FB\u901A\u9053\u5F00\u59CB\u51FA\u5175\u3002');
    }

    private trySpawnPlayerUnit(lane: number): void {
        if (!this.isStarted || this.isFinished || this.isPaused) {
            return;
        }

        if (this.getActiveUnitCount(Team.Player) >= TEAM_MAX_ACTIVE_UNITS) {
            this.refreshHud('\u5DF1\u65B9\u5DF2\u8FBE\u5230 5 \u4E2A\u5B58\u6D3B\u5355\u4F4D\u4E0A\u9650\u3002');
            return;
        }
        if (this.getLaneUnitCount(Team.Player, lane) >= TEAM_MAX_UNITS_PER_LANE) {
            this.refreshHud(`\u7B2C ${lane + 1} \u7EBF\u5DF2\u8FBE\u5230 2 \u4E2A\u5355\u4F4D\u4E0A\u9650\u3002`);
            return;
        }

        const definition = UNIT_DEFINITIONS[this.selectedSheepType];
        if (this.playerSpawnCooldown > 0) {
            this.refreshHud('出兵操作过快，请稍候。');
            return;
        }
        if (this.playerEnergy < definition.cost) {
            this.refreshHud(`${definition.name}需要 ${definition.cost} 点指挥能量。`);
            return;
        }

        this.playerEnergy -= definition.cost;
        this.playerSpawnCooldown = PLAYER_SPAWN_COOLDOWN;
        this.spawnUnit(Team.Player, lane, definition);
        this.refreshHud(`第 ${lane + 1} 线派出${definition.name}，消耗 ${definition.cost} 能量。`);
    }

    private trySpawnAIUnit(): number {
        if (this.isPaused) {
            return AI_IDLE_DECISION_INTERVAL;
        }
        if (this.getActiveUnitCount(Team.AI) >= TEAM_MAX_ACTIVE_UNITS) {
            return AI_IDLE_DECISION_INTERVAL;
        }

        const affordableTypes = UNIT_ORDER.filter((type) => UNIT_DEFINITIONS[type].cost <= this.aiEnergy);
        if (affordableTypes.length === 0) {
            return AI_IDLE_DECISION_INTERVAL;
        }

        const lane = this.chooseAILane();
        if (lane === undefined) {
            return AI_IDLE_DECISION_INTERVAL;
        }
        const lanePressure = this.getLanePressure(lane);
        const type = this.chooseAIUnitType(affordableTypes, lanePressure, lane);
        if (type === undefined) {
            return AI_IDLE_DECISION_INTERVAL;
        }
        const definition = UNIT_DEFINITIONS[type];
        this.aiEnergy -= definition.cost;
        this.spawnUnit(Team.AI, lane, definition);
        this.refreshHud(`AI 在第 ${lane + 1} 线派出${definition.name.replace('羊', '狼')}。`);
        return this.getAIDeployCooldown(definition);
    }

    private chooseAILane(): number | undefined {
        const laneStates = LANE_X.map((_, lane) => ({
            lane,
            priority: this.getAILanePriority(lane),
            aiCount: this.getLaneUnitCount(Team.AI, lane),
        })).filter((state) => state.aiCount < TEAM_MAX_UNITS_PER_LANE);

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
        const canDeploy = (type: SheepType): boolean => affordableTypes.includes(type);
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
        return 1.6 + definition.cost * 0.04;
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

    private spawnUnit(team: Team, lane: number, definition: UnitDefinition): void {
        const startY = team === Team.Player ? PLAYER_BASE_Y + definition.radius + 16 : AI_BASE_Y - definition.radius - 16;
        const node = this.createGraphicsNode(
            `${team === Team.Player ? 'Sheep' : 'Wolf'}_${definition.type}_${this.nextUnitId}`,
            definition.radius * 2,
            definition.radius * 2 + 18,
            LANE_X[lane],
            startY,
            this.gameLayer,
        );
        const unit: BattleUnit = {
            id: this.nextUnitId,
            team,
            lane,
            definition,
            node,
            graphics: node.getComponent(Graphics)!,
            health: definition.maxHealth,
            attackCooldown: 0,
        };
        this.nextUnitId += 1;
        this.units.push(unit);
        this.getBattleStats(team).unitsSpawned += 1;
        this.drawUnit(unit);
    }

    private updateUnits(deltaTime: number): void {
        const pendingDamage = new Map<BattleUnit, number>();
        const movingUnits: BattleUnit[] = [];

        for (const unit of [...this.units]) {
            if (unit.health <= 0 || !unit.node.isValid) {
                continue;
            }

            const target = this.findOpponentInRange(unit);
            if (target) {
                unit.attackCooldown -= deltaTime;
                if (unit.attackCooldown <= 0) {
                    unit.attackCooldown = unit.definition.attackInterval;
                    const accumulatedDamage = pendingDamage.get(target) ?? 0;
                    pendingDamage.set(target, accumulatedDamage + unit.definition.damage);
                }
                continue;
            }

            movingUnits.push(unit);
        }

        this.resolvePendingCombatDamage(pendingDamage);

        for (const unit of movingUnits) {
            if (unit.health <= 0 || !unit.node.isValid) {
                continue;
            }

            const direction = unit.team === Team.Player ? 1 : -1;
            const movement = unit.definition.speed * this.getSprintMultiplier(unit.team) * deltaTime;
            unit.node.setPosition(unit.node.position.x, unit.node.position.y + direction * movement);
            const hasReachedBase = (unit.team === Team.Player && unit.node.position.y >= AI_BASE_Y - 30)
                || (unit.team === Team.AI && unit.node.position.y <= PLAYER_BASE_Y + 30);
            if (hasReachedBase) {
                this.damageBase(unit.team === Team.Player ? Team.AI : Team.Player, unit);
                this.removeUnit(unit);
                if (this.isFinished) {
                    return;
                }
            }
        }
    }

    private resolvePendingCombatDamage(pendingDamage: ReadonlyMap<BattleUnit, number>): void {
        if (pendingDamage.size === 0) {
            return;
        }

        for (const [target, damage] of pendingDamage) {
            if (target.health > 0 && target.node.isValid) {
                target.health -= damage;
            }
        }

        const defeatedUnits: BattleUnit[] = [];
        for (const target of pendingDamage.keys()) {
            if (target.health <= 0 || !target.node.isValid) {
                defeatedUnits.push(target);
            } else {
                this.drawUnit(target);
            }
        }
        for (const unit of defeatedUnits) {
            this.removeUnit(unit);
        }
    }

    private findOpponentInRange(unit: BattleUnit): BattleUnit | undefined {
        let closestTarget: BattleUnit | undefined;
        let shortestDistance = Number.POSITIVE_INFINITY;
        for (const candidate of this.units) {
            if (candidate.team === unit.team || candidate.lane !== unit.lane || candidate.health <= 0 || !candidate.node.isValid) {
                continue;
            }
            const distance = Math.abs(candidate.node.position.y - unit.node.position.y);
            const collisionDistance = unit.definition.radius + candidate.definition.radius + 3;
            if (distance <= collisionDistance && distance < shortestDistance) {
                closestTarget = candidate;
                shortestDistance = distance;
            }
        }
        return closestTarget;
    }

    private damageBase(target: Team, attacker: BattleUnit): void {
        const damage = attacker.definition.baseDamage;
        let message: string;
        if (target === Team.Player) {
            this.playerBaseHealth = Math.max(0, this.playerBaseHealth - damage);
            message = `AI 的${attacker.definition.name.replace('羊', '狼')}突破防线，基地受到 ${damage} 点伤害！`;
        } else {
            this.aiBaseHealth = Math.max(0, this.aiBaseHealth - damage);
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
        this.isPaused = false;
        this.pauseButton.node.active = false;
        this.pausePanel.active = false;
        this.helpPanel.active = false;
        this.refreshHud(playerWon ? 'AI 基地归零，玩家获胜！' : '玩家基地归零，挑战失败。');
        const resultText = this.resultPanel.getChildByName('ResultText')?.getComponent(Label);
        if (resultText) {
            resultText.string = playerWon ? '胜利！羊群守住了家园' : '失败！狼群攻破了基地';
        }
        const resultReport = this.resultPanel.getChildByName('ResultReport')?.getComponent(Label);
        if (resultReport) {
            resultReport.string = this.buildBattleReport();
        }
        this.resultPanel.active = true;
    }

    private restartGame(): void {
        for (const unit of [...this.units]) {
            this.removeUnit(unit);
        }
        this.playerBaseHealth = BASE_MAX_HEALTH;
        this.aiBaseHealth = BASE_MAX_HEALTH;
        this.playerEnergy = ENERGY_START;
        this.aiEnergy = ENERGY_START;
        this.playerSupply = 0;
        this.aiSupply = 0;
        this.selectedSheepType = SheepType.Small;
        this.playerSpawnCooldown = 0;
        this.aiDecisionCooldown = AI_INITIAL_DECISION_DELAY;
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
        this.isFinished = false;
        this.isPaused = false;
        this.isTacticPanelOpen = false;
        this.tacticPanel.active = false;
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
        const index = this.units.indexOf(unit);
        if (index >= 0) {
            this.units.splice(index, 1);
        }
        if (unit.node.isValid) {
            unit.node.destroy();
        }
    }

    private refreshHud(status?: string): void {
        if (status !== undefined) {
            this.statusMessage = status;
            this.showStatusToast(status);
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
        this.playerEnergyLabel.string = `\u26A1 \u80FD\u91CF ${Math.floor(this.playerEnergy)} / ${ENERGY_MAX}`;
        this.playerSupplyLabel.string = `\uD83D\uDCE6 \u8865\u7ED9 ${Math.floor(this.playerSupply)} / ${SUPPLY_MAX}`;
        this.refreshUnitTypeButtons();
        this.refreshTacticUi();
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
        if (!this.aiShockUnlocked || this.aiShockUsed || this.isFinished || this.isPaused) {
            return;
        }

        const threats = this.getEnemiesInTerritory(Team.AI);
        if (threats.length === 0) {
            return;
        }

        const threatPower = threats.reduce((total, unit) => total + unit.definition.battlePower * unit.health / unit.definition.maxHealth, 0);
        const enemyNearBase = threats.some((unit) => unit.node.position.y >= AI_BASE_Y - 115);
        if (threats.length >= 2 || threatPower >= 70 || enemyNearBase) {
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
        for (const target of targets) {
            const isLightUnit = target.definition.type === SheepType.Small || target.definition.type === SheepType.Medium;
            if (isLightUnit) {
                this.removeUnit(target);
                defeatedCount += 1;
                continue;
            }

            const damage = Math.ceil(target.definition.maxHealth * SHOCK_HEAVY_DAMAGE_RATIO);
            target.health = Math.max(1, target.health - damage);
            const direction = owner === Team.Player ? 1 : -1;
            const knockedBackY = target.node.position.y + direction * SHOCK_KNOCKBACK_DISTANCE;
            const boundedY = Math.max(PLAYER_BASE_Y + 35, Math.min(AI_BASE_Y - 35, knockedBackY));
            target.node.setPosition(target.node.position.x, boundedY);
            this.drawUnit(target);
            repelledCount += 1;
        }

        this.createShockEffect(owner);
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
        const effect = this.createGraphicsNode('ShockWave', 1120, 330, 0, owner === Team.Player ? -150 : 150, this.gameLayer);
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
            this.drawUnit(unit);
        }
        if (isPlayer) {
            this.playerSupply -= HEAL_SUPPLY_COST;
            this.playerHealCooldown = HEAL_COOLDOWN_SECONDS;
        } else {
            this.aiSupply -= HEAL_SUPPLY_COST;
            this.aiHealCooldown = HEAL_COOLDOWN_SECONDS;
        }
        this.getBattleStats(team).healUses += 1;
        this.refreshHud(`${isPlayer ? '\u73A9\u5BB6' : 'AI'} \u4F7F\u7528${tacticName}\uFF1A${damagedUnits.length} \u4E2A\u5B58\u6D3B\u5355\u4F4D\u6062\u590D\u4E86 40% \u6700\u5927\u751F\u547D\u3002`);
    }

    private tryUseAITacticCards(): void {
        if (this.isFinished || this.isPaused) {
            return;
        }

        const aiUnits = this.units.filter((unit) => unit.team === Team.AI && unit.health > 0 && unit.node.isValid);
        const injuredUnits = aiUnits.filter((unit) => unit.health / unit.definition.maxHealth <= 0.68);
        if (injuredUnits.length >= 2 && this.aiSupply >= HEAL_SUPPLY_COST && this.aiHealCooldown <= 0) {
            this.tryUseHeal(Team.AI);
            return;
        }

        if (aiUnits.length < 2 || this.aiSupply < SPRINT_SUPPLY_COST
            || this.aiSprintRemaining > 0 || this.aiSprintCooldown > 0) {
            return;
        }
        const aiPower = this.getTeamBattlePower(Team.AI);
        const playerPower = this.getTeamBattlePower(Team.Player);
        const hasAdvancedUnit = aiUnits.some((unit) => unit.node.position.y < 140);
        if (hasAdvancedUnit && aiPower >= Math.max(36, playerPower * 1.25)) {
            this.tryUseSprint(Team.AI);
        }
    }

    private getTeamBattlePower(team: Team): number {
        return this.units.filter((unit) => unit.team === team && unit.health > 0 && unit.node.isValid)
            .reduce((total, unit) => total + unit.definition.battlePower * unit.health / unit.definition.maxHealth, 0);
    }

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

    private drawUnit(unit: BattleUnit): void {
        const graphics = unit.graphics;
        const { definition } = unit;
        const radius = definition.radius;
        graphics.clear();

        const [red, green, blue] = definition.color;
        const bodyColor = unit.team === Team.Player
            ? new Color(red, green, blue, 255)
            : new Color(Math.max(80, red - 74), Math.max(35, green - 125), Math.max(35, blue - 126), 255);
        const outlineColor = unit.team === Team.Player ? new Color(73, 157, 228, 255) : new Color(130, 42, 42, 255);

        graphics.fillColor = bodyColor;
        graphics.circle(0, 0, radius);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = outlineColor;
        graphics.circle(0, 0, radius);
        graphics.stroke();

        if (unit.team === Team.Player) {
            graphics.fillColor = new Color(45, 66, 92, 255);
            graphics.circle(-radius * 0.3, 3, 3);
            graphics.circle(radius * 0.3, 3, 3);
            graphics.fill();
            graphics.moveTo(-radius * 0.3, -radius * 0.28);
            graphics.lineTo(radius * 0.3, -radius * 0.28);
            graphics.stroke();
        } else {
            graphics.fillColor = new Color(255, 240, 221, 255);
            graphics.moveTo(-radius * 0.5, radius * 0.12);
            graphics.lineTo(-radius * 0.28, radius * 0.72);
            graphics.lineTo(-radius * 0.04, radius * 0.12);
            graphics.lineTo(radius * 0.04, radius * 0.12);
            graphics.lineTo(radius * 0.28, radius * 0.72);
            graphics.lineTo(radius * 0.5, radius * 0.12);
            graphics.close();
            graphics.fill();
            graphics.fillColor = new Color(51, 31, 31, 255);
            graphics.circle(-radius * 0.28, 1, 3);
            graphics.circle(radius * 0.28, 1, 3);
            graphics.fill();
        }

        const healthRatio = Math.max(0, unit.health) / definition.maxHealth;
        graphics.fillColor = new Color(41, 49, 60, 255);
        graphics.roundRect(-radius, radius + 7, radius * 2, 7, 3);
        graphics.fill();
        graphics.fillColor = healthRatio > 0.4 ? new Color(98, 214, 111, 255) : new Color(240, 178, 72, 255);
        graphics.roundRect(-radius, radius + 7, radius * 2 * healthRatio, 7, 3);
        graphics.fill();
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
