import { Color, Node, Sprite, SpriteFrame, UITransform } from 'cc';

export class VfxSpriteAnimator {
    readonly node: Node;
    private readonly sprite: Sprite;
    private frames: readonly SpriteFrame[] = [];
    private elapsed = 0;
    private fps = 12;
    private frameIndex = -1;
    private playing = false;

    constructor() {
        this.node = new Node('PilotVfx');
        this.node.addComponent(UITransform).setContentSize(1, 1);
        this.sprite = this.node.addComponent(Sprite);
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.node.active = false;
    }

    play(
        parent: Node,
        frames: readonly SpriteFrame[],
        x: number,
        y: number,
        width: number,
        height: number,
        fps: number,
        tint: Color = Color.WHITE,
    ): void {
        this.frames = frames;
        this.elapsed = 0;
        this.fps = fps;
        this.frameIndex = -1;
        this.playing = frames.length > 0;
        this.node.setParent(parent);
        this.node.setPosition(x, y, 0);
        this.node.setScale(1, 1, 1);
        this.node.getComponent(UITransform)!.setContentSize(width, height);
        this.sprite.color = tint;
        this.node.active = this.playing;
        this.applyFrame(0);
    }

    update(deltaTime: number): boolean {
        if (!this.playing || !this.node.active) {
            return false;
        }
        this.elapsed += Math.max(0, deltaTime);
        const nextFrame = Math.floor(this.elapsed * this.fps);
        if (nextFrame >= this.frames.length) {
            this.stop();
            return false;
        }
        this.applyFrame(nextFrame);
        return true;
    }

    stop(): void {
        this.playing = false;
        this.node.active = false;
        this.sprite.spriteFrame = null;
        this.frames = [];
        this.frameIndex = -1;
    }

    destroy(): void {
        this.stop();
        if (this.node.isValid) {
            this.node.destroy();
        }
    }

    private applyFrame(index: number): void {
        if (index === this.frameIndex) {
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

