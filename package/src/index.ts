import {
	CallClient,
	type CallClientOptions,
} from './lib/call-client/call-client';

export function createCallClient(options: CallClientOptions) {
	return new CallClient(options);
}

export type { CallClient, CallClientOptions };
export type {
	SerializedUser,
	CallEvent,
	CallAction,
} from './types/call-socket';
export type * from './lib/call-self/call-self';
export type * from './lib/call-participant/call-participant';
export type * from './lib/call-socket';
export type * from './lib/call-chat/call-chat';
