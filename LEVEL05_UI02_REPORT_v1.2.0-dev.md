# 《羊狼四线战》第五关字体与标题排版专项报告

- 实施日期：2026-08-03
- 当前真实内部版本：`v1.2.0-dev`
- 实施批次：`v1.2.0-dev-level05-ui02`
- 用户请求编号：`v1.1.0-dev-level05-ui02`
- 引擎：Cocos Creator 3.8.8
- Git基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- Git操作：未提交、未建标签、未推送

仓库真实版本高于用户给出的开发版本，因此保留 `GAME_VERSION = 'v1.2.0-dev'`，
没有降级或覆盖既有第5关成果。

## 1. 根因

### “无限火力”字体观感不一致

正式字体为：

`assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`

字体内部名称为 `Noto Sans SC UI Subset Bold`。字形审计确认关卡标题、关卡说明、
状态文字、按钮文字及五张战术卡涉及的中文字符全部存在，包括“无、限、火、力、
涌、流、携、带”等。

问题不是缺字，而是正式字体异步加载后，原代码只设置 `label.font`，没有显式把
`useSystemFont` 关闭。不同运行时初始化/重排路径存在继续使用系统字体的风险；第5关
同时处于金色选中卡面，进一步放大了字重差异的视觉感受。

修复后所有正式Label在字体可用时统一执行：

- `label.font = formalUiFont`；
- `label.useSystemFont = false`。

选中状态只改变卡面、金色边框、编号徽章和状态图标，不再改变任何标题字体参数。

### 卡组副标题与横线重叠

卡组面板复用了 `level_select_panel_runtime_v06.png`，该资源自带一条固定横线；
旧副标题Y坐标恰好落在横线位置，所以第5关较长副标题被横线穿过。

修复方式：

1. 用与羊皮纸一致的底色遮盖旧固定横线；
2. 主标题、副标题分别放在独立垂直行；
3. 在副标题下方重新绘制唯一分隔线；
4. 实测主标题与副标题安全间距11px，副标题与分隔线安全间距17px。

## 2. 字号与文字规范

关卡选择：

- 主标题“关卡选择”：36px、粗体、2px浅金描边、轻微阴影；
- 副标题：16px；
- 五张关卡标题：22px、粗体；
- 五张说明：15px；
- 五张状态：16px、粗体；
- “返回主菜单”：22px、粗体；
- “开始挑战第X关”：24px、粗体。

战术卡组：

- 主标题：36px、粗体；
- 副标题：16px；
- 五张卡牌标题：22px、粗体；
- 条件文字：13px；
- 效果文字：14px、18px行高；
- 补给/冷却信息：12px；
- 已选数量：17px、粗体；
- 开始作战：23px、粗体。

五张卡牌的图标区、标题区、说明区和底部信息区继续使用同一组固定坐标；选中和取消
不会修改字体、字号、行高、描边或阴影。

## 3. 修改文件

源码与QA配置：

- `assets/scripts/GameController.ts`
- `tools/qa/level05_ui02_web_build_config.json`
- `tools/qa/level05_ui02_wechat_build_config.json`
- `tools/qa/validate_level05_ui02.mjs`

验证产物：

- `art_source/qa/level05-ui02/screenshots/level_select_level05_selected_1280x720.png`
- `art_source/qa/level05-ui02/screenshots/tactic_loadout_level05_header_1280x720.png`
- `art_source/qa/level05-ui02/screenshots/tactic_loadout_level05_1600x720.png`
- `art_source/qa/level05-ui02/screenshots/level_select_level05_844x390.png`
- `art_source/qa/level05-ui02/screenshots/level05_ui02_runtime_audit.json`
- `art_source/qa/level05-ui02/logs/`

未修改字体文件、战斗数值、单位状态机、关卡机制、AI、AppID、游戏名称、音频授权、
源项目 `build/library/temp` 目录。

## 4. 验证

- TypeScript：PASS；
- Web Mobile正式参数构建：PASS；
- 浏览器运行回归：27/27 PASS；
- 1280×720：PASS；
- 1600×720横屏模拟：PASS；
- 844×390宽屏手机模拟：PASS；
- 五个关卡标题完整且字体参数完全一致；
- 五张战术牌全部使用同一正式字体，卡内边界检查通过；
- 系统字体回退：0；
- 副标题与分隔线交叠：0；
- Console Error/意外Warning：0；
- 资源404/请求失败：0。

微信小游戏正式参数构建：PASS：

- AppID：`wxfbd176abc5b3911c`；
- 方向：`landscapeRight`；
- Debug：关闭；
- Source Maps：关闭，`.map`文件0个；
- 本地分包：6个；
- 主包：4,510,118 B（4.301 MiB）；
- 全部本地包：20,715,129 B（19.755 MiB）。

Cocos构建日志中的Babel提示仅说明单文件超过500KB并关闭代码格式美化，构建正常完成，
不属于运行时错误。主包仍超过4 MiB，是既有发布阻断项，本轮按范围未调整Bundle架构。

## 5. 人工验收

当前环境完成了微信目标包构建与三种横屏比例的自动截图，但不能替代真实设备。
仍需用户在微信开发者工具及至少一台刘海屏真机上核对：

1. 字体抗锯齿与实际DPR观感；
2. 第5关卡片点击后的金色选中反馈；
3. 五卡选择/取消和开始作战触摸区域；
4. 微信胶囊与弹窗顶部安全距离。

本轮未上传微信版本、未提交Git、未创建标签。
