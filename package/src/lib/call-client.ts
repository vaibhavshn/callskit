import { PartyTracks, resilientTrack$ } from 'partytracks/client';
import type { CallEvent } from '../types/call-socket';
import { EventsHandler } from '../utils/events-handler';
import { CallParticipant } from './call-participant';
import { CallSocket } from './call-socket';

export type CallClientOptions = {
	room: string;
	displayName: string;
	defaults?: {
		audio?: boolean;
		video?: boolean;
	};
};

type CallClientEvents = {
	connected: () => void;
	joined: () => void;
	participant_joined: (participant: CallParticipant) => void;
	participant_left: (participant: CallParticipant) => void;
};

export const partyTracks = new PartyTracks({
	prefix: 'http://localhost:8787/partytracks',
});

export class CallClient extends EventsHandler<CallClientEvents> {
	room: string;

	self: CallParticipant;

	participants: CallParticipant[];

	#socket: CallSocket;

	state: undefined | 'connected' | 'joined';

	constructor(options: CallClientOptions) {
		super();
		this.room = options.room;
		this.participants = [];

		this.#socket = new CallSocket({
			room: this.room,
			host: import.meta.env.DEV
				? 'http://localhost:1999'
				: 'https://callkit.io',
		});

		this.#socket.addEventListener('message', this.onMessage.bind(this));

		this.self = new CallParticipant({ name: options.displayName });
		this.state = undefined;

		if (options.defaults) {
			if (options.defaults.video) {
				this.startCamera();
			}
			if (options.defaults.audio) {
				this.startMic();
			}
		}
	}

	join() {
		if (this.state !== 'connected') return;
		console.log('joining room');
		this.#socket.sendAction({ action: 'join', self: this.self.to() });
	}

	leave() {
		this.#socket.sendAction({ action: 'leave' });
		this.#socket.close();
	}

	startMic() {
		if (this.self.micEnabled) return;
		const track$ = resilientTrack$({
			kind: 'audioinput',
			constraints: { noiseSuppression: true },
		});
		track$.subscribe((track) => {
			if (track) {
				const metadata$ = partyTracks.push(track$);
				metadata$.subscribe((metadata) => {
					const trackId = metadata.sessionId + ':' + metadata.trackName;
					this.self.micEnabled = true;
					this.self.micTrack.next(track);
					this.#socket.sendAction({
						action: 'self/mic-update',
						updates: {
							micEnabled: true,
							micTrackId: trackId,
						},
					});
				});
			}
		});
	}

	stopMic() {
		this.self.micTrack?.stop();
		this.self.micEnabled = false;
		this.self.micTrack.next(undefined);
		this.self.emit('mic_update');
		this.#socket.sendAction({
			action: 'self/mic-update',
			updates: { micEnabled: false },
		});
	}

	startCamera() {
		if (this.self.cameraEnabled) return;
		console.log('starting camera');
		const track$ = resilientTrack$({
			kind: 'videoinput',
			constraints: {
				frameRate: { ideal: 24 },
				aspectRatio: 16 / 9,
				width: { max: 1920 },
				height: { max: 1080 },
			},
		});
		track$.subscribe((track) => {
			if (track) {
				const pushedTrackMetadata$ = partyTracks.push(track$, {
					sendEncodings: [
						{ rid: 'h', maxBitrate: 2500000, maxFramerate: 24 },
						{
							rid: 'm',
							maxBitrate: 800000,
							scaleResolutionDownBy: 2,
							maxFramerate: 24,
						},
						{
							rid: 'l',
							maxBitrate: 200000,
							scaleResolutionDownBy: 4,
							maxFramerate: 24,
						},
					],
				});
				pushedTrackMetadata$.subscribe((metadata) => {
					this.self.cameraEnabled = true;
					this.self.cameraTrack.next(track);
					this.self.emit('camera_update');

					const cameraTrackId = metadata.sessionId + ':' + metadata.trackName;
					this.#socket.sendAction({
						action: 'self/camera-update',
						updates: {
							cameraEnabled: true,
							cameraTrackId: cameraTrackId,
						},
					});
					console.log('Track metadata pushed:', metadata);
				});
			}
		});
	}

	stopCamera() {
		this.self.cameraTrack.value?.stop();
		this.self.cameraEnabled = false;
		this.self.cameraTrack.next(undefined);
		this.self.emit('camera_update');
		this.#socket.sendAction({
			action: 'self/camera-update',
			updates: { cameraEnabled: false },
		});
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
				const users = user_objects.map((obj) => CallParticipant.from(obj));
				this.participants = users;
				this.state = 'joined';

				this.emit('joined');
				break;
			}
			case 'participant/joined': {
				const participant = CallParticipant.from(ev.participant);
				this.participants = [...this.participants, participant];
				this.emit('participant_joined', participant);
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
					this.emit('participant_left', participant);
				}
				break;
			}
			case 'participant/mic-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.getParticipantById(participantId);
				participant?.updateMicState(updates.micEnabled, updates.micTrackId);
				break;
			}
			case 'participant/camera-update': {
				const { participantId, ...updates } = ev.data;
				const participant = this.getParticipantById(participantId);
				participant?.updateCameraState(
					updates.cameraEnabled,
					updates.cameraTrackId,
				);
				break;
			}
		}
	}

	getParticipantById(pid: string) {
		return this.participants.find((p) => p.id === pid);
	}
}
