import PartySocket, { type PartySocketOptions } from 'partysocket';
import type { CallAction } from '../types/call-socket';

export class CallSocket extends PartySocket {
	constructor(options: PartySocketOptions) {
		super(options);
	}

	sendAction(action: CallAction) {
		console.log('CallSocket:sendAction', action)
		return this.send(JSON.stringify(action));
	}
}
