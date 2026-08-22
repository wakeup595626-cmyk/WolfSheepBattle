import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve(process.argv[2] ?? 'assets/scripts/GameController.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const checks = [];
const check = (condition, message) => checks.push({ pass: Boolean(condition), message });
const method = (name, nextName) => {
    const start = source.indexOf(`private ${name}`);
    const end = nextName ? source.indexOf(`private ${nextName}`, start + 1) : -1;
    if (start < 0) return '';
    return source.slice(start, end > start ? end : start + 5000);
};

const createUnitCards = method('createUnitTypeButtons', 'selectUnitType');
const selectUnit = method('selectUnitType', 'createTacticButtons');
const deployUnit = method('tryDeploySelectedUnit', 'trySpawnAIUnit');
const visualState = method('getUnitCardVisualState', 'isUnitTypeUnlocked');
const selectLevel = method('selectLevel', 'prepareLevelSelection');
const confirmLevel = method('confirmSelectedLevel', 'showResetProgressConfirmation');
const refreshLevels = method('refreshLevelSelectPanel', 'showLevelSelect');

check(source.includes("const GAME_VERSION = 'v1.2.0-dev';"), 'real repository version remains v1.2.0-dev');
check(source.includes("const DEVELOPMENT_BATCH = 'v1.2.0-dev-selection-confirm-01';"),
    'development batch records the repository-version-safe selection-confirm task');
check(source.includes("const REQUESTED_TASK_ID = 'v1.1.0-dev-selection-confirm-01';"),
    'the user-requested task id is retained separately without downgrading the game version');
check(createUnitCards.includes('this.selectUnitType(type);')
    && !createUnitCards.includes('this.playerEnergy < definition.cost')
    && !createUnitCards.includes('this.playerEnergy < UNIT_DEFINITIONS[type].cost'),
    'unit-card click and press handlers contain no energy rejection');
check(selectUnit.includes('this.selectedSheepType = undefined')
    && selectUnit.includes('this.selectedSheepType = type'),
    'selectUnitType owns toggle and switch selection behavior');
check(visualState.indexOf("return 'selected'") < visualState.indexOf("return 'insufficient'"),
    'selected visual state has priority over insufficient-energy presentation');
check(source.includes("statusState === 'insufficient' ? '\\u80FD\\u91CF\\u4E0D\\u8DB3'")
    && source.includes('new Color(174, 67, 43, 255)'),
    'energy availability uses an independent orange-red status treatment');
check(deployUnit.includes('this.playerEnergy < definition.cost')
    && deployUnit.includes('能量不足，还差${missing}点')
    && deployUnit.indexOf('this.playerEnergy < definition.cost') < deployUnit.indexOf('this.spawnUnit(')
    && deployUnit.indexOf('this.spawnUnit(') < deployUnit.indexOf('this.playerEnergy -= definition.cost'),
    'deployment alone validates energy before spawn and deducts only after successful spawn');
check(selectLevel.includes('this.pendingLevelSelection = config.id')
    && !selectLevel.includes('this.currentLevel =')
    && !selectLevel.includes('this.returnToStartPanel()'),
    'level-card selection changes only pending state and never closes the panel');
check(refreshLevels.includes('config.id === selectedConfig.id')
    && refreshLevels.includes('\\u5F00\\u59CB\\u6311\\u6218')
    && refreshLevels.includes('\\u5F53\\u524D\\u9009\\u62E9'),
    'level panel highlights pending selection and updates confirmation copy');
check(confirmLevel.includes('if (this.levelSelectStartLocked)')
    && confirmLevel.includes('this.levelSelectStartLocked = true')
    && confirmLevel.includes('this.currentLevel = config.id')
    && confirmLevel.includes('this.restartGame()')
    && confirmLevel.includes('this.beginBattle()'),
    'confirmation uses a one-shot lock before applying and initializing the chosen level');
check((source.match(/implemented:\s*true/g) ?? []).length >= 4,
    'at least four implemented levels remain freely selectable');
check(source.includes('LEVEL_SELECT_CONFIRM_BUTTON_WIDTH = 300')
    && source.includes('LEVEL_SELECT_ACTION_BUTTON_HEIGHT = 56'),
    'confirmation button has a 300x56 touch-friendly visible area');

const result = { passed: checks.every((item) => item.pass), sourcePath, checks };
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
