import { BehaviorSubject, map, of, switchMap, withLatestFrom } from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import type { CallParticipantEvents } from './call-participant-events';
import { type TrackMetadata } from 'partytracks/client';
import { getCurrentCallContext, type CallContext } from '../call-context';

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

		this.#micEnabled$
			.pipe(
				withLatestFrom(this.#micTrackId$),
				switchMap(([enabled, trackId]) => {
					if (enabled && trackId) {
						const [sessionId, trackName] = trackId!.split(':');
						return this.#ctx.partyTracks.pull(
							of({
								sessionId,
								trackName,
								location: 'remote',
							} satisfies TrackMetadata),
						);
					} else {
						return of(undefined);
					}
				}),
			)
			.pipe(
				withLatestFrom(this.#micEnabled$),
				map(([track, enabled]) => {
					return [enabled, track] as const;
				}),
			)
			.subscribe({
				next: ([enabled, track]) => {
					this.#ctx.logger.debug('pulled', { enabled, track });
					if (enabled && track) {
						this.#micTrack$.next(track);
						this.emit('micUpdate', { micEnabled: true, micTrack: track });
						this.#ctx.participants.emit('micUpdate', this);
					} else {
						this.#micTrack$.next(undefined);
						this.emit('micUpdate', { micEnabled: false });
						this.#ctx.participants.emit('micUpdate', this);
					}
				},
			});

		this.#cameraEnabled$
			.pipe(
				withLatestFrom(this.#cameraTrackId$),
				switchMap(([enabled, trackId]) => {
					if (enabled && trackId) {
						const [sessionId, trackName] = trackId.split(':');
						return this.#ctx.partyTracks.pull(
							of({
								sessionId,
								trackName,
								location: 'remote',
							} satisfies TrackMetadata),
						);
					} else {
						return of(undefined);
					}
				}),
			)
			.pipe(
				withLatestFrom(this.#cameraEnabled$),
				map(([track, enabled]) => {
					return [enabled, track] as const;
				}),
			)
			.subscribe({
				next: ([cameraEnabled, cameraTrack]) => {
					this.#ctx.logger.debug('pulled', { enabled: cameraEnabled, track: cameraTrack });
					if (cameraEnabled && cameraTrack) {
						this.#cameraTrack$.next(cameraTrack);
						this.emit('cameraUpdate', {
							cameraEnabled,
							cameraTrack,
						});
						this.#ctx.participants.emit('cameraUpdate', this);
					} else {
						this.#cameraTrack$.next(undefined);
						this.emit('cameraUpdate', { cameraEnabled: false });
						this.#ctx.participants.emit('cameraUpdate', this);
					}
				},
			});
	}

	updateMicState(updates: { micEnabled: boolean; micTrackId?: string }) {
		if (updates.micEnabled && updates.micTrackId) {
			this.#micTrackId$.next(updates.micTrackId);
			this.#micEnabled$.next(true);
		} else {
			this.#micEnabled$.next(false);
		}
	}

	updateCameraState(updates: {
		cameraEnabled: boolean;
		cameraTrackId?: string;
	}) {
		if (updates.cameraEnabled && updates.cameraTrackId) {
			this.#cameraTrackId$.next(updates.cameraTrackId);
			this.#cameraEnabled$.next(true);
		} else {
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
