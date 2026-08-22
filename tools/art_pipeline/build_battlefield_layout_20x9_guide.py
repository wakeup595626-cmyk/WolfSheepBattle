from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


OUTPUT = Path("art_source/battlefield/guides/battlefield_layout_20x9_guide_v01.png")
WIDTH = 2400
HEIGHT = 1080
DESIGN_VISIBLE_WIDTH = 1600
DESIGN_HEIGHT = 720
SCALE = HEIGHT / DESIGN_HEIGHT
LANE_X = (-495, -225, 45, 315)
LANE_WIDTH = 180
LANE_BOTTOM_Y = -245
LANE_TOP_Y = 270
AI_GATE_GROUND_Y = 198
PLAYER_GATE_CENTER_Y = -216
SUPPLY_Y = 0


def px_x(design_x: float) -> float:
    return (design_x + DESIGN_VISIBLE_WIDTH / 2) * SCALE


def px_y(design_y: float) -> float:
    return (DESIGN_HEIGHT / 2 - design_y) * SCALE


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (
        Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
    ):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def label(draw: ImageDraw.ImageDraw, xy: tuple[float, float], text: str, fill: str,
          size: int = 28, anchor: str = "mm") -> None:
    draw.text(xy, text, font=font(size), fill=fill, anchor=anchor,
              stroke_width=2, stroke_fill=(18, 24, 22, 220))


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGBA", (WIDTH, HEIGHT), (72, 119, 73, 255))
    draw = ImageDraw.Draw(image, "RGBA")

    # Full 20:9 design-visible area.
    draw.rectangle((0, 0, WIDTH - 1, HEIGHT - 1), fill=(76, 128, 78, 255),
                   outline=(238, 246, 218, 255), width=5)
    for x in range(0, WIDTH + 1, 120):
        draw.line((x, 0, x, HEIGHT), fill=(225, 241, 210, 34), width=1)
    for y in range(0, HEIGHT + 1, 120):
        draw.line((0, y, WIDTH, y), fill=(225, 241, 210, 34), width=1)

    # 1280x720 core battle region inside the 1600x720 visible design space.
    core_left = px_x(-640)
    core_right = px_x(640)
    draw.rectangle((core_left, 0, core_right, HEIGHT), fill=(245, 232, 174, 24),
                   outline=(255, 234, 125, 255), width=6)
    label(draw, ((core_left + core_right) / 2, 35), "1280×720 核心战斗区", "#FFF2B8", 30)

    # Top and bottom HUD safe bands.
    top_bottom = px_y(280)
    draw.rectangle((0, 0, WIDTH, top_bottom), fill=(65, 133, 190, 58),
                   outline=(119, 202, 255, 200), width=3)
    label(draw, (WIDTH / 2, top_bottom / 2), "顶部HUD安全区", "#D8F2FF", 26)
    bottom_top = px_y(-260)
    draw.rectangle((0, bottom_top, WIDTH, HEIGHT), fill=(61, 151, 118, 58),
                   outline=(127, 237, 190, 200), width=3)
    label(draw, (WIDTH / 2, (bottom_top + HEIGHT) / 2), "底部HUD安全区", "#D9FFED", 26)

    # Four exact lane corridors and centre lines.
    for index, lane_x in enumerate(LANE_X, start=1):
        left = px_x(lane_x - LANE_WIDTH / 2)
        right = px_x(lane_x + LANE_WIDTH / 2)
        top = px_y(LANE_TOP_Y)
        bottom = px_y(LANE_BOTTOM_Y)
        center = px_x(lane_x)
        draw.rounded_rectangle((left, top, right, bottom), radius=34,
                               fill=(198, 149, 87, 62), outline=(255, 210, 132, 210), width=4)
        draw.line((center, top, center, bottom), fill=(255, 80, 96, 255), width=5)
        label(draw, (center, px_y(315)), f"LANE {index}\nX={lane_x}", "#FFFFFF", 24)

        ai_y = px_y(AI_GATE_GROUND_Y + 36)
        player_y = px_y(PLAYER_GATE_CENTER_Y)
        supply_y = px_y(SUPPLY_Y)
        draw.ellipse((center - 30, ai_y - 30, center + 30, ai_y + 30),
                     fill=(216, 70, 62, 220), outline=(255, 230, 184, 255), width=4)
        draw.ellipse((center - 30, player_y - 30, center + 30, player_y + 30),
                     fill=(48, 154, 190, 220), outline=(214, 250, 255, 255), width=4)
        draw.rectangle((center - 24, supply_y - 24, center + 24, supply_y + 24),
                       fill=(239, 199, 69, 230), outline=(255, 250, 202, 255), width=4)

    label(draw, (px_x(-700), px_y(AI_GATE_GROUND_Y + 36)), "AI出兵门", "#FFD6CF", 26, "lm")
    label(draw, (px_x(-700), px_y(SUPPLY_Y)), "补给站", "#FFF3A8", 26, "lm")
    label(draw, (px_x(-700), px_y(PLAYER_GATE_CENTER_Y)), "玩家出兵门", "#CFF6FF", 26, "lm")

    # Responsive right-side tactic area on a 20:9 screen.
    tactic_left = px_x(588)
    tactic_right = px_x(788)
    tactic_top = px_y(270)
    tactic_bottom = px_y(-200)
    draw.rounded_rectangle((tactic_left, tactic_top, tactic_right, tactic_bottom), radius=26,
                           fill=(126, 88, 173, 58), outline=(224, 196, 255, 230), width=4)
    label(draw, ((tactic_left + tactic_right) / 2, (tactic_top + tactic_bottom) / 2),
          "右侧战术区", "#F0DDFF", 25)

    # Representative WeChat capsule avoidance rectangle. Runtime uses wx API.
    capsule_left = px_x(610)
    capsule_right = px_x(785)
    capsule_top = px_y(350)
    capsule_bottom = px_y(292)
    draw.rounded_rectangle((capsule_left, capsule_top, capsule_right, capsule_bottom), radius=28,
                           fill=(16, 18, 20, 175), outline=(255, 255, 255, 230), width=4)
    label(draw, ((capsule_left + capsule_right) / 2, (capsule_top + capsule_bottom) / 2),
          "微信胶囊避让区", "#FFFFFF", 20)

    label(draw, (18, HEIGHT - 18),
          "仅用于生成/校正，不进入Bundle。道路中心误差目标 ≤ 4设计像素。",
          "#FFFFFF", 24, "ls")
    image.convert("RGB").save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT.resolve())


if __name__ == "__main__":
    main()
