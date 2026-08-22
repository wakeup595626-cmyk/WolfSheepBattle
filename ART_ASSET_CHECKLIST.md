# 《羊狼四线战》美术资源接入审计与制作清单

> 审计日期：2026-07-27  
> 源码真实版本：`v1.2.0-dev`  
> 审计基线提交：`f9e29dd`  
> 设计分辨率：`1280 × 720` 横屏  
> 本文只规划美术资源与接入边界，不修改玩法、数值、碰撞、队列、出生点或 `build` 生成目录。

## 1. 审计结论

- 当前正式图片、矢量、字体、Prefab 和 AnimationClip 美术资源数量：**0**。
- 当前可复用的运行时代码占位视觉系统：**59 类**。四条道路、多个单位等运行时实例不重复计数。
- 当前完全缺失、尚无占位图的品牌/加载资源：**4 类**（Logo、启动图、加载角色动画、加载进度条）。
- 建议制作并纳入版本管理的正式美术资源槽位：**60 项**，详见第 5 节。
- 现有音频资源不属于本次美术审计范围，保持原样。

“59 类占位视觉系统”按用途统计如下：

| 类别 | 数量 | 当前实现 |
|---|---:|---|
| 四档羊与四档狼 | 8 | `VisualNode` 上的 `Graphics` 绘制 |
| 战场、道路、基地、出兵与补给 | 10 | `Graphics`、`Label` 运行时生成 |
| HUD、卡牌、弹窗与控制组件 | 29 | `Graphics`、`Label`、通用按钮组合 |
| 战斗反馈、结果徽标与过渡 | 12 | 线条、色块、透明度、缩放和 Tween |
| **合计** | **59** | 项目中没有对应的正式图像文件 |

## 2. 当前占位视觉盘点

主场景 `assets/scenes/Battle.scene` 只提供 Canvas、Camera 和控制脚本入口。主要视觉由
`assets/scripts/GameController.ts` 创建，当前没有可直接替换的美术 Prefab。

### 2.1 节点层级与当前生成位置

```text
Canvas
└─ GameLayer
   ├─ BattleLayer
   │  ├─ Board / 四条道路 / 道路编号
   │  ├─ SupplyPoint0..3
   │  ├─ AIBaseBar / PlayerBaseBar
   │  ├─ UnitRoot*
   │  │  ├─ VisualNode
   │  │  ├─ HitFlashNode
   │  │  └─ HealthUI
   │  │     ├─ TierBadge / TierLabel
   │  │     ├─ HealthBackground
   │  │     └─ HealthFill
   │  └─ HitSpark / ShockWave / 其他短时特效
   ├─ HudLayer
   │  ├─ 资源、能量、基地文字
   │  ├─ 四张单位卡与四个出兵入口
   │  ├─ 三张战术牌
   │  ├─ 关卡标识、状态提示、暂停按钮
   │  └─ 音量与 BGM 控件
   └─ ModalLayer
      ├─ 标题、选关、新手引导
      ├─ 暂停、玩法说明
      └─ 胜负结算
```

### 2.2 代码占位系统明细

| 占位内容 | 当前节点/函数 | 当前表现 | 正式接入方向 |
|---|---|---|---|
| 全屏战场底色与主战场框 | `Board` / `drawBoard()` | 深蓝色块、圆角框 | 2D 战场背景图，保留道路逻辑坐标 |
| 四条道路 | `Board` / `drawBoard()` | 相同的半透明矩形和中线 | 四张轻微差异的道路叠图 |
| 道路编号 | `LaneNumber*` / `createLaneNumberBadges()` | 淡色文字 | 保持动态文字或纳入道路装饰，不做可点击图标 |
| 双方基地 | `AIBaseBar`、`PlayerBaseBar` / `drawBase()` | 只有基地血槽，没有建筑 | 独立基地插画；血条仍留在 HUD |
| 四个补给点 | `SupplyPoint*` / `drawSupplyPoint()` | 圆点、旗帜、进度条 | 中立/玩家/AI/争夺四状态图集 |
| 出兵入口 | `SpawnMarker*` / `drawLaneSpawnMarker()` | 蓝/灰圆角按钮和白箭头 | 三至四状态 UI 图集，触摸区域不变 |
| 基地/战斗伤害文字 | `BattleFeedback` | 代码框与浮动文字 | 保留动态文字，替换九宫格底框 |
| 玩家/AI 补给信息 | `createResourceBadge()` | 图形边框与 Emoji | 正式补给图标和九宫格信息卡 |
| 玩家/AI 能量条 | `createEnergyBar()` | 代码绘制闪电、槽和填充 | 正式边框/图标；填充宽度仍由代码驱动 |
| 单位血条与等级徽章 | `HealthUI` / `updateUnitHealthVisual()` | 深色槽、阵营色填充、中文徽章 | 正式九宫格/遮罩；节点继续独立 |
| 四张单位卡 | `TypeButton*` / `createUnitTypeButtons()` | 通用按钮、文字、等级色块 | 四张独立卡面，名称/费用仍动态显示 |
| 三张战术牌 | `Player*Card` / `createTacticCard()` | 通用卡框与代码图标 | 三张独立卡面和图标 |
| 战术图标 | `drawTacticIcon()` | 闪电箭头、十字、波纹 | 正式透明图标 |
| 战术标题/状态公告 | `TacticSidebarHeader`、`TacticNotice` | 代码边框和 Label | 九宫格标题/公告框，文字动态 |
| 状态浮条 | `StatusToast` | 代码圆角框 | 九宫格提示框 |
| 暂停与玩法说明 | `PausePanel`、`HelpPanel` / `drawModalBackground()` | 通用暗色弹窗 | 共用正式弹窗九宫格和按钮 |
| 关卡选择与教学 | `LevelSelectPanel`、`TutorialPanel` | 通用暗色弹窗和文字 | 共用弹窗框，后续可追加章节插画 |
| 当前关卡徽章 | `LevelBadge` | 代码圆角底框 | 小型九宫格信息牌 |
| 音量控制 | `createVolumeControl()` | 代码槽、填充、滑块和按钮 | 正式控件图集，数值仍动态 |
| BGM 选择 | BGM 选择按钮 | 通用按钮 | 正式选中/未选中状态 |
| 标题页 | `StartPanel` / `createStartPanel()` | 纯文字标题和通用弹窗 | Logo、启动背景、正式按钮框 |
| 结果遮罩/面板 | `ResultBackdrop`、`ResultCard` | 色块和通用弹窗 | 正式遮罩、面板九宫格 |
| 胜利/失败徽标 | `ResultBadge` / `drawResultBadge()` | 代码奖杯/破损盾牌 | 两张原创透明徽标 |
| 结算过渡 | `playResultTransition()` | UI 淡入、缩放 | 保留 Tween，叠加正式轻量结果特效 |
| 羊/狼八种外形 | `VisualNode` / `drawUnitVisual()` | `Graphics` 轮廓与饰品 | 八套角色 SpriteFrame 动画 |
| 行走 | `updateUnitVisuals()` | `VisualNode` 约 1–2 px 浮动 | SpriteFrame 步行动画；浮动可保留 |
| 攻击/受击 | `updateUnitVisuals()`、`HitFlashNode` | 轻微前冲、缩放、白闪 | 动画帧 + 材质闪白；不得动 UnitRoot |
| 命中 | `HitSpark` | 两条交叉短线 | 短帧命中特效 |
| 死亡 | `updateUnitVisuals()` | 淡出和缩小 | 死亡帧 + 原淡出，逻辑死亡不延迟 |
| 基地受击 | `drawBase()`、浮动伤害 | 填充闪色和文字 | 基地闪光/裂纹特效，血量逻辑不变 |
| 领地震荡 | `ShockWave` | 大矩形波纹与 BattleLayer 轻震 | 独立波纹帧；屏幕震动只作用视觉容器 |
| 出兵、突破、关卡过渡 | 无完整正式占位 | 瞬时出现、基地闪光或直接切面板 | 新增短时透明 VFX，不修改出生和终点 |
| Logo、启动图、加载界面 | 当前缺失 | 标题纯文字，无专用加载美术 | 新增品牌与加载资源 |

## 3. 美术接入的强制逻辑边界

### 3.1 单位必须保持视觉与逻辑分离

当前结构已经具备安全接入条件，正式美术不得破坏：

```text
UnitRoot（逻辑节点）
├─ VisualNode（角色 Sprite / Animation，仅视觉）
├─ HitFlashNode（可改为材质闪白或短时 Sprite）
└─ HealthUI（血条和等级徽章）
```

- `UnitRoot.position` 是道路队列、碰撞、基地突破和边界校验使用的真实坐标。
- `definition.radius` 是碰撞和排队间距依据，**美术接入不得修改**。
- `UnitRoot.scale` 保持 `(1, 1, 1)`，不用于体型美术差异。
- 行走、攻击前冲、受击后仰和死亡缩放只能改变 `VisualNode` 或特效子节点。
- Sprite 动画不得写入 `UnitRoot.position`、`UnitRoot.scale` 或道路方向。
- `HealthUI`、`TierBadge` 不得烘焙进角色图片，仍由代码根据真实血量和单位类型更新。
- 删除单位时，角色 Sprite、血条、徽章和特效必须随 `UnitRoot` 一起清理。

### 3.2 角色透明画布与实际轮廓

角色帧可以使用较大的透明画布，但实际不透明身体轮廓应遵循当前设计像素包络：

| 档位 | 当前视觉比例 | 建议不透明主体最大直径 | 逻辑碰撞仍使用 |
|---|---:|---:|---|
| 小 | 1.00 | 约 44 px | `definition.radius` |
| 中 | 1.15 | 约 51 px | `definition.radius` |
| 大 | 1.30 | 约 58 px | `definition.radius` |
| 巨 | 1.48 | 约 66 px | `definition.radius` |

装饰可少量超出主体包络，但不能让巨型单位看起来跨出道路。导入时禁用会改变不同帧锚点的激进自动裁边，所有帧使用一致透明边距。

### 3.3 UI 与战场的边界

- 道路图片只能贴合现有 `LANE_X`、`LANE_WIDTH`、`LANE_TOP_Y`、`LANE_BOTTOM_Y`，不能反向推动逻辑常量适配图片。
- 出兵按钮图片只替换显示，既有 `UITransform` 触摸尺寸和固定出生点保持不变。
- 基地插画与基地血槽分离；基地插画受击动画不得移动基地血槽或道路。
- HUD 框、弹窗和按钮优先采用九宫格，适配不同横屏比例时不得拉伸图标和文字。
- 全屏过渡只放在 `ModalLayer`；战术和战斗特效放在 `BattleLayer`，不能覆盖暂停/结算按钮。

## 4. 推荐目录结构

```text
assets/
└─ art/
   ├─ branding/
   │  ├─ logo/
   │  ├─ splash/
   │  └─ loading/
   ├─ backgrounds/
   │  └─ battlefield/
   ├─ characters/
   │  ├─ sheep/
   │  │  ├─ small/
   │  │  ├─ medium/
   │  │  ├─ large/
   │  │  └─ giant/
   │  └─ wolf/
   │     ├─ small/
   │     ├─ medium/
   │     ├─ large/
   │     └─ giant/
   ├─ bases/
   ├─ battlefield/
   │  ├─ roads/
   │  └─ spawn/
   ├─ ui/
   │  ├─ common/
   │  ├─ hud/
   │  ├─ unit-cards/
   │  ├─ tactic-cards/
   │  ├─ modals/
   │  └─ fonts/
   └─ vfx/
      ├─ deploy/
      ├─ movement/
      ├─ combat/
      ├─ tactics/
      ├─ breakthrough/
      └─ results/
```

约定：

- 文件名全部使用小写英文和下划线。
- 源文件建议在项目外另存 PSD/Krita/Aseprite；项目内只放导出的 PNG/WebP、字体和 Cocos 生成的 `.meta`。
- 不手工创建或复制 UUID；由 Cocos Creator 导入资源。
- UI 中的名称、费用、血量、冷却和关卡数字继续用 Label 动态显示，不烘焙进图片。

## 5. 正式美术资源清单（60 项）

角色动画帧建议为：`idle 4`、`move 6`、`attack 5`、`hit 2`、`death 6`，共 23 帧。Sprite Sheet 统一为 8 列 × 4 行，多余格透明。

### A. 四档羊与四档狼（8 项）

| ID | 建议文件名 | 保存目录 | 建议像素尺寸 | 透明 | 锚点/朝向 | 动画帧 | 当前生成节点/脚本 |
|---|---|---|---:|---|---|---|---|
| A01 | `unit_sheep_small_sheet.png` | `assets/art/characters/sheep/small/` | 1024×512，单格128 | 是 | 单帧锚点(0.5,0.42)，面向道路上方 | 23 | `VisualNode` / `drawSheepUnit(small)` |
| A02 | `unit_sheep_medium_sheet.png` | `assets/art/characters/sheep/medium/` | 1024×512，单格128 | 是 | 同上，蓝色领巾保持在所有帧相同侧 | 23 | `VisualNode` / `drawSheepUnit(medium)` |
| A03 | `unit_sheep_large_sheet.png` | `assets/art/characters/sheep/large/` | 1280×640，单格160 | 是 | 同上，紫色护额/肩甲不得改变中心 | 23 | `VisualNode` / `drawSheepUnit(large)` |
| A04 | `unit_sheep_giant_sheet.png` | `assets/art/characters/sheep/giant/` | 1536×768，单格192 | 是 | 同上，金色首领饰件不得超出道路 | 23 | `VisualNode` / `drawSheepUnit(giant)` |
| A05 | `unit_wolf_small_sheet.png` | `assets/art/characters/wolf/small/` | 1024×512，单格128 | 是 | 单帧锚点(0.5,0.42)，面向道路下方 | 23 | `VisualNode` / `drawWolfUnit(small)` |
| A06 | `unit_wolf_medium_sheet.png` | `assets/art/characters/wolf/medium/` | 1024×512，单格128 | 是 | 同上，蓝色装饰保持一致 | 23 | `VisualNode` / `drawWolfUnit(medium)` |
| A07 | `unit_wolf_large_sheet.png` | `assets/art/characters/wolf/large/` | 1280×640，单格160 | 是 | 同上，紫色厚眉/护额保持中心 | 23 | `VisualNode` / `drawWolfUnit(large)` |
| A08 | `unit_wolf_giant_sheet.png` | `assets/art/characters/wolf/giant/` | 1536×768，单格192 | 是 | 同上，金色厚鬃毛不得跨路 | 23 | `VisualNode` / `drawWolfUnit(giant)` |

### B. 战场、道路、基地与出兵入口（8 项）

| ID | 建议文件名 | 保存目录 | 建议像素尺寸 | 透明 | 锚点/朝向 | 动画帧 | 当前生成节点/脚本 |
|---|---|---|---:|---|---|---|---|
| B01 | `battlefield_background.png` | `assets/art/backgrounds/battlefield/` | 2560×1440 | 否 | 中心(0.5,0.5)，无方向 | 否 | `Board` / `drawBoard()` 的底色与主框 |
| B02 | `road_lane_01.png` | `assets/art/battlefield/roads/` | 360×1030 | 是 | 中心(0.5,0.5)，下→上 | 否 | 第1路 / `drawBoard()` |
| B03 | `road_lane_02.png` | `assets/art/battlefield/roads/` | 360×1030 | 是 | 同上 | 否 | 第2路 / `drawBoard()` |
| B04 | `road_lane_03.png` | `assets/art/battlefield/roads/` | 360×1030 | 是 | 同上 | 否 | 第3路 / `drawBoard()` |
| B05 | `road_lane_04.png` | `assets/art/battlefield/roads/` | 360×1030 | 是 | 同上 | 否 | 第4路 / `drawBoard()` |
| B06 | `base_player.png` | `assets/art/bases/` | 1024×384 | 是 | (0.5,0.15)，入口朝上 | idle 4，可选 hit 3 | 当前只有 `PlayerBaseBar` / `drawBase()` |
| B07 | `base_ai.png` | `assets/art/bases/` | 1024×384 | 是 | (0.5,0.85)，入口朝下 | idle 4，可选 hit 3 | 当前只有 `AIBaseBar` / `drawBase()` |
| B08 | `ui_spawn_marker_states.png` | `assets/art/battlefield/spawn/` | 1312×104，4格 | 是 | 每格中心；箭头保持正常比例朝上 | ready/selected/disabled/full 4帧 | `SpawnMarker*` / `drawLaneSpawnMarker()` |

### C. 四张玩家单位卡（4 项）

| ID | 建议文件名 | 保存目录 | 建议像素尺寸 | 透明 | 锚点/朝向 | 动画帧 | 当前生成节点/脚本 |
|---|---|---|---:|---|---|---|---|
| C01 | `card_unit_sheep_small.png` | `assets/art/ui/unit-cards/` | 520×80 | 是 | 中心；角色头像朝右上 | 否，状态由代码高亮 | `TypeButtonsmall` / `createUnitTypeButtons()` |
| C02 | `card_unit_sheep_medium.png` | 同上 | 520×80 | 是 | 同上 | 否 | `TypeButtonmedium` |
| C03 | `card_unit_sheep_large.png` | 同上 | 520×80 | 是 | 同上 | 否 | `TypeButtonlarge` |
| C04 | `card_unit_sheep_giant.png` | 同上 | 520×80 | 是 | 同上 | 否 | `TypeButtongiant` |

卡面不烘焙名称、费用、选中对勾和“能量不足”状态；这些仍由现有代码动态显示。

### D. 三张战术牌（3 项）

| ID | 建议文件名 | 保存目录 | 建议像素尺寸 | 透明 | 锚点/朝向 | 动画帧 | 当前生成节点/脚本 |
|---|---|---|---:|---|---|---|---|
| D01 | `card_tactic_sprint.png` | `assets/art/ui/tactic-cards/` | 400×172 | 是 | 中心；闪电/双箭头向上 | 否，按下用缩放反馈 | `PlayerSprintCard` / `drawTacticIcon(sprint)` |
| D02 | `card_tactic_heal.png` | 同上 | 400×172 | 是 | 中心；医疗十字保持正向 | 否 | `PlayerHealCard` / `drawTacticIcon(heal)` |
| D03 | `card_tactic_shock.png` | 同上 | 400×172 | 是 | 中心；波纹从中心向外 | 否 | `PlayerShockCard` / `drawTacticIcon(shock)` |

卡面不烘焙补给费用、冷却、未解锁和已使用文字。

### E. HUD、血条、补给、能量与暂停界面（16 项）

| ID | 建议文件名 | 保存目录 | 建议像素尺寸 | 透明 | 锚点/朝向 | 动画帧 | 当前生成节点/脚本 |
|---|---|---|---:|---|---|---|---|
| E01 | `icon_supply.png` | `assets/art/ui/hud/` | 128×128 | 是 | 中心，无方向 | 否 | `createResourceBadge()` 中的补给 Emoji/图形 |
| E02 | `icon_energy.png` | 同上 | 128×128 | 是 | 中心，闪电尖端朝下 | 否 | `createEnergyBar()` 中的代码闪电 |
| E03 | `frame_base_health_9slice.png` | 同上 | 800×96 | 是 | 中心，九宫格边距16 | 否 | `AIBaseBar`、`PlayerBaseBar` / `drawBase()` |
| E04 | `frame_unit_health_9slice.png` | 同上 | 256×32 | 是 | 左中，九宫格边距8 | 否 | `HealthBackground` |
| E05 | `mask_health_fill.png` | 同上 | 256×16 | 是 | 左中；从左向右裁切/缩放 | 否 | `HealthFill` 的代码矩形 |
| E06 | `tier_badges_small_to_giant.png` | 同上 | 256×64，4格 | 是 | 每格中心，无方向 | 小/中/大/巨 4帧 | `TierBadge` / `TierLabel` |
| E07 | `icon_pause.png` | `assets/art/ui/common/` | 128×128 | 是 | 中心，竖线不旋转 | 否 | `PauseButton` 的文字图标 |
| E08 | `frame_modal_9slice.png` | `assets/art/ui/modals/` | 192×192 | 是 | 中心，九宫格边距48 | 否 | `drawModalBackground()` |
| E09 | `frame_button_9slice.png` | `assets/art/ui/common/` | 192×96 | 是 | 中心，九宫格边距24 | normal/pressed/disabled 3帧或3图 | 通用 `createButton()` / `drawButton()` |
| E10 | `frame_tactic_header_9slice.png` | `assets/art/ui/tactic-cards/` | 400×68 | 是 | 中心 | 否 | `TacticSidebarHeader` |
| E11 | `frame_notice_9slice.png` | `assets/art/ui/hud/` | 192×96 | 是 | 中心，九宫格边距24 | 否 | `StatusToast`、`TacticNotice`、`BattleFeedback` |
| E12 | `ui_volume_control_atlas.png` | `assets/art/ui/common/` | 1024×128 | 是 | 滑轨左中；滑块中心 | 空槽/音乐填充/音效填充/滑块/静音 | `createVolumeControl()` |
| E13 | `ui_bgm_choice_states.png` | `assets/art/ui/common/` | 1000×88，2格 | 是 | 每格中心 | selected/unselected 2帧 | 暂停面板 BGM 选择按钮 |
| E14 | `frame_level_badge_9slice.png` | `assets/art/ui/hud/` | 180×100 | 是 | 中心，九宫格边距20 | 否 | `LevelBadge` |
| E15 | `supply_point_states.png` | `assets/art/ui/hud/` | 768×192，4格 | 是 | 每格底部中心；旗杆竖直 | neutral/player/ai/capturing 4帧 | `SupplyPoint*` / `drawSupplyPoint()` |
| E16 | `font_ui_cn_subset.ttf` | `assets/art/ui/fonts/` | 字体文件 | 不适用 | 不适用 | 否 | 当前所有 `Label` 使用系统默认字体 |

字体必须确认中文许可并做字符子集化；至少覆盖游戏内全部中文、数字、拉丁字母、罗马数字和常用标点。

### F. 出兵、移动、攻击、受击、死亡、突破与战术特效（12 项）

| ID | 建议文件名 | 保存目录 | 建议像素尺寸 | 透明 | 锚点/朝向 | 动画帧 | 当前生成节点/脚本 |
|---|---|---|---:|---|---|---|---|
| F01 | `vfx_deploy_sheep_sheet.png` | `assets/art/vfx/deploy/` | 768×128，6格 | 是 | (0.5,0.5)，从出生点向外 | 6 | 当前单位直接出现 / `spawnUnit()` |
| F02 | `vfx_deploy_wolf_sheet.png` | 同上 | 768×128，6格 | 是 | 同上 | 6 | 当前单位直接出现 / `spawnUnit()` |
| F03 | `vfx_move_dust_sheet.png` | `assets/art/vfx/movement/` | 512×128，4格 | 是 | (0.5,0.2)，位于脚下 | 4，可低频复用 | 当前只有 `VisualNode` 上下浮动 |
| F04 | `vfx_attack_sheep_sheet.png` | `assets/art/vfx/combat/` | 640×128，5格 | 是 | 中心，默认朝上 | 5 | 当前攻击轻微前冲 |
| F05 | `vfx_attack_wolf_sheet.png` | 同上 | 640×128，5格 | 是 | 中心，默认朝下 | 5 | 当前攻击轻微前冲 |
| F06 | `vfx_hit_impact_sheet.png` | 同上 | 384×96，4格 | 是 | 接触点中心，无方向 | 4，约0.08–0.12秒 | `HitSpark` 的交叉线 |
| F07 | `vfx_unit_death_sheet.png` | 同上 | 768×128，6格 | 是 | 单位中心向外 | 6 | 当前死亡淡出/缩小 |
| F08 | `vfx_breakthrough_sheet.png` | `assets/art/vfx/breakthrough/` | 768×192，6格 | 是 | 基地入口中心；按阵营方向翻转 | 6 | 当前基地伤害文字与闪光 |
| F09 | `vfx_base_hit_sheet.png` | 同上 | 1024×256，8格 | 是 | 基地视觉中心，无方向 | 8 | `drawBase()` 的短时填色闪光 |
| F10 | `vfx_tactic_sprint_sheet.png` | `assets/art/vfx/tactics/` | 1024×256，8格 | 是 | 单位/阵营中心向前 | 8 | 当前只有战术公告和速度表现 |
| F11 | `vfx_tactic_heal_sheet.png` | 同上 | 1024×256，8格 | 是 | 单位中心向上 | 8 | 当前只有血量变化和公告 |
| F12 | `vfx_tactic_shock_sheet.png` | 同上 | 1024×256，8格 | 是 | 战场中心向外扩散 | 8 | `ShockWave` + BattleLayer 轻震 |

所有 VFX 使用对象池或短生命周期节点；帧动画不能修改单位根节点、道路节点或 HUD 触摸区域。

### G. 胜利、失败与关卡过渡（5 项）

| ID | 建议文件名 | 保存目录 | 建议像素尺寸 | 透明 | 锚点/朝向 | 动画帧 | 当前生成节点/脚本 |
|---|---|---|---:|---|---|---|---|
| G01 | `result_badge_victory.png` | `assets/art/vfx/results/` | 512×512 | 是 | 中心，正向 | 否；节点缩放淡入 | `ResultBadge` / `drawResultBadge(true)` |
| G02 | `result_badge_defeat.png` | 同上 | 512×512 | 是 | 中心，正向 | 否；节点缩放淡入 | `ResultBadge` / `drawResultBadge(false)` |
| G03 | `result_victory_overlay.png` | 同上 | 1280×720 | 是 | 屏幕中心，无方向 | 可选8帧彩带/星光 | 当前仅结果面板 Tween |
| G04 | `result_defeat_overlay.png` | 同上 | 1280×720 | 是 | 屏幕中心，无方向 | 可选8帧低饱和烟尘 | 当前仅结果面板 Tween |
| G05 | `level_transition_wipe_sheet.png` | 同上 | 1024×256，8格 | 是 | 屏幕中心，左→右或中心扩散 | 8 | 当前关卡直接切换并重置界面 |

### H. 启动图、Logo 与加载界面（4 项）

| ID | 建议文件名 | 保存目录 | 建议像素尺寸 | 透明 | 锚点/朝向 | 动画帧 | 当前生成节点/脚本 |
|---|---|---|---:|---|---|---|---|
| H01 | `logo_yang_lang_four_lanes.png` | `assets/art/branding/logo/` | 1024×512 | 是 | 中心，横向构图 | 否 | 标题页当前是 `GAME_NAME` 纯文字 |
| H02 | `splash_landscape.png` | `assets/art/branding/splash/` | 2560×1440 | 否 | 中心，关键内容留在1280×720安全区 | 否 | 当前无专用启动图 |
| H03 | `loading_mascot_sheet.png` | `assets/art/branding/loading/` | 1024×256，8格 | 是 | 每格底部中心；羊向右跑 | 8 | 当前无专用加载角色 |
| H04 | `loading_progress_9slice.png` | 同上 | 1024×64 | 是 | 左中；从左向右填充 | 否 | 当前无专用加载进度条 |

## 6. 四档单位辨识规则

辨识必须同时依靠“物种轮廓、中文档位、体型、装饰形状和明度层级”，颜色只做辅助。

| 档位 | 羊的轮廓 | 狼的轮廓 | 固定装饰语言 | 等级辅助色 |
|---|---|---|---|---|
| 小 / Ⅰ | 紧凑圆身、小毛撮、短耳、无甲 | 窄脸、尖耳、轻薄脸颊毛 | 无护甲，动作轻快 | `#D9E2EC` |
| 中 / Ⅱ | 更饱满、两层羊毛 | 更宽脸、耳根与脸颊毛更明显 | 蓝色领巾/项圈，形状为单条带 | `#52A8FF` |
| 大 / Ⅲ | 宽肩、厚额毛、粗壮角部轮廓 | 厚眉、宽脸、较重肩毛 | 紫色护额/肩甲，形状为双侧块面 | `#A878FF` |
| 巨 / Ⅳ | 最宽、厚重羊毛、首领型头顶轮廓 | 最大头宽、厚鬃毛、首领轮廓 | 金色护额/王冠/大型肩饰，形成独特外轮廓 | `#F4C64E` |

阵营辨识规则：

- 玩家始终是羊形：圆润羊毛、短口鼻、向上推进、绿色生命填充。
- AI 始终是狼形：尖耳、长口鼻、脸颊毛、向下推进、红色生命填充。
- 血条颜色只表达阵营，不表达单位档位。
- 等级徽章保持“小、中、大、巨”中文字符；单位卡可同时显示 `Ⅰ、Ⅱ、Ⅲ、Ⅳ`。
- 低亮度、色弱或灰阶环境下，仍应通过外轮廓、装饰形状、中文徽章和尺寸识别。

## 7. 推荐制作与接入顺序

### 第一批：角色纵切验证（最高优先）

- [ ] A01 小羊完整动画
- [ ] A05 小狼完整动画
- [ ] E04/E05 单位血槽与填充遮罩
- [ ] E06 四档等级徽章图集
- [ ] F03 移动尘土
- [ ] F04/F05 攻击特效
- [ ] F06 命中特效
- [ ] F07 死亡特效

先只在一条测试道路接入小羊和小狼，验证：

1. `UnitRoot` 坐标完全未被动画修改；
2. 出生点、碰撞接触距离、队列间距不变；
3. 血条和徽章不随行走帧抖动；
4. 角色不透明轮廓没有超过安全包络；
5. 微信真机上的纹理清晰度、帧率和显存占用可接受。

### 第二批：补齐八种单位和单位卡

- [ ] A02–A04、A06–A08 六套角色
- [ ] C01–C04 四张单位卡
- [ ] 四档角色在同一路混合排队验证

### 第三批：战场、基地与核心 HUD

- [ ] B01–B08
- [ ] E01–E06、E14–E16
- [ ] 不同横屏比例、刘海和右上角胶囊安全区验证

### 第四批：战术、弹窗、结果与品牌

- [ ] D01–D03、E07–E13
- [ ] F08–F12、G01–G05
- [ ] H01–H04

## 8. 接入验收清单

### 角色和逻辑

- [ ] 没有任何 Animator/AnimationClip 绑定 `UnitRoot.position`。
- [ ] 没有修改 `definition.radius`、`queueOrder`、道路容量和出生点。
- [ ] 小中大巨的不透明主体包络通过同路排队截图检查。
- [ ] 所有帧锚点一致，关闭激进自动裁边或使用一致 Trim 数据。
- [ ] 后排、受击、震荡和死亡时角色 Sprite 不改变逻辑根节点。
- [ ] 血条、等级徽章和角色 Sprite 分层独立。

### UI 与适配

- [ ] 九宫格边距已在 Cocos SpriteFrame 中正确设置。
- [ ] 按钮图片没有改变现有 `UITransform` 触摸区域。
- [ ] 1280×720、常见长屏横屏和刘海屏安全区均无遮挡。
- [ ] 右侧战术栏、暂停按钮和微信胶囊保持安全距离。
- [ ] 全屏弹窗仍在 `ModalLayer`，单位和特效不能盖住弹窗。
- [ ] 中文字体许可、字符覆盖和真机显示均通过。

### 性能与包体

- [ ] 同类小图合并图集，角色大图按单位或阵营拆分，避免加载无关纹理。
- [ ] 透明纹理清理无效空白，但不破坏统一锚点。
- [ ] 对 2× 原图测试平台纹理压缩；不可因压缩产生明显透明边缘。
- [ ] VFX 使用对象池，不在高频命中时持续创建大量节点。
- [ ] 统计美术接入前后构建体积、纹理显存和真机峰值内存。
- [ ] 正式资源只从 `assets` 和必要源配置进入构建，不直接编辑 `build`。

## 9. 主要风险与规避方式

| 风险 | 可能后果 | 规避措施 |
|---|---|---|
| 动画写入 `UnitRoot` | 卡路、穿模、越界、出生偏移 | 动画只绑定 `VisualNode` 的 SpriteFrame/透明度/局部缩放 |
| 角色不透明轮廓远大于碰撞半径 | 看起来重叠但逻辑未接触 | 使用第3.2节主体包络；巨型单位先做一条路压力测试 |
| 每帧自动裁边导致锚点变化 | 行走抖动、攻击跳位 | 所有帧相同画布和锚点，导入后逐帧检查 |
| 基地/道路图片反推逻辑位置 | 突破点和队列边界回归 | 图片服从现有布局常量，不改道路、基地终点和出生点 |
| UI 图片包含固定文字/数值 | 本地化、数值更新和状态显示失效 | 卡面只做框与插画，文字和进度继续动态渲染 |
| 九宫格未配置或边框过宽 | 长屏拉伸、按钮变形 | 对弹窗、按钮、血槽单独配置 Border 并做多分辨率预览 |
| Emoji 和系统字体继续混用 | 微信真机图标/中文样式不一致 | 用 E01/E02 等正式图标；E16 使用许可明确的中文字体 |
| 大量 2× PNG 无图集/压缩 | 微信包体和显存显著增加 | 分组图集、平台压缩、按场景加载，逐批记录增量 |
| VFX 不限并发 | 多单位战斗卡顿和内存抖动 | 对象池、同帧合并命中表现、限制同时存在数量 |
| 全屏特效层级错误 | 遮住暂停和结算按钮 | 战斗 VFX 留在 `BattleLayer`；结果过渡进入 `ModalLayer` |

## 10. 本轮明确不做

- 不生成或选定最终角色、Logo、背景和 UI 图。
- 不下载来源不明的网络素材。
- 不修改单位数值、移动、攻击、AI、关卡、队列、碰撞或胜负逻辑。
- 不创建或修改 `build`、`library`、`temp` 中的文件。
- 不提交 Git 版本节点；待用户确认清单后再按批次制作和接入。
