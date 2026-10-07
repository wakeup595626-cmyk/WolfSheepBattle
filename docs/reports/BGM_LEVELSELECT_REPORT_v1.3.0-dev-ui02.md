# 双 BGM 选择与关卡分页报告

版本：`v1.3.0-dev-ui02`  
版本名称：双 BGM 选择与关卡分页  
项目：`D:\GameProjects\WolfSheepBattle`  
引擎：Cocos Creator 3.8.8  
日期：2026-08-10

## 1. 修改前问题

### 背景音乐

- `AudioManager` 已经保存 `selectedBgmId`，也已有单例播放器和淡入淡出代码，但 `requestMenuBgm()` 与 `requestBattleBgm()` 分别硬编码为菜单曲和战斗曲，玩家保存的选择会在界面/战斗切换时被覆盖。
- 暂停菜单“背景音乐”区域仅显示当前请求曲名，左右按钮隐藏，没有真正可操作的双曲目选择界面。
- 原故障回退只支持“热血曲失败后回到默认轻松曲”；默认曲本身失败时直接静音，没有反向回退到另一首曲目的路径。

### 关卡选择

- 6张关卡卡片一次性塞进同一页面，每张仅70逻辑像素高。
- 第6关说明被单独缩到11.5字号；不同关卡的说明排版规则不统一。
- 没有上一页、下一页和当前页指示，将来增加关卡时会继续向下挤压。

## 2. 实际修改文件

| 文件 | 修改目的 |
|---|---|
| `assets/scripts/AudioManager.ts` | 让所选BGM成为标题、选关、卡组、战斗、暂停和结算界面的统一曲目；补全双向故障回退 |
| `assets/scripts/GameController.ts` | 双BGM卡片UI、分页关卡选择、版本标识和交互状态 |
| `RELEASE_IDENTITY.md` | 更新开发版本、批次与版本名称 |
| `tools/release/release_identity.json` | 同步发布门禁版本 |
| `tools/qa/ui02_web_build_config.json` | UI02网页验证构建配置 |
| `tools/qa/ui02_wechat_build_config.json` | UI02微信正式参数构建配置 |
| `tools/qa/validate_ui02.mjs` | 双BGM、持久化、故障回退、分页和快速点击功能验证 |
| `tools/qa/validate_ui02_responsive.mjs` | 紧凑/超宽横屏安全区和触摸区域验证 |
| `BGM_LEVELSELECT_REPORT_v1.3.0-dev-ui02.md` | 本报告 |

没有修改 `THIRD_PARTY_AUDIO.md` 的授权事实，没有重新导入、复制、下载或压缩音乐；没有手工修改 `build`、`library`、`temp` 中的生成文件。

## 3. 两首BGM实际路径与UUID

| 界面名称 | 运行资源 | UUID |
|---|---|---|
| 轻松欢快 | `assets/bundles/audio_bgm/bgm/bgm_cheerful_lighthearted_runtime_v01.mp3` | `c692900e-1973-43f1-b1e2-6dccf6076880` |
| 热血对战 | `assets/bundles/audio_bgm/bgm/bgm_cyberwave_upbeat_runtime_v01.mp3` | `9a348485-4f7f-4a50-9add-5efd593c732e` |

轻松欢快副标题为“温暖、治愈、轻松的草原旋律”；热血对战副标题为“节奏明快、适合激烈对抗”，并显示辅助曲名 `Fun Game`。

## 4. 本地存储键与默认值

继续扩展既有统一对象，不创建平行设置系统：

- 主键：`wolf-sheep-battle.audio-settings.v1`
- `selectedBgmId`：默认 `cheerful_lighthearted`
- `musicVolume`：默认 `0.5`
- `sfxVolume`：默认 `0.75`
- `musicMuted` / `sfxMuted`：默认 `false`
- `lastNonZeroMusicVolume`：默认 `0.5`
- `lastNonZeroSfxVolume`：默认 `0.75`

仍兼容原有独立旧键：

- `wolf-sheep-battle.audio.music-enabled`
- `wolf-sheep-battle.audio.sfx-enabled`
- `wolf-sheep-battle.audio.music-volume`
- `wolf-sheep-battle.audio.sfx-volume`
- 两个 `last-volume` 键

界面风格名与存储ID映射：

- `cheerful` → 项目既有ID `cheerful_lighthearted`
- `battle` → 项目既有ID `cyberwave_upbeat`

沿用完整既有ID可避免迁移破坏。音乐与音效音量仍是独立字段和独立控制链。

## 5. 音乐选择与淡入淡出

- 暂停菜单同时显示上下两张奶油色/浅绿色卡片。
- 当前项使用浅金底、金色粗描边、柔和外发光、右上角勾选和“当前使用”。
- 每张卡触摸高度58逻辑像素，满足至少44像素要求。
- 点击卡片立即激活音频上下文、保存选择并试听；不改变游戏暂停状态。
- 全局只保留一个 `BgmAudioSource`。切换时先在0.3秒内淡出旧曲，替换同一个AudioSource的clip，再在0.3秒内淡入新曲。
- `bgmRequestToken` 使旧异步加载和旧淡入淡出回调失效；快速连续点击只接受最后一次请求。
- 标题、关卡选择、战术卡组、战斗、暂停、胜利/失败现在都请求 `selectedBgmId`。请求同一曲目时不会替换clip或重新从头播放。
- 单曲加载失败时自动选择另一首并保存；两首都失败时停止BGM、继续游戏，并通过一次性标记输出明确警告，避免持续刷日志。

## 6. 微信自动播放与生命周期

- 冷启动先预加载/解码资源，不通过代码绕过微信首次交互限制。
- 未解锁时只保存 `desiredBgm`，不创建第二个播放器、不循环调用播放。
- 第一次触摸/点击由既有全局输入监听执行一次 `unlockAudio()`，随后播放当前所选曲目。
- 后台 `EVENT_HIDE` 暂停BGM并停止音效；前台 `EVENT_SHOW` 仅在音乐未静音、生命周期允许且已有目标曲目时恢复。
- 音乐音量为0时 `musicEnabled=false`，前台恢复和界面切换都不会擅自开声。
- `onShow` 复用同一个常驻AudioSource，不创建新实例。

## 7. 关卡分页结构

- 每页数量：常量 `LEVEL_SELECT_ITEMS_PER_PAGE = 3`。
- 总页数：`Math.ceil(LEVEL_CONFIGS.length / 3)`，最低1页，没有把2页写死。
- 当前6关自动得到2页；未来7—9关会自动得到3页。
- 所有关卡卡片仅创建一次；翻页只调整 `active`、页内位置和0.2秒轻微横向过渡，不反复创建节点。
- 当前选择保存在 `pendingLevelSelection/currentLevel`；翻页不清除选择。
- 再次打开时按所选关卡在 `LEVEL_CONFIGS` 中的索引自动定位页面。
- 第一页“上一页”和最后一页“下一页”使用灰色禁用样式，回调再次做边界拦截。
- 点击卡片只选择并保存；只有点击“开始挑战第X关”才调用战斗入口。
- `levelSelectStartLocked` 阻止快速连续点击造成重复进入。
- 卡片高度112、说明区50；全部说明使用统一15字号、左对齐、最多两行、CLAMP溢出策略。

## 8. 六个关卡最终文案

1. **第1关·教学节奏**  
   小狼缓慢出兵，熟悉选兵、四线部署与补给争夺。
2. **第2关·轻度练习**  
   小狼与中狼交替出兵，练习多路线判断与基础对抗。
3. **第3关·标准节奏**  
   完整兵种与战术登场，考验补给、能量与路线调度。
4. **第4关·泥泞与花径**  
   特殊道路改变移速，合理利用道路冻结突破防线。
5. **第5关·无限火力**  
   能量高速恢复，小型单位可持续部署，体验高频对抗。
6. **第6关·补给争夺战**  
   黄金补给线定时转移，围绕限时占领争夺额外补给。

文案与当前真实规则一致，没有修改六关玩法参数。

## 9. 1280×720与功能测试

### UI02功能审计

结果：17/17通过。

- 6关动态分成2页，每页3关。
- 默认第5关时自动打开第2页；第1页和第2页边界正确。
- 选择跨页保留，再次打开定位正确。
- 六关均可自由选择；卡片点击不进入战斗。
- 快速连续确认只进入一次，并进入所选第6关。
- 六条说明逐字核对、自动换行/截断和触摸高度均通过。
- 轻松→热血、热血→轻松和快速连续切换通过，始终只有一个BGM AudioSource。
- 标题/选关/战斗请求保持同一所选曲目。
- 后台/前台模拟保持曲目与单实例。
- 单曲失败回退、双曲失败静音及一次明确警告通过。
- 选择、音乐37%、音效63%写入原设置对象；完整页面重载后恢复成功。
- 战斗暂停期间切歌不改变暂停状态。
- 浏览器除测试故意触发的“双曲均不可用”一次性警告外，无意外warning/error和请求失败。

证据：`release_evidence/v1.3.0-dev-ui02/functional-final/`

### 横屏适配

- 1280×720：人工截图复核通过，分页卡片、分页栏、选择摘要和底部按钮无重叠。
- 844×390：自动安全区检查通过。
- 2400×1080：自动安全区检查通过。
- 两种横屏尺寸下，关卡卡片、分页按钮、底部按钮、双BGM卡片触摸高度均不小于44逻辑像素。

证据：`release_evidence/v1.3.0-dev-ui02/responsive-final/`

### 第1—5关回归

结果：8/8通过。实际执行四路部署、道路边界检查、暂停/恢复、重开清理，并确认第5关专属连续小单位规则没有扩散、旧1—5关完成记录仍保留。

## 10. TypeScript与工程检查

- 使用Cocos Creator 3.8.8自带TypeScript执行 `--noEmit --skipLibCheck`：通过。
- UI02两个QA脚本Node语法检查：通过。
- `git diff --check`（本轮两个源码文件）：通过。
- 发布门禁：`READY`；正式AppID与两首BGM授权状态均通过。
- Cocos Creator网页构建：成功。

## 11. 微信小游戏构建

- 构建平台：`wechatgame`
- AppID：`wxfbd176abc5b3911c`
- 项目名：`WolfSheepBattle-v1.3.0-dev-ui02-wechat`
- 横屏：`landscapeRight`
- Debug：关闭
- Source Maps：关闭；产物 `.map` 数量0
- 构建日志明确显示 `build Task (wechatgame) Finished`。
- 总产物：17,691,893字节；主包（不含分包）2,724,235字节。
- 没有手工编辑构建产物。

构建仍出现既有提示：`GameController.ts` 超过500KB，Babel停用代码生成器的格式美化。它不是编译失败，但属于后续可拆分的维护性问题。本轮按边界没有进行高风险架构重写。

## 12. 微信真机状态

**微信真机测试待用户完成。**

本机没有执行微信开发者工具登录态和真实手机运行，因此不能声称以下项目已通过真机：

- 微信胶囊按钮真实位置；
- 刘海、挖孔、圆角屏；
- 首次用户触摸后的真实音频解锁；
- 后台/前台真实音频行为；
- 触摸滑块和双BGM卡片手感；
- 真机是否存在音频爆音或设备差异。

## 13. 尚未解决的问题

- 真实微信开发者工具与真机验证仍需用户完成。
- `GameController.ts` 单文件约600KB以上，存在构建维护性提示；不影响本轮构建完成。
- 本轮没有加入左右滑动手势；需求将其列为可选项，上一页/下一页按钮已完整保留。

## 14. Git状态

- 分支：`master`
- 基线Commit：`f9e29dda89887123d8035c264964842e83d5cecc`
- 开始前工作区已有大量未提交修改，包括音频迁移、场景、音频管理、第6关、美术和构建设置。本轮全部保留，没有执行reset、checkout、clean或删除不明资源。
- 本轮未提交Git、未创建标签、未推送、未上传微信平台。
- 因 `AudioManager.ts`、`GameController.ts` 在开始前已经处于修改状态，仓库整体diff包含用户先前工作，不能把完整Git diff视为本轮独占改动。
