import {
    _decorator,
    Component,
    Game,
    Rect,
    ResolutionPolicy,
    screen,
    sys,
    view,
    game,
} from 'cc';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
const DESIGN_ASPECT = DESIGN_WIDTH / DESIGN_HEIGHT;

export type LandscapeResolutionMode = 'FIXED_HEIGHT' | 'FIXED_WIDTH';

export interface LandscapeCapsuleRect {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
    readonly width: number;
    readonly height: number;
}

export interface LandscapeLayoutMetrics {
    readonly mode: LandscapeResolutionMode;
    readonly visibleWidth: number;
    readonly visibleHeight: number;
    readonly visibleOriginX: number;
    readonly visibleOriginY: number;
    readonly safeLeft: number;
    readonly safeRight: number;
    readonly safeTop: number;
    readonly safeBottom: number;
    readonly safeCenterX: number;
    readonly safeCenterY: number;
    readonly screenPixelWidth: number;
    readonly screenPixelHeight: number;
    readonly capsule?: LandscapeCapsuleRect;
}

export type LandscapeLayoutListener = (metrics: LandscapeLayoutMetrics) => void;

/**
 * Keeps a 16:9 logical battlefield intact while allowing the visible canvas to
 * expand on wide phones (or vertically on narrower landscape displays).
 */
@ccclass('LandscapeScreenAdapter')
export class LandscapeScreenAdapter extends Component {
    private readonly listeners = new Set<LandscapeLayoutListener>();
    private initialized = false;
    private applying = false;
    private metrics?: LandscapeLayoutMetrics;

    onLoad(): void {
        this.initialize();
    }

    onDestroy(): void {
        screen.off('window-resize', this.handleScreenChanged, this);
        screen.off('orientation-change', this.handleScreenChanged, this);
        game.off(Game.EVENT_SHOW, this.handleScreenChanged, this);
        this.listeners.clear();
    }

    public initialize(): LandscapeLayoutMetrics {
        if (!this.initialized) {
            this.initialized = true;
            screen.on('window-resize', this.handleScreenChanged, this);
            screen.on('orientation-change', this.handleScreenChanged, this);
            game.on(Game.EVENT_SHOW, this.handleScreenChanged, this);
        }
        return this.refresh();
    }

    public refresh(): LandscapeLayoutMetrics {
        if (this.applying && this.metrics) return this.metrics;
        this.applying = true;
        try {
            const windowSize = this.getWindowSizeForLayout();
            const aspect = windowSize.width > 0 && windowSize.height > 0
                ? windowSize.width / windowSize.height : DESIGN_ASPECT;
            const mode: LandscapeResolutionMode = aspect >= DESIGN_ASPECT
                ? 'FIXED_HEIGHT' : 'FIXED_WIDTH';
            view.setDesignResolutionSize(
                DESIGN_WIDTH,
                DESIGN_HEIGHT,
                mode === 'FIXED_HEIGHT' ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH,
            );

            const visibleSize = view.getVisibleSize();
            const visibleOrigin = view.getVisibleOrigin();
            const safeRect = this.getSafeRect(visibleOrigin.x, visibleOrigin.y, visibleSize.width, visibleSize.height);
            const visibleCenterX = visibleOrigin.x + visibleSize.width * 0.5;
            const visibleCenterY = visibleOrigin.y + visibleSize.height * 0.5;
            const safeLeft = safeRect.x - visibleCenterX;
            const safeRight = safeRect.x + safeRect.width - visibleCenterX;
            const safeBottom = safeRect.y - visibleCenterY;
            const safeTop = safeRect.y + safeRect.height - visibleCenterY;
            const capsule = this.getCapsuleRect(visibleSize.width, visibleSize.height, windowSize.width, windowSize.height);

            this.metrics = {
                mode,
                visibleWidth: visibleSize.width,
                visibleHeight: visibleSize.height,
                visibleOriginX: visibleOrigin.x,
                visibleOriginY: visibleOrigin.y,
                safeLeft,
                safeRight,
                safeTop,
                safeBottom,
                safeCenterX: (safeLeft + safeRight) * 0.5,
                safeCenterY: (safeBottom + safeTop) * 0.5,
                screenPixelWidth: windowSize.width,
                screenPixelHeight: windowSize.height,
                capsule,
            };
            for (const listener of this.listeners) listener(this.metrics);
            return this.metrics;
        } finally {
            this.applying = false;
        }
    }

    public getMetrics(): LandscapeLayoutMetrics {
        return this.metrics ?? this.initialize();
    }

    public subscribe(listener: LandscapeLayoutListener): void {
        this.listeners.add(listener);
    }

    public unsubscribe(listener: LandscapeLayoutListener): void {
        this.listeners.delete(listener);
    }

    private readonly handleScreenChanged = (): void => {
        this.refresh();
    };

    private getSafeRect(originX: number, originY: number, visibleWidth: number, visibleHeight: number): Rect {
        const fallback = new Rect(originX, originY, visibleWidth, visibleHeight);
        try {
            const safe = sys.getSafeAreaRect(false);
            if (!safe || safe.width <= 0 || safe.height <= 0) return fallback;
            const left = Math.max(originX, safe.x);
            const bottom = Math.max(originY, safe.y);
            const right = Math.min(originX + visibleWidth, safe.x + safe.width);
            const top = Math.min(originY + visibleHeight, safe.y + safe.height);
            if (right <= left || top <= bottom) return fallback;
            return new Rect(left, bottom, right - left, top - bottom);
        } catch (error) {
            console.warn('[LandscapeScreenAdapter] 读取安全区失败，使用完整可见区域。', error);
            return fallback;
        }
    }

    private getWindowSizeForLayout(): { width: number; height: number } {
        const wxApi = (globalThis as { wx?: {
            getWindowInfo?: () => { windowWidth?: number; windowHeight?: number };
            getSystemInfoSync?: () => { windowWidth?: number; windowHeight?: number };
        } }).wx;
        try {
            const info = wxApi?.getWindowInfo?.() ?? wxApi?.getSystemInfoSync?.();
            if (info?.windowWidth && info?.windowHeight) {
                return { width: info.windowWidth, height: info.windowHeight };
            }
        } catch (error) {
            console.warn('[LandscapeScreenAdapter] 读取微信窗口尺寸失败，使用引擎窗口尺寸。', error);
        }
        const size = screen.windowSize;
        return { width: Math.max(1, size.width), height: Math.max(1, size.height) };
    }

    private getCapsuleRect(
        visibleWidth: number,
        visibleHeight: number,
        windowWidth: number,
        windowHeight: number,
    ): LandscapeCapsuleRect | undefined {
        const wxApi = (globalThis as { wx?: {
            getMenuButtonBoundingClientRect?: () => {
                left: number;
                right: number;
                top: number;
                bottom: number;
                width: number;
                height: number;
            };
        } }).wx;
        if (!wxApi?.getMenuButtonBoundingClientRect || windowWidth <= 0 || windowHeight <= 0) return undefined;
        try {
            const rect = wxApi.getMenuButtonBoundingClientRect();
            if (!rect || rect.width <= 0 || rect.height <= 0) return undefined;
            const scaleX = visibleWidth / windowWidth;
            const scaleY = visibleHeight / windowHeight;
            const left = -visibleWidth * 0.5 + rect.left * scaleX;
            const right = -visibleWidth * 0.5 + rect.right * scaleX;
            const top = visibleHeight * 0.5 - rect.top * scaleY;
            const bottom = visibleHeight * 0.5 - rect.bottom * scaleY;
            return { left, right, top, bottom, width: right - left, height: top - bottom };
        } catch (error) {
            console.warn('[LandscapeScreenAdapter] 读取微信胶囊区域失败。', error);
            return undefined;
        }
    }
}
