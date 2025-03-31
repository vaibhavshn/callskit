import PartySocket, { type PartySocketOptions } from 'partysocket';
import type { CallAction } from '../types/call-socket';
import type { Logger } from '../utils/logger';

export class CallSocket extends PartySocket {
	#logger: Logger;

	constructor(options: PartySocketOptions & { logger: Logger }) {
		super(options);
		this.#logger = options.logger;
	}

	sendAction(action: CallAction) {
		this.#logger.debug('CallSocket:sendAction', action);
		return this.send(JSON.stringify(action));
	}
}
