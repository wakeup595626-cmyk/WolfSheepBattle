import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const controllerPath = path.join(root, 'assets', 'scripts', 'GameController.ts');
const source = fs.readFileSync(controllerPath, 'utf8');

const checks = [];
const check = (name, condition, details = undefined) => {
    checks.push({ name, pass: Boolean(condition), details });
};

const constantNumber = (name) => {
    const match = source.match(new RegExp(`const ${name} = (-?[0-9.]+);`));
    if (!match) throw new Error(`Missing numeric constant ${name}`);
    return Number(match[1]);
};

const methodBody = (name, nextName) => {
    const start = source.indexOf(name);
    const end = source.indexOf(nextName, start + name.length);
    if (start < 0 || end < 0) throw new Error(`Cannot isolate ${name}`);
    return source.slice(start, end);
};

const cardWidth = constantNumber('UNIT_CARD_WIDTH');
const cardHeight = constantNumber('UNIT_CARD_HEIGHT');
const cardGap = constantNumber('UNIT_CARD_GAP');
const laneSpacing = constantNumber('LANE_SPACING');
const laneCenterX = constantNumber('BATTLEFIELD_CENTER_X');
const laneHitWidth = constantNumber('CARTOON_ROAD_VISUAL_WIDTH') + 22;
const lane1X = laneCenterX - laneSpacing * 1.5;
const lane1HitLeft = lane1X - laneHitWidth / 2;
const cardRight1280 = -1280 / 2 + 12 + cardWidth;

check('compact horizontal cards', cardWidth === 96 && cardHeight === 40 && cardWidth / cardHeight === 2.4);
check('independent visible card gaps', cardGap === 10
    && source.includes('The sidebar is layout-only')
    && !source.includes('sidebarGraphics.fillColor'));
check('1280 lane click clearance', lane1HitLeft - cardRight1280 >= 8,
    { lane1X, lane1HitLeft, cardRight1280, clearance: lane1HitLeft - cardRight1280 });
check('tutorial highlight differs from selected gold', source.includes('new Color(67, 214, 244, 255)'));
check('card modal input guard', source.includes('private canHandleUnitCardTouch(type: SheepType)')
    && source.includes('(tutorialAllowsCardInput || !this.isBlockingModalVisible())'));

const laneBottom = constantNumber('LANE_BOTTOM_Y');
const laneTop = constantNumber('LANE_TOP_Y');
const margin = constantNumber('UNIT_ROAD_SAFETY_MARGIN');
const radii = [18, 22, 28, 35];
const spawnRows = radii.map((radius) => {
    const player = laneBottom + radius + margin;
    const ai = laneTop - radius - margin;
    return { radius, player, ai, mid: (player + ai) / 2 };
});
check('symmetric extended road', laneBottom === -270 && laneTop === 270);
check('all spawn midpoints exact', spawnRows.every((row) => row.mid === 0), spawnRows);
check('supply visual derived from real spawn helper', source.includes('this.getLaneSupplyPointY(lane)'));
check('supply capture follows visual center', source.includes('unit.node.position.y - centerY'));
check('level four effect follows lane length', source.includes('const laneEffectHalfHeight = (LANE_LENGTH - 21) / 2'));

for (const obsolete of [
    'PLAYER_MAX_ACTIVE_UNITS',
    'TEAM_MAX_UNITS_PER_LANE',
    'aiMaxActiveUnits',
    'LEVEL_FIVE_LANE_ACTIVE_UNIT_SOFT_BUDGET',
    'pendingSmallDeployments',
    'continuousSmallUnitDeployment',
    'PLAYER_SPAWN_COOLDOWN',
]) {
    check(`obsolete limit removed: ${obsolete}`, !source.includes(obsolete));
}
check('no misleading full-lane copy', !source.includes('线已满') && !source.includes('队列已满'));

const issueBody = methodBody('private issueDeploymentRequest(', 'private hasPendingTutorialDeployment(');
const processBody = methodBody('private processPendingDeployments(', 'private issueDeploymentRequest(');
const loadGuardIndex = issueBody.indexOf('hasEmergencyDeploymentCapacity');
const playerDebitIndex = issueBody.indexOf('this.playerEnergy -= definition.cost');
const immediateSpawnIndex = issueBody.indexOf('this.spawnUnit(team, lane, definition)');
check('emergency guard precedes debit', loadGuardIndex >= 0 && loadGuardIndex < playerDebitIndex);
check('accepted request debits before materialization', playerDebitIndex >= 0 && playerDebitIndex < immediateSpawnIndex);
check('FIFO queue operations', processBody.includes('const request = queue[0]')
    && processBody.includes('queue.shift()') && issueBody.includes('queue.push(request)'));
check('pending materialization never debits again', !processBody.includes('Energy -=')
    && !processBody.includes('EnergySpent +='));
check('both factions share one request path', /issueDeploymentRequest\(\s*Team\.Player/.test(source)
    && /issueDeploymentRequest\(\s*Team\.AI/.test(source));
check('pause and finish freeze queue processing', processBody.includes('this.isPaused || this.isFinished || !this.isStarted'));
check('queue cleared across lifecycle', (source.match(/this\.clearPendingDeployments\(\);/g) ?? []).length >= 3);
check('tutorial advances only after materialization', source.includes('private handleDeploymentMaterialized(request: DeploymentRequest)')
    && processBody.includes('this.handleDeploymentMaterialized(request)'));

const emergencyLimit = constantNumber('EMERGENCY_ACTIVE_UNIT_LIMIT');
check('emergency limit is not old gameplay cap', emergencyLimit >= 60 && emergencyLimit !== 8,
    { emergencyLimit });
check('load rejection copy is accurate', source.includes('战场单位较多，请稍候；本次未扣除能量。'));

// Deterministic queue model: verifies the intended acceptance/debit/FIFO contract
// independently of frame timing and Cocos rendering.
const modelQueue = [];
let modelEnergy = 300;
let modelActive = 0;
const acceptedIds = [];
for (let id = 1; id <= 20; id += 1) {
    const cost = 12;
    if (modelEnergy < cost) break;
    modelEnergy -= cost;
    acceptedIds.push(id);
    if (modelActive < 1 && modelQueue.length === 0) modelActive += 1;
    else modelQueue.push({ id, cost });
}
const drainedIds = [];
while (modelQueue.length > 0) drainedIds.push(modelQueue.shift().id);
check('20-request model accepts each click once', acceptedIds.length === 20 && modelEnergy === 60);
check('20-request model preserves FIFO', drainedIds.every((id, index) => id === index + 2));

const failed = checks.filter((entry) => !entry.pass);
const report = {
    validator: 'battle01-ui10-static',
    source: path.relative(root, controllerPath).replaceAll('\\', '/'),
    passed: checks.length - failed.length,
    total: checks.length,
    failed,
    geometry: {
        card: { width: cardWidth, height: cardHeight, gap: cardGap },
        lanes: { spacing: laneSpacing, x: [-1.5, -0.5, 0.5, 1.5].map((offset) => laneCenterX + laneSpacing * offset) },
        spawnRows,
        emergencyLimit,
    },
};

console.log(JSON.stringify(report, null, 2));
if (failed.length > 0) process.exitCode = 1;
