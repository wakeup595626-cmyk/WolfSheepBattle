# 《羊狼四线战》关卡自由选择与单位档位徽章专项报告

- 项目：`D:\GameProjects\WolfSheepBattle`
- 当前真实内部版本：`v1.2.0-dev`
- 本轮批次：`v1.2.0-dev-level-free-unit-badge-01`
- 目标公开版本：`1.1.0`
- Git 分支：`master`
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- Git 操作：未提交、未打标签、未推送
- 微信操作：未上传、未提审，未覆盖审核中的 `1.0.0`

## 1. 版本处理

仓库真实版本为 `v1.2.0-dev`，高于建议的 `v1.1.0-dev-level-free-unit-badge-01`。为避免回退内部版本，`GAME_VERSION` 保持 `v1.2.0-dev`，仅将开发批次更新为 `v1.2.0-dev-level-free-unit-badge-01`。

## 2. 关卡开放逻辑

### 原实现

选关卡片点击、卡片状态、进度文案、存档加载、胜利解锁和“下一关”按钮均依赖 `highestUnlockedLevel`。全新存档只能选择第1关；第4关描述中也写有“通关第3关后解锁”。

### 现实现

`LevelConfig` 新增可选字段：

```ts
readonly implemented?: boolean;
readonly enabled?: boolean;
```

唯一进入判据为 `implemented === true || enabled === true`：

- 第1～第4关均标记 `implemented: true`，全新存档可直接进入。
- 未标记或明确未实现的配置显示“制作中”，不能进入。
- 卡片状态明确区分“当前选择 / 已通关 / 未通关 / 制作中”。
- “未通关”仍可点击挑战。
- 选关页进度改为通关统计，不再显示解锁进度。
- 第2、3关直接进入时不再被第1关教学遮挡；第1关仍保留教学。
- 胜利后的“下一关”仅进入编号相邻且已实现的关卡，不再承担解锁职责。

`highestUnlockedLevel` 和原存储键继续保留，仅用于旧版回滚兼容，不再参与界面状态或进入权限判断。

## 3. 旧存档兼容

- 继续读取 `wolf-sheep-battle.progress.v2` 和旧版 `wolf-sheep-battle.v1.highest-unlocked-level`。
- 通关记录 `completedLevels` 原样保留。
- 战术牌选择 `selectedTactics` 原样保留。
- 音频/BGM存储键未修改。
- 旧 `highestUnlockedLevel` 数值被忽略为进入门禁。
- 重置进度只清空 `completedLevels`，不清空战术牌、音频设置或其他本地配置，也不会重新锁关。

## 4. TypeBadge结构与视觉参数

```text
UnitRoot（逻辑坐标、碰撞、队列；未修改）
├─ VisualNode（正式角色与动画）
└─ HealthUI（独立视觉UI）
   ├─ TypeBadge  28×28
   │  └─ TierLabel（动态中文Label）
   ├─ HealthBackground
   ├─ HealthFill
   └─ 状态图标
```

- 尺寸：`28×28` 设计像素。
- 位置：血条左侧，间距 `6px`，垂直中心与血条一致。
- 血条整体高度：基于角色视觉范围上移到 `+18px`，避免遮挡脸部。
- 文字：小/中/大/巨，动态 `Label`，`19px`，粗体，浅米白 `#FFFAE8`。
- 描边：`2px` 深棕黑 `#2A1F1C`。
- 阴影：`(1,-1)` 轻阴影。
- 档位底色：
  - 小：`#4AB1EE`
  - 中：`#36BE86`
  - 大：`#A163E0`
  - 巨：`#EFAE2F`
- 阵营外圈：
  - 玩家羊方：`#2BBEB0`
  - AI狼方：`#EE5B46`
- 正式美术模式不再用旧 `TierBadgeArt` 覆盖运行时徽章，确保阵营外圈、中文描边和尺寸一致。
- 徽章仍随 `HealthUI` 和 `UnitRoot` 生命周期淡出/销毁，不单独生成每帧节点。

## 5. 自动验证结果

### 关卡与存档

- 全新存档、legacy high-water mark为1：状态为 `selected, available, available, available`。
- 第1～第4关卡片数量：4。
- 第4关直接选择：通过；标题为“泥泞与花径”。
- 第4关道路类型：`normal, mud, flower, normal`。
- `enabled: true` 的未来配置可进入；空配置返回未实现。
- 旧存档 `[1,3]` 通关记录与 `sprint/heal/freeze` 战术编组保留。
- 重置后通关记录为空，四个已实现关卡仍可进入，战术编组不变。

### 八种单位徽章

- 羊方与狼方小/中/大/巨共8种：全部生成并识别。
- 节点名、父节点、尺寸、字号、描边、阴影、血条间距：全部通过。
- `UnitRoot` scale始终为 `(1,1,1)`。
- 正式模式旧徽章Sprite未激活，程序徽章Graphics保持启用。

### 24单位压力验证

- 四路每路3羊+3狼，共24单位。
- 运行道路解算6秒；战斗死亡后剩余16个活动单位属正常结算结果。
- 所有剩余坐标均为有限值，X仍与所属道路中心一致。
- `UnitRoot` scale未改变，TypeBadge仍挂在对应HealthUI。
- 暂停0.5秒前后单位坐标一致。
- 未发现徽章残留、漂移或逻辑节点缩放。

成功运行摘要：`art_source/qa/level-free-unit-badge-01/runtime_qa_pass_summary.json`  
截图：

- `art_source/qa/level-free-unit-badge-01/screenshots/level_select_all_free_1280x720.png`
- `art_source/qa/level-free-unit-badge-01/screenshots/eight_unit_type_badges_1280x720.png`
- `art_source/qa/level-free-unit-badge-01/screenshots/type_badge_stress_24_units_1280x720.png`

## 6. 工程验证

- TypeScript：通过（`tsc --noEmit --skipLibCheck --project tsconfig.json`）。
- Cocos浏览器运行时专项测试：成功运行一次，20/20通过；0请求失败、0资源404。
- 观察到2条既有 `LabelOutline` 弃用警告，来源为既有加载标题代码，不是本轮新增。
- 当前Git未显示 `build`、`library`、`temp` 的受控文件改动。

### 微信构建状态

本轮正式微信包未能完成构建。项目已在Cocos Creator图形界面中打开，命令行实例未产出构建结果；尝试隔离构建后，当前编辑器预览服务的import-map暂时失效，需要在编辑器中执行“刷新设备（Ctrl+Shift+P）”。已停止由本轮启动的额外Cocos进程，原编辑器主进程仍在运行。

隔离构建使用的项目外副本仍位于 `D:\CodexQA\WolfSheepBattle_level_free_unit_badge_01_20260803`，不属于项目、未进入任何运行包；自动清理被当前执行策略拦截，可在确认无需复查后人工删除。

已准备正式参数配置：

- `tools/qa/level_free_unit_badge_01_web_build_config.json`
- `tools/qa/level_free_unit_badge_01_wechat_build_config.json`

微信配置保持：`landscapeRight`、AppID `wxfbd176abc5b3911c`、Debug关闭、Source Maps关闭、启动场景 `Battle.scene`。

## 7. 实际修改文件

- `assets/scripts/GameController.ts`
- `tools/qa/level_free_unit_badge_01_web_build_config.json`
- `tools/qa/level_free_unit_badge_01_wechat_build_config.json`
- `tools/qa/validate_level_free_unit_badge_01.mjs`
- `art_source/qa/level-free-unit-badge-01/runtime_qa_pass_summary.json`
- `art_source/qa/level-free-unit-badge-01/screenshots/*`
- 本报告

未修改 `UNIT_DEFINITIONS` 数值、移动速度、攻击、生命、费用、半径、出生、队列、道路状态机、AI策略、特殊道路数值或胜负规则。

## 8. 尚需人工验收与残余风险

1. 在Cocos Creator中执行“刷新设备（Ctrl+Shift+P）”，确认预览import-map恢复。
2. 在当前编辑器内重新执行Web和微信正式构建，核对构建日志无Error。
3. 用微信开发者工具验证第1～第4关自由进入、下一关、重开、返回选关和返回标题。
4. 至少一台横屏真机验证8种徽章在常见16:9～20:9比例下两秒内可辨认，且冰冻、冲刺、受击、死亡时不遮挡或残留。
5. 真机进行24单位压力测试，观察Draw Call、帧率和内存。

结论：源码修改、TypeScript和浏览器专项逻辑验证已通过；因本轮微信构建与真机步骤尚未完成，当前不能声称发布前工程验收全部通过，也未进行任何上传或版本发布操作。
