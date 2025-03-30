import {
	CallClient,
	type CallClientOptions,
} from './lib/call-client/call-client';

export function createCallClient(options: CallClientOptions) {
	return new CallClient(options);
}

export type {
	SerializedUser,
	CallEvent,
	CallAction,
} from './types/call-socket';
