import { resilientTrack$ } from 'partytracks/client';
import {
	BehaviorSubject,
	combineLatest,
	distinctUntilChanged,
	Observable,
	of,
	shareReplay,
	switchMap,
} from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import {
	blackCanvasStreamTrack$,
	inaudibleAudioTrack$,
} from '../../utils/tracks';
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

	#micEnabled$: BehaviorSubject<boolean>;
	#micTrack$: Observable<MediaStreamTrack>;
	#micTrack: MediaStreamTrack | undefined;
	#micTrackId$ = new BehaviorSubject<string | undefined>(undefined);

	#cameraEnabled$: BehaviorSubject<boolean>;
	#cameraTrack$: Observable<MediaStreamTrack>;
	#cameraTrack: MediaStreamTrack | undefined;
	#cameraTrackId$ = new BehaviorSubject<string | undefined>(undefined);

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

		this.#micTrack$ = this.#micEnabled$.pipe(
			switchMap((enabled) =>
				enabled
					? resilientTrack$({
							kind: 'audioinput',
							constraints: {
								echoCancellation: true,
								autoGainControl: true,
								noiseSuppression: true,
							},
						})
					: inaudibleAudioTrack$,
			),
			shareReplay({
				refCount: true,
				bufferSize: 1,
			}),
		);

		this.#micTrack$.subscribe((track) => {
			this.#ctx.logger.debug('🎤 received local mic track', track);
			this.#micTrack = track;
		});

		combineLatest([
			this.#micEnabled$.pipe(distinctUntilChanged()),
			this.#micTrackId$.pipe(distinctUntilChanged()),
		]).subscribe(([micEnabled, micTrackId]) => {
			const micTrack = this.#micTrack;
			this.#ctx.logger.debug('🎤 latest mic data', {
				micTrackId,
				micEnabled,
				micTrack,
			});
			if (micEnabled && micTrack) {
				this.#ctx.socket.sendAction({
					action: 'self/mic-update',
					updates: { micEnabled, micTrackId },
				});
				this.emit('micUpdate', { micEnabled, micTrack });
			} else if (!micEnabled && !micTrack) {
				this.#ctx.socket.sendAction({
					action: 'self/mic-update',
					updates: { micEnabled: false, micTrackId: undefined },
				});
				this.emit('micUpdate', { micEnabled: false });
			}
		});

		// Push local mic track
		const micMetadata$ = this.#ctx.partyTracks.push(this.#micTrack$, {
			sendEncodings$: of([{ maxBitrate: 64_000, networkPriority: 'high' }]),
		});

		micMetadata$.subscribe((metadata) => {
			const trackId = `${metadata.sessionId}/${metadata.trackName}`;
			this.#ctx.logger.debug('🎤 got local mic trackId:', trackId);
			this.#micTrackId$.next(trackId);
		});

		this.#cameraTrack$ = this.#cameraEnabled$.pipe(
			switchMap((enabled) =>
				enabled
					? resilientTrack$({
							kind: 'videoinput',
							constraints: {
								width: { ideal: 1280 },
								height: { ideal: 720 },
								aspectRatio: 16 / 9,
								backgroundBlur: true,
							},
						})
					: blackCanvasStreamTrack$,
			),
			shareReplay({
				refCount: true,
				bufferSize: 1,
			}),
		);

		this.#cameraTrack$.subscribe((track) => {
			this.#ctx.logger.debug('📷 received local camera track', track);
			this.#cameraTrack = track;
		});

		combineLatest([
			this.#cameraEnabled$.pipe(distinctUntilChanged()),
			this.#cameraTrackId$.pipe(distinctUntilChanged()),
		]).subscribe(([cameraEnabled, cameraTrackId]) => {
			const cameraTrack = this.cameraTrack;
			this.#ctx.logger.debug('📷 latest camera data', {
				cameraTrackId,
				cameraEnabled,
				cameraTrack,
			});
			if (cameraEnabled && cameraTrack) {
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: { cameraEnabled, cameraTrackId },
				});
				this.emit('cameraUpdate', { cameraEnabled, cameraTrack });
			} else if (!cameraEnabled && !cameraTrack) {
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: { cameraEnabled: false, cameraTrackId: undefined },
				});
				this.emit('cameraUpdate', { cameraEnabled: false });
			}
		});

		// Push local camera track
		const cameraMetadata$ = this.#ctx.partyTracks.push(this.#cameraTrack$, {
			sendEncodings$: this.#ctx.cameraEncodings$,
		});

		cameraMetadata$.subscribe((metadata) => {
			const trackId = `${metadata.sessionId}/${metadata.trackName}`;
			this.#ctx.logger.debug('📷 got local camera trackId:', trackId);
			console.log('camera metadata', trackId, this.cameraEnabled);
			this.#cameraTrackId$.next(trackId);
		});
	}

	startMic() {
		this.#micEnabled$.next(true);
	}

	stopMic() {
		this.#micTrackId$.next(undefined);
		this.#micEnabled$.next(false);
	}

	startCamera() {
		this.#cameraEnabled$.next(true);
	}

	stopCamera() {
		this.#cameraTrackId$.next(undefined);
		this.#cameraEnabled$.next(false);
	}

	get micEnabled(): boolean {
		return this.#micEnabled$.value;
	}

	get micTrack(): MediaStreamTrack | undefined {
		return this.micEnabled && this.#micTrack ? this.#micTrack : undefined;
	}

	get cameraEnabled(): boolean {
		return this.#cameraEnabled$.value;
	}

	get cameraTrack(): MediaStreamTrack | undefined {
		return this.cameraEnabled && this.#cameraTrack
			? this.#cameraTrack
			: undefined;
	}

	toJSON(): SerializedUser {
		const micTrackId = this.#micTrackId$.value;
		const micEnabled = this.micEnabled && typeof micTrackId == 'string';

		const cameraTrackId = this.#cameraTrackId$.value;
		const cameraEnabled =
			this.cameraEnabled && typeof cameraTrackId === 'string';

		return {
			id: this.id,
			name: this.name,
			micEnabled,
			micTrackId: micEnabled ? micTrackId : undefined,
			cameraEnabled,
			cameraTrackId: cameraEnabled ? cameraTrackId : undefined,
		};
	}
}
