import type { PartyTracks } from 'partytracks/client';
import type { BehaviorSubject } from 'rxjs';
import invariant from 'tiny-invariant';
import type { Logger } from '../utils/logger';
import type { CameraRID } from './call-self/call-self';
import type { CallSocket } from './call-socket';
import type { CallParticipantMap } from './participant-map';

export type CallContext = {
	socket: CallSocket;
	partyTracks: PartyTracks;
	participants: CallParticipantMap;
	logger: Logger;
	cameraRid$: BehaviorSubject<CameraRID>;
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
	const ctx = contextStack[contextStack.length - 1];
	if (!ctx) invariant(ctx, 'No active CallContext');
	return ctx;
}
