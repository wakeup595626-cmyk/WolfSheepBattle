import {
    _decorator,
    AudioClip,
    AudioSource,
    assetManager,
    AssetManager,
    Component,
    director,
    game,
    Game,
    input,
    Input,
    Node,
    sys,
} from 'cc';

const { ccclass } = _decorator;

export type BgmTrackId = 'cheerful_lighthearted' | 'cyberwave_upbeat';
export type BgmContext = 'menu' | 'battle';

export interface BgmTrackConfig {
    readonly id: BgmTrackId;
    readonly displayName: string;
    readonly subtitle: string;
    readonly auxiliaryName?: string;
    readonly bundleName: 'audio_bgm';
    readonly resourcePath: string;
    readonly volumeGain: number;
}

export type SfxName =
    | 'ui_click'
    | 'deploy'
    | 'deploy_failed'
    | 'unit_hit'
    | 'unit_death'
    | 'base_hit'
    | 'tactic_sprint'
    | 'tactic_heal'
    | 'tactic_shock'
    | 'victory'
    | 'defeat';

interface SfxSlot {
    readonly source: AudioSource;
    name: SfxName | undefined;
    priority: number;
    expiresAt: number;
}

interface StoredAudioSettingsV1 {
    readonly schemaVersion?: number;
    readonly selectedBgmId?: string;
    readonly musicVolume?: number;
    readonly sfxVolume?: number;
    readonly musicMuted?: boolean;
    readonly sfxMuted?: boolean;
    readonly lastNonZeroMusicVolume?: number;
    readonly lastNonZeroSfxVolume?: number;
    readonly userAdjustedMusicVolume?: boolean;
    readonly userAdjustedSfxVolume?: boolean;
    readonly userSelectedBgm?: boolean;
    readonly legacyZeroMigrationApplied?: boolean;
}

type BgmLoadCallback = (clip: AudioClip | undefined) => void;
type BgmFadeMode = 'none' | 'fadeOut' | 'fadeIn' | 'finalFadeOut';

const AUDIO_SETTINGS_KEY = 'wolf-sheep-battle.audio-settings.v1';
const AUDIO_SETTINGS_SCHEMA_VERSION = 2;
const MUSIC_ENABLED_KEY = 'wolf-sheep-battle.audio.music-enabled';
const SFX_ENABLED_KEY = 'wolf-sheep-battle.audio.sfx-enabled';
const MUSIC_VOLUME_KEY = 'wolf-sheep-battle.audio.music-volume';
const SFX_VOLUME_KEY = 'wolf-sheep-battle.audio.sfx-volume';
const MUSIC_LAST_VOLUME_KEY = 'wolf-sheep-battle.audio.music-last-volume';
const SFX_LAST_VOLUME_KEY = 'wolf-sheep-battle.audio.sfx-last-volume';
const DEFAULT_MUSIC_VOLUME = 0.8;
const DEFAULT_SFX_VOLUME = 0.8;
const PAUSED_MUSIC_MULTIPLIER = 0.35;
const DEFAULT_BGM_TRACK_ID: BgmTrackId = 'cheerful_lighthearted';
const DEFAULT_BGM_CROSS_FADE_SECONDS = 0.6;
const BGM_LOAD_TIMEOUT_SECONDS = 12;
const BGM_PLAYBACK_CHECK_SECONDS = 1.25;
const SFX_POOL_SIZE = 6;

const BGM_TRACKS: readonly BgmTrackConfig[] = [
    {
        id: 'cheerful_lighthearted',
        displayName: '轻松欢快',
        subtitle: '温暖、治愈、轻松的草原旋律',
        auxiliaryName: 'Ear0 · 欢乐',
        bundleName: 'audio_bgm',
        resourcePath: 'bgm/bgm_cheerful_lighthearted_runtime_v01',
        volumeGain: 1,
    },
    {
        id: 'cyberwave_upbeat',
        displayName: '热血对战',
        subtitle: '节奏明快、适合激烈对抗',
        auxiliaryName: 'Pixabay · Fun Game',
        bundleName: 'audio_bgm',
        resourcePath: 'bgm/bgm_cyberwave_upbeat_runtime_v01',
        volumeGain: 1,
    },
];

const SFX_RESOURCE_PATHS: Readonly<Record<SfxName, string>> = {
    ui_click: 'ui_click',
    deploy: 'deploy',
    deploy_failed: 'deploy_failed',
    unit_hit: 'unit_hit',
    unit_death: 'unit_death',
    base_hit: 'base_hit',
    tactic_sprint: 'tactic_sprint',
    tactic_heal: 'tactic_heal',
    tactic_shock: 'tactic_shock',
    victory: 'victory',
    defeat: 'defeat',
};

// Existing SFX assets predate the bundle layout. These UUIDs remain stable.
// BGM is loaded from the dedicated audio_bgm Asset Bundle.
const SFX_ASSET_UUIDS: Readonly<Record<SfxName, string>> = {
    ui_click: '2a5d79af-67a6-467f-a3e7-93431399189d',
    deploy: '9ad52951-0b8c-46a1-a26e-9c316cf1fc10',
    deploy_failed: '3d4a04d2-e588-4542-8674-05d1d6ee095a',
    unit_hit: '0698324c-faed-4cf2-8d5f-52d2323b26ab',
    unit_death: 'a052e719-2b25-4d4d-9cbf-2d5b8b1ed883',
    base_hit: '1e82db60-8843-43f0-9a26-87fa74dffcee',
    tactic_sprint: 'c5f60d65-30e8-4e92-9b41-f3a1cd49f411',
    tactic_heal: '7e9a2448-03b1-4c13-800e-01e48a733616',
    tactic_shock: '03da15c0-5c38-4459-92ac-6639388bc496',
    victory: 'b50da043-074c-4aaf-ab4c-8585d5e87ee0',
    defeat: '486fa023-8014-4884-a395-420c9f3da71a',
};

const SFX_PRIORITY: Readonly<Record<SfxName, number>> = {
    ui_click: 1,
    deploy: 2,
    deploy_failed: 2,
    unit_hit: 1,
    unit_death: 2,
    base_hit: 3,
    tactic_sprint: 3,
    tactic_heal: 3,
    tactic_shock: 4,
    victory: 5,
    defeat: 5,
};

const SFX_MIN_INTERVAL_SECONDS: Readonly<Partial<Record<SfxName, number>>> = {
    ui_click: 0.04,
    deploy: 0.04,
    deploy_failed: 0.08,
    unit_hit: 0.1,
    unit_death: 0.08,
    base_hit: 0.08,
};

const UI_SFX = new Set<SfxName>(['ui_click']);

@ccclass('AudioManager')
export class AudioManager extends Component {
    private static instance?: AudioManager;

    static getOrCreate(): AudioManager {
        const existing = AudioManager.instance;
        if (existing?.node?.isValid) {
            return existing;
        }
        const scene = director.getScene();
        if (!scene) {
            throw new Error('[WolfSheepBattle][Audio] Cannot create the persistent audio root before a scene is loaded.');
        }
        const root = new Node('GlobalAudioManager');
        scene.addChild(root);
        director.addPersistRootNode(root);
        const manager = root.addComponent(AudioManager);
        AudioManager.instance = manager;
        return manager;
    }

    private readonly clipCache = new Map<string, AudioClip>();
    private readonly loadingSfxClips = new Set<SfxName>();
    private readonly loadingBgmCallbacks = new Map<BgmTrackId, BgmLoadCallback[]>();
    private readonly loadingBgmElapsed = new Map<BgmTrackId, number>();
    private readonly pendingSfx = new Set<SfxName>();
    private readonly sfxSlots: SfxSlot[] = [];
    private readonly lastSfxTimes = new Map<SfxName, number>();
    private readonly missingClipWarnings = new Set<string>();
    private readonly invalidBgmWarnings = new Set<string>();
    private readonly failedBgmTracks = new Set<BgmTrackId>();
    private readonly bgmPlaybackStartedListeners = new Set<() => void>();
    private bgmBundle?: AssetManager.Bundle;
    private pendingBgmBundle?: Promise<AssetManager.Bundle>;

    private bgmSource!: AudioSource;
    private selectedBgmId: BgmTrackId = DEFAULT_BGM_TRACK_ID;
    private previewBgmId: BgmTrackId | undefined;
    private desiredBgm: BgmTrackId | undefined;
    private currentBgm: BgmTrackId | undefined;
    private bgmRequestToken = 0;
    private musicEnabled = true;
    private sfxEnabled = true;
    private musicVolume = DEFAULT_MUSIC_VOLUME;
    private sfxVolume = DEFAULT_SFX_VOLUME;
    private lastNonZeroMusicVolume = DEFAULT_MUSIC_VOLUME;
    private lastNonZeroSfxVolume = DEFAULT_SFX_VOLUME;
    private userAdjustedMusicVolume = false;
    private userAdjustedSfxVolume = false;
    private userSelectedBgm = false;
    private legacyZeroMigrationApplied = false;
    private audioActivated = false;
    private battlePaused = false;
    private lifecyclePaused = false;
    private bgmFadeMode: BgmFadeMode = 'none';
    private bgmFadeDuration = 0;
    private bgmFadeElapsed = 0;
    private bgmFadeStartVolume = 0;
    private bgmFadeTargetVolume = 0;
    private bgmFadeCompletion: (() => void) | undefined;
    private bgmPlaybackCheckRemaining = 0;
    private bgmPlaybackCheckId: BgmTrackId | undefined;
    private bgmPlaybackCheckToken = 0;
    private initialized = false;
    private userGestureListenersAttached = false;
    private bgmPlaybackConfirmed = false;
    private playbackBlockedWarningShown = false;
    private allBgmUnavailableWarningShown = false;

    onLoad(): void {
        const existing = AudioManager.instance;
        if (existing && existing !== this && existing.node.isValid) {
            this.node.destroy();
            return;
        }
        AudioManager.instance = this;
        if (this.node.parent === director.getScene() && !director.isPersistRootNode(this.node)) {
            director.addPersistRootNode(this.node);
        }
        this.initialized = true;
        this.loadSettings();
        this.desiredBgm = this.selectedBgmId;
        this.createAudioSources();
        this.installUserGestureListeners();
        game.on(Game.EVENT_HIDE, this.handleGameHide, this);
        game.on(Game.EVENT_SHOW, this.handleGameShow, this);
    }

    onDestroy(): void {
        if (!this.initialized) {
            return;
        }
        this.initialized = false;
        this.removeUserGestureListeners();
        game.off(Game.EVENT_HIDE, this.handleGameHide, this);
        game.off(Game.EVENT_SHOW, this.handleGameShow, this);
        this.bgmRequestToken += 1;
        this.cancelBgmFade();
        this.stopAllSfx();
        if (this.bgmSource?.isValid) {
            this.bgmSource.stop();
            this.bgmSource.clip = null;
        }
        this.clipCache.clear();
        this.loadingSfxClips.clear();
        this.loadingBgmCallbacks.clear();
        this.loadingBgmElapsed.clear();
        this.pendingSfx.clear();
        this.bgmPlaybackStartedListeners.clear();
        if (AudioManager.instance === this) {
            AudioManager.instance = undefined;
        }
    }

    update(deltaTime: number): void {
        const safeDeltaTime = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;
        this.updateBgmLoadTimeouts(safeDeltaTime);
        if (this.bgmFadeDuration > 0 && this.bgmSource?.isValid) {
            this.bgmFadeElapsed = Math.min(this.bgmFadeDuration, this.bgmFadeElapsed + safeDeltaTime);
            const progress = this.bgmFadeElapsed / this.bgmFadeDuration;
            this.bgmSource.volume = this.bgmFadeStartVolume
                + (this.bgmFadeTargetVolume - this.bgmFadeStartVolume) * progress;
            if (progress >= 1) {
                const completion = this.bgmFadeCompletion;
                this.bgmFadeMode = 'none';
                this.bgmFadeDuration = 0;
                this.bgmFadeElapsed = 0;
                this.bgmFadeCompletion = undefined;
                completion?.();
            }
        }
        this.updateBgmPlaybackCheck(safeDeltaTime);
    }

    registerClips(clips: readonly AudioClip[]): void {
        for (const clip of clips) {
            const name = clip.name as SfxName;
            if (Object.prototype.hasOwnProperty.call(SFX_RESOURCE_PATHS, name)) {
                this.clipCache.set(name, clip);
                this.missingClipWarnings.delete(name);
            }
        }
        this.preloadMissingSfxClips();
    }

    activateAudio(): void {
        this.unlockAudio();
    }

    unlockAudio(): boolean {
        const wasActivated = this.audioActivated;
        this.audioActivated = true;
        this.removeUserGestureListeners();
        if (wasActivated && this.bgmSource?.playing) {
            return false;
        }
        this.resumeBgm();
        return !wasActivated;
    }

    isAudioActivated(): boolean {
        return this.audioActivated;
    }

    isBgmPlaybackConfirmed(): boolean {
        return this.bgmPlaybackConfirmed;
    }

    onBgmPlaybackStarted(listener: () => void): void {
        this.bgmPlaybackStartedListeners.add(listener);
        if (this.bgmPlaybackConfirmed) {
            listener();
        }
    }

    offBgmPlaybackStarted(listener: () => void): void {
        this.bgmPlaybackStartedListeners.delete(listener);
    }

    preloadMenuBgm(): void {
        this.preloadBgm(this.selectedBgmId);
    }

    preloadBattleBgm(): void {
        for (const track of BGM_TRACKS) this.preloadBgm(track.id);
    }

    requestMenuBgm(): void {
        this.requestSelectedBgm();
    }

    requestBattleBgm(): void {
        this.requestSelectedBgm();
    }

    getRequestedBgmTrack(): BgmTrackConfig | undefined {
        return this.getBgmTrack(this.selectedBgmId);
    }

    getAvailableBgmTracks(): readonly BgmTrackConfig[] {
        return BGM_TRACKS;
    }

    getSelectedBgmId(): BgmTrackId {
        return this.selectedBgmId;
    }

    selectBgmTrack(id: string): boolean {
        const track = this.getBgmTrack(id);
        if (!track) {
            this.warnInvalidBgmId(id, 'selection');
            this.selectedBgmId = DEFAULT_BGM_TRACK_ID;
            this.previewBgmId = undefined;
            this.saveSelectedBgm();
            if (this.audioActivated) {
                this.transitionToBgm(this.selectedBgmId, DEFAULT_BGM_CROSS_FADE_SECONDS);
            }
            return false;
        }
        this.selectedBgmId = track.id;
        this.userSelectedBgm = true;
        this.previewBgmId = undefined;
        this.saveSelectedBgm();
        if (this.audioActivated) {
            this.transitionToBgm(track.id, DEFAULT_BGM_CROSS_FADE_SECONDS);
        } else {
            this.desiredBgm = track.id;
        }
        return true;
    }

    playSelectedBgm(): void {
        this.previewBgmId = undefined;
        this.transitionToBgm(this.selectedBgmId, DEFAULT_BGM_CROSS_FADE_SECONDS);
    }

    playBgm(id: BgmTrackId): void {
        this.transitionToBgm(id, DEFAULT_BGM_CROSS_FADE_SECONDS);
    }

    previewBgmTrack(id: string): boolean {
        const track = this.getBgmTrack(id);
        if (!track) {
            this.warnInvalidBgmId(id, 'preview');
            return false;
        }
        this.previewBgmId = track.id;
        this.transitionToBgm(track.id, 0.45);
        return true;
    }

    stopBgmPreview(): void {
        if (!this.previewBgmId) {
            return;
        }
        this.previewBgmId = undefined;
        this.transitionToBgm(this.selectedBgmId, 0.45);
    }

    crossFadeToBgm(id: string, duration = DEFAULT_BGM_CROSS_FADE_SECONDS): boolean {
        const track = this.getBgmTrack(id);
        if (!track) {
            this.warnInvalidBgmId(id, 'cross-fade');
            return false;
        }
        this.transitionToBgm(track.id, Math.max(0, duration));
        return true;
    }

    saveSelectedBgm(): void {
        this.saveAudioSettings();
    }

    loadSelectedBgm(): BgmTrackId {
        const stored = this.readStoredAudioSettings();
        const storedId = stored?.selectedBgmId;
        if (storedId && this.getBgmTrack(storedId)) {
            this.selectedBgmId = storedId as BgmTrackId;
        } else if (storedId) {
            this.warnInvalidBgmId(storedId, 'stored-settings');
            this.selectedBgmId = DEFAULT_BGM_TRACK_ID;
            this.saveAudioSettings();
        }
        this.desiredBgm = this.selectedBgmId;
        return this.selectedBgmId;
    }

    stopBgm(): void {
        this.bgmRequestToken += 1;
        this.cancelBgmFade();
        this.previewBgmId = undefined;
        this.desiredBgm = undefined;
        this.stopBgmPlayback();
    }

    fadeOutBgm(duration = 0.4): void {
        this.bgmRequestToken += 1;
        this.previewBgmId = undefined;
        this.desiredBgm = undefined;
        this.cancelBgmFade();
        if (!this.bgmSource?.isValid || !this.bgmSource.playing || duration <= 0) {
            this.stopBgmPlayback();
            return;
        }
        this.beginBgmFade(0, duration, 'finalFadeOut', () => {
            this.stopBgmPlayback();
        });
    }

    pauseBgm(): void {
        if (this.bgmSource?.isValid && this.bgmSource.playing) {
            this.bgmSource.pause();
        }
    }

    resumeBgm(): void {
        if ((!this.audioActivated && !this.bgmPlaybackConfirmed)
            || !this.musicEnabled || this.lifecyclePaused) {
            return;
        }
        const desired = this.previewBgmId ?? this.desiredBgm;
        if (!desired) {
            return;
        }
        this.desiredBgm = desired;
        if (this.currentBgm === desired && this.bgmSource.clip) {
            if (this.bgmFadeMode === 'fadeIn') {
                this.bgmFadeTargetVolume = this.getEffectiveMusicVolume(desired);
            } else if (this.bgmFadeMode === 'none') {
                this.refreshBgmVolume();
            }
            if (!this.bgmSource.playing) {
                this.bgmSource.play();
                this.beginBgmPlaybackCheck(desired, this.bgmRequestToken);
            } else {
                this.confirmBgmPlayback();
            }
            return;
        }
        this.transitionToBgm(desired, DEFAULT_BGM_CROSS_FADE_SECONDS);
    }

    playSfx(name: SfxName): void {
        if (!this.audioActivated || !this.sfxEnabled || this.lifecyclePaused
            || (this.battlePaused && !UI_SFX.has(name))) {
            return;
        }
        const now = this.getNowSeconds();
        const minimumInterval = SFX_MIN_INTERVAL_SECONDS[name] ?? 0;
        if (now - (this.lastSfxTimes.get(name) ?? Number.NEGATIVE_INFINITY) < minimumInterval) {
            return;
        }
        const cached = this.clipCache.get(name);
        if (cached) {
            this.lastSfxTimes.set(name, now);
            this.playLoadedSfx(name, cached, now);
            return;
        }
        this.pendingSfx.add(name);
        this.preloadSfxClip(name);
    }

    setMusicEnabled(enabled: boolean): void {
        this.setMusicVolume(enabled ? this.lastNonZeroMusicVolume : 0);
    }

    setSfxEnabled(enabled: boolean): void {
        this.setSfxVolume(enabled ? this.lastNonZeroSfxVolume : 0);
    }

    isMusicEnabled(): boolean {
        return this.musicEnabled;
    }

    isSfxEnabled(): boolean {
        return this.sfxEnabled;
    }

    getMusicVolume(): number {
        return this.musicVolume;
    }

    getSfxVolume(): number {
        return this.sfxVolume;
    }

    toggleMusicMute(): void {
        this.setMusicEnabled(!this.musicEnabled);
    }

    toggleSfxMute(): void {
        this.setSfxEnabled(!this.sfxEnabled);
    }

    setMusicVolume(value: number): void {
        const wasEnabled = this.musicEnabled;
        this.userAdjustedMusicVolume = true;
        this.musicVolume = this.clampVolume(value);
        this.musicEnabled = this.musicVolume > 0;
        if (this.musicEnabled) {
            this.lastNonZeroMusicVolume = this.musicVolume;
        }
        this.saveAudioSettings();
        if (!this.bgmSource?.isValid) {
            return;
        }
        if (!this.musicEnabled) {
            this.cancelBgmFade();
            this.bgmSource.volume = 0;
            this.pauseBgm();
            return;
        }
        if (this.bgmFadeMode === 'fadeIn') {
            this.bgmFadeTargetVolume = this.getEffectiveMusicVolume(this.currentBgm);
        } else if (this.bgmFadeMode === 'none') {
            this.refreshBgmVolume();
        }
        if (!wasEnabled) {
            this.resumeBgm();
        }
    }

    setSfxVolume(value: number): void {
        this.userAdjustedSfxVolume = true;
        this.sfxVolume = this.clampVolume(value);
        this.sfxEnabled = this.sfxVolume > 0;
        if (this.sfxEnabled) {
            this.lastNonZeroSfxVolume = this.sfxVolume;
        }
        this.saveAudioSettings();
        for (const slot of this.sfxSlots) {
            slot.source.volume = this.toEffectiveVolume(this.sfxVolume);
        }
        if (!this.sfxEnabled) {
            this.stopAllSfx();
        }
    }

    setBattlePaused(paused: boolean): void {
        this.battlePaused = paused;
        if (paused) {
            this.stopBattleSfx();
        } else {
            this.resumeBgm();
        }
        this.refreshBgmVolume();
    }

    stopBattleSfx(): void {
        for (const slot of this.sfxSlots) {
            if (slot.name && !UI_SFX.has(slot.name)) {
                this.stopSlot(slot);
            }
        }
    }

    stopAllSfx(): void {
        for (const slot of this.sfxSlots) {
            this.stopSlot(slot);
        }
    }

    private createAudioSources(): void {
        const bgmNode = new Node('BgmAudioSource');
        bgmNode.setParent(this.node);
        this.bgmSource = bgmNode.addComponent(AudioSource);
        this.bgmSource.loop = true;
        this.bgmSource.playOnAwake = false;
        this.bgmSource.volume = this.getEffectiveMusicVolume(this.selectedBgmId);

        for (let index = 0; index < SFX_POOL_SIZE; index += 1) {
            const sourceNode = new Node(`SfxAudioSource${index + 1}`);
            sourceNode.setParent(this.node);
            const source = sourceNode.addComponent(AudioSource);
            source.loop = false;
            source.playOnAwake = false;
            source.volume = this.toEffectiveVolume(this.sfxVolume);
            this.sfxSlots.push({
                source,
                name: undefined,
                priority: 0,
                expiresAt: 0,
            });
        }
    }

    private preloadBgm(id: BgmTrackId): void {
        this.loadBgmClip(id, () => {
            // Loading and decoding are intentionally separated from playback so
            // WeChat can wait for the first user gesture without creating a new player.
        });
    }

    private requestSelectedBgm(): void {
        const selected = this.selectedBgmId;
        const wasPreviewing = this.previewBgmId !== undefined;
        this.previewBgmId = undefined;
        if (wasPreviewing || this.desiredBgm !== selected) {
            this.transitionToBgm(selected, DEFAULT_BGM_CROSS_FADE_SECONDS);
            return;
        }

        this.preloadBgm(selected);
        if (!this.musicEnabled || this.lifecyclePaused || this.bgmFadeMode !== 'none') {
            return;
        }
        if (this.currentBgm === selected && this.bgmSource?.clip && this.bgmSource.playing) {
            this.confirmBgmPlayback();
            return;
        }

        // Establish a real playback attempt during loading when the platform permits it.
        // If WeChat blocks autoplay, the existing gesture listener keeps the same intent
        // and retries only after a genuine player interaction.
        this.transitionToBgm(selected, DEFAULT_BGM_CROSS_FADE_SECONDS);
    }

    private transitionToBgm(id: BgmTrackId, duration: number): void {
        this.desiredBgm = id;
        const requestToken = ++this.bgmRequestToken;
        this.cancelBgmFade();
        this.cancelBgmPlaybackCheck();
        if (!this.musicEnabled || this.lifecyclePaused) {
            return;
        }
        this.loadBgmClip(id, (clip) => {
            if (requestToken !== this.bgmRequestToken || this.desiredBgm !== id) {
                return;
            }
            if (!clip) {
                this.handleBgmLoadFailure(id, requestToken);
                return;
            }
            if (!this.musicEnabled || this.lifecyclePaused) {
                return;
            }
            this.playLoadedBgm(id, clip, duration, requestToken);
        });
    }

    private loadBgmClip(id: BgmTrackId, callback: BgmLoadCallback): void {
        const cacheKey = this.getBgmCacheKey(id);
        const cached = this.clipCache.get(cacheKey);
        if (cached) {
            callback(cached);
            return;
        }
        const callbacks = this.loadingBgmCallbacks.get(id);
        if (callbacks) {
            callbacks.push(callback);
            return;
        }
        this.loadingBgmCallbacks.set(id, [callback]);
        this.loadingBgmElapsed.set(id, 0);
        const track = this.getBgmTrack(id)!;
        void this.ensureBgmBundle().then((bundle) => new Promise<AudioClip>((resolve, reject) => {
            bundle.load(track.resourcePath, AudioClip, (error: Error | null, clip: AudioClip) => {
                if (error || !clip) {
                    reject(error ?? new Error(`BGM asset is empty: ${track.resourcePath}`));
                    return;
                }
                resolve(clip);
            });
        })).then((clip) => {
            const waitingCallbacks = this.loadingBgmCallbacks.get(id) ?? [];
            this.loadingBgmCallbacks.delete(id);
            this.loadingBgmElapsed.delete(id);
            this.clipCache.set(cacheKey, clip);
            this.missingClipWarnings.delete(cacheKey);
            for (const waiting of waitingCallbacks) {
                waiting(clip);
            }
        }).catch((error: unknown) => {
            const waitingCallbacks = this.loadingBgmCallbacks.get(id) ?? [];
            this.loadingBgmCallbacks.delete(id);
            this.loadingBgmElapsed.delete(id);
            this.warnMissingBgm(track, error instanceof Error ? error : new Error(`${error}`));
            for (const waiting of waitingCallbacks) {
                waiting(undefined);
            }
        });
    }

    private ensureBgmBundle(): Promise<AssetManager.Bundle> {
        const cached = this.bgmBundle ?? assetManager.getBundle('audio_bgm');
        if (cached) {
            this.bgmBundle = cached;
            return Promise.resolve(cached);
        }
        if (this.pendingBgmBundle) {
            return this.pendingBgmBundle;
        }
        this.pendingBgmBundle = new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle('audio_bgm', (error, bundle) => {
                this.pendingBgmBundle = undefined;
                if (error || !bundle) {
                    reject(error ?? new Error('BGM Asset Bundle is empty: audio_bgm'));
                    return;
                }
                this.bgmBundle = bundle;
                resolve(bundle);
            });
        });
        return this.pendingBgmBundle;
    }

    private playLoadedBgm(id: BgmTrackId, clip: AudioClip, duration: number, requestToken: number): void {
        this.failedBgmTracks.delete(id);
        if (this.currentBgm === id && this.bgmSource.clip === clip) {
            this.bgmSource.loop = true;
            this.refreshBgmVolume();
            if (!this.bgmSource.playing) {
                this.bgmSource.play();
                this.beginBgmPlaybackCheck(id, requestToken);
            } else {
                this.confirmBgmPlayback();
            }
            return;
        }
        const halfDuration = Math.max(0, duration) / 2;
        const replaceAndFadeIn = (): void => {
            if (requestToken !== this.bgmRequestToken || this.desiredBgm !== id
                || !this.musicEnabled || this.lifecyclePaused) {
                return;
            }
            this.bgmSource.stop();
            this.bgmSource.clip = clip;
            this.bgmSource.loop = true;
            this.bgmSource.volume = 0;
            this.currentBgm = id;
            this.bgmSource.play();
            this.beginBgmPlaybackCheck(id, requestToken);
            this.beginBgmFade(
                this.getEffectiveMusicVolume(id),
                halfDuration,
                'fadeIn',
            );
        };
        if (this.bgmSource.playing && this.bgmSource.clip && halfDuration > 0) {
            this.beginBgmFade(0, halfDuration, 'fadeOut', replaceAndFadeIn);
        } else {
            replaceAndFadeIn();
        }
    }

    private handleBgmLoadFailure(id: BgmTrackId, requestToken: number): void {
        if (requestToken !== this.bgmRequestToken) {
            return;
        }
        this.failedBgmTracks.add(id);
        const fallback = BGM_TRACKS.find((track) => !this.failedBgmTracks.has(track.id));
        if (fallback) {
            this.selectedBgmId = fallback.id;
            this.previewBgmId = undefined;
            this.saveSelectedBgm();
            this.transitionToBgm(fallback.id, 0.6);
            return;
        }
        this.desiredBgm = undefined;
        this.stopBgmPlayback();
        if (!this.allBgmUnavailableWarningShown) {
            this.allBgmUnavailableWarningShown = true;
            console.warn('[WolfSheepBattle][Audio] Both BGM tracks are unavailable; continuing silently.');
        }
    }

    private beginBgmFade(
        targetVolume: number,
        duration: number,
        mode: BgmFadeMode,
        completion?: () => void,
    ): void {
        this.cancelBgmFade();
        const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
        const safeTarget = this.clampVolume(targetVolume);
        if (safeDuration <= 0) {
            this.bgmSource.volume = safeTarget;
            completion?.();
            return;
        }
        this.bgmFadeMode = mode;
        this.bgmFadeDuration = safeDuration;
        this.bgmFadeElapsed = 0;
        this.bgmFadeStartVolume = this.bgmSource.volume;
        this.bgmFadeTargetVolume = safeTarget;
        this.bgmFadeCompletion = completion;
    }

    private stopBgmPlayback(): void {
        this.cancelBgmPlaybackCheck();
        if (this.bgmSource?.isValid) {
            this.bgmSource.stop();
            this.bgmSource.clip = null;
            this.bgmSource.volume = 0;
        }
        this.currentBgm = undefined;
    }

    private preloadMissingSfxClips(): void {
        for (const name of Object.keys(SFX_ASSET_UUIDS) as SfxName[]) {
            if (!this.clipCache.has(name)) {
                this.preloadSfxClip(name);
            }
        }
    }

    private preloadSfxClip(name: SfxName): void {
        if (this.clipCache.has(name) || this.loadingSfxClips.has(name)) {
            return;
        }
        this.loadingSfxClips.add(name);
        assetManager.loadAny(
            { uuid: SFX_ASSET_UUIDS[name] },
            (error: Error | null, asset: AudioClip | null) => {
                this.loadingSfxClips.delete(name);
                if (error || !asset) {
                    this.warnMissingSfx(name, error);
                    return;
                }
                this.clipCache.set(name, asset);
                this.missingClipWarnings.delete(name);
                if (this.pendingSfx.delete(name) && this.audioActivated && this.sfxEnabled
                    && !this.lifecyclePaused && (!this.battlePaused || UI_SFX.has(name))) {
                    const now = this.getNowSeconds();
                    this.lastSfxTimes.set(name, now);
                    this.playLoadedSfx(name, asset, now);
                }
            },
        );
    }

    private playLoadedSfx(name: SfxName, clip: AudioClip, now: number): void {
        const priority = SFX_PRIORITY[name];
        const slot = this.acquireSfxSlot(priority, now);
        if (!slot) {
            return;
        }
        slot.source.stop();
        slot.source.clip = clip;
        slot.source.loop = false;
        slot.source.volume = this.toEffectiveVolume(this.sfxVolume);
        slot.name = name;
        slot.priority = priority;
        slot.expiresAt = now + Math.max(0.05, clip.getDuration());
        slot.source.play();
    }

    private acquireSfxSlot(priority: number, now: number): SfxSlot | undefined {
        for (const slot of this.sfxSlots) {
            if (!slot.source.playing || now >= slot.expiresAt) {
                this.stopSlot(slot);
                return slot;
            }
        }
        let lowestPrioritySlot = this.sfxSlots[0];
        for (const slot of this.sfxSlots) {
            if (slot.priority < lowestPrioritySlot.priority
                || (slot.priority === lowestPrioritySlot.priority && slot.expiresAt < lowestPrioritySlot.expiresAt)) {
                lowestPrioritySlot = slot;
            }
        }
        if (lowestPrioritySlot.priority >= priority) {
            return undefined;
        }
        this.stopSlot(lowestPrioritySlot);
        return lowestPrioritySlot;
    }

    private stopSlot(slot: SfxSlot): void {
        if (slot.source?.isValid) {
            slot.source.stop();
            slot.source.clip = null;
        }
        slot.name = undefined;
        slot.priority = 0;
        slot.expiresAt = 0;
    }

    private warnMissingBgm(track: BgmTrackConfig, error?: Error | null): void {
        const warningKey = this.getBgmCacheKey(track.id);
        if (this.missingClipWarnings.has(warningKey)) {
            return;
        }
        this.missingClipWarnings.add(warningKey);
        console.warn('[WolfSheepBattle][Audio] BGM load failed; gameplay will continue.', {
            trackId: track.id,
            resourcePath: track.resourcePath,
            error: error?.message,
        });
    }

    private updateBgmLoadTimeouts(deltaTime: number): void {
        if (deltaTime <= 0 || this.loadingBgmElapsed.size === 0) {
            return;
        }
        const expiredIds: BgmTrackId[] = [];
        this.loadingBgmElapsed.forEach((elapsed, id) => {
            const nextElapsed = elapsed + deltaTime;
            if (nextElapsed < BGM_LOAD_TIMEOUT_SECONDS) {
                this.loadingBgmElapsed.set(id, nextElapsed);
            } else {
                expiredIds.push(id);
            }
        });
        for (const id of expiredIds) {
            this.loadingBgmElapsed.delete(id);
            const callbacks = this.loadingBgmCallbacks.get(id) ?? [];
            this.loadingBgmCallbacks.delete(id);
            const track = this.getBgmTrack(id);
            if (!track) {
                this.warnInvalidBgmId(`${id}`, 'load-timeout');
                for (const callback of callbacks) {
                    callback(undefined);
                }
                continue;
            }
            this.warnMissingBgm(track, new Error(`Load timed out after ${BGM_LOAD_TIMEOUT_SECONDS}s.`));
            for (const callback of callbacks) {
                callback(undefined);
            }
        }
    }

    private beginBgmPlaybackCheck(id: BgmTrackId, requestToken: number): void {
        this.bgmPlaybackCheckId = id;
        this.bgmPlaybackCheckToken = requestToken;
        this.bgmPlaybackCheckRemaining = BGM_PLAYBACK_CHECK_SECONDS;
    }

    private updateBgmPlaybackCheck(deltaTime: number): void {
        if (this.bgmPlaybackCheckRemaining <= 0 || !this.bgmPlaybackCheckId
            || this.lifecyclePaused || !this.musicEnabled) {
            return;
        }
        if (this.bgmSource?.playing) {
            this.cancelBgmPlaybackCheck();
            this.confirmBgmPlayback();
            return;
        }
        this.bgmPlaybackCheckRemaining = Math.max(0, this.bgmPlaybackCheckRemaining - deltaTime);
        if (this.bgmPlaybackCheckRemaining > 0) {
            return;
        }
        const id = this.bgmPlaybackCheckId;
        this.cancelBgmPlaybackCheck();
        const track = this.getBgmTrack(id)!;
        this.warnPlaybackBlocked(track);
        this.installUserGestureListeners();
    }

    private cancelBgmPlaybackCheck(): void {
        this.bgmPlaybackCheckRemaining = 0;
        this.bgmPlaybackCheckId = undefined;
        this.bgmPlaybackCheckToken = 0;
    }

    private warnMissingSfx(name: SfxName, error?: Error | null): void {
        if (this.missingClipWarnings.has(name)) {
            return;
        }
        this.missingClipWarnings.add(name);
        console.warn('[WolfSheepBattle][Audio] SFX load failed; gameplay will continue.', {
            name,
            expectedAsset: `assets/audio/resources/${SFX_RESOURCE_PATHS[name]}.wav`,
            error: error?.message,
        });
    }

    private warnInvalidBgmId(id: string, source: string): void {
        const warningKey = `${source}:${id}`;
        if (this.invalidBgmWarnings.has(warningKey)) {
            return;
        }
        this.invalidBgmWarnings.add(warningKey);
        console.warn('[WolfSheepBattle][Audio] Unknown BGM id; falling back to the default track.', {
            trackId: id,
            source,
            fallbackTrackId: DEFAULT_BGM_TRACK_ID,
        });
    }

    private handleGameHide(): void {
        this.lifecyclePaused = true;
        this.pauseBgm();
        this.stopAllSfx();
    }

    private handleGameShow(): void {
        this.lifecyclePaused = false;
        this.resumeBgm();
    }

    private readonly handleUserGesture = (): void => {
        this.unlockAudio();
    };

    private installUserGestureListeners(): void {
        if (this.userGestureListenersAttached || this.bgmSource?.playing
            || (this.audioActivated && !this.musicEnabled)) {
            return;
        }
        this.userGestureListenersAttached = true;
        input.on(Input.EventType.TOUCH_START, this.handleUserGesture, this);
        input.on(Input.EventType.MOUSE_DOWN, this.handleUserGesture, this);
    }

    private removeUserGestureListeners(): void {
        if (!this.userGestureListenersAttached) {
            return;
        }
        this.userGestureListenersAttached = false;
        input.off(Input.EventType.TOUCH_START, this.handleUserGesture, this);
        input.off(Input.EventType.MOUSE_DOWN, this.handleUserGesture, this);
    }

    private confirmBgmPlayback(): void {
        this.removeUserGestureListeners();
        if (this.bgmPlaybackConfirmed) {
            return;
        }
        this.bgmPlaybackConfirmed = true;
        for (const listener of this.bgmPlaybackStartedListeners) {
            listener();
        }
    }

    private warnPlaybackBlocked(track: BgmTrackConfig): void {
        if (this.playbackBlockedWarningShown) {
            return;
        }
        this.playbackBlockedWarningShown = true;
        console.warn('[WolfSheepBattle][Audio] BGM playback is waiting for a user gesture.', {
            trackId: track.id,
            resourcePath: track.resourcePath,
        });
    }

    private loadSettings(): void {
        const stored = this.readStoredAudioSettings();
        if (stored) {
            const storedTrackId = typeof stored.selectedBgmId === 'string'
                ? stored.selectedBgmId : DEFAULT_BGM_TRACK_ID;
            const storedTrackIsValid = !!this.getBgmTrack(storedTrackId);
            if (storedTrackIsValid) {
                this.selectedBgmId = storedTrackId as BgmTrackId;
            } else {
                this.warnInvalidBgmId(storedTrackId, 'stored-settings');
                this.selectedBgmId = DEFAULT_BGM_TRACK_ID;
            }
            const musicVolumeIsValid = this.isValidStoredVolume(stored.musicVolume);
            const sfxVolumeIsValid = this.isValidStoredVolume(stored.sfxVolume);
            const storedMusicVolume = musicVolumeIsValid ? stored.musicVolume : DEFAULT_MUSIC_VOLUME;
            const storedSfxVolume = sfxVolumeIsValid ? stored.sfxVolume : DEFAULT_SFX_VOLUME;
            const musicZeroWasBuggy = storedMusicVolume === 0
                && stored.musicMuted === false && stored.userAdjustedMusicVolume !== true;
            const sfxZeroWasBuggy = storedSfxVolume === 0
                && stored.sfxMuted === false && stored.userAdjustedSfxVolume !== true;
            this.legacyZeroMigrationApplied = musicZeroWasBuggy || sfxZeroWasBuggy
                || stored.legacyZeroMigrationApplied === true;
            this.musicVolume = !musicVolumeIsValid || musicZeroWasBuggy
                ? DEFAULT_MUSIC_VOLUME : stored.musicMuted === true ? 0 : storedMusicVolume;
            this.sfxVolume = !sfxVolumeIsValid || sfxZeroWasBuggy
                ? DEFAULT_SFX_VOLUME : stored.sfxMuted === true ? 0 : storedSfxVolume;
            this.musicEnabled = this.musicVolume > 0;
            this.sfxEnabled = this.sfxVolume > 0;
            this.lastNonZeroMusicVolume = this.loadStoredPositiveVolume(
                stored.lastNonZeroMusicVolume,
                storedMusicVolume > 0 ? storedMusicVolume : DEFAULT_MUSIC_VOLUME,
            );
            this.lastNonZeroSfxVolume = this.loadStoredPositiveVolume(
                stored.lastNonZeroSfxVolume,
                storedSfxVolume > 0 ? storedSfxVolume : DEFAULT_SFX_VOLUME,
            );
            // V1 did not record user intent. Preserve every valid custom value,
            // including ambiguous zero, unless the old muted flag proves that
            // zero was an impossible "enabled but silent" initialization state.
            this.userAdjustedMusicVolume = stored.userAdjustedMusicVolume === true
                || (musicVolumeIsValid && (storedMusicVolume !== DEFAULT_MUSIC_VOLUME || stored.musicMuted === true));
            this.userAdjustedSfxVolume = stored.userAdjustedSfxVolume === true
                || (sfxVolumeIsValid && (storedSfxVolume !== DEFAULT_SFX_VOLUME || stored.sfxMuted === true));
            this.userSelectedBgm = stored.userSelectedBgm === true
                || (storedTrackIsValid && storedTrackId !== DEFAULT_BGM_TRACK_ID);
            const settingsNeedRepair = stored.schemaVersion !== AUDIO_SETTINGS_SCHEMA_VERSION
                || !storedTrackIsValid
                || typeof stored.selectedBgmId !== 'string'
                || !musicVolumeIsValid
                || !sfxVolumeIsValid
                || typeof stored.musicMuted !== 'boolean'
                || typeof stored.sfxMuted !== 'boolean'
                || !this.isValidStoredPositiveVolume(stored.lastNonZeroMusicVolume)
                || !this.isValidStoredPositiveVolume(stored.lastNonZeroSfxVolume)
                || typeof stored.userAdjustedMusicVolume !== 'boolean'
                || typeof stored.userAdjustedSfxVolume !== 'boolean'
                || typeof stored.userSelectedBgm !== 'boolean'
                || typeof stored.legacyZeroMigrationApplied !== 'boolean'
                || musicZeroWasBuggy || sfxZeroWasBuggy;
            if (settingsNeedRepair) {
                this.saveAudioSettings();
            }
            return;
        }

        if (stored === null) {
            this.selectedBgmId = DEFAULT_BGM_TRACK_ID;
            this.musicVolume = DEFAULT_MUSIC_VOLUME;
            this.sfxVolume = DEFAULT_SFX_VOLUME;
            this.lastNonZeroMusicVolume = DEFAULT_MUSIC_VOLUME;
            this.lastNonZeroSfxVolume = DEFAULT_SFX_VOLUME;
            this.musicEnabled = true;
            this.sfxEnabled = true;
            this.userAdjustedMusicVolume = false;
            this.userAdjustedSfxVolume = false;
            this.userSelectedBgm = false;
            this.legacyZeroMigrationApplied = false;
            this.saveAudioSettings();
            return;
        }

        const legacyMusicEnabled = this.readLegacyBoolean(MUSIC_ENABLED_KEY);
        const legacySfxEnabled = this.readLegacyBoolean(SFX_ENABLED_KEY);
        const legacyMusicVolume = this.readLegacyVolume(MUSIC_VOLUME_KEY);
        const legacySfxVolume = this.readLegacyVolume(SFX_VOLUME_KEY);
        const musicZeroWasBuggy = legacyMusicEnabled === true && legacyMusicVolume === 0;
        const sfxZeroWasBuggy = legacySfxEnabled === true && legacySfxVolume === 0;
        this.musicVolume = legacyMusicVolume === undefined || legacyMusicVolume === null || musicZeroWasBuggy
            ? DEFAULT_MUSIC_VOLUME : legacyMusicEnabled === false ? 0 : legacyMusicVolume;
        this.sfxVolume = legacySfxVolume === undefined || legacySfxVolume === null || sfxZeroWasBuggy
            ? DEFAULT_SFX_VOLUME : legacySfxEnabled === false ? 0 : legacySfxVolume;
        this.lastNonZeroMusicVolume = this.loadNumber(MUSIC_LAST_VOLUME_KEY,
            legacyMusicVolume !== undefined && legacyMusicVolume !== null && legacyMusicVolume > 0
                ? legacyMusicVolume : DEFAULT_MUSIC_VOLUME, true);
        this.lastNonZeroSfxVolume = this.loadNumber(SFX_LAST_VOLUME_KEY,
            legacySfxVolume !== undefined && legacySfxVolume !== null && legacySfxVolume > 0
                ? legacySfxVolume : DEFAULT_SFX_VOLUME, true);
        this.musicEnabled = this.musicVolume > 0;
        this.sfxEnabled = this.sfxVolume > 0;
        this.selectedBgmId = DEFAULT_BGM_TRACK_ID;
        this.userAdjustedMusicVolume = !musicZeroWasBuggy && legacyMusicVolume !== undefined
            && legacyMusicVolume !== null
            && (legacyMusicVolume !== DEFAULT_MUSIC_VOLUME || legacyMusicEnabled === false);
        this.userAdjustedSfxVolume = !sfxZeroWasBuggy && legacySfxVolume !== undefined
            && legacySfxVolume !== null
            && (legacySfxVolume !== DEFAULT_SFX_VOLUME || legacySfxEnabled === false);
        this.userSelectedBgm = false;
        this.legacyZeroMigrationApplied = musicZeroWasBuggy || sfxZeroWasBuggy;
        this.saveAudioSettings();
    }

    private readStoredAudioSettings(): StoredAudioSettingsV1 | null | undefined {
        try {
            const value = sys.localStorage.getItem(AUDIO_SETTINGS_KEY);
            if (!value) {
                return undefined;
            }
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed as StoredAudioSettingsV1 : null;
        } catch (error) {
            console.warn('[WolfSheepBattle][Audio] Audio settings are invalid; defaults will be used.', {
                error: error instanceof Error ? error.message : `${error}`,
            });
            return null;
        }
    }

    private saveAudioSettings(): void {
        const settings: StoredAudioSettingsV1 = {
            schemaVersion: AUDIO_SETTINGS_SCHEMA_VERSION,
            selectedBgmId: this.selectedBgmId,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            musicMuted: !this.musicEnabled,
            sfxMuted: !this.sfxEnabled,
            lastNonZeroMusicVolume: this.lastNonZeroMusicVolume,
            lastNonZeroSfxVolume: this.lastNonZeroSfxVolume,
            userAdjustedMusicVolume: this.userAdjustedMusicVolume,
            userAdjustedSfxVolume: this.userAdjustedSfxVolume,
            userSelectedBgm: this.userSelectedBgm,
            legacyZeroMigrationApplied: this.legacyZeroMigrationApplied,
        };
        try {
            sys.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
        } catch {
            // Local settings are best-effort on restricted browser contexts.
        }
        this.saveBoolean(MUSIC_ENABLED_KEY, this.musicEnabled);
        this.saveBoolean(SFX_ENABLED_KEY, this.sfxEnabled);
        this.saveNumber(MUSIC_VOLUME_KEY, this.musicVolume);
        this.saveNumber(SFX_VOLUME_KEY, this.sfxVolume);
        this.saveNumber(MUSIC_LAST_VOLUME_KEY, this.lastNonZeroMusicVolume);
        this.saveNumber(SFX_LAST_VOLUME_KEY, this.lastNonZeroSfxVolume);
    }

    private getBgmTrack(id: string): BgmTrackConfig | undefined {
        return BGM_TRACKS.find((track) => track.id === id);
    }

    private getBgmCacheKey(id: BgmTrackId): string {
        return `bgm:${id}`;
    }

    private loadStoredPositiveVolume(value: unknown, fallback: number): number {
        return this.isValidStoredPositiveVolume(value) ? value : fallback;
    }

    private readLegacyBoolean(key: string): boolean | undefined {
        try {
            const value = sys.localStorage.getItem(key);
            return value === 'true' ? true : value === 'false' ? false : undefined;
        } catch {
            return undefined;
        }
    }

    private readLegacyVolume(key: string): number | null | undefined {
        try {
            const stored = sys.localStorage.getItem(key);
            if (stored === null || stored.trim().length === 0) return undefined;
            const value = Number(stored);
            return this.isValidStoredVolume(value) ? value : null;
        } catch {
            return undefined;
        }
    }

    private loadNumber(key: string, fallback: number, requirePositive = false): number {
        try {
            const stored = sys.localStorage.getItem(key);
            if (stored === null || stored.trim().length === 0) {
                return fallback;
            }
            const value = Number(stored);
            if (!this.isValidStoredVolume(value)) {
                return fallback;
            }
            return requirePositive && value <= 0 ? fallback : value;
        } catch {
            return fallback;
        }
    }

    private isValidStoredVolume(value: unknown): value is number {
        return typeof value === 'number'
            && Number.isFinite(value)
            && value >= 0
            && value <= 1;
    }

    private isValidStoredPositiveVolume(value: unknown): value is number {
        return this.isValidStoredVolume(value) && value > 0;
    }

    private saveBoolean(key: string, value: boolean): void {
        try {
            sys.localStorage.setItem(key, value ? 'true' : 'false');
        } catch {
            // Local settings are best-effort on restricted browser contexts.
        }
    }

    private saveNumber(key: string, value: number): void {
        try {
            sys.localStorage.setItem(key, `${value}`);
        } catch {
            // Local settings are best-effort on restricted browser contexts.
        }
    }

    private clampVolume(value: number): number {
        return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }

    private toEffectiveVolume(displayVolume: number): number {
        const value = this.clampVolume(displayVolume);
        return value * value;
    }

    private getEffectiveMusicVolume(trackId?: BgmTrackId): number {
        const track = this.getBgmTrack(trackId ?? this.currentBgm ?? this.desiredBgm ?? this.selectedBgmId);
        const gain = track?.volumeGain ?? 1;
        const pauseMultiplier = this.battlePaused ? PAUSED_MUSIC_MULTIPLIER : 1;
        return this.clampVolume(this.toEffectiveVolume(this.musicVolume) * gain * pauseMultiplier);
    }

    private refreshBgmVolume(): void {
        if (!this.bgmSource?.isValid) {
            return;
        }
        if (this.bgmFadeMode === 'fadeIn') {
            this.bgmFadeTargetVolume = this.getEffectiveMusicVolume(this.currentBgm);
            return;
        }
        if (this.bgmFadeMode === 'fadeOut' || this.bgmFadeMode === 'finalFadeOut') {
            return;
        }
        this.bgmSource.volume = this.getEffectiveMusicVolume(this.currentBgm);
    }

    private cancelBgmFade(): void {
        this.bgmFadeMode = 'none';
        this.bgmFadeDuration = 0;
        this.bgmFadeElapsed = 0;
        this.bgmFadeStartVolume = 0;
        this.bgmFadeTargetVolume = 0;
        this.bgmFadeCompletion = undefined;
    }

    private getNowSeconds(): number {
        return Date.now() / 1000;
    }
}
