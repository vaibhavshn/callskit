import { useCallback, useState } from 'react';
import {
	CallClient,
	type CallClientOptions,
} from '../lib/call-client/call-client';

export function useCreateCall() {
	const [call, setCall] = useState<CallClient>();

	const createCall = useCallback((options: CallClientOptions) => {
		setCall((prevCall) => (prevCall ? prevCall : new CallClient(options)));
	}, []);

	return [call, createCall] as const;
}

export * from './context';
