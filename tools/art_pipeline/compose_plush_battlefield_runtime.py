from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
CANDIDATE = ROOT / "art_source/battlefield/backgrounds/_working/battlefield_plush_candidate_laneedit_v02.png"
GRASS_BASE = ROOT / "art_source/battlefield/backgrounds/_working/battlefield_plush_grass_base_v03.png"
SOURCE_OUTPUT = ROOT / "art_source/battlefield/backgrounds/battlefield_ground_plush_20x9_v01.png"
RUNTIME_OUTPUT = ROOT / "assets/bundles/art_battlefield/battlefield_ground_plush_20x9_runtime_v01.jpg"
AUDIT_IMAGE = ROOT / "art_source/battlefield/guides/battlefield_plush_alignment_audit_v01.png"
AUDIT_JSON = ROOT / "art_source/battlefield/guides/battlefield_plush_alignment_audit_v01.json"

SOURCE_SIZE = (2400, 1080)
RUNTIME_CORE_SIZE = (1600, 720)
RUNTIME_SIZE = (1680, 720)
RUNTIME_SIDE_EXTENSION = (RUNTIME_SIZE[0] - RUNTIME_CORE_SIZE[0]) // 2
DESIGN_WIDTH_20X9 = 1600
DESIGN_HEIGHT = 720
LANE_X = (-495, -225, 45, 315)
TARGET_CENTERS = tuple((x + DESIGN_WIDTH_20X9 / 2) * SOURCE_SIZE[0] / DESIGN_WIDTH_20X9 for x in LANE_X)
SOURCE_SEARCH_RANGES = ((380, 800), (780, 1160), (1190, 1580), (1580, 1960))
ROAD_HALF_WIDTH = 135
ROAD_FEATHER = 20
ROAD_TEXTURE_SAMPLE_HALF_WIDTH = 70


def road_mask(rgb: np.ndarray) -> np.ndarray:
    values = rgb.astype(np.int16)
    red, green, blue = values[..., 0], values[..., 1], values[..., 2]
    return (red > 132) & (red > green + 7) & (green > blue + 24)


def largest_run_center(mask: np.ndarray, left: int, right: int, expected: float) -> float:
    row = mask[left:right]
    runs: list[tuple[int, int]] = []
    start: int | None = None
    for index, enabled in enumerate(np.append(row, False)):
        if enabled and start is None:
            start = index
        elif not enabled and start is not None:
            if index - start >= 28:
                runs.append((left + start, left + index))
            start = None
    if not runs:
        return expected
    candidates = sorted(runs, key=lambda run: (-(run[1] - run[0]), abs((run[0] + run[1]) / 2 - expected)))
    best = candidates[0]
    return (best[0] + best[1] - 1) / 2


def smooth(values: np.ndarray, window: int = 41) -> np.ndarray:
    radius = window // 2
    padded = np.pad(values, (radius, radius), mode="edge")
    med = np.array([np.median(padded[index:index + window]) for index in range(values.size)])
    kernel = np.ones(25, dtype=np.float64) / 25
    return np.convolve(np.pad(med, (12, 12), mode="edge"), kernel, mode="valid")


def detect_source_centers(candidate: np.ndarray) -> list[np.ndarray]:
    height = candidate.shape[0]
    brown = road_mask(candidate)
    centers: list[np.ndarray] = []
    for left, right in SOURCE_SEARCH_RANGES:
        expected = (left + right) / 2
        per_row = np.empty(height, dtype=np.float64)
        for y in range(height):
            y0 = max(0, y - 5)
            y1 = min(height, y + 6)
            local = brown[y0:y1].mean(axis=0) >= 0.45
            per_row[y] = largest_run_center(local, left, right, expected)
            expected = per_row[y]
        centers.append(smooth(per_row))
    return centers


def composite() -> tuple[Image.Image, list[np.ndarray]]:
    candidate_image = Image.open(CANDIDATE).convert("RGB").resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    grass_image = Image.open(GRASS_BASE).convert("RGB").resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    candidate = np.asarray(candidate_image, dtype=np.float32)
    output = np.asarray(grass_image, dtype=np.float32).copy()
    source_centers = detect_source_centers(candidate.astype(np.uint8))

    width = SOURCE_SIZE[0]
    rng = np.random.default_rng(1209)
    edge_noise = []
    for lane in range(len(TARGET_CENTERS)):
        raw = rng.normal(0, 1, SOURCE_SIZE[1])
        kernel = np.ones(91, dtype=np.float64) / 91
        smooth_noise = np.convolve(np.pad(raw, (45, 45), mode="reflect"), kernel, mode="valid")
        smooth_noise *= 6 / max(0.001, np.max(np.abs(smooth_noise)))
        edge_noise.append(smooth_noise)

    patch_half_width = ROAD_HALF_WIDTH + ROAD_FEATHER + 8
    local_x = np.arange(-patch_half_width, patch_half_width + 1, dtype=np.float64)
    for lane_index, (target_center, center_rows) in enumerate(zip(TARGET_CENTERS, source_centers)):
        target_center_int = int(round(target_center))
        target_left = target_center_int - patch_half_width
        target_right = target_center_int + patch_half_width + 1
        if target_left < 0 or target_right > width:
            raise RuntimeError("Target road patch exceeds source bounds")
        for y, source_center in enumerate(center_rows):
            source_x = source_center + local_x / patch_half_width * ROAD_TEXTURE_SAMPLE_HALF_WIDTH
            source_x = np.clip(source_x, 0, width - 1)
            road_row = np.stack([
                np.interp(source_x, np.arange(width), candidate[y, :, channel])
                for channel in range(3)
            ], axis=1)
            # Fine suede fibers remain natural after averaging, while bilateral
            # luminance balance prevents flowers or stones in the source strip
            # from pulling the perceived road centre away from LANE_X.
            road_row = (road_row + road_row[::-1]) * 0.5
            half_width = ROAD_HALF_WIDTH + edge_noise[lane_index][y]
            distance = np.abs(local_x)
            alpha_line = np.clip((half_width + ROAD_FEATHER - distance) / ROAD_FEATHER, 0, 1)
            alpha_line = alpha_line * alpha_line * (3 - 2 * alpha_line)
            alpha = alpha_line[:, None].astype(np.float32)
            # A warm, low-opacity ambient-occlusion ring grounds the suede path.
            ring = np.clip((half_width + ROAD_FEATHER + 10 - distance) / 10, 0, 1)
            ring *= np.clip((distance - half_width + 2) / 12, 0, 1)
            output[y, target_left:target_right] *= (1 - ring[:, None] * 0.075)
            output[y, target_left:target_right] = (
                road_row * alpha + output[y, target_left:target_right] * (1 - alpha)
            )
    return Image.fromarray(np.clip(output, 0, 255).astype(np.uint8), "RGB"), source_centers


def contiguous_lane_center(mask_row: np.ndarray, target: float) -> float:
    left = max(0, int(target - 170))
    right = min(mask_row.size, int(target + 170))
    indices = np.flatnonzero(mask_row[left:right]) + left
    if not indices.size:
        return target
    # The target-centred brown surface is the dominant run; reject isolated flowers/stones.
    runs: list[np.ndarray] = []
    start = 0
    for index in range(1, indices.size + 1):
        if index == indices.size or indices[index] > indices[index - 1] + 1:
            run = indices[start:index]
            if run.size >= 30:
                runs.append(run)
            start = index
    if not runs:
        return float(indices.mean())
    run = min(runs, key=lambda value: abs(float(value.mean()) - target))
    return float((run[0] + run[-1]) / 2)


def audit(image: Image.Image) -> dict[str, object]:
    rgb = np.asarray(image.convert("RGB"))
    grass = np.asarray(Image.open(GRASS_BASE).convert("RGB").resize(SOURCE_SIZE, Image.Resampling.LANCZOS))
    difference = np.abs(rgb.astype(np.int16) - grass.astype(np.int16)).mean(axis=2)
    sample_design_y = {"ai": 234, "middle": 0, "player": -216}
    samples: dict[str, list[dict[str, float]]] = {}
    max_error_design = 0.0
    for name, design_y in sample_design_y.items():
        pixel_y = int(round((DESIGN_HEIGHT / 2 - design_y) * SOURCE_SIZE[1] / DESIGN_HEIGHT))
        y0, y1 = max(0, pixel_y - 6), min(SOURCE_SIZE[1], pixel_y + 7)
        # Compare against the no-road ImageGen base. This isolates the composited
        # road silhouette from brown flowers/stones that would bias color-only
        # segmentation while measuring the actual edited geometry.
        local_mask = difference[y0:y1].mean(axis=0) >= 6
        entries = []
        for lane, target in enumerate(TARGET_CENTERS, start=1):
            detected = contiguous_lane_center(local_mask, target)
            error_pixels = detected - target
            error_design = error_pixels / (SOURCE_SIZE[0] / DESIGN_WIDTH_20X9)
            max_error_design = max(max_error_design, abs(error_design))
            entries.append({
                "lane": lane,
                "targetPixelX": round(target, 3),
                "detectedPixelX": round(detected, 3),
                "errorPixels": round(error_pixels, 3),
                "errorDesignPixels": round(error_design, 3),
            })
        samples[name] = entries
    return {
        "sourceSize": list(SOURCE_SIZE),
        "runtimeSize": list(RUNTIME_SIZE),
        "laneX": list(LANE_X),
        "targetCenters": [round(value, 3) for value in TARGET_CENTERS],
        "samples": samples,
        "maxAbsoluteErrorDesignPixels": round(max_error_design, 3),
        "passed": max_error_design <= 4,
    }


def save_audit_overlay(image: Image.Image, report: dict[str, object]) -> None:
    preview = image.copy()
    draw = ImageDraw.Draw(preview, "RGBA")
    colors = ((255, 56, 83, 230), (70, 168, 255, 230), (168, 100, 255, 230), (255, 207, 72, 230))
    for index, (target, color) in enumerate(zip(TARGET_CENTERS, colors), start=1):
        draw.line((target, 0, target, SOURCE_SIZE[1]), fill=color, width=4)
        draw.text((target + 8, 18), f"L{index}", fill=color)
    draw.rectangle((240, 0, 2160, SOURCE_SIZE[1] - 1), outline=(255, 244, 182, 230), width=4)
    draw.text((18, SOURCE_SIZE[1] - 30),
              f"max error = {report['maxAbsoluteErrorDesignPixels']} design px",
              fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 210))
    preview.save(AUDIT_IMAGE, format="PNG", optimize=True)


def create_runtime_image(source: Image.Image) -> Image.Image:
    """Keep the 1280 design-pixel core at 1:1 scale and add grass-only 21:9 bleed."""
    core = source.resize(RUNTIME_CORE_SIZE, Image.Resampling.LANCZOS)
    runtime = Image.new("RGB", RUNTIME_SIZE)
    runtime.paste(core, (RUNTIME_SIDE_EXTENSION, 0))
    # Only the non-interactive grass edge is mirrored. The seam meets the exact
    # source edge, while roads and the complete 20:9 composition remain untouched.
    left = core.crop((0, 0, RUNTIME_SIDE_EXTENSION, RUNTIME_SIZE[1])).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    right = core.crop((RUNTIME_CORE_SIZE[0] - RUNTIME_SIDE_EXTENSION, 0,
                       RUNTIME_CORE_SIZE[0], RUNTIME_SIZE[1])).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    runtime.paste(left, (0, 0))
    runtime.paste(right, (RUNTIME_SIDE_EXTENSION + RUNTIME_CORE_SIZE[0], 0))
    return runtime


def main() -> None:
    SOURCE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    final_image, _ = composite()
    report = audit(final_image)
    if not report["passed"]:
        raise RuntimeError(f"Road alignment audit failed: {report}")
    final_image.save(SOURCE_OUTPUT, format="PNG", optimize=True)
    create_runtime_image(final_image).save(
        RUNTIME_OUTPUT,
        format="JPEG",
        quality=90,
        subsampling=2,
        optimize=True,
    )
    AUDIT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    save_audit_overlay(final_image, report)
    print(json.dumps({
        **report,
        "sourceBytes": SOURCE_OUTPUT.stat().st_size,
        "runtimeBytes": RUNTIME_OUTPUT.stat().st_size,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
