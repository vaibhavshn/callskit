import type { CallParticipant } from '../call-participant/call-participant';

type CallEvents = {
	connected: () => void;
	joined: () => void;
	left: () => void;
};

type ParticipantEvents = {
	participantJoined: (participant: CallParticipant) => void;
	participantLeft: (participant: CallParticipant) => void;
};

export type CallClientEvents = CallEvents & ParticipantEvents;
