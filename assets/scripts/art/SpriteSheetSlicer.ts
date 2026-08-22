import { Rect, Size, SpriteFrame, Texture2D, Vec2 } from 'cc';
import { ArtPilotSheetConfig } from './ArtPilotConfig';

/**
 * Runtime row-major slicer for imported Texture2D resources.
 * Cocos SpriteFrame rects use a top-left texture origin, matching PNG row order.
 */
export class SpriteSheetSlicer {
    private static readonly cache = new Map<string, readonly SpriteFrame[]>();

    static slice(texture: Texture2D, config: ArtPilotSheetConfig): readonly SpriteFrame[] {
        const cacheKey = `${texture.uuid}:${config.columns}x${config.rows}:${config.cellWidth}x${config.cellHeight}:${config.frameCount}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        if (texture.width !== config.width || texture.height !== config.height) {
            throw new Error(
                `[ArtPilot] ${config.key} 纹理尺寸错误：实际 ${texture.width}x${texture.height}，预期 ${config.width}x${config.height}`,
            );
        }
        if (config.frameCount > config.columns * config.rows) {
            throw new Error(`[ArtPilot] ${config.key} 有效帧数超过图集容量。`);
        }

        const frames: SpriteFrame[] = [];
        for (let index = 0; index < config.frameCount; index += 1) {
            const column = index % config.columns;
            const rowFromTop = Math.floor(index / config.columns);
            const frame = new SpriteFrame();
            frame.name = `${config.key}-${index}`;
            frame.reset({
                texture,
                rect: new Rect(
                    column * config.cellWidth,
                    rowFromTop * config.cellHeight,
                    config.cellWidth,
                    config.cellHeight,
                ),
                originalSize: new Size(config.cellWidth, config.cellHeight),
                offset: new Vec2(0, 0),
                isRotate: false,
            }, true);
            frames.push(frame);
        }

        this.validateRepresentativeFrames(config, frames);
        const readonlyFrames: readonly SpriteFrame[] = frames;
        this.cache.set(cacheKey, readonlyFrames);
        return readonlyFrames;
    }

    private static validateRepresentativeFrames(
        config: ArtPilotSheetConfig,
        frames: readonly SpriteFrame[],
    ): void {
        const indices = config.frameCount === 23 ? [0, 7, 8, 15, 16, 22] : [0, config.frameCount - 1];
        for (const index of indices) {
            const frame = frames[index];
            if (!frame) {
                throw new Error(`[ArtPilot] ${config.key} 缺少验证帧 ${index}。`);
            }
            const expectedColumn = index % config.columns;
            const expectedRow = Math.floor(index / config.columns);
            const rect = frame.rect;
            if (rect.x !== expectedColumn * config.cellWidth
                || rect.y !== expectedRow * config.cellHeight
                || rect.width !== config.cellWidth
                || rect.height !== config.cellHeight) {
                throw new Error(`[ArtPilot] ${config.key} 第 ${index} 帧切片坐标错误。`);
            }
        }
    }
}

