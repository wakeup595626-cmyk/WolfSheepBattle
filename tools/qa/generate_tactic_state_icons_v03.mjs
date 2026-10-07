import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const projectRoot = process.argv[2];
if (!projectRoot) throw new Error('project root is required');

const sharp = (await import(
    process.env.CODEX_SHARP_MODULE
        ? pathToFileURL(process.env.CODEX_SHARP_MODULE).href
        : 'sharp'
)).default;

const sourceDir = path.join(projectRoot, 'art_source', 'ui', 'tactic_cards', 'status_icons');
const runtimeDir = path.join(projectRoot, 'assets', 'bundles', 'art_ui', 'ui', 'tactic_cards', 'status_icons');
await fs.mkdir(runtimeDir, { recursive: true });

const iconNames = ['ready', 'clock', 'lock', 'blocked', 'once'];
for (const name of iconNames) {
    const svgPath = path.join(sourceDir, `tactic_state_${name}_v03.svg`);
    const svg = await fs.readFile(svgPath);
    await sharp(svg).resize(128, 128).png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(path.join(sourceDir, `tactic_state_${name}_v03.png`));
    await sharp(svg).resize(64, 64).png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(path.join(runtimeDir, `tactic_state_${name}_runtime_v03.png`));
}
