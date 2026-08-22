import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.env.WSB_SHARP_PATH || 'sharp');

const [inputPath, sourceOutputPath, runtimeOutputPath] = process.argv.slice(2);
if (!inputPath || !sourceOutputPath || !runtimeOutputPath) {
    console.error('Usage: node crop_pause_action_button.mjs <input> <source-output> <runtime-output>');
    process.exit(2);
}

await fs.mkdir(path.dirname(sourceOutputPath), { recursive: true });
await fs.mkdir(path.dirname(runtimeOutputPath), { recursive: true });

const trimmed = sharp(inputPath)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } });
const sourceResult = await trimmed
    .clone()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(sourceOutputPath);
if (sourceResult.width !== 347 || sourceResult.height !== 80) {
    throw new Error(`Unexpected compact button bounds: ${sourceResult.width}x${sourceResult.height}.`);
}
const runtimeResult = await trimmed
    .clone()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(runtimeOutputPath);

console.log(JSON.stringify({
    source: { path: sourceOutputPath, width: sourceResult.width, height: sourceResult.height },
    runtime: { path: runtimeOutputPath, width: runtimeResult.width, height: runtimeResult.height },
}, null, 2));
