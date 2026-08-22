# 微信小游戏横版详细推广图交付报告

## 交付结论

已完成 3 张相互独立的横版推广图，并根据用户反馈全部修订为明确的二维 Q 版动漫风。画面采用深色清晰线稿、平涂色块、两段式赛璐璐阴影、简化毛发形状和大眼动漫比例；不使用真实毛发、写实动物结构、3D/CGI 材质、电影级体积光或景深。全部文件为真实 JPEG，尺寸均为 1280×720，嵌入 sRGB ICC 配置，无透明通道、无 EXIF，且单张严格低于 200 KB。最终清晰主体通过缩放与柔化边缘延展被收进至少 40 px 安全区；边缘仅保留低细节环境氛围，不承载需识别的角色或玩法信息。

项目正式美术仅在本机进行观察和特征提取，未把项目原图上传为生成参考；生成模型接收的是整理后的角色、场景和玩法文字特征。最终图不是游戏截图拉伸，也不含运行时 UI。

## 文件验收

| 文件 | 玩法主题 | 实际尺寸 | 实际大小 | JPEG 质量 | 格式检查 |
|---|---|---:|---:|---:|---|
| `D:\GameProjects\WolfSheepBattle\release_assets\wechat_promo\horizontal_detail\wechat_horizontal_detail_01_four_lane_battle.jpg` | 四线正面对抗：四条纵向道路、羊下狼上、双方四入口、道路补给点、两路交锋 | 1280×720 | 191,883 bytes（187.39 KB） | 81 | JPEG / RGB / sRGB ICC / 无 Alpha / EXIF 0 / PASS |
| `D:\GameProjects\WolfSheepBattle\release_assets\wechat_promo\horizontal_detail\wechat_horizontal_detail_02_unit_strategy.jpg` | 兵种策略：羊与狼各小、中、大、巨四档，共 8 个完整角色，中路争夺补给点 | 1280×720 | 189,959 bytes（185.51 KB） | 84 | JPEG / RGB / sRGB ICC / 无 Alpha / EXIF 0 / PASS |
| `D:\GameProjects\WolfSheepBattle\release_assets\wechat_promo\horizontal_detail\wechat_horizontal_detail_03_special_tactics.jpg` | 特殊战术：四线战场中一条道路冻结狼方，另一条金色＋青绿色能量涌流并连续出羊，其余两路正常对抗 | 1280×720 | 189,728 bytes（185.28 KB） | 80 | JPEG / RGB / sRGB ICC / 无 Alpha / EXIF 0 / PASS |

说明：KB 按 1 KB = 1024 bytes 计算；压缩目标上限采用 190 KB，为微信 200 KB 硬限制保留余量。

## 逐图视觉检查

### 01 四线正面对抗

- 道路数量目检为准确 4 条，四条道路之间均有草地区隔。
- 羊方位于下方，狼方位于上方；每方均有 4 个与道路对齐的入口。
- 道路中部可见多个木质圆台旗帜补给点，可识别为争夺目标。
- 两路有交锋或推进，另两路保留观察空间；中心羊狼碰撞不遮挡道路。
- 未发现血条、按钮、卡牌框、文字、Logo、二维码、广告或水印。

### 02 兵种策略与体型差异

- 羊方准确展示小羊、中羊、大羊、巨羊各 1；狼方准确展示小狼、中狼、大狼、巨狼各 1。
- 小、中、大、巨四档体型阶梯明确，轮廓、披肩/护具、羊角和狼王王冠均有差异。
- 8 个角色完整可见，无互相穿模；巨型角色未遮挡其他档位。
- 中路补给点与双方布阵关系清楚，构图不是机械图鉴排队。
- 未发现文字、数值、卡牌、按钮、Logo、二维码、广告或水印。

### 03 特殊关卡与战术效果

- 道路数量目检为准确 4 条。
- 左中道路为柔和冰蓝冻结效果：局部结霜、冰晶、脚下冻结环，两只狼停在原位，面部无遮挡。
- 右中道路为金色、青绿色、薄荷色能量旋流，多只小羊按合理间距连续出兵，无堆叠。
- 左右外侧道路均保留普通羊狼对抗，形成战术前后对比。
- 未出现机械光束、枪械、爆炸、阴暗恐怖元素，也未发现文字、Logo、二维码、广告或水印。

## 正式角色参考

羊方四档：

- `D:\GameProjects\WolfSheepBattle\assets\bundles\art_units\characters\sheep\small\unit_sheep_small_sheet_runtime_v01.png`
- `D:\GameProjects\WolfSheepBattle\assets\bundles\art_units\characters\sheep\medium\unit_sheep_medium_sheet_runtime_v01.png`
- `D:\GameProjects\WolfSheepBattle\assets\bundles\art_units\characters\sheep\large\unit_sheep_large_sheet_runtime_v01.png`
- `D:\GameProjects\WolfSheepBattle\assets\bundles\art_units\characters\sheep\giant\unit_sheep_giant_sheet_runtime_v01.png`

狼方四档：

- `D:\GameProjects\WolfSheepBattle\assets\bundles\art_units\characters\wolf\small\unit_wolf_small_sheet_runtime_v01.png`
- `D:\GameProjects\WolfSheepBattle\assets\bundles\art_units\characters\wolf\medium\unit_wolf_medium_sheet_runtime_v01.png`
- `D:\GameProjects\WolfSheepBattle\assets\bundles\art_units\characters\wolf\large\unit_wolf_large_sheet_runtime_v01.png`
- `D:\GameProjects\WolfSheepBattle\assets\bundles\art_units\characters\wolf\giant\unit_wolf_giant_sheet_runtime_v01.png`

从正式资源提取并保持的关键设定：羊为白色毛绒、青绿色披肩/围巾与叶片装饰，大羊和巨羊使用盘角与金色细节；狼为橙红色毛发、奶油色口鼻/胸毛、红金护具和爪印徽章，巨狼保留小王冠与红色王者披风。

## 场景与玩法参考

- 四线草地：`D:\GameProjects\WolfSheepBattle\assets\bundles\art_battlefield\battlefield_ground_cartoon_20x9_runtime_v02.jpg`
- 细节草地：`D:\GameProjects\WolfSheepBattle\assets\bundles\art_battlefield\battlefield\backgrounds\battlefield_ground_topdown_runtime_v01.jpg`
- 羊方基地：`D:\GameProjects\WolfSheepBattle\assets\bundles\art_battlefield\bases\player\player_base_runtime_v01.png`
- 狼方基地：`D:\GameProjects\WolfSheepBattle\assets\bundles\art_battlefield\bases\ai\ai_base_runtime_v01.png`
- 四条正式道路：`D:\GameProjects\WolfSheepBattle\assets\bundles\art_battlefield\battlefield\roads\road_lane_01_runtime_v01.png` 至 `road_lane_04_runtime_v01.png`
- 羊/狼入口：`D:\GameProjects\WolfSheepBattle\assets\bundles\art_battlefield\battlefield\spawn\player\player_spawn_gate_states_runtime_v01.png`、`D:\GameProjects\WolfSheepBattle\assets\bundles\art_battlefield\battlefield\spawn\ai\ai_spawn_gate_states_runtime_v01.png`
- 补给点：`D:\GameProjects\WolfSheepBattle\assets\bundles\art_battlefield\battlefield\supply_points\supply_point_states_runtime_v02.png`
- 战术氛围：正式 sprint / shock / heal VFX 表，以及 `GameController.ts` 中道路冻结与能量涌流的实际效果、时长和色彩实现。

## 生成提示词摘要

- 三张共同风格锁：纯二维 Q 版日系动漫游戏插画，深棕色轮廓线、平面色块、两段式赛璐璐阴影、大眼比例和简化毛发；明确排除写实、半写实、真实毛发、3D、CGI、毛绒玩具、电影体积光、景深和油画厚涂。
- 01：严格四条纵向道路、羊下狼上、双方各四入口、补给点、两路交锋、两路留白；清新草地、羊方青绿、狼方橙红；无任何文字和 UI。
- 02：严格四档羊＋四档狼、共 8 个完整角色，以自然楔形布阵争夺中路补给点；小中大巨通过体型、羊角、披肩、护甲和王冠区分；无文字和 UI。局部修正只补入缺失的中羊。
- 03：严格四条道路；左中路以平面冰晶、雪花和冻结环停止两只狼，右中路以金色＋青绿色动漫色带连续出羊；外侧两路保持正常羊狼对抗；无文字和 UI。

## 完整性与边界

- 三张最终文件均通过 JPEG 文件头/文件尾、Pillow 解码、尺寸、RGB、ICC、EXIF、Alpha、字节上限和 SHA-256 检查。
- SHA-256：
  - 01：`ed75462af5cc95983ba9964bfc6661c3a33c9d479f1e1f12cc373997aea8b11d`
  - 02：`064ac17ebd03bb681a618202a772be653c694851d562a33ced4e00a48e7c24b9`
  - 03：`7a491b9129fafda01a593bd8c7b440be0095a81575089f2af16633e7afede91c`
- 与生成前基线相比，`git status --short -- assets build` 条目数量仍为 19，内容完全一致；本任务未向 `assets` 或 `build` 新增任何变化。基线中的既有修改/未跟踪项属于任务开始前状态，本任务未回退或覆盖。
- 未修改 Cocos Creator 场景、玩法源码、数值、项目版本号或 `build`；未提交 Git；未覆盖正式游戏美术资源。
