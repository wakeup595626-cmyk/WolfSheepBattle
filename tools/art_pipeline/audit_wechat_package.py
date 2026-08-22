from __future__ import annotations

import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "build" / "wechatgame"
ASSETS = ROOT / "assets"
DERIVATIVES = ROOT / "tmp" / "art07_runtime_derivatives.json"
OUTPUT = ROOT / "PACKAGE_FILE_AUDIT_v1.2.0-dev-art07.csv"


def uuid_asset_map() -> dict[str, str]:
    result: dict[str, str] = {}
    for meta in ASSETS.rglob("*.meta"):
        try:
            payload = json.loads(meta.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError, UnicodeDecodeError):
            continue
        uuid = payload.get("uuid")
        if uuid:
            result[uuid] = meta.relative_to(ASSETS).as_posix()[:-5]
    return result


def display_size(path: str, runtime_size: str) -> str:
    path = path.replace("\\", "/")
    rules = (
        ("background", "1280x720"),
        ("road_lane", "180x515"),
        ("/bases/", "760x285"),
        ("spawn_gate", "166x54（入口）/72x72（AI门）"),
        ("supply_point", "54x54"),
        ("unit_sheep_small", "78x78"),
        ("unit_wolf_small", "68x68"),
        ("unit_sheep_medium", "92x92"),
        ("unit_wolf_medium", "82x82"),
        ("unit_sheep_large", "106x106"),
        ("unit_wolf_large", "96x96"),
        ("unit_sheep_giant", "120x120"),
        ("unit_wolf_giant", "110x110"),
        ("unit_card", "约260x40"),
        ("unit_health", "随逻辑半径，最大约116x24"),
        ("tier_badge", "24x24"),
        ("base_health", "约400x48"),
        ("energy", "约300x48"),
        ("supply_frame", "约170x44"),
        ("tactic_card", "约200x86"),
        ("pause_panel", "650x650"),
        ("result_panel", "760x470"),
        ("victory_emblem", "118x118"),
        ("defeat_emblem", "118x118"),
        ("logo_wordmark", "330x165"),
        ("logo_emblem", "96x96"),
        ("loading_bar", "640x120"),
        ("loading_mascot", "128x128/帧"),
        ("_fx_sheet", "128x128/帧"),
        ("wipe_sheet", "256x256/帧"),
    )
    for marker, value in rules:
        if marker in path:
            return value
    return runtime_size or "N/A"


def scene_for(source: str, package: str) -> tuple[str, str]:
    source = source.replace("\\", "/")
    if package == "MAIN":
        return "启动/全局", "是（引擎、场景、脚本或基础音效）"
    if package == "art_boot":
        return "标题/最小加载界面", "是（场景启动后立即异步加载）"
    if package == "art_battlefield":
        return "进入战斗前", "否"
    if package == "art_units":
        return "进入战斗及兵种按需", "否"
    if package == "art_ui":
        return "战斗 HUD/暂停/结算按需", "否"
    if package == "art_vfx":
        return "战斗/战术/结算按需", "否"
    if package == "audio_bgm":
        return "玩家操作激活音频后", "否"
    return "生成配置", "否"


def main() -> None:
    derivative_payload = json.loads(DERIVATIVES.read_text(encoding="utf-8"))
    derivatives: dict[str, dict] = {}
    for record in derivative_payload["records"]:
        runtime = Path(record["runtime"]).relative_to("assets").as_posix()
        derivatives[runtime] = record
    uuid_map = uuid_asset_map()
    rows: list[dict[str, object]] = []
    for file in sorted(BUILD.rglob("*")):
        if not file.is_file():
            continue
        relative = file.relative_to(BUILD).as_posix()
        match_package = re.match(r"subpackages/([^/]+)/", relative)
        package = match_package.group(1) if match_package else "MAIN"
        uuid_match = re.match(r"([0-9a-f]{8}-[0-9a-f-]{27,})", file.name)
        source_asset = uuid_map.get(uuid_match.group(1), "") if uuid_match else ""
        if not source_asset:
            if relative.startswith("cocos-js/"):
                source_asset = "Cocos Creator 3.8.8 engine"
            elif relative == "assets/main/index.js":
                source_asset = "compiled assets/scripts"
            else:
                source_asset = "generated build file/config"
        derivative = derivatives.get(source_asset)
        original = derivative.get("source", "") if derivative else ""
        original_size = derivative.get("sourceBytes", "") if derivative else ""
        original_dimensions = "x".join(map(str, derivative.get("sourceSize") or [])) if derivative else ""
        runtime_dimensions = "x".join(map(str, derivative.get("runtimeSize") or [])) if derivative else ""
        transparent = derivative.get("transparent", "N/A") if derivative else "N/A"
        scene, first_screen = scene_for(source_asset, package)
        rows.append({
            "package": package,
            "buildFile": relative,
            "buildBytes": file.stat().st_size,
            "sourceAsset": source_asset,
            "highQualitySource": original or "N/A",
            "originalBytes": original_size or "N/A",
            "originalDimensions": original_dimensions or "N/A",
            "runtimeDimensions": runtime_dimensions or "N/A",
            "transparent": transparent,
            "maximumDisplayDimensions": display_size(source_asset, runtime_dimensions),
            "runtimeScene": scene,
            "mustLoadForFirstScreen": first_screen,
        })
    rows.sort(key=lambda row: int(row["buildBytes"]), reverse=True)
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({
        "output": str(OUTPUT),
        "files": len(rows),
        "mappedSourceAssets": sum(row["sourceAsset"] not in (
            "generated build file/config", "Cocos Creator 3.8.8 engine", "compiled assets/scripts"
        ) for row in rows),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
