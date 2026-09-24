# 羊狼四线战 (WolfSheepBattle)

[English](README.md) | 中文

一款基于 **Cocos Creator 3.8.8** 开发、面向微信小游戏平台的回合制战棋游戏。

玩家在四条战线上布置单位、回合制对抗，通过兵种搭配与战术卡牌取胜。本仓库包含完整游戏源码：场景、TypeScript 玩法代码、运行时美术与音频资源，以及美术创作源文件。

## 试玩

**浏览器直接玩**（无需安装）：**https://wakeup595626-cmyk.github.io/WolfSheepBattle/**

微信小游戏构建包见 [Releases](https://github.com/wakeup595626-cmyk/WolfSheepBattle/releases)。下载解压后，用微信开发者工具导入，并填入你自己的 AppID。

## 从源码构建

1. 安装 **Cocos Creator 3.8.8**（版本固定在 `package.json` 的 `creator.version`）。
2. 用 Cocos Creator 打开本目录它会自动生成 `library/`、`temp/` 与 `build/`。
3. 打开 `assets/scenes/Battle.scene` 即可在编辑器内预览。
4. 构建：**项目  构建发布**，平台选择「微信小游戏」（或「Web Mobile」）。

> 构建前请把 AppID 换成你自己的。历史 QA 记录中出现的 AppID 属于原作者，缺少对应上传密钥无法使用，但也请勿误用。

## 目录结构

| 路径 | 说明 |
|---|---|
| `assets/` | 游戏工程主体：场景、TypeScript 脚本、Prefab、运行时资源 |
| `art_source/` | 美术创作源文件（角色、UI、战场、VFX） |
| `tools/` | 构建、QA 与发布校验脚本 |
| `THIRD_PARTY_LICENSES/` | 字体许可原文 |
| `THIRD_PARTY_AUDIO.md` | 逐首 BGM 溯源（来源、作者、SHA-256） |
| `*_REPORT.md` | 各版本开发报告，作为开发过程记录保留 |

## 第三方声明

字体授权见 `THIRD_PARTY_LICENSES/`；背景音乐来自 **Pixabay**（免费可商用），逐首记录在 `THIRD_PARTY_AUDIO.md`。除此之外的代码与美术资源均为原创。

详见 [THIRD_PARTY_NOTICES.zh.md](THIRD_PARTY_NOTICES.zh.md)。

## 社区与支持

- 通过 [GitHub Issues](https://github.com/wakeup595626-cmyk/WolfSheepBattle/issues) 报告问题。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。

## 参与贡献

参见 [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md)。

## 引用

```bibtex
@misc{wolfsheepbattle,
  title={WolfSheepBattle (羊狼四线战)},
  author={wakeUp595626-cmyk},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/wakeup595626-cmyk/WolfSheepBattle}},
}
```

## 许可证

[MIT](LICENSE)
