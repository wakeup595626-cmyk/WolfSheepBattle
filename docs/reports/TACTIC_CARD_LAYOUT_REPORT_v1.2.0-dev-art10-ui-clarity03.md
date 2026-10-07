# 羊狼四线战 v1.2.0-dev 战术卡双分区专项报告

- 开发批次：`v1.2.0-dev-art10-ui-clarity03`
- 游戏版本：`v1.2.0-dev`（未修改）
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 检查日期：2026-07-29
- 范围：仅右侧“战术”栏、三张战术卡的布局、状态显示、触摸反馈及对应 QA
- Git：未提交、未创建标签

## 1. 完成结论

本轮已完成三张战术卡的“单一完整外框 + 上方信息区 + 下方操作区”重排。卡片尺寸、内边距、状态数据源、Sprite 状态图标、不可用态拦截和 250 ms 防抖均已落地。

自动化运行验收为 **604 / 604 通过**；1280×720 与 1600×720 横屏安全区模拟中未发现文字越界、节点重叠、资源 404、请求失败或新增控制台 Error。

没有修改战术技能的条件、补给消耗、持续时间、冷却、数值、次数或实际施放逻辑，也没有修改道路、单位、AI、音频、存档和其他 HUD。

## 2. 最终布局

### 2.1 战术栏

| 项目 | 最终值 |
|---|---:|
| 战术栏宽度 | 216 |
| 标题栏尺寸 | 216 × 36 |
| 单张卡牌尺寸 | 216 × 120 |
| 卡牌间距 | 9 |
| 标题栏中心 Y | 232 |
| 三张卡中心 Y | 146、17、-112 |
| 1280×720 卡中心 X | 520 |
| 1600×720 卡中心 X | 683 |

三张卡一次完整显示，不使用滚动列表；标题栏与卡牌等宽。横向位置继续通过安全区与 `FUNCTION_SIDEBAR_WIDTH` 计算，不写死为某一张截图的屏幕像素。

### 2.2 单卡双分区

| 分区 | 尺寸 | 说明 |
|---|---:|---|
| 完整外框 | 216 × 120 | 继续复用现有正式 v01 卡框，九宫格显示 |
| InfoSection | 216 × 84 | 技能图标、标题、条件、效果 |
| ActionSection | 216 × 36 | 消耗、冷却/次数、状态按钮 |
| Divider | 202 × 2 | 位于卡内 Y=-24 |
| TouchArea | 216 × 120 | 与卡牌边界完全一致 |

节点结构：

```text
TacticCardRoot
├─ CardArt
├─ InfoSection
│  ├─ IconBackdrop
│  ├─ SkillIcon
│  ├─ TitleLabel
│  ├─ ConditionLabel
│  └─ EffectLabel
├─ Divider
├─ ActionSection
│  ├─ CostIcon
│  ├─ CostLabel
│  ├─ ExtraInfoIcon
│  ├─ ExtraInfoLabel
│  └─ StateButton
│     ├─ StateIcon
│     └─ StateLabel
├─ PressOverlay
└─ TouchArea
```

信息区最终参数：

- 技能图标视觉尺寸约 42×42，中心 `(-77, 17)`。
- 技能图标左边缘距卡牌左边缘 10 像素。
- 标题：148×20，17 px，左对齐。
- 条件：148×16，13 px，左对齐。
- 效果：196×30，12.5 px，行高 16；移到图标下方并占用完整安全宽度。
- “领地震荡”效果稳定为两行，不再被挤成第三行或裁切。

操作区最终参数：

- 消耗、冷却/次数和状态按钮均位于卡内。
- 正文最小字号 12.5 px，不使用 `SHRINK` 强制缩小。
- 状态文本允许最多两行，长状态如“生命低于50%解锁”保持完整。
- 状态文字右边缘已从越界 3 像素修正为处于卡牌安全矩形内。

## 3. 三张卡最终文案

| 战术 | 标题 | 条件 | 效果 | 消耗 | 辅助信息 |
|---|---|---|---|---|---|
| 冲刺 | 全体冲刺 | 场上有己方单位 | 移速+50% · 持续6秒 | 补给 2 | 冷却 10秒 |
| 急救 | 战地急救 | 场上有受伤单位 | 全体恢复40%生命 | 补给 3 | 冷却 8秒 |
| 震荡 | 领地震荡 | 基地生命低于50% | 仅作用于本方领地；小/中消灭，大/巨重伤并击退 | 零消耗 | 每局1次 |

界面统一使用“全体冲刺”，战术卡中没有残留“全线冲刺”。

## 4. 状态与显示

显示和点击均调用现有统一的 `getPlayerTacticAvailability()`，没有增加第二套可用性判断。

| 状态 | 显示文字 | Sprite 图标 | 状态条 |
|---|---|---|---|
| `available` | 点击使用 | ready | 绿色 |
| `paused` | 游戏已暂停 | clock | 蓝灰色 |
| `finished` | 战斗已结束 | blocked | 灰色 |
| `active` | 生效中 N秒 | ready | 绿色 |
| `cooldown` | 冷却中 N秒 | clock | 蓝灰色 |
| `insufficient-supply` | 补给不足 当前值/消耗 | supply | 柔和砖红色 |
| `no-friendly-unit` | 暂无己方单位 | blocked | 灰色 |
| `no-injured-unit` | 暂无受伤单位 | blocked | 灰色 |
| `locked` | 生命低于50%解锁 | lock | 紫灰色 |
| `no-enemy-in-territory` | 领地内暂无敌人 | blocked | 灰色 |
| `used` | 本局已使用 | once | 灰棕色 |
| `not-started` | 战斗尚未开始 | clock | 蓝灰色 |

状态图标全部为 Sprite；未使用 Emoji。正式资源加载失败时才启用轻量 Graphics 图标回退。

## 5. 交互保护

- `TouchArea` 精确覆盖 216×120 卡牌，不超出边界。
- 整张卡可接收触摸，但只有 `availability.enabled === true` 时才武装点击。
- 可用态按下反馈为 `scale 1.00 → 0.97`，松开/取消后恢复 1.00。
- 不可用态不缩放、不显示按压层、不播放成功音效、不扣补给、不进入冷却、不施放。
- 触摸开始不可用、松开时变为可用的跨状态手势不会释放技能。
- 暂停会立即清除已武装按压；暂停期间松开不会释放技能。
- 采用 250 ms 点击防抖；连续事件最终只执行一次，防抖窗口结束后可正常再次触发。
- HUD 状态签名包含三张卡各自的状态与文本，冷却、单位、受伤目标、领地敌人和暂停变化会同步刷新。

## 6. 资源处理

### 6.1 复用资源

- 继续使用现有三张正式技能图标，没有重复生成技能图标。
- 继续使用现有正式 v01 战术卡外框并采用 `Sprite.Type.SLICED`。
- 正式 Sprite 加载成功后关闭根节点 Graphics 卡框；仅加载失败时显示回退框。
- 未新增 v03 卡牌背景 PNG，避免重复包体。

### 6.2 新增状态图标

源文件：

- `art_source/ui/tactic_cards/status_icons/tactic_state_ready_v03.svg`
- `art_source/ui/tactic_cards/status_icons/tactic_state_clock_v03.svg`
- `art_source/ui/tactic_cards/status_icons/tactic_state_lock_v03.svg`
- `art_source/ui/tactic_cards/status_icons/tactic_state_blocked_v03.svg`
- `art_source/ui/tactic_cards/status_icons/tactic_state_once_v03.svg`
- 同目录对应 128 px PNG 预览

运行时文件：

- `assets/bundles/art_ui/ui/tactic_cards/status_icons/tactic_state_ready_runtime_v03.png`
- `assets/bundles/art_ui/ui/tactic_cards/status_icons/tactic_state_clock_runtime_v03.png`
- `assets/bundles/art_ui/ui/tactic_cards/status_icons/tactic_state_lock_runtime_v03.png`
- `assets/bundles/art_ui/ui/tactic_cards/status_icons/tactic_state_blocked_runtime_v03.png`
- `assets/bundles/art_ui/ui/tactic_cards/status_icons/tactic_state_once_runtime_v03.png`

五张运行时 PNG 合计约 5.25 KiB。图标为本项目脚本生成的原创透明图形；Cocos Creator 在导入时生成 `.meta`，未手写 UUID。

`ArtPilotConfig.ts` 使用明确的 `runtime_v03` 路径，没有经过会回落到 v01 的 `full()` 映射。

### 6.3 字体子集

新增文案需要的 `人`、`每`、`零` 已加入现有正式中文字体子集：

- 源：`art_source/ui/fonts/ui_font_cn_subset_v02.ttf`
- 运行时：`assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`
- 字符覆盖：467 / 467
- 运行时字体大小：167,104 B
- 相比上一版增加：32 B
- SHA-256：`87675FDE9548058716719F9069E0CCED0EDDD28DDC3E7E51AA07D704B53B6ED0`

没有更换字体家族或运行时资源 UUID。

## 7. 自动验收

测试脚本：

`tools/qa/validate_art10_tactic_cards_clarity03.mjs`

最终结果：

- 总检查数：604
- 通过：604
- 失败：0
- 战术卡布局警告：0
- 控制台 Error：0
- 请求失败：0
- 404：0
- 文字替换字符 `�`：0

覆盖场景：

- 0、1、2、3 补给下的动态不足文本。
- 冲刺：无己方单位、可用、生效中、冷却中。
- 急救：无受伤单位、可用、冷却中。
- 震荡：基地生命高于50%、低于50%但无领地敌人、低于50%且有敌人、已使用。
- 未开始、暂停、结束。
- 所有不可用态的按压、松开、音效、消耗和释放拦截。
- 防抖、取消、跨状态松开和暂停中断。
- 三个技能的实际调用、补给变化、冷却/持续时间、生命变化、震荡使用次数和对应音效。

实际施放结果：

- 全体冲刺：补给 2→0，进入 `active`，只触发 `tactic_sprint`。
- 战地急救：补给 3→0，受伤单位生命恢复，进入冷却，只触发 `tactic_heal`。
- 领地震荡：零消耗，本局标记已使用，目标按原逻辑处理，触发 `tactic_shock`。

## 8. 浏览器与横屏验证

Web 正式参数：

- Platform：`web-mobile`
- Debug：关闭
- Source Maps：关闭
- Start Scene：`Battle.scene`
- 构建完成：Cocos Creator 3.8.8，成功码 36

1280×720：

- 三张卡完整显示。
- 外框、InfoSection、ActionSection、Divider 和 TouchArea 尺寸一致。
- 图标、标题、条件、效果、消耗、辅助信息和状态互不重叠。
- 技能图标左安全边距为 10 像素。
- 领地震荡两行效果完整。
- 不遮挡第四条道路、底部单位卡或暂停按钮。

1600×720 横屏安全区模拟：

- 卡中心 X 自动移动到 683。
- 三张卡边界检查全部通过。
- 没有新增控制台 Error、404 或资源请求失败。

说明：1600×720 截图是浏览器中的微信横屏安全区模拟，不是真机截图。

## 9. 微信小游戏构建与开发者工具

微信正式参数构建：

- Platform：WeChat Mini Game
- Start Scene：`Battle.scene`
- Debug：关闭
- Source Maps：关闭（构建结果 `.map` 数量为 0）
- 横屏：`landscapeRight`
- 分包：6 个（`art_boot`、`art_battlefield`、`art_units`、`art_ui`、`art_vfx`、`audio_bgm`）
- Cocos Creator 3.8.8 构建成功，成功码 36
- `game.json` 与 `project.config.json` 生成完整
- 未直接编辑构建输出

本机检测到微信开发者工具 CLI。尝试用本地 `open` 命令导入该构建时，当前自动化会话在 60 秒内未返回有效窗口，进程随后结束，因此不能把本轮结果声称为已完成人工微信开发者工具画面验收。没有调用 `preview`、没有生成二维码、没有上传。

需用户在微信开发者工具中人工完成：

1. 导入 `art_source/qa/art10-ui-clarity03/builds/wechatgame`。
2. 横屏查看可用、不足、冷却、锁定、无目标、已使用和暂停状态。
3. 检查手机模拟器最小正文是否舒适可读。
4. 在真机验证整卡触摸、防抖和右侧安全区。

## 10. 包体变化

与 `art10-ui-clarity02` 微信构建对比：

| 项目 | 优化前 | 本轮 | 增量 |
|---|---:|---:|---:|
| 主包 | 3,411,796 B | 3,418,257 B | +6,461 B |
| `art_boot` | 977,375 B | 977,407 B | +32 B |
| `art_ui` | 3,062,787 B | 3,073,362 B | +10,575 B |
| 全部本地包 | 19,787,667 B | 19,804,735 B | +17,068 B |

当前：

- 主包：3.260 MiB，低于 4 MiB。
- 全部本地包：18.887 MiB，低于 30 MiB。
- 主要增量为战术卡实现代码、五张状态图标及其构建清单信息、字体新增 3 个字形。
- 没有新增重复卡牌背景资源。

## 11. 实际修改文件

源码与配置：

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`
- `tools/art_pipeline/build_ui_font_subset_v02.py`
- `tools/qa/generate_tactic_state_icons_v03.mjs`
- `tools/qa/validate_art10_tactic_cards_clarity03.mjs`
- `tools/qa/art10_ui_clarity03_web_build_config.json`
- `tools/qa/art10_ui_clarity03_wechat_build_config.json`

资源：

- `art_source/ui/tactic_cards/status_icons/*_v03.svg`
- `art_source/ui/tactic_cards/status_icons/*_v03.png`
- `assets/bundles/art_ui/ui/tactic_cards/status_icons/*_runtime_v03.png`
- 上述运行时资源由 Cocos 自动生成的 `.meta`
- `art_source/ui/fonts/ui_font_cn_subset_v02.ttf`
- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`

QA 证据与报告：

- `art_source/qa/art10-ui-clarity03/references/tactic_cards_before_reference_1280x720.png`
- `art_source/qa/art10-ui-clarity03/screenshots/tactic_cards_available_1280x720.png`
- `art_source/qa/art10-ui-clarity03/screenshots/tactic_cards_disabled_1280x720.png`
- `art_source/qa/art10-ui-clarity03/screenshots/tactic_cards_wechat_landscape_sim_1600x720.png`
- `art_source/qa/art10-ui-clarity03/screenshots/tactic_card_clarity03_runtime_audit.json`
- `TACTIC_CARD_LAYOUT_REPORT_v1.2.0-dev-art10-ui-clarity03.md`

## 12. 改前与改后截图

- 改前：`D:\GameProjects\WolfSheepBattle\art_source\qa\art10-ui-clarity03\references\tactic_cards_before_reference_1280x720.png`
- 改后可用态：`D:\GameProjects\WolfSheepBattle\art_source\qa\art10-ui-clarity03\screenshots\tactic_cards_available_1280x720.png`
- 改后禁用态：`D:\GameProjects\WolfSheepBattle\art_source\qa\art10-ui-clarity03\screenshots\tactic_cards_disabled_1280x720.png`
- 1600×720 横屏安全区模拟：`D:\GameProjects\WolfSheepBattle\art_source\qa\art10-ui-clarity03\screenshots\tactic_cards_wechat_landscape_sim_1600x720.png`

## 13. 剩余问题与下一步

- 自动化边界检查中不存在剩余文字溢出或节点重叠。
- 未发现本轮新增的运行时 Error、404 或资源请求失败。
- 尚缺微信开发者工具人工画面验收和微信真机横屏触摸验收。
- 代码、浏览器运行和微信正式构建层面没有阻止进入下一轮界面精修的 P0/P1 问题；建议用户先快速确认真机最小正文可读性，再继续其他界面精修。
