import { EventsHandler } from '../utils/events-handler';
import { type CallParticipant } from './call-participant/call-participant';

export type ParticipantMapEvents = {
	added: (participant: CallParticipant) => void;
	updated: (participant: CallParticipant) => void;
	removed: (participant: CallParticipant) => void;
	cleared: () => void;

	// emitted from CallParticipant
	micUpdate: (participant: CallParticipant) => void;
	cameraUpdate: (participant: CallParticipant) => void;
};

export class CallParticipantMap extends EventsHandler<ParticipantMapEvents> {
	#participants = new Map<string, CallParticipant>();

	get(id: string): CallParticipant | undefined {
		return this.#participants.get(id);
	}

	set(id: string, participant: CallParticipant): void {
		const isUpdate = this.#participants.has(id);
		this.#participants.set(id, participant);
		this.emit(isUpdate ? 'updated' : 'added', participant);
	}

	delete(id: string): boolean {
		const removed = this.#participants.get(id);
		const didDelete = this.#participants.delete(id);
		if (didDelete && removed) {
			this.emit('removed', removed);
		}
		return didDelete;
	}

	has(id: string): boolean {
		return this.#participants.has(id);
	}

	values(): IterableIterator<CallParticipant> {
		return this.#participants.values();
	}

	keys(): IterableIterator<string> {
		return this.#participants.keys();
	}

	entries(): IterableIterator<[string, CallParticipant]> {
		return this.#participants.entries();
	}

	forEach(callback: (participant: CallParticipant, id: string) => void): void {
		this.#participants.forEach(callback);
	}

	get size(): number {
		return this.#participants.size;
	}

	clear(): void {
		this.#participants.clear();
		this.emit('cleared');
	}

	toArray(): CallParticipant[] {
		return Array.from(this.#participants.values());
	}
}
