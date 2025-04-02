type Callback = (...args: any[]) => void;

export type BaseEventsMap = {
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

	addEventListener<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		const callbacks = this.#callbacksMap.get(event) ?? new Set();
		callbacks.add(callback);
		this.#callbacksMap.set(event as string, callbacks);
	}

	removeEventListener<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		const callbacks = this.#callbacksMap.get(event);
		if (!callbacks) return;
		callbacks.delete(callback);
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

	once<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	): () => void {
		const wrapper = (...args: Parameters<TEventsMap[K]>) => {
			this.removeEventListener(event, wrapper as TEventsMap[K]);
			callback(...args);
		};

		this.addEventListener(event, wrapper as TEventsMap[K]);

		return () => {
			this.removeEventListener(event, wrapper as TEventsMap[K]);
		};
	}

	clearAll() {
		this.#callbacksMap.clear();
	}
}
