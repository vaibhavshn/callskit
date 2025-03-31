import { PartyTracks } from 'partytracks/client';
import type { CallEvent } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import { runWithContext, type CallContext } from '../call-context';
import { CallParticipant } from '../call-participant/call-participant';
import { CallSelf, type CameraRID } from '../call-self/call-self';
import { CallSocket } from '../call-socket';
import type { CallClientEvents } from './call-client-events';
import { CallParticipantMap } from '../participant-map';
import { Logger, type LogLevel } from '../../utils/logger';
import { CallChat } from '../call-chat/call-chat';
import { BehaviorSubject, fromEvent } from 'rxjs';

export type CallClientOptions = {
	room: string;
	displayName: string;
	defaults?: {
		audio?: boolean;
		video?: boolean;
	};
	logLevel?: LogLevel;
};

export class CallClient extends EventsHandler<CallClientEvents> {
	started_at!: Date;
	room: string;
	state: undefined | 'connected' | 'joined' | 'left' = undefined;

	self: CallSelf;
	participants = new CallParticipantMap();
	chat: CallChat;

	#ctx: CallContext;
	#logger: Logger;

	constructor(options: CallClientOptions) {
		super();
		this.room = options.room;

		this.#logger = new Logger({
			level: options.logLevel ?? 'warn',
			prefix: 'CallClient',
		});

		const socket = new CallSocket({
			room: this.room,
			host: import.meta.env.SOCKET_URL,
			logger: this.#logger,
		});

		socket.addEventListener('message', this.onMessage.bind(this));

		const partyTracks = new PartyTracks({
			prefix: import.meta.env.API_URL + '/partytracks',
		});

		const context: CallContext = {
			socket,
			partyTracks,
			participants: this.participants,
			logger: this.#logger,
			cameraRid$: new BehaviorSubject<CameraRID>('f'),
		};

		Object.assign(window, { rid: context.cameraRid$ });

		this.#ctx = context;

		this.self = this.runWithContext(
			() =>
				new CallSelf({ name: options.displayName, defaults: options.defaults }),
		);

		this.chat = this.runWithContext(() => new CallChat());
	}

	join() {
		if (this.state !== 'connected') return;
		this.#ctx.socket.sendAction({ action: 'join', self: this.self.toJSON() });
	}

	leave() {
		this.#ctx.socket.sendAction({ action: 'leave' });
		this.#ctx.socket.close();
		this.state = 'left';
		this.emit('left');
	}

	private onMessage(event: MessageEvent<string>) {
		const ev: CallEvent = JSON.parse(event.data);
		this.#logger.info('CallSocket:Event', ev);

		switch (ev.event) {
			case 'connected':
				this.state = 'connected';
				this.emit('connected');
				break;

			case 'room/init': {
				if (this.state !== 'connected') return;

				const user_objects = ev.participants;
				this.runWithContext(() =>
					user_objects.map((obj) => CallParticipant.fromJSON(obj)),
				).forEach((participant) => {
					this.participants.set(participant.id, participant);
				});
				this.started_at = new Date(ev.started_at);
				this.chat.addMessagesInBulk(ev.chatMessages);
				this.state = 'joined';
				this.emit('joined');
				break;
			}

			case 'participant/joined': {
				const participant = this.runWithContext(() =>
					CallParticipant.fromJSON(ev.participant),
				);
				this.participants.set(participant.id, participant);
				break;
			}

			case 'participant/left': {
				const participantId = ev.participantId;
				const participant = this.participants.get(participantId);
				if (participant) {
					this.participants.delete(participantId);
				}
				break;
			}

			case 'participant/mic-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.participants.get(participantId);
				participant?.updateMicState(updates);
				break;
			}

			case 'participant/camera-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.participants.get(participantId);
				participant?.updateCameraState(updates);
				break;
			}

			case 'chat/new-message': {
				this.chat.addMessage(ev.message);
				break;
			}
		}
	}

	private runWithContext<T>(fn: () => T): T {
		return runWithContext(this.#ctx, fn);
	}
}
