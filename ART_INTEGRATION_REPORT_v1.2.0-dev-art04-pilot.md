# 《羊狼四线战》art04 Pilot 美术接入报告

- 游戏版本：`v1.2.0-dev`
- 开发批次：`v1.2.0-dev-art04-pilot`
- 验证日期：2026-07-28
- 引擎：Cocos Creator 3.8.8

## 1. Pilot 接入范围

已在第1路接入并实际运行：

- 第1路 `road_lane_01_v02.png`；
- 小羊、小狼 23 帧角色主表；
- 玩家与 AI 四状态出兵门；
- 第1路四状态补给点；
- 小羊单位卡 v02；
- 玩家/AI单位血条框、填充遮罩和“小”徽章；
- 出兵、移动尘土、羊/狼攻击、命中、死亡 v02 特效。

第2～4路、中/大/巨羊狼、基地、全屏背景和其他界面仍保持 Graphics 占位。

## 2. 修改与新增文件

- 修改：`assets/scripts/GameController.ts`
- 新增：
  - `assets/scripts/art/ArtPilotConfig.ts`
  - `assets/scripts/art/ArtResourceManager.ts`
  - `assets/scripts/art/SpriteSheetSlicer.ts`
  - `assets/scripts/art/UnitSpriteAnimator.ts`
  - `assets/scripts/art/VfxSpriteAnimator.ts`
- 新增运行资源：`assets/resources/art/pilot/` 下18张指定 PNG，以及 Cocos Creator 自动生成的 `.meta`。

没有复制 manifest、`reference`、`_archive`、旧版角色表或 v01 高分辨率 VFX。

## 3. SpriteFrame 切片规则

- 角色：`1024×512`、`8×4`、单格 `128×128`、只创建索引 `0～22`。
- 角色代表帧：
  - 0=`(0,0)`；7=`(896,0)`；8=`(0,128)`；
  - 15=`(896,128)`；16=`(0,256)`；22=`(768,256)`。
- VFX：`1024×512`、`4×2`、单格 `256×256`、索引 `0～7`。
- Cocos 3.8.8 已验证按纹理顶部原点切片：`rect.y = row * cellHeight`。
- 每张纹理只切片一次并缓存；不同单位共享同一组 SpriteFrame。
- PNG 的 Texture2D 在本项目中通过 resources 路径的 `/texture` 子资源加载，已由真实预览验证。

## 4. 动画帧率

| 状态 | 帧范围 | 帧率 | 模式 |
|---|---:|---:|---|
| idle | 0～3 | 5 FPS | 循环 |
| move | 4～9 | 8 FPS | 循环 |
| attack | 10～14 | 12 FPS | 单次 |
| hit | 15～16 | 10 FPS | 单次 |
| death | 17～22 | 10 FPS | 单次 |

优先级：`death > hit > attack > move > idle`。

## 5. 逻辑边界确认

- 未修改 `UnitRoot.position`、`UnitRoot.scale`、`definition.radius`。
- 未修改道路中心、宽度、出生点、突破点、队列容量、队列间距、速度、伤害、生命、能量和 AI。
- Sprite 仅位于 `VisualNode` 子层；血条与徽章仍在独立 `HealthUI`。
- 动画只切换 SpriteFrame；行走浮动仍只作用 `VisualNode`。
- 单位死亡时立即从有效 `units` 队列移除并释放容量，0.6秒死亡表现属于无战斗能力的视觉残影。
- Graphics 占位代码完整保留；任一正式资源失败时单项回退。
- VFX 位于 `BattleLayer`，暂停和结算仍由 `ModalLayer` 覆盖。

## 6. 浏览器测试结果

本机 Cocos Creator 预览：`http://localhost:7456`，设计分辨率 `1280×720`。

- 18/18 Pilot 资源加载成功，失败数0。
- 第1路显示正式道路；第2～4路保持占位。
- 小羊和小狼均从原固定出生端出现并按原速度移动。
- AI小狼、第1路补给点归属变化和小羊卡显示正常。
- 出兵、移动和短时战斗特效运行，无控制台红色错误。
- 道路活性、数值、越界断言均无警告。
- 暂停后相隔2.2秒的两张 Canvas 截图 SHA-256 完全一致，角色和 VFX 均冻结；暂停面板完整覆盖战场。
- 继续战斗后道路恢复推进。
- 测试段开始/结束 JS Heap：80,060,938 / 79,842,124 bytes，未见持续增长。

## 7. 性能记录

Creator 浏览器性能面板在正式单位移动时显示：

- 帧率：60 FPS；
- Draw Call：约80；
- Triangle：约5,817；
- GFX Texture Memory：约40.77 MB；
- GFX Buffer Memory：约92.3 MB。

空战场正式道路加载时 Draw Call 约74。Headless浏览器3秒 RAF采样高于60，游戏预览工具栏仍按60 FPS运行。

## 8. 压力测试说明

项目规则为每阵营每路最多3个单位，因此合法的第1路同时存活上限为6，不可能在不修改玩法的情况下实现“第1路同时20个单位”。art04 完成了6单位上限内的运行验证和累计生成/死亡回收检查。原计划5分钟长测因任务随后升级为 art05 全量接入而中止；更长的四路测试在 art05 报告中继续记录。

## 9. 已知问题

- 小羊源图为3/4背视并回头，视觉上略偏侧向；未旋转或上下翻转素材，以免角色躺倒。
- 方形出兵门不能拉伸为原 `164×52` 横向按钮，当前以方形视觉节点显示，原触摸根保持不变。
- 正式道路和角色提升了纹理内存与 Draw Call；全量接入需按组加载并继续监控。
- 浏览器截图中的 FPS 框属于 Creator 外部预览工具，不属于游戏 Canvas 正式界面。

## 10. Pilot 结论

Pilot 管线可复用到四路和八种单位：资源加载、切片缓存、视觉节点绑定、暂停冻结、单项回退和 VFX 对象池均正常。建议进入全量接入，但需要把角色侧向观感列入非阻断美术瑕疵，并在全量后进行微信真机专项检查。

明确确认：本批未修改玩法数值，未直接编辑 `build`、`library` 或 `temp` 生成文件，未提交 Git 或创建标签。
