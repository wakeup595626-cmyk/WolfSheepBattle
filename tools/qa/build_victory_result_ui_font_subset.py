from __future__ import annotations

import hashlib
import json
import re
import shutil
import unicodedata
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_FONT = PROJECT_ROOT / "tmp/art03/font_source/NotoSansSC-VF.ttf"
SOURCE_OUTPUT = PROJECT_ROOT / "art_source/ui/fonts/ui_font_cn_subset_v02.ttf"
RUNTIME_OUTPUT = PROJECT_ROOT / "assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf"
SOURCE_LICENSE = PROJECT_ROOT / "art_source/ui/fonts/ui_font_cn_subset_v02_LICENSE.txt"
AUDIT_OUTPUT = PROJECT_ROOT / "art_source/qa/victory-result-ui-01/font_subset_audit.json"
BATCH = "v1.2.0-dev-victory-result-ui-01"

EXTRA_TEXT = """
战斗胜利 战斗失败
挑战成功 挑战未完成 成功击破敌方基地 玩家基地已被击破
羊方表现 狼方表现 基地剩余 派出单位 获得补给 使用战术 未使用
重新挑战 下一关 返回选关
可继续挑战第2关，也可以返回选关。
当前已完成全部开放关卡。
本关已再次完成，可重新挑战或选择其他关卡。
可重新挑战，也可以返回选关调整阵容。
第1关·教学节奏 第2关·轻度练习 第3关·标准节奏 第4关·泥泞与花径
0123456789/·，。次
"""

STRING_LITERAL = re.compile(r"(?s)(['\"`])((?:\\.|(?!\1).)*)\1")
UNICODE_ESCAPE = re.compile(r"\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def decode_unicode_escapes(value: str) -> str:
    return UNICODE_ESCAPE.sub(lambda match: chr(int(match.group(1) or match.group(2), 16)), value) \
        .replace("\\n", "\n").replace("\\t", "\t")


def collect_characters() -> set[str]:
    values = [EXTRA_TEXT, "".join(chr(code) for code in range(0x20, 0x7F))]
    files: set[Path] = set()
    for pattern in ("assets/**/*.ts", "assets/**/*.scene", "assets/**/*.json", "settings/**/*.json", "profiles/**/*.json"):
        files.update(PROJECT_ROOT.glob(pattern))
    for path in sorted(path for path in files if path.is_file()):
        text = path.read_text(encoding="utf-8-sig", errors="strict")
        values.extend(decode_unicode_escapes(match.group(2)) for match in STRING_LITERAL.finditer(text))
    return {
        char
        for value in values
        for char in value
        if char not in "\r\n\t" and unicodedata.category(char) != "Cs" and char.isprintable()
    }


def set_font_names(font: TTFont) -> None:
    names = {
        1: "Noto Sans SC UI Subset",
        2: "Bold",
        3: "NotoSansSC-UI-Subset-v04-Bold",
        4: "Noto Sans SC UI Subset Bold",
        5: f"Version 4.000; {BATCH}",
        6: "NotoSansSC-UI-Subset-v04-Bold",
    }
    for name_id, value in names.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
        font["name"].setName(value, name_id, 1, 0, 0)


def build() -> None:
    expected_source_hash = "A3041811A78C361B1DE50F953C805E0244951C21C5BD412F7232EF0D899AF0DA"
    if sha256(SOURCE_FONT) != expected_source_hash:
        raise RuntimeError("Unexpected Noto Sans SC source font")

    characters = collect_characters()
    font = TTFont(SOURCE_FONT, recalcTimestamp=False)
    instantiateVariableFont(font, {"wght": 700}, inplace=True, optimize=True)
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_languages = [0x409, 0x804]
    options.notdef_outline = True
    options.recommended_glyphs = True
    options.hinting = True
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=sorted(ord(char) for char in characters))
    subsetter.subset(font)
    font["OS/2"].usWeightClass = 700
    set_font_names(font)

    SOURCE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(SOURCE_OUTPUT, reorderTables=True)
    shutil.copyfile(SOURCE_OUTPUT, RUNTIME_OUTPUT)

    audit_font = TTFont(RUNTIME_OUTPUT, lazy=True)
    cmap = audit_font.getBestCmap() or {}
    missing = sorted(char for char in characters if ord(char) not in cmap)
    required = {char for char in EXTRA_TEXT if char.isprintable() and char not in "\r\n\t"}
    required_missing = sorted(char for char in required if ord(char) not in cmap)
    audit = {
        "batch": BATCH,
        "source_font": str(SOURCE_FONT),
        "source_sha256": expected_source_hash,
        "output_font": str(RUNTIME_OUTPUT),
        "output_size_bytes": RUNTIME_OUTPUT.stat().st_size,
        "output_sha256": sha256(RUNTIME_OUTPUT),
        "requested_character_count": len(characters),
        "font_cmap_count": len(cmap),
        "missing_glyph_count": len(missing),
        "missing_characters": missing,
        "required_result_ui_missing": required_missing,
    }
    AUDIT_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_OUTPUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    license_text = SOURCE_LICENSE.read_text(encoding="utf-8-sig")
    marker = "原字体版权及许可如下。"
    license_tail = license_text[license_text.index(marker):]
    SOURCE_LICENSE.write_text(
        f"""羊狼四线战 UI 中文字体子集 v02

来源字体：Noto Sans SC Variable Font
本地原始文件：tmp/art03/font_source/NotoSansSC-VF.ttf
原始 SHA-256：{expected_source_hash}
派生方式：实例化为静态 700 字重后，按当前运行时可见文字制作 TrueType 子集。
子集批次：{BATCH}
请求/覆盖字符数：{len(characters)} / {len(cmap)}
缺失字形数：{len(missing)}
子集 SHA-256：{sha256(RUNTIME_OUTPUT)}
子集文件大小：{RUNTIME_OUTPUT.stat().st_size:,} bytes
派生字体内部名称：Noto Sans SC UI Subset Bold

{license_tail}
""",
        encoding="utf-8",
    )
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    if missing or required_missing:
        raise RuntimeError("The result UI font subset is incomplete")


if __name__ == "__main__":
    build()
