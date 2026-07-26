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
const LANE_X = [-420, -140, 140, 420];
const PLAYER_BASE_Y = -260;
const AI_BASE_Y = 260;
const BASE_MAX_HEALTH = 100;
const ENERGY_MAX = 100;
const ENERGY_START = 60;
const ENERGY_RECOVERY_PER_SECOND = 8;
const PLAYER_SPAWN_COOLDOWN = 0.32;
const AI_DECISION_INTERVAL = 0.72;

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

const UNIT_DEFINITIONS: Record<SheepType, UnitDefinition> = {
    [SheepType.Small]: {
        type: SheepType.Small,
        name: '小羊',
        cost: 12,
        maxHealth: 32,
        damage: 6,
        speed: 88,
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
        speed: 72,
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
        speed: 58,
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
        speed: 43,
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

    private playerBaseHealth = BASE_MAX_HEALTH;
    private aiBaseHealth = BASE_MAX_HEALTH;
    private playerEnergy = ENERGY_START;
    private aiEnergy = ENERGY_START;
    private selectedSheepType = SheepType.Small;
    private nextUnitId = 1;
    private playerSpawnCooldown = 0;
    private aiDecisionCooldown = 1.1;
    private hudRefreshCooldown = 0;
    private isFinished = false;
    private statusMessage = '选择兵种后，点击一条通道出兵。';

    private gameLayer!: Node;
    private playerBaseLabel!: Label;
    private aiBaseLabel!: Label;
    private playerEnergyLabel!: Label;
    private aiEnergyLabel!: Label;
    private statusLabel!: Label;
    private resultPanel!: Node;

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
        if (this.isFinished) {
            return;
        }

        this.playerSpawnCooldown = Math.max(0, this.playerSpawnCooldown - deltaTime);
        this.aiDecisionCooldown -= deltaTime;
        this.playerEnergy = Math.min(ENERGY_MAX, this.playerEnergy + ENERGY_RECOVERY_PER_SECOND * deltaTime);
        this.aiEnergy = Math.min(ENERGY_MAX, this.aiEnergy + ENERGY_RECOVERY_PER_SECOND * deltaTime);

        if (this.aiDecisionCooldown <= 0) {
            this.aiDecisionCooldown += AI_DECISION_INTERVAL;
            this.trySpawnAIUnit();
        }

        this.updateUnits(deltaTime);
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
        this.createHud();
        this.createLaneButtons();
        this.createUnitTypeButtons();
        this.createResultPanel();
        this.refreshHud(this.statusMessage);
    }

    private drawBoard(): void {
        const board = this.createGraphicsNode('Board', DESIGN_WIDTH, DESIGN_HEIGHT, 0, 0, this.gameLayer);
        const graphics = board.getComponent(Graphics)!;

        graphics.fillColor = new Color(24, 32, 48, 255);
        graphics.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
        graphics.fill();

        graphics.fillColor = new Color(38, 51, 70, 255);
        graphics.roundRect(-590, -215, 1180, 430, 28);
        graphics.fill();

        graphics.lineWidth = 4;
        graphics.strokeColor = new Color(105, 126, 150, 255);
        for (const laneX of LANE_X) {
            graphics.roundRect(laneX - 70, -210, 140, 420, 18);
            graphics.stroke();

            graphics.lineWidth = 2;
            graphics.strokeColor = new Color(88, 107, 128, 180);
            graphics.moveTo(laneX, -190);
            graphics.lineTo(laneX, 190);
            graphics.stroke();
            graphics.lineWidth = 4;
            graphics.strokeColor = new Color(105, 126, 150, 255);
        }

        this.drawBase(graphics, Team.AI);
        this.drawBase(graphics, Team.Player);

        this.createLabel(this.gameLayer, 'Title', '狼羊四线战 · 兵种与资源原型', 0, 338, 620, 38, 27, new Color(247, 243, 233, 255));
        this.createLabel(this.gameLayer, 'AITitle', 'AI 狼群', -548, 266, 180, 28, 18, new Color(255, 203, 196, 255));
        this.createLabel(this.gameLayer, 'PlayerTitle', '玩家羊群', -548, -246, 180, 28, 18, new Color(192, 229, 255, 255));

        for (let index = 0; index < LANE_X.length; index += 1) {
            this.createLabel(this.gameLayer, `LaneNumber${index}`, `第 ${index + 1} 线`, LANE_X[index], 12, 110, 28, 16, new Color(180, 194, 210, 190));
        }
    }

    private drawBase(graphics: Graphics, team: Team): void {
        const baseY = team === Team.Player ? PLAYER_BASE_Y : AI_BASE_Y;
        graphics.fillColor = team === Team.Player ? new Color(65, 149, 230, 255) : new Color(222, 84, 78, 255);
        graphics.roundRect(-470, baseY - 24, 940, 48, 18);
        graphics.fill();

        graphics.fillColor = new Color(255, 255, 255, 70);
        graphics.roundRect(-450, baseY + (team === Team.Player ? 3 : -12), 900, 9, 5);
        graphics.fill();
    }

    private createHud(): void {
        this.aiBaseLabel = this.createLabel(this.gameLayer, 'AIBaseHealth', '', 0, 260, 380, 28, 19, Color.WHITE);
        this.aiEnergyLabel = this.createLabel(this.gameLayer, 'AIEnergy', '', 405, 260, 260, 28, 17, new Color(255, 219, 132, 255));
        this.playerBaseLabel = this.createLabel(this.gameLayer, 'PlayerBaseHealth', '', 0, -258, 380, 28, 19, Color.WHITE);
        this.playerEnergyLabel = this.createLabel(this.gameLayer, 'PlayerEnergy', '', 405, -258, 260, 28, 17, new Color(133, 220, 255, 255));
        this.statusLabel = this.createLabel(this.gameLayer, 'Status', '', 0, 220, 920, 26, 16, new Color(232, 237, 244, 255));
    }

    private createLaneButtons(): void {
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            this.createButton(this.gameLayer, `SpawnButton${lane}`, `第 ${lane + 1} 线\n出兵`, LANE_X[lane], -178, 120, 44, 15, () => {
                this.trySpawnPlayerUnit(lane);
            });
        }
    }

    private createUnitTypeButtons(): void {
        const xPositions = [-480, -160, 160, 480];
        for (let index = 0; index < UNIT_ORDER.length; index += 1) {
            const type = UNIT_ORDER[index];
            const button = this.createButton(this.gameLayer, `TypeButton${type}`, '', xPositions[index], -334, 250, 42, 15, () => {
                this.selectedSheepType = type;
                this.refreshHud(`${UNIT_DEFINITIONS[type].name}已选中，选择通道出兵。`);
            });
            this.typeButtons.set(type, button);
        }
    }

    private createResultPanel(): void {
        this.resultPanel = new Node('ResultPanel');
        this.resultPanel.setParent(this.gameLayer);
        this.resultPanel.addComponent(UITransform).setContentSize(530, 260);

        const background = this.resultPanel.addComponent(Graphics);
        background.fillColor = new Color(15, 22, 34, 238);
        background.roundRect(-265, -130, 530, 260, 28);
        background.fill();
        background.lineWidth = 4;
        background.strokeColor = new Color(238, 215, 133, 255);
        background.roundRect(-265, -130, 530, 260, 28);
        background.stroke();

        this.createLabel(this.resultPanel, 'ResultText', '', 0, 42, 460, 58, 36, new Color(255, 244, 207, 255));
        this.createLabel(this.resultPanel, 'ResultHint', '重新开始会恢复双方基地与指挥能量。', 0, -10, 460, 34, 18, new Color(226, 233, 240, 255));
        this.createButton(this.resultPanel, 'RestartButton', '重新开始', 0, -72, 180, 48, 18, () => this.restartGame());
        this.resultPanel.active = false;
    }

    private trySpawnPlayerUnit(lane: number): void {
        if (this.isFinished) {
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

    private trySpawnAIUnit(): void {
        const affordableTypes = UNIT_ORDER.filter((type) => UNIT_DEFINITIONS[type].cost <= this.aiEnergy);
        if (affordableTypes.length === 0) {
            return;
        }

        const lane = this.chooseAILane();
        const lanePressure = this.getLanePressure(lane);
        const type = this.chooseAIUnitType(affordableTypes, lanePressure);
        const definition = UNIT_DEFINITIONS[type];
        this.aiEnergy -= definition.cost;
        this.spawnUnit(Team.AI, lane, definition);
        this.refreshHud(`AI 在第 ${lane + 1} 线派出${definition.name.replace('羊', '狼')}。`);
    }

    private chooseAILane(): number {
        let bestPressure = Number.NEGATIVE_INFINITY;
        const candidates: number[] = [];
        for (let lane = 0; lane < LANE_X.length; lane += 1) {
            const pressure = this.getLanePressure(lane);
            if (pressure > bestPressure) {
                bestPressure = pressure;
                candidates.length = 0;
                candidates.push(lane);
            } else if (pressure === bestPressure) {
                candidates.push(lane);
            }
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    private chooseAIUnitType(affordableTypes: readonly SheepType[], lanePressure: number): SheepType {
        if (lanePressure >= 100) {
            return affordableTypes[affordableTypes.length - 1];
        }
        if (lanePressure >= 45) {
            const preferred = affordableTypes.filter((type) => UNIT_DEFINITIONS[type].battlePower >= 38);
            return preferred.length > 0 ? preferred[0] : affordableTypes[affordableTypes.length - 1];
        }
        if (this.aiEnergy >= 80 && affordableTypes.length > 1) {
            return affordableTypes[Math.min(1, affordableTypes.length - 1)];
        }
        return affordableTypes[0];
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
        this.drawUnit(unit);
    }

    private updateUnits(deltaTime: number): void {
        for (const unit of [...this.units]) {
            if (unit.health <= 0 || !unit.node.isValid) {
                continue;
            }

            const target = this.findOpponentInRange(unit);
            if (target) {
                unit.attackCooldown -= deltaTime;
                if (unit.attackCooldown <= 0) {
                    target.health -= unit.definition.damage;
                    unit.attackCooldown = unit.definition.attackInterval;
                    this.drawUnit(target);
                    if (target.health <= 0) {
                        this.removeUnit(target);
                    }
                }
                continue;
            }

            const direction = unit.team === Team.Player ? 1 : -1;
            unit.node.setPosition(unit.node.position.x, unit.node.position.y + direction * unit.definition.speed * deltaTime);
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
        if (target === Team.Player) {
            this.playerBaseHealth = Math.max(0, this.playerBaseHealth - damage);
            this.refreshHud(`AI 的${attacker.definition.name.replace('羊', '狼')}突破防线，基地受到 ${damage} 点伤害！`);
        } else {
            this.aiBaseHealth = Math.max(0, this.aiBaseHealth - damage);
            this.refreshHud(`${attacker.definition.name}突破防线，AI 基地受到 ${damage} 点伤害！`);
        }

        if (this.playerBaseHealth <= 0 || this.aiBaseHealth <= 0) {
            this.finishGame(this.aiBaseHealth <= 0);
        }
    }

    private finishGame(playerWon: boolean): void {
        this.isFinished = true;
        this.refreshHud(playerWon ? 'AI 基地归零，玩家获胜！' : '玩家基地归零，挑战失败。');
        const resultText = this.resultPanel.getChildByName('ResultText')?.getComponent(Label);
        if (resultText) {
            resultText.string = playerWon ? '胜利！羊群守住了家园' : '失败！狼群攻破了基地';
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
        this.selectedSheepType = SheepType.Small;
        this.playerSpawnCooldown = 0;
        this.aiDecisionCooldown = 1.1;
        this.isFinished = false;
        this.resultPanel.active = false;
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
        }
        if (!this.playerBaseLabel || !this.aiBaseLabel || !this.statusLabel) {
            return;
        }

        this.playerBaseLabel.string = `玩家基地  ${this.playerBaseHealth} / ${BASE_MAX_HEALTH}`;
        this.aiBaseLabel.string = `AI 基地  ${this.aiBaseHealth} / ${BASE_MAX_HEALTH}`;
        this.playerEnergyLabel.string = `玩家能量  ${Math.floor(this.playerEnergy)} / ${ENERGY_MAX}`;
        this.aiEnergyLabel.string = `AI 能量  ${Math.floor(this.aiEnergy)} / ${ENERGY_MAX}`;
        this.statusLabel.string = this.statusMessage;
        this.refreshUnitTypeButtons();
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
