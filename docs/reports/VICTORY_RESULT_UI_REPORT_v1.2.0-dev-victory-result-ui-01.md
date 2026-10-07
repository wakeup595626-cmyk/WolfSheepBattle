# 《羊狼四线战》胜利结算界面专项重构报告

- 项目：`D:\GameProjects\WolfSheepBattle`
- 当前真实内部版本：`v1.2.0-dev`
- 上一开发批次：`v1.2.0-dev-level-free-unit-badge-01`
- 本轮开发批次：`v1.2.0-dev-victory-result-ui-01`
- 目标公开版本：`1.1.0`
- Git 分支 / 基线：`master` / `f9e29dda89887123d8035c264964842e83d5cecc`
- Git 操作：未提交、未创建标签、未推送、未上传微信后台

> 真实内部版本已经高于建议的 `v1.1.0-dev-victory-result-ui-01`，因此本轮保留 `v1.2.0-dev`，只递增开发批次，未执行版本降级。

## 1. 问题原因与整改结论

旧结算层同时显示代码绘制的深蓝实体底板、顶部深色横块和带透明外边距的竖向羊皮纸图。正式羊皮纸原图为 `960×720`，实际非透明区域仅约 `551×685`；将整张图直接缩放到横向容器会保留大块透明边，并让代码深色底板从四周露出，形成三层互相冲突的界面。

本轮完成以下源代码整改：

1. 删除正式结算模式中的深蓝实体底板和顶部无内容横条。
2. 将羊皮纸 SpriteFrame 在运行时裁去透明边，裁切矩形为 `Rect(205, 19, 551, 685)`。
3. 裁切后的 SpriteFrame 使用 `Sprite.Type.SLICED`，四边九宫格边界均为 `56`，显示为统一的 `720×540` 横向结算面板。
4. 旧整段战报 Label 已移除，改为两个结构化圆角数据卡。
5. 胜利与失败复用相同节点结构，只切换徽章、气氛、标题和提示色。
6. 遮罩颜色改为深绿黑 `rgba(8,18,16,158)`，不透明度约 62%，仍可辨认战场。

## 2. 最终节点结构

```text
ModalLayer
└─ ResultPanel                         全屏输入拦截
   ├─ ResultBackdrop                  62% 半透明遮罩
   ├─ ResultAtmosphereArt             胜利/失败边缘气氛图
   └─ ResultCard                      720×540，统一定位根
      ├─ ResultPanelArt               裁边后的九宫格木框羊皮纸
      ├─ ResultBadge                  80×80
      │  └─ ResultEmblemArt           胜利/失败徽章
      ├─ ResultTitleGroup
      │  ├─ ResultText                “战斗胜利/战斗失败”
      │  └─ ResultSummary             动态关卡编号、名称和结果摘要
      ├─ ResultDetailsGroup
      │  ├─ PlayerResultCard          浅绿色羊方数据卡
      │  │  ├─ Header
      │  │  ├─ Metric1..4
      │  │  └─ Value1..4
      │  └─ AiResultCard              浅珊瑚色狼方数据卡
      │     ├─ Header
      │     ├─ Metric1..4
      │     └─ Value1..4
      ├─ ResultHint                   自由选关规则下的动态后续提示
      └─ ResultButtonsGroup
         ├─ ResultRetryButton
         ├─ ResultNextButton
         └─ ResultLevelSelectButton
```

所有结算节点均位于 `ModalLayer`；`ResultPanel` 保留 `BlockInputEvents`，结算出现后战场、HUD 和战术牌不能继续响应点击。

## 3. 信息与数据格式

动态摘要由当前 `LevelConfig` 读取，不写死关卡名称：

- 胜利：`第 X 关·{LevelConfig.title} 挑战成功` / `成功击破敌方基地`
- 失败：`第 X 关·{LevelConfig.title} 挑战未完成` / `玩家基地已被击破`

双方数据卡直接读取当前结算对象：

- 基地剩余：当前基地生命 / `BASE_MAX_HEALTH`
- 派出单位：`BattleStats.unitsSpawned`
- 获得补给：`BattleStats.supplyEarned`
- 使用战术：四种战术使用次数之和；为 0 时显示“未使用”

`formatResultNumber()` 会把 `17.0`、`5.0` 显示为 `17`、`5`；确有小数时最多保留一位。

后续提示不参与关卡解锁：

- 首次完成且存在相邻已实现关卡：`可继续挑战第 X 关，也可以返回选关。`
- 当前最后一个已实现关卡：`当前已完成全部开放关卡。`
- 重复完成已通关关卡：`本关已再次完成，可重新挑战或选择其他关卡。`
- 失败：`可重新挑战，也可以返回选关调整阵容。`

## 4. 按钮与交互

三个按钮统一为 `190×58`：

| 按钮 | 资源/主题 | 文字色 | 常规位置 |
| --- | --- | --- | --- |
| 重新挑战 | `button_secondary_runtime_v01.png` | 深棕 `#533D2B` | X = -208 |
| 下一关 | `button_primary_runtime_v01.png` | 深绿 `#2D5631` | X = 0 |
| 返回选关 | `button_secondary_runtime_v01.png` | 深棕 `#533D2B` | X = 208 |

- 按下缩放为 `0.97`，取消或松开后用 `0.14s backOut` 恢复。
- `resultActionsLocked` 防止同一次结算重复触发按钮。
- 不存在相邻已实现关卡或战斗失败时隐藏“下一关”，其余两个按钮自动移动到 `X=-110/+110` 居中。
- “下一关”仍只进入编号相邻且 `implemented/enabled` 的关卡，不承担解锁功能。
- “重新挑战”继续调用既有 `restartGame()`，清理单位、VFX、冻结选路、计时器和结算状态。

## 5. 过渡时间线

1. 战斗判定结束：立即设置 `isFinished`、停止战斗音效、淡出 BGM、冻结战斗 Tween、清理战斗 VFX。
2. `0.26s`：全屏遮罩淡入。
3. 延迟 `0.05s` 后用 `0.30s backOut`：面板由 `0.92` 缩放到 `1.0`，同时淡入。
4. 延迟 `0.20s` 后用 `0.30s backOut`：徽章由 `0.72` 缩放到 `1.0`。
5. 标题约 `0.38s` 开始淡入；数据约 `0.48s` 开始淡入。
6. 约 `0.68s` 后启用按钮，按钮再用 `0.22s` 淡入。
7. 胜负音效仍只播放一次，并继续遵守玩家音效开关和音量设置。

## 6. 复用资源与字体

未新增结算大图，复用以下正式资源：

- `assets/bundles/art_ui/ui/modals/result_panel_runtime_v01.png`
- `assets/bundles/art_vfx/vfx/results/victory/victory_emblem_runtime_v01.png`
- `assets/bundles/art_vfx/vfx/results/victory/victory_overlay_runtime_v01.png`
- `assets/bundles/art_vfx/vfx/results/defeat/defeat_emblem_runtime_v01.png`
- `assets/bundles/art_vfx/vfx/results/defeat/defeat_overlay_runtime_v01.png`
- `assets/bundles/art_ui/ui/common/buttons/button_primary_runtime_v01.png`
- `assets/bundles/art_ui/ui/common/buttons/button_secondary_runtime_v01.png`

布局检查发现原中文字体子集缺少“表、现、剩、余”等本轮文案字形。项目继续使用同一 Noto Sans SC 700 字重，只重新生成字符子集，没有更换字体：

- 运行时字体：`assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`
- 字符覆盖：`533/533`
- 缺失字形：`0`
- 新字体大小：`184,064 B`
- 相比修改前：增加 `14,980 B`
- SHA-256：`F4A323C2A7740AEEAF0C8B85F10EA2C4998934DECDC7CF97B8D5086CB3C32C3E`

## 7. 修改文件

### 源码与运行时资源

- `assets/scripts/GameController.ts`
- `assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf`
- `art_source/ui/fonts/ui_font_cn_subset_v02.ttf`
- `art_source/ui/fonts/ui_font_cn_subset_v02_LICENSE.txt`

### QA 与构建准备

- `tools/qa/build_victory_result_ui_font_subset.py`
- `tools/qa/render_result_ui_layout_mock.py`
- `tools/qa/validate_victory_result_ui_01.mjs`
- `tools/qa/validate_victory_result_ui_01_static.mjs`
- `tools/qa/victory_result_ui_01_web_build_config.json`
- `tools/qa/victory_result_ui_01_wechat_build_config.json`
- `art_source/qa/victory-result-ui-01/font_subset_audit.json`
- `art_source/qa/victory-result-ui-01/static_validation.json`
- `art_source/qa/victory-result-ui-01/layout_mock/victory_result_layout_mock_1280x720.jpg`
- `art_source/qa/victory-result-ui-01/layout_mock/defeat_result_layout_mock_1280x720.jpg`

布局样稿只用于离线视觉核对，不冒充 Cocos 运行截图或微信真机截图。

## 8. 已完成验证

- TypeScript：通过。使用 Creator 3.8.8 随附 TypeScript，`--noEmit --skipLibCheck true`，退出码 `0`。
- 静态专项审计：`14/14` 通过。
- 字体审计：需要的结算字符缺失数 `0`。
- 1280×720 离线布局样稿：胜利与失败均完成视觉检查；文字、数据卡和按钮未见越界或重叠。
- 源码未修改 `UNIT_DEFINITIONS`、`LEVEL_CONFIGS`、单位逻辑、AI、补给、战术数值、胜负判定或关卡开放逻辑。

## 9. 当前验证阻断与必须补测

当前已打开的 Cocos Creator 实例中存在一个停在约 15% 的旧构建任务，7456 预览端口持续返回上一批 `v1.2.0-dev-level-free-unit-badge-01` 脚本块，未重新编译本轮 `GameController.ts`。为保护用户工作区，本轮没有删除或修改 `temp/library/build`，也没有强制结束用户正在使用的 Cocos 主进程。

因此以下项目尚不能宣称通过：

1. 本轮源码在 Cocos 1280×720 实际预览中的截图。
2. 第 1～4 关真实胜利结算、失败、重开、下一关、返回选关自动回归。
3. 最后一关隐藏“下一关”的真实触控回归。
4. Web Mobile 与微信小游戏正式参数构建。
5. 微信开发者工具与实体真机触控、不同横屏比例和性能验证。

已准备的自动回归脚本为 `tools/qa/validate_victory_result_ui_01.mjs`。编辑器需要先取消旧构建任务，并执行一次“刷新设备/重新预览”；若仍不更新，应正常关闭并重开 Cocos，等待资源导入完成后再运行该脚本。

## 10. 当前结论

结算界面源代码重构、正式资源复用、动态数据格式、自由选关提示、按钮布局与字体补字已经完成，未发现源码级 P0/P1 问题。由于 Cocos 编辑器脚本打包器仍被旧任务占用，本轮目前只能给出“源码实现完成、正式运行验收待刷新后执行”的结论，不能把离线布局样稿写成真机通过，也不能写“全部完成”。
