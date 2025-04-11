import {
	BehaviorSubject,
	combineLatest,
	distinctUntilChanged,
	filter,
	of,
	switchMap,
	tap,
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

		combineLatest([
			this.#micEnabled$.pipe(distinctUntilChanged()),
			this.#micTrack$.pipe(distinctUntilChanged()),
		]).subscribe(([micEnabled, micTrack]) => {
			this.#ctx.logger.debug('combineLatest', { micEnabled, micTrack });
			if (micEnabled && micTrack) {
				this.#ctx.logger.debug('📏 starting participant volume estimation');
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
				this.#ctx.logger.debug('📏 ending participant volume estimation');
				clearInterval(volumeInterval);
				const lastVolume = this.volume;
				this.volume = -Infinity;
				this.#ctx.call.participants.joined.emit(
					'volumeChange',
					this,
					lastVolume,
				);
			}
		});

		combineLatest([
			this.#micEnabled$.pipe(distinctUntilChanged()),
			this.#micTrackId$.pipe(distinctUntilChanged()),
		])
			.pipe(
				tap(([enabled, trackId]) => {
					if (!enabled && !trackId) {
						this.#ctx.logger.debug('🔈 reset participant mic state');
						this.#micTrack$.next(undefined);
						this.emit('micUpdate', { micEnabled: false });
						this.#ctx.call.participants.joined.emit('micUpdate', this);
						this.#ctx.call.participants.stage.emit('micUpdate', this);
					}
				}),
				filter(([enabled, trackId]) => enabled && typeof trackId === 'string'),
				switchMap(([enabled, trackId]) => {
					this.#ctx.logger.debug('🔈 pulling mic track:', trackId);
					const [sessionId, trackName] = trackId!.split('/');
					return this.#ctx.partyTracks.pull(
						of({
							sessionId,
							trackName,
							location: 'remote',
						} satisfies TrackMetadata),
					);
				}),
			)
			.subscribe((micTrack) => {
				this.#ctx.logger.debug('🔈 pulled mic track:', micTrack);
				this.#micTrack$.next(micTrack);
				this.emit('micUpdate', { micEnabled: true, micTrack });
				this.#ctx.call.participants.joined.emit('micUpdate', this);
				this.#ctx.call.participants.stage.emit('micUpdate', this);
			});

		combineLatest([
			this.#cameraEnabled$.pipe(distinctUntilChanged()),
			this.#cameraTrackId$.pipe(distinctUntilChanged()),
		])
			.pipe(
				tap(([enabled, trackId]) => {
					this.#ctx.logger.debug('before filter tap', { enabled, trackId });
					if (!enabled && !trackId) {
						this.#ctx.logger.debug('reset state');
						this.#cameraTrack$.next(undefined);
						this.emit('cameraUpdate', { cameraEnabled: false });
						this.#ctx.call.participants.joined.emit('cameraUpdate', this);
						this.#ctx.call.participants.stage.emit('cameraUpdate', this);
					}
				}),
				filter(([enabled, trackId]) => enabled && typeof trackId === 'string'),
				switchMap(([enabled, trackId]) => {
					this.#ctx.logger.debug('🎥 pulling camera track:', trackId);
					const [sessionId, trackName] = trackId!.split('/');
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
						this.#ctx.logger.debug('pulled camera track', track);
					},
					error: (error) => {
						this.#ctx.logger.debug('error while pulling camera track', error);
					},
				}),
			)
			.subscribe((cameraTrack) => {
				this.#ctx.logger.debug('🎥 pulled camera track:', cameraTrack);
				this.#cameraTrack$.next(cameraTrack);
				this.emit('cameraUpdate', {
					cameraEnabled: true,
					cameraTrack,
				});
				this.#ctx.call.participants.joined.emit('cameraUpdate', this);
				this.#ctx.call.participants.stage.emit('cameraUpdate', this);
			});
	}

	updateMicState(updates: { micEnabled: boolean; micTrackId?: string }) {
		this.#ctx.logger.debug('🎤 participant mic state updated', updates);
		if (updates.micEnabled && updates.micTrackId) {
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
		this.#ctx.logger.debug('🎥 participant camera state updated', updates);
		if (updates.cameraEnabled && updates.cameraTrackId) {
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
