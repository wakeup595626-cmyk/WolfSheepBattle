# 羊狼四线战 v1.2.0-dev-art08-visual-polish02 验收报告

## 1. 范围与版本

- 项目：`D:\GameProjects\WolfSheepBattle`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 游戏版本：`v1.2.0-dev`（未修改）
- 本轮没有创建 Git 提交或标签。
- 未改动 `UNIT_DEFINITIONS`、`LEVEL_CONFIGS`、`definition.radius`、道路容量、出生、排队、战斗、AI、胜负和资源加载顺序。
- 未直接编辑 `build`、`library` 或 `temp` 中的生成文件。

## 2. 四类问题的原因与处理

### 2.1 暂停界面

原因：旧实现同时绘制了 680×690 深蓝代码卡片与 650×650 正式羊皮纸，形成“大黑框包小面板”；四个操作按钮纵向堆叠，双 BGM 大块按钮和两个 580×84 深色音量块又从羊皮纸正文区向外溢出。

处理：

- `PausePanel` 现在只负责 1280×720 半透明全屏遮罩和触摸拦截。
- 新增单一 `PauseContent`，逻辑尺寸 760×650，正式羊皮纸显示 740×650；正式资源加载后关闭代码卡片底图。
- 标题 36px 深棕色，副标题 16px 灰棕色。
- 四个功能按钮统一使用 `ButtonSecondary`，按 2×2 网格排列：中心 x = -132 / 132，y = 170 / 116，尺寸 248×46。
- BGM 改为单行“背景音乐｜左箭头｜当前曲目｜右箭头”，最终尺寸 520×60，y = 38。
- 音乐、音效各为一条浅色横向控制行，最终尺寸 520×66，y = -68 / -150；音乐使用柔和蓝紫，音效使用青绿色。
- `PausePanel` 仍在 `ModalLayer`，暂停/继续/帮助/返回逻辑未改。

### 2.2 出兵提示条层级和位置

原因：提示原来属于 `HudLayer`，后创建的出兵入口节点可能覆盖它；y = -184 又与底部入口的上沿过近。

处理：

- 顶层顺序固定为：`BattleLayer < HudLayer < ToastLayer < ModalLayer`。
- `StatusToast` 和战术公告迁入独立 `ToastLayer`；每次显示提示或 Modal 时重新确认 siblingIndex。
- 提示尺寸保持 540×60，x = -90。
- y 改为通过底部 HUD 基线计算：`PLAYER_HUD_Y + BASE_BAR_HEIGHT / 2 + 112 = -148`，较上一版上移 36 设计像素。
- 入口中心 y = -216、高 52，因此提示底边 -178 与入口顶边 -190 之间保留 12px；提示不再与入口、玩家基地条或底部卡牌相交。
- 仍只复用一个提示节点；新提示停止旧 Tween、更新文字并重新计时。

### 2.3 兵种卡状态

原因：旧逻辑把“被选中”和“能量足够”混在同一高亮条件中，并且点卡片时无条件修改 `selectedSheepType`，因此能量不足的卡仍可能看起来可用。

处理：

- 建立唯一优先级：`locked -> insufficient -> available -> selected -> pressed`。
- 因优先级先判断 `insufficient`，已选兵种在当前能量不足时也不会保留可用高亮或勾选。
- 能量不足：正式卡整体降亮、等级徽章降亮、右下显示深红棕色“能量不足”。
- 可用：正常亮度、右下“可用”。
- 选中：只有这一态显示勾选和高亮边框，右下“已选择”。
- 按下：仅触摸期间缩放到 0.98 并轻微变色，松开恢复。
- 点击能量不足的卡仅显示 `能量不足，还需N点`，不切换兵种、不扣能量、不播放 `deploy_failed`；保留普通 UI 点击音效。

### 2.4 俯视 2.5D 战场

原因：旧背景包含天空、远景地平线和完整建筑，同时四张竖直道路贴图叠加在同一画面，战场像“风景插画上贴四块面板”；单位缺少统一接地阴影和轻微纵深关系。

处理：

- 新增可逆配置：
  - `BATTLEFIELD_VISUAL_MODE = 'topdown_v02'`（默认）
  - 可改回 `legacy_v01` 立即恢复旧背景与四张道路贴图。
- `topdown_v02` 使用单张 1280×720 俯视草地，四条泥土道路已融合到同一地面，中心严格对应设计坐标 x = -495 / -225 / 45 / 315（屏幕 x = 145 / 415 / 685 / 955）。
- 画面不含天空、地平线、远山、角色、UI、文字或基地。
- 新增共享柔边椭圆地面阴影，运行时仅 128×64；每个单位出生时创建一次 Shadow 子节点，按小/中/大/巨使用 36×14、44×17、54×20、66×24。
- 单位纵深仅作用于 `VisualNode` 和阴影：道路底部约 1.03，顶部约 0.94；`UnitRoot`、逻辑坐标、碰撞半径和 `HealthUI` 不缩放。
- 单位渲染顺序按 y 仅调整 siblingIndex，逻辑 `queueOrder` 不变。最大 24 个活动单位下，该排序成本很小。

## 3. 节点层级

```text
GameLayer
├─ BattleLayer
│  ├─ BattlefieldBackground
│  ├─ LaneVisuals
│  ├─ BasesAndSpawnGates
│  └─ UnitsAndVfx
├─ HudLayer
├─ ToastLayer
└─ ModalLayer
```

玩家出兵入口仍保留在 `HudLayer` 以维持原触摸逻辑；正式单位、血条和特效在 `UnitsAndVfx`，Toast 永远位于 HUD 之上、Modal 之下。

## 4. 新增美术与生成记录

### ImageGen 最终提示词

> Using the supplied current battlefield image only as a color and healing-cartoon style reference, create a brand-new 1280×720 landscape battlefield ground seen from a high 60-degree top-down 2.5D angle. No sky, no horizon, no distant mountains, no buildings, no bases, no characters, no UI, no text. Integrate exactly four parallel vertical dirt lanes into one continuous grassy terrain, with calm low-detail grass at the far right for a functional sidebar. Keep the lane centers visually aligned for x = 145, 415, 685, 955 in a 1280-wide canvas. Warm soft lighting, hand-painted casual mobile game style, clear ground texture without overpowering units.

- ImageGen 内置生成结果：`<CODEX_HOME>\generated_images\019f9fa3-c8c0-7813-9a96-4089df662072\exec-229ce1f8-dc5e-4d9d-8490-6c5f3a4cce44.png`
- 校准后的高质量源图：`art_source/battlefield/backgrounds/battlefield_ground_topdown_v02.png`，1280×720，1,320,192 bytes。
- 运行时地面：`assets/bundles/art_battlefield/battlefield/backgrounds/battlefield_ground_topdown_runtime_v01.jpg`，1280×720，263,969 bytes，JPEG q89 4:4:4。
- 阴影源图：`art_source/characters/shared/unit_ground_shadow_v01.png`，256×128，5,524 bytes。
- 运行时阴影：`assets/bundles/art_units/characters/shared/unit_ground_shadow_runtime_v01.png`，128×64，10,146 bytes。
- 两个运行时资源的 `.meta` 均由 Cocos Creator 3.8.8 于 2026-07-28 21:04 自动导入生成，没有手写 UUID。

## 5. 修改文件

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`
- `assets/bundles/art_battlefield/battlefield/backgrounds/battlefield_ground_topdown_runtime_v01.jpg` 及 Creator 生成的 `.meta`
- `assets/bundles/art_units/characters/shared/unit_ground_shadow_runtime_v01.png` 及 Creator 生成的 `.meta`
- `art_source/battlefield/backgrounds/battlefield_ground_topdown_v02.png`
- `art_source/characters/shared/unit_ground_shadow_v01.png`
- `tools/art_pipeline/build_topdown_preview.py`
- `tools/qa/capture_art08_preview.mjs`
- `art_source/qa/art08-02/*`（前后对比和验收截图）
- 本报告。

## 6. 浏览器验证

使用当前 Creator 预览服务 `http://localhost:7456`，通过本地无头 Chromium 自动点击并截图。

- 1280×720 Canvas：通过。
- 1800×720 宽屏窗口：Canvas 保持 16:9 居中，HUD、四路和侧栏没有越界。
- 标题 -> 第 1 关 -> 教学确认 -> 战斗：通过。
- 选巨羊 -> 第 4 路出兵 -> 能量下降 -> 巨羊固定从底部入口生成：通过。
- 再点巨羊：显示 `能量不足，还需33点`；巨羊卡和大羊卡降亮且不显示选中高亮：通过。
- 单位在融合道路中移动，Shadow 跟随 `UnitRoot`，没有改变根节点逻辑位置：通过。
- 点击暂停：单一羊皮纸主面板覆盖战场，背景点击被 Modal 拦截；四个操作按钮为 2×2：通过。
- 点击继续后切换宽屏：通过。
- 浏览器 `console` warning/error/pageerror：0。

截图：

- 修改前战斗：`art_source/qa/art08-02/before_battle_1280x720.png`
- 修改前暂停：`art_source/qa/art08-02/before_pause_1280x720.png`
- 修改后战斗：`art_source/qa/art08-02/after_battle_1280x720.png`
- 出兵/阴影：`art_source/qa/art08-02/after_unit_shadow_1280x720.png`
- 能量不足卡牌和提示：`art_source/qa/art08-02/after_insufficient_1280x720.png`
- 修改后暂停：`art_source/qa/art08-02/after_pause_1280x720.png`
- 宽屏：`art_source/qa/art08-02/after_battle_wide_1800x720.png`

说明：完成截图后，源码又将 BGM/音量行从 600px 收窄为 520px，并将箭头字符改为字体子集稳定支持的 `<` / `>`。由于当前已打开的 Creator 预览服务没有再次刷新外部修改后的脚本块，最后这项 80px 收窄由 TypeScript 与坐标检查确认，需在 Creator 重新预览后补一张最终暂停图。

## 7. TypeScript 与微信构建

### TypeScript

- 使用 Cocos Creator 3.8.8 随附 TypeScript，对全部 `assets/scripts` 目标执行 `noEmit + skipLibCheck` 定向检查。
- 结果：通过，退出码 0。
- Cocos 引擎声明自身的全量项目检查仍有历史声明冲突，因此采用与上一批相同的源码定向检查口径。

### 微信小游戏构建

- 已尝试两次用 Cocos Creator 3.8.8 官方 CLI 正式参数构建（WeChat Mini Game、Debug OFF、Source Maps OFF），并额外尝试独立 `user-data-dir` 的隔离验证工程。
- 当前工程已有一个可见 Creator 实例占用项目；新 CLI 实例完成资源导入但始终没有进入 Builder 日志阶段。为保护用户当前打开的工程，没有关闭现有 Creator，也没有手工修改 `build`。
- 官方文档确认 Creator CLI 仍依赖 GUI 环境；隔离实例也被全局单实例机制转交给当前编辑器。因此本轮不能如实声明“最新源码微信构建成功”；现有 `build/wechatgame` 仍是 2026-07-28 20:27 的上一轮正式构建基线。
- 当前构建基线：主包 3,370,159 bytes（3.214 MiB），全部本地包 18,899,000 bytes（18.023 MiB）。
- 两个新运行时资源都在本地分包，合计 274,115 bytes（0.261 MiB）。按未压缩文件上限估算，新总包约 18.285 MiB，主包预计仍为 3.214 MiB；分别低于 4 MiB 和 30 MiB 限制。最终数字必须以 Creator 内重新构建后的包体分析为准。

建议人工操作：在当前已打开的 Creator 中进入“项目 -> 构建发布”，选择 WeChat Mini Game，确认 Debug 和 Source Maps 关闭，点击“构建”。构建完成后再运行一次包体审计。

## 8. 回归保护结论

- 没有修改单位速度、生命、伤害、费用、AI、关卡难度、战术效果、能量/补给规则。
- 没有修改 `definition.radius`、固定出生点、道路边界、容量、`queueOrder` 或道路状态机。
- `UnitRoot` 仍只承担逻辑坐标；2.5D 缩放、行走动画和阴影只在视觉子节点。
- 血条仍是独立 `HealthUI`，未随纵深缩放。
- 浏览器验证未出现卡路、瞬移、越界、错误出生或新控制台错误。
- 当前状态具备用户进行 Creator 重新预览和微信真机视觉验收的条件；正式微信构建结果仍需补验。

## 9. 尚需人工真机检查

1. Creator 重新预览后确认暂停页最终 520px 音频行及 `<` / `>` 箭头。
2. 微信真机确认顶部安全区、右上胶囊与暂停按钮无冲突。
3. 连续切换两首 BGM，确认暂停页选择行触控面积。
4. 四路同时 24 单位时确认阴影、深度排序和帧率。
5. 正式微信构建后复核主包、全部分包和资源 404。
