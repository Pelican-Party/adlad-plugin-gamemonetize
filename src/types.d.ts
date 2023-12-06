interface Window {
	SDK_OPTIONS?: {
		gameId: string;
		onEvent(event: GdEvent);
	};
	sdk: {
		showBanner(): void;
		openConsole();
	};
}

interface GdEvent {
	name: "SDK_READY" | "SDK_GAME_START" | "SDK_GAME_PAUSE" | "COMPLETE";
}
