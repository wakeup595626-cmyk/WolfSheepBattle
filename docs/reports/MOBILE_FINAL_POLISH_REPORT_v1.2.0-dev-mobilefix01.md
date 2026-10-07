# 《羊狼四线战》真机问题修订报告

- 项目：`D:\GameProjects\WolfSheepBattle`
- 主版本：`v1.2.0-dev`（未修改）
- 修订批次：`v1.2.0-dev-mobilefix01`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 日期：2026-07-30
- 结论：三项指定修订已完成；TypeScript、Web 运行时回归和 Cocos Creator 微信正式构建通过。新的实体真机截图与最终触摸验收仍需用户在设备上完成。

## 1. 实际修改文件

源码与配置：

- `D:\GameProjects\WolfSheepBattle\assets\scripts\GameController.ts`
- `D:\GameProjects\WolfSheepBattle\assets\scripts\art\ArtPilotConfig.ts`
- `D:\GameProjects\WolfSheepBattle\tools\qa\mobilefix01_web_build_config.json`
- `D:\GameProjects\WolfSheepBattle\tools\qa\mobilefix01_wechat_build_config.json`
- `D:\GameProjects\WolfSheepBattle\tools\qa\validate_mobilefix01.mjs`
- `D:\GameProjects\WolfSheepBattle\tools\qa\serve_static.mjs`

测试产物：

- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\screenshots\mobilefix01_runtime_audit.json`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\screenshots\title_buttons_1280x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\screenshots\battle_right_control_16x9_1280x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\screenshots\battle_right_control_18x9_1440x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\screenshots\battle_right_control_19_5x9_1560x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\screenshots\battle_right_control_20x9_1600x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\screenshots\stress_24_units_after_pause_and_sprints_1280x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\logs\web-build.log`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\mobilefix01\logs\wechat-build-standard.log`

标准微信构建目录 `D:\GameProjects\WolfSheepBattle\build\wechatgame` 由 Cocos Creator 3.8.8 重新生成；未手工编辑其中任何文件。

## 2. 暂停按钮与战术栏对齐

新增统一的 `RightControlBar` 运行时布局容器，暂停按钮、战术标题及三张战术牌均为该容器的直接子节点。

统一基准：

- 控制栏宽度：216 设计像素。
- 暂停按钮：216 × 54。
- 战术标题：216 × 36。
- 三张战术牌：各 216 × 124。
- 所有控件局部中心 X：0。
- 暂停按钮与战术标题边缘间距：15 设计像素。
- 控制栏中心 X：`safeRight - HUD_SAFE_MARGIN - FUNCTION_SIDEBAR_WIDTH / 2`，不使用真机绝对坐标。

1280 × 720 时：

- 控制栏中心 X：520。
- 左/右边界：412 / 628。
- 暂停按钮中心 Y：245。
- 战术标题中心 Y：185。
- 三卡中心 Y：97、-36、-169。

微信胶囊处理：

- `LandscapeScreenAdapter` 读取 `wx.getMenuButtonBoundingClientRect()`。
- 胶囊物理坐标转换为 Cocos 逻辑坐标。
- 暂停按钮顶部被限制在胶囊底部以下，目标安全间距为 14 物理像素。
- 浏览器或无微信 API 环境使用完整安全区与 HUD 边距回退。
- 1600 × 720 胶囊模拟的实际计算间距为 36 物理像素，满足 10～16 物理像素的最低要求。

四种横屏比例均确认暂停按钮、标题和三卡具有相同中心 X、宽度及左右边界：

| 比例 | 视口 | 控制栏中心 X | 左/右边界 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 16:9 | 1280 × 720 | 520 | 412 / 628 | 通过 |
| 18:9 | 1440 × 720 | 600 | 492 / 708 | 通过 |
| 19.5:9 | 1560 × 720 | 660 | 552 / 768 | 通过 |
| 20:9 | 1600 × 720 | 680 | 572 / 788 | 通过 |

暂停/恢复实测状态：暂停后 `isPaused=true`、暂停按钮隐藏、暂停面板显示；恢复后状态完整复原。

## 3. 全体单位移动速度

正式速度仍以 `UNIT_DEFINITIONS[type].speed` 为唯一单位基础数据，在唯一的 `getUnitMovementDistance()` 路径统一应用：

`definition.speed × GLOBAL_MOVE_SPEED_MULTIPLIER × sprintMultiplier × deltaTime`

新增：

`GLOBAL_MOVE_SPEED_MULTIPLIER = 0.8`

未修改 `UNIT_DEFINITIONS` 中的原始速度、任何 `definition.radius`、队列间距、道路坐标或 `deltaTime/timeScale`。

| 档位 | 原始基础速度 | 新正常速度（×0.80） | 冲刺速度（再×1.50） |
| --- | ---: | ---: | ---: |
| 小 | 20 | 16 | 24 |
| 中 | 17 | 13.6 | 20.4 |
| 大 | 14 | 11.2 | 16.8 |
| 巨 | 12 | 9.6 | 14.4 |

玩家与 AI 使用同一计算函数。后排跟进也继续调用该函数，没有额外追赶倍率。冲刺结束后小型单位实测从 24 精确恢复为 16；暂停/恢复及第二次冲刺均未出现倍率叠加。

## 4. 标题界面按钮

保留草地背景、正式 Logo、小羊、小狼与原有标题构图；中间可读面板调整为 720 × 500，以容纳新的触摸尺寸。

- 主按钮“挑战第 1 关”：320 × 68，中心 Y=-125，绿色层次、奶油金边、顶部高光、底部投影，独立旗帜图标。
- 次按钮“选择关卡”：300 × 58，中心 Y=-206，青蓝层次、同系列边框，独立地图图标。
- 两按钮中心 X 均为 0，边缘间距 18 设计像素。
- 文字继续由 Cocos `Label` 动态显示，没有写入背景图。
- 按下缩放为 0.97、透明度 224；0.15 秒 `quadOut` 恢复。
- 300 ms 触发去重；自动测试中的连续两次快速 `TOUCH_END` 只执行一次。
- 自动浏览器点击已确认：“选择关卡”打开关卡选择 Modal；“挑战第 1 关”进入当前关卡。
- 没有对贴图进行非等比压扁；按钮视觉由独立 Graphics 图层构成，旧通用扁平按钮贴图未叠加。

## 5. 24 单位压力回归

测试布置为四条道路各 6 个单位（每方 3 个），共 24 个单位，并覆盖两次冲刺、暂停、恢复、交战、死亡和补位。

结果：

- 初始 24 单位建立成功。
- 暂停 0.9 秒期间所有 UnitRoot 逻辑坐标完全不变。
- 玩家与 AI 基础速度均为 0.80 倍，冲刺均为新基础速度的 1.50 倍。
- 冲刺结束恢复准确，第二次冲刺没有叠加为更高倍率。
- 同阵营队列重叠违规：0。
- 道路越界：0。
- UnitRoot 缩放异常：0。
- 四路活性恢复触发次数：均为 0。
- 道路卡死、瞬移、穿模和永久速度异常：未发现。

测试没有修改项目内的单位数值；测试脚本仅在隔离的浏览器运行时构造压力场景。

## 6. TypeScript、浏览器与微信构建

- TypeScript：通过（Cocos Creator 3.8.8 内置 TypeScript，项目 QA tsconfig）。
- Web 正式参数构建：通过；Debug 关闭、Source Maps 关闭。
- Web 自动回归：56/56 通过。
- 浏览器控制台 Error/PageError：0。
- 资源请求失败：0。
- 资源 404：0。
- 微信小游戏标准构建：通过，输出 `D:\GameProjects\WolfSheepBattle\build\wechatgame`。
- 启动场景：`Battle.scene`（UUID `267677db-a17c-4dde-b71e-4d4929fd7689`）。
- AppID：`wxfbd176abc5b3911c`。
- 方向：`landscapeRight`。
- Debug：关闭。
- Source Maps：关闭，构建内 `.map` 文件数为 0。
- 微信云开发：未配置，`cloudfunctionRoot` 为空。
- 本地分包：6 个。
- 主包：4,007,734 B（3.822 MiB）。
- 全部本地包：20,197,765 B（19.262 MiB）。

Cocos 构建日志沿用历史构建中已有的 debug 级 `build-script` 子进程 `SIGTERM` 清理记录；其后所有资源阶段继续成功，并以 `build Task (wechatgame) Finished` 正常结束。该行不是游戏运行时异常，且与本轮源码无关。

## 7. 真机测试状态与剩余事项

本轮 Codex 环境无法操作用户的实体微信设备，因此不能把 1600 × 720 横屏模拟图冒充“真机截图”。当前已完成的是浏览器多比例运行和微信胶囊坐标模拟；以下项目仍需用户在微信开发者工具及至少一台实体手机确认：

1. 导入 `D:\GameProjects\WolfSheepBattle\build\wechatgame`，确认开发者工具无运行时 Error。
2. 真机横屏确认胶囊底部与暂停按钮顶部的安全间距。
3. 触摸“挑战第 1 关”“选择关卡”、暂停和恢复各 10 次，确认无漏触或重复触发。
4. 第一关实际体验正常行军速度及反应时间。
5. 真机完成一次四路 24 单位、两次冲刺和暂停恢复压力测试。
6. 截取新的实体真机画面，用于最终验收；本报告中的 20:9 图仅是明确标注的横屏模拟证据。

除上述实体设备验收外，未发现本轮三项范围内的剩余代码问题。未提交 Git、未创建标签、未上传微信平台。
