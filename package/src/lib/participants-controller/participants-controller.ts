import { EventsHandler } from '../../utils/events-handler';
import { CallParticipantMap } from '../call-participant-map/call-participant-map';
import { CallParticipant } from '../call-participant/call-participant';

export type ParticipantControllerEvents = {
	added: (participant: CallParticipant) => void;
	updated: (participant: CallParticipant) => void;
	removed: (participant: CallParticipant) => void;

	// emitted from CallParticipant
	micUpdate: (participant: CallParticipant) => void;
	cameraUpdate: (participant: CallParticipant) => void;
};

export class ParticipantsController extends EventsHandler<ParticipantControllerEvents> {
	joined = new CallParticipantMap();
	lastSpeaker: CallParticipant | undefined;

	constructor() {
		super();
	}

	addParticipant(participant: CallParticipant) {
		this.joined.set(participant.id, participant);
	}

	removeParticipantById(participantId: string) {
		this.joined.delete(participantId);
	}
}
