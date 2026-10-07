# 羊狼四线战 v1.2.0-dev-art08-visual-polish03 验收报告

## 1. 范围、版本与结论

- 项目：`D:\GameProjects\WolfSheepBattle`
- 游戏版本：`v1.2.0-dev`（未修改）
- 批次：`v1.2.0-dev-art08-visual-polish03`
- 本轮只修改新手引导列表、战斗 HUD 三列、正式框/占位框互斥和四路出兵门视觉中心；未修改角色、战术牌功能、道路风格、背景颜色或游戏数值。
- 未创建 Git 提交或标签。
- TypeScript、1280×720/宽屏预览、动态 HUD、四路全兵种、暂停/战术/公告和胜负面板回归通过。
- **最新源码的微信正式构建未完成**：当前已有 Cocos Creator 3.8.8 实例占用全局单实例锁，第二个官方 CLI 进程均以 `-1` 退出且未进入 Builder。为保护当前打开的工程，没有结束该实例，也没有覆盖现有 `build`。

最终源码哈希：

- `assets/scripts/GameController.ts`：`C7A947B861B64BFFB6A39EB8328EC5D11CFF951B6446420B180498B425A6389A`
- `assets/scripts/art/ArtPilotConfig.ts`：`90300280F2146D34D8C9BB0490A5071B832E17B5F283524DAC60C36D6998E1CA`

## 2. 新手引导

旧的 `TutorialSteps` 整体居中多行 Label 已移除，替换为：

```text
GuideList (700×244, x=0, y=16)
├─ GuideStepRow01 (700×44)
│  ├─ NumberLabel (46×44)
│  └─ ContentLabel (654×44, LEFT, wrap)
├─ GuideStepRow02
├─ GuideStepRow03
├─ GuideStepRow04
└─ GuideStepRow05
```

- 行高 44，行距 6；五行中心 y = `116 / 66 / 16 / -34 / -84`。
- 序号列范围 x = `-350..-304`，正文统一从 x = `-304` 开始。
- 标题仍位于 `(0, 172)`；确认按钮仍位于 `(0, -168)`，位置和回调未改。
- 正式字体子集不含 `U+2460..U+2464`，因此 `NumberLabel` 明确保留平台系统字体；Windows 正式预览中 ①②③④⑤ 全部正常显示且形状不同。

修改前：

![修改前新手引导](../../art_source/qa/art08-03/before_tutorial_reference.png)

修改后：

![修改后新手引导](../../art_source/qa/art08-03/after_tutorial_1280x720.png)

## 3. HUD 共享三列

顶部 AI 与底部玩家现在只共享一套 `BATTLE_HUD_COLUMNS`，由 `applyBattleHudColumnLayout()` 同时应用。根节点 `scale=(1,1,1)`，正式图片尺寸由 `UITransform` 控制；两排只有 y 不同：AI `308`，玩家 `-284`。

| 列 | centerX | 宽 | 高 | 左边界 | 右边界 | AI/玩家差值 |
|---|---:|---:|---:|---:|---:|---:|
| SUPPLY | -389 | 170 | 44 | -474 | -304 | 全部 0 |
| BASE | -90 | 400 | 48 | -290 | 110 | 全部 0 |
| ENERGY | 274 | 300 | 44 | 124 | 424 | 全部 0 |

程序输出见 `art_source/qa/art08-03/preview_audit.json`。正式资源完成后，六个根节点的 `placeholderGraphicsEnabled` 均为 `false`。

动态回归把 AI/玩家基地设为 65%/40%，AI/玩家能量设为 75%/50%，补给设为 2/3；实际 Fill `scaleX` 分别为 `0.65 / 0.40 / 0.75 / 0.50`，文字同步更新，六个占位 Graphics 仍全部关闭。证据：

- `art_source/qa/art08-03/dynamic_hud_validation.json`
- `art_source/qa/art08-03/dynamic_hud_values.png`

## 4. 正式 Sprite 与旧 Graphics 互斥

### 已关闭的完整占位外框

- `AISupplyBadge`、`AIBaseBar`、`AIEnergyBar`
- `PlayerSupplyBadge`、`PlayerBaseBar`、`PlayerEnergyBar`
- `TypeButtonsmall/medium/large/giant` 根 Graphics
- 四张兵种卡的旧 `TierBadge` Graphics
- `PauseButton` 根 Graphics
- `TacticSidebarHeader`
- `PlayerSprintCard/PlayerHealCard/PlayerShockCard` 根 Graphics
- `StatusToast`、`TacticNotice`

四张兵种卡另修复了重复 Sprite：通用 `ButtonArt` 不再加到已有专用 `UnitCard*Art` 的卡牌上；徽章改用 `TierBadgeArt`。最终运行时每张卡只有一个专用完整卡框，选中卡仅额外显示动态 `UnitCardSelection` 描边。

### 保留的动态/交互节点

- 基地：`BaseFillArt`（左锚点，按血量缩放）、`BaseFrameArt`、`TextShadow`、`Text`。
- 能量：正式 `FrameArt`、`EnergyIconArt`；动态 `Fill` Graphics 只画内部 250×24 圆角轨道，不画外框。
- 补给：正式 `FrameArt`、`SupplyIconArt`、动态文字。
- 兵种卡：`UnitCardSelection`（仅选中时激活）、`TierLabel`、`UnitCardState` 和原触摸根节点。
- 战术牌：正式 `CardArt`；原 Icon Graphics 在 full 模式关闭，`PressOverlay` 只在按下时短暂激活，触摸回调保留。
- 公告、暂停和胜负面板的 Label、点击区域、Tween 与流程保留。

基地填充使用 `BaseHealthFillMask` 的 alpha 形状并位于正式边框下层；能量 Fill 位于正式边框下层的内部安全区。1280×720 动态截图未见填充越框、黑框露边或文字/填充分属不同框。

完整运行时节点审计见 `preview_audit.json` 的 `runtimeVisualAudit`。

## 5. 出兵门 alpha 包围盒与锚点

两张 512×128 门图均按四个 128×128 状态计算 alpha 包围盒（坐标为左闭右开）：

| 门 | 状态 | alpha bbox | bbox centerX | 相对单元中心 63.5 |
|---|---:|---|---:|---:|
| AI | 0 | `[3,1,124,126]` | 63.0 | -0.5 px |
| AI | 1 | `[4,2,124,125]` | 63.5 | 0 px |
| AI | 2 | `[3,1,124,126]` | 63.0 | -0.5 px |
| AI | 3 | `[3,1,124,126]` | 63.0 | -0.5 px |
| 玩家 | 0 | `[6,1,122,126]` | 63.5 | 0 px |
| 玩家 | 1 | `[6,2,122,124]` | 63.5 | 0 px |
| 玩家 | 2 | `[6,1,122,126]` | 63.5 | 0 px |
| 玩家 | 3 | `[6,1,122,126]` | 63.5 | 0 px |

- AI 四帧平均主体中心偏左 0.375 纹理像素；72 设计像素显示尺寸下，统一 `GateVisual.localX = +0.2109375`。
- 玩家四帧 `GateVisual.localX = 0`。
- 四个 AI 门和四个玩家门均使用 72×72、`anchor=(0.5,0)`、`scale=(1,1,1)`。
- AI `GateRoot.y=198`；玩家 `GateRoot` 相对点击区 y=-36，世界 y=-252。所有门同阵营 y 一致，没有首尾道路特例。

## 6. 四路中心数据

没有修改 `LANE_X`。每路建立 `LaneCenterAnchor01..04`；开发中心线子节点存在，但最终 `DEBUG_LANE_CENTER_LINES=false`，运行时审计四条线均为 inactive。

| 路 | LANE_X / Anchor | AI GateRoot | 玩家 GateRoot/点击区 | AI出生X | 玩家出生X | 补给点 | 道路序号 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | -495 | -495 | -495 | -495 | -495 | -495 | -495 |
| 2 | -225 | -225 | -225 | -225 | -225 | -225 | -225 |
| 3 | 45 | 45 | 45 | 45 | 45 | 45 | 45 |
| 4 | 315 | 315 | 315 | 315 | 315 | 315 | 315 |

对应 1280 纹理像素为 `145 / 415 / 685 / 955`。`battlefield_ground_topdown_v02` 的生成脚本本来就把四条道路几何中心重映射到这四个目标，因此未修改背景资产。

四路全兵种实测共 16 个覆盖项全部通过：每路均生成小/中/大/巨羊，运行时 `UnitRoot.x` 始终精确等于该路 `LANE_X`，所有 `UnitRoot.scale=(1,1,1)`；小羊四路同时存活时没有偏移、卡路或越界。详细数据：`art_source/qa/art08-03/gameplay_validation.json`。

![四路同时出兵](../../art_source/qa/art08-03/after_four_lane_spawn_1280x720.png)

## 7. 画面对比与回归

修改前战斗：

![修改前战斗](../../art_source/qa/art08-03/before_battle_reference.png)

修改后战斗：

![修改后战斗](../../art_source/qa/art08-03/after_battle_1280x720.png)

其他截图：

- 宽屏：`art_source/qa/art08-03/after_battle_wide_1800x720.png`
- 暂停：`art_source/qa/art08-03/after_pause_1280x720.png`
- 动态 HUD：`art_source/qa/art08-03/dynamic_hud_values.png`
- 胜利：`art_source/qa/art08-03/result_victory.png`
- 失败：`art_source/qa/art08-03/result_defeat.png`

回归结果：

- 1280×720 Canvas 与 1800×720 宽屏：通过。
- 新手引导五行、两列左边缘：通过。
- 六个 HUD 三列、尺寸、边界和根 scale：通过。
- full 模式完整占位外框：最终全部关闭。
- 基地、能量、补给动态变化：通过。
- 四路小/中/大/巨单位：16/16 通过。
- 暂停/继续、战术补给不足提示、公告条：通过。
- 胜利/失败结果面板及标题：通过；见 `result_flow_validation.json`。
- `preview_audit.json`、`gameplay_validation.json`、`dynamic_hud_validation.json`、`result_flow_validation.json` 合计控制台 warning/error/pageerror、请求失败、404：均为 0。
- Bundle 警告：0。

## 8. 修改文件

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`
- `tools/qa/capture_art08_03_preview.mjs`
- `tools/qa/validate_art08_03_gameplay.mjs`
- `tools/qa/validate_art08_03_dynamic_hud.mjs`
- `tools/qa/validate_art08_03_result_flow.mjs`
- `tools/qa/art08_03_web_build_config.json`
- `tools/qa/art08_03_wechat_build_config.json`
- `art_source/qa/art08-03/*`（截图与 JSON 证据）
- 本报告。

未修改 `UNIT_DEFINITIONS`、`LEVEL_CONFIGS`、`definition.radius`、单位速度/血量/伤害/费用、AI、能量/补给规则、战术功能、道路容量、排队/战斗/胜负逻辑、`UnitRoot` 逻辑坐标/缩放或 Bundle 结构。未手工编辑 `build`、`library`、`temp`。

## 9. TypeScript、微信构建与包体

### TypeScript

- Cocos Creator 3.8.8 随附 TypeScript；对 7 个 `assets/scripts/**/*.ts` 执行 `noEmit + skipLibCheck + ES2015` 定向检查。
- 结果：通过，退出码 0。
- 四个 QA `.mjs` 的 `node --check`：通过。
- 两个构建配置 JSON：解析通过。
- `git diff --check`（本轮源码）：通过。

### 微信正式构建

- 为避免覆盖现有 `build/wechatgame`，配置了新的 QA 输出目标，并另在系统临时目录复制 329 个必要项目文件进行隔离构建；复制当时 `GameController.ts` 两端 SHA-256 一致。
- 原项目、新输出目标、隔离工程和隔离用户配置目录的 Cocos Creator CLI 均被当前已打开的 Creator 全局单实例锁拦截，进程退出码 `-1`，未产生构建文件。
- 现有 `build` 最新文件时间仍为 `2026-07-28 20:27:44`，证明本轮没有覆盖旧构建。
- 因此不能声明“最新源码微信正式构建成功”，也不能把旧包体数字冒充最新结果。

现有上一轮微信正式构建基线（只读复核）：

| 项目 | bytes | MiB | 限制 | 基线结果 |
|---|---:|---:|---:|---|
| 主包 | 3,370,159 | 3.214 | 4 MiB | 通过 |
| 全部本地包 | 18,899,000 | 18.023 | 30 MiB | 通过 |

本轮没有新增运行时图片、音频或 Bundle，仅增加/调整 TypeScript；但最新精确包体仍必须以解除 Creator 占用后的正式构建为准。

## 10. 尚未处理/待解除的限制

1. 关闭当前 Cocos Creator 工程实例后，重新运行 `tools/qa/art08_03_wechat_build_config.json` 的正式微信构建，并记录最新主包/全部本地包精确值。
2. 正式构建后在微信真机复核系统字体对 ①②③④⑤ 的显示、顶部安全区、右上胶囊和四路触控。
3. 除上述构建/真机复核外，本轮指定的四项视觉问题没有遗留代码项；未继续修改其他画面。
