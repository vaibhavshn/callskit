import { CallClient, type CallClientOptions } from './lib/call-client';

export function createCallClient(options: CallClientOptions) {
	return new CallClient(options);
}
