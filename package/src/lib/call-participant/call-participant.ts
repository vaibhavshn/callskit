import {
	BehaviorSubject,
	combineLatest,
	distinctUntilChanged,
	filter,
	map,
	of,
	switchMap,
	tap,
	withLatestFrom,
} from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import type { CallParticipantEvents } from './call-participant-events';
import { type TrackMetadata } from 'partytracks/client';
import { getCurrentCallContext, type CallContext } from '../call-context';
import { rmsToDbfs } from '../../utils/number';

interface CallParticipantOptions extends Partial<SerializedUser> {
	id: string;
	name: string;

	micEnabled?: boolean;
	micTrackId?: string;

	cameraEnabled?: boolean;
	cameraTrackId?: string;

	screenShareEnabled?: boolean;
	screenShareTrackIds?: { video: string; audio: string };
}

export class CallParticipant extends EventsHandler<CallParticipantEvents> {
	id: string;
	name: string;

	volume: number = 0;

	#ctx: CallContext;

	#micEnabled$: BehaviorSubject<boolean>;
	#micTrackId$: BehaviorSubject<string | undefined>;
	#micTrack$ = new BehaviorSubject<MediaStreamTrack | undefined>(undefined);

	#cameraEnabled$: BehaviorSubject<boolean>;
	#cameraTrackId$: BehaviorSubject<string | undefined>;
	#cameraTrack$ = new BehaviorSubject<MediaStreamTrack | undefined>(undefined);

	constructor(options: CallParticipantOptions) {
		super();
		this.id = options.id;
		this.name = options.name;

		this.#ctx = getCurrentCallContext();

		this.#micEnabled$ = new BehaviorSubject<boolean>(
			options.micEnabled || false,
		);
		this.#micTrackId$ = new BehaviorSubject<string | undefined>(
			options.micTrackId,
		);

		this.#cameraEnabled$ = new BehaviorSubject<boolean>(
			options.cameraEnabled || false,
		);
		this.#cameraTrackId$ = new BehaviorSubject<string | undefined>(
			options.cameraTrackId,
		);

		let volumeInterval: NodeJS.Timeout;

		combineLatest([this.#micEnabled$, this.#micTrack$]).subscribe(
			([micEnabled, micTrack]) => {
				console.log('combineLatest', { micEnabled, micTrack });
				if (micEnabled && micTrack) {
					console.log('analyzing');
					const ctx = this.#ctx.volumeContext;
					ctx.resume();
					const stream = new MediaStream([micTrack]);
					const source = ctx.createMediaStreamSource(stream);
					const analyser = ctx.createAnalyser();
					analyser.fftSize = 2048;
					source.connect(analyser);
					const bufferLength = analyser.frequencyBinCount;
					const dataArray = new Uint8Array(bufferLength);

					volumeInterval = setInterval(() => {
						analyser.getByteTimeDomainData(dataArray);

						let sum = 0;
						for (const data of dataArray) {
							const normalized = (data - 128) / 128;
							sum += normalized * normalized;
						}

						const rms = Math.sqrt(sum / dataArray.length);

						const lastVolume = this.volume;
						this.volume = rmsToDbfs(rms);

						if (this.volume !== lastVolume) {
							this.emit('volumeChange', this.volume, lastVolume);
							this.#ctx.call.participants.joined.emit(
								'volumeChange',
								this,
								lastVolume,
							);
						}
					}, 500);
				} else {
					clearInterval(volumeInterval);
					const lastVolume = this.volume;
					this.volume = -Infinity;
					this.#ctx.call.participants.joined.emit(
						'volumeChange',
						this,
						lastVolume,
					);
				}
			},
		);

		combineLatest([this.#micEnabled$, this.#micTrackId$])
			.pipe(
				tap(([enabled]) => {
					if (!enabled) {
						console.log('reset state');
						this.#micTrack$.next(undefined);
						this.emit('micUpdate', { micEnabled: false });
						this.#ctx.call.participants.joined.emit('micUpdate', this);
						this.#ctx.call.participants.stage.emit('micUpdate', this);
					}
				}),
				filter(([enabled, trackId]) => enabled && typeof trackId === 'string'),
				switchMap(([enabled, trackId]) => {
					console.log('tap latest', { enabled, trackId });
					console.log('pulling mic trackij', trackId);
					const [sessionId, trackName] = trackId!.split(':');
					return this.#ctx.partyTracks.pull(
						of({
							sessionId,
							trackName,
							location: 'remote',
						} satisfies TrackMetadata),
					);
				}),
				tap((track) => {
					console.log('pulled track', track);
				}),
			)
			.subscribe((track) => {
				this.#micTrack$.next(track);
				this.emit('micUpdate', { micEnabled: true, micTrack: track });
				this.#ctx.call.participants.joined.emit('micUpdate', this);
				this.#ctx.call.participants.stage.emit('micUpdate', this);
			});

		combineLatest([
			this.#cameraEnabled$.pipe(distinctUntilChanged()),
			this.#cameraTrackId$.pipe(distinctUntilChanged()),
		])
			.pipe(
				tap(([enabled, trackId]) => {
					console.log('before filter tap', { enabled, trackId });
					if (!enabled && !trackId) {
						console.log('reset state');
						this.#cameraTrack$.next(undefined);
						this.emit('cameraUpdate', { cameraEnabled: false });
						this.#ctx.call.participants.joined.emit('cameraUpdate', this);
						this.#ctx.call.participants.stage.emit('cameraUpdate', this);
					}
				}),
				filter(([enabled, trackId]) => enabled && typeof trackId === 'string'),
				switchMap(([enabled, trackId]) => {
					console.log('tap latest camera', { enabled, trackId });
					console.log('pulling camera track', trackId);
					const [sessionId, trackName] = trackId!.split(':');
					return this.#ctx.partyTracks.pull(
						of({
							sessionId,
							trackName,
							location: 'remote',
						} satisfies TrackMetadata),
						{ simulcast: { preferredRid$: this.#ctx.cameraRid$ } },
					);
				}),
				tap({
					next: (track) => {
						console.log('pulled camera track', track);
					},
					error: (error) => {
						console.log('error while pulling camera track', error);
					},
				}),
			)
			.subscribe((track) => {
				console.log('emit camera track', track);
				this.#cameraTrack$.next(track);
				this.emit('cameraUpdate', { cameraEnabled: true, cameraTrack: track });
				this.#ctx.call.participants.joined.emit('cameraUpdate', this);
				this.#ctx.call.participants.stage.emit('cameraUpdate', this);
			});
	}

	updateMicState(updates: { micEnabled: boolean; micTrackId?: string }) {
		if (updates.micEnabled && updates.micTrackId) {
			console.log('updateMicState true');
			this.#micTrackId$.next(updates.micTrackId);
			this.#micEnabled$.next(true);
		} else {
			this.#micTrackId$.next(undefined);
			this.#micEnabled$.next(false);
		}
	}

	updateCameraState(updates: {
		cameraEnabled: boolean;
		cameraTrackId?: string;
	}) {
		if (updates.cameraEnabled && updates.cameraTrackId) {
			console.log('update camera state', updates);
			this.#cameraTrackId$.next(updates.cameraTrackId);
			this.#cameraEnabled$.next(true);
		} else {
			this.#cameraTrackId$.next(undefined);
			this.#cameraEnabled$.next(false);
		}
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

	static fromJSON(obj: SerializedUser): CallParticipant {
		return new CallParticipant(obj);
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
