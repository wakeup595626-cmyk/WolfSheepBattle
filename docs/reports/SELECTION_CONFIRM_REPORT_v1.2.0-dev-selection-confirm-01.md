# 羊狼四线战：兵种选择与关卡确认专项报告

- 仓库真实游戏版本：`v1.2.0-dev`
- 本轮安全开发批次：`v1.2.0-dev-selection-confirm-01`
- 用户提供的需求编号：`v1.1.0-dev-selection-confirm-01`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`（`master`）
- 日期：2026-08-03

> 仓库真实版本已高于需求文本中的 `v1.1.0-dev`，因此没有回退或覆盖版本号；需求编号单独留档。

## 修改文件

源码：

- `D:\GameProjects\WolfSheepBattle\assets\scripts\GameController.ts`

QA 与构建配置：

- `D:\GameProjects\WolfSheepBattle\tools\qa\validate_selection_confirm_01.mjs`
- `D:\GameProjects\WolfSheepBattle\tools\qa\validate_selection_confirm_01_static.mjs`
- `D:\GameProjects\WolfSheepBattle\tools\qa\selection_confirm_01_web_build_config.json`
- `D:\GameProjects\WolfSheepBattle\tools\qa\selection_confirm_01_wechat_build_config.json`

没有直接修改 `build`、`library`、`temp` 生成文件，没有修改场景、单位数值、道路、队列、AI、音频或存档结构。

## 问题原因与修复

### 1. 兵种选择被能量条件拦截

原先 `createUnitTypeButtons()` 的点击回调和 `TOUCH_START` 回调都在能量低于兵种费用时提前返回；此外 `getUnitCardVisualState()` 把 `insufficient` 的优先级放在 `selected` 之前，导致低能量卡既不能选，也无法同时表现“已选中 + 能量不足”。

现已拆分为：

- `selectUnitType(type)`：只负责选中、取消和切换，不检查能量。
- `tryDeploySelectedUnit(lane)`：道路点击后才检查暂停、道路容量、出生条件、全局单位上限、冷却与能量，只有 `spawnUnit()` 成功后才扣能量。

低能量卡保持黄色选中边框与柔和金色覆盖，状态条独立显示橙红色“能量不足”。例如10点能量选中巨羊后，四路尝试均提示“能量不足，还差60点”，单位数、队列和能量均不变。能量达到70后状态自动切换为“可用”，选择不会丢失；成功部署后仍保留巨羊选择。

### 2. 关卡条目点击立即离开

原先 `selectLevel(levelId)` 直接写入 `currentLevel` 并调用 `returnToStartPanel()`，因此条目点击等于立即离开选关面板。

现改为两阶段：

- 条目点击只更新 `pendingLevelSelection`，刷新金黄色卡片、序号徽章和“当前选择”。
- 底部主按钮动态显示“开始挑战第X关”。
- `confirmSelectedLevel()` 才把待选关卡写入 `currentLevel`、关闭面板、清理上一局并调用既有 `beginBattle()` 流程。
- `levelSelectStartLocked` 在首次确认时立即锁定，连续点击不会重复重置或重复启动。
- 打开面板时优先待选当前有效关卡；无效时安全回退第一个已实现关卡。

第1至第4关仍依据 `implemented/enabled` 自由选择；未通关记录只影响“已通关”展示，不重新参与锁定。

## 自动验证结果

### 静态与编译

- 专项源码断言：13/13 通过。
- TypeScript：`tsc --noEmit --skipLibCheck true -p tsconfig.json` 通过。

### Web 正式参数构建与运行

- 构建：成功，Debug关闭、Source Maps关闭。
- 输出：`D:\GameProjects\WolfSheepBattle\art_source\qa\selection-confirm-01\builds\web-mobile`
- Playwright 运行专项：11/11 通过。
- 控制台 Error/Warning：0。
- 资源404/请求失败：0。

覆盖：

- 10能量依次选中小/中/大/巨，四张都可选且只有一张保持选中。
- 10能量选巨羊后四路出兵均不扣能量、不生成单位、不留下队列占位。
- 能量恢复到70后巨羊仍选中并自动显示“可用”。
- 成功出兵后扣70能量、生成1个单位、保持巨羊选择。
- 同卡再次点击取消，点击其他卡直接切换。
- 第1至第4关条目只改变待选高亮，`currentLevel` 和战斗状态不提前改变。
- 第1至第4关确认均只初始化一次，第二次连续确认被输入锁拦截。

截图：

- `D:\GameProjects\WolfSheepBattle\art_source\qa\selection-confirm-01\screenshots\giant_selected_at_10_energy_1280x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\selection-confirm-01\screenshots\level_select_confirm_level4_1280x720.png`
- 审计数据：`D:\GameProjects\WolfSheepBattle\art_source\qa\selection-confirm-01\screenshots\selection_confirm_runtime_audit.json`

### 微信小游戏正式参数构建

- 构建：成功（Cocos Creator 3.8.8，约14秒）。
- 输出：`D:\GameProjects\WolfSheepBattle\art_source\qa\selection-confirm-01\builds\wechatgame`
- AppID：`wxfbd176abc5b3911c`
- 启动场景：`db://assets/scenes/Battle.scene`
- 横屏：`landscapeRight`
- Debug：`false`
- Source Maps：0个
- 微信云开发调用：未发现
- 构建脚本中已确认包含 `confirmSelectedLevel` 和“能量不足，还差”逻辑。

## 尚需人工真机核验

自动化不能替代微信开发者工具真机调试和实体设备触感验证，仍需用户确认：

1. 横屏真机上四张兵种卡触控范围与可见区域一致。
2. 低亮度屏幕下黄色选中框与橙红状态文字仍清楚。
3. 连续快速点击关卡条目不会因设备触摸采样产生误触。
4. “开始挑战第X关”按钮单手触摸舒适且没有重复进入。
5. 第4关确认后进入既有特殊道路教学/战术编组流程并最终正常开战。

## 发布操作

- 未上传微信平台。
- 未提交 Git。
- 未创建 Git 标签。
- 未修改线上 `v1.0.0`。
