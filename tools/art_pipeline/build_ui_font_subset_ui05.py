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
SOURCE_LICENSE = PROJECT_ROOT / "art_source/ui/fonts/ui_font_cn_subset_v02_LICENSE.txt"
SOURCE_OUTPUT = PROJECT_ROOT / "art_source/ui/fonts/ui_font_cn_subset_ui05_regular.ttf"
PREVIOUS_RUNTIME_FONT = (
    PROJECT_ROOT / "assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_v02.ttf"
)
RUNTIME_OUTPUT = (
    PROJECT_ROOT
    / "assets/bundles/art_boot/ui/fonts/ui_font_cn_subset_runtime_ui05_regular.ttf"
)
SOURCE_OUTPUT_LICENSE = (
    PROJECT_ROOT / "art_source/ui/fonts/ui_font_cn_subset_ui05_regular_LICENSE.txt"
)
THIRD_PARTY_LICENSE = (
    PROJECT_ROOT / "THIRD_PARTY_LICENSES/ui_font_cn_subset_ui05_regular_LICENSE.txt"
)
AUDIT_OUTPUT = (
    PROJECT_ROOT / "art_source/qa/ui05-typography/font_subset_audit_ui05.json"
)

SOURCE_SHA256 = "A3041811A78C361B1DE50F953C805E0244951C21C5BD412F7232EF0D899AF0DA"
FONT_WEIGHT = 400

TARGET_TEXT = """
关卡选择
选择关卡后，点击下方按钮开始挑战
第1关·教学节奏
第2关·轻度练习
第3关·标准节奏
第4关·泥泞与花径
第5关·无限火力
第6关·补给争夺战
小狼缓慢出兵，熟悉选兵、四线部署与补给争夺。
小狼与中狼交替出兵，练习多路线判断与基础对抗。
完整兵种与战术登场，考验补给、能量与路线调度。
特殊道路改变移速，合理利用道路冻结突破防线。
能量高速恢复，小型单位可持续部署，体验高频对抗。
黄金补给线定时转移，围绕限时占领争夺额外补给。
可挑战 当前选择 已通关 制作中
上一页 下一页 第1/2页 第2/2页 已通关 0/6
当前选择：第6关·补给争夺战
返回主菜单 开始挑战第6关 正在进入第6关… 该关卡尚在制作中
背景音乐风格
点击卡片立即试听并保存
轻松欢快
热血对战
温暖、治愈、轻松的草原旋律
节奏明快、适合激烈对抗
Ear0 · 欢乐
Pixabay · Fun Game
点击试听 当前使用
音乐 音效 0% 100% + − ✓
"""

STRING_LITERAL = re.compile(r"(?s)(['\"`])((?:\\.|(?!\1).)*)\1")
UNICODE_ESCAPE = re.compile(r"\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def decode_unicode_escapes(value: str) -> str:
    def replace(match: re.Match[str]) -> str:
        return chr(int(match.group(1) or match.group(2), 16))

    return UNICODE_ESCAPE.sub(replace, value).replace("\\n", "\n").replace("\\t", "\t")


def candidate_files() -> list[Path]:
    files: set[Path] = set()
    for pattern in (
        "assets/**/*.ts",
        "assets/**/*.scene",
        "assets/**/*.json",
        "settings/**/*.json",
        "profiles/**/*.json",
    ):
        files.update(PROJECT_ROOT.glob(pattern))
    return sorted(path for path in files if path.is_file())


def collect_characters() -> tuple[set[str], set[str]]:
    values = [TARGET_TEXT, "".join(chr(code) for code in range(0x20, 0x7F))]
    for path in candidate_files():
        text = path.read_text(encoding="utf-8-sig", errors="strict")
        values.extend(
            decode_unicode_escapes(match.group(2))
            for match in STRING_LITERAL.finditer(text)
        )

    characters = {
        char
        for value in values
        for char in value
        if char not in "\r\n\t"
        and unicodedata.category(char) != "Cs"
        and char.isprintable()
    }
    target_characters = {
        char
        for char in TARGET_TEXT
        if char not in "\r\n\t" and char.isprintable()
    }
    return characters, target_characters


def set_font_names(font: TTFont) -> None:
    names = {
        1: "Wolf Sheep Battle UI Typography",
        2: "Regular",
        3: "WolfSheepBattle-UI-Typography-ui05-Regular",
        4: "Wolf Sheep Battle UI Typography Regular",
        5: "Version 5.000; v1.3.0-dev-ui05",
        6: "WolfSheepBattle-UI-Typography-ui05-Regular",
    }
    for name_id, value in names.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
        font["name"].setName(value, name_id, 1, 0, 0)


def build() -> None:
    if sha256(SOURCE_FONT) != SOURCE_SHA256:
        raise RuntimeError("Unexpected Noto Sans SC source font")

    characters, target_characters = collect_characters()
    font = TTFont(SOURCE_FONT, recalcTimestamp=False)
    instantiateVariableFont(font, {"wght": FONT_WEIGHT}, inplace=True, optimize=True)

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
    font["OS/2"].usWeightClass = FONT_WEIGHT
    set_font_names(font)

    SOURCE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(SOURCE_OUTPUT, reorderTables=True)
    shutil.copyfile(SOURCE_OUTPUT, RUNTIME_OUTPUT)

    audit_font = TTFont(RUNTIME_OUTPUT, lazy=True)
    cmap = audit_font.getBestCmap() or {}
    missing = sorted(char for char in characters if ord(char) not in cmap)
    target_missing = sorted(char for char in target_characters if ord(char) not in cmap)
    previous_font = TTFont(PREVIOUS_RUNTIME_FONT, lazy=True)
    previous_cmap = previous_font.getBestCmap() or {}
    previous_target_missing = sorted(
        char for char in target_characters if ord(char) not in previous_cmap
    )

    license_text = SOURCE_LICENSE.read_text(encoding="utf-8-sig")
    license_marker = "原字体版权及许可如下。"
    license_tail = license_text[license_text.index(license_marker):]
    derived_license = f"""羊狼四线战 UI05 文字角色字体子集

来源字体：Noto Sans SC Variable Font
本地原始文件：tmp/art03/font_source/NotoSansSC-VF.ttf
原始 SHA-256：{SOURCE_SHA256}
派生方式：实例化为静态 {FONT_WEIGHT} 字重后，按当前源码与目标界面文字制作 TrueType 子集。
子集版本：v1.3.0-dev-ui05
请求/覆盖字符数：{len(characters)} / {len(cmap)}
目标界面缺失字形数：{len(target_missing)}
全部请求缺失字形数：{len(missing)}
子集 SHA-256：{sha256(RUNTIME_OUTPUT)}
子集文件大小：{RUNTIME_OUTPUT.stat().st_size:,} bytes
派生字体内部名称：Wolf Sheep Battle UI Typography Regular

{license_tail}
"""
    SOURCE_OUTPUT_LICENSE.write_text(derived_license, encoding="utf-8", newline="\n")
    THIRD_PARTY_LICENSE.parent.mkdir(parents=True, exist_ok=True)
    THIRD_PARTY_LICENSE.write_text(derived_license, encoding="utf-8", newline="\n")

    audit = {
        "batch": "v1.3.0-dev-ui05",
        "source_font": str(SOURCE_FONT),
        "source_sha256": SOURCE_SHA256,
        "source_weight": FONT_WEIGHT,
        "previous_runtime_font": str(PREVIOUS_RUNTIME_FONT),
        "previous_runtime_sha256": sha256(PREVIOUS_RUNTIME_FONT),
        "previous_runtime_weight": previous_font["OS/2"].usWeightClass,
        "previous_runtime_cmap_count": len(previous_cmap),
        "previous_target_missing_glyph_count": len(previous_target_missing),
        "previous_target_missing_characters": previous_target_missing,
        "output_font": str(RUNTIME_OUTPUT),
        "output_size_bytes": RUNTIME_OUTPUT.stat().st_size,
        "output_sha256": sha256(RUNTIME_OUTPUT),
        "requested_character_count": len(characters),
        "font_cmap_count": len(cmap),
        "missing_glyph_count": len(missing),
        "missing_characters": missing,
        "target_character_count": len(target_characters),
        "target_missing_glyph_count": len(target_missing),
        "target_missing_characters": target_missing,
    }
    AUDIT_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_OUTPUT.write_text(
        json.dumps(audit, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(audit, ensure_ascii=True, indent=2))
    if missing or target_missing:
        raise RuntimeError("The UI05 typography font subset is incomplete")


if __name__ == "__main__":
    build()
