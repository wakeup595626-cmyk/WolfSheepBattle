import { Sprite, SpriteFrame } from 'cc';
import { UNIT_ANIMATION_RANGES, UnitSpriteAnimationState } from './ArtPilotConfig';

const STATE_PRIORITY: Readonly<Record<UnitSpriteAnimationState, number>> = {
    idle: 0,
    move: 1,
    attack: 2,
    hit: 3,
    death: 4,
};

export class UnitSpriteAnimator {
    private state: UnitSpriteAnimationState = 'idle';
    private locomotionState: 'idle' | 'move' = 'idle';
    private elapsed = 0;
    private frameIndex = -1;

    constructor(
        private readonly sprite: Sprite,
        private readonly frames: readonly SpriteFrame[],
    ) {
        this.applyFrame(0);
    }

    setLocomotion(isMoving: boolean): void {
        this.locomotionState = isMoving ? 'move' : 'idle';
        if (this.state === 'idle' || this.state === 'move') {
            this.switchState(this.locomotionState);
        }
    }

    playAttack(): void {
        this.requestOneShot('attack');
    }

    playHit(): void {
        this.requestOneShot('hit');
    }

    playDeath(): void {
        this.switchState('death', true);
    }

    reset(): void {
        this.locomotionState = 'idle';
        this.switchState('idle', true);
    }

    update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }
        const config = UNIT_ANIMATION_RANGES[this.state];
        this.elapsed += deltaTime;
        const progressedFrames = Math.floor(this.elapsed * config.fps);
        if (config.loop) {
            this.applyFrame(config.start + progressedFrames % config.count);
            return;
        }
        if (progressedFrames >= config.count) {
            if (this.state === 'death') {
                this.applyFrame(config.start + config.count - 1);
            } else {
                this.switchState(this.locomotionState, true);
            }
            return;
        }
        this.applyFrame(config.start + progressedFrames);
    }

    getState(): UnitSpriteAnimationState {
        return this.state;
    }

    private requestOneShot(requested: 'attack' | 'hit'): void {
        if (this.state === 'death' || STATE_PRIORITY[requested] < STATE_PRIORITY[this.state]) {
            return;
        }
        this.switchState(requested, true);
    }

    private switchState(next: UnitSpriteAnimationState, forceRestart = false): void {
        if (!forceRestart && this.state === next) {
            return;
        }
        this.state = next;
        this.elapsed = 0;
        this.frameIndex = -1;
        this.applyFrame(UNIT_ANIMATION_RANGES[next].start);
    }

    private applyFrame(index: number): void {
        if (this.frameIndex === index) {
            return;
        }
        const frame = this.frames[index];
        if (!frame) {
            return;
        }
        this.frameIndex = index;
        this.sprite.spriteFrame = frame;
    }
}
