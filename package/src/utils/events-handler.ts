type Callback = (...args: any[]) => void;

type BaseEventsMap = {
	[event: string]: Callback;
};

export class EventsHandler<TEventsMap extends BaseEventsMap = BaseEventsMap> {
	#callbacksMap: Map<string, Set<Callback>>;
	#globalCallbacks: Set<Callback>;

	constructor() {
		this.#callbacksMap = new Map();
		this.#globalCallbacks = new Set();
	}

	emit<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		...args: Parameters<TEventsMap[K]>
	) {
		const callbacks = this.#callbacksMap.get(event);
		callbacks?.forEach((callback) => callback(...args));
		this.#globalCallbacks.forEach((callback) => callback(event, ...args));
	}

	subscribe<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		const callbacks = this.#callbacksMap.get(event) ?? new Set();
		callbacks.add(callback);
		this.#callbacksMap.set(event as string, callbacks);
		return () => {
			callbacks.delete(callback);
		};
	}

	unsubscribe<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		const callbacks = this.#callbacksMap.get(event);
		if (!callbacks) return;
		callbacks.delete(callback);
	}

	subscribeAll<K extends keyof TEventsMap>(
		callback: (event: K, ...args: Parameters<TEventsMap[K]>) => void,
	) {
		this.#globalCallbacks.add(callback);
		return () => {
			this.#globalCallbacks.delete(callback);
		};
	}

	unsubscribeAll<K extends keyof TEventsMap>(callback: TEventsMap[K]) {
		this.#globalCallbacks.delete(callback);
	}

	clearAll() {
		this.#callbacksMap.clear();
	}
}
