/**
 * @param {Object} options
 * @param {string} options.gameId
 */
export function gameMonetizePlugin({
	gameId,
}) {
	let didShowAd = false;
	let resolveShowAd = () => {};

	const plugin = /** @type {const} @satisfies {import("$adlad").AdLadPlugin} */ ({
		name: "gamemonetize",
		async initialize(ctx) {
			if (window.SDK_OPTIONS) {
				throw new Error("GameMonetize plugin is being initialized more than once");
			}

			/** @type {() => void} */
			let resolveInitialize;
			/** @type {Promise<void>} */
			const initializePromise = new Promise((resolve) => {
				resolveInitialize = resolve;
			});

			window.SDK_OPTIONS = {
				gameId,
				onEvent(event) {
					if (event.name == "SDK_READY") {
						resolveInitialize();
					} else if (event.name == "SDK_GAME_PAUSE") {
						ctx.setNeedsPause(true);
						ctx.setNeedsMute(true);
					} else if (event.name == "SDK_GAME_START") {
						ctx.setNeedsMute(false);
						ctx.setNeedsPause(false);
						// The sdk always fires SDK_GAME_START after a call to `window.sdk.showBanner()`,
						// even when no ad was shown. So we can use this to resolve the promise.
						resolveShowAd();
					} else if (event.name == "COMPLETE") {
						didShowAd = true;
					}
				},
			};

			let timeoutId = -1;
			/** @type {Promise<void>} */
			const timeoutPromise = new Promise((resolve) => {
				timeoutId = setTimeout(() => {
					// When an ad blocker is in use, the sdk seems to just throw an error without ever giving us any
					// events to hook onto. So we'll just add a timeout and resolve the initialize promise.
					// That way at least games don't get stuck hanging on the adLad.init() call.
					console.warn("gamemonetize plugin timed out during initialization, an ad blocker may be in use");
					resolve();
				}, 10_000);
			});

			await ctx.loadScriptTag("https://api.gamemonetize.com/sdk.js");

			await Promise.race([initializePromise, timeoutPromise]);
			clearTimeout(timeoutId);

			if (ctx.useTestAds) {
				// Calling openConsole multiple times makes the console unresponsive:
				// https://github.com/GameDistribution/GD-HTML5/issues/207
				// But the sdk remembers if it has been called before and automatically opens on page load.
				// To work around this we check if it has the 'gd_debug_ex' localStorage flag has been set.
				// This is not a public api but it's the best we can do.
				if (!localStorage.gd_debug_ex) {
					window.sdk.openConsole();
				}
			}
		},
		manualNeedsMute: true,
		manualNeedsPause: true,
		async showFullScreenAd() {
			didShowAd = false;

			/** @type {Promise<void>} */
			const promise = new Promise((resolve) => {
				resolveShowAd = resolve;
			});

			window.sdk.showBanner();

			await promise;

			return {
				didShowAd,
				errorReason: null,
			};
		},
	});

	return plugin;
}
