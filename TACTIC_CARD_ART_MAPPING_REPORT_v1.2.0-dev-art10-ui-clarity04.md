# 羊狼四线战：战术牌美术映射专项报告

- 批次：`v1.2.0-dev-art10-ui-clarity04`
- 游戏版本：`v1.2.0-dev`（未修改）
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 日期：2026-07-29
- Git 操作：未提交、未创建标签；原有未提交工作区成果保持不变

## 1. 结论

右侧三张战术牌已完成内部结构重构和 v04 正式美术接入：

- 每张卡保持一个完整外框，内部明确拆分为图标区、文字区、分割线、消耗区、辅助信息区和状态区。
- 七个逻辑背景区域分别映射一个独立 Sprite；运行时检查确认每个区域恰好只有一个正式背景 Sprite。
- 正式 Sprite 的 `UITransform` 尺寸和四边边界与对应逻辑区域完全重合。
- 正式资源加载成功后，七个对应 Graphics 回退全部关闭；未发现双层边框。
- 三种技能图标已迁移为透明 Sprite，不再显示黑色代码方块。
- 显示状态继续使用 `getPlayerTacticAvailability()` 的统一结果；未复制技能条件判断。
- 战术技能逻辑、数值、道路、单位、AI、关卡和其他 HUD 均未修改。

浏览器正式构建的自动验收为 **1361/1361 通过**。微信小游戏正式参数构建成功，主包和全部本地包继续满足既有限制。微信开发者工具官方 CLI 在本机打开项目和查询会话时均超时，因此工具窗口内的截图及交互检查仍需人工完成，未将其虚报为通过。

## 2. 实际修改文件

### 2.1 源码与配置

- `assets/scripts/GameController.ts`
  - 重构 `TacticCardView` 的独立节点引用。
  - 建立七区域节点结构和对应回退 Graphics。
  - 接入 v04 区域 Sprite、技能图标和状态变体。
  - 更新固定显示文案和底部辅助信息文案。
  - 增加区域边界、Sprite/Graphics 映射和重叠诊断。
  - 点击与显示继续共用 `TacticAvailability`。
- `assets/scripts/art/ArtPilotConfig.ts`
  - 批次更新为 `v1.2.0-dev-art10-ui-clarity04`。
  - 新增 v04 战术牌资源键。
  - v04 路径直接指向 `runtime_v04`，不经过会改写为 `runtime_v01` 的 `full()`。
- `tools/art_pipeline/generate_tactic_card_v04.py`
  - 生成空白 UI 分区、状态底框及三种透明技能图标。
- `tools/qa/validate_art10_tactic_cards_clarity04.mjs`
  - 覆盖三种分辨率、24 种状态、不可用点击、按压、暂停、去抖、真实施放和资源映射。
- `tools/qa/art10_ui_clarity04_web_build_config.json`
- `tools/qa/art10_ui_clarity04_wechat_build_config.json`

### 2.2 新增美术

源文件目录：

`art_source/ui/tactic_cards/v04/`

运行时目录：

`assets/bundles/art_ui/ui/tactic_cards/v04/`

新增 16 组源 PNG 和 16 组运行时 PNG：

- `tactic_card_shell_v04.png` / `tactic_card_shell_runtime_v04.png`
- `tactic_icon_cell_sprint_v04.png` / `tactic_icon_cell_sprint_runtime_v04.png`
- `tactic_icon_cell_heal_v04.png` / `tactic_icon_cell_heal_runtime_v04.png`
- `tactic_icon_cell_shock_v04.png` / `tactic_icon_cell_shock_runtime_v04.png`
- `tactic_skill_sprint_v04.png` / `tactic_skill_sprint_runtime_v04.png`
- `tactic_skill_heal_v04.png` / `tactic_skill_heal_runtime_v04.png`
- `tactic_skill_shock_v04.png` / `tactic_skill_shock_runtime_v04.png`
- `tactic_text_cell_v04.png` / `tactic_text_cell_runtime_v04.png`
- `tactic_divider_v04.png` / `tactic_divider_runtime_v04.png`
- `tactic_cost_cell_v04.png` / `tactic_cost_cell_runtime_v04.png`
- `tactic_meta_cell_v04.png` / `tactic_meta_cell_runtime_v04.png`
- `tactic_state_available_v04.png` / `tactic_state_available_runtime_v04.png`
- `tactic_state_unavailable_v04.png` / `tactic_state_unavailable_runtime_v04.png`
- `tactic_state_cooldown_v04.png` / `tactic_state_cooldown_runtime_v04.png`
- `tactic_state_locked_v04.png` / `tactic_state_locked_runtime_v04.png`
- `tactic_state_used_v04.png` / `tactic_state_used_runtime_v04.png`

运行时 PNG 合计约 28.8 KiB。PNG 内没有烘焙中文、补给数字、冷却数字或状态文字。

### 2.3 旧运行时资源迁移

以下三张不再被代码引用的 v01 整卡资源及原 `.meta` 已从 `assets` 移出，完整保存在：

`art_source/_archive/runtime_tactic_cards_v01_art10_clarity04/`

- 冲刺整卡：93,235 B
- 急救整卡：96,508 B
- 震荡整卡：102,609 B

未删除高质量源档，也未手写或伪造 `.meta`。清理后的微信构建中没有 v01 三张整卡资源路径。

## 3. 最终节点结构

```text
TacticCardRoot
├─ CardShellSprite
├─ TopSection
│  ├─ IconCell
│  │  ├─ IconCellSprite
│  │  ├─ SkillIconSprite
│  │  └─ SkillIconFallback
│  └─ TextCell
│     ├─ TextCellSprite
│     ├─ TitleLabel
│     ├─ ConditionLabel
│     └─ EffectLabel
├─ Divider
│  └─ DividerSprite
├─ BottomSection
│  ├─ CostCell
│  │  ├─ CostCellSprite
│  │  ├─ CostIconSprite
│  │  └─ CostLabel
│  ├─ MetaCell
│  │  ├─ MetaCellSprite
│  │  ├─ MetaIconSprite
│  │  └─ MetaLabel
│  └─ StateCell
│     ├─ StateCellSprite
│     ├─ StateIconSprite
│     └─ StateLabel
└─ TouchArea
```

Graphics 组件只作为对应区域的资源加载失败回退，不再作为正式模式的叠加底框。

## 4. Sprite 与逻辑框映射

| 逻辑区域 | 正式节点 | ArtPilot 资源 | 运行时资源 | 尺寸 | 模式 |
|---|---|---|---|---:|---|
| 整张卡外框 | `CardShellSprite` | `TacticCardShell` | `tactic_card_shell_runtime_v04` | 216×124 | CUSTOM + SLICED，14 px 内边 |
| 左上图标区域 | `IconCellSprite` | 按技能选择 `TacticIconCell*` | 三种 `tactic_icon_cell_*_runtime_v04` | 68×80 | CUSTOM + SLICED，10 px 内边 |
| 右上文字区域 | `TextCellSprite` | `TacticTextCell` | `tactic_text_cell_runtime_v04` | 136×80 | CUSTOM + SLICED，10 px 内边 |
| 上下分割线 | `DividerSprite` | `TacticDivider` | `tactic_divider_runtime_v04` | 208×2 | CUSTOM + SIMPLE |
| 左下消耗区域 | `CostCellSprite` | `TacticCostCell` | `tactic_cost_cell_runtime_v04` | 52×28 | CUSTOM + SLICED，7 px 内边 |
| 中下辅助区域 | `MetaCellSprite` | `TacticMetaCell` | `tactic_meta_cell_runtime_v04` | 44×28 | CUSTOM + SLICED，7 px 内边 |
| 右下状态区域 | `StateCellSprite` | 按状态选择 `TacticStateCell*` | 五种 `tactic_state_*_runtime_v04` | 104×28 | CUSTOM + SLICED，7 px 内边 |

运行时自动检查逐卡验证：

- 上述七个节点各自只有 1 个正式背景 Sprite。
- Sprite 的宽、高、左、右、上、下均与逻辑区域一致。
- `sizeMode === CUSTOM`。
- 可拉伸框均为 `Sprite.Type.SLICED`；分割线为 `SIMPLE`。
- 正式 Sprite 与对应 Graphics 不会同时启用。

## 5. 最终布局尺寸

- 单卡：216×124
- 上半区：216×88
- 下半区：216×36
- 图标区：68×80，占上方有效宽度约 33.3%
- 文字区：136×80，占上方有效宽度约 66.7%
- 图标区与文字区间距：4
- 分割线：208×2
- 消耗区：52×28
- 辅助区：44×28
- 状态区：104×28
- 下方相邻区域间距：4
- 卡间距：9
- 技能图标：54×54，完整位于图标区
- TouchArea：216×124，与卡牌四边完全重合，不超出卡牌

1280×720 下三卡中心位置：

- 冲刺：`(520, 144)`
- 急救：`(520, 11)`
- 震荡：`(520, -122)`

1600×720 宽屏下 X 自动调整为 680。三张卡未遮挡第四条道路或底部单位卡。

## 6. 文字与状态

### 6.1 固定文案

| 技能 | 标题 | 条件 | 效果 | 消耗 | 辅助 |
|---|---|---|---|---|---|
| 全体冲刺 | 全体冲刺 | 场上有己方单位 | 移速+50% · 持续6秒 | 补给 2 | 10秒 |
| 战地急救 | 战地急救 | 场上有受伤单位 | 全体恢复40%生命 | 补给 3 | 8秒 |
| 领地震荡 | 领地震荡 | 基地生命低于50% | 本方领地小/中消灭；大/巨重伤并击退 | 零消耗 | 每局1次 |

领地震荡效果固定为两行。所有标题、条件和效果均位于 TextCell 内，未进入图标区。

### 6.2 状态映射

| Availability 状态 | 状态美术 | 显示示例 | 交互 |
|---|---|---|---|
| `available` / `active` | 明亮绿色/金绿色 | 点击使用 / 生效中 X秒 | 可用状态允许按压 |
| `insufficient-supply` | 砖红色 | 补给不足 0/2、0/3 | 禁止按压与施放 |
| `cooldown` | 蓝灰色 | 冷却中 X秒 | 禁止按压与施放 |
| `locked` | 紫灰色 | 生命<50%解锁 | 禁止按压与施放 |
| `used` / `finished` | 中性灰色 | 本局已使用 / 战斗已结束 | 禁止按压与施放 |
| 无单位、无伤员、领地无敌人 | 不可用底框 | 对应动态提示 | 禁止按压与施放 |
| 暂停 / 未开始 | 蓝灰提示底框 | 游戏已暂停 / 战斗尚未开始 | 禁止按压与施放 |

“领地内暂无敌人”使用状态区完整文字宽度，状态图标节点仍已加载但隐藏，避免单行文字被挤压。

## 7. Graphics 和双层边框

- `CardShellFallbackGraphics`：正式模式关闭。
- `IconCellFallbackGraphics`：正式模式关闭。
- `TextCellFallbackGraphics`：正式模式关闭。
- `DividerFallbackGraphics`：正式模式关闭。
- `CostCellFallbackGraphics`：正式模式关闭。
- `MetaCellFallbackGraphics`：正式模式关闭。
- `StateCellFallbackGraphics`：正式模式关闭。
- 黑色技能图标背景：已移除；正式模式使用透明技能图标 Sprite。

结论：正式模式中未发现旧 Graphics 外露、双层边框或同一逻辑框叠加多个背景 Sprite。

## 8. 浏览器与分辨率测试

正式 Web 构建参数：

- Platform：`web-mobile`
- Debug：关闭
- Source Maps：关闭
- Start Scene：`Battle.scene`

自动验收：

- 总检查：1361
- 通过：1361
- 失败：0
- 状态组合：24
- 不可用点击组合：12
- 控制台 Error / PageError：0
- 战术牌边界或映射 Warning：0
- 请求失败：0
- 404：0

覆盖分辨率：

- 1280×720
- 1600×720 宽屏横屏模拟
- 844×390 手机横屏

覆盖项目：

- 三卡左右分区和下方三分区尺寸一致。
- 图标、标题、条件、效果及底部文字均位于自己的逻辑区域。
- 不可用卡按下时保持 scale `(1,1)`，不出现高亮，不扣补给，不进入冷却，不播放技能音效。
- 可用卡按下时只产生轻微按压反馈，释放后恢复并通过既有技能入口施放。
- 暂停、未开始、战斗结束状态与 availability 一致。
- 连续状态刷新未创建重叠背景或产生布局警告。

运行时审计文件：

`art_source/qa/art10-ui-clarity04/screenshots/tactic_card_clarity04_runtime_audit.json`

## 9. 微信小游戏构建

正式参数构建结果：成功。

- Platform：WeChat Mini Game
- Start Scene：`Battle.scene`
- Debug：关闭
- Source Maps：关闭（构建内 `.map` 文件数为 0）
- Orientation：`landscapeRight`
- 分包数量：6
- Cocos Creator：3.8.8

包体：

| 项目 | clarity03 | clarity04 | 变化 |
|---|---:|---:|---:|
| 主包 | 3,418,257 B（3.260 MiB） | 3,423,557 B（3.265 MiB） | +5,300 B |
| 全部本地包 | 19,804,735 B（18.887 MiB） | 19,557,687 B（18.652 MiB） | -247,048 B |

clarity04 分包：

| 包 | 大小 |
|---|---:|
| 主包 | 3.265 MiB |
| `art_boot` | 0.932 MiB |
| `art_battlefield` | 4.182 MiB |
| `art_units` | 2.935 MiB |
| `art_ui` | 2.690 MiB |
| `art_vfx` | 2.020 MiB |
| `audio_bgm` | 2.628 MiB |

结果：

- 主包低于 4 MiB。
- 全部本地包低于 30 MiB。
- `art_ui/config.json` 中包含 v04 资源路径。
- 构建中不存在旧的 `tactic_card_sprint/heal/shock_runtime_v01` 路径。
- Cocos 构建日志以 `Finished` 结束，CLI 返回该版本构建成功使用的退出码 36。

微信开发者工具窗口测试：

- 官方 `cli.bat open --project <wechatgame>` 在 90 秒内无响应并超时。
- 随后的只读 `islogin` 会话查询也超时。
- 未执行上传、二维码预览或平台配置修改。
- 因当前会话缺少 Windows 应用控制接口，未取得可信的开发者工具窗口截图；该项列入人工检查。

## 10. 截图

修改前参考：

`art_source/qa/art10-ui-clarity04/references/tactic_cards_before_reference_1280x720.png`

修改后：

- 可用状态 1280×720：  
  `art_source/qa/art10-ui-clarity04/screenshots/tactic_cards_available_1280x720.png`
- 不可用状态 1280×720：  
  `art_source/qa/art10-ui-clarity04/screenshots/tactic_cards_disabled_1280x720.png`
- 1600×720 横屏：  
  `art_source/qa/art10-ui-clarity04/screenshots/tactic_cards_wechat_landscape_sim_1600x720.png`
- 844×390 手机横屏：  
  `art_source/qa/art10-ui-clarity04/screenshots/tactic_cards_phone_landscape_844x390.png`

## 11. TypeScript 与保护项

- TypeScript：通过。
- `GAME_VERSION`：仍为 `v1.2.0-dev`。
- 未修改：
  - `UNIT_DEFINITIONS`
  - `LEVEL_CONFIGS`
  - 道路、出生、队列、碰撞和战斗逻辑
  - 单位速度、生命、伤害和费用
  - AI 和胜负判定
  - 其他 HUD
  - 战术技能条件、消耗、持续时间、冷却和效果
- 未直接编辑项目 `build`、`library`、`temp` 自动生成目录。

## 12. 剩余人工检查

1. 在 Cocos Creator 编辑器中以 1280×720 预览一次，确认编辑器内观感与正式 Web 构建一致。
2. 在微信开发者工具中打开：
   `art_source/qa/art10-ui-clarity04/builds/wechatgame`
3. 确认工具内横屏、胶囊安全区和三张卡触控正常。
4. 在至少一台微信真机上确认 844×390 等效横屏下最小文字可直接阅读。
5. 真机快速连续点击不可用卡，确认无按压高亮和误施放。

除上述窗口级和真机级人工检查外，本轮源码、资源映射、自动回归、TypeScript、浏览器正式构建和微信正式参数构建均已完成。
