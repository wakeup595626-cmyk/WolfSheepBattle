type WeChatShareMenu = 'shareAppMessage' | 'shareTimeline';

interface WeChatShareMessage {
    title: string;
}

interface WeChatCallbackResult {
    errMsg?: string;
}

interface WeChatSystemInfo {
    platform?: string;
    SDKVersion?: string;
}

interface WeChatShareApi {
    onShareAppMessage?: (listener: () => WeChatShareMessage) => void;
    offShareAppMessage?: (listener: () => WeChatShareMessage) => void;
    onShareTimeline?: (listener: () => WeChatShareMessage) => void;
    offShareTimeline?: (listener: () => WeChatShareMessage) => void;
    getDeviceInfo?: () => WeChatSystemInfo;
    getSystemInfoSync?: () => WeChatSystemInfo;
    showShareMenu?: (options: {
        withShareTicket: false;
        menus?: WeChatShareMenu[];
        success?: () => void;
        fail?: (error: WeChatCallbackResult) => void;
        complete?: (result: WeChatCallbackResult) => void;
    }) => void;
}

interface WeChatShareRuntimeContext {
    readonly platform: string;
    readonly sdkVersion: string;
    readonly supportsMenuSelection: boolean;
    readonly supportsTimeline: boolean;
}

export class WeChatShareManager {
    private static readonly MIN_TIMELINE_SDK_VERSION = '2.11.3';
    private static readonly MAX_MENU_ATTEMPTS = 2;
    private static readonly SHARE_TITLE = '羊狼四线战';
    private static readonly friendShareListener = (): WeChatShareMessage => ({
        title: WeChatShareManager.SHARE_TITLE,
    });
    private static readonly timelineShareListener = (): WeChatShareMessage => ({
        title: WeChatShareManager.SHARE_TITLE,
    });

    private static gameVersion = 'unknown';
    private static friendListenerRegistered = false;
    private static timelineListenerRegistered = false;
    private static friendMenuReady = false;
    private static timelineMenuReady = false;
    private static menuRequestInFlight = false;
    private static menuRetryScheduled = false;
    private static menuAttemptCount = 0;
    private static missingFriendApiWarningShown = false;

    static initialize(gameVersion = 'unknown'): void {
        if (gameVersion.trim().length > 0) {
            this.gameVersion = gameVersion;
        }

        const wxApi = (globalThis as { wx?: WeChatShareApi }).wx;
        if (!wxApi) {
            return;
        }

        if (typeof wxApi.onShareAppMessage !== 'function'
            || typeof wxApi.showShareMenu !== 'function') {
            if (!this.missingFriendApiWarningShown) {
                this.missingFriendApiWarningShown = true;
                console.warn('[WeChatShare] 微信好友分享接口不可用，后续 initialize 可安全重试。');
            }
            return;
        }

        if (!this.ensureFriendShareListener(wxApi)) {
            return;
        }

        const runtime = this.readRuntimeContext(wxApi);
        if (runtime.supportsTimeline) {
            this.ensureTimelineShareListener(wxApi);
        }
        this.ensureShareMenu(wxApi, runtime);
    }

    private static ensureFriendShareListener(wxApi: WeChatShareApi): boolean {
        if (this.friendListenerRegistered) {
            return true;
        }

        try {
            wxApi.onShareAppMessage?.(this.friendShareListener);
            this.friendListenerRegistered = true;
            return true;
        } catch (error) {
            console.warn('[WeChatShare] 注册好友分享监听失败，后续 initialize 可安全重试。',
                this.sanitizeErrMsg(error));
            return false;
        }
    }

    private static ensureTimelineShareListener(wxApi: WeChatShareApi): boolean {
        if (this.timelineListenerRegistered) {
            return true;
        }
        if (typeof wxApi.onShareTimeline !== 'function') {
            return false;
        }

        try {
            wxApi.onShareTimeline(this.timelineShareListener);
            this.timelineListenerRegistered = true;
            return true;
        } catch (error) {
            console.warn('[WeChatShare] 注册朋友圈分享监听失败，好友分享不受影响。',
                this.sanitizeErrMsg(error));
            return false;
        }
    }

    private static ensureShareMenu(
        wxApi: WeChatShareApi,
        runtime: WeChatShareRuntimeContext,
    ): void {
        const requestTimeline = runtime.supportsTimeline && this.timelineListenerRegistered;
        if (this.friendMenuReady && (!requestTimeline || this.timelineMenuReady)) {
            return;
        }
        if (this.menuRequestInFlight || this.menuRetryScheduled
            || this.menuAttemptCount >= this.MAX_MENU_ATTEMPTS) {
            return;
        }

        const requestedMenus: WeChatShareMenu[] = requestTimeline
            ? ['shareAppMessage', 'shareTimeline']
            : ['shareAppMessage'];
        this.requestShareMenu(wxApi, runtime, requestedMenus);
    }

    private static requestShareMenu(
        wxApi: WeChatShareApi,
        runtime: WeChatShareRuntimeContext,
        requestedMenus: WeChatShareMenu[],
    ): void {
        if (this.menuRequestInFlight || this.menuAttemptCount >= this.MAX_MENU_ATTEMPTS) {
            return;
        }

        const attempt = ++this.menuAttemptCount;
        const actualMenus = runtime.supportsMenuSelection ? requestedMenus : undefined;
        this.menuRequestInFlight = true;
        let settled = false;

        const completeSuccess = (): void => {
            if (settled) {
                return;
            }
            settled = true;
            this.menuRequestInFlight = false;
            this.friendMenuReady = true;
            if (requestedMenus.indexOf('shareTimeline') >= 0) {
                this.timelineMenuReady = true;
            }
            this.logMenuResult('success', runtime, requestedMenus, actualMenus, attempt);
        };

        const completeFailure = (error: unknown): void => {
            if (settled) {
                return;
            }
            settled = true;
            this.menuRequestInFlight = false;
            this.logMenuResult('fail', runtime, requestedMenus, actualMenus, attempt, error);

            const needsFriendFallback = requestedMenus.indexOf('shareTimeline') >= 0
                && !this.friendMenuReady;
            if (needsFriendFallback) {
                this.scheduleMenuRetry(wxApi, runtime, ['shareAppMessage']);
                return;
            }
            this.scheduleMenuRetry(wxApi, runtime, requestedMenus);
        };

        try {
            wxApi.showShareMenu?.({
                withShareTicket: false,
                ...(actualMenus ? { menus: actualMenus } : {}),
                success: completeSuccess,
                fail: completeFailure,
                complete: (result) => {
                    if (!settled) {
                        completeFailure(result);
                    }
                    this.logMenuResult('complete', runtime, requestedMenus, actualMenus, attempt, result);
                },
            });
        } catch (error) {
            completeFailure(error);
            this.logMenuResult('complete', runtime, requestedMenus, actualMenus, attempt, error);
        }
    }

    private static scheduleMenuRetry(
        wxApi: WeChatShareApi,
        runtime: WeChatShareRuntimeContext,
        requestedMenus: WeChatShareMenu[],
    ): void {
        if (this.menuRetryScheduled || this.menuAttemptCount >= this.MAX_MENU_ATTEMPTS) {
            return;
        }

        this.menuRetryScheduled = true;
        setTimeout(() => {
            this.menuRetryScheduled = false;
            this.requestShareMenu(wxApi, runtime, requestedMenus);
        }, 300);
    }

    private static readRuntimeContext(wxApi: WeChatShareApi): WeChatShareRuntimeContext {
        const deviceInfo = this.readSystemInfo(() => wxApi.getDeviceInfo?.());
        const systemInfo = this.readSystemInfo(() => wxApi.getSystemInfoSync?.());
        const platform = `${deviceInfo?.platform ?? systemInfo?.platform ?? 'unknown'}`.toLowerCase();
        const sdkVersion = `${deviceInfo?.SDKVersion ?? systemInfo?.SDKVersion ?? 'unknown'}`;
        const supportsMenuSelection = this.isSdkAtLeast(sdkVersion, this.MIN_TIMELINE_SDK_VERSION);
        const supportsTimeline = platform === 'android'
            && supportsMenuSelection
            && typeof wxApi.onShareTimeline === 'function';
        return {
            platform,
            sdkVersion,
            supportsMenuSelection,
            supportsTimeline,
        };
    }

    private static readSystemInfo(read: () => WeChatSystemInfo | undefined): WeChatSystemInfo | undefined {
        try {
            return read();
        } catch {
            return undefined;
        }
    }

    private static isSdkAtLeast(version: string, minimum: string): boolean {
        const parse = (value: string): number[] | undefined => {
            const match = value.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
            if (!match) {
                return undefined;
            }
            return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
        };
        const current = parse(version);
        const required = parse(minimum);
        if (!current || !required) {
            return false;
        }
        for (let index = 0; index < required.length; index += 1) {
            if (current[index] !== required[index]) {
                return current[index] > required[index];
            }
        }
        return true;
    }

    private static logMenuResult(
        stage: 'success' | 'fail' | 'complete',
        runtime: WeChatShareRuntimeContext,
        requestedMenus: readonly WeChatShareMenu[],
        actualMenus: readonly WeChatShareMenu[] | undefined,
        attempt: number,
        error?: unknown,
    ): void {
        const diagnostics = {
            gameVersion: this.gameVersion,
            platform: runtime.platform,
            SDKVersion: runtime.sdkVersion,
            requestedMenus,
            actualMenus: actualMenus ?? 'default-shareAppMessage',
            attempt,
            errMsg: error === undefined ? undefined : this.sanitizeErrMsg(error),
        };
        if (stage === 'fail') {
            console.warn('[WeChatShare] 分享菜单请求失败。', diagnostics);
            return;
        }
        console.info(`[WeChatShare] 分享菜单请求${stage === 'success' ? '成功' : '完成'}。`, diagnostics);
    }

    private static sanitizeErrMsg(error: unknown): string {
        let errMsg: unknown;
        if (typeof error === 'string') {
            errMsg = error;
        } else if (error && typeof error === 'object') {
            const candidate = error as WeChatCallbackResult & { message?: unknown };
            errMsg = candidate.errMsg ?? candidate.message;
        }
        if (typeof errMsg !== 'string' || errMsg.trim().length === 0) {
            return 'unknown';
        }

        return errMsg
            .replace(
                /([?&](?:access_token|session_key|openid|unionid|code)=)[^&\s]+/gi,
                '$1[redacted]',
            )
            .replace(
                /((?:access_token|session_key|openid|unionid|code)\s*[:=]\s*)[^\s,;]+/gi,
                '$1[redacted]',
            )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 300);
    }
}
