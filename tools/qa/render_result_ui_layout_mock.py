from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "art_source" / "qa" / "victory-result-ui-01" / "layout_mock"
OUT.mkdir(parents=True, exist_ok=True)

BACKGROUND = ROOT / "art_source" / "qa" / "level-free-unit-badge-01" / "screenshots" / "type_badge_stress_24_units_1280x720.png"
PANEL = ROOT / "assets" / "bundles" / "art_ui" / "ui" / "modals" / "result_panel_runtime_v01.png"
BADGE = ROOT / "assets" / "bundles" / "art_vfx" / "vfx" / "results" / "victory" / "victory_emblem_runtime_v01.png"
OVERLAY = ROOT / "assets" / "bundles" / "art_vfx" / "vfx" / "results" / "victory" / "victory_overlay_runtime_v01.png"
DEFEAT_BADGE = ROOT / "assets" / "bundles" / "art_vfx" / "vfx" / "results" / "defeat" / "defeat_emblem_runtime_v01.png"
DEFEAT_OVERLAY = ROOT / "assets" / "bundles" / "art_vfx" / "vfx" / "results" / "defeat" / "defeat_overlay_runtime_v01.png"
PRIMARY = ROOT / "assets" / "bundles" / "art_ui" / "ui" / "common" / "buttons" / "button_primary_runtime_v01.png"
SECONDARY = ROOT / "assets" / "bundles" / "art_ui" / "ui" / "common" / "buttons" / "button_secondary_runtime_v01.png"
FONT = ROOT / "assets" / "bundles" / "art_boot" / "ui" / "fonts" / "ui_font_cn_subset_runtime_v02.ttf"


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size=size)


def centered_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, face: ImageFont.FreeTypeFont,
                  fill: tuple[int, int, int, int], stroke_width: int = 0,
                  stroke_fill: tuple[int, int, int, int] | None = None) -> None:
    draw.multiline_text(
        xy,
        text,
        font=face,
        fill=fill,
        anchor="mm",
        align="center",
        spacing=2,
        stroke_width=stroke_width,
        stroke_fill=stroke_fill,
    )


def draw_data_card(canvas: Image.Image, center_x: int, player: bool, values: list[str] | None = None) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    x0, y0, x1, y1 = center_x - 148, 294, center_x + 148, 436
    fill = (228, 244, 220, 250) if player else (252, 229, 216, 250)
    header = (194, 229, 185, 245) if player else (247, 198, 179, 245)
    border = (111, 168, 113, 230) if player else (201, 125, 105, 230)
    accent = (43, 104, 71, 255) if player else (136, 66, 54, 255)
    draw.rounded_rectangle((x0, y0, x1, y1), 18, fill=fill, outline=border, width=2)
    draw.rounded_rectangle((x0 + 5, y0 + 4, x1 - 5, y0 + 36), 13, fill=header)
    centered_text(draw, (center_x, y0 + 22), "羊方表现" if player else "狼方表现", font(18), accent)
    metrics = ["基地剩余", "派出单位", "获得补给", "使用战术"]
    if values is None:
        values = ["83/100", "8", "17", "3次"] if player else ["0/100", "12", "5", "未使用"]
    for index, (metric, value) in enumerate(zip(metrics, values)):
        y = y0 + 53 + index * 23
        draw.text((x0 + 28, y), metric, font=font(15), fill=(91, 75, 57, 255), anchor="lm")
        draw.text((x1 - 20, y), value, font=font(15), fill=accent, anchor="rm")


def paste_button(canvas: Image.Image, center_x: int, label: str, primary: bool) -> None:
    source = Image.open(PRIMARY if primary else SECONDARY).convert("RGBA").resize((190, 58), Image.Resampling.LANCZOS)
    canvas.alpha_composite(source, (center_x - 95, 515))
    draw = ImageDraw.Draw(canvas, "RGBA")
    color = (45, 86, 49, 255) if primary else (83, 61, 43, 255)
    centered_text(draw, (center_x, 544), label, font(24), color)


def main() -> None:
    canvas = Image.open(BACKGROUND).convert("RGBA").resize((1280, 720), Image.Resampling.LANCZOS)
    dim = Image.new("RGBA", canvas.size, (8, 18, 16, 158))
    canvas = Image.alpha_composite(canvas, dim)
    atmosphere = Image.open(OVERLAY).convert("RGBA").resize(canvas.size, Image.Resampling.LANCZOS)
    atmosphere.putalpha(atmosphere.getchannel("A").point(lambda value: round(value * 0.67)))
    canvas = Image.alpha_composite(canvas, atmosphere)
    panel_source = Image.open(PANEL).convert("RGBA")
    panel = panel_source.crop((205, 16, 756, 701)).resize((720, 540), Image.Resampling.LANCZOS)
    canvas.alpha_composite(panel, (280, 90))
    badge = Image.open(BADGE).convert("RGBA").resize((80, 80), Image.Resampling.LANCZOS)
    canvas.alpha_composite(badge, (600, 100))

    draw = ImageDraw.Draw(canvas, "RGBA")
    centered_text(draw, (640, 214), "战斗胜利", font(42), (59, 105, 51, 255), 2, (238, 202, 108, 220))
    centered_text(draw, (640, 260), "第 1 关·教学节奏 挑战成功\n成功击破敌方基地", font(17), (86, 92, 55, 255))
    draw_data_card(canvas, 486, True)
    draw_data_card(canvas, 794, False)
    centered_text(draw, (640, 464), "可继续挑战第 2 关，也可以返回选关。", font(16), (73, 101, 59, 255))
    paste_button(canvas, 432, "重新挑战", False)
    paste_button(canvas, 640, "下一关", True)
    paste_button(canvas, 848, "返回选关", False)
    canvas.convert("RGB").save(OUT / "victory_result_layout_mock_1280x720.jpg", quality=94, subsampling=0)

    defeat = Image.open(BACKGROUND).convert("RGBA").resize((1280, 720), Image.Resampling.LANCZOS)
    defeat = Image.alpha_composite(defeat, dim)
    defeat_atmosphere = Image.open(DEFEAT_OVERLAY).convert("RGBA").resize(defeat.size, Image.Resampling.LANCZOS)
    defeat_atmosphere.putalpha(defeat_atmosphere.getchannel("A").point(lambda value: round(value * 0.53)))
    defeat = Image.alpha_composite(defeat, defeat_atmosphere)
    defeat.alpha_composite(panel, (280, 90))
    defeat_badge = Image.open(DEFEAT_BADGE).convert("RGBA").resize((80, 80), Image.Resampling.LANCZOS)
    defeat.alpha_composite(defeat_badge, (600, 100))
    defeat_draw = ImageDraw.Draw(defeat, "RGBA")
    centered_text(defeat_draw, (640, 214), "战斗失败", font(42), (142, 68, 58, 255), 2, (226, 176, 126, 210))
    centered_text(defeat_draw, (640, 260), "第 3 关·标准节奏 挑战未完成\n玩家基地已被击破", font(17), (121, 77, 68, 255))
    draw_data_card(defeat, 486, True, ["0/100", "8", "17", "3次"])
    draw_data_card(defeat, 794, False, ["46/100", "12", "5", "未使用"])
    centered_text(defeat_draw, (640, 464), "可重新挑战，也可以返回选关调整阵容。", font(16), (128, 72, 66, 255))
    paste_button(defeat, 530, "重新挑战", False)
    paste_button(defeat, 750, "返回选关", False)
    defeat.convert("RGB").save(OUT / "defeat_result_layout_mock_1280x720.jpg", quality=94, subsampling=0)


if __name__ == "__main__":
    main()
