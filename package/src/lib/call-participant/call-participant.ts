import { BehaviorSubject, filter, of } from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import type { CallParticipantEvents } from './call-participant-events';
import { type TrackMetadata } from 'partytracks/client';
import { getCurrentCallContext, type CallContext } from '../call-context';

interface CallParticipantOptions extends Partial<SerializedUser> {
	id: string;
	name: string;

	micEnabled?: boolean;
	micTrackData?: TrackMetadata;

	cameraEnabled?: boolean;
	cameraTrackData?: TrackMetadata;

	screenshareEnabled?: boolean;
	screenshareVideoTrackData?: TrackMetadata;
	screenshareAudioTrackData?: TrackMetadata;
}

export class CallParticipant extends EventsHandler<CallParticipantEvents> {
	id: string;
	name: string;

	#ctx: CallContext;

	#micEnabled$: BehaviorSubject<boolean>;
	#micTrackData$: BehaviorSubject<TrackMetadata | undefined>;

	#micEnabled: boolean = false;
	#micTrack: MediaStreamTrack | undefined;

	#cameraEnabled$: BehaviorSubject<boolean>;
	#cameraTrackData$: BehaviorSubject<TrackMetadata | undefined>;

	#cameraEnabled: boolean = false;
	#cameraTrack: MediaStreamTrack | undefined;

	#screenshareEnabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);
	#screenshareVideoTrackData$: BehaviorSubject<TrackMetadata | undefined>;
	#screenshareAudioTrackData$: BehaviorSubject<TrackMetadata | undefined>;

	#screenshareEnabled: boolean = false;
	#screenshareVideoTrack: MediaStreamTrack | undefined;
	#screenshareAudioTrack: MediaStreamTrack | undefined;

	constructor(options: CallParticipantOptions) {
		super();
		this.id = options.id;
		this.name = options.name;

		this.#ctx = getCurrentCallContext();

		this.#micEnabled$ = new BehaviorSubject<boolean>(
			options.micEnabled || false,
		);

		this.#micTrackData$ = new BehaviorSubject<TrackMetadata | undefined>(
			options.micEnabled ? options.micTrackData : undefined,
		);

		this.#cameraEnabled$ = new BehaviorSubject<boolean>(
			options.cameraEnabled || false,
		);

		this.#cameraTrackData$ = new BehaviorSubject<TrackMetadata | undefined>(
			options.cameraEnabled ? options.cameraTrackData : undefined,
		);

		this.#screenshareEnabled = options.screenshareEnabled || false;

		this.#screenshareVideoTrackData$ = new BehaviorSubject<
			TrackMetadata | undefined
		>(
			options.screenshareEnabled
				? options.screenshareVideoTrackData
				: undefined,
		);

		this.#screenshareAudioTrackData$ = new BehaviorSubject<
			TrackMetadata | undefined
		>(
			options.screenshareEnabled
				? options.screenshareAudioTrackData
				: undefined,
		);

		this.#micEnabled$.subscribe((enabled) => {
			if (!enabled) {
				this.#micEnabled = false;
				this.emit('micUpdate', { micEnabled: false });
				this.#ctx.call.participants.joined.emit('micUpdate', this);
			} else if (enabled && this.#micTrack) {
				this.#micEnabled = true;
				this.emit('micUpdate', {
					micEnabled: true,
					micTrack: this.#micTrack,
				});
				this.#ctx.call.participants.joined.emit('micUpdate', this);
				this.#ctx.call.participants.emit('micUpdate', this);
			}
		});

		const micMetadata$ = this.#micTrackData$.pipe(filter(Boolean));

		const micTrack$ = this.#ctx.partyTracks.pull(micMetadata$);

		micTrack$.subscribe((track) => {
			this.#micEnabled = true;
			this.#micTrack = track;
			this.emit('micUpdate', { micEnabled: true, micTrack: track });
			this.#ctx.call.participants.joined.emit('micUpdate', this);
			this.#ctx.call.participants.emit('micUpdate', this);
		});

		this.#cameraEnabled$.subscribe((enabled) => {
			if (!enabled) {
				this.#cameraEnabled = false;
				this.emit('cameraUpdate', { cameraEnabled: false });
				this.#ctx.call.participants.joined.emit('cameraUpdate', this);
				this.#ctx.call.participants.emit('cameraUpdate', this);
			} else if (enabled && this.#cameraTrack) {
				this.#cameraEnabled = true;
				this.emit('cameraUpdate', {
					cameraEnabled: true,
					cameraTrack: this.#cameraTrack,
				});
				this.#ctx.call.participants.joined.emit('cameraUpdate', this);
				this.#ctx.call.participants.emit('cameraUpdate', this);
			}
		});

		const cameraMetadata$ = this.#cameraTrackData$.pipe(filter(Boolean));

		const cameraTrack$ = this.#ctx.partyTracks.pull(cameraMetadata$, {
			simulcast: {
				preferredRid$: this.#ctx.cameraRid$.asObservable(),
			},
		});

		cameraTrack$.subscribe((track) => {
			this.#cameraEnabled = true;
			this.#cameraTrack = track;
			this.emit('cameraUpdate', { cameraEnabled: true, cameraTrack: track });
			this.#ctx.call.participants.joined.emit('cameraUpdate', this);
			this.#ctx.call.participants.emit('cameraUpdate', this);
		});

		const screenshareVideoMetadata$ = this.#screenshareVideoTrackData$.pipe(
			filter(Boolean),
		);

		const screenshareVideoTrack$ = this.#ctx.partyTracks.pull(
			screenshareVideoMetadata$,
		);

		screenshareVideoTrack$.subscribe((track) => {
			this.#screenshareVideoTrack = track;
			this.emit('screenshareUpdate', {
				screenshareEnabled: true,
				screenshareVideoTrack: track,
				screenshareAudioTrack: this.#screenshareAudioTrack,
			});
			this.#ctx.call.participants.joined.emit('screenshareUpdate', this);
			this.#ctx.call.participants.emit('screenshareUpdate', this);
		});

		const screenshareAudioMetadata$ = this.#screenshareAudioTrackData$.pipe(
			filter(Boolean),
		);

		const screenshareAudioTrack$ = this.#ctx.partyTracks.pull(
			screenshareAudioMetadata$,
		);

		screenshareAudioTrack$.subscribe((track) => {
			this.#screenshareAudioTrack = track;
			this.emit('screenshareUpdate', {
				screenshareEnabled: true,
				screenshareVideoTrack: this.#screenshareVideoTrack,
				screenshareAudioTrack: track,
			});
			this.#ctx.call.participants.joined.emit('screenshareUpdate', this);
			this.#ctx.call.participants.emit('screenshareUpdate', this);
		});
	}

	updateMicState(updates: {
		micEnabled: boolean;
		micTrackData?: TrackMetadata;
	}) {
		this.#ctx.logger.debug('🎙️ participant mic state updated', updates);
		if (updates.micEnabled && updates.micTrackData) {
			this.#micTrackData$.next(updates.micTrackData);
			this.#micEnabled$.next(true);
		} else {
			this.#micEnabled$.next(false);
		}
	}

	updateCameraState(updates: {
		cameraEnabled: boolean;
		cameraTrackData?: TrackMetadata;
	}) {
		this.#ctx.logger.debug('🎥 participant camera state updated', updates);
		if (updates.cameraEnabled && updates.cameraTrackData) {
			this.#cameraTrackData$.next(updates.cameraTrackData);
			this.#cameraEnabled$.next(true);
		} else {
			this.#cameraTrackData$.next(undefined);
			this.#cameraEnabled$.next(false);
		}
	}

	updateScreenshareState(updates: {
		screenshareEnabled: boolean;
		screenshareVideoTrackData?: TrackMetadata;
		screenshareAudioTrackData?: TrackMetadata;
	}) {
		this.#ctx.logger.debug('🖥️ participant screenshare state updated', updates);
		if (updates.screenshareEnabled) {
			if (updates.screenshareVideoTrackData) {
				this.#screenshareVideoTrackData$.next(
					updates.screenshareVideoTrackData,
				);
			}
			if (updates.screenshareAudioTrackData) {
				this.#screenshareAudioTrackData$.next(
					updates.screenshareAudioTrackData,
				);
			}
			this.#screenshareEnabled$.next(true);
			this.#screenshareEnabled = true;
		} else {
			this.#screenshareEnabled$.next(false);
			this.#screenshareVideoTrackData$.next(undefined);
			this.#screenshareAudioTrackData$.next(undefined);
			this.#screenshareEnabled = false;
			this.emit('screenshareUpdate', { screenshareEnabled: false });
			this.#ctx.call.participants.joined.emit('screenshareUpdate', this);
			this.#ctx.call.participants.emit('screenshareUpdate', this);
		}
	}

	get micEnabled() {
		return this.#micEnabled;
	}

	get micTrack() {
		return this.#micEnabled ? this.#micTrack : undefined;
	}

	get cameraEnabled() {
		return this.#cameraEnabled;
	}

	get cameraTrack() {
		return this.#cameraEnabled ? this.#cameraTrack : undefined;
	}

	get screenshareEnabled() {
		return this.#screenshareEnabled;
	}

	get screenshareTracks() {
		if (!this.screenshareEnabled) {
			return undefined;
		}

		return {
			video: this.#screenshareVideoTrack!,
			audio: this.#screenshareAudioTrack,
		};
	}

	toString() {
		return `CallParticipant::${this.id}::${this.name}`;
	}

	static fromJSON(obj: SerializedUser): CallParticipant {
		return new CallParticipant(obj);
	}
}
