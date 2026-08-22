#!/usr/bin/env python3
"""Build reversible art07 runtime derivatives for local Cocos Asset Bundles.

High-quality inputs stay under art_source. This script never edits source art,
never writes .meta files, and only writes the explicit runtime bundle outputs.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = PROJECT_ROOT / "art_source/ART_RESOURCE_MANIFEST_v1.2.0-dev-art03.json"
OUTPUT_ROOT = PROJECT_ROOT / "assets/bundles"
REPORT_PATH = PROJECT_ROOT / "tmp/art07_runtime_derivatives.json"

JPEG_SPECS = {
    "backgrounds/battlefield/battle_background_v01.png": ((1280, 720), 88),
    "branding/loading/loading_background_v01.png": ((1280, 720), 88),
    "branding/splash/splash_screen_v01.png": ((1280, 720), 88),
    "vfx/results/level_transition/level_transition_background_v01.png": ((1280, 720), 88),
}

TARGET_SIZES = {
    "branding/logo/game_logo_wordmark_v01.png": (660, 330),
    "branding/logo/game_logo_emblem_v01.png": (192, 192),
    "branding/loading/loading_bar_frame_v01.png": (640, 120),
    "branding/loading/loading_mascot_sheet_v02.png": (1024, 128),
    "battlefield/spawn/player/player_spawn_gate_states_v01.png": (512, 128),
    "battlefield/spawn/ai/ai_spawn_gate_states_v01.png": (512, 128),
    "battlefield/supply_points/supply_point_states_v01.png": (512, 128),
    "ui/hud/unit_health/friendly_unit_health_bar_v01.png": (256, 64),
    "ui/hud/unit_health/enemy_unit_health_bar_v01.png": (256, 64),
    "ui/hud/unit_health/unit_health_fill_mask_v01.png": (256, 64),
    "ui/hud/tier_badges/tier_badge_small_v01.png": (128, 128),
    "ui/hud/tier_badges/tier_badge_medium_v01.png": (128, 128),
    "ui/hud/tier_badges/tier_badge_large_v01.png": (128, 128),
    "ui/hud/tier_badges/tier_badge_giant_v01.png": (128, 128),
    "ui/hud/resources/icon_energy_v01.png": (128, 128),
    "ui/hud/resources/icon_supply_v01.png": (128, 128),
    "ui/hud/level_badge/level_badge_v01.png": (384, 192),
    "ui/hud/notices/notice_banner_v01.png": (768, 192),
    "ui/tactic_cards/sprint/tactic_card_sprint_v01.png": (512, 208),
    "ui/tactic_cards/heal/tactic_card_heal_v01.png": (512, 208),
    "ui/tactic_cards/shock/tactic_card_shock_v01.png": (512, 208),
    "ui/common/pause/pause_button_v01.png": (128, 128),
    "ui/common/pause/pause_panel_v01.png": (768, 768),
    "ui/common/buttons/button_primary_v01.png": (384, 128),
    "ui/common/buttons/button_secondary_v01.png": (384, 128),
    "ui/common/buttons/button_warning_v01.png": (384, 128),
    "ui/common/buttons/button_close_v01.png": (128, 128),
    "ui/common/audio/music_icon_v01.png": (128, 128),
    "ui/common/audio/sfx_icon_v01.png": (128, 128),
    "ui/common/audio/volume_slider_track_v01.png": (512, 96),
    "ui/common/audio/volume_slider_knob_v01.png": (128, 128),
    "ui/common/audio/bgm_selector_panel_v01.png": (768, 240),
    "ui/common/audio/bgm_previous_button_v01.png": (128, 128),
    "ui/common/audio/bgm_next_button_v01.png": (128, 128),
    "ui/modals/result_panel_v01.png": (960, 720),
    "vfx/results/victory/victory_emblem_v02.png": (256, 256),
    "vfx/results/defeat/defeat_emblem_v02.png": (256, 256),
    "vfx/results/level_transition/level_transition_banner_v01.png": (768, 288),
    "vfx/results/level_transition/level_transition_wipe_sheet_v01.png": (1024, 512),
    "vfx/breakthrough/base_hit_fx_sheet_v02.png": (512, 256),
    "vfx/breakthrough/breakthrough_fx_sheet_v02.png": (512, 256),
    "vfx/combat/death/unit_disappear_fx_sheet_v02.png": (512, 256),
    "vfx/combat/hit/hit_impact_fx_sheet_v02.png": (512, 256),
    "vfx/combat/sheep_attack/sheep_attack_fx_sheet_v02.png": (512, 256),
    "vfx/combat/wolf_attack/wolf_attack_fx_sheet_v02.png": (512, 256),
    "vfx/deploy/sheep/sheep_deploy_fx_sheet_v02.png": (512, 256),
    "vfx/deploy/wolf/wolf_deploy_fx_sheet_v02.png": (512, 256),
    "vfx/movement/movement_dust_fx_sheet_v02.png": (512, 256),
    "vfx/tactics/heal/tactic_heal_fx_sheet_v02.png": (512, 256),
    "vfx/tactics/shock/tactic_shock_fx_sheet_v02.png": (512, 256),
    "vfx/tactics/sprint/tactic_sprint_fx_sheet_v02.png": (512, 256),
}

BGM_SPECS = (
    ("bgm_cheerful_lighthearted.mp3", "bgm_cheerful_lighthearted_runtime_v01.mp3"),
    ("bgm_cyberwave_upbeat.mp3", "bgm_cyberwave_upbeat_runtime_v01.mp3"),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def runtime_stem(stem: str) -> str:
    stem = re.sub(r"_v\d+$", "", stem)
    return f"{stem}_runtime_v01"


def bundle_for(relative: str) -> str:
    if relative.startswith("branding/") or relative.startswith("ui/fonts/"):
        return "art_boot"
    if relative.startswith(("backgrounds/", "bases/", "battlefield/")):
        return "art_battlefield"
    if relative.startswith("characters/") or relative.startswith("ui/unit_cards/") \
            or relative.startswith("ui/hud/unit_health/") \
            or relative.startswith("ui/hud/tier_badges/"):
        return "art_units"
    if relative.startswith("vfx/"):
        return "art_vfx"
    if relative.startswith("ui/"):
        return "art_ui"
    raise ValueError(f"No runtime bundle mapping for {relative}")


def output_relative(relative: str, jpeg: bool) -> Path:
    source = Path(relative)
    suffix = ".jpg" if jpeg else source.suffix.lower()
    return source.with_name(runtime_stem(source.stem) + suffix)


def load_allowlist() -> tuple[str, ...]:
    module_path = PROJECT_ROOT / "tools/art_pipeline/sync_art03_runtime_assets.py"
    spec = importlib.util.spec_from_file_location("art05_sync", module_path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Unable to load allowlist module: {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return tuple(module.RUNTIME_ALLOWLIST)


def save_png(source: Path, target: Path, target_size: tuple[int, int] | None) -> tuple[str, tuple[int, int]]:
    with Image.open(source) as image:
        image.load()
        output = image
        method = "PNG lossless optimize"
        if target_size and image.size != target_size:
            output = image.resize(target_size, Image.Resampling.LANCZOS)
            method = f"PNG Lanczos {image.width}x{image.height}->{target_size[0]}x{target_size[1]} + lossless optimize"
        target.parent.mkdir(parents=True, exist_ok=True)
        output.save(target, format="PNG", optimize=True, compress_level=9)
        size = output.size
        if output is not image:
            output.close()
    return method, size


def save_jpeg(source: Path, target: Path, target_size: tuple[int, int], quality: int) -> tuple[str, tuple[int, int]]:
    with Image.open(source) as image:
        image.load()
        output = image.convert("RGB")
        if output.size != target_size:
            resized = output.resize(target_size, Image.Resampling.LANCZOS)
            output.close()
            output = resized
        target.parent.mkdir(parents=True, exist_ok=True)
        output.save(
            target,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=False,
            subsampling=2,
        )
        size = output.size
        output.close()
    return f"JPEG q{quality} 4:2:0 {target_size[0]}x{target_size[1]}", size


def transcode_bgm(ffmpeg: Path, source: Path, target: Path) -> dict:
    target.parent.mkdir(parents=True, exist_ok=True)
    command = [
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source), "-vn", "-ar", "44100", "-ac", "2",
        "-codec:a", "libmp3lame", "-b:a", "112k", "-write_xing", "1",
        str(target),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0 or not target.is_file():
        raise RuntimeError(f"BGM transcode failed for {source.name}: {result.stderr.strip()}")
    return {
        "kind": "audio",
        "bundle": "audio_bgm",
        "source": source.relative_to(PROJECT_ROOT).as_posix(),
        "runtime": target.relative_to(PROJECT_ROOT).as_posix(),
        "sourceBytes": source.stat().st_size,
        "runtimeBytes": target.stat().st_size,
        "ratio": round(target.stat().st_size / source.stat().st_size, 6),
        "method": "MP3 libmp3lame 44.1kHz stereo 112kbps",
        "sha256": sha256(target),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", type=Path, required=True)
    args = parser.parse_args()
    ffmpeg = args.ffmpeg.resolve()
    if not ffmpeg.is_file():
        raise FileNotFoundError(ffmpeg)

    manifest_data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest = {entry["relativePath"]: entry for entry in manifest_data["resources"]}
    allowlist = load_allowlist()
    if len(allowlist) != 83:
        raise RuntimeError(f"Expected 83 art runtime resources, got {len(allowlist)}")

    records: list[dict] = []
    for relative in allowlist:
        entry = manifest.get(relative)
        if not entry:
            raise RuntimeError(f"Manifest entry missing: {relative}")
        source = PROJECT_ROOT / "art_source" / relative
        if not source.is_file():
            raise FileNotFoundError(source)
        actual_hash = sha256(source)
        if actual_hash != entry["sha256"]:
            raise RuntimeError(f"Source hash mismatch: {relative}")

        bundle = bundle_for(relative)
        if source.suffix.lower() == ".ttf":
            target_rel = output_relative(relative, False)
            target = OUTPUT_ROOT / bundle / target_rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            method = "byte-identical font copy"
            runtime_size = None
        else:
            jpeg_spec = JPEG_SPECS.get(relative)
            target_rel = output_relative(relative, jpeg_spec is not None)
            target = OUTPUT_ROOT / bundle / target_rel
            if jpeg_spec:
                method, runtime_size = save_jpeg(source, target, *jpeg_spec)
            else:
                method, runtime_size = save_png(source, target, TARGET_SIZES.get(relative))

        runtime_bytes = target.stat().st_size
        records.append({
            "kind": entry.get("kind", "image"),
            "bundle": bundle,
            "source": source.relative_to(PROJECT_ROOT).as_posix(),
            "runtime": target.relative_to(PROJECT_ROOT).as_posix(),
            "sourceBytes": source.stat().st_size,
            "runtimeBytes": runtime_bytes,
            "ratio": round(runtime_bytes / source.stat().st_size, 6),
            "sourceSize": [entry.get("width"), entry.get("height")],
            "runtimeSize": list(runtime_size) if runtime_size else None,
            "transparent": bool(entry.get("alpha", {}).get("containsTransparentPixels", False)),
            "method": method,
            "sha256": sha256(target),
        })

    bgm_source_root = PROJECT_ROOT / "assets/resources/audio/bgm"
    for source_name, runtime_name in BGM_SPECS:
        records.append(transcode_bgm(
            ffmpeg,
            bgm_source_root / source_name,
            OUTPUT_ROOT / "audio_bgm/bgm" / runtime_name,
        ))

    bundles: dict[str, dict] = {}
    for record in records:
        summary = bundles.setdefault(record["bundle"], {"count": 0, "sourceBytes": 0, "runtimeBytes": 0})
        summary["count"] += 1
        summary["sourceBytes"] += record["sourceBytes"]
        summary["runtimeBytes"] += record["runtimeBytes"]
    for summary in bundles.values():
        summary["ratio"] = round(summary["runtimeBytes"] / summary["sourceBytes"], 6)

    result = {
        "batch": "v1.2.0-dev-art07-package01",
        "records": records,
        "bundles": bundles,
        "sourceBytes": sum(record["sourceBytes"] for record in records),
        "runtimeBytes": sum(record["runtimeBytes"] for record in records),
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "recordCount": len(records),
        "sourceBytes": result["sourceBytes"],
        "runtimeBytes": result["runtimeBytes"],
        "ratio": round(result["runtimeBytes"] / result["sourceBytes"], 6),
        "bundles": bundles,
        "report": str(REPORT_PATH),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
