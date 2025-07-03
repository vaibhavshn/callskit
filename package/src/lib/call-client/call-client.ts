import { PartyTracks, setLogLevel } from 'partytracks/client';
import { BehaviorSubject, Subscription } from 'rxjs';
import type { CallEvent } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import { Logger, type LogLevel } from '../../utils/logger';
import { CallChat } from '../call-chat/call-chat';
import { runWithContext, type CallContext } from '../call-context';
import { CallParticipant } from '../call-participant/call-participant';
import { ParticipantsController } from '../participants-controller/participants-controller';
import { CallSelf, type VideoEncodingRid } from '../call-self/call-self';
import { CallSocket } from '../call-socket';
import type { CallClientEvents } from './call-client-events';
import { cameraEncodings } from '../call-self/call-self-data';

export type CallClientOptions = {
	room: string;
	displayName: string;

	socketBaseUrl: string;
	apiBaseUrl: string;
	apiHeaders?: Headers;

	defaults?: {
		audio?: boolean;
		video?: boolean;
	};
	autoJoin?: boolean;
	config?: {
		preferredCameraQuality?: VideoEncodingRid;
	};
	onError?: (error: Error) => void;
	logLevel?: LogLevel;
};

setLogLevel('debug');

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
			// prefix: 'callskit',
		});

		const socket = new CallSocket({
			room: this.room,
			host: options.socketBaseUrl,
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
			prefix: options.apiBaseUrl + '/partytracks',
			headers: options.apiHeaders,
		});

		let unsubSession: Subscription | undefined = partyTracks.session$.subscribe(
			() => {
				// listen and emit only once
				this.emit('mediaConnected');
				unsubSession!.unsubscribe();
				unsubSession = undefined;
			},
		);

		this.#ctx = {
			socket,
			partyTracks,
			call: this,
			logger: this.#logger,
			cameraRid$: new BehaviorSubject<VideoEncodingRid>(
				options.config?.preferredCameraQuality ?? 'f',
			),
			cameraEncodings$: new BehaviorSubject<RTCRtpEncodingParameters[]>(
				cameraEncodings,
			),
			onError: options.onError,
		};

		this.self = runWithContext(
			this.#ctx,
			() =>
				new CallSelf({ name: options.displayName, defaults: options.defaults }),
		);
		this.participants = runWithContext(
			this.#ctx,
			() => new ParticipantsController(),
		);
		this.chat = runWithContext(this.#ctx, () => new CallChat());
	}

	join() {
		if (this.state !== 'connected') return;
		this.#ctx.socket.sendAction({ action: 'join', self: this.self.toJSON() });
	}

	leave() {
		this.#ctx.socket.close();
		this.state = 'left';
		this.emit('left');
	}

	get cameraTrackQuality() {
		return this.#ctx.cameraRid$.value;
	}

	/**
	 * Set the remote camera track quality.
	 * - `f` - full quality
	 * - `h` - half quality
	 */
	setRemoteCameraTrackQuality(quality: VideoEncodingRid) {
		const qualities: VideoEncodingRid[] = ['f', 'h'];
		if (qualities.includes(quality)) {
			const oldQuality = this.#ctx.cameraRid$.value;
			this.#ctx.cameraRid$.next(quality);
			this.emit('cameraQualityChanged', quality, oldQuality);
		}
	}

	#onMessage(event: MessageEvent<string>) {
		const ev: CallEvent = JSON.parse(event.data);
		this.#logger.debug('📩 CallSocket:Event', ev);

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
				runWithContext(this.#ctx, () =>
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
				const participant = runWithContext(this.#ctx, () =>
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

			case 'participant/screenshare-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.participants.joined.get(participantId);
				participant?.updateScreenshareState(updates);
				break;
			}

			case 'chat/new-message': {
				this.chat.addMessage(ev.message);
				break;
			}

			default:
				this.#logger.info('Received unknown event:', ev);
				break;
		}
	}
}
