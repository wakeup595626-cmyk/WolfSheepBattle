from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


DESIGN_WIDTH = 1280
DESIGN_HEIGHT = 720
SOURCE_LANE_CENTERS = np.array([206.0, 417.0, 618.0, 839.0])
TARGET_LANE_CENTERS = np.array([145.0, 415.0, 685.0, 955.0])


def remap_lane_centers(source: Image.Image) -> Image.Image:
    resized = source.convert("RGB").resize((DESIGN_WIDTH, DESIGN_HEIGHT), Image.Resampling.LANCZOS)
    source_array = np.asarray(resized, dtype=np.float32)
    output_controls = np.concatenate(([0.0], TARGET_LANE_CENTERS, [DESIGN_WIDTH - 1.0]))
    input_controls = np.concatenate(([0.0], SOURCE_LANE_CENTERS, [DESIGN_WIDTH - 1.0]))
    output_x = np.arange(DESIGN_WIDTH, dtype=np.float32)
    input_x = np.interp(output_x, output_controls, input_controls)
    left = np.floor(input_x).astype(np.int32)
    right = np.minimum(left + 1, DESIGN_WIDTH - 1)
    blend = (input_x - left)[None, :, None]
    remapped = source_array[:, left, :] * (1.0 - blend) + source_array[:, right, :] * blend
    return Image.fromarray(np.clip(remapped, 0, 255).astype(np.uint8), mode="RGB")


def create_shadow_source() -> Image.Image:
    width, height = 256, 128
    alpha = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(alpha)
    draw.ellipse((30, 38, width - 30, height - 26), fill=122)
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=14))
    rgba = Image.new("RGBA", (width, height), (48, 70, 57, 0))
    rgba.putalpha(alpha)
    return rgba


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--generated", type=Path, required=True)
    parser.add_argument("--project", type=Path, required=True)
    args = parser.parse_args()

    project = args.project.resolve()
    topdown_source = project / "art_source/battlefield/backgrounds/battlefield_ground_topdown_v02.png"
    topdown_runtime = project / "assets/bundles/art_battlefield/battlefield/backgrounds/battlefield_ground_topdown_runtime_v01.jpg"
    shadow_source = project / "art_source/characters/shared/unit_ground_shadow_v01.png"
    shadow_runtime = project / "assets/bundles/art_units/characters/shared/unit_ground_shadow_runtime_v01.png"

    for path in (topdown_source, topdown_runtime, shadow_source, shadow_runtime):
        path.parent.mkdir(parents=True, exist_ok=True)

    calibrated = remap_lane_centers(Image.open(args.generated))
    calibrated.save(topdown_source, format="PNG", optimize=True)
    calibrated.save(topdown_runtime, format="JPEG", quality=89, subsampling=0, optimize=True)

    shadow = create_shadow_source()
    shadow.save(shadow_source, format="PNG", optimize=True)
    shadow.resize((128, 64), Image.Resampling.LANCZOS).save(shadow_runtime, format="PNG", optimize=True)

    for path in (topdown_source, topdown_runtime, shadow_source, shadow_runtime):
        with Image.open(path) as image:
            print(f"{path.relative_to(project)}|{image.size[0]}x{image.size[1]}|{path.stat().st_size}")


if __name__ == "__main__":
    main()
