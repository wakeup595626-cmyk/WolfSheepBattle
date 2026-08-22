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
CHARACTER_OUTPUT = PROJECT_ROOT / "tmp/art10_ui_font_characters_v02.txt"
AUDIT_OUTPUT = PROJECT_ROOT / "tmp/art10_ui_font_audit_v02.json"

REQUIRED_LINES = (
    "继续战斗",
    "重新开始",
    "玩法说明",
    "返回标题",
    "背景音乐",
    "音乐",
    "音效",
    "游戏已暂停",
    "全体冲刺",
    "战地急救",
    "领地震荡",
)

EXTRA_TEXT = """
羊狼四线战 v1.2.0-dev
全体冲刺 场上有己方单位 移速+50% · 持续6秒 补给 2 冷却 10秒
战地急救 场上有受伤单位 全体恢复40%生命 补给 3 冷却 8秒
领地震荡 基地生命低于50% 仅作用于本方领地 小/中消灭，大/巨重伤并击退 零消耗 每局1次
战斗尚未开始 游戏已暂停 战斗已结束 生效中 5秒 冷却中 6秒 补给不足 0/2 补给不足 1/3
暂无己方单位 暂无受伤单位 生命低于50%解锁 领地内暂无敌人 本局已使用 点击使用
①②③④⑤ⅠⅡⅢⅣ+−%<>/·×≥≤：；，。（）【】“”！？、
"""

STRING_LITERAL = re.compile(r"(?s)(['\"`])((?:\\.|(?!\1).)*)\1")
UNICODE_ESCAPE = re.compile(r"\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))")


def decode_unicode_escapes(value: str) -> str:
    def replace(match: re.Match[str]) -> str:
        return chr(int(match.group(1) or match.group(2), 16))

    value = UNICODE_ESCAPE.sub(replace, value)
    value = value.replace("\\n", "\n").replace("\\t", "\t")
    return value


def candidate_files() -> list[Path]:
    files: set[Path] = set()
    for pattern in ("assets/**/*.ts", "assets/**/*.scene", "assets/**/*.json", "settings/**/*.json", "profiles/**/*.json"):
        files.update(PROJECT_ROOT.glob(pattern))
    for name in ("package.json",):
        path = PROJECT_ROOT / name
        if path.exists():
            files.add(path)
    return sorted(path for path in files if path.is_file())


def collect_characters() -> tuple[set[str], list[str]]:
    extracted_strings: list[str] = []
    for path in candidate_files():
        text = path.read_text(encoding="utf-8-sig", errors="strict")
        for match in STRING_LITERAL.finditer(text):
            extracted_strings.append(decode_unicode_escapes(match.group(2)))

    extracted_strings.extend(REQUIRED_LINES)
    extracted_strings.append(EXTRA_TEXT)
    extracted_strings.append("".join(chr(code) for code in range(0x20, 0x7F)))

    characters: set[str] = set()
    for value in extracted_strings:
        for char in value:
            if char in "\r\n\t" or unicodedata.category(char) == "Cs":
                continue
            if char.isprintable():
                characters.add(char)
    return characters, extracted_strings


def set_font_names(font: TTFont) -> None:
    name_table = font["name"]
    names = {
        1: "Noto Sans SC UI Subset",
        2: "Bold",
        3: "NotoSansSC-UI-Subset-v02-Bold",
        4: "Noto Sans SC UI Subset Bold",
        5: "Version 2.000; art10-ui-clarity01",
        6: "NotoSansSC-UI-Subset-v02-Bold",
    }
    for name_id, value in names.items():
        name_table.setName(value, name_id, 3, 1, 0x409)
        name_table.setName(value, name_id, 1, 0, 0)


def build() -> None:
    characters, _ = collect_characters()
    source_hash = hashlib.sha256(SOURCE_FONT.read_bytes()).hexdigest().upper()
    expected_hash = "A3041811A78C361B1DE50F953C805E0244951C21C5BD412F7232EF0D899AF0DA"
    if source_hash != expected_hash:
        raise RuntimeError(f"Unexpected source font SHA-256: {source_hash}")

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
    required_audit = {
        line: [char for char in line if ord(char) not in cmap]
        for line in REQUIRED_LINES
    }
    output_hash = hashlib.sha256(RUNTIME_OUTPUT.read_bytes()).hexdigest().upper()
    sorted_characters = sorted(characters, key=ord)
    CHARACTER_OUTPUT.write_text("".join(sorted_characters), encoding="utf-8", newline="\n")
    audit = {
        "batch": "v1.2.0-dev-art10-ui-clarity03",
        "source_font": str(SOURCE_FONT),
        "source_sha256": source_hash,
        "weight": audit_font["OS/2"].usWeightClass,
        "requested_character_count": len(characters),
        "font_cmap_count": len(cmap),
        "missing_glyph_count": len(missing),
        "missing_characters": missing,
        "required_lines": required_audit,
        "output_size_bytes": RUNTIME_OUTPUT.stat().st_size,
        "output_sha256": output_hash,
    }
    AUDIT_OUTPUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
    print(json.dumps(audit, ensure_ascii=True, indent=2))
    if missing:
        raise RuntimeError(f"Font is missing {len(missing)} requested characters")


if __name__ == "__main__":
    build()
