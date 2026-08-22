# 《羊狼四线战》art05 全量正式美术接入报告

## 1. 基本信息

- 项目：`D:\GameProjects\WolfSheepBattle`
- Cocos Creator：3.8.8
- 游戏版本：`v1.2.0-dev`
- 美术批次：`v1.2.0-dev-art05-fullfill`
- 默认模式：`ART_RENDER_MODE = 'full'`
- 完成日期：2026-07-28
- Git：本批未提交、未打标签

## 2. 开始前检查

以下前置文件存在并已读取：

- `art_source/ART_RESOURCE_MANIFEST_v1.2.0-dev-art03.json`
- `ART_INTEGRATION_REPORT_v1.2.0-dev-art04-pilot.md`
- `assets/scripts/art/ArtPilotConfig.ts`
- `assets/scripts/art/ArtResourceManager.ts`
- `assets/scripts/art/SpriteSheetSlicer.ts`
- `assets/scripts/art/UnitSpriteAnimator.ts`
- `assets/scripts/art/VfxSpriteAnimator.ts`

art04 Pilot 浏览器回归未发现道路卡死、出生点错误、越界、单位不可见、Modal 穿透、白屏、控制台红错或逻辑被美术修改，因此继续扩展同一套接入层；没有创建第二套美术系统。

## 3. 修改和新增文件

### 源码

- 修改：`assets/scripts/GameController.ts`
- 扩展：`assets/scripts/art/ArtPilotConfig.ts`
- 扩展：`assets/scripts/art/ArtResourceManager.ts`
- 复用：`assets/scripts/art/SpriteSheetSlicer.ts`
- 复用：`assets/scripts/art/UnitSpriteAnimator.ts`
- 复用：`assets/scripts/art/VfxSpriteAnimator.ts`

### 资源与工具

- 新增运行资源：`assets/resources/art/full/**`
- 新增许可副本：`THIRD_PARTY_LICENSES/ui_font_cn_subset_v01_LICENSE.txt`
- 新增同步脚本：`tools/art_pipeline/sync_art03_runtime_assets.py`
- 新增已知问题：`ART_KNOWN_ISSUES_v1.2.0-dev-art05.md`
- 新增本报告：`ART_INTEGRATION_REPORT_v1.2.0-dev-art05-fullfill.md`

所有 `.meta` 均由 Cocos Creator 3.8.8 自动导入生成，没有手写 UUID。没有直接编辑 `build`、`library` 或 `temp` 中的生成内容。

## 4. 资源同步与哈希核验

同步脚本使用 83 项明确运行白名单，并对源文件和目标文件分别计算 SHA-256：

- 运行资源：83（82 PNG + 1 TTF）
- 许可文件：1（复制到非运行目录）
- 运行资源磁盘体积：47,916,109 bytes，约 45.696 MiB
- 首次同步：84 项复制成功
- 第二次幂等核验：84 项全部 `unchanged`
- 哈希差异覆盖：0
- 删除未知文件：0
- `reference` / `_archive` 进入运行目录：0

## 5. 实际复制进 assets 的资源清单

### 品牌与加载（6）

- `branding/splash/splash_screen_v01.png`
- `branding/logo/game_logo_wordmark_v01.png`
- `branding/logo/game_logo_emblem_v01.png`
- `branding/loading/loading_background_v01.png`
- `branding/loading/loading_bar_frame_v01.png`
- `branding/loading/loading_mascot_sheet_v02.png`

### 战场、道路、基地、入口和补给（10）

- `backgrounds/battlefield/battle_background_v01.png`
- `bases/player/player_base_v02.png`
- `bases/ai/ai_base_v02.png`
- `battlefield/roads/road_lane_01_v02.png`
- `battlefield/roads/road_lane_02_v02.png`
- `battlefield/roads/road_lane_03_v02.png`
- `battlefield/roads/road_lane_04_v02.png`
- `battlefield/spawn/player/player_spawn_gate_states_v01.png`
- `battlefield/spawn/ai/ai_spawn_gate_states_v01.png`
- `battlefield/supply_points/supply_point_states_v01.png`

### 八种角色（8）

- `characters/sheep/{small,medium,large,giant}/unit_sheep_*_sheet.png`
- `characters/wolf/{small,medium,large,giant}/unit_wolf_*_sheet.png`

### 单位卡、战术卡、弹窗、按钮、音频 UI 和字体（22）

- 四张 `ui/unit_cards/*/unit_card_*_v02.png`
- 三张 `ui/tactic_cards/*/tactic_card_*_v01.png`
- `ui/modals/result_panel_v01.png`
- `ui/common/pause/pause_button_v01.png`
- `ui/common/pause/pause_panel_v01.png`
- `ui/common/buttons/button_{primary,secondary,warning,close}_v01.png`
- `ui/common/audio/music_icon_v01.png`
- `ui/common/audio/sfx_icon_v01.png`
- `ui/common/audio/volume_slider_track_v01.png`
- `ui/common/audio/volume_slider_knob_v01.png`
- `ui/common/audio/bgm_selector_panel_v01.png`
- `ui/common/audio/bgm_previous_button_v01.png`
- `ui/common/audio/bgm_next_button_v01.png`
- `ui/fonts/ui_font_cn_subset_v01.ttf`

### HUD（18）

- 基地血条 3 项
- 单位血条 3 项
- 玩家/AI 能量框与补给框 4 项
- 能量/补给图标 2 项
- 小/中/大/巨档位徽章 4 项
- `level_badge_v01.png`
- `notice_banner_v01.png`

### VFX 与结果过渡（19）

- 出兵 2、移动 1、攻击/受击/死亡 4
- 突破/基地受击 2
- 战术 3
- 胜负徽章/氛围层 4
- 关卡过渡背景、横幅、擦除表 3

逐文件允许列表以 `tools/art_pipeline/sync_art03_runtime_assets.py` 为唯一同步依据。

## 6. 未复制资源（24）

以下清单项被明确排除：

- 道路旧组件：`lane_border_v01.png`、`lane_floor_v01.png`
- 入口旧单图：`ai_spawn_gate_v01.png`、`player_spawn_gate_v01.png`
- 补给旧单图：`supply_point_v01.png`
- 加载旧版：`loading_mascot_sheet_v01.png`
- 羊/狼四档各自的 `animation/*idle_sheet*` 旧表（8）
- 羊/狼四档各自的 `reference/*model_sheet*` 参考图（8）
- `victory_emblem_v01.png`
- `defeat_emblem_v01.png`

同步器还会拒绝 `_archive`、`reference`、旧方形单位卡、旧基地、旧高分辨率 VFX 和已由 v02 替代的明确文件名。

## 7. 全量资源映射

| 运行对象 | 正式资源 | 逻辑保持方式 |
|---|---|---|
| 四条道路 | `road_lane_01..04_v02` | 仅覆盖 180×515 视觉矩形，`LANE_X/LANE_WIDTH/边界`未改 |
| 玩家/AI基地 | `player_base_v02` / `ai_base_v02` | 仅 BattleLayer 装饰，不参与突破判定 |
| 八种单位 | 八张主精灵表 | Sprite 只在 `VisualNode`；`UnitRoot`、radius 和队列坐标不变 |
| 出兵入口 | 玩家/AI四状态表 | 每路独立状态索引；触摸根节点未变 |
| 补给点 | 四状态表 | 每路独立状态；占领规则未变 |
| 四张单位卡 | `unit_card_*_v02` | 动态名称、费用、选中/不可用继续由 Label/状态绘制 |
| 三张战术牌 | sprint/heal/shock 正式卡图 | 消耗、冷却、解锁和效果未改 |
| HUD | 基地/单位血条、资源框、徽章、提示框 | 填充仍按真实浮点状态缩放，文字仍动态 |
| 暂停/音频 | 暂停框、按钮、音频图标、滑轨/旋钮 | 触摸范围、音量逻辑、Modal 层级未改 |
| 结果/过渡 | 结果框、胜负徽章、氛围层、过渡三件套 | 按钮和胜负判定未改，只做 UI 动画 |
| VFX | 全部 v02 轻量表 | 对象池播放，不参与碰撞；暂停冻结、重开清理 |

## 8. 八种角色切帧参数

所有角色统一：

| 状态 | 帧 | FPS | 循环 |
|---|---:|---:|---|
| idle | 0–3 | 5 | 是 |
| move | 4–9 | 8 | 是 |
| attack | 10–14 | 12 | 否 |
| hit | 15–16 | 10 | 否 |
| death | 17–22 | 10 | 否 |

23–31 不使用。动画优先级为 `death > hit > attack > move > idle`。

切片参数：

- 小/中：1024×512，8×4，单格 128×128
- 大：1280×640，8×4，单格 160×160
- 巨：1536×768，8×4，单格 192×192
- 全部只生成前 23 个 SpriteFrame

显示尺寸只作用 `VisualNode`：小羊/狼 78/68，中羊/狼 92/82，大羊/狼 106/96，巨羊/狼 120/110；实际逻辑半径未改。

## 9. 全量模式与回退

`assets/scripts/art/ArtPilotConfig.ts` 提供一处开关：

- `placeholder`：全部 Graphics，可完整开始、出兵和战斗
- `pilot`：只在第 1 路使用 art04 小羊/小狼 Pilot
- `full`：四路与全部正式资源，当前默认值

实测：

- placeholder：道路正式插槽 0、单位动画 0、Graphics 单位正常显示，无控制台错误
- pilot：正式道路插槽 1；第 1 路小羊使用正式动画，第 2 路保持 Graphics，无控制台错误
- full：四路正式道路、八种单位、全部正式 HUD/VFX 可用

单项加载失败会记录资源 key 与路径，只回退该项 Graphics，不会白屏或阻塞战斗。
加载失败面板提供“重试加载”和“使用占位继续”两个可触摸选项；重试会只重新请求失败 key，不重复加载已缓存资源。

## 10. 分阶段加载、缓存与释放策略

实际分组：

1. 标题组：首屏只载入 6 张品牌/加载资源；正式中文字体独立加载，失败回退系统字体。
2. 战斗核心组：玩家点击“挑战”后加载背景、道路、基地、HUD、单位卡、战术卡、小型单位和常用 VFX；进度条使用真实完成数。
3. 单位按需组：中、大、巨分别在第一次生成时加载双方角色表。
4. 战术组：第一次释放战术时加载三张战术 VFX。
5. 暂停组：第一次暂停时加载暂停框与音频 UI。
6. 结果组：第一次结算时加载结果框、胜负氛围和关卡过渡。

`ArtResourceManager` 对 Texture2D 和 SpriteFrame 统一缓存，并合并同 key 并发请求；每种主表只切片一次，全部单位共享帧数组。VFX 使用上限 28、池上限 36 的对象池。当前游戏使用单一常驻场景，标题资源保留引用以支持立即返回标题；重新开始和下一关会清理单位、临时 VFX 和旧过渡节点，不重复创建共享纹理。

## 11. 功能与回归测试

### 浏览器显示与资源

- 最新独立预览端口全量初载：标题缓存 6 项，0 失败
- 点击挑战后战斗缓存：57 项，0 失败
- 中/大/巨按需后：八种单位全部 `artAnimator=true`
- 暂停、战术、结果按需组：全部目标 key 加载成功
- 正式中文字体：加载成功；无缺字错误（真机仍需检查）
- 失败恢复 UI：失败数可见，重试/占位继续均可操作；选择占位后标题正常显示

### 四路和八单位

- 同时生成小/中/大/巨羊与对应狼各 1：8/8 正式动画、8/8 正式徽章
- 四条道路：4/4 正式道路、4/4 玩家入口、4/4 AI入口、4/4补给点
- 道路编号移至 `LANE_TOP_Y - 78`，正式入口不会遮挡 1/2/3/4
- 单位均从原固定出生点生成，根节点边界与队列函数未改

### 合法容量压力测试

- 构造四路各玩家 3 + AI 3：同屏合法峰值 24
- 90 秒加速逻辑结算：无重叠、无越界、无前后排错位
- 最大无进展时间：0.3 秒
- 四路 `recoveryCount`：`[0,0,0,0]`
- 控制台 lane 警告：0
- 规则限制使 40 个同屏存活不可达；10 分钟循环覆盖的累计单位生命周期超过 40

### 三关完整流程

自动玩家按真实能量/容量规则运行：

- 第 1 关：正常结束，玩家基地 100，AI 基地 0，四路恢复 0
- 第 2 关：正常结束，玩家基地 100，AI 基地 0，四路恢复 0
- 第 3 关：正常结束，玩家基地 0，AI 基地 100，四路恢复 0

胜利、失败、重开、下一关、返回选关、暂停、玩法说明和继续均独立验证。下一关后 `currentLevel=2`、旧单位 0、战斗恢复，ModalLayer 始终最后渲染。

### 战术与突破

- 全线冲刺、战地急救、领地震荡：逻辑效果正常，三组正式 VFX 均按需加载
- 基地突破：真实基地血量扣减，breakthrough/base_hit VFX 播放
- 暂停 2.2 秒：单位位置完全一致；部署 VFX 冻结；继续后恢复

## 12. 10 分钟真实时长性能测试

环境：Edge headless，1280×720，Cocos Creator 浏览器预览，实际每秒按玩家规则尝试出兵。

| 指标 | 结果 |
|---|---:|
| 观察时长 | 600 秒 |
| FPS | 预览统计保持 60 |
| JS 堆首值（10s） | 68,613,278 bytes |
| JS 堆末值（600s） | 68,328,287 bytes |
| JS 堆首尾变化 | -284,991 bytes |
| JS 堆峰值 | 94,896,263 bytes |
| 纹理内存稳定值 | 约 193.7 MB |
| 节点峰值 | 430 |
| 单位（含 dying）峰值 | 9 |
| 活跃 VFX 峰值 | 20（低于 28 上限） |
| Draw Call 峰值 | 140 |
| 控制台错误 | 0 |
| 控制台警告 | 0 |
| 四路恢复次数 | `[0,0,0,0]` |

纹理内存在中/大/巨角色首次出现后上升，并在约 120 秒后稳定；JS 堆没有随时间单调上涨，未发现明显内存泄漏。

## 13. P0/P1 修复记录

- 修复标题正式 Splash 覆盖 Logo 的 sibling 顺序问题。
- 为亮色标题背景增加半透明可读性层，恢复标题说明可读性。
- 将道路编号下移，避免被 AI 正式入口遮挡。
- 将结果战报文字改为深色系，避免正式羊皮纸面板上的低对比度。
- 四路入口状态改为独立索引数组，避免共享第 1 路状态。
- 正式资源加载失败只影响单项，并保留 Graphics 回退。

当前无已知 P0/P1。

## 14. P2/P3 已知问题

详见：`ART_KNOWN_ISSUES_v1.2.0-dev-art05.md`。

主要包括角色素材视角、暂停标题留白、卡牌文字对比度、纹理内存/Draw Call 真机优化空间，以及合法同屏单位上限为 24。

## 15. 安全确认

- 未修改 `GAME_VERSION`，仍为 `v1.2.0-dev`
- 未修改 `definition.radius`
- 未修改单位速度、血量、伤害、费用、能量、补给或战术数值
- 未修改 `LANE_X`、`LANE_WIDTH`、出生点、突破点或道路安全边界
- 未修改队列容量、队列间距、追赶、接触、AI或关卡难度
- 未直接编辑 `build`、`build/wechatgame`、`library` 或 `temp`
- 未提交 Git、未创建标签

## 16. 结论

全部 83 项运行美术资源已进入正式目录并建立映射；四条道路与八种单位全部可用；暂停和结算层级正常；浏览器全流程、三关、战术、突破、模式回退和 10 分钟持续运行未发现逻辑回归或 P0/P1 问题。

建议进入微信开发者工具与真机测试，重点关注：

1. 低内存安卓机的约 193.7 MB 纹理峰值；
2. 微信横屏刘海/胶囊安全区；
3. 中文字体缺字与 19.5:9 裁切；
4. 角色素材朝向的主观辨识；
5. Draw Call 峰值 140 在目标机型上的实际 FPS。
