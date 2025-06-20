import { EventsHandler } from '../../utils/events-handler';
import { CallParticipant } from '../call-participant/call-participant';

export type ParticipantMapEvents = {
	added: (participant: CallParticipant) => void;
	updated: (participant: CallParticipant) => void;
	removed: (participant: CallParticipant) => void;
	cleared: () => void;

	// emitted from CallParticipant
	micUpdate: (participant: CallParticipant) => void;
	cameraUpdate: (participant: CallParticipant) => void;
	screenshareUpdate: (participant: CallParticipant) => void;
	// volumeChange: (participant: CallParticipant, lastVolume: number) => void;
};

export class CallParticipantMap
	extends EventsHandler<ParticipantMapEvents>
	implements Map<string, CallParticipant>
{
	#participants = new Map<string, CallParticipant>();

	constructor() {
		super();
	}

	get(id: string): CallParticipant | undefined {
		return this.#participants.get(id);
	}

	set(id: string, participant: CallParticipant) {
		const isUpdate = this.#participants.has(id);
		this.#participants.set(id, participant);
		this.emit(isUpdate ? 'updated' : 'added', participant);
		return this;
	}

	delete(id: string) {
		const removed = this.#participants.get(id);
		const didDelete = this.#participants.delete(id);
		if (didDelete && removed) {
			this.emit('removed', removed);
		}
		return didDelete;
	}

	has(id: string) {
		return this.#participants.has(id);
	}

	values() {
		return this.#participants.values();
	}

	keys() {
		return this.#participants.keys();
	}

	entries() {
		return this.#participants.entries();
	}

	forEach(
		callbackfn: (
			value: CallParticipant,
			key: string,
			map: Map<string, CallParticipant>,
		) => void,
		thisArg?: any,
	) {
		return this.#participants.forEach(callbackfn, thisArg);
	}

	get size() {
		return this.#participants.size;
	}

	clear() {
		this.#participants.clear();
		this.emit('cleared');
	}

	toArray() {
		return Array.from(this.#participants.values());
	}

	[Symbol.iterator]() {
		return this.#participants[Symbol.iterator]();
	}

	get [Symbol.toStringTag]() {
		return 'CallParticipantMap';
	}
}
