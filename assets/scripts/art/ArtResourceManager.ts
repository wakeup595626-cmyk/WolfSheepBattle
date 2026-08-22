import { assetManager, AssetManager, Font, SpriteFrame, Texture2D } from 'cc';
import {
    ART_FULL_ENABLED,
    ART_PILOT_BATCH,
    ART_PILOT_RESOURCES,
    ART_RESOURCE_CONFIG_BY_KEY,
    ArtBundleName,
    ArtPilotResourceKey,
    ArtPilotSheetConfig,
    ArtResourceGroup,
} from './ArtPilotConfig';
import { SpriteSheetSlicer } from './SpriteSheetSlicer';

export interface ArtPilotLoadFailure {
    readonly key: ArtPilotResourceKey;
    readonly resourcePath: string;
    readonly message: string;
}

export interface ArtPilotLoadSummary {
    readonly requested: number;
    readonly loaded: number;
    readonly failed: readonly ArtPilotLoadFailure[];
}

export type ArtLoadProgress = (completed: number, total: number, key: ArtPilotResourceKey) => void;

/** Shared Texture2D/SpriteFrame cache. Every unit and VFX instance reuses these frames. */
export class ArtResourceManager {
    private readonly textures = new Map<ArtPilotResourceKey, Texture2D>();
    private readonly frames = new Map<ArtPilotResourceKey, readonly SpriteFrame[]>();
    private readonly failures = new Map<ArtPilotResourceKey, ArtPilotLoadFailure>();
    private readonly pending = new Map<ArtPilotResourceKey, Promise<void>>();
    private readonly bundles = new Map<ArtBundleName, AssetManager.Bundle>();
    private readonly pendingBundles = new Map<ArtBundleName, Promise<AssetManager.Bundle>>();

    /** Initial staged load. Medium/large/giant, pause, tactic VFX and result art stay on demand. */
    preload(onProgress?: ArtLoadProgress): Promise<ArtPilotLoadSummary> {
        const groups: readonly ArtResourceGroup[] = ART_FULL_ENABLED
            ? ['title']
            : ['battle-core', 'unit-small', 'vfx-core'];
        return this.preloadGroups(groups, onProgress);
    }

    preloadGroups(groups: readonly ArtResourceGroup[], onProgress?: ArtLoadProgress): Promise<ArtPilotLoadSummary> {
        const groupSet = new Set(groups);
        const keys = ART_PILOT_RESOURCES
            .filter((config) => groupSet.has(config.group))
            .map((config) => config.key);
        return this.preloadKeys(keys, onProgress);
    }

    async preloadKeys(keys: readonly ArtPilotResourceKey[], onProgress?: ArtLoadProgress): Promise<ArtPilotLoadSummary> {
        // Array.from is intentional here. Creator 3.8.8's release transform can lower
        // `[...new Set(keys)]` to `[].concat(new Set(keys))`, which leaves the Set as
        // one array item and silently filters every art key out below.
        const uniqueKeys = Array.from(new Set(keys)).filter((key) => ART_RESOURCE_CONFIG_BY_KEY.has(key));
        let completed = 0;
        await Promise.all(uniqueKeys.map(async (key) => {
            await this.ensureKey(key);
            completed += 1;
            onProgress?.(completed, uniqueKeys.length, key);
        }));
        const failed = uniqueKeys
            .map((key) => this.failures.get(key))
            .filter((failure): failure is ArtPilotLoadFailure => failure !== undefined);
        return {
            requested: uniqueKeys.length,
            loaded: uniqueKeys.filter((key) => this.frames.has(key)).length,
            failed,
        };
    }

    getFrames(key: ArtPilotResourceKey): readonly SpriteFrame[] | undefined {
        return this.frames.get(key);
    }

    getFrame(key: ArtPilotResourceKey, index = 0): SpriteFrame | undefined {
        return this.frames.get(key)?.[index];
    }

    hasResource(key: ArtPilotResourceKey): boolean {
        return this.frames.has(key);
    }

    getFailures(): readonly ArtPilotLoadFailure[] {
        return Array.from(this.failures.values());
    }

    retryFailed(onProgress?: ArtLoadProgress): Promise<ArtPilotLoadSummary> {
        const keys = Array.from(this.failures.keys());
        for (const key of keys) {
            this.failures.delete(key);
        }
        return this.preloadKeys(keys, onProgress);
    }

    async loadFont(bundleName: ArtBundleName, resourcePath: string): Promise<Font> {
        const bundle = await this.ensureBundle(bundleName);
        return new Promise<Font>((resolve, reject) => {
            bundle.load(resourcePath, Font, (error, font) => {
                if (error || !font) {
                    reject(error ?? new Error(`未获得 Font：${bundleName}/${resourcePath}`));
                    return;
                }
                resolve(font);
            });
        });
    }

    private ensureKey(key: ArtPilotResourceKey): Promise<void> {
        if (this.frames.has(key) || this.failures.has(key)) {
            return Promise.resolve();
        }
        const existing = this.pending.get(key);
        if (existing) {
            return existing;
        }
        const config = ART_RESOURCE_CONFIG_BY_KEY.get(key);
        if (!config) {
            return Promise.resolve();
        }
        const request = this.loadOne(config).then(
            () => { this.pending.delete(key); },
            (error) => {
                this.pending.delete(key);
                throw error;
            },
        );
        this.pending.set(key, request);
        return request;
    }

    private async loadOne(config: ArtPilotSheetConfig): Promise<void> {
        try {
            const texture = await this.loadTexture(config);
            const frames = SpriteSheetSlicer.slice(texture, config);
            this.textures.set(config.key, texture);
            this.frames.set(config.key, frames);
            this.failures.delete(config.key);
        } catch (error) {
            const failure: ArtPilotLoadFailure = {
                key: config.key,
                resourcePath: `${config.bundleName}:${config.resourcePath}/texture`,
                message: error instanceof Error ? error.message : String(error),
            };
            this.failures.set(config.key, failure);
            console.error(`[Art:${ART_PILOT_BATCH}] 资源加载失败，保留该项 Graphics 回退。`, failure);
        }
    }

    private async loadTexture(config: ArtPilotSheetConfig): Promise<Texture2D> {
        const bundle = await this.ensureBundle(config.bundleName);
        // Creator 3.8.8 imports PNG/JPEG Texture2D sub-assets at the /texture suffix.
        const importedTexturePath = `${config.resourcePath}/texture`;
        return new Promise<Texture2D>((resolve, reject) => {
            bundle.load(importedTexturePath, Texture2D, (error, texture) => {
                if (error || !texture) {
                    reject(error ?? new Error(`未获得 Texture2D：${config.bundleName}/${importedTexturePath}`));
                    return;
                }
                resolve(texture);
            });
        });
    }

    private ensureBundle(bundleName: ArtBundleName): Promise<AssetManager.Bundle> {
        const cached = this.bundles.get(bundleName) ?? assetManager.getBundle(bundleName);
        if (cached) {
            this.bundles.set(bundleName, cached);
            return Promise.resolve(cached);
        }
        const pending = this.pendingBundles.get(bundleName);
        if (pending) {
            return pending;
        }
        const request = new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle(bundleName, (error, bundle) => {
                this.pendingBundles.delete(bundleName);
                if (error || !bundle) {
                    reject(error ?? new Error(`未获得 Asset Bundle：${bundleName}`));
                    return;
                }
                this.bundles.set(bundleName, bundle);
                resolve(bundle);
            });
        });
        this.pendingBundles.set(bundleName, request);
        return request;
    }
}
