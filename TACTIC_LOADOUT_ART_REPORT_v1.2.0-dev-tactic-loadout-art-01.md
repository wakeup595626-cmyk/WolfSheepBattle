# 《羊狼四线战》第四关开局战术卡组界面专项报告

- 审计日期：2026-08-03
- 当前真实内部版本：`v1.2.0-dev`
- 实施开发批次：`v1.2.0-dev-tactic-loadout-art-01`
- 用户请求批次：`v1.1.0-dev-tactic-loadout-art-01`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- Git 操作：未提交、未建标签、未推送、未上传微信平台

> 仓库真实内部版本高于用户建议批次，因此保留 `GAME_VERSION = 'v1.2.0-dev'`，仅递增开发批次，未发生版本降级。

## 1. 修改范围

源代码修改：

- `D:\GameProjects\WolfSheepBattle\assets\scripts\GameController.ts`

QA 与交付文件：

- `D:\GameProjects\WolfSheepBattle\tools\qa\tactic_loadout_art_01_web_build_config.json`
- `D:\GameProjects\WolfSheepBattle\tools\qa\tactic_loadout_art_01_wechat_build_config.json`
- `D:\GameProjects\WolfSheepBattle\tools\qa\validate_tactic_loadout_art_01.mjs`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\tactic-loadout-art-01\screenshots\tactic_loadout_runtime_audit.json`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\tactic-loadout-art-01\logs\web_build_cli.log`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\tactic-loadout-art-01\logs\wechat_build_cli.log`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\tactic-loadout-art-01\logs\runtime_audit_release_build.log`

未修改战术实际数值、第四关特殊道路、单位、AI、道路、碰撞、能量、补给或存档结构；没有直接修改 `build`、`library`、`temp`。

## 2. 界面重构结果

弹窗改为单一 `TacticDeckContent` 容器，尺寸 `960×650`，使用奶油色羊皮纸、浅木金边、绿叶、白花正式风格。正式资源加载失败时保留同色系 Graphics 回退，不再使用原深蓝科技矩形。

四张卡牌采用 2×2 布局，单卡 `410×176`，内部统一为：

1. 正式卡框；
2. 左侧正式图标卡槽与技能图标；
3. 名称、触发条件、主要效果；
4. 补给消耗与冷却/次数标签；
5. 金色选中描边、淡金光晕和圆形勾选徽章。

所有标题、条件、效果和标签的世界边界均通过自动化检查，未超出卡框。

## 3. 复用的正式美术资源

| 用途 | 正式资源 |
| --- | --- |
| 羊皮纸主体 | `assets/bundles/art_ui/ui/level_select/v06/level_select_panel_runtime_v06.png` |
| 四卡通用卡框 | `assets/bundles/art_ui/ui/tactic_cards/v05/tactic_card_shell_runtime_v05.png` |
| 全体冲刺卡槽 | `tactic_icon_cell_sprint_runtime_v05.png` |
| 战地急救卡槽 | `tactic_icon_cell_heal_runtime_v05.png` |
| 领地震荡卡槽 | `tactic_icon_cell_shock_runtime_v05.png` |
| 道路冻结卡槽 | 复用治疗卡槽并作冰蓝色视觉染色 |
| 全体冲刺图标 | `tactic_skill_sprint_runtime_v05.png` |
| 战地急救图标 | `tactic_skill_heal_runtime_v05.png` |
| 领地震荡图标 | `tactic_skill_shock_runtime_v05.png` |
| 道路冻结图标 | `tactic_state_lock_runtime_v03.png` 低透明底层 + 独立雪花 Graphics 覆盖层 |
| 选中装饰 | `tactic_state_ready_runtime_v03.png` + 圆形金绿勾选徽章 |
| 开始作战按钮 | `assets/bundles/art_ui/ui/common/buttons/button_primary_runtime_v01.png` |

没有新增大图、没有复制一套资源管理器、没有新增运行时 Bundle。

## 4. 选择、取消与确认逻辑

- 点击未选卡：少于3张时加入待携带列表，播放选择反馈并短促放大到1.03后恢复。
- 点击已选卡：立即取消，徽章和金色描边同步消失。
- 已满3张点击第4张：原三张保持不变；目标卡轻微晃动；显示“最多携带3张战术牌，请先取消一张。”。
- 底部实时显示“已选择 X / 3 张战术牌”。
- 未满3张时确认不会进入战斗，显示“请选择3张战术牌”。
- 正好3张时确认会先设置一次性输入锁，再保存、关闭面板并进入第四关，防止双击重复初始化。
- 首次或无效存档回退组合：战地急救、领地震荡、道路冻结。
- 合法历史选择继续从原有 `wolf-sheep-battle.progress.v2` 的 `selectedTactics` 字段恢复，未新增或迁移存储键。
- 卡组选择不检查补给、冷却、基地生命或场上单位；实际释放条件仍使用原战斗逻辑。

## 5. 自动化与浏览器验证

最终 Web 正式参数包运行时检查：`20/20 PASS`。

覆盖内容：

- 四张正式卡框、图标卡槽、技能图标均成功加载；
- 初始默认三张正确；
- 选中和取消；
- 最多3张且不自动替换；
- 选中计数实时更新；
- 未满3张禁止进入；
- 确认输入锁防重复；
- 只激活所选3张战术牌；
- 选择写入及重新读取；
- 无效存档安全回退；
- 1280×720 卡内边界；
- 1600×720 横屏比例与等比缩放；
- Console Error/Warning：0；
- 资源 404：0；
- 请求失败：0。

截图：

- `D:\GameProjects\WolfSheepBattle\art_source\qa\tactic-loadout-art-01\screenshots\tactic_loadout_default_1280x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\tactic-loadout-art-01\screenshots\tactic_loadout_limit_feedback_1280x720.png`
- `D:\GameProjects\WolfSheepBattle\art_source\qa\tactic-loadout-art-01\screenshots\tactic_loadout_wechat_landscape_sim_1600x720.png`

1600×720 截图是横屏安全区模拟，不冒充微信真机截图。

## 6. 工程与构建验证

- TypeScript：PASS（`tsc --noEmit --skipLibCheck true -p tsconfig.json`）。
- Web Mobile 正式参数构建：PASS，Cocos 退出码 `36`。
- WeChat Mini Game 正式参数构建：PASS，Cocos 退出码 `36`。
- Start Scene：`Battle.scene`（UUID `267677db-a17c-4dde-b71e-4d4929fd7689`）。
- Debug：关闭。
- Source Maps：关闭，构建中 `.map` 文件数为0。
- AppID：`wxfbd176abc5b3911c`。
- 方向：`landscapeRight`。
- 本地分包：6个。
- 微信云开发：未启用。

因源项目当时正由 Creator 编辑器占用，最终构建在从当前源码复制的隔离 QA 镜像中完成，避免关闭编辑器或覆盖未保存状态。源项目 `build` 目录未被修改。

## 7. 包体与剩余人工项

QA 镜像微信包：

- 主包：4,487,033 B（4.279 MiB）；
- 全部本地包：20,692,044 B（19.733 MiB）。

主包目前高于既有4 MiB发布目标。该增长主要来自当前源树中已有的主包图片/加载资源，不属于本轮卡组界面新增内容；本轮按范围限制未调整 Bundle、加载架构或发布配置。正式上传前应另开包体专项处理或复核资源归属。

仍需用户人工完成：

1. 微信开发者工具中打开最终源项目构建包，确认真机字体观感；
2. 至少一台刘海屏横屏真机测试四卡触摸、取消和第4张阻止反馈；
3. 真机连续重开第四关，确认输入手感和音效响度；
4. 在解决主包4 MiB限制后再进行上传验收。

结论：卡组界面源码、视觉、交互和持久化自动化验收通过；微信构建成功，但在主包4 MiB发布限制和人工真机验收完成前，不应上传或提审。

## 8. 叠加第5关开发后的回归复核（2026-08-03）

当前工作区真实版本仍为 `v1.2.0-dev`，后续开发批次已推进到
`v1.2.0-dev-level05-01`。本次没有把批次或版本回退到较早编号，也没有覆盖第5关成果。

针对第4关卡组界面重新执行了当前源码构建包运行测试：

- 自动检查：`20/20 PASS`；
- 第4关仍只显示全体冲刺、战地急救、领地震荡、道路冻结四张卡；
- 默认组合仍为战地急救、领地震荡、道路冻结；
- 选中、再次点击取消、满3张阻止第4张、实时计数和确认输入锁均正常；
- 确认后只激活玩家选择的3张卡；
- 卡组现在按关卡保存到 `selectedTacticsByLevel['4']`，兼容字段 `selectedTactics` 继续保留；
- 无效的第4关卡组存档会安全回退到默认组合；
- 1280×720与1600×720横屏模拟均无卡内文字越界；
- Console Error、意外 Warning、资源404和请求失败均为0。

最新微信正式参数构建复核：

- 构建成功（Cocos Creator CLI惯例退出码36，日志明确显示 `Finished`）；
- Debug关闭，Source Maps关闭，`.map`文件0个；
- AppID：`wxfbd176abc5b3911c`；
- 方向：`landscapeRight`；
- 本地分包：6个；
- 当前主包：4,509,014 B（4.300 MiB）；
- 全部本地包：20,714,025 B（19.754 MiB）。

主包已超过4 MiB，属于当前整个后续工作区的发布阻断项，并非本轮卡组界面新增资源导致；
本轮按范围约束未改Bundle或资源加载架构。微信真机触摸、字体观感和连续重开仍需用户人工验收。
