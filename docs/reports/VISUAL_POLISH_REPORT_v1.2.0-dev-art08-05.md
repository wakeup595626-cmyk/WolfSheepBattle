# 羊狼四线战 v1.2.0-dev-art08-05 视觉精修报告

## 1. 结论

- 本轮限定的四项问题均已修复并通过最新源码构建的自动化回归。
- 游戏版本保持 `v1.2.0-dev`，未修改玩法、单位数值、AI、能量恢复、补给占领、道路、门、`LaneHitArea`、单位动画或 Bundle 架构。
- 未直接编辑项目的 `build`、`library`、`temp`；Web 与微信构建均在独立 QA 工程副本中生成。
- 未提交 Git，未创建标签。当前基线仍为 `f9e29dda89887123d8035c264964842e83d5cecc`。

## 2. 关卡徽章

### 节点结构

```text
BattleLevelBadge
├─ LevelBadgeFrameSprite
└─ LevelBadgeContent
   ├─ LevelChapter
   └─ LevelTitle
```

### 修改前后参数

| 项目 | 修改前 | 修改后 |
|---|---:|---:|
| 外框尺寸 | 104×48 | 116×58 |
| 内部内容区 | 无独立内容区 | 84×42 |
| 左右安全边距 | 约10 | 16 |
| 上下安全边距 | 约4 | 8 |
| 主标题 | 20px，`y=8` | 22px，`y=9.5`，84×22 |
| 副标题 | 13px，`y=-12` | 14px，`y=-12.5`，84×15 |
| 主副标题间距 | 接近0 | 3.5 |
| 溢出保护 | SHRINK | SHRINK |

外框宽度增加约11.5%，高度按原始 2:1 比例同步调整，没有压扁资源。第1、2、3关分别显示“教学节奏”“轻度练习”“标准节奏”，均完整通过运行时检查。

## 3. AI与玩家能量HUD

AI和玩家继续保留各自阵营外框与填充颜色，但共同调用 `createEnergyBar()`，并共用同一套内部结构和参数：

```text
EnergyBar
├─ TrackBackground
├─ Fill
├─ FrameArt
├─ EnergyIconArt
├─ TextShadow
└─ Text
```

正式资源审计发现：在当前 300×44 显示尺寸下，AI外框透明内窗约238×28，玩家外框透明内窗约231×23。旧实现关闭根 Graphics 后没有独立轨道底，因此较大的 AI 内窗会露出更明显的战场空隙。本轮增加共享 `TrackBackground` 覆盖两种内窗，动态填充则限制在较窄的玩家内窗范围内。

| 参数 | AI | 玩家 |
|---|---:|---:|
| 外框 | 300×44 | 300×44 |
| 图标中心 | x=-126 | x=-126 |
| 轨道左端 | -106 | -106 |
| 轨道中心 | (14,-1) | (14,-1) |
| 轨道尺寸 | 240×30 | 240×30 |
| 填充左端 | -102 | -102 |
| 填充尺寸 | 228×20 | 228×20 |
| 文字中心 | (16,0) | (16,0) |
| 文字容器宽度 | 222 | 222 |
| full模式根Graphics | 关闭 | 关闭 |
| 轨道/填充实例数 | 1 / 1 | 1 / 1 |

### 0/25/50/75/100对比

| 能量 | AI可见填充宽度 | 玩家可见填充宽度 | 误差 |
|---:|---:|---:|---:|
| 0 | 0 | 0 | 0 |
| 25 | 57 | 57 | 0 |
| 50 | 114 | 114 | 0 |
| 75 | 171 | 171 | 0 |
| 100 | 228 | 228 | 0 |

0能量时填充节点隐藏，只显示空轨道；100能量时填满有效区，但不覆盖图标和外框装饰。

## 4. 单位卡最终状态规则

| 状态 | 卡面 | 右侧状态 | 可选中 |
|---|---|---|---|
| locked | 灰暗 | 未解锁 | 否 |
| insufficient | 灰暗 | 能量不足 | 否 |
| selected | 整卡暖黄 `#F6C84B`、深金边 `#B87916` | 可用 | 是 |
| available | 普通浅色 | 可用 | 是 |

- 状态优先级保持 `locked > insufficient > selected > available`；`pressed` 只作为按下瞬间的触摸反馈，不覆盖业务状态优先级。
- 同时最多一张卡显示黄色；选中卡最大缩放为1.02，不再执行1.04的恢复放大。
- 当前选中卡能量不足时立即取消黄色并显示“能量不足”；能量恢复后重新显示黄色和“可用”。
- 已从 `UnitCardState` 删除 `✓ 已选择` 字符串和 selected 专用右侧文字；不存在独立对勾节点，也没有新增对勾图标。
- 同时从暂停页 `BgmCurrentTrack` 删除了曲名前的 `✓`，该行只显示当前曲名。

## 5. 暂停面板重排

正式暂停图的可见面板区按当前显示换算约为502×602。本轮新增并使用居中的 `PauseContentRoot`：

- 内容区：430×548，位置 `(0,0)`。
- 相对正式面板可见区：左右安全边距约36px，上下安全边距约27px。
- 所有标题、按钮、BGM与音量控件都是 `PauseContentRoot` 的子节点，未使用 Mask 裁切越界内容。

### 控件位置与尺寸

| 控件 | 中心位置 | 尺寸 |
|---|---:|---:|
| 游戏已暂停 | (0,240) | 410×46，34px |
| 暂停副标题 | (0,204) | 410×24，16px |
| 继续战斗 | (-107,148) | 204×46，20px |
| 重新开始 | (107,148) | 204×46，20px |
| 玩法说明 | (-107,96) | 204×46，20px |
| 返回标题 | (107,96) | 204×46，20px |
| BGM选择行 | (0,24) | 430×54 |
| 音乐音量行 | (0,-64) | 430×56 |
| 音效音量行 | (0,-136) | 430×56 |

### BGM选择行

| 列 | 中心X | 尺寸 |
|---|---:|---:|
| 背景音乐 | -174 | 64×40，18px，左对齐 |
| 上一首 | -116 | 38×40 |
| 当前曲名 | 10 | 190×40，18px，居中 |
| 下一首 | 136 | 38×40 |

### 音量行共享列

| 列 | 中心X | 尺寸 |
|---|---:|---:|
| 音乐/音效 | -185 | 54×40，18px，左对齐 |
| 喇叭 | -139 | 38×40 |
| 减号 | -99 | 34×40 |
| 滑杆触摸区 | 15 | 176×42 |
| 加号 | 125 | 34×40 |
| 百分比 | 181 | 52×40，18px |

四个主按钮字体、字号、颜色统一为深棕色 `#563A25`、20px；“背景音乐”“音乐”“音效”统一为深棕色、18px、左对齐。两条音量行的列位置、滑杆宽度和触控区域完全一致。

## 6. 自动化验证

测试数据：`art_source/qa/art08-05/visual_layout_validation.json`。

| 验证项 | 结果 |
|---|---|
| 第1/2/3关徽章文本与SHRINK保护 | PASS |
| AI/玩家五档能量比例、单轨道、0/100边界 | PASS |
| 单位卡黄色单选与“可用”状态 | PASS |
| 能量不足时取消黄色并显示不足 | PASS |
| 暂停内容全部位于安全区 | PASS |
| 四个主按钮字体/颜色一致 | PASS |
| BGM切换、音乐-5%、音效+5% | PASS |
| `wolf-sheep-battle.audio-settings.v1`持久化写入 | PASS |
| 暂停700ms内单位、AI能量、玩家能量均冻结 | PASS |
| 继续战斗后暂停状态解除 | PASS |
| 1800×720宽屏居中 | PASS |
| 控制台error/warning/pageerror | 0 |
| 请求失败、项目资源404、Bundle警告 | 0 |

浏览器测试使用最新源码的独立 Cocos Web 正式构建，不使用旧的7456预览缓存。测试服务器的浏览器默认 favicon 请求在测试夹具中以204处理，不涉及项目资源。

## 7. 修改前后截图

修改前：

- `art_source/qa/art08-05/before_battle_reference.png`
- `art_source/qa/art08-05/before_pause_reference.png`

修改后：

- `art_source/qa/art08-05/after_battle_1280x720.png`
- `art_source/qa/art08-05/after_pause_1280x720.png`
- `art_source/qa/art08-05/after_battle_wide_1800x720.png`
- `art_source/qa/art08-05/level_badge_level1.png`
- `art_source/qa/art08-05/level_badge_level2.png`
- `art_source/qa/art08-05/level_badge_level3.png`
- `art_source/qa/art08-05/energy_000.png`
- `art_source/qa/art08-05/energy_025.png`
- `art_source/qa/art08-05/energy_050.png`
- `art_source/qa/art08-05/energy_075.png`
- `art_source/qa/art08-05/energy_100.png`
- `art_source/qa/art08-05/unit_card_selected_yellow_only.png`
- `art_source/qa/art08-05/unit_card_insufficient.png`

## 8. TypeScript与微信构建

### TypeScript

- Cocos Creator 3.8.8 随附 TypeScript，限定 `assets/scripts/**/*.ts`、`noEmit`、`skipLibCheck`。
- 结果：PASS，退出码0。
- QA脚本语法、构建配置JSON、`git diff --check`：全部PASS。

### 微信小游戏正式构建

- Platform：WeChat Mini Game。
- Start Scene：`Battle.scene`。
- Debug：关闭。
- Source Maps：关闭，输出 `.map` 数量为0。
- Orientation：`landscapeRight`。
- Cocos Builder 日志：`build Task (wechatgame) Finished in (11 s)`，产物318个文件。
- 构建在 `D:\GameProjects\CodexQA\WolfSheepBattle-art08-05-20260729-01` 独立QA副本执行，未直接编辑原项目 `build`。
- Creator启动器最终返回36，原因是联网登录探测超时和 Electron GPU缓存目录警告；构建任务本身完成，完整微信产物和 `game.json` 均已生成。日志中的脚本子进程SIGTERM随后明确回退使用Creator引擎缓存，不是项目脚本编译失败。

### 包体

| 包 | bytes | MiB |
|---|---:|---:|
| 主包 | 3,391,914 | 3.235 |
| art_battlefield | 3,858,286 | 3.680 |
| art_units | 3,077,206 | 2.935 |
| art_ui | 3,062,787 | 2.921 |
| audio_bgm | 2,755,254 | 2.628 |
| art_vfx | 2,118,338 | 2.020 |
| art_boot | 933,123 | 0.890 |
| 全部本地包 | 19,196,908 | 18.308 |

- 主包 `< 4 MiB`：PASS。
- 全部本地包 `< 30 MiB`：PASS。
- 本轮未新增图片、音频或 Bundle，包体变化只涉及少量 TypeScript文本。

## 9. 修改文件

运行源码：

- `assets/scripts/GameController.ts`
- `assets/scripts/art/ArtPilotConfig.ts`（批次标识更新为art08-05）

QA配置与自动化：

- `tools/qa/art08_05_web_build_config.json`
- `tools/qa/art08_05_wechat_build_config.json`
- `tools/qa/validate_art08_05_visual_layout.mjs`
- `art_source/qa/art08-05/*`

报告：

- `VISUAL_POLISH_REPORT_v1.2.0-dev-art08-05.md`

## 10. 尚需人工真机确认

本轮范围内没有遗留的源码P0/P1问题。仍需用户在微信开发者工具/真机确认：

1. 刘海屏及微信右上角胶囊附近的实际观感。
2. 暂停页滑杆在不同手机触摸采样率下的拖动手感。
3. 两首BGM实际扬声器响度与暂停/前后台恢复。
4. 微信开发者工具上传前的官方包体分析结果。

这些项目不需要继续修改源码即可测试；本轮在此停止。
