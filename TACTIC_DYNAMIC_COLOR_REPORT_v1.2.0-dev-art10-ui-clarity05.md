# 羊狼四线战 v1.2.0-dev-art10-ui-clarity05 战术牌动态数据与配色报告

## 1. 结论

- 本轮已完成右侧三张战术牌的动态补给、0.1 秒冷却倒计时、短状态文案、固定宽度防溢出、v05 明亮卡通配色和轻量状态切换动效。
- 游戏名称仍为“羊狼四线战”，真实版本仍为 `v1.2.0-dev`。
- 未修改战术实际消耗、持续时间、冷却总时长、治疗比例、解锁条件、补给产生规则、战斗、AI、道路或单位逻辑。
- TypeScript 专用源码检查通过。
- Cocos Creator 3.8.8 Web 正式参数构建通过，官方成功退出码为 `36`。
- Cocos Creator 3.8.8 微信小游戏正式参数构建通过，官方成功退出码为 `36`。
- 浏览器自动验收共执行 1417 项断言，结果 `1417 passed / 0 failed`。
- 微信主包为 3,428,143 B（3.269 MiB），全部本地包为 19,588,769 B（18.681 MiB），继续满足主包小于 4 MiB、全部本地包小于 30 MiB。

## 2. 修改文件

### 2.1 运行时代码与配置

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`
- `tools/art_pipeline/generate_tactic_card_v05.py`
- `tools/qa/art10_ui_clarity05_web_build_config.json`
- `tools/qa/art10_ui_clarity05_wechat_build_config.json`
- `tools/qa/validate_art10_tactic_cards_clarity05.mjs`

### 2.2 v05 正式美术

源文件目录：

- `art_source/ui/tactic_cards/v05/`

运行时目录：

- `assets/bundles/art_ui/ui/tactic_cards/v05/`

运行时 PNG 共 21 个：

- `tactic_card_shell_runtime_v05.png`
- `tactic_divider_runtime_v05.png`
- `tactic_icon_cell_sprint_runtime_v05.png`
- `tactic_icon_cell_heal_runtime_v05.png`
- `tactic_icon_cell_shock_runtime_v05.png`
- `tactic_text_cell_sprint_runtime_v05.png`
- `tactic_text_cell_heal_runtime_v05.png`
- `tactic_text_cell_shock_runtime_v05.png`
- `tactic_info_cell_neutral_runtime_v05.png`
- `tactic_info_cell_ready_runtime_v05.png`
- `tactic_info_cell_insufficient_runtime_v05.png`
- `tactic_info_cell_cooldown_runtime_v05.png`
- `tactic_state_available_runtime_v05.png`
- `tactic_state_insufficient_runtime_v05.png`
- `tactic_state_cooldown_runtime_v05.png`
- `tactic_state_locked_runtime_v05.png`
- `tactic_state_used_runtime_v05.png`
- `tactic_state_unavailable_runtime_v05.png`
- `tactic_skill_sprint_runtime_v05.png`
- `tactic_skill_heal_runtime_v05.png`
- `tactic_skill_shock_runtime_v05.png`

这些资源均为本项目程序化原创空白 UI 或原创技能图标，没有把中文、补给数字、冷却时间或状态文字烘焙进 PNG。Cocos 生成的 `.meta` 来自正常资源导入，没有手写 UUID。

运行时 v05 PNG 合计 48,516 B；包含 Cocos `.meta` 后该目录合计 108,920 B。

### 2.3 v04 归档

不再被 `ArtPilotConfig` 引用的 v04 运行时目录已从 `assets` 移至：

- `art_source/_archive/runtime_tactic_cards_v04_art10_clarity05/`

归档保留 32 个文件、73,201 B，没有永久删除。最终微信构建中 `runtime_v04` / `tactic_cards/v04` 文本命中为 0。

## 3. 统一显示模型

新增统一的 `TacticCardDisplayState`，显示与点击均以 `getPlayerTacticAvailability()` 的同一份状态为准。

显示模型包含：

- `currentSupply`
- `requiredSupply`
- `cooldownTotal`
- `cooldownRemaining`
- `activeRemaining`
- `availability`
- `costText`
- `metaText`
- `stateText`
- 消耗区和冷却区的视觉状态

界面刷新顺序为：

1. 读取现有玩家补给、现有冷却、现有生效时间和现有单位状态。
2. 生成统一显示模型。
3. 更新消耗、冷却/次数、短状态文案。
4. 根据同一 `availability` 切换 v05 状态底图和图标透明度。
5. 点击处理再次读取同一 `availability`，不建立第二套判断。

没有新增 `schedule`、系统时间计时器、节点、材质或每帧 SpriteFrame。动态显示使用现有 `update(deltaTime)` 游戏时间，最多每 0.1 秒刷新一次。

## 4. 动态补给显示

战术牌只读取 `playerSupply`，不读取 AI 补给。

| 玩家补给 | 全体冲刺 | 战地急救 | 领地震荡 |
|---:|---:|---:|---|
| 0 | `0/2` | `0/3` | `零消耗` |
| 1 | `1/2` | `1/3` | `零消耗` |
| 2 | `2/2` | `2/3` | `零消耗` |
| 3 | `3/2` | `3/3` | `零消耗` |
| 4 | `4/2` | `4/3` | `零消耗` |
| 5 | `5/2` | `5/3` | `零消耗` |

真实点击验证：

- 全体冲刺：补给 `2 → 0`，消耗区立即显示 `0/2`。
- 战地急救：补给 `3 → 0`，消耗区立即显示 `0/3`。
- 领地震荡：补给保持 `0 → 0`。

补给不足时左侧消耗区使用珊瑚红底图，右侧只显示“补给不足”，不再重复长句。

## 5. 冷却动态倒计时

### 5.1 显示规则

- 全体冲刺未使用前：`10秒`。
- 战地急救未使用前：`8秒`。
- 进入冷却后：显示一位小数，如 `9.9秒`、`9.8秒`。
- 冷却期间右侧状态只显示“冷却中”。
- 到零后中间显示“已就绪”，右侧按实际条件切换为“点击使用”或其他不可用短状态。
- 数值钳制在 0 以上，不显示负数。
- 全体冲刺生效期间，中间继续显示真实冷却；右侧独立显示如“生效5.8秒”。

### 5.2 自动验收样本

全体冲刺：

`10.0 → 9.9 → 9.8 → 5.8 → 0.1 → 已就绪`

战地急救：

`8.0 → 7.9 → 7.8 → 4.2 → 0.1 → 已就绪`

真实点击 约 0.12 秒后的界面结果：

- 全体冲刺：`0/2`、`9.9秒`、`生效5.9秒`。
- 战地急救：`0/3`、`7.9秒`、`冷却中`。

暂停验证：

- 暂停前：冷却 6.4，显示 `6.4秒`。
- 暂停期间调用 1.25 秒更新：冷却仍为 6.4，显示仍为 `6.4秒`，状态为“已暂停”。
- 继续后更新 0.11 秒：冷却为 6.29，显示 `6.3秒`。

## 6. 状态文案表

| 状态 | 短文案 |
|---|---|
| available | 点击使用 |
| insufficient-supply | 补给不足 |
| cooldown | 冷却中 |
| active | 生效 X.X 秒 |
| no-friendly-unit | 暂无单位 |
| no-injured-unit | 无人受伤 |
| locked | 未解锁 |
| no-enemy-in-territory | 领地无敌 |
| used | 已使用 |
| paused | 已暂停 |
| finished | 已结束 |
| not-started | 未开始 |

已删除底部区域中的长句显示，例如“补给不足（需要2）”“生命低于50%解锁”“领地内暂无可攻击敌人”。完整条件继续保留在上方说明区。

## 7. 最终尺寸与文字防溢出

卡片总尺寸为 `216 × 124`。

上方：

- 图标区：`68 × 80`
- 文字区：`136 × 80`
- 分隔线：`208 × 2`
- 标题：17 px，行高 20，左对齐
- 条件：13 px，行高 16，左对齐
- 效果：13 px，行高 16，左对齐

下方：

- 消耗区：`60 × 28`，约 30%
- 冷却/次数区：`56 × 28`，约 28%
- 状态区：`84 × 28`，约 42%
- 区域间距：4 px
- 消耗文字：`36 × 20`，12 px，行高 14
- 冷却文字：`36 × 20`，11.5 px，行高 14
- 状态文字：`60 × 20`，11.5 px，行高 14
- 小图标：12 px

底部 Label 均为单行、固定 UITransform、水平/垂直居中、`Overflow.CLAMP`、禁止换行，不使用 `SHRINK`。自动测试验证 `0/2`、`5/2`、`0/3`、`5/3`、`10.0秒`、`9.9秒`、`生效5.8秒` 切换时容器尺寸和位置不变。

## 8. v05 颜色表

### 8.1 公共颜色

| 用途 | 颜色 |
|---|---|
| 主文字 | `#4B3826` |
| 正文文字 | `#65523E` |
| 卡牌正文 | `#FFF7D9` |
| 通用金边 | `#E8B744` |
| 可用 | `#4FCA7B` |
| 冷却 | `#5AADE5` |
| 补给不足 | `#E66B5B` |
| 锁定 | `#9675D8` |
| 已使用 | `#8493A8` |
| 其他不可用 | `#E8A957` |

### 8.2 技能主题

- 全体冲刺：阳光黄 `#FFD84D`、天蓝 `#5AADE5`。
- 战地急救：薄荷绿 `#74DFA6`、嫩叶绿 `#A7EA64`。
- 领地震荡：薰衣草紫 `#B99AF2`、淡蓝紫 `#79B9EA`。

### 8.3 状态表现

- available：卡面和图标保持全彩，状态区为鲜绿色。
- insufficient-supply：主题卡面继续可读，图标透明度 204/255，约降低 20%；消耗区和状态区使用珊瑚红。
- cooldown：卡面保持主题色，冷却区和状态区使用天空蓝。
- locked：图标透明度 215/255，状态区为柔和紫色并显示锁 Sprite。
- used：图标透明度 190/255，卡壳和正文区使用轻度灰蓝 tint，但文字仍保持高对比。

## 9. 轻量状态动效

- 补给由不足变为足够：消耗区透明度由 205 过渡到 255，时长 0.16 秒。
- 冷却归零：技能图标由 1.00 放大到 1.05 再恢复，两个 0.12 秒阶段，总时长 0.24 秒。
- 动效不创建粒子，不持续闪烁，不修改卡片点击区域，也不修改任何战斗节点。
- 图标边界校验为圆角图标预留至少 5 px 安全边距；放大到 1.05 时仍完全位于图标区。

## 10. 自动测试结果

自动化报告：

- `art_source/qa/art10-ui-clarity05/screenshots/tactic_card_clarity05_runtime_audit.json`

结果：

- 总断言：1417
- 通过：1417
- 失败：0
- 浏览器控制台 Error：0
- 战术牌边界 Warning：0
- 请求失败：0
- 404：0

覆盖内容：

- 玩家补给 0～5 的全部动态显示。
- 两张技能的 0.1 秒冷却样本。
- 暂停冻结与继续。
- 零点钳制和“已就绪”切换。
- 全部可用、补给不足、冷却、激活、无单位、无人受伤、未解锁、领地无敌、已使用、暂停、结束、未开始状态。
- 不可用触摸不会缩放、不会播放成功音效、不会扣补给、不会释放技能。
- 可用点击去抖、按下/取消/抬起状态恢复。
- 真实冲刺、急救、震荡点击和现有技能数值。
- 1280×720、1600×720、844×390 三种横屏尺寸。
- 正式 Sprite 与旧 Graphics 不会同时显示。

## 11. 截图

修改前参考：

- `art_source/qa/art10-ui-clarity05/references/tactic_cards_before_reference_1280x720.png`

修改后：

- `art_source/qa/art10-ui-clarity05/screenshots/tactic_cards_available_1280x720.png`
- `art_source/qa/art10-ui-clarity05/screenshots/tactic_cards_disabled_1280x720.png`
- `art_source/qa/art10-ui-clarity05/screenshots/tactic_cards_wechat_landscape_sim_1600x720.png`
- `art_source/qa/art10-ui-clarity05/screenshots/tactic_cards_phone_landscape_844x390.png`

其中 1600×720 与 844×390 是浏览器中的微信/手机横屏安全区模拟截图，不冒充微信真机截图。

微信开发者工具官方 CLI 已安装，但本轮 `auto` 本地调试会话在 90 秒内未建立 9420 端口并超时，因此没有生成微信开发者工具窗口截图。该项保留为人工工具窗口和真机验收，不据此否定已完成的 Cocos 微信正式构建。

## 12. TypeScript 与构建

### 12.1 TypeScript

使用项目已有的 `tools/qa/art08_04_tsconfig.json` 限定 `assets/scripts/**/*.ts`、排除生成目录并启用 `skipLibCheck`。

结果：通过，退出码 0。

直接对根 `tsconfig.json` 执行新版独立 `tsc` 会把 `tmp` 中历史工具镜像和 Cocos 引擎声明一并纳入，产生与本轮源码无关的引擎/重复声明错误，因此不作为项目源码验收命令。

### 12.2 Web

- Cocos Creator：3.8.8
- Debug：关闭
- Source Maps：关闭
- Start Scene：`Battle.scene`
- 正式构建退出码：36
- 构建日志：`art_source/qa/art10-ui-clarity05/web_build_cli_final.log`
- 输出：`art_source/qa/art10-ui-clarity05/builds/web-mobile/`

主项目当时被已打开的 Creator 实例占用。为不关闭用户窗口或破坏可能未保存的编辑器状态，构建使用了只包含当前 `assets/settings/profiles/.creator/build-templates` 的临时源镜像；`build/library/temp/art_source` 均未复制。构建输出仍写入本轮 QA 目录，使用的源码与当前项目一致。

### 12.3 微信小游戏

- Cocos Creator：3.8.8
- Platform：WeChat Mini Game
- Debug：关闭
- Source Maps：关闭
- 横屏：`landscapeRight`
- Start Scene：`Battle.scene`
- 正式构建退出码：36
- 构建日志：`art_source/qa/art10-ui-clarity05/wechat_build_cli_final.log`
- 输出：`art_source/qa/art10-ui-clarity05/builds/wechatgame/`
- `.map` 文件：0
- `game.json` 分包声明：6 个
- `runtime_v04` 构建文本命中：0
- `runtime_v05` 构建文本命中：23

构建日志中存在 Cocos 使用缓存引擎时主动终止旧 `build-script` 子进程的 debug 记录（`SIGTERM`），随后明确记录 `Use cache engine`，最终构建正常完成并返回官方成功码 36；不是构建失败。

## 13. 微信包体

| 包 | 字节 | MiB |
|---|---:|---:|
| 主包（排除 `subpackages/`） | 3,428,143 | 3.269 |
| art_boot | 977,407 | 0.932 |
| art_battlefield | 4,384,911 | 4.182 |
| art_units | 3,077,206 | 2.935 |
| art_ui | 2,847,510 | 2.716 |
| art_vfx | 2,118,338 | 2.020 |
| audio_bgm | 2,755,254 | 2.628 |
| 全部本地包 | 19,588,769 | 18.681 |

与 clarity04 本地构建相比：

- 主包：+4,586 B（约 +0.004 MiB）。
- `art_ui` 分包：+26,496 B。
- 全部本地包：+31,082 B（约 +0.030 MiB）。

结论：

- 主包小于 4 MiB：满足。
- 全部本地包小于 30 MiB：满足。
- 本轮不需要远程 Asset Bundle。

## 14. 剩余人工项目

- 微信开发者工具窗口中确认三张卡的真实设备缩放效果。
- 微信真机横屏确认 11.5～13 px 文字在实际 DPR 下的可读性。
- 真机连续观察完整 10 秒和 8 秒冷却，确认没有因低帧率造成主观跳秒。
- 真机确认补给从不足变为足够的 0.16 秒过渡和冷却归零 0.24 秒动效自然。
- 真机确认色弱、低亮度环境下珊瑚红、天空蓝、紫色和灰蓝状态仍可区分。

## 15. 版本与 Git

- `GAME_VERSION`：`v1.2.0-dev`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 本轮未创建 Git 提交。
- 本轮未创建 Git 标签。
