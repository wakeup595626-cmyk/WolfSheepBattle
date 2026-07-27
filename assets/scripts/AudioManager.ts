import {
    _decorator,
    AudioClip,
    AudioSource,
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
    private readonly sfxSlots: SfxSlot[] = [];
    private readonly lastSfxTimes = new Map<SfxName, number>();
    private readonly missingClipWarnings = new Set<BgmName | SfxName>();

    private bgmSource!: AudioSource;
    private desiredBgm: BgmName | undefined;
    private currentBgm: BgmName | undefined;
    private musicEnabled = true;
    private sfxEnabled = true;
    private musicVolume = 0.42;
    private sfxVolume = 0.78;
    private audioActivated = false;
    private battlePaused = false;
    private lifecyclePaused = false;

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
    }

    registerClips(clips: readonly AudioClip[]): void {
        for (const clip of clips) {
            const name = clip.name as BgmName | SfxName;
            if (Object.prototype.hasOwnProperty.call(AUDIO_RESOURCE_PATHS, name)) {
                this.clipCache.set(name, clip);
                this.missingClipWarnings.delete(name);
            }
        }
    }

    activateAudio(): void {
        this.audioActivated = true;
        if (this.desiredBgm) {
            this.startDesiredBgm();
        }
    }

    playBgm(name: BgmName): void {
        this.desiredBgm = name;
        if (!this.audioActivated || !this.musicEnabled || this.battlePaused || this.lifecyclePaused) {
            return;
        }
        this.startDesiredBgm();
    }

    stopBgm(): void {
        this.desiredBgm = undefined;
        this.currentBgm = undefined;
        if (this.bgmSource?.isValid) {
            this.bgmSource.stop();
            this.bgmSource.clip = null;
        }
    }

    pauseBgm(): void {
        if (this.bgmSource?.isValid && this.bgmSource.playing) {
            this.bgmSource.pause();
        }
    }

    resumeBgm(): void {
        if (!this.audioActivated || !this.musicEnabled || this.battlePaused || this.lifecyclePaused
            || !this.desiredBgm) {
            return;
        }
        if (this.currentBgm === this.desiredBgm && this.bgmSource.clip) {
            this.bgmSource.volume = this.musicVolume;
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
        this.lastSfxTimes.set(name, now);
        const cached = this.clipCache.get(name);
        if (cached) {
            this.playLoadedSfx(name, cached, now);
            return;
        }
        this.warnMissingClip(name);
    }

    setMusicEnabled(enabled: boolean): void {
        this.musicEnabled = enabled;
        this.saveBoolean(MUSIC_ENABLED_KEY, enabled);
        if (enabled) {
            this.resumeBgm();
        } else {
            this.pauseBgm();
        }
    }

    setSfxEnabled(enabled: boolean): void {
        this.sfxEnabled = enabled;
        this.saveBoolean(SFX_ENABLED_KEY, enabled);
        if (!enabled) {
            this.stopAllSfx();
        }
    }

    isMusicEnabled(): boolean {
        return this.musicEnabled;
    }

    isSfxEnabled(): boolean {
        return this.sfxEnabled;
    }

    setMusicVolume(value: number): void {
        this.musicVolume = this.clampVolume(value);
        this.saveNumber(MUSIC_VOLUME_KEY, this.musicVolume);
        if (this.bgmSource?.isValid) {
            this.bgmSource.volume = this.musicVolume;
        }
    }

    setSfxVolume(value: number): void {
        this.sfxVolume = this.clampVolume(value);
        this.saveNumber(SFX_VOLUME_KEY, this.sfxVolume);
        for (const slot of this.sfxSlots) {
            slot.source.volume = this.sfxVolume;
        }
    }

    setBattlePaused(paused: boolean): void {
        this.battlePaused = paused;
        if (paused) {
            this.pauseBgm();
            this.stopBattleSfx();
        } else {
            this.resumeBgm();
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
        this.bgmSource.volume = this.musicVolume;

        for (let index = 0; index < SFX_POOL_SIZE; index += 1) {
            const sourceNode = new Node(`SfxAudioSource${index + 1}`);
            sourceNode.setParent(this.node);
            const source = sourceNode.addComponent(AudioSource);
            source.loop = false;
            source.playOnAwake = false;
            source.volume = this.sfxVolume;
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
        if (!name || !this.audioActivated || !this.musicEnabled || this.battlePaused || this.lifecyclePaused) {
            return;
        }
        const cached = this.clipCache.get(name);
        if (cached) {
            this.playLoadedBgm(name, cached);
            return;
        }
        this.warnMissingClip(name);
    }

    private playLoadedBgm(name: BgmName, clip: AudioClip): void {
        if (this.currentBgm === name && this.bgmSource.clip === clip && this.bgmSource.playing) {
            return;
        }
        if (this.bgmSource.clip !== clip) {
            this.bgmSource.stop();
            this.bgmSource.clip = clip;
        }
        this.currentBgm = name;
        this.bgmSource.loop = true;
        this.bgmSource.volume = this.musicVolume;
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
        slot.source.volume = this.sfxVolume;
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

    private warnMissingClip(name: BgmName | SfxName): void {
        if (this.missingClipWarnings.has(name)) {
            return;
        }
        this.missingClipWarnings.add(name);
        console.warn('[WolfSheepBattle][Audio] 音频资源未注册。', {
            name,
            expectedAsset: `assets/audio/resources/${AUDIO_RESOURCE_PATHS[name]}.wav`,
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
        this.musicEnabled = this.loadBoolean(MUSIC_ENABLED_KEY, true);
        this.sfxEnabled = this.loadBoolean(SFX_ENABLED_KEY, true);
        this.musicVolume = this.loadNumber(MUSIC_VOLUME_KEY, 0.42);
        this.sfxVolume = this.loadNumber(SFX_VOLUME_KEY, 0.78);
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

    private getNowSeconds(): number {
        return Date.now() / 1000;
    }
}
