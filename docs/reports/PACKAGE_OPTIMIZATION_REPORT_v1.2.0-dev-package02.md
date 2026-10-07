# 羊狼四线战微信小游戏包体优化报告

- 项目：`D:\GameProjects\WolfSheepBattle`
- 当前真实版本：`v1.2.0-dev`（本轮未修改）
- Git 分支：`master`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 引擎：Cocos Creator 3.8.8
- 审计日期：2026-08-03
- 范围：引擎模块裁剪、主包加载资源优化、战场道路纹理优化、正式参数重建与验证

## 1. 结论

本轮包体目标已经达到：

| 指标 | 优化前 | 优化后 | 减少 | 验收线 | 结果 |
|---|---:|---:|---:|---:|---|
| 主包 | 4,512,444 B / 4.303 MiB | 2,696,086 B / 2.571 MiB | 1,816,358 B / 1.732 MiB | ≤ 3.8 MiB | PASS |
| 全部本地包 | 20,723,839 B / 19.764 MiB | 17,663,744 B / 16.845 MiB | 3,060,095 B / 2.919 MiB | ≤ 19.0 MiB | PASS |

优化后主包距 3.8 MiB 验收线仍有约 1.229 MiB 余量；全部本地包距 19.0 MiB 验收线仍有约 2.155 MiB 余量，也低于建议的 18.5 MiB。

## 2. 优化后分包大小

| 包 | 字节 | MiB |
|---|---:|---:|
| 主包 | 2,696,086 | 2.571 |
| `art_boot` | 1,000,751 | 0.954 |
| `art_battlefield` | 3,141,174 | 2.996 |
| `art_units` | 3,077,206 | 2.935 |
| `art_ui` | 2,874,935 | 2.742 |
| `art_vfx` | 2,118,338 | 2.020 |
| `audio_bgm` | 2,755,254 | 2.628 |
| 合计 | 17,663,744 | 16.845 |

`art_battlefield` 从 4,384,911 B（4.182 MiB）下降到 3,141,174 B（2.996 MiB）。其余分包内容本轮未降质或拆分。

## 3. 引擎模块裁剪

源码审计未发现以下实际引用：`sp.Skeleton`、`SkeletonData`、DragonBones、2D/3D 物理碰撞组件、粒子系统、TiledMap、VideoPlayer、WebView、3D Mesh/Model。

通过 `settings/v2/packages/engine.json` 的 Cocos 引擎模块配置关闭：

- Spine 3.8 / Spine 4.2；
- DragonBones；
- 3D、3D 物理和 2D 物理/Box2D；
- 2D/3D 粒子；
- Animation、RichText、Profiler；
- Video、WebView、TiledMap；
- WebGL2（保留 WebGL）。

保留的运行必需模块：`base`、`2d`、`ui`、`graphics`、`mask`、`tween`、`audio`、`affine-transform`、`intersection-2d`、`gfx-webgl`、`custom-pipeline`。

新构建验证：

- `.wasm` 文件数量：0；
- 文件名包含 Spine：0；
- 文件名包含 DragonBones：0；
- Box2D/物理运行库文件：0；
- `cocos-js/cc.js`：1,409,069 B；
- 原包约 205 KiB 的 Spine wasm 已不再生成。

压缩后的 `cc.js` 仍包含引擎通用字符串 `spine`/`dragonBones`（效果名与兼容正则），但不包含对应运行模块、加载脚本或 wasm，不能将通用字符串误判为模块仍被打包。

## 4. 资源优化

| 源资源 | 优化前 | 优化后 | 减少 |
|---|---:|---:|---:|
| `loading_sheep_hd_v01.png` | 237,374 B | 69,554 B | 70.7% |
| `loading_wolf_hd_v01.png` | 209,883 B | 63,783 B | 69.6% |
| `loading_bg_meadow_v02.jpg` | 214,281 B | 140,711 B | 34.3% |
| `loading_ui_font_cn_v01.ttf` | 144,952 B | 33,072 B | 77.2% |
| `road_lane_01_runtime_v01.png` | 547,354 B | 227,731 B | 58.4% |
| `road_lane_02_runtime_v01.png` | 527,317 B | 220,532 B | 58.2% |
| `road_lane_03_runtime_v01.png` | 527,287 B | 218,751 B | 58.5% |
| `road_lane_04_runtime_v01.png` | 534,570 B | 225,762 B | 57.8% |

处理说明：

- 小羊/小狼仍为 512×512 透明 PNG，保留完整半透明边缘；节点仍以 236×236 等比显示。采用高质量索引 PNG，未放大低清图。
- 加载背景仍为 1600×720 JPEG，采用 mozjpeg 质量 82；与原图对比 PSNR 38.32 dB，浏览器截图未见明显色块或文字模糊。
- 加载字体按加载界面真实文案制作子集，包含全部所需中文、数字、英文和标点，共 196 个码点；缺字检查为 0。
- 四条道路保持 360×1030 尺寸、透明通道、整数像素网格和运行时引用不变，仅优化编码。
- 两首 BGM 已是 44.1 kHz、112 kbps MP3，本轮未继续降低码率，避免可感知音质损失。
- 删除运行时源资源：0 项。所有优化前原文件均复制归档到 `art_source/_archive/runtime_pre_package02/`，未永久删除。
- 未改动任何 UUID；未手写或复制伪造 `.meta`。两张加载角色仅关闭会让索引 PNG 被重新膨胀的 `fixAlphaTransparencyArtifacts`，Filter 仍为 LINEAR，Mipmap 仍关闭。

## 5. 构建参数与结构验证

Cocos Creator 3.8.8 正式参数构建成功，日志包含 `build Task (wechatgame) Finished`。

- Debug：关闭；
- Source Maps：关闭；构建中 `.map` 数量为 0；
- AppID：`wxfbd176abc5b3911c`；
- 启动场景：`Battle.scene`；
- 横屏方向：`landscapeRight`；
- 分包声明：6 个；
- 调试文件：0；
- 未直接编辑原项目 `build/wechatgame`。

为避免覆盖用户正在使用的构建目录，本轮从当前源项目快照调用 Cocos Creator 生成优化包，再将完整生成结果归档到：

`D:\GameProjects\WolfSheepBattle\art_source\qa\package02\builds\wechatgame`

该目录位于 `assets` 外，不会被再次打入游戏包。

隔离构建环境产生了 GPU 缓存目录权限噪声，且 Cocos/Babel 对超大 `GameController.ts` 输出过“deoptimised styling”提示；两者均未中断构建，构建任务最终成功，不是游戏运行错误。

## 6. 运行验证

### TypeScript

使用 Cocos Creator 3.8.8 自带 TypeScript 对 `assets/scripts/**/*.ts` 执行检查：PASS，0 error。

### 浏览器运行

自动运行审计：PASS。

- 加载界面小羊/小狼均为 512×512 源图，236×236 等比显示；
- 加载字体、进度、提示文字均正常；
- `art_boot`、`art_battlefield`、`art_units`、`art_ui`、`art_vfx` 全部加载；
- 1～5 关均可选择；
- 五张战术牌、暂停/继续、胜利结算、两首 BGM 注册正常；
- 控制台新增 Error：0；Warning：0；404：0；请求失败：0。

证据：

- `art_source/qa/package02/screenshots/package02_loading_1280x720.png`
- `art_source/qa/package02/screenshots/package02_runtime_1280x720.png`
- `art_source/qa/package02/screenshots/package02_runtime_audit.json`

### 微信开发者工具与上传

本轮已完成微信包结构、AppID、分包、正式构建参数和包体限制的静态验证，具备导入微信开发者工具并执行上传的包体前提。

未执行微信版本上传。当前开发者工具会话正在打开原项目旧 `build/wechatgame`，命令行尝试另开优化包时被现有会话占用；没有关闭用户现有工具会话，也没有把优化包上传到微信后台。因此不能把本报告表述为“已完成微信官方上传验证”。请使用上述归档包在微信开发者工具中完成一次导入、编译、预览及上传前包体分析。

## 7. 实际修改文件

源项目：

- `settings/v2/packages/engine.json`
- `assets/art/branding/loading/characters/loading_sheep_hd_v01.png`
- `assets/art/branding/loading/characters/loading_sheep_hd_v01.png.meta`
- `assets/art/branding/loading/characters/loading_wolf_hd_v01.png`
- `assets/art/branding/loading/characters/loading_wolf_hd_v01.png.meta`
- `assets/art/branding/loading/loading_bg_meadow_v02.jpg`
- `assets/art/branding/loading/loading_ui_font_cn_v01.ttf`
- `assets/bundles/art_battlefield/battlefield/roads/road_lane_01_runtime_v01.png`
- `assets/bundles/art_battlefield/battlefield/roads/road_lane_02_runtime_v01.png`
- `assets/bundles/art_battlefield/battlefield/roads/road_lane_03_runtime_v01.png`
- `assets/bundles/art_battlefield/battlefield/roads/road_lane_04_runtime_v01.png`

QA/构建辅助：

- `tools/qa/subset_loading_font.py`
- `tools/qa/package02_web_build_config.json`
- `tools/qa/package02_wechat_build_config.json`
- `tools/qa/validate_package02_runtime.mjs`
- `art_source/_archive/runtime_pre_package02/`
- `art_source/qa/package02/`
- `PACKAGE_OPTIMIZATION_REPORT_v1.2.0-dev-package02.md`

未修改战斗玩法、关卡数据、UI逻辑、运行时音频、版本号或现有 `build` 目录。

## 8. 尚需人工真机验证

1. 微信开发者工具导入归档包并确认包体分析与本报告一致；
2. 清缓存后的首次启动和六个分包加载；
3. 真机检查加载小羊/小狼透明边缘、背景层次和字体完整性；
4. 进入 1～5 关、重新开始、返回主菜单；
5. 战术牌、暂停、胜负界面和两首 BGM；
6. 最终点击上传前再次确认分包限制和平台侧校验信息。

## 9. 版本与 Git

- 当前版本仍为 `v1.2.0-dev`；
- 未执行 Git 提交；
- 未创建标签；
- 未推送远程；
- 未上传微信平台；
- 用户此前未提交工作区修改全部保留。
