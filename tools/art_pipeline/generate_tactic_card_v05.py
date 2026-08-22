from __future__ import annotations

from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = PROJECT_ROOT / "art_source" / "ui" / "tactic_cards" / "v05"
RUNTIME_DIR = (
    PROJECT_ROOT
    / "assets"
    / "bundles"
    / "art_ui"
    / "ui"
    / "tactic_cards"
    / "v05"
)


def rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4)) + (alpha,)


def rounded_panel(
    size: tuple[int, int],
    *,
    fill: str,
    border: str,
    highlight: str,
    radius: int,
    border_width: int,
    shadow: bool = False,
) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    if shadow:
        draw.rounded_rectangle(
            (3, 5, width - 2, height - 1),
            radius=radius,
            fill=rgba("#72501E", 46),
        )
    draw.rounded_rectangle(
        (1, 1, width - 2, height - 3),
        radius=radius,
        fill=rgba(fill, 253),
        outline=rgba(border),
        width=border_width,
    )
    inset = border_width + 2
    draw.rounded_rectangle(
        (inset, inset, width - inset - 1, height - inset - 3),
        radius=max(2, radius - inset),
        outline=rgba(highlight, 225),
        width=max(1, border_width // 2),
    )
    # A small glossy strip keeps the panel bright without baking any content.
    draw.arc(
        (inset + 2, inset + 1, width - inset - 3, max(inset + 8, height * 0.62)),
        190,
        345,
        fill=rgba("#FFFFFF", 105),
        width=max(1, border_width // 2),
    )
    return image


def shell_image(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = rounded_panel(
        size,
        fill="#FFF7D9",
        border="#E8B744",
        highlight="#FFFDF1",
        radius=28,
        border_width=6,
        shadow=True,
    )
    draw = ImageDraw.Draw(image, "RGBA")
    for x, flip in ((24, 1), (width - 24, -1)):
        draw.ellipse((x - 8, 16, x + 8, 32), fill=rgba("#64C96C", 235))
        leaf_x0, leaf_x1 = sorted((x - 2 * flip, x + 14 * flip))
        draw.ellipse((leaf_x0, 9, leaf_x1, 25), fill=rgba("#A4DE63", 240))
        draw.ellipse((x - 5, height - 27, x + 5, height - 17), fill=rgba("#5AADE5", 150))
    return image


def icon_cell_image(size: tuple[int, int], kind: str) -> Image.Image:
    palettes = {
        "sprint": ("#FFD84D", "#E7A51B", "#FFF7A9", "#5AADE5"),
        "heal": ("#74DFA6", "#2AAE67", "#D9FFE9", "#A7EA64"),
        "shock": ("#B99AF2", "#7853C6", "#F1E7FF", "#79B9EA"),
    }
    fill, border, highlight, accent = palettes[kind]
    image = rounded_panel(
        size,
        fill=fill,
        border=border,
        highlight=highlight,
        radius=22,
        border_width=4,
        shadow=True,
    )
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = size
    draw.ellipse((9, 11, 18, 20), fill=rgba(accent, 205))
    draw.ellipse((width - 20, height - 22, width - 11, height - 13), fill=rgba(accent, 205))
    draw.ellipse((width - 19, 10, width - 13, 16), fill=rgba("#FFFFFF", 170))
    return image


def text_cell_image(size: tuple[int, int], kind: str) -> Image.Image:
    palettes = {
        "sprint": ("#FFF8D8", "#EAC04D", "#FFFFFF"),
        "heal": ("#EDFFF3", "#66CE91", "#FFFFFF"),
        "shock": ("#F5EFFF", "#A281DF", "#FFFFFF"),
    }
    fill, border, highlight = palettes[kind]
    return rounded_panel(
        size,
        fill=fill,
        border=border,
        highlight=highlight,
        radius=18,
        border_width=3,
    )


def info_cell_image(size: tuple[int, int], kind: str) -> Image.Image:
    palettes = {
        "neutral": ("#FFF0BD", "#D9A539", "#FFF9DF"),
        "ready": ("#BCEFCF", "#4FCA7B", "#F1FFF6"),
        "insufficient": ("#F18A79", "#C84D43", "#FFD7CF"),
        "cooldown": ("#8DCCF2", "#3E92CB", "#DDF3FF"),
    }
    fill, border, highlight = palettes[kind]
    return rounded_panel(
        size,
        fill=fill,
        border=border,
        highlight=highlight,
        radius=13,
        border_width=3,
    )


def state_cell_image(size: tuple[int, int], kind: str) -> Image.Image:
    palettes = {
        "available": ("#4FCA7B", "#2A9551", "#BDF3CE"),
        "insufficient": ("#E66B5B", "#B74239", "#FFB0A3"),
        "cooldown": ("#5AADE5", "#327BAE", "#B7E1FA"),
        "locked": ("#9675D8", "#6549A8", "#D7C7F4"),
        "used": ("#8493A8", "#58687C", "#C6D1DE"),
        "unavailable": ("#E8A957", "#B8752A", "#FFD39A"),
    }
    fill, border, highlight = palettes[kind]
    return rounded_panel(
        size,
        fill=fill,
        border=border,
        highlight=highlight,
        radius=13,
        border_width=3,
    )


def divider_image(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    center = height // 2
    draw.line(
        (8, center, width - 9, center),
        fill=rgba("#E8B744", 235),
        width=max(2, height // 2),
    )
    draw.ellipse((1, center - 3, 7, center + 3), fill=rgba("#76CA76", 235))
    draw.ellipse((width - 8, center - 3, width - 2, center + 3), fill=rgba("#5AADE5", 235))
    return image


def sprint_icon(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    points = [
        (width * 0.46, height * 0.06),
        (width * 0.79, height * 0.38),
        (width * 0.59, height * 0.40),
        (width * 0.70, height * 0.91),
        (width * 0.24, height * 0.51),
        (width * 0.47, height * 0.49),
    ]
    draw.polygon(points, fill=rgba("#FFB516"), outline=rgba("#8B5510"))
    draw.line(
        [(width * 0.05, height * 0.32), (width * 0.27, height * 0.44), (width * 0.05, height * 0.58)],
        fill=rgba("#389FE0"),
        width=max(4, width // 15),
        joint="curve",
    )
    draw.line(
        [(width * 0.13, height * 0.18), (width * 0.31, height * 0.30)],
        fill=rgba("#FFF6A8"),
        width=max(3, width // 20),
    )
    return image


def heal_icon(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.ellipse(
        (width * 0.08, height * 0.08, width * 0.92, height * 0.92),
        fill=rgba("#9CF0B9"),
        outline=rgba("#258958"),
        width=4,
    )
    bar = max(9, width // 5)
    center_x = width // 2
    center_y = height // 2
    draw.rounded_rectangle(
        (center_x - bar // 2, height * 0.20, center_x + bar // 2, height * 0.80),
        radius=bar // 3,
        fill=rgba("#FFF8D6"),
        outline=rgba("#258958"),
        width=2,
    )
    draw.rounded_rectangle(
        (width * 0.20, center_y - bar // 2, width * 0.80, center_y + bar // 2),
        radius=bar // 3,
        fill=rgba("#FFF8D6"),
        outline=rgba("#258958"),
        width=2,
    )
    draw.ellipse((width * 0.19, height * 0.16, width * 0.32, height * 0.29), fill=rgba("#FFFFFF", 205))
    return image


def shock_icon(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    stroke = max(4, width // 14)
    draw.arc(
        (width * 0.08, height * 0.12, width * 0.92, height * 0.88),
        18,
        162,
        fill=rgba("#8150D1"),
        width=stroke,
    )
    draw.arc(
        (width * 0.23, height * 0.25, width * 0.77, height * 0.79),
        18,
        162,
        fill=rgba("#8FD2FF"),
        width=max(3, stroke - 2),
    )
    left = [
        (width * 0.18, height * 0.50),
        (width * 0.40, height * 0.61),
        (width * 0.48, height * 0.88),
        (width * 0.17, height * 0.74),
    ]
    right = [
        (width * 0.82, height * 0.50),
        (width * 0.60, height * 0.61),
        (width * 0.52, height * 0.88),
        (width * 0.83, height * 0.74),
    ]
    draw.polygon(left, fill=rgba("#925FE0"), outline=rgba("#4F2A88"))
    draw.polygon(right, fill=rgba("#925FE0"), outline=rgba("#4F2A88"))
    return image


def write_pair(
    name: str,
    runtime_size: tuple[int, int],
    factory: Callable[[tuple[int, int]], Image.Image],
) -> None:
    source_size = (runtime_size[0] * 2, runtime_size[1] * 2)
    source = factory(source_size)
    source_path = SOURCE_DIR / f"{name}_v05.png"
    runtime_path = RUNTIME_DIR / f"{name}_runtime_v05.png"
    source.save(source_path, optimize=True)
    source.resize(runtime_size, Image.Resampling.LANCZOS).save(runtime_path, optimize=True)


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
        write_pair(
            f"tactic_text_cell_{kind}",
            (136, 80),
            lambda size, current=kind: text_cell_image(size, current),
        )
    write_pair("tactic_divider", (208, 2), divider_image)
    for info_state in ("neutral", "ready", "insufficient", "cooldown"):
        write_pair(
            f"tactic_info_cell_{info_state}",
            (60, 28),
            lambda size, current=info_state: info_cell_image(size, current),
        )
    for state in ("available", "insufficient", "cooldown", "locked", "used", "unavailable"):
        write_pair(
            f"tactic_state_{state}",
            (84, 28),
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
