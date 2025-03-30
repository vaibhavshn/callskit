import throttle from 'lodash-es/throttle';
import React from 'react';
import invariant from 'tiny-invariant';
import { CallClient } from '../lib/call-client/call-client';
import { shallow } from './shallow';

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
			console.log('onCallback()');
			callbacks.current.forEach((cb) => cb());
		}, 200);

		call.subscribeAll(onCallback);
		call.self.subscribeAll(onCallback);

		return () => {
			call.unsubscribeAll(onCallback);
			call.self.unsubscribeAll(onCallback);
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
	const call = ctx.call;

	const [slice, setSlice] = React.useState(() => selector(call));
	const prevSlice = React.useRef<CallSlice>(slice);

	React.useEffect(() => {
		return ctx.subscribe(() => {
			const next = selector(call);
			if (!shallow(prevSlice.current, next)) {
				prevSlice.current = next;
				setSlice(next);
			}
		});
	}, []);

	return slice;
}
