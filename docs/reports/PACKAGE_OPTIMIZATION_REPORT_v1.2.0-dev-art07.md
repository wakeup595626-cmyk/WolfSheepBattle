# 羊狼四线战 v1.2.0-dev-art07 微信包体优化报告

- 批次：`v1.2.0-dev-art07-package01`
- 项目：`D:\GameProjects\WolfSheepBattle`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 游戏版本：`v1.2.0-dev`（未修改）
- 结论：主包和全部本地包均达到本轮硬性与建议目标；当前不需要远程 Asset Bundle。
- 版本管理：本轮未提交 Git、未创建标签。

## 1. 优化前后包体对比

| 指标 | 优化前 art06 | 优化后 art07 | 变化 |
|---|---:|---:|---:|
| 微信小游戏全部本地文件 | 59,442,567 B / 56.689 MiB | 18,894,943 B / 18.020 MiB | -40,547,624 B / -68.21% |
| 主包 | 59,442,567 B / 56.689 MiB（未分包） | 3,366,102 B / 3.210 MiB | 达到 `< 4 MiB`，并低于 3.5 MiB 建议线 |
| 本地分包合计 | 0 | 15,528,841 B / 14.810 MiB | 6 个本地分包 |
| `assets` 构建资源 | 约 54.026 MiB | 分散到主包与分包，合计见下表 | 不再整体进入主包 |
| PNG | 48.993 MiB | 11.371 MiB | 透明资源保留 PNG，按显示尺寸派生/无损优化 |
| MP3 | 3.956 MiB | 2.626 MiB | 44.1 kHz、立体声、112 kbps |
| JS | 2.635 MiB | 2.639 MiB | 基本不变；分包加载逻辑仅增加少量代码 |
| WAV | 0.557 MiB | 0.220 MiB | 移除未使用的旧 `battle_bgm.wav`，保留 11 个 SFX |
| JPG | 0 | 0.630 MiB | 4 张不透明大背景改为真正重编码的 JPEG |
| JSON | 0.230 MiB | 0.214 MiB | Bundle 清单/导入数据 |
| WASM | 0.196 MiB | 0.196 MiB | 不变 |
| TTF | 0.117 MiB | 0.117 MiB | 不变 |

阈值占用：主包占 4 MiB 上限的 80.25%；全部本地包占 30 MiB 上限的 60.07%，仍有约 11.98 MiB 硬性余量。

### 最终主包与分包

| 包 | 字节 | MiB | 内容 |
|---|---:|---:|---|
| MAIN | 3,366,102 | 3.210 | 引擎、场景、脚本、基础 SFX |
| `art_boot` | 933,123 | 0.890 | Splash、加载背景、Logo、最小字体/加载 UI |
| `art_battlefield` | 3,593,271 | 3.427 | 战场背景、四路、基地、出兵入口、补给点 |
| `art_units` | 3,066,068 | 2.924 | 八种单位、单位卡、血条与档位徽章 |
| `art_ui` | 3,062,787 | 2.921 | HUD、战术牌、暂停/结算/通用 UI |
| `art_vfx` | 2,118,338 | 2.020 | 战斗、战术、胜负与关卡过渡 VFX |
| `audio_bgm` | 2,755,254 | 2.628 | 两首发布用 BGM |
| **合计** | **18,894,943** | **18.020** | **满足 `< 30 MiB`，也低于 25 MiB 建议线** |

`build/wechatgame/game.json` 由 Cocos Creator 自动生成 6 条 `subpackages` 声明；未手工编辑构建结果。横屏仍为 `landscapeRight`，Debug 与 Source Maps 关闭，构建中 `.map` 文件数量为 0。

## 2. 精确包体审计

逐文件来源、原始/运行时尺寸、大小、透明性、最大显示尺寸、场景与首屏需求已输出到：

- `PACKAGE_FILE_AUDIT_v1.2.0-dev-art07.csv`
- 共 312 条构建文件记录，262 条可映射到源资源/编译源。

### 优化前最大 30 项

这是 art06 构建审计与随后归档的原始运行时文件复核结果；MiB 按原始字节计算。

| # | 资源 | 字节 | MiB |
|---:|---|---:|---:|
| 1 | Splash PNG | 7,095,547 | 6.767 |
| 2 | 加载背景 PNG | 6,574,786 | 6.270 |
| 3 | 关卡过渡背景 PNG | 6,418,261 | 6.121 |
| 4 | Logo 徽章 PNG | 3,727,505 | 3.555 |
| 5 | Cocos 引擎 JS | 2,366,556 | 2.257 |
| 6 | 轻松欢快 BGM | 2,143,295 | 2.044 |
| 7 | Logo 字标 PNG | 2,016,767 | 1.923 |
| 8 | 赛博欢乐 BGM | 2,004,532 | 1.912 |
| 9 | 战场背景 PNG | 1,795,799 | 1.713 |
| 10 | 结算面板 PNG | 1,275,601 | 1.217 |
| 11 | 关卡过渡擦除表 PNG | 1,222,351 | 1.166 |
| 12 | 暂停面板 PNG | 1,119,189 | 1.067 |
| 13 | 胜利徽标 PNG | 914,141 | 0.872 |
| 14 | 失败徽标 PNG | 852,730 | 0.813 |
| 15 | 第 1 路 PNG | 547,354 | 0.522 |
| 16 | 第 4 路 PNG | 534,570 | 0.510 |
| 17 | 第 2 路 PNG | 527,317 | 0.503 |
| 18 | 第 3 路 PNG | 527,287 | 0.503 |
| 19 | 巨羊表 PNG | 522,971 | 0.499 |
| 20 | AI 基地 PNG | 491,537 | 0.469 |
| 21 | 巨狼表 PNG | 484,893 | 0.462 |
| 22 | 玩家基地 PNG | 454,588 | 0.434 |
| 23 | 玩家出生门状态 PNG | 431,659 | 0.412 |
| 24 | AI 出生门状态 PNG | 430,636 | 0.411 |
| 25 | 震荡战术牌 PNG | 418,956 | 0.400 |
| 26 | 大羊表 PNG | 408,802 | 0.390 |
| 27 | 急救战术牌 PNG | 394,555 | 0.376 |
| 28 | 冲刺战术牌 PNG | 392,462 | 0.374 |
| 29 | 胜利覆盖层 PNG | 367,512 | 0.350 |
| 30 | 大狼表 PNG | 359,305 | 0.343 |

### 优化后最大 30 项

| # | 包 | 构建文件/资源 | 字节 | MiB |
|---:|---|---|---:|---:|
| 1 | MAIN | Cocos 引擎 JS | 2,366,556 | 2.257 |
| 2 | audio_bgm | 轻松欢快 BGM | 1,876,157 | 1.789 |
| 3 | audio_bgm | 赛博欢乐 BGM | 877,757 | 0.837 |
| 4 | art_ui | 暂停面板 | 626,387 | 0.597 |
| 5 | art_ui | 结算面板 | 616,740 | 0.588 |
| 6 | art_battlefield | 第 1 路 | 547,354 | 0.522 |
| 7 | art_battlefield | 第 4 路 | 534,570 | 0.510 |
| 8 | art_battlefield | 第 2 路 | 527,317 | 0.503 |
| 9 | art_battlefield | 第 3 路 | 527,287 | 0.503 |
| 10 | art_units | 巨羊表 | 522,971 | 0.499 |
| 11 | art_battlefield | AI 基地 | 491,537 | 0.469 |
| 12 | art_units | 巨狼表 | 484,893 | 0.462 |
| 13 | art_battlefield | 玩家基地 | 454,588 | 0.434 |
| 14 | art_units | 大羊表 | 408,802 | 0.390 |
| 15 | art_vfx | 关卡过渡擦除表 | 401,042 | 0.382 |
| 16 | art_vfx | 胜利覆盖层 | 367,512 | 0.350 |
| 17 | art_units | 大狼表 | 359,305 | 0.343 |
| 18 | art_boot | Logo 字标 | 296,604 | 0.283 |
| 19 | art_units | 中狼表 | 257,333 | 0.245 |
| 20 | art_units | 中羊表 | 247,680 | 0.236 |
| 21 | art_vfx | 失败覆盖层 | 230,522 | 0.220 |
| 22 | art_units | 小狼表 | 221,483 | 0.211 |
| 23 | MAIN | Spine WASM | 205,175 | 0.196 |
| 24 | art_units | 小羊表 | 196,060 | 0.187 |
| 25 | art_boot | Splash JPEG | 190,731 | 0.182 |
| 26 | art_ui | AI 基地血条框 | 168,977 | 0.161 |
| 27 | MAIN | 编译后的游戏脚本 | 165,566 | 0.158 |
| 28 | art_boot | 加载背景 JPEG | 165,221 | 0.158 |
| 29 | art_vfx | 关卡过渡背景 JPEG | 157,738 | 0.150 |
| 30 | art_ui | 公告条 | 157,143 | 0.150 |

## 3. 资源优化方式与压缩比例

85 项正式资源从 52,063,936 B 派生为 15,435,243 B（29.65%，减少 70.35%）。高质量原图均保留在 `art_source`，运行时派生资源统一带 `_runtime_v01`。

| Bundle | 项数 | 原始字节 | 运行时字节 | 保留比例 | 主要处理 |
|---|---:|---:|---:|---:|---|
| art_boot | 7 | 19,816,970 | 925,568 | 4.67% | 1280×720 JPEG q88、Logo 按显示尺寸缩放 PNG、字体保留 |
| art_battlefield | 10 | 6,090,060 | 3,581,674 | 58.81% | 背景 JPEG q88；道路/基地透明 PNG 无损优化 |
| art_units | 19 | 3,399,593 | 3,045,132 | 89.57% | 八张角色主表保持原分辨率；UI/徽章按显示尺寸优化 |
| art_ui | 28 | 6,336,567 | 3,032,211 | 47.85% | 不透明/透明语义保留；大面板适度缩放、PNG 优化 |
| art_vfx | 19 | 12,272,919 | 2,096,744 | 17.08% | 过渡背景 JPEG；VFX 表保持整数网格并同步运行时切片配置 |
| audio_bgm | 2 | 4,147,827 | 2,753,914 | 66.39% | MP3 44.1 kHz、立体声、112 kbps |

重点资源：

- Splash：7,095,547 → 190,731 B（1280×720 JPEG q88）。
- 加载背景：6,574,786 → 165,221 B（1280×720 JPEG q88）。
- 关卡过渡背景：6,418,261 → 157,738 B（1280×720 JPEG q88）。
- Logo 徽章：3,727,505 → 59,514 B（1536×1536 → 192×192 透明 PNG）。
- Logo 字标：2,016,767 → 296,604 B（2048×1024 → 660×330 透明 PNG）。
- 两首 BGM：4,147,827 → 2,753,914 B。

JPEG 与透明资源自动校验：78 项透明资源、25 项网格资源全部通过；无黑底、错误透明、尺寸/网格破坏。JPEG 与原图 PSNR：战场 37.73 dB、加载 36.44 dB、Splash 35.21 dB、关卡过渡 36.60 dB。两首 BGM 完整解码通过，参数均为 44.1 kHz/立体声/112 kbps。

## 4. Pilot 与非运行时资源迁移

- `assets/resources/art/pilot` 中 18 张 PNG（归档目录含 meta/说明共 45 文件、3,608,333 B）已迁移到 `art_source/_archive/runtime_pilot_art04/`。
- art05 原正式运行时目录迁移到 `art_source/_archive/runtime_full_art05_pre_art07/`；原 BGM 归档到 `art_source/_archive/audio_bgm_source_v120/`；未使用的旧 WAV 归档到 `art_source/_archive/audio_legacy_bgm_v120/`。
- `assets` 中不再存在 Pilot 运行时路径；最终微信包无 `pilot`、`art_source`、`_archive`、GIF、PSD 命中。
- 发布模式仅为 `full`；资源键或 Bundle 加载失败时由原 `Graphics` 轻量绘制路径回退，不再依赖 Pilot PNG。
- 代码中的 `ArtPilot*` 名称是为避免高风险重命名留下的内部兼容标识，不再表示 Pilot 资源路径。

## 5. Bundle 目录、配置与加载顺序

运行时目录：

```text
assets/bundles/
├─ art_boot/
├─ art_battlefield/
├─ art_units/
├─ art_ui/
├─ art_vfx/
└─ audio_bgm/
```

6 个 Bundle 根目录由 Cocos Creator 导入并生成 `.meta`，均配置 `isBundle: true`，名称与目录一致；优先级 7→2。`settings/v2/packages/builder.json` 中的 `art07LocalSubpackage` 对小游戏平台采用 `subpackage`，Web/Native 采用 `merge_dep`。最终验证构建刻意未传入临时 `bundleConfigs`，仍成功生成 6 个分包，证明项目源配置有效。

加载顺序：

1. 首屏按需加载 `art_boot`，任何失败均保留轻量标题/加载提示。
2. 开始战斗后加载 `art_battlefield`。
3. 加载 `art_units` 与 `art_ui`。
4. 按战斗/结算需要加载 `art_vfx`。
5. 玩家操作激活音频后按需加载 `audio_bgm`。

`ArtResourceManager` 继续作为唯一美术资源管理器，使用 `assetManager.loadBundle` + `bundle.load`；Bundle、纹理、字体均有缓存和并发请求合并，失败记录支持重试。`AudioManager` 使用相同的 Bundle 缓存/请求合并策略，正式 BGM 始终保持单实例逻辑。没有复制第二套资源管理器。

## 6. 源码、资源与配置变更

本批次直接涉及：

- `assets/scripts/art/ArtPilotConfig.ts`：full-only 发布配置、Bundle 映射、runtime 路径与切片尺寸。
- `assets/scripts/art/ArtResourceManager.ts`：自定义 Bundle 加载、缓存、并发合并、失败重试、字体加载。
- `assets/scripts/AudioManager.ts`：`audio_bgm` Bundle 加载、缓存与失败回退。
- `assets/scripts/GameController.ts`：使用 Bundle 字体/美术加载进度与轻量失败提示；未修改玩法常量。
- `assets/scenes/Battle.scene`：移除未使用的旧 `battle_bgm.wav` 场景直连依赖。
- `settings/v2/packages/builder.json`：小游戏自定义本地分包配置。
- `assets/bundles/**` 及其 Creator 自动生成的 `.meta`：85 项运行时派生资源。
- `art_source/_archive/**`：保留迁出的 Pilot、art05 正式资源、原 BGM 与旧 WAV。
- `tools/art_pipeline/build_runtime_bundles.py`：可重复的派生构建脚本。
- `tools/art_pipeline/validate_runtime_bundles.py`：透明、网格、JPEG 画质校验。
- `tools/art_pipeline/audit_wechat_package.py`：最终构建逐文件映射审计。
- `PACKAGE_FILE_AUDIT_v1.2.0-dev-art07.csv`：完整逐文件审计。

`settings/v2/packages/cocos-service.json` 和 art06 前已存在的其他未提交内容保持原状，不作为本批次功能改动归因。没有修改 `build`、`library`、`temp` 内的生成文件；`build/wechatgame` 由 Cocos Creator 3.8.8 重新生成。

## 7. 画质与运行时验证

### 浏览器正式构建

- Web-Mobile 正式构建可进入标题、选关与战斗，6 个 Bundle 均成功加载。
- 四种玩家单位可生成，正式角色、道路、基地、暂停、胜利、失败资源实际显示；未回退到全局 Graphics 占位。
- 自动流程覆盖：第 1 关胜利→第 2 关、失败→重开、第 2 关胜利→第 3 关、第 3 关胜利→返回标题。
- 暂停检查：能量变化 0、单位位置变化 0、单位数量不变；继续后恢复。
- 60 秒四路压力运行：`maxStalledSeconds=0.449`、道路恢复计数 0、异常计数 0；没有资源 404、Bundle 重复加载或纹理缺失。唯一 HTTP 404 是测试用静态服务器未提供 `favicon.ico`，与游戏资源无关。
- 正常玩法受玩家全队/AI上限约束，本轮自动压力场景峰值为 8 个同时存活单位；art06 已做过 24/40 单位注入式美术压力测试。本轮未为追求 24 单位而修改容量或玩法。

浏览器内存抽样（字节）：38,530,516 → 42,980,328 → 50,702,228 → 44,662,209 → 47,740,070 → 57,533,470；中途发生回落，60 秒窗口内未见单调持续上涨。Draw Call、GPU 纹理内存和长时真机峰值需在微信开发者工具/真机继续确认。

### 微信小游戏构建

- Cocos Creator 3.8.8 正式构建日志完成 `build Task (wechatgame) Finished`。
- Debug 关闭、Source Maps 关闭；Start Scene 为 `Battle.scene`；横屏 `landscapeRight`。
- 源 Bundle 配置有效，不再出现 `Invalid Bundle config ID` 警告。
- `game.json` 有 6 个本地分包；各包目录和大小与第 1 节一致。
- 包内无 Pilot、高分辨率源图、归档、reference、GIF、审核图或 PSD。
- TypeScript 独立 `noEmit` 检查通过；Cocos 构建脚本编译通过。

受当前桌面会话能力限制，本轮未自动操作微信开发者工具 UI，因此不能把“开发者工具包体分析面板、真机首包下载、刘海屏与弱网重试”误报为已完成；这些项目列入下方人工清单。

## 8. 玩法层保护核验

- 未修改 `UNIT_DEFINITIONS`、`LEVEL_CONFIGS`、`definition.radius`、速度、血量、伤害、费用、道路坐标/容量、出生、排队、接触、死亡、AI、胜负和关卡难度。
- `UnitRoot` 仍负责逻辑坐标/队列，正式动画只作用于 `VisualNode`；`HealthUI` 保持独立。
- 资源尺寸没有用于反推或覆盖逻辑坐标。
- 版本保持 `v1.2.0-dev`。

## 9. 是否需要远程资源服务器

**不需要。** 主包 3.210 MiB `< 4 MiB`，全部本地包 18.020 MiB `< 30 MiB`，且均达到建议线。没有部署远程 Bundle、没有上传文件、没有修改域名或网络配置。

## 10. 尚需用户真机测试

1. 在微信开发者工具执行“详情/代码依赖分析（包体分析）”，复核主包与 6 个分包的工具口径大小。
2. 清缓存后首次进入：确认 `art_boot`、战场、单位/UI、VFX 的加载顺序与进度提示。
3. 第二次进入：确认 Bundle 缓存命中、无重复加载、无白屏。
4. 在弱网/断网条件触发分包失败：确认提示、重试与 Graphics 轻量回退可用；本轮没有部署远程资源。
5. 刘海屏与不同横屏分辨率：检查安全区和触控区域。
6. 真机 24 单位压力测试：记录 FPS、Draw Call、纹理内存、峰值内存与 10 分钟稳定性。
7. 两首 BGM：确认没有爆音、失真和可感知循环断点，前后台/暂停恢复无重复实例。
8. 三关全流程：四路、八单位、暂停、战术、胜负、重开/下一关/返回标题。
9. 对照 `tmp/art07-browser-*.png` 做真机画质确认，重点观察 JPEG 色带、透明边缘和 VFX 网格串帧。

## 11. 最终结论

本轮确认的发布级包体 P1 已解决：在保留正式美术和本地资源方案的前提下，主包与全部本地包均达标；运行时正式美术、Bundle 缓存/重试、浏览器流程和 Creator 微信构建通过。项目可以进入用户微信开发者工具与真机包体验收；在该人工验收完成前，不建议建立 art07 稳定 Git 检查点，也不进入视觉精修。
