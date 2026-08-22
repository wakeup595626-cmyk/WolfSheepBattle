from __future__ import annotations

from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = PROJECT_ROOT / "art_source" / "ui" / "tactic_cards" / "v04"
RUNTIME_DIR = (
    PROJECT_ROOT
    / "assets"
    / "bundles"
    / "art_ui"
    / "ui"
    / "tactic_cards"
    / "v04"
)


def rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4)) + (alpha,)


def rounded_panel(
    size: tuple[int, int],
    *,
    fill: tuple[int, int, int, int],
    border: tuple[int, int, int, int],
    radius: int,
    border_width: int,
    inner_highlight: tuple[int, int, int, int] | None = None,
    shadow: bool = True,
) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    if shadow:
        draw.rounded_rectangle(
            (3, 5, width - 2, height - 1),
            radius=radius,
            fill=(93, 61, 31, 42),
        )
    draw.rounded_rectangle(
        (1, 1, width - 2, height - 3),
        radius=radius,
        fill=fill,
        outline=border,
        width=border_width,
    )
    if inner_highlight:
        inset = border_width + 2
        draw.rounded_rectangle(
            (inset, inset, width - inset - 1, height - inset - 3),
            radius=max(2, radius - inset),
            outline=inner_highlight,
            width=max(1, border_width // 2),
        )
    return image


def shell_image(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = rounded_panel(
        size,
        fill=rgba("#FFF2CF", 252),
        border=rgba("#9B6429"),
        radius=28,
        border_width=6,
        inner_highlight=rgba("#F5C866", 230),
    )
    draw = ImageDraw.Draw(image, "RGBA")
    draw.arc((15, 11, width - 16, height - 13), 186, 352, fill=rgba("#FFF7D8", 220), width=3)
    for x, flip in ((24, 1), (width - 24, -1)):
        draw.ellipse((x - 8, 18, x + 8, 34), fill=rgba("#91B84C", 220))
        leaf_x0, leaf_x1 = sorted((x - 2 * flip, x + 14 * flip))
        draw.ellipse((leaf_x0, 10, leaf_x1, 27), fill=rgba("#B7D46E", 220))
    return image


def icon_cell_image(size: tuple[int, int], kind: str) -> Image.Image:
    palette = {
        "sprint": ("#FFE4A3", "#D3952B", "#FFF4CE"),
        "heal": ("#CFF1D8", "#519E67", "#EEFFF1"),
        "shock": ("#E4D6F6", "#8760B4", "#F5EEFF"),
    }
    fill, border, highlight = palette[kind]
    image = rounded_panel(
        size,
        fill=rgba(fill, 250),
        border=rgba(border),
        radius=22,
        border_width=4,
        inner_highlight=rgba(highlight, 220),
    )
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = size
    dot = rgba(border, 105)
    draw.ellipse((10, 12, 17, 19), fill=dot)
    draw.ellipse((width - 19, height - 21, width - 12, height - 14), fill=dot)
    return image


def text_cell_image(size: tuple[int, int]) -> Image.Image:
    return rounded_panel(
        size,
        fill=rgba("#FFF9E8", 250),
        border=rgba("#C59A59"),
        radius=18,
        border_width=3,
        inner_highlight=rgba("#FFFDF3", 230),
        shadow=False,
    )


def compact_cell_image(size: tuple[int, int], kind: str) -> Image.Image:
    palettes = {
        "cost": ("#F9E9BC", "#B98745", "#FFF5D6"),
        "meta": ("#EDE4CF", "#9B8667", "#FAF4E7"),
    }
    fill, border, highlight = palettes[kind]
    return rounded_panel(
        size,
        fill=rgba(fill, 252),
        border=rgba(border),
        radius=13,
        border_width=3,
        inner_highlight=rgba(highlight, 210),
        shadow=False,
    )


def state_cell_image(size: tuple[int, int], kind: str) -> Image.Image:
    palettes = {
        "available": ("#69B96D", "#397E45", "#A8DDA7"),
        "unavailable": ("#B96555", "#7E4037", "#D99A87"),
        "cooldown": ("#718A9F", "#465D72", "#A6B8C7"),
        "locked": ("#806D99", "#57486E", "#B5A5C9"),
        "used": ("#726D65", "#4E4942", "#A49C91"),
    }
    fill, border, highlight = palettes[kind]
    return rounded_panel(
        size,
        fill=rgba(fill, 255),
        border=rgba(border),
        radius=13,
        border_width=3,
        inner_highlight=rgba(highlight, 145),
        shadow=False,
    )


def divider_image(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    center = height // 2
    draw.line((8, center, width - 9, center), fill=rgba("#B98745", 205), width=max(2, height // 2))
    draw.ellipse((1, center - 3, 7, center + 3), fill=rgba("#D5A853", 230))
    draw.ellipse((width - 8, center - 3, width - 2, center + 3), fill=rgba("#D5A853", 230))
    return image


def sprint_icon(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    gold = rgba("#D6951F")
    glow = rgba("#FFF3A4", 225)
    outline = rgba("#845513", 230)
    points = [
        (width * 0.46, height * 0.08),
        (width * 0.77, height * 0.40),
        (width * 0.59, height * 0.40),
        (width * 0.70, height * 0.88),
        (width * 0.27, height * 0.51),
        (width * 0.47, height * 0.51),
    ]
    draw.polygon(points, fill=gold, outline=outline)
    draw.line(
        [(width * 0.08, height * 0.34), (width * 0.26, height * 0.45), (width * 0.08, height * 0.57)],
        fill=gold,
        width=max(3, width // 18),
        joint="curve",
    )
    draw.line(
        [(width * 0.18, height * 0.22), (width * 0.31, height * 0.31)],
        fill=glow,
        width=max(2, width // 24),
    )
    return image


def heal_icon(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    mint = rgba("#49AF71")
    mint_dark = rgba("#28784C")
    cream = rgba("#FFF4C9")
    draw.ellipse((width * 0.10, height * 0.10, width * 0.90, height * 0.90), fill=rgba("#95E5AF", 215), outline=mint_dark, width=3)
    bar = max(8, width // 5)
    center_x = width // 2
    center_y = height // 2
    draw.rounded_rectangle(
        (center_x - bar // 2, height * 0.22, center_x + bar // 2, height * 0.78),
        radius=bar // 3,
        fill=cream,
        outline=mint_dark,
        width=2,
    )
    draw.rounded_rectangle(
        (width * 0.22, center_y - bar // 2, width * 0.78, center_y + bar // 2),
        radius=bar // 3,
        fill=cream,
        outline=mint_dark,
        width=2,
    )
    draw.ellipse((width * 0.20, height * 0.18, width * 0.31, height * 0.29), fill=rgba("#E9FFF0", 210))
    return image


def shock_icon(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    purple = rgba("#8D5CC4")
    purple_dark = rgba("#52337A")
    glow = rgba("#E9D9FF", 225)
    stroke = max(3, width // 16)
    draw.arc((width * 0.12, height * 0.16, width * 0.88, height * 0.84), 18, 162, fill=purple, width=stroke)
    draw.arc((width * 0.25, height * 0.28, width * 0.75, height * 0.76), 18, 162, fill=glow, width=max(2, stroke - 2))
    hoof_left = [
        (width * 0.22, height * 0.52),
        (width * 0.40, height * 0.61),
        (width * 0.48, height * 0.85),
        (width * 0.22, height * 0.75),
    ]
    hoof_right = [
        (width * 0.78, height * 0.52),
        (width * 0.60, height * 0.61),
        (width * 0.52, height * 0.85),
        (width * 0.78, height * 0.75),
    ]
    draw.polygon(hoof_left, fill=purple, outline=purple_dark)
    draw.polygon(hoof_right, fill=purple, outline=purple_dark)
    return image


def write_pair(name: str, runtime_size: tuple[int, int], factory: Callable[[tuple[int, int]], Image.Image]) -> None:
    source_size = (runtime_size[0] * 2, runtime_size[1] * 2)
    source = factory(source_size)
    source_path = SOURCE_DIR / f"{name}_v04.png"
    runtime_path = RUNTIME_DIR / f"{name}_runtime_v04.png"
    source.save(source_path, optimize=True)
    runtime = source.resize(runtime_size, Image.Resampling.LANCZOS)
    runtime.save(runtime_path, optimize=True)


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)

    write_pair("tactic_card_shell", (216, 124), shell_image)
    for kind in ("sprint", "heal", "shock"):
        write_pair(
            f"tactic_icon_cell_{kind}",
            (68, 80),
            lambda size, current=kind: icon_cell_image(size, current),
        )
    write_pair("tactic_text_cell", (136, 80), text_cell_image)
    write_pair("tactic_divider", (208, 2), divider_image)
    write_pair("tactic_cost_cell", (52, 28), lambda size: compact_cell_image(size, "cost"))
    write_pair("tactic_meta_cell", (44, 28), lambda size: compact_cell_image(size, "meta"))
    for state in ("available", "unavailable", "cooldown", "locked", "used"):
        write_pair(
            f"tactic_state_{state}",
            (104, 28),
            lambda size, current=state: state_cell_image(size, current),
        )

    write_pair("tactic_skill_sprint", (54, 54), sprint_icon)
    write_pair("tactic_skill_heal", (54, 54), heal_icon)
    write_pair("tactic_skill_shock", (54, 54), shock_icon)

    print(f"source_dir={SOURCE_DIR}")
    print(f"runtime_dir={RUNTIME_DIR}")
    for path in sorted(RUNTIME_DIR.glob("*.png")):
        print(f"{path.name}\t{path.stat().st_size}")


if __name__ == "__main__":
    main()
