import {
	CallClient,
	type CallClientOptions,
} from './lib/call-client/call-client';

export async function createCallClient(options: CallClientOptions) {
	return new Promise<CallClient>((resolve, reject) => {
		const client = new CallClient(options);
		let socketConnected = false,
			mediaConnected = false;
		const checkConnection = () => {
			if (socketConnected && mediaConnected) {
				resolve(client);
			}
		};
		client.once('connected', () => {
			socketConnected = true;
			checkConnection();
		});
		client.once('mediaConnected', () => {
			mediaConnected = true;
			checkConnection();
		});
		setTimeout(() => {
			if (!socketConnected && !mediaConnected) {
				reject(new Error('Both socket and media connections timed out'));
			} else if (!socketConnected) {
				reject(new Error('Socket connection timed out'));
			} else if (!mediaConnected) {
				reject(new Error('Media connection timed out'));
			}
		}, 10_000);
	});
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
