# 《羊狼四线战》UI 清晰度整改报告

- 批次：`v1.2.0-dev-art10-ui-clarity01`
- 项目：`D:\GameProjects\WolfSheepBattle`
- Cocos Creator：`3.8.8`
- Git 基线/当前 HEAD：`f9e29dda89887123d8035c264964842e83d5cecc`
- 游戏版本：`v1.2.0-dev`（未修改）
- Git：未提交、未创建标签；保留了开始前全部未提交改动。

## 1. 完成结论

本轮指定的四项整改均已落地并完成自动化回归：

1. 补给点已换成 v02 中立、羊方、狼方、争夺四态正式资源；正式资源生效时不再叠加 `FactionSilhouette`。
2. 三张战术牌已拆成标题、条件、效果、冷却/范围/消耗和动态状态，并共用唯一可用性判定。
3. 暂停页音乐/音效控件已清除 Emoji 与重复 Graphics，接入正式轨道、旋钮、音频图标和 BGM 选择面板。
4. 全部运行时 Label 已统一到 Noto Sans SC 静态 700 字重 v02 子集；自动字形审计缺失数为 0。

TypeScript、1280×720 Web 构建/运行回归和微信小游戏正式参数构建均通过。道路、队列、碰撞、AI、单位数值、关卡数值和基地规则没有调整。

## 2. 修改文件

### 源码与配置

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`

本轮没有修改 `assets/scripts/AudioManager.ts`；音量、静音、BGM 切换和持久化继续复用原实现。

### 补给点资源

- `art_source/battlefield/supply_points/supply_point_states_v02.png`
- `assets/bundles/art_battlefield/battlefield/supply_points/supply_point_states_runtime_v02.png`
- `assets/bundles/art_battlefield/battlefield/supply_points/supply_point_states_runtime_v02.png.meta`（Creator 自动生成）
- `tools/art_pipeline/build_supply_point_v02.py`

旧运行时 v01 未删除，已连同原 `.meta` 归档到：

- `art_source/_archive/runtime_supply_point_v01_art10/`

### 字体资源与许可

- `art_source/ui/fonts/ui_font_cn_subset_v02.ttf`
- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`
- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf.meta`（Creator 自动生成）
- `art_source/ui/fonts/ui_font_cn_subset_v02_LICENSE.txt`
- `THIRD_PARTY_LICENSES/ui_font_cn_subset_v02_LICENSE.txt`
- `tools/art_pipeline/build_ui_font_subset_v02.py`
- `tmp/art10_ui_font_characters_v02.txt`
- `tmp/art10_ui_font_audit_v02.json`

旧运行时 v01 未删除，已连同原 `.meta` 归档到：

- `art_source/_archive/runtime_font_v01_art10/`

### QA 与构建配置

- `tools/qa/art10_ui_clarity_web_build_config.json`
- `tools/qa/art10_ui_clarity_wechat_build_config.json`
- `tools/qa/validate_art10_ui_clarity.mjs`
- `art_source/qa/art10-ui-clarity01/references/`
- `art_source/qa/art10-ui-clarity01/screenshots/`
- `art_source/qa/art10-ui-clarity01/builds/`（Cocos 自动构建输出，未手工编辑）

## 3. 补给点 v02

### 资源规格

| 文件 | 尺寸 | 大小 |
|---|---:|---:|
| 源图 `supply_point_states_v02.png` | 1024×256，4×256 | 358,270 B |
| 运行时 `supply_point_states_runtime_v02.png` | 512×128，4×128 | 105,506 B |

资源为本轮原创生成并经本地透明化、统一缩放和像素对齐处理；没有使用网络来源不明素材。

### 四帧映射

| 帧 | 状态来源 | 游戏显示 |
|---:|---|---|
| 0 | `owner === null && capturingTeam === null` | 中立原木/石台、普通绿旗 |
| 1 | `owner === Team.Player && capturingTeam === null` | 羊毛顶篷、卷角、青绿叶盾 |
| 2 | `owner === Team.AI && capturingTeam === null` | 狼耳尖顶、狼首/爪印、暖红装饰 |
| 3 | `capturingTeam !== null` 且尚未完成 | 中立主体、青绿/暖红交叉旗 |

运行时四帧 alpha 边界审计：

| 帧 | alpha 边界 | 中心 X | 底部 Y |
|---:|---|---:|---:|
| 0 | `(9,8)-(118,123)` | 63.5 | 123 |
| 1 | `(11,8)-(116,123)` | 63.5 | 123 |
| 2 | `(8,7)-(119,123)` | 63.5 | 123 |
| 3 | `(10,8)-(117,123)` | 63.5 | 123 |

`updateSupplyPoints()` 的 owner 提交时机未修改：占领计时完成前 owner 保持原值；仅显示帧切换为争夺态。正式 v02 帧加载成功时 `Graphics.enabled=false`、`FactionSilhouette.active=false`；资源失败时才启用 Graphics 与阵营剪影回退。

自动执行同一补给点羊方/狼方交替占领 10 次：10/10 次 owner、帧 1/2 和补给增长方完全一致；每次完成后 `capturingTeam === null`，对应阵营收入均为 `2/秒`。

## 4. 三张战术牌

### 唯一可用状态

新增 `getPlayerTacticAvailability(kind)`，统一向以下四处提供同一结果：

- 卡牌状态文案；
- 卡牌亮暗和 `enabled`；
- `TOUCH_START/TOUCH_END` 点击门禁；
- 实际施放前置状态（`tryUseSprint/Heal/Shock` 仍保留最终安全检查）。

覆盖状态：

`not-started`、`paused`、`finished`、`active`、`cooldown`、`insufficient-supply`、`no-friendly-unit`、`no-injured-unit`、`locked`、`no-enemy-in-territory`、`used`、`available`。

自动测试逐项确认 `availability.state === card.availabilityState` 且 `availability.enabled === card.enabled`，没有“显示可用但点击无目标”的分叉。

### 最终卡牌文案

**全体冲刺**

- 条件：`补给≥2·有己方单位`
- 效果：`全体速度+50%·持续6秒`
- 冷却：`10秒`
- 状态：可用、场上无己方单位、补给不足（需要2）、冲刺中 N 秒、冷却中 N 秒及公共状态。

**战地急救**

- 条件：`补给≥3·有受伤单位`
- 效果：`全部存活伤员恢复40%最大生命·不超上限`
- 冷却：`8秒`
- 状态：可用、没有受伤单位、补给不足（需要3）、冷却中 N 秒及公共状态。

**领地震荡**

- 条件：`基地血量<50%·本局限1次·领地有敌军`
- 效果：`小中型消灭；大巨型损失55%最大生命并击退，至少留1生命`
- 范围/消耗：`本方领地·0补给`
- 状态：基地低于50%解锁、本方领地无敌军（不会消耗）、可用、本局已使用及公共状态。

代码、卡牌、提示和战报中的“全线冲刺”已统一为“全体冲刺”。

### 真实施放回归

| 战术 | 自动回归结果 |
|---|---|
| 全体冲刺 | 补给消耗 2；持续 6 秒；冷却 10 秒 |
| 战地急救 | 测试单位最大生命 32，生命 6→19（`ceil(32×0.4)=13`）；补给 5→2；冷却 8 秒 |
| 领地震荡 | 49% 基地血量解锁；轻型目标被消灭；补给消耗 0；本局使用标记仅在有目标时写入 |

静态常量复核：速度倍率 1.5、重型伤害比例 0.55、击退距离 145 均未修改。

### 卡牌布局

- 右侧栏宽：220；与第4路视觉边缘保留约 3 设计像素间距。
- 卡高：116；卡间距：8；三张卡均位于安全区域。
- 正式卡图先从运行时 512×208 帧中裁掉导出透明边 `(31,30,451,145)`，再用 `Sprite.Type.SLICED` 渲染；边界 `55/20/20/20`。
- 标题 17；正文 11、行高 13；状态 12；正文可换行，状态文字始终保留。
- 图标区和文字区分离；羊皮纸背景覆盖完整卡高，不再只出现在卡片中段。

## 5. 暂停音频控件

正式资源加载成功后的层级为：

1. `SliderTrackArt`（176×33，保持 512×96 原始比例）；
2. `FillClip` + 动态填充（内槽有效宽 146，`Mask.Type.GRAPHICS_RECT` 裁剪）；
3. `SliderKnobArt`（26×26）。

音乐和音效两行共用 `createVolumeControl()`，标题、静音、减号、轨道、加号、百分比列坐标完全相同，实测列误差为 0。

| 音量 | 填充比例 | 旋钮 X |
|---:|---:|---:|
| 0% | 0（节点隐藏） | -73 |
| 50% | 0.5 | 0 |
| 100% | 1 | 73 |

正式图标、轨道和旋钮加载成功时，对应旧 Graphics 均关闭；静音按钮文字始终为空，不再使用 `🔊/🔇`。静音以正式图标灰度/透明度表示。资源加载失败时才启用程序绘制的非 Emoji 扬声器回退。

`BgmSelectorPanel` 已应用到背景音乐选择行；正式上一首/下一首图标出现时 `<`、`>` 文字为空。自动运行确认：面板 Sprite 生效、选择行 Graphics 关闭、两侧文字为空。

本地存储仍使用 `wolf-sheep-battle.audio-settings.v1`。自动测试写入并读回：曲目 `cheerful_lighthearted`、音乐 50%、音效 75%、静音状态与最后非零音量字段完整。

## 6. 字体 v02

| 项目 | 结果 |
|---|---|
| 原字体 | `tmp/art03/font_source/NotoSansSC-VF.ttf` |
| 原字体 SHA-256 | `A3041811A78C361B1DE50F953C805E0244951C21C5BD412F7232EF0D899AF0DA` |
| 字体家族/许可 | Noto Sans SC / SIL OFL 1.1 |
| 实例化字重 | 静态 700 |
| 请求/覆盖字符 | 472 / 472 |
| 缺失字形 | 0 |
| 运行时大小 | 167,072 B |
| v02 SHA-256 | `3497CB711C5A3F10AFB9FF056154AE0C431DCFABF00BC66EAAC3841BA3C4162C` |

字符提取覆盖 `assets/**/*.ts`、场景、JSON 配置和 Unicode 转义字符串，并显式加入本轮战术全文、动态状态、ASCII、中文标点、①～⑤、Ⅰ～Ⅳ、`+ − % < > /` 等符号。

代码建立唯一 `applyFormalUiFont(label)`；`createLabel()` 每次创建后立即调用，异步字体完成后再次遍历全部已有 Label。`NumberLabel` 的系统字体例外已删除。

以下验收行逐字缺失数均为 0：

- 继续战斗
- 重新开始
- 玩法说明
- 返回标题
- 背景音乐
- 音乐
- 音效
- 游戏已暂停
- 全体冲刺
- 战地急救
- 领地震荡

Web 运行时共发现 132 个 Label，132/132 的 `font` 均指向同一个正式 v02 Font，例外数为 0。

## 7. 验证结果

### TypeScript

- 使用 Cocos Creator 3.8.8 随附 TypeScript。
- 范围：`assets/scripts/**/*.ts`；`noEmit`、`skipLibCheck`。
- 最终结果：PASS，退出码 0。

### 1280×720 浏览器

- Cocos 正式参数 Web 构建：PASS，Debug 关闭，Source Maps 关闭。
- 1280×720 Canvas 自动运行：PASS。
- 四补给点同屏帧：`0,1,2,3`，正式图生效、Graphics/剪影关闭。
- 同一补给点 10 次交替占领：PASS。
- 12 类战术状态 + 三个真实施放：PASS。
- 0/50/100 音量与持久化：PASS。
- 控制台错误：0；警告：0；游戏资源 404：0；请求失败：0。

运行明细：

- `art_source/qa/art10-ui-clarity01/screenshots/runtime_audit.json`

### 微信小游戏正式参数构建

- Platform：WeChat Mini Game
- Start Scene：`Battle.scene`
- Debug：关闭
- Source Maps：关闭；最终 `.map` 数量 0
- Orientation：`landscapeRight`
- 本地分包：6 个
- 构建：PASS；最终 stderr 为空
- 没有手工编辑任何生成目录内容。

## 8. 微信包体与本轮增量

对比基线采用上一份有精确包体记录的 `v1.2.0-dev-art09-02` 微信构建。

| 包 | 基线 bytes | 本轮 bytes | 增量 |
|---|---:|---:|---:|
| 主包 | 3,404,743 | 3,410,042 | +5,299 |
| art_battlefield | 4,381,390 | 4,384,911 | +3,521 |
| art_boot | 933,123 | 977,375 | +44,252 |
| art_ui | 3,062,787 | 3,062,787 | 0 |
| art_units | 3,077,206 | 3,077,206 | 0 |
| art_vfx | 2,118,338 | 2,118,338 | 0 |
| audio_bgm | 2,755,254 | 2,755,254 | 0 |
| **全部本地包** | **19,732,841** | **19,785,913** | **+53,072** |

- 主包：3.252 MiB，低于 4 MiB。
- 全部本地包：18.869 MiB，低于 30 MiB。
- 旧 supply v01 与 font v01 已移出 `assets` 并归档，因此构建内只保留 v02，不发生双份运行时资源膨胀。

## 9. 截图

修改前参考：

- `art_source/qa/art10-ui-clarity01/references/before_pause_audio_reference.png`
- `art_source/qa/art10-ui-clarity01/references/before_battle_tactic_supply_reference.png`

修改后 1280×720：

- `art_source/qa/art10-ui-clarity01/screenshots/supply_four_states_1280x720.png`
- `art_source/qa/art10-ui-clarity01/screenshots/tactic_cards_full_layout_1280x720.png`
- `art_source/qa/art10-ui-clarity01/screenshots/pause_audio_controls_1280x720.png`

## 10. 尚需人工真机测试

自动化和 Creator 构建已通过，以下项目仍需在微信开发者工具/真机完成，不能用桌面结果冒充：

1. 真机横屏检查三张 11px 正文战术牌的最终阅读距离与系统缩放效果。
2. 真机实际触摸音乐/音效滑杆，验证拖动手感、5% 按钮步进、静音恢复和 BGM 切换试听。
3. 杀进程重开后确认选曲、音乐/音效音量和静音状态恢复。
4. 正常实战中观察补给点争夺帧和归属帧切换，确认缩小画面下能一眼辨认羊/狼轮廓。
5. 微信开发者工具“代码依赖分析/包体分析”复核工具口径主包与六个分包大小。
6. 弱网、切后台/回前台时确认 Bundle 与音频恢复；本轮没有部署远程资源。

## 11. 回退方式

- 补给点 v02 失败：`ArtResourceManager` 自动保留 Graphics + `FactionSilhouette`；需要完整回退时，将 `art_source/_archive/runtime_supply_point_v01_art10/` 恢复到原 Bundle 路径并将 `SupplyPoint` 配置改回 v01。
- 字体 v02 失败：加载异常会保留系统字体而不阻塞游戏；需要完整回退时，从 `art_source/_archive/runtime_font_v01_art10/` 恢复 v01 并改回字体加载路径。
- 暂停页专用 Sprite 失败：对应 Graphics/程序扬声器回退自动启用，不影响音量和 BGM 逻辑。
- 战术正式背景失败：卡牌 Graphics 回退仍可显示，统一可用状态和施放安全检查不依赖图片资源。

当前结论：本轮代码与自动化验收完成，版本仍为 `v1.2.0-dev`；可进入用户微信真机验收，但本轮不提交 Git、不创建标签。
