import {
	devices$,
	getCamera,
	getMic,
	getScreenshare,
	type MediaDevice,
	type Screenshare,
} from 'partytracks/client';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
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
	#screenshare: Screenshare;

	#micTrackId: string | undefined;
	#micTrack: MediaStreamTrack | undefined;

	#cameraTrackId: string | undefined;
	#cameraTrack: MediaStreamTrack | undefined;

	#screenshareVideoTrackId: string | undefined;
	#screenshareVideoTrack: MediaStreamTrack | undefined;
	#screenshareAudioTrackId: string | undefined;
	#screenshareAudioTrack: MediaStreamTrack | undefined;

	constructor(options: CallSelfOptions) {
		super();
		this.name = options.name;
		this.#ctx = getCurrentCallContext();

		this.#mic = getMic();
		this.#camera = getCamera();
		this.#screenshare = getScreenshare();

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

		this.#mic.broadcastTrack$.subscribe((track) => {
			this.#micTrack = track;
		});

		micMetadata$.subscribe((metadata) => {
			const micEnabled = this.micEnabled;
			const micTrack = this.#micTrack;

			console.log({ micEnabled, micTrack });

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

		this.#camera.broadcastTrack$.subscribe((track) => {
			this.#cameraTrack = track;
		});

		cameraMetadata$.subscribe((metadata) => {
			const cameraEnabled = this.cameraEnabled;
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

		this.#screenshare.video.broadcastTrack$.subscribe((track) => {
			this.#screenshareVideoTrack = track;
		});

		this.#screenshare.audio.broadcastTrack$.subscribe((track) => {
			this.#screenshareAudioTrack = track;
		});

		const screenshareVideoMetadata$ = this.#ctx.partyTracks.push(
			this.#screenshare.video.broadcastTrack$,
		);
		const screenshareAudioMetadata$ = this.#ctx.partyTracks.push(
			this.#screenshare.audio.broadcastTrack$,
		);

		screenshareVideoMetadata$.subscribe((metadata) => {
			this.#screenshareVideoTrackId = `${metadata.sessionId}/${metadata.trackName}`;
			this.#ctx.socket.sendAction({
				action: 'self/screenshare-update',
				updates: {
					screenshareEnabled: this.screenshareEnabled,
					screenshareVideoTrackId: this.#screenshareVideoTrackId,
					screenshareAudioTrackId: this.#screenshareAudioTrackId,
				},
			});
			if (this.#screenshareVideoTrack) {
				this.emit('screenshareUpdate', {
					screenshareEnabled: this.screenshareEnabled,
					screenshareVideoTrack: this.#screenshareVideoTrack,
					screenshareAudioTrack: this.#screenshareAudioTrack,
				});
			}
		});

		screenshareAudioMetadata$.subscribe((metadata) => {
			console.log('audio metadata', metadata);
			this.#screenshareAudioTrackId = `${metadata.sessionId}/${metadata.trackName}`;
			this.#ctx.socket.sendAction({
				action: 'self/screenshare-update',
				updates: {
					screenshareEnabled: this.screenshareEnabled,
					screenshareVideoTrackId: this.#screenshareVideoTrackId,
					screenshareAudioTrackId: this.#screenshareAudioTrackId,
				},
			});
			if (this.#screenshareVideoTrack) {
				this.emit('screenshareUpdate', {
					screenshareEnabled: this.screenshareEnabled,
					screenshareVideoTrack: this.#screenshareVideoTrack,
					screenshareAudioTrack: this.#screenshareAudioTrack,
				});
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

	startScreenshare() {
		return this.#screenshare.video.startBroadcasting();
	}

	stopScreenshare() {
		return this.#screenshare.video.stopBroadcasting();
	}

	#cameraDevice: MediaDeviceInfo | undefined;
	#micDevice: MediaDeviceInfo | undefined;

	async setCameraDevice(deviceId: string) {
		const devices = await this.devices;
		const device = devices.find((d) => d.deviceId === deviceId);
		if (!device) {
			throw new Error(`Device not found: ${deviceId}`);
		}
		this.#cameraDevice = device;
		this.#camera.setPreferredDevice(device);
	}

	async setMicDevice(deviceId: string) {
		const devices = await this.devices;
		const device = devices.find((d) => d.deviceId === deviceId);
		if (!device) {
			throw new Error(`Device not found: ${deviceId}`);
		}
		this.#micDevice = device;
		this.#mic.setPreferredDevice(device);
	}

	get micEnabled(): boolean {
		console.log(this.#mic);
		return (this.#mic.isBroadcasting$.source as BehaviorSubject<boolean>).value;
	}

	get micTrack(): MediaStreamTrack | undefined {
		return this.#micTrack;
	}

	get cameraEnabled(): boolean {
		return (this.#camera.isBroadcasting$.source as BehaviorSubject<boolean>)
			.value;
	}

	get cameraTrack(): MediaStreamTrack | undefined {
		return this.#cameraTrack;
	}

	get screenshareEnabled(): boolean {
		return (
			this.#screenshare.video.isBroadcasting$.source as BehaviorSubject<boolean>
		).value;
	}

	get screenshareTracks():
		| {
				video: MediaStreamTrack | undefined;
				audio: MediaStreamTrack | undefined;
		  }
		| undefined {
		if (!this.screenshareEnabled) {
			return undefined;
		}
		return {
			video: this.#screenshareVideoTrack,
			audio: this.#screenshareAudioTrack,
		};
	}

	get devices(): Promise<MediaDeviceInfo[]> {
		return firstValueFrom(devices$);
	}

	get currentDevices() {
		return {
			mic: this.#micDevice,
			camera: this.#cameraDevice,
		};
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
			screenshareEnabled: this.screenshareEnabled,
			screenshareVideoTrackId: this.#screenshareVideoTrackId,
			screenshareAudioTrackId: this.#screenshareAudioTrackId,
		};
	}
}
