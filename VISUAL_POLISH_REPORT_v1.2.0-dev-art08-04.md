# 羊狼四线战 v1.2.0-dev-art08-visual-polish04 验收报告

## 1. 范围、版本与结论

- 项目：`D:\GameProjects\WolfSheepBattle`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 游戏版本：`v1.2.0-dev`（未修改）
- 批次：`v1.2.0-dev-art08-visual-polish04`
- 未创建 Git 提交或标签。
- 本轮只修改单位卡显示、补给站阵营显示、关卡徽章、出兵门审计信息和道路触控入口；未修改 `UNIT_DEFINITIONS`、`LEVEL_CONFIGS`、半径、速度、生命、伤害、费用、AI、能量/补给规则、战术、队列、战斗或胜负逻辑。

浏览器自动化回归最终为 **PASS**：单位卡、补给三态、八门中心、四路上中下点击、草地/UI 防穿透、拖动取消、暂停、单击去重和 3/3 满路全部通过；控制台 error/warning/pageerror、请求失败和 404 均为 0。

最新源码的微信正式构建未完成：当前已打开的 Cocos Creator 3.8.8 占用单实例，第二个构建进程 60 秒内没有进入 Builder、没有生成目标目录。已停止本轮启动的构建子进程，未结束用户编辑器，也未覆盖 `build`。因此不能把旧包体数字冒充最新构建结果。

## 2. 四张单位卡三区域

四张卡统一为 `260×40`，锚点、字号和基线一致：

| 区域 | 逻辑宽度 | centerX | 实际内容尺寸 | 用途 |
|---|---:|---:|---:|---|
| TierIconArea | 36 | -112 | 徽章 30×30 | 小/中/大/巨 |
| MainTextArea | 154 | -17 | Label 134×32 | 单位名与费用 |
| StatusArea | 70 | 95 | 状态框 66×28；Label 60×24 | 可用/已选择/能量不足/未解锁 |

- 主文字统一为 `小羊 · 12能量`、`中羊 · 24能量`、`大羊 · 42能量`、`巨羊 · 70能量`。
- 主文字 `fontSize=15`、`lineHeight=19`、`Overflow.SHRINK`、不换行、水平/垂直居中，颜色 `#563A25`。
- 状态文字 `fontSize=15`、`lineHeight=18`、单行居中；没有用空格凑位置。
- 四卡运行时审计的 MainText 中心均为 `(-17,0)`，StatusLabel 和 StatusBackground 中心均为 `(95,0)`。

## 3. 卡牌状态、颜色与优先级

状态优先级保持：

`locked > insufficient > selected > pressed > available`

| 状态 | 整卡/状态框 | 边框 | 文字 | 行为 |
|---|---|---|---|---|
| available | 状态框 `#BCE7C7` | `#4C915B` | `#265B34` | 显示“可用” |
| selected | 整卡 `#F6C84B`；状态框 `#F9DC6F` | `#B87916` | `#4C321E` | 显示“✓ 已选择”，整卡 scale 1.02 |
| insufficient | 状态框 `#D8D0C5` | `#A8917E` | `#6B4A3D` | 不显示黄色，不改变内部选择 |
| locked | 状态框 `#716962` | `#524C47` | `#EFE8DB` | 不响应选择 |
| pressed | 正常可用状态框；整卡按压 scale 0.98 | 可用色 | 可用色 | 松开恢复 |

- 同一时间最多一张卡显示黄色。
- 从能量不足恢复且内部仍选中时，卡牌从 1.04 平滑回落到 1.02，时长 0.16 秒，只在状态转换时触发。
- QA 将能量降为 0 后，四卡均进入 insufficient、黄色数为 0；点击小羊没有改变原有 `selectedSheepType=giant`。
- QA 临时注入未解锁状态后，大羊显示“未解锁”且无黄色。

选中效果：

![黄色选中卡](art_source/qa/art08-04/selected_medium_yellow.png)

## 4. 补给站三态

复用正式资源：

`assets/bundles/art_battlefield/battlefield/supply_points/supply_point_states_runtime_v01.png`

原表为 512×128、四个 128×128 帧。alpha 审计显示四帧主体中心都为 63.5，切换不会上下或左右跳动；但中立与其他帧的轮廓差异仅约 1.3%～1.8%，主要依赖颜色。

处理结果：

- 正式底图按实际 `owner` 映射：Neutral=0、SheepOwned=1、WolfOwned=2；不再用附近单位或“争夺帧”猜阵营。
- 争夺过程仍通过原动态文字显示百分比，owner 未改变前保持原阵营外观。
- 在同一个 64×64 `FactionSilhouette` 视觉子节点上增加形状层：
  - 羊：奶白羊毛团、成对卷角、青绿色轮廓；
  - 狼：双尖狼耳、暖红轮廓、浅金爪徽；
  - 中立：不显示阵营形状层。
- 三态的底图、形状层均固定在 `(0,0)`，底图尺寸均为 64×64；节点不重建，不参与占领、碰撞或队列。
- 内置图片生成服务在本轮返回上游 400，按技能规则没有擅自切换到需要密钥的 CLI。因此没有伪造 `v02` PNG 或 `.meta`；当前采用正式 v01 底图加本地代码形状层。后续若需要更高美术完成度，可再把该形状层烘焙为正式 v02 三帧表。

三态截图（第1/4路中立，第2路羊，第3路狼）：

![补给站三态](art_source/qa/art08-04/supply_neutral_sheep_wolf.png)

## 5. 关卡徽章

- 位置由安全边距计算，最终 `center=(-576,308)`。
- 尺寸由 `90×50` 调整为 `104×48`，中心 Y 与顶部 AI 补给、基地、能量继续共用 `TOP_HUD_Y=308`。
- 正式 `level_badge_runtime_v01.png` 继续复用，使用奶油暖色轻度着色；主文字 `#563A25`，副文字 `#495B43`。
- 主文字区域 84×24、中心 `(0,8)`；副文字区域 84×17、中心 `(0,-12)`；关卡号与标题仍由当前 LevelConfig 动态生成。

修改前：

![修改前关卡徽章](art_source/qa/art08-04/before_level_badge.png)

修改后：

![修改后关卡徽章](art_source/qa/art08-04/after_level_badge.png)

## 6. 八个出兵门中心误差

道路中心保持：`[-495,-225,45,315]`。

AI 门四帧 alpha 主体平均比纹理中心偏左 0.375 像素；按 72 设计像素显示尺寸换算为 `-0.2109375`，因此统一设置 `GateVisual.localX=+0.2109375`。玩家门 alpha 主体中心偏移为 0，统一 `localX=0`。

| 路 | LANE_X | AI GateRoot | AI Visual | AI 主体中心 | AI误差 | 玩家 GateRoot | 玩家主体中心 | 玩家误差 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | -495 | -495 | -494.7890625 | -495 | 0 | -495 | -495 | 0 |
| 2 | -225 | -225 | -224.7890625 | -225 | 0 | -225 | -225 | 0 |
| 3 | 45 | 45 | 45.2109375 | 45 | 0 | 45 | 45 | 0 |
| 4 | 315 | 315 | 315.2109375 | 315 | 0 | 315 | 315 | 0 |

八个门均小于 2 设计像素阈值；四条调试中心线节点存在但 `DEBUG_LANE_CENTER_LINES=false`，正式显示关闭。

## 7. LaneHitArea 与统一出兵入口

每路新增一个透明 `LaneHitArea`：

- centerX：对应 `LANE_X`
- centerY：12.5
- size：180×515
- 有效范围：Y `[-245,270]`
- 道路之间草地不吸附。

事件处理：

1. `TOUCH_START` 记录 UI 触摸坐标并显示门按压反馈；
2. `TOUCH_MOVE` 位移达到 12 设计像素即标记为拖动；
3. 只有未拖动的 `TOUCH_END` 调用一次 `trySpawnPlayerUnit(lane)`；
4. 同路 80 ms 去重窗口阻止重复触发；
5. 原底部门不再保留独立的第二套出兵监听；
6. 暂停、未开始、结束、关卡过渡或任一阻塞 Modal 显示时拒绝道路触摸；
7. 公告条和战术公告增加 `BlockInputEvents`，Modal 沿用现有阻塞层；
8. `spawnUnit()` 仍只使用固定 `LANE_X[lane]` 和固定本方出生端 Y，完全不读取点击坐标。

新手引导第2条及第1关开场提示已改为：

“点击对应道路任意位置出兵，单位会从本方入口出发。”

## 8. 道路点击与防穿透测试

四条道路分别点击上方 `y=160`、中部 `y=20`、下方 `y=-190`，共 12 项：

- 12/12 均只生成 1 个玩家单位；
- `UnitRoot.x` 分别严格为 `-495/-225/45/315`；
- 所有新单位初始观测 Y 约为 `-202.3`，证明没有从上方或中部点击点生成；
- 所有 `UnitRoot.scale=(1,1,1)`。

其他输入结果：

| 测试 | 结果 |
|---|---|
| 点击道路间草地 | 玩家单位数 0，PASS |
| 点击单位卡 | 玩家单位数 0，PASS |
| 点击公告条覆盖区域 | 玩家单位数 0，PASS |
| 单击道路一次 | 玩家单位数 1，PASS |
| 道路内拖动 70 像素后松开 | 玩家单位数 0，PASS |
| 暂停时点击道路 | 玩家单位数 0，PASS |
| 同路按实际队列间距连续出兵4次 | 前3次达到 3/3，第4次仍为3，PASS |

完整数据：`art_source/qa/art08-04/visual_input_validation.json`。

## 9. 截图与浏览器验证

修改前：

![修改前完整战斗](art_source/qa/art08-04/before_battle_reference.png)

修改后：

![修改后完整战斗](art_source/qa/art08-04/after_battle_1280x720.png)

宽屏验证：`art_source/qa/art08-04/after_battle_wide_1800x720.png`。

- 1280×720：PASS。
- 1800×720 页面中 1280×720 游戏画布按 SHOW_ALL 居中，无单位卡越界或状态框错位。
- 控制台 error/warning/pageerror：0。
- 请求失败：0。
- 404：0。
- Bundle 重复/缺失警告：0。

## 10. TypeScript、微信构建与包体

### TypeScript

- 使用 Cocos Creator 3.8.8 随附 TypeScript，限定 `assets/scripts/**/*.ts`、`noEmit`、`skipLibCheck`。
- 结果：PASS，退出码 0。
- QA `.mjs` 语法检查：PASS。
- 构建配置 JSON 解析：PASS。
- `git diff --check`：PASS。

### 微信正式构建

- 配置：`tools/qa/art08_04_wechat_build_config.json`
- Platform：WeChat Mini Game；Start Scene：Battle.scene；Debug=false；Source Maps=false；横屏 `landscapeRight`。
- 当前打开的 Creator 占用单实例。第二构建进程 60 秒内无 Builder 产物，目标 `art_source/qa/art08-04/builds/wechatgame` 不存在。
- 已只停止本轮启动的构建子进程；主编辑器保持运行。
- Cocos 启动阶段临时写入的 `settings/v2/packages/information.json` 已精确恢复到本轮前 Git 状态。

现有上一轮正式微信构建只读基线：

| 项目 | bytes | MiB | 限制 | 基线结果 |
|---|---:|---:|---:|---|
| 主包 | 3,370,159 | 3.214 | 4 MiB | 通过 |
| 全部本地包 | 18,899,000 | 18.023 | 30 MiB | 通过 |

旧构建含 6 个本地分包、0 个 `.map`。本轮没有新增 `assets` 图片、音频或 Bundle，只增加少量 TypeScript；但最新精确包体仍必须以解除 Creator 单实例占用后的正式构建为准。

## 11. 实际修改文件

源码：

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`（仅批次标识更新为 art08-04）

验证与证据：

- `tools/qa/art08_04_tsconfig.json`
- `tools/qa/art08_04_wechat_build_config.json`
- `tools/qa/validate_art08_04_visual_and_input.mjs`
- `art_source/qa/art08-04/before_battle_reference.png`
- `art_source/qa/art08-04/before_level_badge.png`
- `art_source/qa/art08-04/after_level_badge.png`
- `art_source/qa/art08-04/after_battle_1280x720.png`
- `art_source/qa/art08-04/after_battle_wide_1800x720.png`
- `art_source/qa/art08-04/selected_medium_yellow.png`
- `art_source/qa/art08-04/supply_neutral_sheep_wolf.png`
- `art_source/qa/art08-04/visual_input_validation.json`
- `VISUAL_POLISH_REPORT_v1.2.0-dev-art08-04.md`

未直接修改 `build`、`library`、`temp`。Creator 仅自动刷新了预览编译缓存；未生成本轮微信构建输出。

## 12. 尚未处理与人工验证

1. 关闭当前 Creator 工程实例后，用 `tools/qa/art08_04_wechat_build_config.json` 完成最新微信正式构建，并记录最新主包/全部本地包精确值。
2. 微信真机复核道路上中下触摸、12 像素拖动阈值、右上胶囊安全区和多指快速点击。
3. 当前补给站已通过形状、文字和颜色三重区分；若后续追求更高美术完成度，可将代码形状层烘焙为正式 `supply_point_state_sheet_runtime_v02.png`。这属于后续美术精修，不影响本轮辨识与玩法回归。
4. 当前源码 SHA-256：`2DC4F6945BD4CF8C08D7513E98784BD5AAD9F61BBD0117B2331834D5A58226E3`。

结论：本轮指定视觉与道路触控问题已经在浏览器预览中修复并通过自动化回归；进入下一阶段前仍需完成一次最新微信正式构建和真机触摸验收。
