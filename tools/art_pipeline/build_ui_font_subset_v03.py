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
OUTPUT_LICENSE = SOURCE_LICENSE
AUDIT_OUTPUT = PROJECT_ROOT / "art_source/qa/art10-ui-clarity06/font_subset_audit_v03.json"

EXTRA_TEXT = """
羊狼四线战 v1.2.0-dev
关卡选择 通关上一关后解锁下一关
第1关 教学节奏 AI主要使用小狼并缓慢出兵，帮助熟悉四线操作。
第2关 轻度练习 AI使用小狼和中狼，提供更充足的练习时间。
第3关 标准节奏 AI正常争夺补给，并使用完整兵种与战术。
当前选择 可挑战 已通关 未解锁 关卡进度 通关后自动解锁 请先通关上一关
返回主菜单 重置本地进度 确认重置 取消 该操作仅用于开发测试，将恢复为仅第1关可挑战。
①②③④⑤ⅠⅡⅢⅣ+−%<>/·×≥≤：；，。（）【】“”！？、
"""

STRING_LITERAL = re.compile(r"(?s)(['\"`])((?:\\.|(?!\1).)*)\1")
UNICODE_ESCAPE = re.compile(r"\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))")


def decode_unicode_escapes(value: str) -> str:
    def replace(match: re.Match[str]) -> str:
        return chr(int(match.group(1) or match.group(2), 16))

    return UNICODE_ESCAPE.sub(replace, value).replace("\\n", "\n").replace("\\t", "\t")


def collect_characters() -> set[str]:
    values: list[str] = [EXTRA_TEXT, "".join(chr(code) for code in range(0x20, 0x7F))]
    files: set[Path] = set()
    for pattern in ("assets/**/*.ts", "assets/**/*.scene", "assets/**/*.json", "settings/**/*.json", "profiles/**/*.json"):
        files.update(PROJECT_ROOT.glob(pattern))
    for path in sorted(path for path in files if path.is_file()):
        text = path.read_text(encoding="utf-8-sig", errors="strict")
        values.extend(decode_unicode_escapes(match.group(2)) for match in STRING_LITERAL.finditer(text))

    characters: set[str] = set()
    for value in values:
        for char in value:
            if char not in "\r\n\t" and unicodedata.category(char) != "Cs" and char.isprintable():
                characters.add(char)
    return characters


def set_font_names(font: TTFont) -> None:
    names = {
        1: "Noto Sans SC UI Subset",
        2: "Bold",
        3: "NotoSansSC-UI-Subset-v03-Bold",
        4: "Noto Sans SC UI Subset Bold",
        5: "Version 3.000; art10-ui-clarity06",
        6: "NotoSansSC-UI-Subset-v03-Bold",
    }
    for name_id, value in names.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
        font["name"].setName(value, name_id, 1, 0, 0)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    required_text = EXTRA_TEXT.replace("\n", "")
    required_missing = sorted({char for char in required_text if char.isprintable() and ord(char) not in cmap})
    license_text = SOURCE_LICENSE.read_text(encoding="utf-8-sig")
    license_marker = "原字体版权及许可如下。"
    license_tail = license_text[license_text.index(license_marker):]
    OUTPUT_LICENSE.write_text(
        f"""羊狼四线战 UI 中文字体子集 v02

来源字体：Noto Sans SC Variable Font
本地原始文件：tmp/art03/font_source/NotoSansSC-VF.ttf
原始 SHA-256：{expected_source_hash}
派生方式：实例化为静态 700 字重后，按当前运行时可见文字制作 TrueType 子集。
子集版本：v1.2.0-dev-art10-ui-clarity06
请求/覆盖字符数：{len(characters)} / {len(cmap)}
缺失字形数：{len(missing)}
子集 SHA-256：{sha256(RUNTIME_OUTPUT)}
子集文件大小：{RUNTIME_OUTPUT.stat().st_size:,} bytes
派生字体内部名称：Noto Sans SC UI Subset Bold

{license_tail}
""",
        encoding="utf-8",
    )
    audit = {
        "batch": "v1.2.0-dev-art10-ui-clarity06",
        "source_font": str(SOURCE_FONT),
        "source_sha256": expected_source_hash,
        "output_font": str(RUNTIME_OUTPUT),
        "output_size_bytes": RUNTIME_OUTPUT.stat().st_size,
        "output_sha256": sha256(RUNTIME_OUTPUT),
        "requested_character_count": len(characters),
        "font_cmap_count": len(cmap),
        "missing_glyph_count": len(missing),
        "missing_characters": missing,
        "required_level_select_missing": required_missing,
    }
    AUDIT_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_OUTPUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    if missing or required_missing:
        raise RuntimeError("The v03 UI font subset is incomplete")


if __name__ == "__main__":
    build()
