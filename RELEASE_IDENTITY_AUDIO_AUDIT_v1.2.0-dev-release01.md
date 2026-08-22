# 《羊狼四线战》发布身份与 BGM 授权审计

- 审计批次：`v1.2.0-dev-release01`
- 审计日期：2026-07-30
- Git 基线：`f9e29dda89887123d8035c264964842e83d5cecc`
- 修改前游戏版本：`v1.2.0-dev`
- 修改后游戏版本：`v1.2.0-dev`
- 正式名称：羊狼四线战
- 正式 AppID：`wxfbd176abc5b3911c`

## 1. 正式 AppID 归一化结果

当前有效配置已统一：

| 当前有效配置 | 修改前 | 修改后 | 结果 |
|---|---|---|---|
| `project.config.json` | `wx2e96cd6c921411a9` | `wxfbd176abc5b3911c` | 通过 |
| `profiles/v2/packages/wechatgame.json` / `builder.options.wechatgame.appid` | `wx6ac3f5090a6b99c5` | `wxfbd176abc5b3911c` | 通过 |
| `profiles/v2/packages/wechatgame.json` / `builder.taskOptionsMap.*.appid` | `wx6ac3f5090a6b99c5` | `wxfbd176abc5b3911c` | 通过 |

只读扫描项目根目录 JSON、`profiles`、`settings` 与 `build-templates` 后，当前有效范围只发现上述 3 个 AppID 字段，均为正式 AppID。`project.config.json` 与 `profiles/` 受现有 `.gitignore` 管理，但其本地当前生效值已经完成归一化并回读确认。

新增 `RELEASE_IDENTITY.md` 和 `tools/release/release_identity.json`，明确规定新的正式构建只能使用 `wxfbd176abc5b3911c`，并必须由当前源码重新生成。

## 2. 保留的历史配置

按任务边界，没有修改 `tools/qa`、`art_source/qa` 或旧 `build`。

历史 QA 范围仍有 17 处旧 AppID 引用：

- `tools/qa` 中 11 份旧微信构建配置；
- `art_source/qa` 中 6 份旧 QA 构建证据。

这些文件只用于复现历史测试，不得作为未来正式上传配置。`build/wechatgame` 旧目录同样不得直接上传。

## 3. “赛博欢乐”核验

- 游戏内名称：赛博欢乐
- 曲目 ID：`cyberwave_upbeat`
- 作品名称：Fun Game - Upbeat Happy Video Game Music
- 作者：Cyberwave-Orchestra
- 曲目编号：249646
- 作品页：https://pixabay.com/music/upbeat-fun-game-upbeat-happy-video-game-music-249646/
- 许可摘要：https://pixabay.com/service/license-summary/
- 页面发布时间：2024-10-14
- 页面状态：Content ID Registered
- RELEASE STATUS：`VERIFIED`

2026-07-30 公开页面复核结果：

- 作品页仍存在，作者、标题和曲目编号与本地记录一致；
- 页面仍显示受 Pixabay Content License 许可使用；
- 页面仍显示 Content ID Registered；
- 许可摘要允许免费使用、无需强制署名并允许修改或改编；
- 许可摘要禁止以独立素材形式出售或分发基本未改变的内容。

条件性结论：公开证据支持把该曲目嵌入具有独立创作内容的游戏整体，但必须遵守 Pixabay Content License、禁止用途及可能存在的第三方权利。本记录不构成法律意见，也不表示《羊狼四线战》拥有该音乐著作权。由于曲目登记了 Content ID，宣传视频或游戏录屏可能收到自动版权声明。

证据已保存到 `art_source/licenses/audio/pixabay/cyberwave_upbeat/`。当前没有伪造或代替用户取得登录后下载证书。

### 具体曲目授权证据

用户补充的 `pixabay_track_cyberwave_upbeat_2026-07-30.png` 是具体曲目页面截图，可直接对应作品标题、作者 Cyberwave-Orchestra、约 1 分 03 秒时长、可免费下载状态、Pixabay Content License 提示和 Content ID Registered 状态。截图 SHA-256 为：

`E53F8C81807A74C403F71BB2D7FB0EEB8B3119E7B28E015791115B718B8F8C97`

该截图与公开作品页和许可摘要共同构成本次条件性核验依据，但不代表项目取得音乐著作权，也不能替代可能存在的登录后下载证书。

截图采用复制方式归档，目标文件与用户临时目录原截图 SHA-256 完全一致；原截图仍然存在，未移动或删除。

## 4. “轻松欢快”核验

- 游戏内名称：轻松欢快
- 曲目 ID：`cheerful_lighthearted`
- 具体作品名称：欢快
- 作者：melody
- 来源平台：耳聆网（Ear0）
- 许可协议：CC0
- Ear0 通用政策页：https://www.ear0.com/home/info/keyword-license
- CC0 官方说明：https://creativecommons.org/publicdomain/zero/1.0/deed.zh-hans
- 具体作品页：待补充，不构成当前授权阻断
- RELEASE STATUS：`VERIFIED`

### 曲目级核心证据

`ear0_track_huankuai_melody_cc0_2026-07-30.png` 是《欢快》的曲目级授权弹窗截图，明确显示曲名“欢快”、作者 melody、来源耳聆网、CC0“完全共享协议”，以及 MP3、约 2.04 MB、128 kbps、44100 Hz、立体声等参数。

截图 SHA-256：

`91788B0E4ECE63305D8D28C1D216DFC4937412D32E6321BEE40645E726470B18`

该截图是本首音乐授权判断的核心证据。它把具体曲目、作者和 CC0 许可直接对应起来。

### 耳聆网通用政策证据

`ear0_cc_policy_page_2026-07-30.png` 是耳聆网通用 CC 许可政策页截图。该页面说明上传者为每一首音频分别选择 CC0、CC-BY 或 CC-BY-NC，下载者应遵循该具体音频的许可；页面对 CC0 的说明包含商业目的使用。

截图 SHA-256：

`F220EAC75564380AFF76BAC3F1F2D753183B1B3BAC46C2F61C29817790964AD6`

该政策页不是《欢快》的具体曲目详情页，不能单独证明本曲目采用 CC0；本次授权判断以曲目级授权弹窗为核心，以通用政策页和 CC0 官方说明为范围解释。

### CC0 范围

Creative Commons 的 CC0 1.0 官方说明允许复制、修改、发行和表演作品，也可用于商业目的，无需另行取得同意；同时保留专利、商标、第三方权利、免责声明及不得暗示作者认可等边界。

曲目详情页 URL 仍建议后续补录，但现有证据已经明确曲名、作者和曲目级 CC0 许可，因此不再构成当前发布阻断项。

证据已保存到 `art_source/licenses/audio/ear0/cheerful_lighthearted/`。截图采用复制方式归档，目标文件与用户临时目录原截图 SHA-256 一致；原截图未移动或删除。

### 证据分类结论

| 证据 | 类型 | 能证明 | 边界 |
|---|---|---|---|
| `ear0_track_huankuai_melody_cc0_2026-07-30.png` | 具体曲目授权截图 | 《欢快》、作者 melody、来源 Ear0、CC0 及音频参数 | 当前未显示可复制的详情页 URL |
| `ear0_cc_policy_page_2026-07-30.png` | 平台通用政策截图 | Ear0 的逐曲许可机制及 CC0 通用解释 | 不是《欢快》的详情页，不能脱离曲目截图单独授权 |
| `pixabay_track_cyberwave_upbeat_2026-07-30.png` | 具体曲目页面截图 | Pixabay 曲目、作者、页面许可提示、Content ID 与时长 | 不代表项目拥有著作权；不取代登录后下载证书 |

## 5. BGM 文件校验

| 文件 | 字节数 | SHA-256 | 结果 |
|---|---:|---|---|
| `art_source/_archive/audio_bgm_source_v120/bgm_cheerful_lighthearted.mp3` | 2,143,295 | `6147CCEB95E78CE2AFCACCCD4CBAA020CB8A0809B981A606A7F5078E7B443994` | 与记录一致 |
| `art_source/_archive/audio_bgm_source_v120/bgm_cyberwave_upbeat.mp3` | 2,004,532 | `890879DC602A5D120F38B0AA58D97D19D93AB19E7C316CAFD032FB58C7565DBF` | 与记录一致 |
| `assets/bundles/audio_bgm/bgm/bgm_cheerful_lighthearted_runtime_v01.mp3` | 1,876,157 | `8257EA78ADBF13A13E79F7A6FF1853FB721F35B0A90AC8BD08666F9080072500` | 已记录 |
| `assets/bundles/audio_bgm/bgm/bgm_cyberwave_upbeat_runtime_v01.mp3` | 877,757 | `C64AD46428183743275CB8F1B941D09E17B942E75154436B5A2B5528A6C0EAA0` | 已记录 |

## 6. 发布门禁

新增只读脚本：

`tools/release/validate_release_readiness.mjs`

脚本只读取正式身份、两个当前有效配置和 `THIRD_PARTY_AUDIO.md`，不读取账户密码、Token、微信登录信息，也不扫描或修改历史 QA 文件。

本次运行结果：

- 正式身份 AppID：通过；
- 当前有效 AppID 全部统一：通过；
- 当前有效配置排除两个旧 AppID：通过；
- 两首正式 BGM 清单完整：通过；
- 全部正式 BGM 均为 `VERIFIED`：通过；
- 脚本状态：`READY`；
- 退出码：`0`。

## 7. 验证命令与真实结果

### JSON

读取并解析：

- `project.config.json`
- `profiles/v2/packages/wechatgame.json`
- `tools/release/release_identity.json`

结果：全部通过 JSON 解析。

### TypeScript

```powershell
node C:\ProgramData\cocos\editors\Creator\3.8.8\resources\app.asar.unpacked\node_modules\typescript\lib\tsc.js -p tools\qa\art08_04_tsconfig.json
```

结果：退出码 `0`，无 TypeScript 错误。

### 发布门禁

```powershell
node tools\release\validate_release_readiness.mjs
```

结果：状态 `READY`，退出码 `0`；正式 AppID 与两首 BGM 授权门禁均通过。

### 授权字段

`THIRD_PARTY_AUDIO.md` 两首曲目的 24 个统一字段均完整：`24/24`。

### 版本

`assets/scripts/GameController.ts` 仍为：

```ts
const GAME_VERSION = 'v1.2.0-dev';
```

本轮音频版权证据归档修订未修改 `GameController.ts`、`AudioManager.ts`、玩法数值、场景、运行时音频、Cocos 配置、`build` 或版本号。

## 8. 本轮音频证据修订文件

授权记录与截图：

- `THIRD_PARTY_AUDIO.md`
- `art_source/licenses/audio/pixabay/cyberwave_upbeat/TRACK_INFO.md`
- `art_source/licenses/audio/pixabay/cyberwave_upbeat/LICENSE_VERIFICATION.md`
- `art_source/licenses/audio/pixabay/cyberwave_upbeat/pixabay_track_cyberwave_upbeat_2026-07-30.png`
- `art_source/licenses/audio/ear0/cheerful_lighthearted/SOURCE_URL.txt`
- `art_source/licenses/audio/ear0/cheerful_lighthearted/LICENSE_URL.txt`
- `art_source/licenses/audio/ear0/cheerful_lighthearted/TRACK_INFO.md`
- `art_source/licenses/audio/ear0/cheerful_lighthearted/LICENSE_VERIFICATION.md`
- `art_source/licenses/audio/ear0/cheerful_lighthearted/ear0_cc_policy_page_2026-07-30.png`
- `art_source/licenses/audio/ear0/cheerful_lighthearted/ear0_track_huankuai_melody_cc0_2026-07-30.png`

审计报告：

- `RELEASE_IDENTITY_AUDIO_AUDIT_v1.2.0-dev-release01.md`

## 9. 后续建议与审核用途

“赛博欢乐”：

- 手动登录 Pixabay 后保存下载记录或许可证书（若站点提供）；
- 补充实际下载日期；
- 正式构建前再次复核作品页和完整许可条款。

“轻松欢快”：

- 建议后续补录《欢快》的具体作品详情页 URL；
- 当前已有曲名、作者、来源和 CC0 曲目级截图，因此详情页 URL 不再构成当前授权阻断。

发布审核：

- 音频授权截图和审计文档只保存在 `art_source/licenses` 与 `release_evidence`，不得进入微信小游戏运行包。
- 微信审核要求补充版权材料时，可从 `release_evidence/audio/v1.2.0-dev-release01/` 提取提交。
- 本审计报告是项目内部证据整理，不是微信官方认证、版权登记证书或法律意见。

建议鸣谢文案（本轮不修改游戏界面）：

- 《欢快》— melody，来源：耳聆网，CC0
- Fun Game - Upbeat Happy Video Game Music — Cyberwave-Orchestra，来源：Pixabay

## 10. 证据目录与压缩包

- 审核证据目录：`release_evidence/audio/v1.2.0-dev-release01/`
- 证据压缩包：`release_evidence/audio/AUDIO_LICENSE_EVIDENCE_v1.2.0-dev-release01.zip`
- 目录内容：3 张授权截图、授权清单、审计报告、网址清单、证据索引和 SHA-256 清单
- 排除内容：不包含任何 MP3、运行时资源、源码、场景、Cocos 配置或 `build`

微信审核要求补充版权材料时，可以从该证据目录或 ZIP 提取提交。证据文件不得放入微信小游戏运行包。

## 11. Git 与操作边界

- Git HEAD：`f9e29dda89887123d8035c264964842e83d5cecc`
- 工作区：非干净；包含此前美术、音频和 QA 批次的用户现有成果，以及本轮新增的音频授权证据与发布证据包。
- 本轮保留了所有既有改动，没有 reset、checkout、清理或覆盖历史 QA。
- 本轮未执行 Cocos 构建。
- 本轮未修改旧 `build/wechatgame`。
- 本轮未上传微信平台。
- 本轮未创建 Git 提交。
- 本轮未创建或修改 Git 标签。

## 12. 最终结论

- 正式 AppID `wxfbd176abc5b3911c`：`VERIFIED`
- `cyberwave_upbeat`：`VERIFIED`
- `cheerful_lighthearted`：`VERIFIED`
- 当前游戏版本：`v1.2.0-dev`
- 音频授权门禁：通过

两首正式 BGM 均已有对应授权依据。《欢快》的详情页 URL 仍建议补录，但已有曲名、作者和 CC0 曲目级截图，不再作为当前发布阻断项。是否进入 `v1.2.0-rc1` 仍需另行完成正式构建与真机验收，本报告不自动升级版本。
