import {
    _decorator,
    AudioClip,
    AudioSource,
    assetManager,
    Component,
    game,
    Game,
    Node,
    sys,
} from 'cc';

const { ccclass } = _decorator;

export type BgmName = 'battle_bgm';

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

const MUSIC_ENABLED_KEY = 'wolf-sheep-battle.audio.music-enabled';
const SFX_ENABLED_KEY = 'wolf-sheep-battle.audio.sfx-enabled';
const MUSIC_VOLUME_KEY = 'wolf-sheep-battle.audio.music-volume';
const SFX_VOLUME_KEY = 'wolf-sheep-battle.audio.sfx-volume';
const MUSIC_LAST_VOLUME_KEY = 'wolf-sheep-battle.audio.music-last-volume';
const SFX_LAST_VOLUME_KEY = 'wolf-sheep-battle.audio.sfx-last-volume';
const DEFAULT_MUSIC_VOLUME = 0.5;
const DEFAULT_SFX_VOLUME = 0.75;
const PAUSED_MUSIC_MULTIPLIER = 0.35;
const SFX_POOL_SIZE = 6;

const AUDIO_RESOURCE_PATHS: Readonly<Record<BgmName | SfxName, string>> = {
    battle_bgm: 'battle_bgm',
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

const AUDIO_ASSET_UUIDS: Readonly<Record<BgmName | SfxName, string>> = {
    battle_bgm: '8d0352b2-12cc-436d-85b1-c77ddadef6f8',
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
    private readonly clipCache = new Map<BgmName | SfxName, AudioClip>();
    private readonly loadingClips = new Set<BgmName | SfxName>();
    private readonly pendingSfx = new Set<SfxName>();
    private readonly sfxSlots: SfxSlot[] = [];
    private readonly lastSfxTimes = new Map<SfxName, number>();
    private readonly missingClipWarnings = new Set<BgmName | SfxName>();

    private bgmSource!: AudioSource;
    private desiredBgm: BgmName | undefined;
    private currentBgm: BgmName | undefined;
    private musicEnabled = true;
    private sfxEnabled = true;
    private musicVolume = DEFAULT_MUSIC_VOLUME;
    private sfxVolume = DEFAULT_SFX_VOLUME;
    private lastNonZeroMusicVolume = DEFAULT_MUSIC_VOLUME;
    private lastNonZeroSfxVolume = DEFAULT_SFX_VOLUME;
    private audioActivated = false;
    private battlePaused = false;
    private lifecyclePaused = false;
    private bgmFadeDuration = 0;
    private bgmFadeElapsed = 0;
    private bgmFadeStartVolume = 0;
    private bgmFadeTargetVolume = 0;
    private stopBgmAfterFade = false;

    onLoad(): void {
        this.loadSettings();
        this.createAudioSources();
        game.on(Game.EVENT_HIDE, this.handleGameHide, this);
        game.on(Game.EVENT_SHOW, this.handleGameShow, this);
    }

    onDestroy(): void {
        game.off(Game.EVENT_HIDE, this.handleGameHide, this);
        game.off(Game.EVENT_SHOW, this.handleGameShow, this);
        this.stopAllSfx();
        if (this.bgmSource?.isValid) {
            this.bgmSource.stop();
        }
        this.clipCache.clear();
        this.loadingClips.clear();
        this.pendingSfx.clear();
    }

    update(deltaTime: number): void {
        if (this.bgmFadeDuration <= 0 || !this.bgmSource?.isValid) {
            return;
        }
        this.bgmFadeElapsed = Math.min(this.bgmFadeDuration, this.bgmFadeElapsed + Math.max(0, deltaTime));
        const progress = this.bgmFadeElapsed / this.bgmFadeDuration;
        this.bgmSource.volume = this.bgmFadeStartVolume
            + (this.bgmFadeTargetVolume - this.bgmFadeStartVolume) * progress;
        if (progress < 1) {
            return;
        }
        this.bgmFadeDuration = 0;
        if (this.stopBgmAfterFade) {
            this.stopBgmAfterFade = false;
            this.bgmSource.stop();
            this.bgmSource.clip = null;
            this.currentBgm = undefined;
            this.desiredBgm = undefined;
        }
    }

    registerClips(clips: readonly AudioClip[]): void {
        for (const clip of clips) {
            const name = clip.name as BgmName | SfxName;
            if (Object.prototype.hasOwnProperty.call(AUDIO_RESOURCE_PATHS, name)) {
                this.clipCache.set(name, clip);
                this.missingClipWarnings.delete(name);
            }
        }
        this.preloadMissingClips();
    }

    activateAudio(): void {
        this.audioActivated = true;
        if (this.desiredBgm) {
            this.startDesiredBgm();
        }
    }

    playBgm(name: BgmName): void {
        this.desiredBgm = name;
        if (!this.audioActivated || !this.musicEnabled || this.lifecyclePaused) {
            return;
        }
        this.startDesiredBgm();
    }

    stopBgm(): void {
        this.cancelBgmFade();
        this.desiredBgm = undefined;
        this.currentBgm = undefined;
        if (this.bgmSource?.isValid) {
            this.bgmSource.stop();
            this.bgmSource.clip = null;
        }
    }

    fadeOutBgm(duration = 0.4): void {
        if (!this.bgmSource?.isValid || !this.bgmSource.playing || duration <= 0) {
            this.stopBgm();
            return;
        }
        this.bgmFadeDuration = duration;
        this.bgmFadeElapsed = 0;
        this.bgmFadeStartVolume = this.bgmSource.volume;
        this.bgmFadeTargetVolume = 0;
        this.stopBgmAfterFade = true;
    }

    pauseBgm(): void {
        if (this.bgmSource?.isValid && this.bgmSource.playing) {
            this.bgmSource.pause();
        }
    }

    resumeBgm(): void {
        if (!this.audioActivated || !this.musicEnabled || this.lifecyclePaused
            || !this.desiredBgm) {
            return;
        }
        if (this.currentBgm === this.desiredBgm && this.bgmSource.clip) {
            this.cancelBgmFade();
            this.refreshBgmVolume();
            this.bgmSource.play();
            return;
        }
        this.startDesiredBgm();
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
        this.preloadClip(name);
    }

    setMusicEnabled(enabled: boolean): void {
        if (enabled) {
            this.setMusicVolume(this.lastNonZeroMusicVolume);
            this.resumeBgm();
        } else {
            this.setMusicVolume(0);
            this.pauseBgm();
        }
    }

    setSfxEnabled(enabled: boolean): void {
        if (enabled) {
            this.setSfxVolume(this.lastNonZeroSfxVolume);
        } else {
            this.setSfxVolume(0);
            this.stopAllSfx();
        }
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
        this.musicVolume = this.clampVolume(value);
        this.musicEnabled = this.musicVolume > 0;
        if (this.musicVolume > 0) {
            this.lastNonZeroMusicVolume = this.musicVolume;
            this.saveNumber(MUSIC_LAST_VOLUME_KEY, this.lastNonZeroMusicVolume);
        }
        this.saveBoolean(MUSIC_ENABLED_KEY, this.musicEnabled);
        this.saveNumber(MUSIC_VOLUME_KEY, this.musicVolume);
        if (this.bgmSource?.isValid) {
            this.refreshBgmVolume();
        }
    }

    setSfxVolume(value: number): void {
        this.sfxVolume = this.clampVolume(value);
        this.sfxEnabled = this.sfxVolume > 0;
        if (this.sfxVolume > 0) {
            this.lastNonZeroSfxVolume = this.sfxVolume;
            this.saveNumber(SFX_LAST_VOLUME_KEY, this.lastNonZeroSfxVolume);
        }
        this.saveBoolean(SFX_ENABLED_KEY, this.sfxEnabled);
        this.saveNumber(SFX_VOLUME_KEY, this.sfxVolume);
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
            this.refreshBgmVolume();
        } else {
            this.resumeBgm();
            this.refreshBgmVolume();
        }
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
        this.bgmSource.volume = this.getEffectiveMusicVolume();

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

    private startDesiredBgm(): void {
        const name = this.desiredBgm;
        if (!name || !this.audioActivated || !this.musicEnabled || this.lifecyclePaused) {
            return;
        }
        const cached = this.clipCache.get(name);
        if (cached) {
            this.playLoadedBgm(name, cached);
            return;
        }
        this.preloadClip(name);
    }

    private preloadMissingClips(): void {
        for (const name of Object.keys(AUDIO_ASSET_UUIDS) as Array<BgmName | SfxName>) {
            if (!this.clipCache.has(name)) {
                this.preloadClip(name);
            }
        }
    }

    private preloadClip(name: BgmName | SfxName): void {
        if (this.clipCache.has(name) || this.loadingClips.has(name)) {
            return;
        }
        this.loadingClips.add(name);
        assetManager.loadAny(
            { uuid: AUDIO_ASSET_UUIDS[name] },
            (error: Error | null, asset: AudioClip | null) => {
                this.loadingClips.delete(name);
                if (error || !asset) {
                    this.warnMissingClip(name, error);
                    return;
                }
                this.clipCache.set(name, asset);
                this.missingClipWarnings.delete(name);
                if (name === 'battle_bgm') {
                    this.startDesiredBgm();
                    return;
                }
                if (this.pendingSfx.delete(name) && this.audioActivated && this.sfxEnabled
                    && !this.lifecyclePaused && (!this.battlePaused || UI_SFX.has(name))) {
                    const now = this.getNowSeconds();
                    this.lastSfxTimes.set(name, now);
                    this.playLoadedSfx(name, asset, now);
                }
            },
        );
    }

    private playLoadedBgm(name: BgmName, clip: AudioClip): void {
        if (this.currentBgm === name && this.bgmSource.clip === clip && this.bgmSource.playing) {
            this.cancelBgmFade();
            this.refreshBgmVolume();
            return;
        }
        this.cancelBgmFade();
        if (this.bgmSource.clip !== clip) {
            this.bgmSource.stop();
            this.bgmSource.clip = clip;
        }
        this.currentBgm = name;
        this.bgmSource.loop = true;
        this.refreshBgmVolume();
        this.bgmSource.play();
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

    private warnMissingClip(name: BgmName | SfxName, error?: Error | null): void {
        if (this.missingClipWarnings.has(name)) {
            return;
        }
        this.missingClipWarnings.add(name);
        console.warn('[WolfSheepBattle][Audio] 音频资源未注册。', {
            name,
            expectedAsset: `assets/audio/resources/${AUDIO_RESOURCE_PATHS[name]}.wav`,
            error: error?.message,
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

    private loadSettings(): void {
        const storedMusicEnabled = this.loadBoolean(MUSIC_ENABLED_KEY, true);
        const storedSfxEnabled = this.loadBoolean(SFX_ENABLED_KEY, true);
        this.musicVolume = storedMusicEnabled
            ? this.loadNumber(MUSIC_VOLUME_KEY, DEFAULT_MUSIC_VOLUME) : 0;
        this.sfxVolume = storedSfxEnabled
            ? this.loadNumber(SFX_VOLUME_KEY, DEFAULT_SFX_VOLUME) : 0;
        this.lastNonZeroMusicVolume = this.loadNumber(
            MUSIC_LAST_VOLUME_KEY,
            this.musicVolume > 0 ? this.musicVolume : DEFAULT_MUSIC_VOLUME,
        );
        this.lastNonZeroSfxVolume = this.loadNumber(
            SFX_LAST_VOLUME_KEY,
            this.sfxVolume > 0 ? this.sfxVolume : DEFAULT_SFX_VOLUME,
        );
        this.musicEnabled = this.musicVolume > 0;
        this.sfxEnabled = this.sfxVolume > 0;
    }

    private loadBoolean(key: string, fallback: boolean): boolean {
        try {
            const value = sys.localStorage.getItem(key);
            return value === null ? fallback : value === 'true';
        } catch {
            return fallback;
        }
    }

    private loadNumber(key: string, fallback: number): number {
        try {
            const stored = sys.localStorage.getItem(key);
            if (stored === null) {
                return fallback;
            }
            const value = Number(stored);
            return Number.isFinite(value) ? this.clampVolume(value) : fallback;
        } catch {
            return fallback;
        }
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

    private getEffectiveMusicVolume(): number {
        const pauseMultiplier = this.battlePaused ? PAUSED_MUSIC_MULTIPLIER : 1;
        return this.toEffectiveVolume(this.musicVolume) * pauseMultiplier;
    }

    private refreshBgmVolume(): void {
        if (!this.bgmSource?.isValid) {
            return;
        }
        this.bgmSource.volume = this.getEffectiveMusicVolume();
    }

    private cancelBgmFade(): void {
        this.bgmFadeDuration = 0;
        this.bgmFadeElapsed = 0;
        this.bgmFadeStartVolume = 0;
        this.bgmFadeTargetVolume = 0;
        this.stopBgmAfterFade = false;
    }

    private getNowSeconds(): number {
        return Date.now() / 1000;
    }
}
