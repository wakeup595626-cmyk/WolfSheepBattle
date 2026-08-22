import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const sourcePath = path.join(root, 'assets', 'scripts', 'GameController.ts');
const fontAuditPath = path.join(root, 'art_source', 'qa', 'victory-result-ui-01', 'font_subset_audit.json');
const outputPath = path.join(root, 'art_source', 'qa', 'victory-result-ui-01', 'static_validation.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const fontAudit = JSON.parse(fs.readFileSync(fontAuditPath, 'utf8'));

const checks = [];
const check = (condition, message) => checks.push({ pass: Boolean(condition), message });
const includesAll = (...values) => values.every((value) => source.includes(value));

check(source.includes("const GAME_VERSION = 'v1.2.0-dev';"), 'real internal version remains v1.2.0-dev');
check(source.includes("const DEVELOPMENT_BATCH = 'v1.2.0-dev-victory-result-ui-01';"), 'development batch is incremented without downgrading the real version');
check(includesAll("createGraphicsNode('ResultCard', 720, 540", "createGraphicsNode('ResultBadge', 80, 80"), 'unified result card and badge use final dimensions');
check(includesAll('new Rect(205, 19, 551, 685)', 'panelSprite.type = Sprite.Type.SLICED', 'borderLeft: 56'), 'formal parchment frame is trimmed and sliced instead of stretched with transparent margins');
check(source.includes('new Color(8, 18, 16, 158)'), 'result mask uses a 62 percent translucent dark-green backdrop');
check(!source.includes('resultReportLabel') && !source.includes('buildBattleReport()'), 'legacy debug-style report block is removed');
check(includesAll('PlayerResultCard', 'AiResultCard', "'\\u57FA\\u5730\\u5269\\u4F59'", "'\\u6D3E\\u51FA\\u5355\\u4F4D'", "'\\u4F7F\\u7528\\u6218\\u672F'"), 'player and AI data are split into structured metric cards');
check(includesAll('formatResultNumber(value: number)', 'Number.isInteger(rounded)', "rounded.toFixed(1)"), 'result numbers remove meaningless .0 while preserving one useful decimal');
check(includesAll("'ResultRetryButton'", "'ResultNextButton'", "'ResultLevelSelectButton'", '190,', '58,'), 'three result actions use the unified 190x58 button component');
check(includesAll('node.setScale(0.97, 0.97, 1)', 'resultActionsLocked = true', 'TOUCH_CANCEL'), 'result buttons have pressed, cancel and duplicate-trigger protection');
check(includesAll('layoutResultButtons(playerWon && !!nextLevel)', 'setPosition(-110, 0, 0)', 'setPosition(110, 0, 0)'), 'missing next level hides next and centers the remaining actions');
check(includesAll('getLevelConfig(levelId + 1)', 'return this.isLevelImplemented(adjacent) ? adjacent : undefined'), 'next level remains adjacent-and-implemented only and does not unlock levels');
check(includesAll('resultCard.setScale(0.92, 0.92, 1)', "easing: 'backOut'", 'fadeOutBgm(0.4)'), 'result transition keeps freeze/audio behavior and adds a single panel rebound');
check(fontAudit.missing_glyph_count === 0 && fontAudit.required_result_ui_missing.length === 0, 'current unified Chinese font contains every result-screen glyph');

const result = {
    batch: 'v1.2.0-dev-victory-result-ui-01',
    passed: checks.every((item) => item.pass),
    totals: {
        checks: checks.length,
        passed: checks.filter((item) => item.pass).length,
        failed: checks.filter((item) => !item.pass).length,
    },
    checks,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
