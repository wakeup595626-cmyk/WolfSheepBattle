#!/usr/bin/env python3
"""Safely synchronize the art03 allowlist into assets/resources/art/full.

The script is intentionally additive: it never deletes files and refuses to
overwrite a destination whose bytes differ from the approved source.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path


MANIFEST_RELATIVE_PATH = Path("art_source/ART_RESOURCE_MANIFEST_v1.2.0-dev-art03.json")
RUNTIME_TARGET_ROOT = Path("assets/resources/art/full")
LICENSE_TARGET = Path("THIRD_PARTY_LICENSES/ui_font_cn_subset_v01_LICENSE.txt")

RUNTIME_ALLOWLIST = (
    "backgrounds/battlefield/battle_background_v01.png",
    "bases/ai/ai_base_v02.png",
    "bases/player/player_base_v02.png",
    "battlefield/roads/road_lane_01_v02.png",
    "battlefield/roads/road_lane_02_v02.png",
    "battlefield/roads/road_lane_03_v02.png",
    "battlefield/roads/road_lane_04_v02.png",
    "battlefield/spawn/ai/ai_spawn_gate_states_v01.png",
    "battlefield/spawn/player/player_spawn_gate_states_v01.png",
    "battlefield/supply_points/supply_point_states_v01.png",
    "branding/loading/loading_background_v01.png",
    "branding/loading/loading_bar_frame_v01.png",
    "branding/loading/loading_mascot_sheet_v02.png",
    "branding/logo/game_logo_emblem_v01.png",
    "branding/logo/game_logo_wordmark_v01.png",
    "branding/splash/splash_screen_v01.png",
    "characters/sheep/small/unit_sheep_small_sheet.png",
    "characters/sheep/medium/unit_sheep_medium_sheet.png",
    "characters/sheep/large/unit_sheep_large_sheet.png",
    "characters/sheep/giant/unit_sheep_giant_sheet.png",
    "characters/wolf/small/unit_wolf_small_sheet.png",
    "characters/wolf/medium/unit_wolf_medium_sheet.png",
    "characters/wolf/large/unit_wolf_large_sheet.png",
    "characters/wolf/giant/unit_wolf_giant_sheet.png",
    "ui/common/audio/bgm_next_button_v01.png",
    "ui/common/audio/bgm_previous_button_v01.png",
    "ui/common/audio/bgm_selector_panel_v01.png",
    "ui/common/audio/music_icon_v01.png",
    "ui/common/audio/sfx_icon_v01.png",
    "ui/common/audio/volume_slider_knob_v01.png",
    "ui/common/audio/volume_slider_track_v01.png",
    "ui/common/buttons/button_close_v01.png",
    "ui/common/buttons/button_primary_v01.png",
    "ui/common/buttons/button_secondary_v01.png",
    "ui/common/buttons/button_warning_v01.png",
    "ui/common/pause/pause_button_v01.png",
    "ui/common/pause/pause_panel_v01.png",
    "ui/fonts/ui_font_cn_subset_v01.ttf",
    "ui/hud/base_health/ai_base_health_frame_v01.png",
    "ui/hud/base_health/base_health_fill_mask_v01.png",
    "ui/hud/base_health/player_base_health_frame_v01.png",
    "ui/hud/level_badge/level_badge_v01.png",
    "ui/hud/notices/notice_banner_v01.png",
    "ui/hud/resources/ai_energy_frame_v01.png",
    "ui/hud/resources/ai_supply_frame_v01.png",
    "ui/hud/resources/icon_energy_v01.png",
    "ui/hud/resources/icon_supply_v01.png",
    "ui/hud/resources/player_energy_frame_v01.png",
    "ui/hud/resources/player_supply_frame_v01.png",
    "ui/hud/tier_badges/tier_badge_small_v01.png",
    "ui/hud/tier_badges/tier_badge_medium_v01.png",
    "ui/hud/tier_badges/tier_badge_large_v01.png",
    "ui/hud/tier_badges/tier_badge_giant_v01.png",
    "ui/hud/unit_health/enemy_unit_health_bar_v01.png",
    "ui/hud/unit_health/friendly_unit_health_bar_v01.png",
    "ui/hud/unit_health/unit_health_fill_mask_v01.png",
    "ui/modals/result_panel_v01.png",
    "ui/tactic_cards/heal/tactic_card_heal_v01.png",
    "ui/tactic_cards/shock/tactic_card_shock_v01.png",
    "ui/tactic_cards/sprint/tactic_card_sprint_v01.png",
    "ui/unit_cards/small/unit_card_small_v02.png",
    "ui/unit_cards/medium/unit_card_medium_v02.png",
    "ui/unit_cards/large/unit_card_large_v02.png",
    "ui/unit_cards/giant/unit_card_giant_v02.png",
    "vfx/breakthrough/base_hit_fx_sheet_v02.png",
    "vfx/breakthrough/breakthrough_fx_sheet_v02.png",
    "vfx/combat/death/unit_disappear_fx_sheet_v02.png",
    "vfx/combat/hit/hit_impact_fx_sheet_v02.png",
    "vfx/combat/sheep_attack/sheep_attack_fx_sheet_v02.png",
    "vfx/combat/wolf_attack/wolf_attack_fx_sheet_v02.png",
    "vfx/deploy/sheep/sheep_deploy_fx_sheet_v02.png",
    "vfx/deploy/wolf/wolf_deploy_fx_sheet_v02.png",
    "vfx/movement/movement_dust_fx_sheet_v02.png",
    "vfx/results/defeat/defeat_emblem_v02.png",
    "vfx/results/defeat/defeat_overlay_v01.png",
    "vfx/results/level_transition/level_transition_background_v01.png",
    "vfx/results/level_transition/level_transition_banner_v01.png",
    "vfx/results/level_transition/level_transition_wipe_sheet_v01.png",
    "vfx/results/victory/victory_emblem_v02.png",
    "vfx/results/victory/victory_overlay_v01.png",
    "vfx/tactics/heal/tactic_heal_fx_sheet_v02.png",
    "vfx/tactics/shock/tactic_shock_fx_sheet_v02.png",
    "vfx/tactics/sprint/tactic_sprint_fx_sheet_v02.png",
)

LICENSE_SOURCE = "ui/fonts/ui_font_cn_subset_v01_LICENSE.txt"

FORBIDDEN_EXACT_NAMES = {
    "loading_mascot_sheet_v01.png",
    "victory_emblem_v01.png",
    "defeat_emblem_v01.png",
    "player_base_v01.png",
    "ai_base_v01.png",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def verify_allowlist() -> None:
    if len(RUNTIME_ALLOWLIST) != len(set(RUNTIME_ALLOWLIST)):
        raise RuntimeError("Runtime allowlist contains duplicate entries")
    for relative in RUNTIME_ALLOWLIST:
        normalized = relative.replace("\\", "/")
        parts = normalized.split("/")
        if "_archive" in parts or "reference" in parts:
            raise RuntimeError(f"Forbidden directory in allowlist: {relative}")
        if Path(relative).name in FORBIDDEN_EXACT_NAMES:
            raise RuntimeError(f"Forbidden obsolete resource in allowlist: {relative}")
        if "/animation/" in f"/{normalized}/":
            raise RuntimeError(f"Legacy animation sheet in allowlist: {relative}")
        if relative.endswith("_fx_sheet_v01.png") or relative.endswith("unit_card_small_v01.png"):
            raise RuntimeError(f"Obsolete runtime variant in allowlist: {relative}")


def load_manifest(project_root: Path) -> dict[str, dict]:
    manifest_path = project_root / MANIFEST_RELATIVE_PATH
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return {entry["relativePath"]: entry for entry in data["resources"]}


def sync_one(source: Path, target: Path, expected_hash: str, dry_run: bool) -> str:
    source_hash = sha256(source)
    if source_hash != expected_hash.upper():
        raise RuntimeError(
            f"Source hash mismatch: {source}\nexpected={expected_hash}\nactual={source_hash}"
        )
    if target.exists():
        target_hash = sha256(target)
        if target_hash != source_hash:
            raise RuntimeError(
                f"Destination differs; refusing to overwrite: {target}\n"
                f"source={source_hash}\ndestination={target_hash}"
            )
        return "unchanged"
    if not dry_run:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied_hash = sha256(target)
        if copied_hash != source_hash:
            raise RuntimeError(f"Post-copy hash mismatch: {target}")
    return "would-copy" if dry_run else "copied"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    project_root = args.project_root.resolve()

    verify_allowlist()
    manifest = load_manifest(project_root)
    requested = (*RUNTIME_ALLOWLIST, LICENSE_SOURCE)
    missing_manifest = [relative for relative in requested if relative not in manifest]
    if missing_manifest:
        raise RuntimeError(f"Allowlisted files absent from manifest: {missing_manifest}")

    summary = {"copied": 0, "unchanged": 0, "would-copy": 0}
    copied_bytes = 0
    for relative in RUNTIME_ALLOWLIST:
        entry = manifest[relative]
        source = project_root / "art_source" / relative
        target = project_root / RUNTIME_TARGET_ROOT / relative
        if not source.is_file():
            raise RuntimeError(f"Allowlisted source missing: {source}")
        state = sync_one(source, target, entry["sha256"], args.dry_run)
        summary[state] += 1
        copied_bytes += int(entry.get("diskBytes", source.stat().st_size))

    license_entry = manifest[LICENSE_SOURCE]
    license_state = sync_one(
        project_root / "art_source" / LICENSE_SOURCE,
        project_root / LICENSE_TARGET,
        license_entry["sha256"],
        args.dry_run,
    )
    summary[license_state] += 1

    print(json.dumps({
        "batch": "v1.2.0-dev-art05-fullfill",
        "runtimeAllowlistCount": len(RUNTIME_ALLOWLIST),
        "licenseCount": 1,
        "runtimeDiskBytes": copied_bytes,
        "runtimeDiskMiB": round(copied_bytes / 1024 / 1024, 3),
        "summary": summary,
        "dryRun": args.dry_run,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # explicit terminal failure for CI and local use
        print(f"ART SYNC FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)

