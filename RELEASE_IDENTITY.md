# 《羊狼四线战》正式发布身份

- 游戏正式名称：羊狼四线战
- 正式 AppID：`wxfbd176abc5b3911c`
- 当前开发版本：`v1.3.0-dev-polish16-ui26-bgmalign01`
- 本轮整理批次：`v1.3.0-dev-polish16-ui26-bgmalign01`
- 本轮版本名称：暂停音乐风格卡片文字对齐修复

## 发布约束

- 从本批次开始，所有新的正式微信小游戏构建、微信开发者工具导入和未来上传只能使用正式 AppID `wxfbd176abc5b3911c`。
- 允许上传的构建必须由当前源码重新生成。
- `build/wechatgame` 旧目录属于过期构建，禁止直接上传。
- `tools/qa` 与 `art_source/qa` 中的旧配置和旧构建仅作为历史测试证据，其中出现的旧 AppID 不得用于未来上传。
- 正式构建前必须再次核对 AppID、Debug 关闭、Source Maps 关闭，并运行 `tools/release/validate_release_readiness.mjs`。
- 本文件不保存微信登录信息、Token、上传私钥或其他账户秘密。

## 当前门禁状态

正式 AppID 已归一化，两首正式 BGM 的授权状态以 `THIRD_PARTY_AUDIO.md` 当前记录为准，均为 `VERIFIED`。游戏运行版本为 `v1.3.0-dev-polish16-ui26-bgmalign01`；微信开发者工具和真机验证完成前，不进入正式发布版本。
