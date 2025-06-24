import throttle from 'lodash-es/throttle';
import React from 'react';
import invariant from 'tiny-invariant';
import { CallClient } from '../lib/call-client/call-client';
import { shallow } from './shallow';
import { EventsHandler } from '../utils/events-handler';

type Callback = () => void;

type CallContext = {
	call: CallClient | undefined;
	subscribe: (callback: Callback) => () => void;
};

const CallContext = React.createContext<CallContext | undefined>(undefined);

export type CallProviderProps = {
	call: CallClient | undefined;
	fallback?: React.ReactNode;
};

export function CallProvider({
	call,
	fallback,
	children,
}: React.PropsWithChildren<CallProviderProps>) {
	const callbacks = React.useRef(new Set<Callback>());

	const subscribe = React.useCallback((callback: Callback) => {
		callbacks.current.add(callback);
		return () => callbacks.current.delete(callback);
	}, []);

	React.useEffect(() => {
		if (!call) return;

		const onCallback = throttle(() => {
			callbacks.current.forEach((cb) => cb());
		}, 180);

		const unsubscribeCall = call.subscribeAll(onCallback);
		const unsubscribeSelf = call.self.subscribeAll(onCallback);
		const unsubscribeChat = call.chat.subscribeAll(onCallback);

		return () => {
			unsubscribeCall();
			unsubscribeSelf();
			unsubscribeChat();
		};
	}, [call]);

	return (
		<CallContext.Provider value={{ call, subscribe }}>
			{call ? children : fallback}
		</CallContext.Provider>
	);
}

export function useCall() {
	const ctx = React.useContext(CallContext);
	invariant(ctx?.call, 'useCall must be used within a CallProvider');
	return ctx.call;
}

type StateSelector<O extends object, S> = (obj: O) => S;

export function useCallSelector<CallSlice>(
	selector: StateSelector<CallClient, CallSlice>,
) {
	const ctx = React.useContext(CallContext);
	invariant(ctx?.call, 'useCallSelector must be used within a CallProvider');
	const { call, subscribe } = ctx;

	const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

	const selectorRef = React.useRef(selector);
	selectorRef.current = selector;

	const slice = selectorRef.current(call);
	const sliceRef = React.useRef(slice);
	sliceRef.current = slice;

	React.useEffect(() => {
		const unsubscribe = subscribe(() => {
			const nextSlice = selectorRef.current(call);
			if (!shallow(sliceRef.current, nextSlice)) {
				forceUpdate();
			}
		});
		return unsubscribe;
	}, [subscribe, call]);

	React.useEffect(() => {
		if (slice instanceof EventsHandler) {
			const unsubscribe = slice.subscribeAll(() => {
				forceUpdate();
			});
			return unsubscribe;
		}
	}, [slice]);

	return slice;
}
