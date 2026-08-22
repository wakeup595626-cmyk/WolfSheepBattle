# BGM 卡片层级清理与字体统一报告

- 批次：`v1.3.0-dev-ui03`
- 项目：`D:\GameProjects\WolfSheepBattle`
- 引擎：Cocos Creator `3.8.8`
- 记录时间：2026-08-10（Asia/Shanghai）

## 1. 修改前基线

- Git 分支：`master`
- Git Commit：`f9e29dda89887123d8035c264964842e83d5cecc`
- 最新提交：`f9e29dd v1.2.0-dev: 强化四档单位辨识与血条等级标识`
- 修改前运行版本：`v1.3.0-dev-ui02`
- 修改后运行版本：`v1.3.0-dev-ui03`
- 工作区在本轮开始前已经是脏工作区；当前 `git status --porcelain` 共 68 项（9 个修改、7 个删除、52 个未跟踪项）。这些历史改动均被保留，未执行 reset、checkout、clean、提交、打标签或推送。
- `build`、`library`、`temp` 未被手工编辑。Creator 快速编译产生的 `temp` 缓存属于引擎自动生成文件，不是手改构建产物。

## 2. 问题根因

### 2.1 两张 BGM 卡片之间的橙绿色残片

真实来源是 `GameController.preparePauseArt()` 仍在 `BgmSelector` 下创建的旧节点：

- 节点名：`BgmSelectorPanelArt`
- 组件：`Sprite`
- 资源键：`ArtPilotResourceKey.BgmSelectorPanel`
- 实际图片：`assets/bundles/art_ui/ui/common/audio/bgm_selector_panel_runtime_v01.png`

该图片是旧版整块 BGM 选择器皮肤，包含橙色木框和绿色叶片装饰。UI02 已经在其上方创建两张新卡片，但旧皮肤仍位于 siblingIndex 0，因此透明中部和两卡间隙会露出旧图案。

本轮没有通过遮盖或透明度规避问题，而是停止创建旧皮肤；若热更新前已有同名节点，则先 `removeFromParent()` 再 `destroy()`，并恢复 `BgmSelector` 自身的 `Graphics` 背景。公共 PNG 和资源映射未删除，避免影响潜在复用界面。

运行时检查确认该区域不存在：

- `BgmSelectorPanelArt`；
- `BgmPreviousButton`；
- `BgmNextButton`；
- `BgmCurrentTrack`；
- 额外 `Sprite`、`Button`、`BlockInputEvents` 或 `RichText`。

### 2.2 字体粗细不一致

暂停界面实际正式字体并不是系统字体，而是：

- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`
- UUID：`4a8bd7ac-693c-4775-b88f-16536c37f7cb`
- 字体内部名称：`Noto Sans SC UI Subset Bold`
- 内建字重：700

`loading_ui_font_cn_v01.ttf` 和当前正式字体均已核对 cmap，均完整覆盖本区标题、说明、来源、状态文字以及 `✓`，因此不是缺字回退造成的混排。真实差异来自同一卡片内标题/状态又启用了 `Label.isBold`，说明/来源没有启用，导致在内建 700 字重之上继续产生局部合成加粗。

本轮所有 BGM 区域文字统一使用同一正式字体、`useSystemFont=false`、`isBold=false`；依靠字体本身的 700 字重、字号和颜色建立层级，避免同一句或同类文字出现二次加粗。未使用系统字体、RichText 加粗标签、叠加 Label、描边或阴影。

## 3. 节点和布局修改

新增唯一专用容器：

```text
BgmSelector
├─ BgmTrackTitle
├─ BgmTrackHint
└─ BgmStyleCards
   ├─ BgmStyle_cheerful_lighthearted
   │  ├─ Title
   │  ├─ Subtitle
   │  ├─ Auxiliary
   │  ├─ Status
   │  ├─ SelectedCheck
   │  └─ TouchArea
   └─ BgmStyle_cyberwave_upbeat
      └─ （同上）
```

- 两卡尺寸：`400 × 54`
- 卡片中心 Y：`33 / -33`
- 垂直可见间距：`12 px`
- 卡片 X、宽度、高度、圆角、边框和内边距完全一致。
- 每卡仅一个 `TouchArea`，尺寸同为 `400 × 54`、局部坐标 `(0,0)`，与可见卡片精确重合。
- 选中与未选中不改变字号、字重、卡片尺寸或位置。
- 选中状态使用浅黄背景、柔和金色边框、完整对勾和“当前使用”。
- 未选中状态使用浅绿/米白背景、弱化边框、不显示对勾并显示“点击试听”。
- 状态区固定为 `64 × 22`，切换时文字不推动其他内容。

## 4. 最终文字规范

| 语义 | 文本 | 字号 | 有效字重 | 颜色/对齐 |
| --- | --- | ---: | --- | --- |
| 区域标题 | 背景音乐风格 | 22 | 字体内建 700，无二次合成 | 深棕，左对齐 |
| 右侧说明 | 点击卡片立即试听并保存 | 13 | 字体内建 700，无二次合成 | 次级棕灰，右对齐 |
| 卡片标题 | 轻松欢快 / 热血对战 | 19 | 字体内建 700，无二次合成 | 深棕，左对齐 |
| 卡片说明 | 两条说明文字 | 14 | 字体内建 700，无二次合成 | 深棕灰，左对齐 |
| 来源 | Ear0 · 欢乐 / Pixabay · Fun Game | 12 | 字体内建 700，无二次合成 | 次级棕色，左对齐 |
| 状态 | 当前使用 / 点击试听 | 13 | 字体内建 700，无二次合成 | 棕金，右对齐 |

运行时检查中所有 Label 的 `actualFontSize` 等于配置字号，未发生 SHRINK 缩小、换行或系统字体回退。

## 5. BGM 功能验证

浏览器运行时自动化结果：

- 连续打开/关闭暂停界面 10 次：每次保持 1 个 `BgmStyleCards`、2 张卡、2 个 `TouchArea`、0 个旧皮肤节点；通过。
- 通过卡片 `TOUCH_END` 事件连续切换 20 次：`selectBgmTrack` 恰好调用 20 次，无重复监听；通过。
- 最终选择 `cyberwave_upbeat`：`selected / desired / current` 三者一致；通过。
- BGM 播放源：始终 1 个 `BgmAudioSource`，最终活动播放源 1 个；无双曲叠播。
- 保存值：`selectedBgmId=cyberwave_upbeat`，音乐音量 `0.42`，音效音量 `0.68`；通过。
- 重新开始、返回标题、打开关卡选择后：选择仍为 `cyberwave_upbeat`；通过。
- 完整页面重载后：曲目和两项音量均恢复；通过。
- 卡片状态：选中卡显示“当前使用”与对勾，未选中卡显示“点击试听”且无对勾；通过。

## 6. 浏览器与尺寸验证

- Creator 浏览器预览 `1280 × 720`：运行版本 `v1.3.0-dev-ui03`，全部 25 项断言通过。
- 手机横屏比例模拟 `844 × 390`：全部 25 项断言通过。
- 视觉截图确认 BGM 卡片之间不再出现橙绿色旧图案，卡片尺寸、间距和文字列对齐一致。
- 本区无 RichText、LabelOutline、LabelShadow、额外 Button、BlockInputEvents 或 Sprite。
- 本轮控制台无音频报错、无请求失败。预览仍会出现项目既有 `LabelOutline.color/width` 弃用提示，来源不在本轮 BGM 面板范围，自动化中单独记录但未伪装成音频问题。

证据：

- `release_evidence/v1.3.0-dev-ui03/browser-1280-final/ui03_bgm_panel_audit.json`
- `release_evidence/v1.3.0-dev-ui03/browser-1280-final/1280x720-pause-bgm-panel.png`
- `release_evidence/v1.3.0-dev-ui03/browser-844x390/ui03_bgm_panel_audit.json`
- `release_evidence/v1.3.0-dev-ui03/browser-844x390/844x390-pause-bgm-panel.png`

## 7. TypeScript 与构建状态

### 已通过

- Cocos Creator 快速编译完成，生成的编辑器脚本块包含 `v1.3.0-dev-ui03`、`BgmStyleCards` 和两条来源信息。
- TypeScript 4.9.5 对项目源码执行 `--skipLibCheck true`：退出码 0。
- 未启用 `skipLibCheck` 时，Creator 3.8.8 自带 `cc.d.ts/jsb.d.ts` 会报告既有 WebGPU、PAL 和 ambient const enum 声明错误；这些错误位于引擎声明，不在本轮源码。
- Web/微信配置静态核对：`debug=false`、`sourceMaps=false`；微信 AppID 为 `wxfbd176abc5b3911c`，方向为 `landscapeRight`。

### 尚未完成

- 正式 Web 和微信小游戏重新构建：**未完成**。打开 Creator 的“构建发布”面板后实际出现 `Cocos Developer Login`，当前账号会话已登出。安全边界禁止代填或操作账号密码。
- 当前 `build/web-mobile` 时间仍为 2026-08-10 18:36:58，`build/wechatgame` 时间仍为 2026-08-10 18:47:30，均早于 UI03，未冒充本轮构建结果。
- 微信开发者工具横屏预览：**待正式微信包构建后完成**。本机工具存在于 `D:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`。
- 微信真机横屏：**待用户完成**。

登录阻塞证据：`release_evidence/v1.3.0-dev-ui03/creator-build-panel.png`。

## 8. 修改文件

| 文件 | 目的 |
| --- | --- |
| `assets/scripts/GameController.ts` | 删除旧选择器皮肤创建；清理遗留节点；建立卡片容器；统一尺寸、间距、点击范围、状态和字体样式；版本升级到 UI03 |
| `assets/scripts/AudioManager.ts` | 为两张卡补齐同级来源信息，不改变音频文件、播放生命周期或存储键 |
| `RELEASE_IDENTITY.md` | 更新开发版本、批次和名称 |
| `tools/release/release_identity.json` | 同步开发版本和批次 |
| `tools/qa/ui03_web_build_config.json` | UI03 Web 正式参数配置 |
| `tools/qa/ui03_wechat_build_config.json` | UI03 微信正式参数、AppID、横屏配置 |
| `tools/qa/validate_ui03_bgm_panel.mjs` | 10 次暂停、20 次切换、字体/层级/点击区/持久化/尺寸自动化 |
| `BGM_PANEL_UI_REPORT_v1.3.0-dev-ui03.md` | 本报告 |

未修改两首 MP3、`THIRD_PARTY_AUDIO.md`、玩法数值、AI、移动速度、战术牌逻辑、关卡规则或其他界面。

## 9. Git diff 摘要与版本管理

由于 `AudioManager.ts` 和 `GameController.ts` 在本轮开始前已经包含大量未提交功能，针对 HEAD 的整文件 diff 会混入历史工作，不能将其全部归因于 UI03。本轮可归属变更为：

- 旧 `BgmSelectorPanelArt` 创建逻辑删除并增加安全清理；
- 新增 1 个 `BgmStyleCards` 容器；
- 两卡改为 `400 × 54`、12 px 间距、点击区域同尺寸；
- 统一 10 个 BGM 区域 Label 的字体来源和合成字重；
- 新增两条来源文字与未选中状态文字；
- 版本从 UI02 升为 UI03；
- 新增 2 个构建配置、1 个自动化脚本和本报告。

本轮没有执行 Git commit、没有创建 tag、没有 push。

## 10. 回滚方法

工作区原本已有重叠未提交改动，不应使用整文件 checkout/reset。安全回滚应只逆向应用本报告第 9 节列出的 UI03 小块：恢复 UI02 版本字符串、恢复旧卡片布局和来源文字、重新启用旧皮肤创建。不要覆盖 `AudioManager.ts`、`GameController.ts` 中其他未提交功能。

## 11. 剩余风险

- 源码和浏览器运行范围内没有已知 BGM 面板残留问题。
- 发布门禁仍有一项真实阻塞：用户需要在 Creator 中登录 Cocos Developer 账号，然后重新执行 Web/微信正式构建、微信开发者工具预览和真机验证。
- 真机字体抗锯齿、微信音频硬件输出和安全区视觉仍需真实设备确认。
