import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/25653/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = path.resolve(process.argv[2] ?? 'release_evidence/v1.3.0-dev-share02-audio01/browser');
const PREVIEW_URL = process.argv[3] ?? 'http://127.0.0.1:7467';
const GAME_VERSION = 'v1.3.0-dev-share02-audio01';
const require = createRequire(import.meta.url);
const typescript = require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const checks = [];
const check = (condition, name, details = undefined) => {
    checks.push({ name, passed: Boolean(condition), details });
};

const toLogText = (values) => values.map((value) => {
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}).join(' ');

const compileShareManager = () => {
    const source = fs.readFileSync(path.join(PROJECT_ROOT, 'assets/scripts/WeChatShareManager.ts'), 'utf8');
    return typescript.transpileModule(source, {
        compilerOptions: {
            target: typescript.ScriptTarget.ES2017,
            module: typescript.ModuleKind.CommonJS,
            strict: true,
        },
        fileName: 'WeChatShareManager.ts',
    }).outputText;
};

const createShareHarness = (options = {}) => {
    const calls = {
        friendListeners: [],
        timelineListeners: [],
        showMenuOptions: [],
        logs: [],
        timers: [],
    };
    const outcomes = [...(options.outcomes ?? ['success'])];
    const wxApi = {
        onShareAppMessage: options.omitFriendApi ? undefined : (listener) => {
            calls.friendListeners.push(listener);
        },
        onShareTimeline: options.omitTimelineApi ? undefined : (listener) => {
            calls.timelineListeners.push(listener);
        },
        getDeviceInfo: options.deviceInfoThrows
            ? () => { throw new Error('device-info-unavailable'); }
            : () => ({ platform: options.platform ?? 'android', SDKVersion: options.sdkVersion ?? '2.11.3' }),
        getSystemInfoSync: options.systemInfoThrows
            ? () => { throw new Error('system-info-unavailable'); }
            : () => ({ platform: options.systemPlatform ?? options.platform ?? 'android', SDKVersion: options.systemSdkVersion ?? options.sdkVersion ?? '2.11.3' }),
        showShareMenu: (menuOptions) => {
            calls.showMenuOptions.push({
                withShareTicket: menuOptions.withShareTicket,
                menus: menuOptions.menus ? [...menuOptions.menus] : undefined,
            });
            const outcome = outcomes.shift() ?? 'success';
            const error = {
                errMsg: 'showShareMenu:fail access_token=top-secret&openid=test-openid&code=test-code&session_key=test-session',
            };
            if (outcome === 'throw') {
                throw new Error('showShareMenu:fail access_token=top-secret&openid=test-openid&code=test-code&session_key=test-session');
            }
            if (outcome === 'fail') {
                menuOptions.fail?.(error);
                menuOptions.complete?.(error);
                return;
            }
            menuOptions.success?.();
            menuOptions.complete?.({ errMsg: 'showShareMenu:ok' });
        },
    };
    const moduleExports = {};
    const context = {
        exports: moduleExports,
        module: { exports: moduleExports },
        console: {
            info: (...values) => calls.logs.push({ level: 'info', text: toLogText(values) }),
            warn: (...values) => calls.logs.push({ level: 'warn', text: toLogText(values) }),
        },
        setTimeout: (callback) => {
            calls.timers.push(callback);
            return calls.timers.length;
        },
        clearTimeout: () => undefined,
    };
    context.globalThis = context;
    if (!options.noWx) {
        context.wx = wxApi;
    }
    vm.runInNewContext(compileShareManager(), context, { filename: 'WeChatShareManager.ts' });
    const manager = context.exports.WeChatShareManager;
    const flushTimers = () => {
        while (calls.timers.length > 0) {
            calls.timers.shift()();
        }
    };
    return { calls, wxApi, manager, flushTimers };
};

const runShareBehaviorStubs = () => {
    const results = {};

    const noWx = createShareHarness({ noWx: true });
    noWx.manager.initialize(GAME_VERSION);
    check(noWx.calls.showMenuOptions.length === 0 && noWx.calls.friendListeners.length === 0,
        'share/no-wx-safe-skip', noWx.calls);
    results.noWx = noWx.calls;

    const android = createShareHarness();
    android.manager.initialize(GAME_VERSION);
    android.manager.initialize(GAME_VERSION);
    check(android.calls.friendListeners.length === 1 && android.calls.timelineListeners.length === 1,
        'share/android-registers-each-listener-once', android.calls);
    check(android.calls.showMenuOptions.length === 1
        && JSON.stringify(android.calls.showMenuOptions[0].menus) === JSON.stringify(['shareAppMessage', 'shareTimeline'])
        && android.calls.showMenuOptions[0].withShareTicket === false,
    'share/android-requests-friend-and-timeline', android.calls.showMenuOptions);
    check(android.calls.friendListeners[0]?.().title === '羊狼四线战'
        && android.calls.timelineListeners[0]?.().title === '羊狼四线战',
    'share/android-listeners-return-title-only');
    check(android.calls.logs.some((entry) => entry.level === 'info'
        && entry.text.includes(GAME_VERSION)
        && entry.text.includes('android')
        && entry.text.includes('2.11.3')),
    'share/android-diagnostics-include-version-platform-sdk', android.calls.logs);
    results.android = android.calls;

    const ios = createShareHarness({ platform: 'ios' });
    ios.manager.initialize(GAME_VERSION);
    check(ios.calls.friendListeners.length === 1 && ios.calls.timelineListeners.length === 0,
        'share/ios-keeps-friend-listener-only', ios.calls);
    check(ios.calls.showMenuOptions.length === 1
        && JSON.stringify(ios.calls.showMenuOptions[0].menus) === JSON.stringify(['shareAppMessage']),
    'share/ios-does-not-request-timeline', ios.calls.showMenuOptions);
    results.ios = ios.calls;

    const lowSdk = createShareHarness({ platform: 'android', sdkVersion: '2.11.2' });
    lowSdk.manager.initialize(GAME_VERSION);
    check(lowSdk.calls.friendListeners.length === 1 && lowSdk.calls.timelineListeners.length === 0,
        'share/low-sdk-keeps-friend-listener', lowSdk.calls);
    check(lowSdk.calls.showMenuOptions.length === 1 && lowSdk.calls.showMenuOptions[0].menus === undefined,
        'share/low-sdk-omits-unsupported-menu-array', lowSdk.calls.showMenuOptions);
    results.lowSdk = lowSdk.calls;

    const missingTimeline = createShareHarness({ omitTimelineApi: true });
    missingTimeline.manager.initialize(GAME_VERSION);
    check(missingTimeline.calls.friendListeners.length === 1
        && missingTimeline.calls.timelineListeners.length === 0
        && JSON.stringify(missingTimeline.calls.showMenuOptions[0]?.menus) === JSON.stringify(['shareAppMessage']),
    'share/missing-timeline-api-keeps-friend-sharing', missingTimeline.calls);
    results.missingTimeline = missingTimeline.calls;

    const fallbackInfo = createShareHarness({ deviceInfoThrows: true, systemPlatform: 'android', systemSdkVersion: '2.11.3' });
    fallbackInfo.manager.initialize(GAME_VERSION);
    check(fallbackInfo.calls.timelineListeners.length === 1
        && JSON.stringify(fallbackInfo.calls.showMenuOptions[0]?.menus) === JSON.stringify(['shareAppMessage', 'shareTimeline']),
    'share/system-info-fallback-preserves-android-timeline', fallbackInfo.calls);
    results.fallbackInfo = fallbackInfo.calls;

    const recovery = createShareHarness({ omitFriendApi: true });
    recovery.manager.initialize(GAME_VERSION);
    recovery.wxApi.onShareAppMessage = (listener) => recovery.calls.friendListeners.push(listener);
    recovery.manager.initialize(GAME_VERSION);
    check(recovery.calls.friendListeners.length === 1 && recovery.calls.showMenuOptions.length === 1,
        'share/missing-api-does-not-lock-future-initialize', recovery.calls);
    results.recovery = recovery.calls;

    const friendFallback = createShareHarness({ outcomes: ['fail', 'success'] });
    friendFallback.manager.initialize(GAME_VERSION);
    friendFallback.flushTimers();
    check(friendFallback.calls.friendListeners.length === 1 && friendFallback.calls.timelineListeners.length === 1,
        'share/fallback-does-not-duplicate-listeners', friendFallback.calls);
    check(friendFallback.calls.showMenuOptions.length === 2
        && JSON.stringify(friendFallback.calls.showMenuOptions[0].menus) === JSON.stringify(['shareAppMessage', 'shareTimeline'])
        && JSON.stringify(friendFallback.calls.showMenuOptions[1].menus) === JSON.stringify(['shareAppMessage']),
    'share/timeline-failure-falls-back-to-friend-once', friendFallback.calls.showMenuOptions);
    const fallbackLogText = friendFallback.calls.logs.map((entry) => entry.text).join('\n');
    check(!/top-secret|test-openid|test-code|test-session/.test(fallbackLogText)
        && fallbackLogText.includes('[redacted]')
        && fallbackLogText.includes('完成'),
    'share/failure-log-is-redacted-and-complete-is-recorded', friendFallback.calls.logs);
    results.friendFallback = friendFallback.calls;

    const boundedFailure = createShareHarness({ outcomes: ['fail', 'fail'] });
    boundedFailure.manager.initialize(GAME_VERSION);
    boundedFailure.flushTimers();
    check(boundedFailure.calls.showMenuOptions.length === 2 && boundedFailure.calls.timers.length === 0,
        'share/retry-is-bounded-to-two-total-menu-attempts', boundedFailure.calls);
    results.boundedFailure = boundedFailure.calls;

    const synchronousThrow = createShareHarness({ outcomes: ['throw', 'throw'] });
    synchronousThrow.manager.initialize(GAME_VERSION);
    synchronousThrow.flushTimers();
    const throwLogText = synchronousThrow.calls.logs.map((entry) => entry.text).join('\n');
    check(synchronousThrow.calls.friendListeners.length === 1
        && synchronousThrow.calls.timelineListeners.length === 1
        && synchronousThrow.calls.showMenuOptions.length === 2
        && !/top-secret|test-openid|test-code|test-session/.test(throwLogText)
        && throwLogText.includes('[redacted]'),
    'share/synchronous-error-is-redacted-and-retry-is-bounded', synchronousThrow.calls);
    results.synchronousThrow = synchronousThrow.calls;

    return results;
};

const findControllerState = async (page) => page.evaluate(async () => {
    const cc = globalThis.cc;
    if (!cc) return null;
    const scene = cc.director.getScene();
    if (!scene) return null;
    const nodes = [];
    const visit = (node) => {
        nodes.push(node);
        node.children.forEach(visit);
    };
    visit(scene);
    const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
        typeof component?.showLevelSelect === 'function'
        && component?.audioManager
        && typeof component.audioManager.getMusicVolume === 'function');
    if (!controller) return null;
    const manager = controller.audioManager;
    const storedText = localStorage.getItem('wolf-sheep-battle.audio-settings.v1');
    let stored;
    try {
        stored = storedText ? JSON.parse(storedText) : null;
    } catch {
        stored = 'unparseable';
    }
    return {
        selectedBgmId: manager.getSelectedBgmId(),
        musicVolume: manager.getMusicVolume(),
        sfxVolume: manager.getSfxVolume(),
        musicEnabled: manager.isMusicEnabled(),
        sfxEnabled: manager.isSfxEnabled(),
        lastNonZeroMusicVolume: manager.lastNonZeroMusicVolume,
        lastNonZeroSfxVolume: manager.lastNonZeroSfxVolume,
        desiredBgm: manager.desiredBgm,
        currentBgm: manager.currentBgm,
        requestToken: manager.bgmRequestToken,
        audioActivated: manager.isAudioActivated(),
        playbackConfirmed: manager.isBgmPlaybackConfirmed(),
        sourcePlaying: Boolean(manager.bgmSource?.playing),
        sourceHasClip: Boolean(manager.bgmSource?.clip),
        sourceNodeId: manager.bgmSource?.node?.uuid ?? manager.bgmSource?.node?._id,
        sourceChildren: manager.node.children.filter((node) => node.name === 'BgmAudioSource').length,
        managerNodeName: manager.node.name,
        stored,
    };
});

const waitForController = async (page) => {
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForFunction(() => {
        const cc = globalThis.cc;
        if (!cc) return false;
        const scene = cc.director.getScene();
        if (!scene) return false;
        const nodes = [];
        const visit = (node) => {
            nodes.push(node);
            node.children.forEach(visit);
        };
        visit(scene);
        return nodes.flatMap((node) => node.components ?? []).some((component) =>
            typeof component?.showLevelSelect === 'function'
            && component?.audioManager?.bgmSource);
    }, null, { timeout: 60000 });
};

const withBrowserCase = async (browser, name, storedSettings, action) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
    await context.addInitScript((initialSettings) => {
        if (!sessionStorage.getItem('__share02Audio01QaInitialized')) {
            localStorage.clear();
            if (initialSettings !== undefined) {
                const serialized = typeof initialSettings === 'string'
                    ? initialSettings : JSON.stringify(initialSettings);
                localStorage.setItem('wolf-sheep-battle.audio-settings.v1', serialized);
            }
            sessionStorage.setItem('__share02Audio01QaInitialized', 'true');
        }
    }, storedSettings);
    const page = await context.newPage();
    const consoleProblems = [];
    const requestFailures = [];
    const httpFailures = [];
    page.on('console', (message) => {
        if (message.type() === 'warning' || message.type() === 'error') {
            const isExpectedFaviconMessage = /Failed to load resource: the server responded with a status of 404/i
                .test(message.text());
            if (!isExpectedFaviconMessage) {
                consoleProblems.push({ type: message.type(), text: message.text() });
            }
        }
    });
    page.on('pageerror', (error) => consoleProblems.push({ type: 'pageerror', text: error.message }));
    page.on('requestfailed', (request) => requestFailures.push({
        url: request.url(),
        failure: request.failure()?.errorText ?? 'unknown',
    }));
    page.on('response', (response) => {
        if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
            httpFailures.push({ url: response.url(), status: response.status() });
        }
    });
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForController(page);
    const initial = await findControllerState(page);
    const actionResult = action ? await action(page) : undefined;
    const final = await findControllerState(page);
    await context.close();
    return { name, initial, actionResult, final, consoleProblems, requestFailures, httpFailures };
};

const runAudioBrowserAudit = async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        args: ['--autoplay-policy=no-user-gesture-required'],
    });
    try {
        const defaults = await withBrowserCase(browser, 'new-user-defaults', undefined, async (page) => {
            await page.mouse.click(32, 32);
            await page.waitForTimeout(1000);
            await waitForController(page);
            const afterGesture = await findControllerState(page);
            const directContinuity = await page.evaluate(async () => {
                const cc = globalThis.cc;
                if (!cc) return null;
                const scene = cc.director.getScene();
                if (!scene) return null;
                const nodes = [];
                const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
                visit(scene);
                const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
                    typeof component?.showLevelSelect === 'function' && component?.audioManager);
                const manager = controller.audioManager;
                const before = {
                    token: manager.bgmRequestToken,
                    sourceNodeId: manager.bgmSource.node.uuid ?? manager.bgmSource.node._id,
                    desired: manager.desiredBgm,
                };
                manager.requestMenuBgm();
                manager.requestBattleBgm();
                manager.requestMenuBgm();
                const after = {
                    token: manager.bgmRequestToken,
                    sourceNodeId: manager.bgmSource.node.uuid ?? manager.bgmSource.node._id,
                    desired: manager.desiredBgm,
                };
                controller.showLevelSelect();
                controller.beginBattle();
                controller.activateBattle();
                controller.leaveBattleToLevelSelect();
                controller.returnToTitle();
                return { before, after };
            });
            await page.waitForTimeout(750);
            const afterFlow = await findControllerState(page);
            await page.evaluate(async () => {
                const cc = globalThis.cc;
                if (!cc) return;
                const scene = cc.director.getScene();
                if (!scene) return;
                const nodes = [];
                const visit = (node) => { nodes.push(node); node.children.forEach(visit); };
                visit(scene);
                const controller = nodes.flatMap((node) => node.components ?? []).find((component) =>
                    typeof component?.showLevelSelect === 'function' && component?.audioManager);
                const manager = controller.audioManager;
                manager.setMusicVolume(0.63);
                manager.setSfxVolume(0.57);
                manager.selectBgmTrack('cyberwave_upbeat');
                manager.setMusicEnabled(false);
            });
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
            await waitForController(page);
            const afterReload = await findControllerState(page);
            return { afterGesture, directContinuity, afterFlow, afterReload };
        });

        const validStored = await withBrowserCase(browser, 'valid-existing-settings', {
            selectedBgmId: 'cyberwave_upbeat',
            musicVolume: 0.37,
            sfxVolume: 0.62,
            musicMuted: true,
            sfxMuted: false,
            lastNonZeroMusicVolume: 0.37,
            lastNonZeroSfxVolume: 0.62,
        });

        const invalidStored = await withBrowserCase(browser, 'invalid-existing-settings', {
            selectedBgmId: 'cheerful_lighthearted',
            musicVolume: -1,
            sfxVolume: 2,
            musicMuted: false,
            sfxMuted: false,
            lastNonZeroMusicVolume: 0.4,
            lastNonZeroSfxVolume: 0.6,
        });

        const malformedStored = await withBrowserCase(browser, 'malformed-settings', '{"broken":', undefined);

        const defaultInitial = defaults.initial;
        check(defaultInitial?.selectedBgmId === 'cheerful_lighthearted'
            && defaultInitial?.musicVolume === 0.8
            && defaultInitial?.sfxVolume === 0.8
            && defaultInitial?.lastNonZeroMusicVolume === 0.8
            && defaultInitial?.lastNonZeroSfxVolume === 0.8,
        'audio/new-user-defaults-are-80-and-cheerful', defaultInitial);
        check(defaultInitial?.stored?.musicVolume === 0.8
            && defaultInitial?.stored?.sfxVolume === 0.8
            && defaultInitial?.stored?.selectedBgmId === 'cheerful_lighthearted',
        'audio/new-user-defaults-persisted', defaultInitial?.stored);

        check(validStored.initial?.selectedBgmId === 'cyberwave_upbeat'
            && validStored.initial?.musicVolume === 0
            && validStored.initial?.sfxVolume === 0.62
            && validStored.initial?.musicEnabled === false
            && validStored.initial?.sfxEnabled === true
            && validStored.initial?.lastNonZeroMusicVolume === 0.37
            && validStored.initial?.lastNonZeroSfxVolume === 0.62,
        'audio/legal-existing-settings-and-mute-are-preserved', validStored.initial);

        check(invalidStored.initial?.selectedBgmId === 'cheerful_lighthearted'
            && invalidStored.initial?.musicVolume === 0.8
            && invalidStored.initial?.sfxVolume === 0.8
            && invalidStored.initial?.lastNonZeroMusicVolume === 0.8
            && invalidStored.initial?.lastNonZeroSfxVolume === 0.8
            && invalidStored.initial?.stored?.musicVolume === 0.8
            && invalidStored.initial?.stored?.sfxVolume === 0.8,
        'audio/invalid-volume-settings-fall-back-and-repair-to-80', invalidStored.initial);

        check(malformedStored.initial?.selectedBgmId === 'cheerful_lighthearted'
            && malformedStored.initial?.musicVolume === 0.8
            && malformedStored.initial?.sfxVolume === 0.8
            && malformedStored.initial?.lastNonZeroMusicVolume === 0.8
            && malformedStored.initial?.lastNonZeroSfxVolume === 0.8
            && malformedStored.initial?.stored?.musicVolume === 0.8
            && malformedStored.initial?.stored?.sfxVolume === 0.8,
        'audio/malformed-settings-fall-back-and-repair-to-80', malformedStored.initial);

        const lifecycle = defaults.actionResult;
        check((lifecycle?.afterGesture?.audioActivated === true
                || (lifecycle?.afterGesture?.playbackConfirmed === true
                    && lifecycle.afterGesture.sourcePlaying === true))
            && lifecycle.afterGesture.desiredBgm === 'cheerful_lighthearted'
            && lifecycle.afterGesture.sourceHasClip === true,
        'audio/first-real-touch-preserves-or-establishes-persistent-bgm-intent', lifecycle?.afterGesture);
        check(lifecycle?.afterFlow?.managerNodeName === 'GlobalAudioManager'
            && lifecycle.afterFlow.sourceChildren === 1
            && lifecycle.afterFlow.sourceNodeId === lifecycle.afterGesture.sourceNodeId
            && lifecycle.afterFlow.desiredBgm === 'cheerful_lighthearted',
        'audio/navigation-keeps-one-global-manager-and-one-bgm-source', lifecycle?.afterFlow);
        check(lifecycle?.directContinuity?.before.sourceNodeId === lifecycle?.directContinuity?.after.sourceNodeId
            && lifecycle?.directContinuity?.before.desired === lifecycle?.directContinuity?.after.desired
            && (!lifecycle.afterGesture.sourcePlaying
                || lifecycle.directContinuity.before.token === lifecycle.directContinuity.after.token),
        'audio/same-track-menu-battle-requests-do-not-restart-playing-bgm', lifecycle?.directContinuity);
        check(lifecycle?.afterReload?.selectedBgmId === 'cyberwave_upbeat'
            && lifecycle.afterReload.musicVolume === 0
            && lifecycle.afterReload.sfxVolume === 0.57
            && lifecycle.afterReload.musicEnabled === false
            && lifecycle.afterReload.lastNonZeroMusicVolume === 0.63,
        'audio/player-adjustments-and-mute-survive-restart', lifecycle?.afterReload);

        const expectedConsolePatterns = [
            /WebGL.*performance caveat/i,
            /The AudioContext was not allowed to start/i,
            /deprecated.*LabelOutline\.(?:color|width)/i,
            /\[WolfSheepBattle\]\[Audio\] Audio settings are invalid; defaults will be used\./i,
        ];
        const browserCases = [defaults, validStored, invalidStored, malformedStored];
        for (const browserCase of browserCases) {
            const unexpected = browserCase.consoleProblems.filter((problem) =>
                !expectedConsolePatterns.some((pattern) => pattern.test(problem.text)));
            check(unexpected.length === 0, `audio/${browserCase.name}-no-unexpected-console-problems`, unexpected);
            check(browserCase.requestFailures.length === 0,
                `audio/${browserCase.name}-no-request-failures`, browserCase.requestFailures);
            check(browserCase.httpFailures.length === 0,
                `audio/${browserCase.name}-no-unexpected-http-failures`, browserCase.httpFailures);
        }

        return { defaults, validStored, invalidStored, malformedStored };
    } finally {
        await browser.close();
    }
};

const shareStubs = runShareBehaviorStubs();
const audioBrowser = await runAudioBrowserAudit();
const result = {
    batch: GAME_VERSION,
    previewUrl: PREVIEW_URL,
    shareStubs,
    audioBrowser,
    checks,
    passed: checks.every((entry) => entry.passed),
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'share02_audio01_runtime_audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
    passed: result.passed,
    checks,
}, null, 2));
if (!result.passed) {
    process.exitCode = 1;
}
