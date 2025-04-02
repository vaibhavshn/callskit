import { PartyTracks } from 'partytracks/client';
import { BehaviorSubject } from 'rxjs';
import type { CallEvent } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import { Logger, type LogLevel } from '../../utils/logger';
import { CallChat } from '../call-chat/call-chat';
import { runWithContext, type CallContext } from '../call-context';
import { CallParticipant } from '../call-participant/call-participant';
import { ParticipantsController } from '../participants-controller/participants-controller';
import { CallSelf, type CameraRID } from '../call-self/call-self';
import { CallSocket } from '../call-socket';
import type { CallClientEvents } from './call-client-events';

export type CallClientOptions = {
	room: string;
	displayName: string;
	defaults?: {
		audio?: boolean;
		video?: boolean;
	};
	logLevel?: LogLevel;
	autoJoin?: boolean;
	config?: {
		preferredCameraQuality?: CameraRID;
		/**
		 *	Maximum number of participants allowed on stage at a time
		 *	@default 9
		 */
		maxOnStageParticipants?: number;
	};
	onError?: (error: Error) => void;
};

export class CallClient extends EventsHandler<CallClientEvents> {
	room: string;
	state: undefined | 'connected' | 'joined' | 'left' = undefined;

	started_at!: Date;
	self: CallSelf;
	participants: ParticipantsController;
	chat: CallChat;

	#ctx: CallContext;
	#logger: Logger;
	#autoJoin: boolean;

	constructor(options: CallClientOptions) {
		super();
		this.room = options.room;
		this.#autoJoin = options.autoJoin || false;

		this.#logger = new Logger({
			level: options.logLevel ?? 'warn',
			prefix: 'CallClient',
		});

		const socket = new CallSocket({
			room: this.room,
			host: import.meta.env.SOCKET_URL,
			logger: this.#logger,
		});
		socket.addEventListener('message', this.#onMessage.bind(this));
		if (options.onError) {
			const onError = options.onError;
			socket.addEventListener('error', (e) => {
				onError(new Error('Error while connecting to server'));
			});
		}

		const partyTracks = new PartyTracks({
			prefix: import.meta.env.API_URL + '/partytracks',
		});

		this.#ctx = {
			socket,
			partyTracks,
			call: this,
			logger: this.#logger,
			cameraRid$: new BehaviorSubject<CameraRID>(
				options.config?.preferredCameraQuality ?? 'q',
			),
			volumeContext: new AudioContext(),
			maxOnStageParticipants: options.config?.maxOnStageParticipants ?? 9,
			onError: options.onError,
		};

		this.self = this.#runWithContext(
			() =>
				new CallSelf({ name: options.displayName, defaults: options.defaults }),
		);
		this.participants = this.#runWithContext(
			() => new ParticipantsController(),
		);
		this.chat = this.#runWithContext(() => new CallChat());
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

	#onMessage(event: MessageEvent<string>) {
		const ev: CallEvent = JSON.parse(event.data);
		this.#logger.info('CallSocket:Event', ev);

		switch (ev.event) {
			case 'connected':
				this.state = 'connected';
				this.emit('connected');
				if (this.#autoJoin) {
					this.join();
				}
				break;

			case 'room/init': {
				if (this.state !== 'connected') return;

				const user_objects = ev.participants;
				this.#runWithContext(() =>
					user_objects.map((obj) => CallParticipant.fromJSON(obj)),
				).forEach((participant) => {
					this.participants.addParticipant(participant);
				});
				this.started_at = new Date(ev.started_at);
				this.chat.addMessagesInBulk(ev.chatMessages);
				this.state = 'joined';
				this.emit('joined');
				break;
			}

			case 'participant/joined': {
				const participant = this.#runWithContext(() =>
					CallParticipant.fromJSON(ev.participant),
				);
				this.participants.addParticipant(participant);
				break;
			}

			case 'participant/left': {
				this.participants.removeParticipantById(ev.participantId);
				break;
			}

			case 'participant/mic-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.participants.joined.get(participantId);
				participant?.updateMicState(updates);
				break;
			}

			case 'participant/camera-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.participants.joined.get(participantId);
				participant?.updateCameraState(updates);
				break;
			}

			case 'chat/new-message': {
				this.chat.addMessage(ev.message);
				break;
			}
		}
	}

	#runWithContext<T>(fn: () => T): T {
		return runWithContext(this.#ctx, fn);
	}

	get cameraTrackQuality() {
		return this.#ctx.cameraRid$.value;
	}

	setRemoteCameraTrackQuality(quality: CameraRID) {
		const qualities = ['f', 'h', 'q'] satisfies CameraRID[];
		if (qualities.includes(quality)) {
			this.#ctx.cameraRid$.next(quality);
		}
	}
}
