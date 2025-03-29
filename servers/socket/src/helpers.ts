import type { CallAction, CallEvent } from 'callskit';

export function createEvent(event: CallEvent) {
	return JSON.stringify(event);
}

export function parseAction(action: string): CallAction {
	return JSON.parse(action);
}
