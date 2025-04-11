import { EventsHandler } from '../../utils/events-handler';
import { Logger } from '../../utils/logger';
import { getCurrentCallContext, type CallContext } from '../call-context';
import { CallParticipantMap } from '../call-participant-map/call-participant-map';
import { CallParticipant } from '../call-participant/call-participant';

export type ParticipantControllerEvents = {
	added: (participant: CallParticipant) => void;
	updated: (participant: CallParticipant) => void;
	removed: (participant: CallParticipant) => void;

	// emitted from CallParticipant
	micUpdate: (participant: CallParticipant) => void;
	cameraUpdate: (participant: CallParticipant) => void;
	volumeChange: (participant: CallParticipant, lastVolume: number) => void;
};

export class ParticipantsController extends EventsHandler<ParticipantControllerEvents> {
	joined = new CallParticipantMap();
	stage: Stage;
	lastSpeaker: CallParticipant | undefined;

	#ctx: CallContext;
	#maxOnStageParticipants: number;

	constructor() {
		super();
		this.#ctx = getCurrentCallContext();
		this.#maxOnStageParticipants = this.#ctx.maxOnStageParticipants - 1;
		this.stage = new Stage(this.joined, this.#maxOnStageParticipants);
	}

	addParticipant(participant: CallParticipant) {
		this.joined.set(participant.id, participant);
		this.stage.addParticipant(participant);
	}

	removeParticipantById(participantId: string) {
		this.joined.delete(participantId);
		this.stage.compute(participantId);
	}
}

const stageLogger = new Logger({ prefix: '[STAGE]' });

export class Stage extends EventsHandler {
	participants: CallParticipant[] = [];
	joined: CallParticipantMap;
	maxOnStageParticipants: number;

	#interval: NodeJS.Timeout | undefined;

	constructor(joined: CallParticipantMap, maxOnStageParticipants: number) {
		super();
		this.joined = joined;
		this.maxOnStageParticipants = maxOnStageParticipants;

		this.#interval = setInterval(() => {
			this.compute();
		}, 600);
	}

	addParticipant(participant: CallParticipant) {
		if (this.participants.length >= this.maxOnStageParticipants) {
			stageLogger.debug('participants.length >= maxOnStage');
			return;
		}
		const idx = this.participants.findIndex((p) => p.id === participant.id);
		stageLogger.debug('adding participant', idx, participant);
		if (idx >= 0) {
			stageLogger.debug('replacing participant', participant, idx);
			this.participants[idx] = participant;
			this.participants = [...this.participants];
			this.emit('updated', participant);
		} else {
			stageLogger.debug('confirm adding to stage', participant);
			this.participants = [...this.participants, participant];
			this.emit('added', participant);
		}
	}

	compute(idToRemove?: string) {
		let stage = this.participants.slice();

		if (idToRemove) {
			stageLogger.debug('removing id', idToRemove);
			stage = stage.filter((p) => p.id !== idToRemove);
		}

		// no more participants to add to stage
		if (
			stage.length === this.joined.size &&
			stage.length <= this.maxOnStageParticipants
		) {
			stageLogger.debug('no participants to add');
			if (idToRemove) {
				this.participants = stage;
				this.emit('updated');
			}
			return;
		} else {
			stageLogger.debug('adding participants');
		}

		if (
			stage.length < this.maxOnStageParticipants &&
			stage.length < this.joined.size
		) {
			stageLogger.debug(
				'adding to stage when stage is not full',
				this.joined.size,
				stage.length,
			);
			const joinedNotOnStage = this.joined
				.toArray()
				.filter((j) => !stage.some((s) => s.id === j.id));
			const toAddOnStage = joinedNotOnStage.slice(
				0,
				this.maxOnStageParticipants - stage.length,
			);
			stageLogger.debug('adding to stage from joined', toAddOnStage);
			stage.push(...toAddOnStage);
			this.participants = stage;
			this.emit('updated');
			return;
		}

		// if (stage.length >= this.maxOnStageParticipants) {
		// 	stageLogger.debug('stage is full');
		// 	if (idToRemove) {
		// 		this.participants = stage;
		// 		this.emit('updated');
		// 	}
		// 	return;
		// }

		const sortedByVolume = this.joined
			.toArray()
			.sort((a, b) => b.volume - a.volume);
		const finalSorted = sortedByVolume.slice(0, this.maxOnStageParticipants);
		const remainingSorted = sortedByVolume.slice(this.maxOnStageParticipants);
		const sortedStage = stage.toSorted((a, b) => b.volume - a.volume);

		for (const p of finalSorted) {
			if (!stage.find((s) => s.id === p.id)) {
				stage.unshift(p);

				if (stage.length > this.maxOnStageParticipants) {
					const leastVolumeOnStage = sortedStage.pop();
					if (leastVolumeOnStage) {
						stage = stage.filter((s) => s.id !== leastVolumeOnStage.id);
					}
				}
			}

			if (stage.length === this.maxOnStageParticipants) {
				stageLogger.debug('achieved max count, exiting...');
				this.participants = stage;
				this.emit('updated');
				return;
			}
		}

		this.participants = stage;
		this.emit('updated');
	}

	delete(participantId: string) {
		const idx = this.participants.findIndex((p) => p.id === participantId);
		if (idx) {
			const [participant] = this.participants.splice(idx, 1);
			this.emit('removed', participant);
		}
	}

	toArray() {
		return this.participants.slice();
	}
}
