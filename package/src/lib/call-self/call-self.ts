import { getCamera, getMic, type MediaDevice } from 'partytracks/client';
import { BehaviorSubject, of } from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import { type CallClientOptions } from '../call-client/call-client';
import { getCurrentCallContext, type CallContext } from '../call-context';
import type { CallSelfEvents } from './call-self-events';

export type CallSelfOptions = {
	name: string;
	defaults: CallClientOptions['defaults'];
};

/** Camera Quality Code
 * - `a` is High Quality
 * - `b` is Data Saver
 */
export type CameraRID = 'a' | 'b';

export class CallSelf extends EventsHandler<CallSelfEvents> {
	id: string = crypto.randomUUID();
	name: string;

	#ctx: CallContext;

	#mic: MediaDevice;
	#camera: MediaDevice;

	#micTrackId: string | undefined;
	#micTrack: MediaStreamTrack | undefined;

	#cameraTrackId: string | undefined;
	#cameraTrack: MediaStreamTrack | undefined;

	constructor(options: CallSelfOptions) {
		super();
		this.name = options.name;
		this.#ctx = getCurrentCallContext();

		this.#mic = getMic();
		this.#camera = getCamera();

		if (options.defaults?.audio) {
			this.startMic();
		}

		if (options.defaults?.video) {
			this.startCamera();
		}

		const micMetadata$ = this.#ctx.partyTracks.push(this.#mic.broadcastTrack$, {
			sendEncodings$: of([
				{ networkPriority: 'high' },
			] satisfies RTCRtpEncodingParameters[]),
		});

		micMetadata$.subscribe((metadata) => {
			const micEnabled = (this.#mic.isBroadcasting$ as BehaviorSubject<boolean>)
				.value;
			const micTrack = this.#micTrack;

			if (micEnabled && micTrack) {
				const micTrackId = `${metadata.sessionId}/${metadata.trackName}`;
				this.#micTrackId = micTrackId;
				this.#ctx.socket.sendAction({
					action: 'self/mic-update',
					updates: {
						micEnabled: true,
						micTrackId,
					},
				});
				this.emit('micUpdate', {
					micEnabled: true,
					micTrack,
				});
			} else if (!micEnabled) {
				this.#ctx.socket.sendAction({
					action: 'self/mic-update',
					updates: { micEnabled: false },
				});
				this.emit('micUpdate', { micEnabled: false });
			}
		});

		const cameraMetadata$ = this.#ctx.partyTracks.push(
			this.#camera.broadcastTrack$,
			{
				sendEncodings$: this.#ctx.cameraEncodings$,
			},
		);

		this.#mic.broadcastTrack$.subscribe((track) => {
			this.#micTrack = track;
		});

		this.#camera.broadcastTrack$.subscribe((track) => {
			this.#cameraTrack = track;
		});

		cameraMetadata$.subscribe((metadata) => {
			const cameraEnabled = (
				this.#camera.isBroadcasting$ as BehaviorSubject<boolean>
			).value;
			const cameraTrack = this.#cameraTrack;

			if (cameraEnabled && cameraTrack) {
				const cameraTrackId = `${metadata.sessionId}/${metadata.trackName}`;
				this.#cameraTrackId = cameraTrackId;
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: {
						cameraEnabled: true,
						cameraTrackId,
					},
				});
				this.emit('cameraUpdate', {
					cameraEnabled: true,
					cameraTrack,
				});
			} else if (!cameraEnabled) {
				this.#cameraTrackId = undefined;
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: { cameraEnabled: false },
				});
				this.emit('cameraUpdate', { cameraEnabled: false });
			}
		});
	}

	startMic() {
		this.#mic.startBroadcasting();
	}

	stopMic() {
		this.#mic.stopBroadcasting();
	}

	startCamera() {
		this.#camera.startBroadcasting();
	}

	stopCamera() {
		this.#camera.stopBroadcasting();
	}

	get micEnabled(): boolean {
		return (this.#mic.isBroadcasting$ as BehaviorSubject<boolean>).value;
	}

	get micTrack(): MediaStreamTrack | undefined {
		return this.#micTrack;
	}

	get cameraEnabled(): boolean {
		return (this.#camera.isBroadcasting$ as BehaviorSubject<boolean>).value;
	}

	get cameraTrack(): MediaStreamTrack | undefined {
		return this.#cameraTrack;
	}

	setName(name: string) {
		const oldName = this.name;
		this.name = name;
		this.emit('nameChange', this.name, oldName);
	}

	toJSON(): SerializedUser {
		return {
			id: this.id,
			name: this.name,
			micEnabled: this.micEnabled,
			micTrackId: this.#micTrackId,
			cameraEnabled: this.cameraEnabled,
			cameraTrackId: this.#cameraTrackId,
		};
	}
}
