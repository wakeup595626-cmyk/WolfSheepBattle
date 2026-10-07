# 羊狼四线战｜关卡选择专项精修报告

- 批次：`v1.2.0-dev-art10-ui-clarity06`
- 游戏版本：`v1.2.0-dev`（未修改）
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 执行日期：2026-07-29～2026-07-30
- Git：按要求未提交、未创建标签；工作区继续保留此前各批未提交成果。

## 1. 完成结论

本轮关卡选择弹窗专项精修已完成。

- 旧 900×500 深蓝科技感 Graphics 面板已替换为 780×520 的不透明奶油羊皮纸面板。
- 三个狭长按钮已替换为三张 650×82 的正式关卡卡片。
- 编号、标题、说明和状态使用独立节点，不再将状态拼接到说明末尾。
- `selected`、`unlocked`、`completed`、`locked` 四种视觉状态均已实现。
- 关卡进度继续读取原存档键，未修改存档字段、解锁条件或通关逻辑。
- 正式构建不创建测试重置按钮；开发者若显式打开开关，仍需二次确认。
- Web 正式构建、TypeScript 检查和微信小游戏正式参数构建均通过。

## 2. 原问题与原因

| 原问题 | 原因 |
|---|---|
| 深蓝面板与草地/奶油卡通 UI 不协调 | `createLevelSelectPanel()` 继续调用早期通用 `drawModalBackground()` |
| 三关文字上下拥挤 | 标题、说明、状态共用一个 640×56 Button Label |
| 状态层级混乱 | `当前选择/可挑战/未解锁` 被直接拼接在说明后 |
| 缺少正式编号、锁和通关标识 | 原实现只有文字和蓝灰填充色 |
| 进度区过于临时 | 只有单行 `已解锁：N/3关` |
| 测试重置易误触 | 正式界面始终创建按钮，点击直接清进度 |

## 3. 修改文件

### 源码与配置

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`
- `tools/qa/art10_ui_clarity06_web_build_config.json`
- `tools/qa/art10_ui_clarity06_wechat_build_config.json`
- `tools/qa/validate_art10_level_select_clarity06.mjs`
- `tools/art/generate_level_select_v06.py`
- `tools/art_pipeline/build_ui_font_subset_v03.py`

### 字体子集

- `art_source/ui/fonts/ui_font_cn_subset_v02.ttf`
- `art_source/ui/fonts/ui_font_cn_subset_v02_LICENSE.txt`
- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`

字体仍为 Noto Sans SC、静态 700 字重，只在稳定的 `runtime_v02` 资源路径上刷新字符子集。

- 请求/覆盖字符：477 / 477
- 缺失字形：0
- 文件大小：169,084 B
- SHA-256：`E647FDA0BDEDD5B4CF3AB9417B8014513FDAD856D4ED31DFB52BD8CCAC30F220`

### QA 产物

- `art_source/qa/art10-ui-clarity06/`
- `LEVEL_SELECT_POLISH_REPORT_v1.2.0-dev-art10-ui-clarity06.md`

## 4. 新增和替换的正式美术

源文件位于：

`art_source/ui/level_select/v06/`

运行时文件位于：

`assets/bundles/art_ui/ui/level_select/v06/`

新增 14 组一一对应资源：

1. `level_select_overlay_v06.png` → `level_select_overlay_runtime_v06.png`
2. `level_select_panel_v06.png` → `level_select_panel_runtime_v06.png`
3. `level_card_selected_v06.png` → `level_card_selected_runtime_v06.png`
4. `level_card_unlocked_v06.png` → `level_card_unlocked_runtime_v06.png`
5. `level_card_completed_v06.png` → `level_card_completed_runtime_v06.png`
6. `level_card_locked_v06.png` → `level_card_locked_runtime_v06.png`
7. `level_number_badge_v06.png` → `level_number_badge_runtime_v06.png`
8. `level_state_selected_v06.png` → `level_state_selected_runtime_v06.png`
9. `level_state_available_v06.png` → `level_state_available_runtime_v06.png`
10. `level_state_completed_v06.png` → `level_state_completed_runtime_v06.png`
11. `level_state_locked_v06.png` → `level_state_locked_runtime_v06.png`
12. `level_progress_panel_v06.png` → `level_progress_panel_runtime_v06.png`
13. `level_back_button_v06.png` → `level_back_button_runtime_v06.png`
14. `level_debug_reset_button_v06.png` → `level_debug_reset_button_runtime_v06.png`

所有 PNG 均为本地程序原创绘制，不含烘焙中文、数字、进度或说明文案。运行时由 Cocos Creator 自动导入并生成 `.meta`，未手写资源 UUID。

## 5. 最终尺寸和布局

设计分辨率：1280×720。

| 项目 | 最终值 |
|---|---:|
| 遮罩 | 覆盖完整可见区域，深绿色半透明 |
| 面板 | 780×520 |
| 卡片 | 650×82 |
| 卡片中心 Y | 96、4、-88 |
| 卡片间距 | 10 |
| 编号徽章 | 66×60 |
| 中间文字区 | 410×64 |
| 右侧状态区 | 112×54 |
| 进度区 | 650×46，Y=-164 |
| 返回按钮 | 238×48，Y=-225 |

面板随现有安全区逻辑放置在 `safeCenter`；全屏遮罩不跟随安全区偏移，避免刘海屏和宽屏出现漏边。

## 6. 节点结构

```text
LevelSelectOverlay
├─ DimBackground
│  └─ OverlaySprite
└─ LevelSelectPanel
   ├─ PanelBackgroundSprite
   ├─ TitleArea
   │  ├─ TitleLabel
   │  └─ SubtitleLabel
   ├─ LevelList
   │  ├─ LevelCard1
   │  ├─ LevelCard2
   │  └─ LevelCard3
   ├─ ProgressArea
   │  ├─ ProgressBackgroundSprite
   │  ├─ ProgressLabel
   │  ├─ ProgressStep1..3
   │  └─ ProgressHint
   └─ BottomButtons
      └─ LevelSelectBackButton
```

单张卡：

```text
LevelCardRoot
├─ CardBackgroundSprite
├─ NumberBadge
│  ├─ NumberBadgeSprite
│  └─ NumberLabel
├─ TextArea
│  ├─ LevelTitleLabel
│  └─ DescriptionLabel
├─ StateArea
│  ├─ StateIconSprite
│  └─ StateLabel
├─ CompletionBadge
└─ TouchArea
```

弹窗根节点挂载 `BlockInputEvents`，层级位于 ModalLayer 顶部，打开时会阻止下方 HUD、单位和战场点击。

## 7. 关卡文案

| 关卡 | 标题 | 说明 |
|---|---|---|
| 1 | 第1关 · 教学节奏 | AI主要使用小狼并缓慢出兵，帮助熟悉四线操作。 |
| 2 | 第2关 · 轻度练习 | AI使用小狼和中狼，提供更充足的练习时间。 |
| 3 | 第3关 · 标准节奏 | AI正常争夺补给，并使用完整兵种与战术。 |

所有文字均为 Cocos Label 动态显示，标题、说明、状态之间没有字符串拼接。

## 8. 状态映射

| 条件 | 卡片状态 | 卡面 | 状态图标/文字 |
|---|---|---|---|
| `id > highestUnlockedLevel` | locked | 灰紫 | 锁 / 未解锁 |
| `id === currentLevel` | selected | 金色 | 旗帜 / 当前选择 |
| `id < highestUnlockedLevel` | completed | 嫩绿 | 对勾 / 已通关 |
| 其余已解锁 | unlocked | 天蓝薄荷 | 播放箭头 / 可挑战 |

若某关既是当前选择、又可由现有存档确定为已通关，金色选中卡面优先，并在右上保留小型绿色通关对勾。

现有存档只记录“最高已解锁关卡”，因此无需改存档即可可靠推导所有低于最高已解锁关卡的完成状态。第 3 关是否已通关没有独立持久化字段；本轮遵守“不改存档结构”，未新增字段。

## 9. 进度读取

继续使用原键：

`wolf-sheep-battle.v1.highest-unlocked-level`

显示格式：

`关卡进度  N/3`

自动测试分别注入 1、2、3，实际显示 `1/3`、`2/3`、`3/3`。未修改 `loadLevelProgress()`、`saveLevelProgress()` 的键或数值边界。

## 10. 调试重置隐藏

源码开关：

`LEVEL_SELECT_DEBUG_RESET_ENABLED = false`

- 默认正式源码不创建 `DebugResetButton` 和 `DebugResetConfirmPanel` 节点。
- 返回按钮因此自动位于 X=0。
- 自动测试确认正式 Web 运行时两个调试节点均不存在。
- 若开发者本地显式将开关设为 `true`，点击重置按钮只打开二次确认；只有点击“确认重置”才调用原重置方法。
- `resetLocalProgress()` 自身也检查开关，正式状态不能被界面外误调用。

## 11. Graphics 回退与 Sprite

- 正式面板、四种卡面、编号徽章、进度区和返回按钮使用 `Sprite.Type.SLICED`。
- 状态图标使用 `Sprite.Type.SIMPLE`。
- 正式 Sprite 加载成功后关闭同节点 Graphics。
- 自动测试确认三张卡、面板和进度区均为“Sprite 已加载 / Graphics 已关闭”。
- 资源加载失败时才显示奶油卡通风 Graphics 回退，不再回退到旧深蓝科技面板。
- 正式运行时没有 Sprite 与旧 Graphics 双层方框。

## 12. 浏览器测试

Web 正式参数：

- Platform：Web Mobile
- Debug：关闭
- Source Maps：关闭
- Start Scene：`Battle.scene`

Cocos Creator 3.8.8 构建结果：通过，官方成功退出码 `36`。

自动回归：

- 断言：41
- 通过：41
- 失败：0
- 控制台 Error / PageError：0
- 请求失败：0
- 资源 404：0

覆盖：

- 1280×720
- 1600×720 微信横屏安全区模拟
- 844×390 手机横屏缩放模拟
- 1/3、2/3、3/3 真实进度
- selected、unlocked、completed、locked 四状态
- 锁定卡不修改当前关卡并提示“请先通关上一关”
- 已解锁卡保留原来的“选择后返回主菜单”流程
- 返回主菜单
- 既有存档键读取和 currentLevel 边界收敛
- 字体、单行、缺字、正式 Sprite、Graphics 关闭

运行时审计：

`art_source/qa/art10-ui-clarity06/screenshots/level_select_runtime_audit.json`

## 13. 微信构建与开发者工具

微信正式参数：

- Platform：WeChat Mini Game
- Start Scene：`Battle.scene`
- Debug：关闭
- Source Maps：关闭
- Orientation：`landscapeRight`
- 分包声明：6 个

Cocos Creator 3.8.8 微信构建：通过，官方成功退出码 `36`。

构建日志中出现一次 Creator 在脚本构建完成后终止闲置子进程的 debug 记录：

`Exit process with code:null, signal:SIGTERM in task build-script`

随后明确复用引擎缓存并完成整个微信构建，最终状态为 `Finished`，不属于构建失败。

微信开发者工具官方 CLI：

- `open --project ...`：本机 CLI 服务等待超时，未获得导入成功回执。
- `islogin`：同样等待超时。

因此本报告不声称已经取得微信开发者工具画布截图或真机结果。微信构建产物和配置已完成静态核验，工具界面与真机仍列为人工项。

## 14. 微信包体

| 包 | 字节 | MiB |
|---|---:|---:|
| 主包（排除 `subpackages/`） | 3,440,809 | 3.281 |
| art_boot | 979,387 | 0.934 |
| art_battlefield | 4,384,911 | 4.182 |
| art_ui | 2,874,935 | 2.742 |
| art_units | 3,077,206 | 2.935 |
| art_vfx | 2,118,338 | 2.020 |
| audio_bgm | 2,755,254 | 2.628 |
| 全部本地包 | 19,630,840 | 18.721 |

与 clarity05 相比：

- 主包：+12,666 B
- art_boot：+1,980 B
- art_ui：+27,425 B
- 全部本地包：+42,071 B

限制核对：

- 主包小于 4 MiB：满足。
- 全部本地包小于 30 MiB：满足。
- `.map` 文件：0。
- 6 个分包声明与实际目录一致。

## 15. 改前与改后截图

修改前参考：

`art_source/qa/art10-ui-clarity06/references/before_level_select_reference.png`

修改后：

- `art_source/qa/art10-ui-clarity06/screenshots/level_select_locked_1280x720.png`
- `art_source/qa/art10-ui-clarity06/screenshots/level_select_selected_unlocked_locked_1280x720.png`
- `art_source/qa/art10-ui-clarity06/screenshots/level_select_completed_selected_available_1280x720.png`
- `art_source/qa/art10-ui-clarity06/screenshots/level_select_wechat_landscape_sim_1600x720.png`
- `art_source/qa/art10-ui-clarity06/screenshots/level_select_mobile_landscape_sim_844x390.png`

构建产物：

- `art_source/qa/art10-ui-clarity06/builds/web-mobile/`
- `art_source/qa/art10-ui-clarity06/builds/wechatgame/`

日志：

- `art_source/qa/art10-ui-clarity06/logs/web-build.log`
- `art_source/qa/art10-ui-clarity06/logs/wechat-build.log`

## 16. 未修改内容

本轮未修改：

- `UNIT_DEFINITIONS`
- `LEVEL_CONFIGS` 中玩法、AI、能量和难度参数
- 解锁条件、胜负判定和通关推进
- 道路、出生、排队、碰撞、移动、攻击、死亡
- 音频、战术、暂停、HUD 和单位美术逻辑
- 存档键与存档结构
- 游戏版本号

## 17. 剩余问题与人工验收

1. 需要用户在微信开发者工具中打开本轮 `wechatgame` 产物，确认横屏画布、胶囊安全区和触摸操作。
2. 需要至少一台刘海屏/挖孔屏真机确认 780×520 面板在真实安全区内的视觉边距。
3. 需要真机点击锁定卡、三张已解锁卡和返回按钮，确认触感与设备缩放下的命中区域。
4. 现有存档结构无法持久化“第 3 关已通关”这一独立状态；若未来产品必须在重启后标记最终关已完成，需要另立存档兼容批次，不能在本轮擅自改变。

