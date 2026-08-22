# 《羊狼四线战》关卡选择与 BGM 文字字重统一实施报告

- 实施批次：`v1.3.0-dev-ui05`
- 实施日期：2026-08-18
- 项目：`D:\GameProjects\WolfSheepBattle`
- 引擎：Cocos Creator 3.8.8
- 结论：源码、字体子集、Web/微信小游戏构建和浏览器运行时验收已完成；微信开发者工具、真机和线上版本未验证。

## 1. 修改前基线与补丁编号

- 分支：`master`
- HEAD：`f9e29dda89887123d8035c264964842e83d5cecc`
- HEAD 标签：无
- `git describe`：`v1.1.4-6-gf9e29dd-dirty`
- 修改前运行源码版本：`v1.3.0-dev-share01`
- 修改后运行源码版本：`v1.3.0-dev-ui05`
- 发布身份文档 `RELEASE_IDENTITY.md`、`tools/release/release_identity.json` 仍为 `ui04`，本任务未越权修改这些既有用户资产。

编号依据：修改前定向扫描只发现 `ui02`、`ui03`、`ui04`，未发现任何 `v1.3.0-dev-ui05` 或更高 UI 补丁；上一轮微信分享补丁为独立序列 `share01`。因此采用未占用的 `v1.3.0-dev-ui05`。

工作区修改前已经存在大量未提交内容，`GameController.ts` 也是巨量脏文件。本次只在现有文件上做定点增量修改；未回滚、覆盖或重新格式化用户差异。上一轮 `WeChatShareManager.ts` 及其 `.meta` 的最终 SHA-256 与修改前一致。

## 2. 真实根因

1. 旧运行字体 `ui_font_cn_subset_runtime_v02.ttf` 是静态 `weight=700`，即便 Label 设置 `isBold=false`，常规正文仍会以粗字形渲染；`isBold=true` 又会产生额外的合成加粗，层级粗细失真。
2. 旧字体 cmap 只有 558 个字符，目标两处界面文案合计缺 31 个汉字。缺字时会回退系统字体，导致同一个 Label 内出现不同字体/字重。
3. BGM 区域标题、卡片标题、状态文字原本都按常规字重创建；异步正式样式函数还会再次把区域标题覆盖为常规字重。
4. 关卡分页按钮、页码、操作按钮，以及音乐/音效控制的初始样式散落设置，异步字体加载前后存在属性漂移风险。
5. 运行时刷新函数本身只需要改字符串、颜色和图形；不应在状态切换时重写字体属性。

## 3. 实施内容

### 3.1 目标界面的统一文字角色

在 `GameController.ts` 内新增局部 `TargetTypographyRole` 和集中样式表，只覆盖本任务的关卡选择、BGM 卡片和音量控制 Label。每个角色一次性设置 font、useSystemFont、fontSize、lineHeight、isBold、颜色、描边、阴影、overflow、wrap、对齐方式；未重构全局 UI 系统。

正式字体异步加载完成后，先保留项目原有全局字体行为，再仅对已登记的目标 Label 重放 UI05 角色，保证目标界面不会残留系统字体。刷新路径仍只改变文案/颜色/选中图形，不改变排版签名。

### 3.2 最终样式对照表

| 信息角色 | 字号/行高 | 字重 | Overflow/换行 | 效果 |
|---|---:|---|---|---|
| 关卡主标题 | 36/45 | 整行粗体 | CLAMP/不换行 | 统一描边与阴影 |
| 关卡说明 | 16/20 | 整句常规 | SHRINK/不换行 | 无描边、无阴影 |
| 六张卡片标题 | 22/28 | 整行粗体 | SHRINK/不换行 | 六卡相同 |
| 六张卡片描述 | 15/20 | 整段常规 | CLAMP/允许换行 | 六卡相同 |
| 六张卡片状态 | 16/20 | 整行粗体 | SHRINK/不换行 | 状态只改颜色/图形 |
| 上一页/下一页/页码 | 18/23 | 整行粗体 | SHRINK/不换行 | 三者相同 |
| 通关进度 | 16/20 | 整行常规 | SHRINK/不换行 | 左对齐 |
| 当前选择提示 | 13/16 | 整行常规 | SHRINK/不换行 | 右对齐 |
| 返回主菜单 | 22/28 | 整行粗体 | SHRINK/不换行 | 禁用只改颜色/透明度 |
| 开始挑战 | 24/30 | 整行粗体 | SHRINK/不换行 | 文案刷新不改字重 |
| BGM 区域标题 | 22/27 | 整行粗体 | SHRINK/不换行 | 左对齐 |
| BGM 辅助说明 | 14/18 | 整句常规 | SHRINK/不换行 | 右对齐 |
| 两张 BGM 卡片标题 | 18/23 | 整行粗体 | CLAMP/不换行 | 两卡相同 |
| 两张 BGM 风格说明 | 14/18 | 整行常规 | SHRINK/不换行 | 两卡相同 |
| 两张 BGM 来源 | 12/15 | 整行常规 | SHRINK/不换行 | 两卡相同 |
| 两张 BGM 状态/勾选 | 13/16 | 整行粗体 | SHRINK/不换行 | 选中只改状态图形/颜色 |
| 音乐/音效标题 | 18/23 | 整行粗体 | SHRINK/不换行 | 两行相同 |
| 音量百分比 | 18/23 | 整行粗体 | SHRINK/不换行 | 两行相同 |
| 加/减按钮 | 20/24 | 整行粗体 | SHRINK/不换行 | 两行相同 |

所有目标角色都使用同一个正式字体 UUID `61237121-3cb1-4260-b41c-30f8c42bd7f0`、`useSystemFont=false`。源码与运行时都未发现 RichText；没有把一句话拆成不同字重的多个片段。

## 4. 字体覆盖与许可

新子集仅从项目现有、哈希已确认的授权源字体生成：

- 源字体：`tmp/art03/font_source/NotoSansSC-VF.ttf`
- 源字体 SHA-256：`A3041811A78C361B1DE50F953C805E0244951C21C5BD412F7232EF0D899AF0DA`
- 许可：SIL Open Font License 1.1
- 固定字重：400 Regular
- 新运行字体：`ui_font_cn_subset_runtime_ui05_regular.ttf`
- 新字体大小：203,092 bytes
- 新字体 SHA-256：`4E25F28AEF14E7C3E00841AD4F103E4D54D9E9D943CB5E2730162254BFD206A0`
- 请求字符数：596
- 最终 cmap：597
- 两处目标界面唯一字符：197
- 新字体全量缺字：0
- 新字体目标文案缺字：0
- 生成器重复执行两次：输出哈希一致

旧字体目标文案缺少 31 字：

`判变听围定律愈抗按改断旋暖替格治温激烈热登绕考转适金钮页频风黄`

没有下载或引入网络字体，也没有把不同字体家族的字形拼接进同一文件。`fontTools` 仅作为构建工具安装在隔离的 Codex 验证目录，未写入项目依赖。

## 5. 修改文件清单

### 源码与运行资产

- `assets/scripts/GameController.ts`：版本号、目标文字角色、目标字体加载与最小调用点。
- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_ui05_regular.ttf`：新 400 字重运行字体。
- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_ui05_regular.ttf.meta`：Cocos 字体元数据，UUID 如上。
- `art_source/ui/fonts/ui_font_cn_subset_ui05_regular.ttf`：可追溯源产物副本。
- `art_source/ui/fonts/ui_font_cn_subset_ui05_regular_LICENSE.txt`：字体来源、哈希及 OFL 许可。
- `THIRD_PARTY_LICENSES/ui_font_cn_subset_ui05_regular_LICENSE.txt`：正式第三方许可副本。

### 可重复构建与 QA

- `tools/art_pipeline/build_ui_font_subset_ui05.py`：从既有授权源确定性生成 400 字重子集。
- `art_source/qa/ui05-typography/font_subset_audit_ui05.json`：旧/新字体权重、cmap、缺字及哈希审计。
- `tools/qa/validate_ui05_typography.mjs`：浏览器运行时 Label 属性与刷新稳定性验收。
- `tools/qa/ui05_web_build_config.json`：隔离 Web 输出 `build/web-mobile-ui05`。
- `tools/qa/ui05_wechat_build_config.json`：隔离微信输出 `build/wechatgame-ui05`。
- `release_evidence/v1.3.0-dev-ui05/browser-1280/`：1280×720 三张截图及运行时审计 JSON。
- `release_evidence/v1.3.0-dev-ui05/browser-1024x720/`：较窄横屏三张截图及运行时审计 JSON。
- `TYPOGRAPHY_UI_REPORT_v1.3.0-dev-ui05.md`：本报告。

`build/`、`temp/`、`library/` 未作为源码修改；构建结果只用于本地验证。

## 6. 构建与验证结果

### 静态/编译

- Cocos Creator 3.8.8 内置 TypeScript：`tsc --noEmit --skipLibCheck true`，退出码 0。
- `node --check tools/qa/validate_ui05_typography.mjs`：退出码 0。
- `git diff --check -- assets/scripts/GameController.ts`：退出码 0。
- UI05 字体审计 JSON：可解析，旧字体目标缺 31 字，新字体目标缺 0 字。
- 微信分享管理器源码与 `.meta` 哈希保持不变；微信构建仍含 `showShareMenu`、`onShareAppMessage`，不含 `shareTimeline`。

### Cocos Creator 3.8.8 构建

逻辑命令：

```powershell
& 'C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe' --project 'D:\GameProjects\WolfSheepBattle' --build 'configPath=D:\GameProjects\WolfSheepBattle\tools\qa\ui05_web_build_config.json'
& 'C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe' --project 'D:\GameProjects\WolfSheepBattle' --build 'configPath=D:\GameProjects\WolfSheepBattle\tools\qa\ui05_wechat_build_config.json'
```

- Web：Creator 成功码 36，日志以 `build Task (web-mobile-ui05) Finished` 结束；438 个文件，18,004,017 bytes，source map 0。
- 微信小游戏：Creator 成功码 36，日志以 `build Task (wechatgame-ui05) Finished` 结束；443 个文件，17,901,868 bytes，source map 0。
- 微信包：AppID `wxfbd176abc5b3911c`，`compileType=game`，`landscapeRight`，项目名 `WolfSheepBattle-v1.3.0-dev-ui05-wechat`。
- 微信包内新字体哈希与源码完全一致。

非阻断告警：已有 Creator 进程占用 `temp/logs/project.log` 和 GPU cache，CLI stderr 出现 EPERM/cache 告警；`GameController.ts` 超过 500 KB，Babel 报 styling deoptimised。两次构建均完整 Finished，产物和运行时验证正常；该大文件维护风险是既有问题，本任务未做无关拆分。

### 浏览器运行时

Web 构建经本地 HTTP 服务启动后，使用 Edge/Playwright 在 1280×720 和 1024×720 各执行一次真实 Cocos 场景审计：

- 两次 `passed=true`，17/17 断言通过。
- 49 个角色绑定，47 个当前可见目标 Label 被逐项读取。
- 每个目标 Label 的完整文字、font UUID/name、useSystemFont、fontSize、actualFontSize、lineHeight、isBold、outline、shadow、overflow、wrap、对齐、节点缩放均记录在审计 JSON。
- 6 个关卡标题、6 个描述、6 个状态的同类属性一致。
- 2 个 BGM 卡片的 Title/Subtitle/Auxiliary/Status 对应属性一致。
- 音乐/音效两行标题、百分比、加减按钮对应属性一致。
- 连续执行 10 次关卡/BGM/音量刷新后，排版签名不变。
- RichText 数量 0；目标字体均为新 UUID，`useSystemFont=false`；实际字号等于配置字号，节点缩放均为 1。
- 无未预期 console warning/error，无请求失败。

### 截图与视觉验收

- `release_evidence/v1.3.0-dev-ui05/browser-1280/1280x720-level-page1.png`
- `release_evidence/v1.3.0-dev-ui05/browser-1280/1280x720-level-page2.png`
- `release_evidence/v1.3.0-dev-ui05/browser-1280/1280x720-pause-bgm-panel.png`
- `release_evidence/v1.3.0-dev-ui05/browser-1024x720/1024x720-level-page1.png`
- `release_evidence/v1.3.0-dev-ui05/browser-1024x720/1024x720-level-page2.png`
- `release_evidence/v1.3.0-dev-ui05/browser-1024x720/1024x720-pause-bgm-panel.png`

六张图均在正式字体 UUID 已加载后截取。逐图复核结果：指定完整句子、卡片标题、换行描述、BGM 标题/说明/来源/状态没有字符忽粗忽细或系统回退；未见裁切、重叠、贴边或异常缩小。较窄横屏由现有适配器整体缩放，文字层级保持一致。

### 平台验证边界

- Cocos Creator 3.8.8 TypeScript 编译：已验证，通过。
- Cocos Creator 3.8.8 Web 构建：已验证，通过。
- Cocos Creator 3.8.8 微信小游戏构建：已验证，通过。
- 浏览器运行时/Cocos Web 构建预览：已验证，通过。
- Cocos 编辑器内手工预览：未单独验证。
- 微信开发者工具：未验证。工具已安装且已有进程，但当前会话没有可用的桌面操作接口；CLI 要求开启持久服务端口，本任务未更改该安全设置。
- 微信真机：未验证。
- 线上微信小游戏：未验证。

不能仅凭本地编译和浏览器截图宣称微信真机字体效果已经完全验证。

## 7. 遗留风险

1. `RELEASE_IDENTITY.md` 与 `tools/release/release_identity.json` 仍为 `ui04`，与当前运行源码 `ui05` 不一致；它们是修改前已有的未跟踪用户资产，且不在本次允许范围内。
2. 微信开发者工具、真机和线上环境仍需后续人工验收，重点看微信字体渲染、不同 DPI 和分包加载时序。
3. `GameController.ts` 已超过 500 KB，Creator/Babel 会给出非阻断优化告警；拆分属于后续独立重构，不应混入字体补丁。
4. 工作区原本存在大量未提交修改；后续提交前必须按任务文件清单定点复核，不能整体暂存。

## 8. 最终 Git 状态

最终封账时分支仍为 `master`，HEAD 仍为 `f9e29dda89887123d8035c264964842e83d5cecc`，HEAD 无标签，暂存区为空，仓库无 remote。

```text
## master
 M THIRD_PARTY_AUDIO.md
 D assets/audio/resources/battle_bgm.wav
 D assets/audio/resources/battle_bgm.wav.meta
 D assets/resources/audio/bgm.meta
 D assets/resources/audio/bgm/bgm_cheerful_lighthearted.mp3
 D assets/resources/audio/bgm/bgm_cheerful_lighthearted.mp3.meta
 D assets/resources/audio/bgm/bgm_cyberwave_upbeat.mp3
 D assets/resources/audio/bgm/bgm_cyberwave_upbeat.mp3.meta
 M assets/scenes/Battle.scene
 M assets/scripts/AudioManager.ts
 M assets/scripts/GameController.ts
 M settings/v2/packages/builder.json
 M settings/v2/packages/cocos-service.json
 M settings/v2/packages/engine.json
 M settings/v2/packages/information.json
 M tsconfig.json
?? ART_ASSET_CHECKLIST.md
?? ART_FULL_QA_REPORT_v1.2.0-dev-art06.md
?? ART_INTEGRATION_REPORT_v1.2.0-dev-art04-pilot.md
?? ART_INTEGRATION_REPORT_v1.2.0-dev-art05-fullfill.md
?? ART_KNOWN_ISSUES_v1.2.0-dev-art05.md
?? BGM_LEVELSELECT_REPORT_v1.3.0-dev-ui02.md
?? BGM_PANEL_UI_REPORT_v1.3.0-dev-ui03.md
?? CARTOON_BATTLEFIELD_REPORT_v1.2.0-dev-art09-02.md
?? LEVEL04_DEVELOPMENT_REPORT_v1.1.0-dev-level04-01.md
?? LEVEL04_DEVELOPMENT_REPORT_v1.1.0-dev-level04-02.md
?? LEVEL05_UI02_REPORT_v1.2.0-dev.md
?? LEVEL06_IMPLEMENTATION_REPORT_v1.3.0-dev-level06.md
?? LEVEL_FREE_UNIT_BADGE_REPORT_v1.2.0-dev-level-free-unit-badge-01.md
?? LEVEL_SELECT_POLISH_REPORT_v1.2.0-dev-art10-ui-clarity06.md
?? LOADING_HD_FIX_REPORT_v1.1.0-dev-loading-hd-01.md
?? LOADING_SCREEN_POLISH_REPORT_v1.2.0-dev-art11-loading01.md
?? MAINMENU_UI_REPORT_v1.2.0-dev-mainmenu-ui01.md
?? MOBILE_FINAL_POLISH_REPORT_v1.2.0-dev-mobilefix01.md
?? OPTIMIZATION_REPORT_v1.3.0-dev-opt01.md
?? PACKAGE_FILE_AUDIT_v1.2.0-dev-art07.csv
?? PACKAGE_OPTIMIZATION_REPORT_v1.2.0-dev-art07.md
?? PACKAGE_OPTIMIZATION_REPORT_v1.2.0-dev-package02.md
?? RELEASE_IDENTITY.md
?? RELEASE_IDENTITY_AUDIO_AUDIT_v1.2.0-dev-release01.md
?? SELECTION_CONFIRM_REPORT_v1.2.0-dev-selection-confirm-01.md
?? TACTIC_CARD_ART_MAPPING_REPORT_v1.2.0-dev-art10-ui-clarity04.md
?? TACTIC_CARD_LAYOUT_REPORT_v1.2.0-dev-art10-ui-clarity03.md
?? TACTIC_CARD_POLISH_REPORT_v1.2.0-dev-art10-ui-clarity02.md
?? TACTIC_DYNAMIC_COLOR_REPORT_v1.2.0-dev-art10-ui-clarity05.md
?? TACTIC_LOADOUT_ART_REPORT_v1.2.0-dev-tactic-loadout-art-01.md
?? THIRD_PARTY_LICENSES/
?? TYPOGRAPHY_UI_REPORT_v1.3.0-dev-ui05.md
?? UI_CLARITY_REPORT_v1.2.0-dev-art10-ui-clarity01.md
?? VICTORY_RESULT_UI_REPORT_v1.2.0-dev-victory-result-ui-01.md
?? VISUAL_POLISH_REPORT_v1.2.0-dev-art08-01.md
?? VISUAL_POLISH_REPORT_v1.2.0-dev-art08-02.md
?? VISUAL_POLISH_REPORT_v1.2.0-dev-art08-03.md
?? VISUAL_POLISH_REPORT_v1.2.0-dev-art08-04.md
?? VISUAL_POLISH_REPORT_v1.2.0-dev-art08-05.md
?? art_source/
?? assets/art.meta
?? assets/art/
?? assets/bundles.meta
?? assets/bundles/
?? assets/resources/art.meta
?? assets/scripts/WeChatShareManager.ts
?? assets/scripts/WeChatShareManager.ts.meta
?? assets/scripts/art.meta
?? assets/scripts/art/
?? assets/scripts/ui.meta
?? assets/scripts/ui/
?? release_assets/
?? release_evidence/
?? release_materials/
?? tmp/
?? tools/
```

## 9. 未执行的外部动作

本任务未提交、未打标签、未推送、未上传微信版本、未提交审核、未发布，也未修改微信后台或开发者工具安全设置。
