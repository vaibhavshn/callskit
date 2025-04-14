import { useCallback, useState } from 'react';
import {
	CallClient,
	type CallClientOptions,
} from '../lib/call-client/call-client';
import { createCallClient } from '..';

export function useCreateCall() {
	const [call, setCall] = useState<CallClient>();

	const createCall = useCallback(async (options: CallClientOptions) => {
		const call = await createCallClient(options);
		setCall(call);
		return call;
	}, []);

	return [call, createCall] as const;
}

export * from './context';
