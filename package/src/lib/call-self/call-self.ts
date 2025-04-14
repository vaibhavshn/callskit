import { resilientTrack$ } from 'partytracks/client';
import { BehaviorSubject, distinctUntilChanged, switchMap, tap } from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import {
	blackCanvasStreamTrack$,
	inaudibleAudioTrack$,
} from '../../utils/tracks';
import { type CallClientOptions } from '../call-client/call-client';
import { getCurrentCallContext, type CallContext } from '../call-context';
import type { CallSelfEvents } from './call-self-events';
import { normalize_rms } from '../../utils/volume';

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

	volume: number = -Infinity;

	#ctx: CallContext;

	#micEnabled$: BehaviorSubject<boolean>;
	#micEnabled: boolean = false;
	#micTrack: MediaStreamTrack | undefined;
	#micTrackId: string | undefined;

	#cameraEnabled$: BehaviorSubject<boolean>;
	#cameraEnabled: boolean = false;
	#cameraTrack: MediaStreamTrack | undefined;
	#cameraTrackId: string | undefined;

	#volumeInterval: NodeJS.Timeout | undefined;

	constructor(options: CallSelfOptions) {
		super();
		this.name = options.name;
		this.#ctx = getCurrentCallContext();

		this.#micEnabled$ = new BehaviorSubject<boolean>(
			options.defaults?.audio ?? false,
		);

		this.#cameraEnabled$ = new BehaviorSubject<boolean>(
			options.defaults?.video ?? false,
		);

		const micTrack$ = this.#micEnabled$.pipe(
			distinctUntilChanged(),
			switchMap((enabled) =>
				enabled
					? resilientTrack$({ kind: 'audioinput' })
					: inaudibleAudioTrack$,
			),
			tap((track) => {
				this.#micTrack = track;
			}),
		);

		const micMetadata$ = this.#ctx.partyTracks.push(micTrack$);

		micMetadata$.subscribe((metadata) => {
			const micEnabled = this.#micEnabled$.value;
			const micTrack = this.#micTrack;

			if (micEnabled && micTrack) {
				const micTrackId = `${metadata.sessionId}/${metadata.trackName}`;
				this.#micTrackId = micTrackId;
				this.#micEnabled = true;
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
				this.#startVolumeMeasurement();
			} else if (!micEnabled) {
				this.#micEnabled = false;
				this.#ctx.socket.sendAction({
					action: 'self/mic-update',
					updates: { micEnabled: false },
				});
				this.emit('micUpdate', { micEnabled: false });
				this.#stopVolumeMeasurement();
			}
		});

		const cameraTrack$ = this.#cameraEnabled$.pipe(
			distinctUntilChanged(),
			switchMap((enabled) =>
				enabled
					? resilientTrack$({ kind: 'videoinput' })
					: blackCanvasStreamTrack$,
			),
			tap((track) => {
				this.#cameraTrack = track;
			}),
		);

		const cameraMetadata$ = this.#ctx.partyTracks.push(cameraTrack$);

		cameraMetadata$.subscribe((metadata) => {
			const cameraEnabled = this.#cameraEnabled$.value;
			const cameraTrack = this.#cameraTrack;

			if (cameraEnabled && cameraTrack) {
				const cameraTrackId = `${metadata.sessionId}/${metadata.trackName}`;
				this.#cameraTrackId = cameraTrackId;
				this.#cameraEnabled = true;
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
				this.#cameraEnabled = false;
				this.#cameraTrackId = undefined;
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: { cameraEnabled: false },
				});
				this.emit('cameraUpdate', { cameraEnabled: false });
			}
		});
	}

	#startVolumeMeasurement() {
		this.#stopVolumeMeasurement();

		if (this.#micEnabled && this.#micTrack) {
			this.#ctx.logger.debug('📏 starting participant volume estimation');
			const ctx = this.#ctx.volumeContext;
			ctx.resume();
			const stream = new MediaStream([this.#micTrack]);
			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 2048;
			source.connect(analyser);
			const bufferLength = analyser.frequencyBinCount;
			const dataArray = new Uint8Array(bufferLength);

			this.#volumeInterval = setInterval(() => {
				analyser.getByteTimeDomainData(dataArray);

				let sum = 0;
				for (const data of dataArray) {
					const normalized = (data - 128) / 128;
					sum += normalized * normalized;
				}

				const rms = Math.sqrt(sum / dataArray.length);

				const lastVolume = this.volume;
				this.volume = normalize_rms(rms);

				if (this.volume !== lastVolume) {
					this.emit('volumeChange', this.volume, lastVolume);
				}
			}, 400);
		}
	}

	#stopVolumeMeasurement() {
		this.#ctx.logger.debug('📏 ending participant volume estimation');
		clearInterval(this.#volumeInterval);
		const lastVolume = this.volume;
		this.volume = -Infinity;
		this.emit('volumeChange', this.volume, lastVolume);
	}

	startMic() {
		this.#micEnabled$.next(true);
	}

	stopMic() {
		this.#micEnabled$.next(false);
	}

	startCamera() {
		this.#cameraEnabled$.next(true);
	}

	stopCamera() {
		this.#cameraEnabled$.next(false);
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
