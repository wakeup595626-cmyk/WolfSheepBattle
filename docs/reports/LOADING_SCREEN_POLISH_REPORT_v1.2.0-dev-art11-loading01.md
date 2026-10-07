# 《羊狼四线战》正式加载界面精修报告

- 项目：`D:\GameProjects\WolfSheepBattle`
- 主版本：`v1.2.0-dev`（未变更）
- 美术批次：`v1.2.0-dev-art11-loading01`
- 生成日期：2026-07-30
- 结论：源码、资源引用、字体覆盖、真实进度逻辑和离线横屏预览已通过；Cocos 浏览器运行、微信开发者工具及真机三项仍需在对应环境中复验。

## 1. 修改范围

### 源码与场景

| 路径 | 修改内容 |
| --- | --- |
| `assets/scripts/GameController.ts` | 重建正式加载页；加入亮色即时后备背景、标题/副标题动态 Label、双吉祥物呼吸弹跳、真实进度平滑追踪、四条提示淡入淡出、失败重试、100% 后 0.32 秒淡出及横屏 Cover 适配。 |
| `assets/scripts/art/ArtPilotConfig.ts` | 批次更新为 `v1.2.0-dev-art11-loading01`；移除旧加载背景/进度框/吉祥物图对 `art_boot` 子包的运行时预加载依赖。 |
| `assets/scenes/Battle.scene` | 为 `GameController` 序列化绑定 6 个首屏 SpriteFrame 和 1 个首屏中文字体。 |
| `THIRD_PARTY_LICENSES/loading_ui_font_cn_v01_LICENSE.txt` | 新加载字体子集的 Noto Sans SC / OFL 1.1 许可证与生成信息。 |

本批次没有修改玩法、单位数值、队列、关卡、胜负条件或音频授权文件。

## 2. 正式加载资源

资源目录：`assets/art/branding/loading/`

| 资源 | 用途 | 尺寸/格式 | 字节 | SHA-256 |
| --- | --- | --- | ---: | --- |
| `loading_bg_meadow_v02.jpg` | 无文字的清晨草地背景，运行时 Cover 铺满 | 1600×720 JPEG | 214,281 | `36B9271C640BE0D164A3E5C1B80D2A53101EEA6CC223AB45706BE35B580ACC57` |
| `loading_mascot_sheep_v02.png` | 左侧小羊吉祥物 | 256×256 PNG RGBA | 70,194 | `7A7ED02846293A70F901060CC8ACA7FCCE9819D1064BC8AB227A7C9437BC62EE` |
| `loading_mascot_wolf_v02.png` | 右侧小狼吉祥物，面向小羊 | 256×256 PNG RGBA | 60,165 | `E0052459B6F1149A8D0CD0F87C55432BEA86461F00C07B7FDE5E5BE90E279A28` |
| `loading_progress_frame_v02.png` | 羊毛、树叶、狼爪装饰框 | 640×120 PNG RGBA | 50,645 | `CAE663F641C4C13A90EDF67B2C8008A26ED8D1C4D4A8129A74A1575AAA576268` |
| `loading_progress_fill_v02.png` | 薄荷绿至天蓝渐变填充；运行时显示槽 452×26 | 552×28 PNG RGBA | 678 | `1473B735F46635C07507657D9C2623B0A9B21B82CAE6CE94D6D67D7DA242D9D1` |
| `loading_tip_panel_v02.png` | 奶油色小提示底板 | 760×76 PNG RGBA | 8,620 | `851EBD4746ABB6FB0AFE35117050810BAAE4072123383EF254BCCB54194DF95D` |
| `loading_ui_font_cn_v01.ttf` | 首屏中文动态 Label 字体 | TTF，398 个 cmap 字符 | 144,952 | `B7CF76EFE99B56D411C07B92DDF10F3B885D23A4462DFF91B5E60266E3E68549` |

加载页标题没有制作成带字图片；“羊狼四线战”“青青草原四线争夺战”、进度、百分比、提示和错误信息均由 Cocos Label 动态渲染。建议命名中的 `loading_logo_wolfsheep_v02.png` 因此没有创建。

### 新增、复用与替换关系

- 背景为本批次新生成资源，风格参考：
  - `assets/bundles/art_boot/branding/loading/loading_background_runtime_v01.jpg`
  - `assets/bundles/art_battlefield/backgrounds/battlefield/battle_background_runtime_v01.jpg`
- 小羊从 `assets/bundles/art_boot/branding/loading/loading_mascot_sheet_runtime_v01.png` 的正式角色格裁切、放大为首屏专用单图。
- 小狼从 `assets/bundles/art_units/characters/wolf/small/unit_wolf_small_sheet_runtime_v01.png` 的正式角色格裁切并水平转向。
- 进度框复用 `assets/bundles/art_boot/branding/loading/loading_bar_frame_runtime_v01.png`。因为原资源位于启动后才加载的 `art_boot` 子包，为消除循环依赖，仅复制这一张 50,645 字节的小型 UI 纹理到主包。
- 字体从项目已使用的 Noto Sans SC Variable / OFL 源重新生成子集；对 `GameController.ts`、`AudioManager.ts` 和 `Battle.scene` 中 263 个非 ASCII 字符复核，缺字数为 0。
- 旧 `art_boot` 文件未删除；仅取消其作为加载页视觉的运行时预加载定义，避免首屏依赖正在加载的美术 Bundle。

## 3. 首屏可用性与加载逻辑

- 新资源位于 `assets/art/branding/loading`，其祖先目录没有 `isBundle` 配置。
- 6 个 SpriteFrame 和 1 个字体通过 `Battle.scene` 直接序列化引用，属于主场景依赖，在 `GameController.onLoad()` 创建加载页前即可访问。
- `art_boot` 仍保持 `compressionType.default = subpackage`，但加载页不再读取其中的旧背景、旧进度框或旧吉祥物。
- 即使图片导入异常，`LoadingFallbackBackground` 也会立即绘制浅蓝天空、嫩绿草地、暖色阳光和四条淡路；不存在原深蓝色代码后备背景。
- 初次资源加载绑定 `ArtResourceManager.preload(completed, total)`；进入战斗时绑定 `preloadGroups(...)`；重试绑定 `retryFailed(...)`。没有使用虚假计时器推进百分比。
- 真实任务尚未确认完成时，视觉目标最多为 98%；成功回调后才允许目标到 100%。
- 视觉进度采用指数平滑：`visual += (target - visual) × (1 - exp(-7.5 × dt))`，只增不减且不超过目标。
- 进度达到 100% 且目标加载任务完成后，执行 0.32 秒 `quadOut` 淡出；战斗继续回调在淡出结束后触发。
- 提示每 2.5 秒切换，0.18 秒淡出、0.24 秒淡入。
- 失败时停止完成流程，显示失败项目数、网络检查提示、“重新尝试”和“进入基础画面”按钮；重试重新绑定失败队列的真实完成回调。

## 4. 横屏适配截图

以下图片由本批次正式资源、最终字体和代码中的实际布局数值离线渲染，用于源码落地前后的几何与裁切核验；它们不是战斗界面截图。

### 进度五态

![0/25/50/87/100 五态](../../tmp/art11/screenshots/loading_progress_states_contact.png)

- [0%](../../tmp/art11/screenshots/loading_progress_000_1280x720.png)
- [25%](../../tmp/art11/screenshots/loading_progress_025_1280x720.png)
- [50%](../../tmp/art11/screenshots/loading_progress_050_1280x720.png)
- [87%](../../tmp/art11/screenshots/loading_progress_087_1280x720.png)
- [100%](../../tmp/art11/screenshots/loading_progress_100_1280x720.png)

452 像素有效填充槽对应五态宽度分别为 0、113、226、393、452 像素，百分比与填充一致。

### 16:9、18:9、19.5:9、20:9

![横屏比例对照](../../tmp/art11/screenshots/loading_aspect_ratios_contact.png)

- [1280×720 / 16:9](../../tmp/art11/screenshots/loading_ratio_16x9_1280x720.png)
- [1440×720 / 18:9](../../tmp/art11/screenshots/loading_ratio_18x9_1440x720.png)
- [1560×720 / 19.5:9](../../tmp/art11/screenshots/loading_ratio_19_5x9_1560x720.png)
- [1600×720 / 20:9（含右上角胶囊避让审计标记）](../../tmp/art11/screenshots/loading_ratio_20x9_1600x720.png)
- [加载失败与重试状态](../../tmp/art11/screenshots/loading_failure_retry_1280x720.png)

离线检查结果：背景全部 Cover，无黑边和非等比拉伸；标题、角色、进度和提示的包围框均在屏幕内；20:9 右上角胶囊审计框与中央内容无重叠。

## 5. 验收结果

| 项目 | 结果 | 说明 |
| --- | --- | --- |
| TypeScript 独立编译检查 | 通过 | Cocos 3.8.8 TypeScript 编译器，`assets/scripts/**/*.ts`，0 error。 |
| 场景资源 UUID / `.meta` 一致性 | 通过 | 40 项集成检查全部通过。 |
| 字体字符覆盖 | 通过 | 263 个非 ASCII 必需字符，缺失 0。 |
| 0/25/50/87/100 五态 | 通过 | 文字、填充宽度和截图一致。 |
| 平滑进度模型 | 通过 | 60 FPS 模拟中单调、不超目标；任务完成前目标上限 98%。 |
| 加载完成淡出 | 通过（源码/模型） | 模拟从完成信号到 99.9% 阈值约 0.5167 秒，随后淡出 0.32 秒。 |
| 四种横屏比例 | 通过（离线预览） | 16:9、18:9、19.5:9、20:9 均无黑边/拉伸/核心内容越界。 |
| 深蓝临时背景 | 通过（源码检查） | Camera 清屏色为绿色；新加载页有同步亮色 Graphics 后备层。 |
| 失败与重新尝试 | 通过（源码/离线状态） | 有可读提示、真实重试回调和两个选择按钮。 |
| Cocos 浏览器运行预览 | 待复验 | 当前桌面编辑器项目实例被占用，未关闭用户正在运行的编辑器；没有取得可信的运行时截图。 |
| 微信开发者工具横屏预览 | 待复验 | 本机本轮没有可控的微信开发者工具会话。 |
| 真机横屏/旋转/切后台 | 待复验 | 必须由至少一台真实设备完成，未做虚假通过声明。 |
| 运行时 Console 0 Error | 待复验 | 静态编译为 0 error；仍需在浏览器/微信运行时确认。 |

机器可读核验记录：

- `tmp/art11/loading_integration_audit.json`
- `tmp/art11/loading_preview_audit.json`

## 6. 包体变化

按源资源静态统计，新主包加载资源合计 **549,535 字节（约 536.66 KiB）**：

- 图片：404,583 字节；
- 字体：144,952 字节。

许可证文件位于 `THIRD_PARTY_LICENSES`，6,747 字节，不属于运行时 `assets`。

本轮遵守“不要修改 build 目录”，没有执行正式构建，因此不能给出编译、纹理压缩和小游戏分包后的虚假精确差值。现有旧加载资源仍保留在 `art_boot` 子包中；正式构建后的首包净变化应在微信工具复验时记录。

## 7. 已知剩余问题与视觉验收点

1. Cocos 编辑器实际导入、浏览器预览、微信开发者工具和真机需要由下一轮可控运行环境完成。
2. 真机需重点检查横屏旋转、切后台返回、弱网重试、100% 后进入标题页/战斗页及 Console。
3. 离线预览采用 Pillow 复现最终布局，Cocos Label 的字距、抗锯齿和纹理压缩会有轻微差异，应以编辑器/真机为最终视觉准绳。
4. 旧 `art_boot` 加载图仍保留，便于回退；如视觉验收通过，可在后续独立清理批次评估是否归档，当前批次没有删除文件。

## 8. 图像生成记录

- 使用方式：Codex 内置 ImageGen。
- 最终生成原图：`<CODEX_HOME>\generated_images\019fa5a1-e967-71a3-9855-32721b9d6cb3\call_ohIxQiOsmAvFwDJeldjIyN3V.png`
- 项目内优化结果：`assets/art/branding/loading/loading_bg_meadow_v02.jpg`
- 最终提示词：

```text
Use case: stylized-concept
Asset type: production game loading-screen background for a landscape mobile casual game
Input images: Image 1 is the established loading-background style reference; Image 2 is the established four-lane battlefield color and rendering reference
Primary request: create a fresh, healing, cheerful early-morning meadow that visually belongs to the same cute cartoon world, without copying either image literally
Scene/backdrop: soft blue sky, warm sunrise glow, rounded distant green hills, soft forest and tiny cottage silhouettes, fluffy clouds, wildflowers and plush grass; four subtle pale dirt lanes should be only faintly suggested across the meadow as a visual motif
Style/medium: polished hand-painted 2D cartoon game background, rounded shapes, soft painterly shading, clean and premium casual-game finish
Composition/framing: ultra-wide 20:9 landscape; keep the central 60% calm, softly lit and low-contrast for overlaid title, two mascots, progress bar and tips; decorative detail concentrated near far left and far right edges; important scenery stays inside the middle vertical band so a 16:9 crop remains attractive
Lighting/mood: bright gentle morning, warm and comforting, fresh and optimistic
Color palette: tender grass green, sky blue, cream, warm yellow, restrained pastel accents
Constraints: background only; absolutely no characters, animals, UI, progress bars, logos, letters, numbers, signs or readable text; no battle screenshot composition; no black borders; no watermark
Avoid: dark blue fields, science-fiction or neon lines, photorealistic grass, realistic photography, gritty texture, dramatic combat, dark fantasy, sticker collage, excessive central detail
```

## 9. 约束确认

- 未修改 `build` 目录。
- 未上传微信。
- 未创建 Git 标签、提交或暂存。
- 主版本仍为 `v1.2.0-dev`。
- 未修改玩法、数值、队列、单位逻辑、关卡内容或音频授权文件。

