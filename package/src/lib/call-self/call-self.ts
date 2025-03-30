import {
	BehaviorSubject,
	combineLatest,
	distinctUntilChanged,
	distinctUntilKeyChanged,
	map,
	of,
	skip,
	switchMap,
	tap,
	withLatestFrom,
} from 'rxjs';
import { EventsHandler } from '../../utils/events-handler';
import { resilientTrack$ } from 'partytracks/client';
import {
	blackCanvasStreamTrack,
	getInaudibleTrack,
	inaudibleAudioTrack$,
} from '../../utils/tracks';
import { type CallClientOptions } from '../call-client/call-client';
import type {
	CallSelfEvents,
	ParticipantMediaEvents,
} from './call-self-events';
import { getCurrentCallContext, type CallContext } from '../call-context';
import type { SerializedUser } from '../../types/call-socket';

export type CallSelfOptions = {
	name: string;
	defaults: CallClientOptions['defaults'];
};

export class CallSelf extends EventsHandler<CallSelfEvents> {
	id: string = crypto.randomUUID();
	name: string;

	#ctx: CallContext;

	#micEnabled$ = new BehaviorSubject<boolean>(false);
	#micTrackId$ = new BehaviorSubject<string | undefined>(undefined);
	#micTrack$ = new BehaviorSubject<MediaStreamTrack>(getInaudibleTrack().track);

	#cameraEnabled$ = new BehaviorSubject<boolean>(false);
	#cameraTrackId$ = new BehaviorSubject<string | undefined>(undefined);
	#cameraTrack$ = new BehaviorSubject<MediaStreamTrack>(
		blackCanvasStreamTrack(),
	);

	constructor(options: CallSelfOptions) {
		super();
		this.name = options.name;
		this.#ctx = getCurrentCallContext();

		combineLatest([
			this.#micEnabled$.pipe(distinctUntilChanged()),
			this.#micTrackId$.pipe(distinctUntilChanged()),
		])
			.pipe(skip(2))
			.subscribe(([micEnabled, micTrackId]) => {
				if (micEnabled && micTrackId) {
					this.#ctx.socket.sendAction({
						action: 'self/mic-update',
						updates: { micEnabled, micTrackId },
					});
				} else if (!micEnabled) {
					this.#ctx.socket.sendAction({
						action: 'self/mic-update',
						updates: { micEnabled: false },
					});
				}
			});

		combineLatest([
			this.#cameraEnabled$.pipe(distinctUntilChanged()),
			this.#cameraTrackId$.pipe(distinctUntilChanged()),
		])
			.pipe(skip(2))
			.subscribe(([cameraEnabled, cameraTrackId]) => {
				if (cameraEnabled && cameraTrackId) {
					this.#ctx.socket.sendAction({
						action: 'self/camera-update',
						updates: { cameraEnabled, cameraTrackId },
					});
				} else if (!cameraEnabled) {
					this.#ctx.socket.sendAction({
						action: 'self/camera-update',
						updates: { cameraEnabled: false },
					});
				}
			});

		this.#ctx.partyTracks.push(this.#micTrack$).subscribe((metadata) => {
			const trackId = `${metadata.sessionId}:${metadata.trackName}`;
			console.log('pushed mic id', { trackId });
			this.#micTrackId$.next(trackId);
		});

		this.#ctx.partyTracks.push(this.#cameraTrack$).subscribe((metadata) => {
			const trackId = `${metadata.sessionId}:${metadata.trackName}`;
			console.log('pushed camera id', { trackId });
			this.#cameraTrackId$.next(trackId);
		});

		this.#micEnabled$
			.pipe(
				switchMap((enabled) => {
					const track$ = enabled
						? resilientTrack$({
								kind: 'audioinput',
								constraints: {
									echoCancellation: true,
									autoGainControl: true,
								},
							})
						: inaudibleAudioTrack$;

					return track$.pipe(
						withLatestFrom(this.#micEnabled$),
						map(([track, enabled]) => [enabled, track] as const),
					);
				}),
			)
			.subscribe({
				next: ([micEnabled, micTrack]) => {
					this.#micTrack$.next(micTrack);
					if (micEnabled) {
						this.emit('micUpdate', { micEnabled, micTrack });
					} else {
						this.emit('micUpdate', { micEnabled: false });
					}
				},
				error: (e: Error) => {
					console.log('error getting track', e);
				},
			});

		this.#cameraEnabled$
			.pipe(
				switchMap((enabled) => {
					const track$ = enabled
						? resilientTrack$({
								kind: 'videoinput',
								constraints: {
									width: { ideal: 1280, max: 1920 },
									height: { ideal: 720, max: 1080 },
									aspectRatio: 16 / 9,
									frameRate: 24,
									backgroundBlur: true,
								},
							})
						: of(blackCanvasStreamTrack());

					return track$.pipe(
						withLatestFrom(this.#cameraEnabled$),
						map(([track, enabled]) => [enabled, track] as const),
					);
				}),
			)
			.subscribe({
				next: ([cameraEnabled, cameraTrack]) => {
					this.#cameraTrack$.next(cameraTrack);
					if (cameraEnabled) {
						this.emit('cameraUpdate', { cameraEnabled, cameraTrack });
					} else {
						this.emit('cameraUpdate', { cameraEnabled: false });
					}
				},
				error: (e: Error) => {
					console.log('error getting track', e);
				},
			});

		// this.#micEnabled$.pipe(
		// 	withLatestFrom(this.#micTrackId$),
		// 	map(([micEnabled, micTrackId]) => {
		// 		if (micTrackId && micEnabled) {
		// 			this.#ctx.socket.sendAction({
		// 				action: 'self/mic-update',
		// 				updates: { micEnabled, micTrackId },
		// 			});
		// 		} else if (!micEnabled) {
		// 			this.#ctx.socket.sendAction({
		// 				action: 'self/mic-update',
		// 				updates: { micEnabled },
		// 			});
		// 		}
		// 	}),
		// );

		if (options.defaults?.audio === true) {
			this.#micEnabled$.next(true);
		}
		if (options.defaults?.video === true) {
			this.#cameraEnabled$.next(true);
		}
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

	get micEnabled() {
		return this.#micEnabled$.value;
	}

	get micTrack() {
		return this.#micTrack$.value;
	}

	get cameraEnabled() {
		return this.#cameraEnabled$.value;
	}

	get cameraTrack() {
		return this.#cameraTrack$.value;
	}

	toJSON(): SerializedUser {
		return {
			id: this.id,
			name: this.name,
			micEnabled: this.micEnabled,
			micTrackId: this.#micTrackId$.value,
			cameraEnabled: this.cameraEnabled,
			cameraTrackId: this.#cameraTrackId$.value,
		};
	}
}
