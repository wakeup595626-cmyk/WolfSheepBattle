# 羊狼四线战 v1.2.0-dev-art09-02 卡通战场报告

## 1. 结论

- 本轮仅重做战场背景、切换背景视觉模式，并把透明 `LaneHitArea` 调整到与窄路相符的宽度。
- 默认视觉模式已切换为 `cartoon_20x9_v02`；上一批 `plush_20x9_v01` 仍保留用于源码级回退。
- `LANE_X`、单位根节点、碰撞、出生、排队、战斗、AI、数值、HUD、卡牌、暂停界面和全屏适配均未更改。
- 运行时 Web 回归、TypeScript 检查和微信小游戏正式构建均通过。
- 版本仍为 `v1.2.0-dev`；未提交 Git，未创建标签。

## 2. 道路宽度对比

测量基于 2400×1080 源图，并换算为 1600×720 设计坐标。旧版使用对应无路草地母版做 RGB 差分，新版使用最终合成蒙版的 0.5 阈值。完整数据见：

- `art_source/qa/art09-02/road_width_comparison.json`
- `art_source/battlefield/guides/battlefield_cartoon_alignment_audit_v02.json`

| 项目 | plush_20x9_v01 | cartoon_20x9_v02 |
|---|---:|---:|
| 道路宽度范围 | 204.0–216.0 px | 140.667–143.333 px |
| 平均/目标宽度 | 209.5 px | 约142 px |
| 四路最大宽度差 | 12.0 px | 2.667 px |
| 最小路间草地宽度 | 54.0 px | 126.667 px |
| 相邻中心距 | 270 px | 270 px（未修改） |

新路宽约为中心距的 52.1%–53.1%，道路与草地形成清晰的“道路｜草地｜道路”节奏。

## 3. 道路中心误差

在 AI 端、道路中部和玩家端分别测量四路：

- 最大绝对中心误差：`0.333` 设计像素；
- 允许上限：`4` 设计像素；
- 四路全部通过；
- 道路上下宽度范围为 140.667–143.333 px，变化约 1.9%，低于 8% 限制。

校正图：`art_source/battlefield/guides/battlefield_cartoon_alignment_audit_v02.png`。

## 4. 右侧战术区域

按 20:9 布局和 16:9 裁切后的实际战术牌覆盖范围建立了 `TacticsSafeRect`，背景只在该局部区域做自然渐变和降噪，没有给全屏叠加灰色滤镜，也没有新增 UI 面板。

| 指标 | 相对中央草地变化 |
|---|---:|
| 饱和度 | 降低 25.58% |
| 亮度 | 降低 12.01% |
| 细节梯度 | 降低 40.72% |

运行截图确认三张浅色战术牌均有清晰边界，后方没有高亮大花、亮石或密集草叶干扰，因此本轮没有增加额外 `TacticsBackdrop`。

## 5. 新背景资源

源文件：

- `art_source/battlefield/backgrounds/battlefield_ground_cartoon_20x9_v02.png`
- 2400×1080，PNG，约 2.25 MiB，仅保留在 `art_source`，不进入 Bundle。

运行时文件：

- `assets/bundles/art_battlefield/battlefield_ground_cartoon_20x9_runtime_v02.jpg`
- 1600×720，真正 JPEG、24-bit RGB、质量 90；
- 124,446 bytes（约 121.5 KiB），低于 1.2 MiB；
- 对应 `.meta` 由 Cocos Creator 3.8.8 在独立 QA 工程导入时生成，没有手写 UUID。

视觉检查未发现黑边、白边、明显 JPEG 色带、道路边缘块状压缩、生成文字、动物、门、建筑或 UI 残片。

## 6. 图像生成与校正过程

使用项目既有的 `battlefield_layout_20x9_guide_v01.png` 作为几何导引。第一张探索稿仅用于判断风格，没有接入游戏。第二次生成明确限定：

> 20:9 原创休闲手游卡通动漫战场；圆润大色块、柔和渐变、低噪点、轻微 2.5D 俯视；四路沿参考中心线，路宽 135–145 设计像素，路间保留宽草地；奶油浅棕路面、少量圆斑和脚印；右侧战术区降低饱和、亮度与细节；禁止角色、门、基地、文字、UI、写实草叶、摄影、毛毡微距、荧光绿、塑料 3D、科技感和拼接缝。

生成候选：

- `art_source/battlefield/backgrounds/_working/battlefield_cartoon_candidate_v02.png`

随后又以候选为参考生成无道路草地母版：

- `art_source/battlefield/backgrounds/_working/battlefield_cartoon_grass_base_v02.png`

最终没有直接使用任何生成结果。`tools/art_pipeline/compose_cartoon_battlefield_runtime.py` 完成了：

1. 检测候选的四路纹理中心；
2. 以固定 `LANE_X` 重建 142px 左右的对称道路蒙版；
3. 统一四路宽度，并增加低透明暖灰绿色环境遮蔽；
4. 局部平滑和校正 `TacticsSafeRect`；
5. 自动测量 AI端、中部、玩家端中心与宽度；
6. 审计通过后才输出源 PNG 和运行时 JPEG。

## 7. 视觉模式与旧道路

- `BATTLEFIELD_VISUAL_MODE = 'cartoon_20x9_v02'`；
- `plush_20x9_v01` 仍保留在类型和资源表中；
- `cartoon_20x9_v02` 使用统一背景内的道路；
- 四个旧 `LaneArt` Sprite 在 1280×720 和 1600×720 运行时均为 `active=false`；
- 背景 Sprite 保持等比 `scale=(1,1)`；
- 1280×720 显示 1600×720 背景的中央区域，1600×720 显示完整背景。

## 8. LaneHitArea

| 参数 | 修改前 | 修改后 |
|---|---:|---:|
| 视觉道路宽度 | 204–216 px | 140.667–143.333 px |
| 透明点击宽度 | 180 px | 165 px |
| 单侧视觉容错 | 旧版不适用 | 约10.8–12.2 px |
| 相邻点击区空隙 | 90 px | 105 px |

- 中心仍严格为 `[-495, -225, 45, 315]`；
- 父节点仍为 `BattleInputLayer`；
- `LaneHitArea` 没有 Graphics，保持完全透明；
- 1280和1600下四路点击均各生成一个单位；
- 在第1、2路之间草地中心 `x=-360` 点击，出兵数增量均为0；
- 单位仍从本方门中心生成，未使用点击坐标作为出生坐标。

## 9. 浏览器回归

正式 Web 构建在独立 QA 工程执行：

`D:\GameProjects\CodexQA\WolfSheepBattle-art09-02-20260729-01`

验证数据：`art_source/qa/art09-02/cartoon_battlefield_validation.json`。

| 项目 | 结果 |
|---|---|
| 1280×720背景、四路与点击 | PASS |
| 1600×720背景、四路与点击 | PASS |
| 草地点击不出兵 | PASS |
| 八种单位显示 | PASS（8/8） |
| 巨羊/巨狼视觉宽度 | 120 / 110 px，均小于最窄道路140.667 px |
| UnitRoot scale | 全部 `(1,1)` |
| 三张战术牌流程 | PASS |
| 暂停冻结单位与能量 | PASS |
| 胜利结算 | PASS |
| 控制台 error/warning/pageerror | 0 |
| Bundle警告、请求失败、404 | 0 / 0 / 0 |

截图：

- 旧/新 1280 对比：`art_source/qa/art09-02/plush_vs_cartoon_1280x720.png`
- 新版 1280：`art_source/qa/art09-02/cartoon_battle_1280x720.png`
- 新版 1600：`art_source/qa/art09-02/cartoon_battle_1600x720.png`
- 八单位：`art_source/qa/art09-02/cartoon_eight_units_1600x720.png`
- 战术流程：`art_source/qa/art09-02/cartoon_tactics_1600x720.png`

## 10. TypeScript与微信构建

### TypeScript

- 使用 Cocos Creator 3.8.8 随附 TypeScript；
- 检查范围：`assets/scripts/**/*.ts`；
- `noEmit`、`skipLibCheck`；
- 结果：PASS，退出码0；
- `git diff --check`：PASS。

### 微信小游戏正式构建

- Platform：WeChat Mini Game；
- Start Scene：`Battle.scene`；
- Debug：关闭；
- Source Maps：关闭，产物 `.map` 数量0；
- Orientation：`landscapeRight`；
- Cocos日志：`build Task (wechatgame) Finished in (11 s)`；
- `game.json` 保留6个小游戏分包声明；
- 构建在独立 QA 工程生成，没有直接编辑当前项目的 `build/library/temp`。

Creator 进程的 stderr 仍有 Electron GPU 缓存目录访问警告；构建任务本身成功，完整产物与 `game.json` 均已生成，该警告不是项目脚本、资源或 Bundle 错误。

## 11. 包体

| 包 | bytes | MiB |
|---|---:|---:|
| 主包 | 3,404,743 | 3.247 |
| art_battlefield | 4,381,390 | 4.178 |
| art_boot | 933,123 | 0.890 |
| art_ui | 3,062,787 | 2.921 |
| art_units | 3,077,206 | 2.935 |
| art_vfx | 2,118,338 | 2.020 |
| audio_bgm | 2,755,254 | 2.628 |
| 全部本地包 | 19,732,841 | 18.819 |

- 主包 `< 4 MiB`：PASS；
- 全部本地包 `< 30 MiB`：PASS。

## 12. 本轮修改文件

运行时源码与资源：

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`
- `assets/bundles/art_battlefield/battlefield_ground_cartoon_20x9_runtime_v02.jpg`
- `assets/bundles/art_battlefield/battlefield_ground_cartoon_20x9_runtime_v02.jpg.meta`

源美术与审计：

- `art_source/battlefield/backgrounds/battlefield_ground_cartoon_20x9_v02.png`
- `art_source/battlefield/backgrounds/_working/battlefield_cartoon_candidate_v02.png`
- `art_source/battlefield/backgrounds/_working/battlefield_cartoon_grass_base_v02.png`
- `art_source/battlefield/guides/battlefield_cartoon_alignment_audit_v02.png`
- `art_source/battlefield/guides/battlefield_cartoon_alignment_audit_v02.json`
- `tools/art_pipeline/compose_cartoon_battlefield_runtime.py`

QA与报告：

- `tools/qa/art09_02_web_build_config.json`
- `tools/qa/art09_02_wechat_build_config.json`
- `tools/qa/validate_art09_02_cartoon_battlefield.mjs`
- `art_source/qa/art09-02/*`
- `CARTOON_BATTLEFIELD_REPORT_v1.2.0-dev-art09-02.md`

## 13. 尚未处理与人工真机项

源码和桌面自动化中没有发现本轮新增的 P0/P1 问题。仍需用户在微信真机体验版确认：

1. OLED/高亮度屏幕下右侧战术区域是否仍足够安静；
2. 手指点击窄路边缘约10–12px容错是否舒适；
3. 巨羊/巨狼在小尺寸真机上的道路内视觉余量；
4. JPEG绿色渐变在具体机型GPU和屏幕上的色带情况；
5. 20:9真机全屏、胶囊避让与前后台恢复继续沿用上一批适配结果。

当前版本：`v1.2.0-dev`。本轮未提交 Git、未创建标签。
