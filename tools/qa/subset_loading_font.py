"""Build the boot/loading-screen TTF subset used by the WeChat main package."""

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


LOADING_UI_STRINGS = (
    "羊狼四线战",
    "青青草原四线争夺战",
    "正在准备四线战场… 0%",
    "小提示：选择兵种后，点击任意道路即可出兵。",
    "小提示：占领中央补给点可以获得补给。",
    "小提示：合理搭配大小单位，比一味堆兵更有效。",
    "小提示：战术牌需要满足补给或基地血量条件。",
    "重新尝试",
    "进入基础画面",
    "有 0 项资源未能加载",
    "请检查网络连接，然后点击“重新尝试”。",
    "正在重新连接并校验资源…",
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    codepoints = set(range(0x20, 0x7F))
    codepoints.update(ord(char) for text in LOADING_UI_STRINGS for char in text)

    font = TTFont(args.source)
    source_cmap = set((font.getBestCmap() or {}).keys())
    missing = sorted(codepoints - source_cmap)
    if missing:
        formatted = ", ".join(f"U+{value:04X}" for value in missing)
        raise SystemExit(f"source font is missing required loading glyphs: {formatted}")

    options = subset.Options()
    # The boot screen uses single-line Cocos Labels only. Kerning/shaping tables
    # and bytecode hinting add noticeable main-package weight without changing
    # these Chinese/ASCII labels at the rendered sizes used here.
    options.layout_features = []
    options.hinting = False
    options.name_IDs = [1, 2, 4, 6]
    options.name_legacy = False
    options.name_languages = [0x409]
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recalc_bounds = True
    options.recalc_timestamp = False
    options.canonical_order = True

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=sorted(codepoints))
    subsetter.subset(font)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    font.save(args.output)

    output_cmap = set((TTFont(args.output).getBestCmap() or {}).keys())
    output_missing = sorted(codepoints - output_cmap)
    if output_missing:
        formatted = ", ".join(f"U+{value:04X}" for value in output_missing)
        raise SystemExit(f"generated subset is missing loading glyphs: {formatted}")

    print(f"source={args.source} bytes={args.source.stat().st_size}")
    print(f"output={args.output} bytes={args.output.stat().st_size}")
    print(f"required_codepoints={len(codepoints)}")


if __name__ == "__main__":
    main()
