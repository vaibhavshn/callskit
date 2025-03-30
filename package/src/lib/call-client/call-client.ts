import { PartyTracks, resilientTrack$ } from 'partytracks/client';
import type { CallEvent } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import { runWithContext, type CallContext } from '../call-context';
import { CallParticipant } from '../call-participant/call-participant';
import { CallSelf } from '../call-self/call-self';
import { CallSocket } from '../call-socket';
import type { CallClientEvents } from './call-client-events';

export type CallClientOptions = {
	room: string;
	displayName: string;
	defaults?: {
		audio?: boolean;
		video?: boolean;
	};
};

export class CallClient extends EventsHandler<CallClientEvents> {
	started_at!: Date;

	room: string;
	self: CallSelf;
	participants: CallParticipant[];
	state: undefined | 'connected' | 'joined' = undefined;

	#ctx: CallContext;

	constructor(options: CallClientOptions) {
		super();
		this.room = options.room;
		this.participants = [];

		const socket = new CallSocket({
			room: this.room,
			host: 'http://localhost:1999',
		});

		socket.addEventListener('message', this.onMessage.bind(this));

		const partyTracks = new PartyTracks({
			prefix: 'http://localhost:8787/partytracks',
		});

		const context: CallContext = {
			socket,
			partyTracks,
		};

		this.#ctx = context;

		this.self = this.runWithContext(
			() =>
				new CallSelf({ name: options.displayName, defaults: options.defaults }),
		);
	}

	join() {
		if (this.state !== 'connected') return;
		console.log('joining room');
		this.#ctx.socket.sendAction({ action: 'join', self: this.self.toJSON() });
	}

	leave() {
		this.#ctx.socket.sendAction({ action: 'leave' });
		this.#ctx.socket.close();
	}

	private onMessage(event: MessageEvent<string>) {
		const ev: CallEvent = JSON.parse(event.data);
		console.log(ev);
		switch (ev.event) {
			case 'connected':
				this.state = 'connected';
				this.emit('connected');
				break;
			case 'room/init': {
				const user_objects = ev.participants;
				const users = this.runWithContext(() =>
					user_objects.map((obj) => CallParticipant.fromJSON(obj)),
				);
				this.participants = users;
				this.started_at = new Date(ev.started_at);
				this.state = 'joined';
				this.emit('joined');
				break;
			}
			case 'participant/joined': {
				const participant = this.runWithContext(() =>
					CallParticipant.fromJSON(ev.participant),
				);
				this.participants = [...this.participants, participant];
				this.emit('participantJoined', participant);
				break;
			}
			case 'participant/left': {
				const participantId = ev.participantId;
				const participant = this.participants.find(
					(p) => p.id === participantId,
				);
				if (participant) {
					this.participants = this.participants.filter(
						(p) => p.id !== participantId,
					);
					this.emit('participantLeft', participant);
				}
				break;
			}
			case 'participant/mic-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.getParticipantById(participantId);
				participant?.updateMicState(updates);
				break;
			}
			case 'participant/camera-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.getParticipantById(participantId);
				participant?.updateCameraState(updates);
				break;
			}
		}
	}

	getParticipantById(pid: string) {
		return this.participants.find((p) => p.id === pid);
	}

	private runWithContext<T>(fn: () => T): T {
		return runWithContext(this.#ctx, fn);
	}
}
