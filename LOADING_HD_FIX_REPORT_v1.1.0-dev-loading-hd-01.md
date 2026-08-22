# 加载界面高清立绘修复报告

- 游戏：羊狼四线战
- 实际内部版本：`v1.2.0-dev`
- 目标公开版本：`1.1.0`
- 开发批次：`v1.1.0-dev-loading-hd-01`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`（工作区在本批前已存在其他未提交美术、音频与配置改动；本批未覆盖它们）

## 结论

加载界面的角色模糊来自两个只有 `256×256` 的旧加载吉祥物贴图在 `218×218` 设计像素显示；自动裁切后，羊和狼的实际有效内容分别仅约 `200×210`、`183×210` 像素。它们在 DPR 2/3 屏幕上不足以提供清晰采样。旧资源不是运行中的战斗动画帧，也没有发现非等比拉伸；其根本问题是源分辨率和有效内容不足。

现已改为项目内既有的高分辨率角色设定图提取出的专用、透明 `512×512` 加载立绘，加载节点保持相同的 `236×236` 逻辑显示尺寸，运行时呼吸动画也始终以相同 X/Y 倍率缩放。浏览器运行时确认加载的是两个 `512×512` SpriteFrame，DPR 1/2/3 均无变形、请求失败、404、控制台 Error 或 Warning。

## 修改前后资源

| 角色 | 修改前引用与尺寸 | 修改后引用与尺寸 | 运行时显示 |
| --- | --- | --- | --- |
| 小羊 | `assets/art/branding/loading/loading_mascot_sheep_v02.png`，256×256，70,194 B；裁切内容 200×210 | `assets/art/branding/loading/characters/loading_sheep_hd_v01.png`，512×512 RGBA，237,374 B；裁切内容 426×456 | 236×236 设计像素，中心 `(-155, 30)` |
| 小狼 | `assets/art/branding/loading/loading_mascot_wolf_v02.png`，256×256，60,165 B；裁切内容 183×210 | `assets/art/branding/loading/characters/loading_wolf_hd_v01.png`，512×512 RGBA，209,883 B；裁切内容 389×456 | 236×236 设计像素，中心 `(155, 30)` |

新立绘源自现有角色设定图，而非对低清吉祥物进行放大：

- 小羊源图：`art_source/characters/sheep/small/reference/small_sheep_model_sheet_v01.png`（1254×1254）
- 小狼源图：`art_source/characters/wolf/small/reference/small_wolf_model_sheet_v01.png`（1254×1254）

两张源图的角色造型与项目中现有角色一致：白色蓬松小羊、蓝眼睛、叶片与蓝绿色围巾；橙红色小狼、奶油色脸胸、红色围巾与爪印徽章。新文件总计 447,257 B，低于 1 MiB，且每张低于 500 KB。

## 显示与纹理处理

- 移除了旧的 `LoadingMascotStage` 大面积半透明圆角底板；仅保留两个低调椭圆地面阴影（138×26，Y=`-75`）。
- 新图片为独立透明 PNG，主体高度超过画布的 75%，角色脚底在同一视觉基线；没有文字、水印、白底或黑色矩形。
- `Battle.scene` 使用 Cocos 自动导入生成的 SpriteFrame UUID 绑定新资源；没有手工伪造 UUID。
- 生成的 Cocos 3.8 `.meta`：`minfilter=linear`、`magfilter=linear`、`mipfilter=none`、`packable=false`、`fixAlphaTransparencyArtifacts=true`、透明通道保留。
- Cocos 3.8 本次生成的 image meta 没有单独的 `Max Size` 字段。Web 构建后的原生图片仍分别为 512×512 RGBA，证明本构建未将它们降为 256 或 128。
- 构建后的 Web 原生文件分别为 289,826 B（小羊）和 268,413 B（小狼），均为 PNG；未发生有损 JPEG/WebP 转码。
- 没有给角色节点单独设置宽高比例。保留的呼吸动画通过 `setScale(scale, scale, 1)` 做统一等比缩放。

## 验证结果

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| TypeScript | 通过 | Creator 3.8.8 TypeScript，`--noEmit --skipLibCheck --project tsconfig.json` |
| Cocos Web Mobile 正式参数构建 | 通过 | `art_source/qa/loading-hd-01/builds/web-mobile/`；构建日志记录为 Finished |
| 浏览器 1280×720 | 通过 | 新立绘清晰、等比、未遮挡进度条和提示文字 |
| DPR 1 / 2 / 3 | 通过 | 自动运行时审计读取两个 512×512 SpriteFrame，显示尺寸均为 236×236，X/Y 缩放相等 |
| 透明边缘 | 通过目视检查 | 预览中未见白边、黑边、透明杂点或大面积色块 |
| 加载 UI 既有提示与进度节点 | 通过 | 进度与提示 Label 保持存在；未改动加载进度计算或提示逻辑 |
| 控制台 / 请求 | 通过 | 自动测试：0 Error、0 Warning、0 request failed、0 HTTP 404 |

运行时审计：`art_source/qa/loading-hd-01/screenshots/runtime/loading_hd_01_runtime_audit.json`。

修改前后局部对比（左为旧资源、右为新资源）：

`art_source/qa/loading-hd-01/screenshots/runtime/loading_mascots_before_after_crop.png`

完整截图：

- 修改前：`art_source/qa/loading-hd-01/screenshots/runtime/loading_before_1280x720_dpr1.png`
- 修改后：`art_source/qa/loading-hd-01/screenshots/runtime/loading_after_1280x720_dpr1.png`
- 修改后 DPR 2：`art_source/qa/loading-hd-01/screenshots/runtime/loading_after_1280x720_dpr2.png`
- 修改后 DPR 3：`art_source/qa/loading-hd-01/screenshots/runtime/loading_after_1280x720_dpr3.png`

## 微信小游戏构建与包体

已准备正式构建配置：`tools/qa/loading_hd_01_wechat_build_config.json`，其中 `appid=wxfbd176abc5b3911c`、`orientation=landscapeRight`、`debug=false`、`sourceMaps=false`。

本机当前已有 Cocos Creator 编辑器实例占用项目。两次 CLI 构建调用均被该实例接管，但没有进入 Builder 队列：没有产生本批 `art_source/qa/loading-hd-01/builds/wechatgame/game.json`，也没有新增 wechatgame 构建日志。因此**不能将之前的微信包当作本次构建成功**，本项仍待在已打开的 Cocos Creator 内按上述配置执行一次正式构建。

可用于复核的旧包基线（`level04-02`，不包含本次改动）：主包 4,037,379 B，全部本地包 20,227,410 B。Web 构建中，新旧加载贴图原生输出差额为 +427,880 B（558,239 B 对 130,359 B）；这只是同一资源流水线下的预估增量，不能代替本批微信包的实际包体核算。

## 本批文件

- `assets/scripts/GameController.ts`
- `assets/scenes/Battle.scene`
- `assets/art/branding/loading/characters/loading_sheep_hd_v01.png`
- `assets/art/branding/loading/characters/loading_sheep_hd_v01.png.meta`
- `assets/art/branding/loading/characters/loading_wolf_hd_v01.png`
- `assets/art/branding/loading/characters/loading_wolf_hd_v01.png.meta`
- `tools/qa/loading_hd_01_web_build_config.json`
- `tools/qa/loading_hd_01_wechat_build_config.json`
- `tools/qa/validate_loading_hd_01.mjs`
- `art_source/qa/loading-hd-01/screenshots/`（构建与验收产物）
- 本报告

未修改游戏版本、玩法、单位数值、关卡逻辑、战斗逻辑、构建产物目录、`library` 或 `temp`；未上传微信、未提审、未创建 Git 提交或标签。

## 仍需人工验收

1. 在 Cocos Creator 中用本批 WeChat 正式配置重新构建，确认输出目录、包体和产物中两张 PNG 都保持 512×512。
2. 在微信开发者工具横屏预览，确认不会出现微信平台二次压缩、动态图集或透明边缘问题。
3. 至少一台 DPR 2/3 真机横屏确认：小羊眼睛、羊毛与围巾；小狼眼睛、耳朵、毛发和徽章均清晰；没有先模糊后变清晰的闪变。
4. 从冷启动观察至 100% 并进入标题界面，确认进度条和加载提示保持原有逻辑、没有黑屏延长。

微信开发者工具与真机的上述两项未在本轮环境中冒充为已通过。
