import type { PartyTracks } from 'partytracks/client';
import type { CallSocket } from './call-socket';
import invariant from 'tiny-invariant';

export type CallContext = {
	socket: CallSocket;
	partyTracks: PartyTracks;
};

const contextStack: CallContext[] = [];

export function runWithContext<T>(context: CallContext, fn: () => T): T {
	contextStack.push(context);
	try {
		return fn();
	} finally {
		contextStack.pop();
	}
}

export function getCurrentCallContext(): CallContext {
	const ctx = contextStack.at(-1);
	if (!ctx) invariant(ctx, 'No active CallContext');
	return ctx;
}
