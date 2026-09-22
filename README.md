# 羊狼四线战 (WolfSheepBattle)

> 一款用 **Cocos Creator 3.8.8** 开发的微信小游戏  回合制战棋 / 卡牌对抗
> A turn-based tactics mini-game for WeChat, built with Cocos Creator 3.8.8.

---

## 中文

### 这是什么

《羊狼四线战》是一个可以运行在微信小游戏平台的策略对战游戏。玩家在四条战线上布置单位，通过战术卡牌与单位搭配进行回合制对抗。

项目已完整包含游戏源码、场景、美术源文件与音频运行时资源，可以直接用 Cocos Creator 打开、预览和构建。

### 怎么跑起来

1. 安装 **Cocos Creator 3.8.8**（版本需匹配，见 `package.json` 的 `creator.version`）
2. 用 Cocos Creator 打开本目录（它会自动生成 `library/`、`temp/`、`build/`）
3. 打开 `assets/scenes/Battle.scene` 即可在编辑器内预览
4. 构建微信小游戏：Cocos Creator  项目  构建发布  平台选「微信小游戏」

> **构建前请把微信 AppID 换成你自己的。** 仓库里出现的 `wxfbd176abc5b3911c` 等 AppID 属于原作者，仅用于历史构建记录；没有对应的上传密钥也无法使用，但请勿误用。

### 目录结构

| 目录 | 说明 |
|---|---|
| `assets/` | 游戏工程主体：场景、脚本、Prefab、运行时资源（**核心**） |
| `art_source/` | 美术创作源文件（角色、UI、战场背景、VFX） |
| `tools/` | 构建、QA 与发布校验脚本 |
| `release_assets/` `release_materials/` | 发布用物料 |
| `THIRD_PARTY_LICENSES/` | 第三方字体许可原文 |
| `THIRD_PARTY_AUDIO.md` | BGM 授权记录（含来源、作者、SHA-256） |
| `*_REPORT.md` | 各版本开发报告，保留作为开发过程记录 |

### 第三方资源与授权

- **字体**：见 `THIRD_PARTY_LICENSES/`（4 份许可原文）
- **BGM**：来自 **Pixabay**（免费可商用），逐首记录在 `THIRD_PARTY_AUDIO.md`，含原作者与原始文件 SHA-256
- 除此之外的代码与美术资源均为作者原创

### 许可证

**MIT**，详见 [LICENSE](LICENSE)。

---

## English

### What is this

*WolfSheepBattle* is a turn-based tactics game for the WeChat Mini Game platform. Players deploy units across four battle lines and fight turn by turn using tactic cards and unit synergies.

The repository contains the complete game source, scenes, art source files and runtime audio  you can open it with Cocos Creator, preview it, and build it.

### Getting started

1. Install **Cocos Creator 3.8.8** (must match `creator.version` in `package.json`)
2. Open this folder with Cocos Creator (it will regenerate `library/`, `temp/`, `build/`)
3. Open `assets/scenes/Battle.scene` to preview in the editor
4. To build: Cocos Creator  Project  Build  select the **WeChat Mini Game** platform

> **Replace the WeChat AppID with your own before building.** The AppIDs found in this repo (`wxfbd176abc5b3911c` and others) belong to the original author and are kept only as historical build records. They are useless without the matching upload key, but please don't misuse them.

### Third-party assets

- **Fonts**  see `THIRD_PARTY_LICENSES/` (4 license files)
- **BGM**  sourced from **Pixabay** (free for commercial use); each track is documented in `THIRD_PARTY_AUDIO.md` with author and original file SHA-256
- Everything else (code and art) is original work by the author

### License

**MIT**  see [LICENSE](LICENSE).
