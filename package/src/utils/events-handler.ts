type Callback = (...args: any[]) => void;

export type BaseEventsMap = {
	[event: string]: Callback;
};

export class EventsHandler<TEventsMap extends BaseEventsMap = BaseEventsMap> {
	#callbacksMap: Map<string, Callback[]>;
	#globalCallbacks: Callback[];

	constructor() {
		this.#callbacksMap = new Map();
		this.#globalCallbacks = [];
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
		const callbacks = this.#callbacksMap.get(event) ?? [];
		callbacks.push(callback);
		this.#callbacksMap.set(event as string, callbacks);
	}

	removeEventListener<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		const callbacks = this.#callbacksMap.get(event);
		if (!callbacks) return;
		callbacks.splice(callbacks.indexOf(callback), 1);
	}

	subscribe<K extends keyof TEventsMap>(
		event: K extends string ? K : never,
		callback: TEventsMap[K],
	) {
		const callbacks = this.#callbacksMap.get(event) ?? [];
		callbacks.push(callback);
		this.#callbacksMap.set(event as string, callbacks);
		return () => {
			callbacks.splice(callbacks.indexOf(callback), 1);
		};
	}

	subscribeAll<K extends keyof TEventsMap>(
		callback: (event: K, ...args: Parameters<TEventsMap[K]>) => void,
	) {
		this.#globalCallbacks.push(callback);
		return () => {
			this.#globalCallbacks.splice(this.#globalCallbacks.indexOf(callback), 1);
		};
	}

	unsubscribeAll<K extends keyof TEventsMap>(callback: TEventsMap[K]) {
		this.#globalCallbacks.splice(this.#globalCallbacks.indexOf(callback), 1);
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
