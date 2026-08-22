# 羊狼四线战右侧战术卡牌专项精修报告

- 批次：`v1.2.0-dev-art10-ui-clarity02`
- 游戏版本：`v1.2.0-dev`（未修改）
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 引擎：Cocos Creator 3.8.8
- 日期：2026-07-29
- 结论：三张战术牌已完成固定四区布局、可用性统一判定、禁用触控隔离和横屏安全区验证；未修改道路、单位、AI、关卡数值、战术数值、字体或其他稳定界面。
- Git：按要求未提交、未创建标签；工作区保留此前各批次的未提交成果。

## 1. 问题原因与处理

### 1.1 卡面偏淡、可用与禁用不易区分

上一批正式 v01 羊皮纸卡面本身明度较高，在明亮草地背景上仅依赖原图时边界偏弱；禁用状态如果只降低整体透明度，正文也会一起丢失。

本轮保留正式 v01 卡面，通过 `Sprite.Type.SLICED`、不透明内容底板、状态边框和状态条建立两套主视觉。可用卡保持暖奶油底和金棕边框；禁用卡保持不透明米灰底和灰棕边框，只降低图标透明度，不降低文字可读性。代码染色已达到要求，因此没有新增无必要的 v02 大图。

### 1.2 卡牌过高、信息堆叠

上一批为 220×116，标题、条件、效果、冷却/范围和状态占用较多纵向空间。现改为 210×100，三张卡固定间距 9，并把所有内容分入图标、标题、规则和状态条四个互不重叠的区域。

### 1.3 图标压住正文、文字触边

旧布局的多个正文 Label 与图标区间距不足。现使用独立图标容器和单一规则 Label，所有 UITransform 都有明确尺寸和锚点；新增开发期边界检测，检查 Title、Rules、Status 是否完全位于卡牌安全矩形，并检查图标与标题/规则是否相交。

### 1.4 显示可用与实际不可用不一致

卡牌显示、enabled 和触控门禁如果分别判断，容易在“无己方单位”“无受伤单位”“领地无敌军”时产生分叉。现统一由 `getPlayerTacticAvailability(kind)` 返回 `TacticAvailability`；状态文字、主视觉、enabled、TOUCH_START 和 TOUCH_END 均读取同一结果。`tryUseSprint`、`tryUseHeal`、`tryUseShock` 继续保留最终安全检查。

## 2. 实际修改文件

### 源码与配置

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`
- `tools/qa/art10_ui_clarity02_web_build_config.json`
- `tools/qa/art10_ui_clarity02_wechat_build_config.json`

### 自动验证

- `tools/qa/validate_art10_tactic_cards.mjs`
- `tools/qa/validate_art10_ui_clarity.mjs`：仅将上一批 QA 对旧 `condition/effect/meta` Label 的读取更新为当前 `rulesLabel`，未改游戏逻辑。

### QA 产物

- `art_source/qa/art10-ui-clarity02/references/`
- `art_source/qa/art10-ui-clarity02/screenshots/`
- `art_source/qa/art10-ui-clarity02/regression/`
- `art_source/qa/art10-ui-clarity02/builds/web-mobile/`
- `art_source/qa/art10-ui-clarity02/builds/wechatgame/`
- `TACTIC_CARD_POLISH_REPORT_v1.2.0-dev-art10-ui-clarity02.md`

没有手工修改项目根的 `build`、`library` 或 `temp` 生成目录。

## 3. 最终战术区域与卡牌尺寸

| 项目 | 上一批 | 本轮最终值 |
|---|---:|---:|
| 右侧区域宽度 | 220 | 210 |
| 卡牌宽×高 | 220×116 | 210×100 |
| 卡牌高度变化 | — | -16（约 -13.8%） |
| 卡牌间距 | 8 | 9 |
| 标题栏中心 Y | 232 | 232 |
| 三卡中心 Y | 约 149 / 25 / -99 | 156 / 47 / -62 |
| 1280×720 卡牌中心 X | 518 | 523 |
| 1600×720 卡牌中心 X | — | 683 |

三张卡均位于右侧安全区域内，不超出屏幕，不遮挡暂停按钮、底部 HUD 或第四条道路。

## 4. 卡牌四区与 Label 参数

卡牌本地安全矩形为 X `[-97, 97]`、Y `[-44, 44]`。

| 区域/节点 | 中心位置 | UITransform | 字号/行高 | 对齐与溢出 |
|---|---:|---:|---:|---|
| 图标底板 | (-78, 9) | 44×46 | — | 独立容器 |
| 程序图标 | (-78, 9) | 42×42；scale 0.72 | 视觉约 36 | 不进入文字区 |
| Title | (22, 35) | 150×18 | 16 / 20 | 左对齐、垂直居中、单行、SHRINK |
| Rules | (22, 2) | 150×44 | 10.5 / 14 | 左对齐、垂直居中、三行、CLAMP |
| StateBar | (0, -35) | 194×18 | — | 圆角状态底条 |
| Status | StateBar 内 (0, 0) | 184×16 | 12 / 15 | 水平垂直居中、单行、SHRINK |

正文最小字号保持 10.5，没有通过继续缩小字号规避布局问题。正式卡面位于最底层；按压高亮层只覆盖背景层，不降低文字和图标透明度。

## 5. 最终固定文案

### 全体冲刺

```text
条件：2补给·场上有己方单位
效果：全体移速+50%·持续6秒
冷却：10秒
```

### 战地急救

```text
条件：3补给·场上有受伤单位
效果：全体受伤单位恢复40%
冷却：8秒
```

### 领地震荡

```text
条件：基地<50%·本局限1次
范围：仅本方领地
效果：小中消灭·大巨重伤并击退
```

## 6. 可用与不可用色值

| 项目 | 可用 | 不可用 |
|---|---|---|
| 卡面底色 | `#FFF0C7` | `#D9D1BC` |
| 主边框 | `#D39A2F` | `#8F887B` |
| 标题 | `#56371F` | `#544C43` |
| 正文 | `#725039` | `#665F55` |
| 图标 Alpha | 255 | 140 |
| 卡面 Alpha | 255 | 255 |

状态条色值：

| 状态 | 色值 |
|---|---|
| 可用 | `#58A95D` |
| 冲刺生效中 | `#C09130` |
| 冷却 | `#71869A` |
| 补给不足 | `#A95B4D` |
| 未解锁 | `#7E6B8F` |
| 已使用/战斗结束 | `#65615B` |
| 其他不可用原因 | `#8F887B` |

## 7. 状态判定表

只有 `available` 的 `enabled` 为 true；其他状态均禁用卡牌触控释放。

| 战术 | 优先级 | 状态键 | 动态文字 |
|---|---:|---|---|
| 全体冲刺 | 1 | active | 冲刺中 N秒 |
| 全体冲刺 | 2 | cooldown | 冷却中 N秒 |
| 全体冲刺 | 3 | insufficient-supply | 补给不足（需要2） |
| 全体冲刺 | 4 | no-friendly-unit | 场上无己方单位 |
| 全体冲刺 | 5 | available | 可用 |
| 战地急救 | 1 | cooldown | 冷却中 N秒 |
| 战地急救 | 2 | insufficient-supply | 补给不足（需要3） |
| 战地急救 | 3 | no-injured-unit | 没有受伤单位 |
| 战地急救 | 4 | available | 可用 |
| 领地震荡 | 1 | used | 本局已使用 |
| 领地震荡 | 2 | locked | 基地低于50%解锁 |
| 领地震荡 | 3 | no-enemy-in-territory | 本方领地无敌军 |
| 领地震荡 | 4 | available | 可用 |

公共前置状态 `not-started`、`paused`、`finished` 也由同一个 `TacticAvailability` 返回，显示和点击门禁不会分叉。

## 8. 文字边界与触控验证

聚焦自动测试覆盖 13 个用户要求的状态；综合回归覆盖 16 个含公共前置状态的快照。

- 13/13 聚焦状态：`availability.enabled === card.enabled`。
- 13/13 聚焦状态：`availability.state === card.availabilityState`。
- 13/13 聚焦状态：Title、Rules、Status 边界违规数均为 0。
- 13/13 聚焦状态：图标与标题/正文交叠数均为 0。
- 13/13 聚焦状态：正式卡面均为 `Sprite.Type.SLICED`。
- 16/16 综合状态：显示状态与卡牌状态一致，分叉数 0。

禁用触控：

- 全体冲刺、战地急救、领地震荡均保持 scale `(1,1)`；
- `PressOverlay=false`；
- 补给不变，不进入冷却，不施放；
- `audioCalls=[]`，不播放成功音效。

可用触控：

- TOUCH_START：scale `(0.98,0.98)`，按压层开启；
- TOUCH_END：恢复 `(1,1)`，按压层关闭；
- 实测全体冲刺补给 5→3，进入 active，只播放一次 `tactic_sprint`。

## 9. 浏览器与回归结果

### 1280×720

- Cocos Web 正式参数构建：PASS；Debug 关闭，Source Maps 关闭。
- 三张卡完整显示；标题、正文、状态不越界、不重叠、不遮挡图标。
- 可用暖奶油/金边/绿色状态条与不可用米灰/灰棕边/原因状态条可直接区分。
- 快速状态更新保持单一卡牌节点，没有新增重叠节点。
- 运行时控制台错误 0、警告 0、资源 404 为 0、请求失败 0。

### 1600×720 横屏安全区模拟

- 卡牌中心 X 自动移动到 683，尺寸仍为 210×100。
- 边界违规 0；控制台错误 0、警告 0、资源 404 为 0。
- 该截图是浏览器中的微信横屏尺寸/安全区模拟，不冒充微信真机截图；真机触摸与系统缩放仍需用户验收。

### 相关功能综合回归

- 首次调用上一批综合 QA 时，旧脚本仍读取已被本轮固定四区结构替换的 `condition/effect/meta` Label，测试脚本自身报错；将快照读取更新为当前 `rulesLabel` 后重跑通过。该问题不属于游戏运行时错误。
- 同一补给点羊/狼交替占领 10 次：10/10 正确；补给增长阵营和正式帧一致。
- 三张战术真实施放：冲刺消耗 2、持续 6 秒、冷却 10 秒；急救 6→19/32、消耗 3、冷却 8 秒；震荡有目标时使用成功且不扣补给。
- 音量 0/50/100、BGM 选择器和本地持久化：PASS。
- 正式字体：126/126 个运行时 Label 使用同一正式字体。
- 综合回归控制台错误 0、警告 0、资源 404 为 0、请求失败 0。

## 10. 截图与审计文件

修改前：

- `art_source/qa/art10-ui-clarity02/references/tactic_cards_before_art10_ui_clarity01_1280x720.png`

修改后：

- `art_source/qa/art10-ui-clarity02/screenshots/tactic_cards_available_1280x720.png`
- `art_source/qa/art10-ui-clarity02/screenshots/tactic_cards_disabled_1280x720.png`
- `art_source/qa/art10-ui-clarity02/screenshots/tactic_cards_wechat_landscape_sim_1600x720.png`

审计：

- `art_source/qa/art10-ui-clarity02/screenshots/tactic_card_runtime_audit.json`
- `art_source/qa/art10-ui-clarity02/regression/runtime_audit.json`

## 11. TypeScript 与微信小游戏构建

### TypeScript

- 使用 Cocos Creator 3.8.8 随附 TypeScript。
- 范围：`assets/scripts/**/*.ts`。
- `noEmit`、`skipLibCheck`。
- 结果：PASS，退出码 0。
- `git diff --check`：本轮源码与测试文件 PASS。

### 微信小游戏正式参数构建

- Platform：WeChat Mini Game。
- Start Scene：`Battle.scene`。
- Debug：关闭。
- Source Maps：关闭；产物 `.map` 数量 0。
- Orientation：`landscapeRight`。
- 分包：6 个，`art_boot`、`art_battlefield`、`art_units`、`art_ui`、`art_vfx`、`audio_bgm`。
- 官方 Builder 日志：`build Task(wechatgame) Finished in 11307ms`，完整产物于 2026-07-29 19:29 生成。
- Cocos Creator 3.8.8 CLI 返回其构建成功码 36；`game.json`、`project.config.json`、主包及六个分包均完整。
- 当前 Cocos 编辑器窗口正在占用 `temp/logs/project.log` 和 Electron GPU 缓存，因此本次 CLI stderr 留有 EPERM/缓存警告；构建日志没有项目脚本、资源缺失或 Bundle 加载失败，运行时控制台也没有新增错误。关闭编辑器后重跑可消除该环境警告，但本轮未擅自关闭用户窗口。

## 12. 包体变化

对比基线为 `v1.2.0-dev-art10-ui-clarity01`。

| 包 | 基线 bytes | 本轮 bytes | 增量 |
|---|---:|---:|---:|
| 主包 | 3,410,042 | 3,411,796 | +1,754 |
| art_battlefield | 4,384,911 | 4,384,911 | 0 |
| art_boot | 977,375 | 977,375 | 0 |
| art_ui | 3,062,787 | 3,062,787 | 0 |
| art_units | 3,077,206 | 3,077,206 | 0 |
| art_vfx | 2,118,338 | 2,118,338 | 0 |
| audio_bgm | 2,755,254 | 2,755,254 | 0 |
| **全部本地包** | **19,785,913** | **19,787,667** | **+1,754** |

- 主包：约 3.254 MiB，低于 4 MiB。
- 全部本地包：约 18.871 MiB，低于 30 MiB。
- 本轮没有新增图片或音频，增量仅来自战术卡牌 TypeScript 逻辑和文字。

## 13. 玩法保护与静态复核

本轮没有修改：

- `UNIT_DEFINITIONS`、`LEVEL_CONFIGS`、`definition.radius`；
- 单位速度、生命、伤害、费用；
- 道路坐标、道路容量、出生、排队、碰撞、战斗和死亡；
- AI、关卡难度、胜负规则；
- 战术费用、倍率、持续时间、冷却、治疗比例、震荡伤害或击退距离；
- 背景、补给点、单位、暂停界面、字体资源、Bundle 划分与加载顺序。

## 14. 回退方法

工作区包含多轮尚未提交成果，禁止用 `git reset --hard` 或整文件 checkout 回退。若只回退本批，应选择性恢复以下范围：

1. `GameController.ts` 中 `TACTIC_CARD_HEIGHT/GAP/FIRST_CARD_Y`、`TacticCardView`、`createTacticCard()`、`validateTacticCardTextBounds()`、`refreshTacticCards()`、`getPlayerTacticAvailability()`、`updateTacticCard()` 的本轮差异；
2. 将 `ArtPilotConfig.ts` 的 `ART_PILOT_BATCH` 恢复为上一批值；
3. 移除本批新增的两份构建配置、聚焦 QA 脚本、QA 产物和本报告；
4. 将综合 QA 脚本的 `rulesLabel` 读取恢复到与目标版本节点结构一致的字段。

回退前应先保存当前工作区补丁，避免覆盖此前 art04～art10-01 的用户成果。

## 15. 剩余问题与人工真机项

1. 需要用户在微信真机横屏确认 10.5px 正文在实际观看距离、系统字体缩放和低亮度下仍可轻松阅读。
2. 需要真机连续点击可用/禁用卡牌，确认物理触摸区域、0.98 按压反馈和禁用无反馈符合手感。
3. 需要真机覆盖刘海/胶囊安全区；本轮已完成 1600×720 安全区模拟，但不能替代真机。
4. 当前 Cocos 编辑器占用 CLI 日志/缓存产生环境警告；如发布流水线要求 stderr 绝对为空，应关闭编辑器后再执行一次相同构建配置。
5. 没有制作 v02 卡面；当前 v01 经 SLICED、裁边、染色和独立底板后已经达到本轮清晰度目标。如真机仍觉得正文区域纹理干扰，再单独进入 v02 资源制作，不应在本轮继续扩改。

本批具备交付用户进行微信真机验收的条件；版本继续保持 `v1.2.0-dev`，未提交 Git、未创建标签。
