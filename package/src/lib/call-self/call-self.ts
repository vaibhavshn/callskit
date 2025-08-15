import {
	devices$,
	getCamera,
	getMic,
	getScreenshare,
	type MediaDevice,
	type Screenshare,
	type TrackMetadata,
} from 'partytracks/client';
import { of } from 'rxjs';
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
export type VideoEncodingRid = 'a' | 'b';

export class CallSelf extends EventsHandler<CallSelfEvents> {
	id: string = crypto.randomUUID();
	name: string;

	#ctx: CallContext;

	#mic: MediaDevice;
	#camera: MediaDevice;
	#screenshare: Screenshare;

	#micEnabled: boolean = false;
	#micTrackData: TrackMetadata | undefined;
	#micTrack: MediaStreamTrack | undefined;

	#cameraEnabled: boolean = false;
	#cameraTrackData: TrackMetadata | undefined;
	#cameraTrack: MediaStreamTrack | undefined;

	#screenshareEnabled: boolean = false;
	#screenshareVideoTrackData: TrackMetadata | undefined;
	#screenshareVideoTrack: MediaStreamTrack | undefined;
	#screenshareAudioTrackData: TrackMetadata | undefined;
	#screenshareAudioTrack: MediaStreamTrack | undefined;

	#micDevice: MediaDeviceInfo | undefined;
	#cameraDevice: MediaDeviceInfo | undefined;
	#devices: MediaDeviceInfo[] | undefined = undefined;

	constructor(options: CallSelfOptions) {
		super();

		this.name = options.name;
		this.#ctx = getCurrentCallContext();

		this.#mic = getMic();
		this.#camera = getCamera();

		this.#mic.isBroadcasting$.subscribe((enabled) => {
			this.#micEnabled = enabled;
		});

		this.#mic.broadcastTrack$.subscribe((track) => {
			this.#micTrack = track;
		});

		this.#camera.isBroadcasting$.subscribe((enabled) => {
			this.#cameraEnabled = enabled;
		});

		this.#camera.broadcastTrack$.subscribe((track) => {
			this.#cameraTrack = track;
		});

		this.#mic.activeDevice$.subscribe((device) => {
			this.#micDevice = device;
			this.emit('activeDeviceUpdate', 'mic', device);
		});

		this.#camera.activeDevice$.subscribe((device) => {
			this.#cameraDevice = device;
			this.emit('activeDeviceUpdate', 'camera', device);
		});

		devices$.subscribe((devices) => {
			this.#devices = devices;
			this.emit('devicesUpdate', devices);
		});

		const micMetadata$ = this.#ctx.partyTracks.push(this.#mic.broadcastTrack$, {
			sendEncodings$: of([
				{ networkPriority: 'high' },
			] satisfies RTCRtpEncodingParameters[]),
		});

		micMetadata$.subscribe((metadata) => {
			if (this.#micEnabled && this.#micTrack) {
				this.#micTrackData = metadata;
				this.#ctx.socket.sendAction({
					action: 'self/mic-update',
					updates: {
						micEnabled: true,
						micTrackData: metadata,
					},
				});
				this.emit('micUpdate', {
					micEnabled: true,
					micTrack: this.#micTrack,
				});
			} else if (!this.#micEnabled) {
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
				sendEncodings$: this.#ctx.cameraEncodings$.asObservable(),
			},
		);

		cameraMetadata$.subscribe((metadata) => {
			if (this.#cameraEnabled && this.#cameraTrack) {
				this.#cameraTrackData = metadata;
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: {
						cameraEnabled: true,
						cameraTrackData: metadata,
					},
				});
				this.emit('cameraUpdate', {
					cameraEnabled: true,
					cameraTrack: this.#cameraTrack,
				});
			} else if (!this.#cameraEnabled) {
				this.#cameraTrackData = undefined;
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: { cameraEnabled: false },
				});
				this.emit('cameraUpdate', { cameraEnabled: false });
			}
		});

		if (options.defaults?.audio) {
			this.startMic();
		}

		if (options.defaults?.video) {
			this.startCamera();
		}

		this.#screenshare = getScreenshare({ audio: true });

		this.#screenshare.video.isBroadcasting$.subscribe((enabled) => {
			this.#screenshareEnabled = enabled;
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
			if (!this.#screenshareEnabled) {
				this.#ctx.socket.sendAction({
					action: 'self/screenshare-update',
					updates: {
						screenshareEnabled: false,
					},
				});
				this.emit('screenshareUpdate', { screenshareEnabled: false });
			} else {
				this.#screenshareVideoTrackData = metadata;
				this.#ctx.socket.sendAction({
					action: 'self/screenshare-update',
					updates: {
						screenshareEnabled: true,
						screenshareVideoTrackData: this.#screenshareVideoTrackData,
					},
				});
				this.emit('screenshareUpdate', {
					screenshareEnabled: true,
					screenshareVideoTrack: this.#screenshareVideoTrack,
				});
			}
		});

		screenshareAudioMetadata$.subscribe((metadata) => {
			if (!this.#screenshareEnabled) {
				this.#ctx.socket.sendAction({
					action: 'self/screenshare-update',
					updates: {
						screenshareEnabled: false,
					},
				});
				this.emit('screenshareUpdate', { screenshareEnabled: false });
			} else {
				this.#screenshareAudioTrackData = metadata;
				this.#ctx.socket.sendAction({
					action: 'self/screenshare-update',
					updates: {
						screenshareEnabled: true,
						screenshareAudioTrackData: this.#screenshareAudioTrackData,
					},
				});
				this.emit('screenshareUpdate', {
					screenshareEnabled: true,
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
		this.#screenshare.startBroadcasting();
	}

	stopScreenshare() {
		this.#screenshare.stopBroadcasting();
	}

	async setCameraDevice(deviceId: string) {
		const devices = this.devices;
		const device = devices?.find((d) => d.deviceId === deviceId);
		if (!device) {
			throw new Error(`Camera device not found: ${deviceId}`);
		}
		this.#camera.setPreferredDevice(device);
	}

	async setMicDevice(deviceId: string) {
		const devices = this.devices;
		const device = devices?.find((d) => d.deviceId === deviceId);
		if (!device) {
			throw new Error(`Microphone device not found: ${deviceId}`);
		}
		this.#mic.setPreferredDevice(device);
	}

	get micEnabled(): boolean {
		return this.#micEnabled;
	}

	get micTrack(): MediaStreamTrack | undefined {
		return this.#micEnabled ? this.#micTrack : undefined;
	}

	get cameraEnabled(): boolean {
		return this.#cameraEnabled;
	}

	get cameraTrack(): MediaStreamTrack | undefined {
		return this.#cameraEnabled ? this.#cameraTrack : undefined;
	}

	get screenshareEnabled(): boolean {
		return this.#screenshareEnabled;
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

	get devices(): MediaDeviceInfo[] | undefined {
		return this.#devices;
	}

	get activeDevices() {
		return {
			mic:
				this.#micDevice ??
				this.devices?.find(
					(d) => d.deviceId === 'default' && d.kind === 'audioinput',
				),
			camera:
				this.#cameraDevice ??
				this.devices?.find(
					(d) => d.deviceId === 'default' && d.kind === 'videoinput',
				),
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
			micTrackData: this.#micTrackData,
			cameraEnabled: this.cameraEnabled,
			cameraTrackData: this.#cameraTrackData,
			screenshareEnabled: this.screenshareEnabled,
			screenshareVideoTrackData: this.#screenshareVideoTrackData,
			screenshareAudioTrackData: this.#screenshareAudioTrackData,
		};
	}

	toString() {
		return `CallSelf::${this.id}::${this.name}`;
	}
}
