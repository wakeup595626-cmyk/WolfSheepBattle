import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.env.WSB_SHARP_PATH || 'sharp');

const [
    inputPath,
    sourceOutputPath,
    runtimeOutputPath,
    runtimeWidthArgument = '768',
    runtimeHeightArgument,
] = process.argv.slice(2);

if (!inputPath || !sourceOutputPath || !runtimeOutputPath) {
    console.error('Usage: node extract_generated_card_alpha.mjs <input> <source-output> <runtime-output> [runtime-width] [runtime-height]');
    process.exit(2);
}

const runtimeWidth = Number.parseInt(runtimeWidthArgument, 10);
const runtimeHeight = runtimeHeightArgument === undefined
    ? undefined
    : Number.parseInt(runtimeHeightArgument, 10);
if (!Number.isInteger(runtimeWidth) || runtimeWidth <= 0
    || (runtimeHeight !== undefined && (!Number.isInteger(runtimeHeight) || runtimeHeight <= 0))) {
    throw new Error('Runtime dimensions must be positive integers.');
}

const isConnectedNeutralBackground = (red, green, blue) => {
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    return maximum - minimum <= 18 && maximum >= 145;
};

const decoded = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = decoded.info;
const pixels = decoded.data;
const pixelCount = width * height;
const background = new Uint8Array(pixelCount);
const queue = new Int32Array(pixelCount);
let queueHead = 0;
let queueTail = 0;

const canRemoveAsBackground = (index) => {
    const offset = index * channels;
    return isConnectedNeutralBackground(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
};

const enqueueBackground = (index) => {
    if (background[index] || !canRemoveAsBackground(index)) return;
    background[index] = 1;
    queue[queueTail] = index;
    queueTail += 1;
};

for (let x = 0; x < width; x += 1) {
    enqueueBackground(x);
    enqueueBackground((height - 1) * width + x);
}
for (let y = 0; y < height; y += 1) {
    enqueueBackground(y * width);
    enqueueBackground(y * width + width - 1);
}

while (queueHead < queueTail) {
    const index = queue[queueHead];
    queueHead += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueueBackground(index - 1);
    if (x + 1 < width) enqueueBackground(index + 1);
    if (y > 0) enqueueBackground(index - width);
    if (y + 1 < height) enqueueBackground(index + width);
}

const componentLabels = new Int32Array(pixelCount);
let nextLabel = 0;
let largestLabel = 0;
let largestCount = 0;

for (let start = 0; start < pixelCount; start += 1) {
    if (background[start] || componentLabels[start] !== 0) continue;
    nextLabel += 1;
    queueHead = 0;
    queueTail = 1;
    queue[0] = start;
    componentLabels[start] = nextLabel;
    let componentCount = 0;

    while (queueHead < queueTail) {
        const index = queue[queueHead];
        queueHead += 1;
        componentCount += 1;
        const x = index % width;
        const y = Math.floor(index / width);
        const neighbors = [];
        if (x > 0) neighbors.push(index - 1);
        if (x + 1 < width) neighbors.push(index + 1);
        if (y > 0) neighbors.push(index - width);
        if (y + 1 < height) neighbors.push(index + width);
        for (const neighbor of neighbors) {
            if (background[neighbor] || componentLabels[neighbor] !== 0) continue;
            componentLabels[neighbor] = nextLabel;
            queue[queueTail] = neighbor;
            queueTail += 1;
        }
    }

    if (componentCount > largestCount) {
        largestCount = componentCount;
        largestLabel = nextLabel;
    }
}

let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;
for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * channels;
    if (componentLabels[index] !== largestLabel) {
        pixels[offset] = 0;
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
        pixels[offset + 3] = 0;
        continue;
    }
    pixels[offset + 3] = 255;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
}

if (maxX < minX || maxY < minY) {
    throw new Error('No connected foreground card was detected.');
}

const padding = 8;
const left = Math.max(0, minX - padding);
const top = Math.max(0, minY - padding);
const right = Math.min(width - 1, maxX + padding);
const bottom = Math.min(height - 1, maxY + padding);
const cropWidth = right - left + 1;
const cropHeight = bottom - top + 1;
await fs.mkdir(path.dirname(sourceOutputPath), { recursive: true });
await fs.mkdir(path.dirname(runtimeOutputPath), { recursive: true });

const sourceImage = sharp(pixels, { raw: { width, height, channels } }).extract({
    left,
    top,
    width: cropWidth,
    height: cropHeight,
});

await sourceImage.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(sourceOutputPath);
const resizeOptions = runtimeHeight === undefined
    ? {
        width: runtimeWidth,
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true,
    }
    : {
        width: runtimeWidth,
        height: runtimeHeight,
        fit: 'contain',
        position: 'centre',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true,
    };
const resized = await sourceImage.clone().resize(resizeOptions).raw().toBuffer({ resolveWithObject: true });
for (let offset = 0; offset < resized.data.length; offset += resized.info.channels) {
    if (resized.data[offset + 3] > 3) continue;
    resized.data[offset] = 0;
    resized.data[offset + 1] = 0;
    resized.data[offset + 2] = 0;
    resized.data[offset + 3] = 0;
}
await sharp(resized.data, { raw: resized.info })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(runtimeOutputPath);

const sourceMetadata = await sharp(sourceOutputPath).metadata();
const runtimeMetadata = await sharp(runtimeOutputPath).metadata();
console.log(JSON.stringify({
    input: { width, height, channels },
    crop: { left, top, width: cropWidth, height: cropHeight },
    largestForegroundPixels: largestCount,
    source: {
        path: sourceOutputPath,
        width: sourceMetadata.width,
        height: sourceMetadata.height,
        channels: sourceMetadata.channels,
        space: sourceMetadata.space,
    },
    runtime: {
        path: runtimeOutputPath,
        width: runtimeMetadata.width,
        height: runtimeMetadata.height,
        channels: runtimeMetadata.channels,
        space: runtimeMetadata.space,
    },
}, null, 2));
