from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT = PROJECT_ROOT / "art_source/battlefield/supply_points/_working/supply_point_states_v02_imagegen.png"
SOURCE_OUTPUT = PROJECT_ROOT / "art_source/battlefield/supply_points/supply_point_states_v02.png"
RUNTIME_OUTPUT = PROJECT_ROOT / "assets/bundles/art_battlefield/battlefield/supply_points/supply_point_states_runtime_v02.png"

SOURCE_FRAME_SIZE = 256
RUNTIME_FRAME_SIZE = 128
SOURCE_BOTTOM_Y = 247
SOURCE_MAX_WIDTH = 238
SOURCE_MAX_HEIGHT = 234


def remove_checkerboard(frame: Image.Image) -> Image.Image:
    """Remove the baked white checkerboard without erasing enclosed wool highlights."""
    rgb = np.asarray(frame.convert("RGB"))
    channel_delta = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    background_candidate = (rgb.min(axis=2) >= 228) & (channel_delta <= 8)

    height, width = background_candidate.shape
    exterior = np.zeros((height, width), dtype=np.uint8)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        if background_candidate[0, x]:
            queue.append((0, x))
        if background_candidate[height - 1, x]:
            queue.append((height - 1, x))
    for y in range(height):
        if background_candidate[y, 0]:
            queue.append((y, 0))
        if background_candidate[y, width - 1]:
            queue.append((y, width - 1))

    while queue:
        y, x = queue.popleft()
        if exterior[y, x] or not background_candidate[y, x]:
            continue
        exterior[y, x] = 1
        if y > 0:
            queue.append((y - 1, x))
        if y + 1 < height:
            queue.append((y + 1, x))
        if x > 0:
            queue.append((y, x - 1))
        if x + 1 < width:
            queue.append((y, x + 1))

    alpha = Image.fromarray((1 - exterior) * 255, mode="L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    rgba = frame.convert("RGBA")
    rgba.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("No foreground object found in a supply-point frame")
    return rgba.crop(bbox)


def make_even(value: int) -> int:
    return max(2, value - value % 2)


def build() -> None:
    image = Image.open(INPUT).convert("RGB")
    if image.width % 4:
        raise RuntimeError(f"Input width {image.width} is not divisible by four")

    raw_frame_width = image.width // 4
    objects: list[Image.Image] = []
    for index in range(4):
        raw = image.crop((index * raw_frame_width, 0, (index + 1) * raw_frame_width, image.height))
        objects.append(remove_checkerboard(raw))

    shared_scale = min(
        SOURCE_MAX_WIDTH / max(obj.width for obj in objects),
        SOURCE_MAX_HEIGHT / max(obj.height for obj in objects),
    )

    sheet = Image.new("RGBA", (SOURCE_FRAME_SIZE * 4, SOURCE_FRAME_SIZE), (0, 0, 0, 0))
    for index, obj in enumerate(objects):
        width = make_even(round(obj.width * shared_scale))
        height = max(2, round(obj.height * shared_scale))
        resized = obj.resize((width, height), Image.Resampling.LANCZOS)
        left = index * SOURCE_FRAME_SIZE + (SOURCE_FRAME_SIZE - width) // 2
        top = SOURCE_BOTTOM_Y - height + 1
        sheet.alpha_composite(resized, (left, top))

    SOURCE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(SOURCE_OUTPUT, optimize=True)
    runtime = sheet.resize((RUNTIME_FRAME_SIZE * 4, RUNTIME_FRAME_SIZE), Image.Resampling.LANCZOS)
    runtime.save(RUNTIME_OUTPUT, optimize=True)

    print(f"source={SOURCE_OUTPUT} size={SOURCE_OUTPUT.stat().st_size}")
    print(f"runtime={RUNTIME_OUTPUT} size={RUNTIME_OUTPUT.stat().st_size}")
    for index in range(4):
        frame = runtime.crop((index * RUNTIME_FRAME_SIZE, 0, (index + 1) * RUNTIME_FRAME_SIZE, RUNTIME_FRAME_SIZE))
        alpha = np.asarray(frame.getchannel("A"))
        ys, xs = np.where(alpha >= 8)
        print(
            f"frame={index} bounds=({xs.min()},{ys.min()})-({xs.max()},{ys.max()}) "
            f"center_x={(xs.min() + xs.max()) / 2:.1f} bottom_y={ys.max()}"
        )


if __name__ == "__main__":
    build()
