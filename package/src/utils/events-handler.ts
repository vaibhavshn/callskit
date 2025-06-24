/** A function type that accepts any number of arguments and returns no value. */
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
		this.#callbacksMap.get(event)?.forEach((callback) => callback(...args));
		this.#globalCallbacks.forEach((callback) => callback(event, ...args));
	}

	addEventListener<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		if (!this.#callbacksMap.has(event)) {
			this.#callbacksMap.set(event, new Set());
		}
		this.#callbacksMap.get(event)!.add(callback);
	}

	removeEventListener<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		this.#callbacksMap.get(event)?.delete(callback);
	}

	subscribe<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		this.addEventListener(event, callback);
		return () => this.removeEventListener(event, callback);
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
		this.#globalCallbacks.clear();
	}
}
