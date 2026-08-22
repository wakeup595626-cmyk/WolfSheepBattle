# 《羊狼四线战》主菜单操作层级专项报告

- 实施日期：2026-08-03
- 当前真实版本：`v1.2.0-dev`
- 本轮任务标识：`v1.2.0-dev-mainmenu-ui01`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- Git 操作：未提交、未建标签、未推送
- 微信操作：未上传、未提审

## 1. 主菜单调整

主菜单操作顺序已经改为：

1. `当前关卡`
2. 动态关卡信息，例如 `第5关 · 无限火力`
3. 主按钮 `选择／切换关卡`
4. 辅助说明 `查看全部关卡`
5. 次按钮 `开始挑战`

最终设计参数：

- 选择／切换关卡：`380 × 70`，中心坐标 `(0, -132)`，主按钮角色；
- 开始挑战：`340 × 58`，中心坐标 `(0, -211)`，次按钮角色；
- 两按钮可见边缘间距：`15` 设计像素；
- 选关按钮使用金色外框、明亮青绿色主体、地图图标；
- 开始按钮使用较柔和绿色和旗帜图标；
- 首次菜单展示播放3次有限呼吸提示：`1.0 → 1.035 → 1.0`，每次0.7秒，完成后固定恢复到1.0。

## 2. 交互与存档

- 点击关卡条目只更新当前选择，选关面板保持打开，`isStarted`保持为`false`；
- 返回主菜单后立即显示新关卡编号和名称；
- 主菜单只有点击`开始挑战`才进入当前关卡；
- 主菜单选关和开战入口都增加一次性输入锁，自动化快速重复调用均只触发1次；
- 在原有`wolf-sheep-battle.progress.v2`对象中增加可选字段`selectedLevelId`，没有更换存储键、清除旧字段或提高schema版本；
- 旧存档没有该字段时继续安全回退到首个已实现关卡；
- 自由选关条件、已通关记录、战术卡组和其他存档字段没有改变。

## 3. 字体

继续使用现有正式字体：

`assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`

字体内部家族保持`Noto Sans SC UI Subset Bold`。审计发现旧子集缺少新菜单文案所需的
`／、换、看`，并缺少第五关名称中的`火、力`。已使用项目既有字体子集管线补齐，
所有主菜单Label均为`useSystemFont = false`，不存在单字系统字体回退。

- 更新前：184,064 B；
- 更新后：190,448 B；
- 更新后 SHA-256：`DA1378B6DFC838E56832CA37312FB8CCDBBE220ECAE6279E7F8C7FB97E67D53E`；
- 字形审计：558/558，缺失0。

## 4. 验证

TypeScript：PASS（`--noEmit --skipLibCheck`）。

浏览器正式参数构建及运行时自动验收：PASS：

- 1280×720：PASS；
- 1600×720（20:9横屏模拟）：PASS；
- 自动检查：27/27 PASS；
- 控制台新增Error/Warning：0；
- 资源404：0；
- 请求失败：0；
- 选中第5关不立即开战：PASS；
- 返回菜单动态显示第5关：PASS；
- `selectedLevelId = 5`持久化：PASS；
- 选关/开战快速重复调用各只触发1次：PASS。

截图：

- `art_source/qa/mainmenu-ui01/screenshots/mainmenu_hierarchy_1280x720.png`
- `art_source/qa/mainmenu-ui01/screenshots/mainmenu_level05_selected_1280x720.png`
- `art_source/qa/mainmenu-ui01/screenshots/mainmenu_hierarchy_1600x720.png`

微信小游戏正式参数构建：PASS：

- AppID：`wxfbd176abc5b3911c`；
- 横屏方向：`landscapeRight`；
- Debug：关闭；
- Source Maps：关闭，`.map`文件0个；
- 本地分包：6个；
- 主包：4,512,444 B（4.303 MiB）；
- 全部本地包：20,723,839 B（19.764 MiB）。

主包超过4 MiB是当前既有的发布包体风险，本轮按范围未调整Bundle或资源架构。

## 5. 修改文件

源码与正式字体：

- `assets/scripts/GameController.ts`
- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`
- `art_source/ui/fonts/ui_font_cn_subset_v02.ttf`
- `art_source/ui/fonts/ui_font_cn_subset_v02_LICENSE.txt`
- `art_source/qa/art10-ui-clarity06/font_subset_audit_v03.json`

QA配置与验证：

- `tools/qa/mainmenu_ui01_web_build_config.json`
- `tools/qa/mainmenu_ui01_wechat_build_config.json`
- `tools/qa/validate_mainmenu_ui01.mjs`
- `art_source/qa/mainmenu-ui01/`
- `MAINMENU_UI_REPORT_v1.2.0-dev-mainmenu-ui01.md`

## 6. 未改变与人工真机项

没有修改关卡玩法、难度、单位数值、战术牌、道路、队列、碰撞、出生、战斗、AppID或
音频逻辑；没有直接编辑项目`build`输出。

当前环境完成了微信目标包构建和横屏比例模拟，但不能替代实体设备。仍需用户在微信真机
核对刘海/胶囊安全区、触摸手感、3次呼吸动画的实际观感，以及与浏览器截图的一致性。
