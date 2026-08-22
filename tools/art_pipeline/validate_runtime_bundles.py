from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


ROOT = Path(__file__).resolve().parents[2]
DERIVATIVES = ROOT / "tmp" / "art07_runtime_derivatives.json"


def expected_grid(path: str) -> tuple[int, int] | None:
    normalized = path.replace("\\", "/")
    if "/characters/" in normalized:
        return (8, 4)
    if "/vfx/" in normalized and "_sheet_" in normalized:
        return (4, 2)
    if "loading_mascot_sheet" in normalized:
        return (8, 1)
    if any(token in normalized for token in (
        "spawn_gate_states", "supply_point_states"
    )):
        return (4, 1)
    return None


def image_psnr(reference: Image.Image, candidate: Image.Image) -> float:
    diff = ImageChops.difference(reference.convert("RGB"), candidate.convert("RGB"))
    stats = ImageStat.Stat(diff)
    mse = sum(value * value for value in stats.rms) / 3
    return math.inf if mse == 0 else 20 * math.log10(255 / math.sqrt(mse))


def main() -> None:
    payload = json.loads(DERIVATIVES.read_text(encoding="utf-8"))
    failures: list[str] = []
    jpeg_psnr: dict[str, float] = {}
    alpha_assets = 0
    grid_assets = 0
    for record in payload["records"]:
        runtime = ROOT / record["runtime"]
        if not runtime.is_file():
            failures.append(f"missing: {record['runtime']}")
            continue
        if runtime.stat().st_size != record["runtimeBytes"]:
            failures.append(f"size changed: {record['runtime']}")
        if record["kind"] not in ("image", "spriteSheet"):
            continue
        try:
            with Image.open(runtime) as image:
                image.load()
                if list(image.size) != record["runtimeSize"]:
                    failures.append(f"dimension mismatch: {record['runtime']} {image.size}")
                if record["transparent"]:
                    alpha_assets += 1
                    if "A" not in image.getbands():
                        failures.append(f"missing alpha channel: {record['runtime']}")
                    elif image.getchannel("A").getbbox() is None:
                        failures.append(f"empty transparent asset: {record['runtime']}")
                elif "A" in image.getbands() and image.getchannel("A").getextrema()[0] < 255:
                    failures.append(f"unexpected transparency: {record['runtime']}")
                grid = expected_grid(record["runtime"])
                if grid:
                    grid_assets += 1
                    if image.width % grid[0] or image.height % grid[1]:
                        failures.append(f"non-integral grid {grid}: {record['runtime']} {image.size}")
                if runtime.suffix.lower() in (".jpg", ".jpeg"):
                    source = ROOT / record["source"]
                    with Image.open(source) as source_image:
                        source_image = source_image.convert("RGB").resize(image.size, Image.Resampling.LANCZOS)
                        score = image_psnr(source_image, image)
                        jpeg_psnr[record["runtime"]] = round(score, 2)
                        if score < 30:
                            failures.append(f"JPEG PSNR below 30 dB: {record['runtime']} {score:.2f}")
        except Exception as error:  # noqa: BLE001 - audit should collect every failure
            failures.append(f"decode failed: {record['runtime']}: {error}")

    result = {
        "batch": payload["batch"],
        "records": len(payload["records"]),
        "alphaAssets": alpha_assets,
        "gridAssets": grid_assets,
        "jpegPsnrDb": jpeg_psnr,
        "failureCount": len(failures),
        "failures": failures,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
