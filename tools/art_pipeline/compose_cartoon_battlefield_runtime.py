from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
CANDIDATE = ROOT / "art_source/battlefield/backgrounds/_working/battlefield_cartoon_candidate_v02.png"
GRASS_BASE = ROOT / "art_source/battlefield/backgrounds/_working/battlefield_cartoon_grass_base_v02.png"
SOURCE_OUTPUT = ROOT / "art_source/battlefield/backgrounds/battlefield_ground_cartoon_20x9_v02.png"
RUNTIME_OUTPUT = ROOT / "assets/bundles/art_battlefield/battlefield_ground_cartoon_20x9_runtime_v02.jpg"
AUDIT_IMAGE = ROOT / "art_source/battlefield/guides/battlefield_cartoon_alignment_audit_v02.png"
AUDIT_JSON = ROOT / "art_source/battlefield/guides/battlefield_cartoon_alignment_audit_v02.json"

SOURCE_SIZE = (2400, 1080)
RUNTIME_SIZE = (1600, 720)
DESIGN_WIDTH = 1600
DESIGN_HEIGHT = 720
SOURCE_SCALE = SOURCE_SIZE[0] / DESIGN_WIDTH
LANE_X = (-495, -225, 45, 315)
TARGET_CENTERS = tuple((x + DESIGN_WIDTH / 2) * SOURCE_SCALE for x in LANE_X)
SOURCE_SEARCH_RANGES = ((350, 570), (770, 990), (1170, 1390), (1570, 1790))
ROAD_HALF_WIDTH = 108  # 72 design px, or 144 design px total.
ROAD_FEATHER = 18
ROAD_TEXTURE_SAMPLE_HALF_WIDTH = 60
TACTICS_RECT = (1830, 135, 2400, 720)


def road_mask(rgb: np.ndarray) -> np.ndarray:
    values = rgb.astype(np.int16)
    red, green, blue = values[..., 0], values[..., 1], values[..., 2]
    return (red > 150) & (red > green + 8) & (red > blue + 35)


def largest_run_center(mask: np.ndarray, left: int, right: int, expected: float) -> float:
    row = mask[left:right]
    runs: list[tuple[int, int]] = []
    start: int | None = None
    for index, enabled in enumerate(np.append(row, False)):
        if enabled and start is None:
            start = index
        elif not enabled and start is not None:
            if index - start >= 45:
                runs.append((left + start, left + index))
            start = None
    if not runs:
        return expected
    best = min(runs, key=lambda run: abs((run[0] + run[1]) * 0.5 - expected))
    return (best[0] + best[1] - 1) * 0.5


def smooth(values: np.ndarray, window: int = 45) -> np.ndarray:
    radius = window // 2
    padded = np.pad(values, (radius, radius), mode="edge")
    median = np.array([np.median(padded[index:index + window]) for index in range(values.size)])
    kernel = np.ones(31, dtype=np.float64) / 31
    return np.convolve(np.pad(median, (15, 15), mode="edge"), kernel, mode="valid")


def detect_source_centers(candidate: np.ndarray) -> list[np.ndarray]:
    warm = road_mask(candidate)
    centers: list[np.ndarray] = []
    for left, right in SOURCE_SEARCH_RANGES:
        expected = (left + right) * 0.5
        per_row = np.empty(candidate.shape[0], dtype=np.float64)
        for y in range(candidate.shape[0]):
            local = warm[max(0, y - 4):min(candidate.shape[0], y + 5)].mean(axis=0) >= 0.45
            per_row[y] = largest_run_center(local, left, right, expected)
            expected = per_row[y]
        centers.append(smooth(per_row))
    return centers


def calm_tactics_area(image: Image.Image) -> Image.Image:
    original = np.asarray(image.convert("RGB"), dtype=np.float32) / 255
    blurred = np.asarray(image.filter(ImageFilter.GaussianBlur(2.6)), dtype=np.float32) / 255
    low_detail = original * 0.45 + blurred * 0.55
    gray = (low_detail[..., 0:1] * 0.299 + low_detail[..., 1:2] * 0.587
            + low_detail[..., 2:3] * 0.114)
    graded = gray + (low_detail - gray) * 1.12
    graded *= 1.23
    graded = np.clip(graded, 0, 1)

    x0, y0, x1, y1 = TACTICS_RECT
    xx = np.arange(SOURCE_SIZE[0], dtype=np.float32)
    yy = np.arange(SOURCE_SIZE[1], dtype=np.float32)
    x_weight = np.clip((xx - (x0 - 140)) / 140, 0, 1)
    top_weight = np.clip((yy - (y0 - 80)) / 80, 0, 1)
    bottom_weight = np.clip(((y1 + 80) - yy) / 80, 0, 1)
    weight = x_weight[None, :] * np.minimum(top_weight, bottom_weight)[:, None]
    weight *= 0.5 - 0.5 * np.cos(np.clip(weight, 0, 1) * np.pi)
    result = original * (1 - weight[..., None]) + graded * weight[..., None]
    return Image.fromarray(np.clip(result * 255, 0, 255).astype(np.uint8), "RGB")


def composite() -> tuple[Image.Image, np.ndarray]:
    candidate_image = Image.open(CANDIDATE).convert("RGB").resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    grass_image = Image.open(GRASS_BASE).convert("RGB").resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    calm_grass = calm_tactics_area(grass_image)
    candidate = np.asarray(candidate_image, dtype=np.float32)
    output = np.asarray(calm_grass, dtype=np.float32).copy()
    source_centers = detect_source_centers(candidate.astype(np.uint8))

    rng = np.random.default_rng(1902)
    raw_noise = rng.normal(0, 1, SOURCE_SIZE[1])
    kernel = np.ones(101, dtype=np.float64) / 101
    shared_edge_noise = np.convolve(np.pad(raw_noise, (50, 50), mode="reflect"), kernel, mode="valid")
    shared_edge_noise *= 4.5 / max(0.001, np.max(np.abs(shared_edge_noise)))

    patch_half_width = ROAD_HALF_WIDTH + ROAD_FEATHER + 10
    local_x = np.arange(-patch_half_width, patch_half_width + 1, dtype=np.float64)
    lane_masks = np.zeros((len(TARGET_CENTERS), SOURCE_SIZE[1], SOURCE_SIZE[0]), dtype=np.float32)
    lane_gains = (0.985, 1.0, 1.015, 0.995)
    source_x_axis = np.arange(SOURCE_SIZE[0])
    for lane_index, (target_center, center_rows) in enumerate(zip(TARGET_CENTERS, source_centers)):
        target_center_int = int(round(target_center))
        target_left = target_center_int - patch_half_width
        target_right = target_center_int + patch_half_width + 1
        for y, source_center in enumerate(center_rows):
            source_x = source_center + local_x / ROAD_HALF_WIDTH * ROAD_TEXTURE_SAMPLE_HALF_WIDTH
            source_x = np.clip(source_x, 0, SOURCE_SIZE[0] - 1)
            road_row = np.stack([
                np.interp(source_x, source_x_axis, candidate[y, :, channel])
                for channel in range(3)
            ], axis=1)
            road_row = (road_row + road_row[::-1]) * 0.5 * lane_gains[lane_index]
            half_width = ROAD_HALF_WIDTH + shared_edge_noise[y]
            distance = np.abs(local_x)
            alpha_line = np.clip((half_width + ROAD_FEATHER - distance) / (2 * ROAD_FEATHER), 0, 1)
            alpha_line = alpha_line * alpha_line * (3 - 2 * alpha_line)
            alpha = alpha_line[:, None].astype(np.float32)

            # A soft warm-green AO ring grounds the road without black outlines.
            ring = np.clip((half_width + ROAD_FEATHER + 9 - distance) / 9, 0, 1)
            ring *= np.clip((distance - half_width + ROAD_FEATHER * 0.4) / 13, 0, 1)
            output[y, target_left:target_right] *= 1 - ring[:, None] * 0.055
            output[y, target_left:target_right] = (
                road_row * alpha + output[y, target_left:target_right] * (1 - alpha)
            )
            lane_masks[lane_index, y, target_left:target_right] = alpha_line
    return Image.fromarray(np.clip(output, 0, 255).astype(np.uint8), "RGB"), lane_masks


def saturation_and_value(rgb: np.ndarray) -> tuple[float, float]:
    values = rgb.astype(np.float32) / 255
    maximum = values.max(axis=2)
    minimum = values.min(axis=2)
    saturation = np.where(maximum > 0, (maximum - minimum) / maximum, 0)
    return float(saturation.mean()), float(maximum.mean())


def detail_score(rgb: np.ndarray) -> float:
    values = rgb.astype(np.float32).mean(axis=2)
    dx = np.abs(np.diff(values, axis=1)).mean()
    dy = np.abs(np.diff(values, axis=0)).mean()
    return float((dx + dy) * 0.5)


def audit(image: Image.Image, lane_masks: np.ndarray) -> dict[str, object]:
    sample_design_y = {"ai": 234, "middle": 0, "player": -216}
    samples: dict[str, list[dict[str, float]]] = {}
    max_center_error = 0.0
    widths: list[float] = []
    for name, design_y in sample_design_y.items():
        pixel_y = int(round((DESIGN_HEIGHT / 2 - design_y) * SOURCE_SIZE[1] / DESIGN_HEIGHT))
        entries = []
        for lane, (target, mask) in enumerate(zip(TARGET_CENTERS, lane_masks), start=1):
            row = mask[pixel_y] >= 0.5
            indices = np.flatnonzero(row)
            left, right = int(indices[0]), int(indices[-1])
            center = (left + right) * 0.5
            width_design = (right - left + 1) / SOURCE_SCALE
            error_design = (center - target) / SOURCE_SCALE
            max_center_error = max(max_center_error, abs(error_design))
            widths.append(width_design)
            entries.append({
                "lane": lane,
                "targetPixelX": round(target, 3),
                "detectedPixelX": round(center, 3),
                "errorDesignPixels": round(error_design, 3),
                "roadWidthDesignPixels": round(width_design, 3),
                "grassGapToNextDesignPixels": round(270 - width_design, 3) if lane < 4 else None,
            })
        samples[name] = entries

    rgb = np.asarray(image.convert("RGB"))
    central = rgb[180:720, 1400:1540]
    tactics = rgb[180:700, 2070:2350]
    central_s, central_v = saturation_and_value(central)
    tactics_s, tactics_v = saturation_and_value(tactics)
    visual = {
        "centralSaturation": round(central_s, 4),
        "tacticsSaturation": round(tactics_s, 4),
        "tacticsSaturationReductionPercent": round((1 - tactics_s / central_s) * 100, 2),
        "centralBrightness": round(central_v, 4),
        "tacticsBrightness": round(tactics_v, 4),
        "tacticsBrightnessReductionPercent": round((1 - tactics_v / central_v) * 100, 2),
        "centralDetailScore": round(detail_score(central), 4),
        "tacticsDetailScore": round(detail_score(tactics), 4),
        "tacticsDetailReductionPercent": round((1 - detail_score(tactics) / detail_score(central)) * 100, 2),
    }
    max_width_delta = max(widths) - min(widths)
    min_grass_gap = 270 - max(widths)
    passed = (max_center_error <= 4 and max_width_delta <= 5
              and min(widths) >= 135 and max(widths) <= 150 and min_grass_gap >= 95)
    return {
        "sourceSize": list(SOURCE_SIZE),
        "runtimeSize": list(RUNTIME_SIZE),
        "laneX": list(LANE_X),
        "samples": samples,
        "maxAbsoluteCenterErrorDesignPixels": round(max_center_error, 3),
        "roadWidthRangeDesignPixels": [round(min(widths), 3), round(max(widths), 3)],
        "maxRoadWidthDeltaDesignPixels": round(max_width_delta, 3),
        "minimumGrassGapDesignPixels": round(min_grass_gap, 3),
        "tacticsRegion": visual,
        "passed": passed,
    }


def save_audit_overlay(image: Image.Image, report: dict[str, object]) -> None:
    preview = image.copy()
    draw = ImageDraw.Draw(preview, "RGBA")
    colors = ((255, 56, 83, 230), (70, 168, 255, 230), (168, 100, 255, 230), (255, 207, 72, 230))
    for index, (target, color) in enumerate(zip(TARGET_CENTERS, colors), start=1):
        draw.line((target, 0, target, SOURCE_SIZE[1]), fill=color, width=4)
        draw.text((target + 8, 18), f"L{index}", fill=color)
    x0, y0, x1, y1 = TACTICS_RECT
    draw.rectangle((x0, y0, x1 - 1, y1 - 1), outline=(135, 83, 180, 230), width=4)
    draw.text((x0 + 10, y0 + 10), "TacticsSafeRect", fill=(135, 83, 180, 255))
    draw.text((18, SOURCE_SIZE[1] - 34),
              f"center max error={report['maxAbsoluteCenterErrorDesignPixels']} px, "
              f"road width={report['roadWidthRangeDesignPixels']} px",
              fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 190))
    preview.save(AUDIT_IMAGE, format="PNG", optimize=True)


def main() -> None:
    SOURCE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    image, lane_masks = composite()
    report = audit(image, lane_masks)
    if not report["passed"]:
        raise RuntimeError(f"Cartoon battlefield audit failed: {report}")
    image.save(SOURCE_OUTPUT, format="PNG", optimize=True)
    image.resize(RUNTIME_SIZE, Image.Resampling.LANCZOS).save(
        RUNTIME_OUTPUT, format="JPEG", quality=90, subsampling=2, optimize=True,
    )
    AUDIT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    save_audit_overlay(image, report)
    print(json.dumps({
        **report,
        "sourceBytes": SOURCE_OUTPUT.stat().st_size,
        "runtimeBytes": RUNTIME_OUTPUT.stat().st_size,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
