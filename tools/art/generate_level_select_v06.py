from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "art_source" / "ui" / "level_select" / "v06"
RUNTIME_DIR = ROOT / "assets" / "bundles" / "art_ui" / "ui" / "level_select" / "v06"


def rgba(hex_value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_value.removeprefix("#")
    return (
        int(value[0:2], 16),
        int(value[2:4], 16),
        int(value[4:6], 16),
        alpha,
    )


def rounded_panel(
    size: tuple[int, int],
    fill: str,
    border: str,
    radius: int,
    border_width: int,
    inner_fill: str | None = None,
) -> Image.Image:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    bounds = (1, 1, size[0] - 2, size[1] - 2)
    draw.rounded_rectangle(bounds, radius=radius, fill=rgba(fill), outline=rgba(border), width=border_width)
    if inner_fill:
        inset = border_width + 2
        draw.rounded_rectangle(
            (inset, inset, size[0] - inset - 1, size[1] - inset - 1),
            radius=max(2, radius - inset),
            fill=rgba(inner_fill),
        )
    return image


def add_panel_decorations(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image)
    w, h = image.size
    leaf = rgba("#76B96C")
    leaf_dark = rgba("#4E8A50")
    flower = rgba("#FFFDF2")
    flower_center = rgba("#F5C84E")
    wool = rgba("#FFFDF4")

    for mirror_x, mirror_y in ((False, False), (True, False), (False, True), (True, True)):
        sx = w - 1 if mirror_x else 0
        sy = h - 1 if mirror_y else 0
        dx = -1 if mirror_x else 1
        dy = -1 if mirror_y else 1
        cx = sx + dx * 38
        cy = sy + dy * 32
        draw.ellipse((cx - 27, cy - 14, cx + 1, cy + 10), fill=leaf, outline=leaf_dark, width=2)
        draw.ellipse((cx - 3, cy - 7, cx + 24, cy + 16), fill=leaf, outline=leaf_dark, width=2)
        fx = sx + dx * 68
        fy = sy + dy * 29
        for px, py in ((0, -8), (8, 0), (0, 8), (-8, 0)):
            draw.ellipse((fx + px - 6, fy + py - 6, fx + px + 6, fy + py + 6), fill=flower)
        draw.ellipse((fx - 5, fy - 5, fx + 5, fy + 5), fill=flower_center)
        wx = sx + dx * 103
        wy = sy + dy * 22
        draw.ellipse((wx - 20, wy - 10, wx + 6, wy + 12), fill=wool)
        draw.ellipse((wx - 4, wy - 14, wx + 22, wy + 12), fill=wool)


def make_overlay() -> Image.Image:
    return Image.new("RGBA", (64, 64), rgba("#173F2D", 198))


def make_panel() -> Image.Image:
    image = rounded_panel((780, 520), "#FFF7DC", "#E8B84D", 34, 7, "#FFF7DC")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((18, 18, 761, 501), radius=25, outline=rgba("#F1D78B"), width=3)
    draw.line((118, 72, 662, 72), fill=rgba("#E9C66C"), width=2)
    add_panel_decorations(image)
    return image


def make_card(fill: str, border: str, secondary: str) -> Image.Image:
    image = rounded_panel((650, 82), fill, border, 18, 4)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, 641, 73), radius=12, outline=rgba(secondary, 150), width=2)
    draw.line((84, 14, 84, 68), fill=rgba(secondary, 150), width=2)
    draw.line((520, 14, 520, 68), fill=rgba(secondary, 150), width=2)
    return image


def make_number_badge() -> Image.Image:
    image = rounded_panel((66, 60), "#FFF1C8", "#DDA83F", 17, 4)
    draw = ImageDraw.Draw(image)
    draw.ellipse((10, 7, 55, 52), fill=rgba("#FFF7DC"), outline=rgba("#E8B84D"), width=2)
    draw.ellipse((25, 2, 40, 10), fill=rgba("#8DC979"), outline=rgba("#5F9C5B"), width=1)
    return image


def make_state_icon(kind: str) -> Image.Image:
    image = Image.new("RGBA", (28, 28), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if kind == "selected":
        draw.ellipse((2, 2, 25, 25), fill=rgba("#F5C84E"), outline=rgba("#B98424"), width=2)
        draw.line((9, 21, 9, 7), fill=rgba("#6E4A20"), width=2)
        draw.polygon(((10, 7), (21, 10), (10, 14)), fill=rgba("#FFF7DC"), outline=rgba("#6E4A20"))
    elif kind == "available":
        draw.ellipse((2, 2, 25, 25), fill=rgba("#69CFE2"), outline=rgba("#347F92"), width=2)
        draw.polygon(((11, 8), (20, 14), (11, 20)), fill=rgba("#FFFFFF"), outline=rgba("#347F92"))
    elif kind == "completed":
        draw.ellipse((2, 2, 25, 25), fill=rgba("#57C982"), outline=rgba("#2D8052"), width=2)
        draw.line((7, 14, 12, 19), fill=rgba("#FFFFFF"), width=3)
        draw.line((12, 19, 21, 9), fill=rgba("#FFFFFF"), width=3)
    elif kind == "locked":
        draw.rounded_rectangle((5, 11, 23, 25), radius=4, fill=rgba("#A8A9B2"), outline=rgba("#666678"), width=2)
        draw.arc((8, 3, 20, 17), start=180, end=360, fill=rgba("#666678"), width=3)
        draw.ellipse((12, 16, 16, 20), fill=rgba("#666678"))
    return image


def make_progress_panel() -> Image.Image:
    image = rounded_panel((650, 46), "#FFF1C8", "#E1BF69", 14, 3)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 7, 641, 38), radius=10, outline=rgba("#F5DE9A"), width=1)
    return image


def make_back_button() -> Image.Image:
    image = rounded_panel((238, 48), "#8AD9C6", "#3D9A88", 16, 4)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 7, 229, 40), radius=11, outline=rgba("#C9F5E8"), width=2)
    draw.ellipse((17, 15, 31, 29), fill=rgba("#FFF7DC"), outline=rgba("#3D9A88"), width=2)
    draw.polygon(((14, 22), (24, 13), (24, 31)), fill=rgba("#FFF7DC"))
    return image


def make_debug_button() -> Image.Image:
    image = rounded_panel((210, 42), "#FFF1E7", "#E9825A", 13, 3)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((7, 6, 202, 35), radius=9, outline=rgba("#F4B18F"), width=1)
    return image


ASSETS = {
    "level_select_overlay_v06.png": make_overlay,
    "level_select_panel_v06.png": make_panel,
    "level_card_selected_v06.png": lambda: make_card("#FFF0B5", "#F5C84E", "#D7A63A"),
    "level_card_unlocked_v06.png": lambda: make_card("#F1FBF2", "#69CFE2", "#77BFAF"),
    "level_card_completed_v06.png": lambda: make_card("#ECF9E9", "#57C982", "#65A96C"),
    "level_card_locked_v06.png": lambda: make_card("#EEEAF0", "#A8A9B2", "#8A8297"),
    "level_number_badge_v06.png": make_number_badge,
    "level_state_selected_v06.png": lambda: make_state_icon("selected"),
    "level_state_available_v06.png": lambda: make_state_icon("available"),
    "level_state_completed_v06.png": lambda: make_state_icon("completed"),
    "level_state_locked_v06.png": lambda: make_state_icon("locked"),
    "level_progress_panel_v06.png": make_progress_panel,
    "level_back_button_v06.png": make_back_button,
    "level_debug_reset_button_v06.png": make_debug_button,
}


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    for source_name, factory in ASSETS.items():
        image = factory()
        source_path = SOURCE_DIR / source_name
        runtime_name = source_name.replace("_v06.png", "_runtime_v06.png")
        runtime_path = RUNTIME_DIR / runtime_name
        image.save(source_path, format="PNG", optimize=True)
        image.save(runtime_path, format="PNG", optimize=True)
        print(f"{source_name}: {image.size[0]}x{image.size[1]} -> {runtime_path.name}")


if __name__ == "__main__":
    main()
