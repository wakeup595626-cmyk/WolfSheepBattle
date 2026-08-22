# v1.3.0-dev-share02-audio01 实施报告

## 范围

- 补齐微信小游戏 Android 朋友圈分享能力，同时保留好友分享。
- 新用户默认音乐、音效均为 80%，默认 BGM 为“轻松欢快”。
- 修复启动加载、菜单、选关、战前和战斗切换时的 BGM 播放意图与同曲连续性。
- 未制作或修改第一关新手教程，也未修改战斗规则、资源、美术、AppID 或授权材料。

## 基线与版本

- 分支：`master`
- HEAD：`f9e29dda89887123d8035c264964842e83d5cecc`
- 运行时版本：`v1.3.0-dev-share02-audio01`
- 补丁编号在修改前扫描为未占用，故采用建议编号。
- `RELEASE_IDENTITY.md` 与 `tools/release/release_identity.json` 仍记录历史 `ui04`，本轮未覆盖这些既有未跟踪发布身份文件；运行时版本以 `GameController.ts` 为准。

## 源码修改

- `assets/scripts/WeChatShareManager.ts`
  - 保留 `onShareAppMessage`；Android、SDK >= 2.11.3 且 `onShareTimeline` 存在时注册 `onShareTimeline`。
  - Android 请求 `['shareAppMessage', 'shareTimeline']`；iOS、低基础库、未知平台或接口缺失时仅保留好友分享。
  - 监听器为静态引用且各自最多注册一次；菜单就绪状态只在 success 回调后更新。
  - 菜单失败最多总共尝试两次，组合请求失败时第二次退回好友菜单；没有循环重试。
  - success、fail、complete 日志包含版本、platform、SDKVersion、实际 menus 和脱敏 errMsg/Error.message。
- `assets/scripts/GameController.ts`
  - 运行版本更新为 `v1.3.0-dev-share02-audio01`。
  - Canvas 校验后的稳定启动点调用 `WeChatShareManager.initialize(GAME_VERSION)`。
  - 启动时原有菜单/战斗 BGM 预加载与菜单请求保持在 AudioManager 建立后执行。
- `assets/scripts/AudioManager.ts`
  - 新用户、缺字段、损坏/越界音量存档以及 lastNonZero 回退均使用 0.8；合法旧存档、静音状态和选曲保留。
  - `requestMenuBgm()` 和 `requestBattleBgm()` 统一为同一选曲请求：正在播放时不重启，未播放时预加载并建立一次合规的早期播放尝试。
  - 平台阻止自动播放时保留播放意图，已有真实触摸/鼠标首触监听会调用 `unlockAudio()`；未伪造用户交互。
  - 保留唯一 `GlobalAudioManager`、唯一 `BgmAudioSource`、缓存、淡入淡出和 `bgmRequestToken` 防竞态逻辑。
- `tools/qa/validate_share02_audio01.mjs`
  - 新增分享行为桩及 Web 运行时音频验收。
- `tools/qa/share02_audio01_web_build_config.json`
- `tools/qa/share02_audio01_wechat_build_config.json`
  - 新增隔离输出配置，避免覆盖既有构建目录。

## 验证结果

### 静态与运行时

- `git diff --check`：通过。
- QA 脚本语法检查：通过。
- 分享行为桩：Android、iOS、低 SDK、接口缺失、无 wx、重复 initialize、组合失败降级、同步异常和两次上限均通过。
- Web 浏览器运行时审计：38/38 通过；新用户 80%/80%/轻松欢快、合法旧存档保留、越界与损坏存档修复、首触/允许自动播放路径、导航连续性、单 BGM Source、无意外网络失败均通过。
- 运行时审计：`release_evidence/v1.3.0-dev-share02-audio01/browser/share02_audio01_runtime_audit.json`，SHA-256 `3F851DBF56BA694D99BCFF308C63021C83084FBF7B43BEED979618D2D435F3C4`。

### Cocos Creator 3.8.8 构建

| 平台 | 输出目录 | 时间 | 结果 |
| --- | --- | --- | --- |
| Web Mobile | `build/web-mobile-share02-audio01` | 2026-08-19 13:47:01–13:47:14 | 完成，438 文件，18,008,777 B |
| 微信小游戏 | `build/wechatgame-share02-audio01` | 2026-08-19 13:47:28–13:47:41 | 完成，443 文件，17,906,628 B |

Creator 3.8.8 CLI 退出码为 36，两个日志均有 `build Task (...) Finished`，无 `task_failed`。日志保留了 GameController 超过 500 KB 的 Babel 非致命样式去优化提示，以及 build-script 子进程 SIGTERM debug 行；其后构建任务均成功 Finished。

微信构建的 `project.config.json` 已核对：AppID `wxfbd176abc5b3911c`、`compileType: game`；`game.json` 为 `landscapeRight`。生成 `assets/main/index.js` 同时含 `onShareAppMessage`、`onShareTimeline`、`shareAppMessage`、`shareTimeline`，SHA-256 `745AC0B5D8C502D7F0C22DCAD6513D622909780AB68020059A78FBC796DAAB24`。

## 平台验证边界

- 微信开发者工具：未验证；本轮未导入或上传新包，故没有真实基础库版本、showShareMenu success/fail/complete 回调或菜单灰度状态。
- Android 真机：未验证；朋友圈仅应在微信实际支持的 Android 基础库环境继续确认。
- iOS 真机：未验证；代码仅保持好友分享，朋友圈仍受微信官方当前平台能力限制。
- HarmonyOS 真机：未验证；以真实设备结果为准。
- 好友接收、朋友圈发布流程、线上正式版：均未验证。
- 现有 `build/wechatgame` 是独立的旧候选目录，未能从本地文件证明其曾上传；本轮新包位于隔离目录 `build/wechatgame-share02-audio01`，未上传。

## 外部状态

未执行 Git 提交、打标签、推送、微信版本上传、提审或正式发布。
