import { BehaviorSubject, filter, of, switchMap } from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import type { CallParticipantEvents } from './call-participant-events';
import { type TrackMetadata } from 'partytracks/client';
import { getCurrentCallContext, type CallContext } from '../call-context';
import { parseTrackId } from '../../utils/tracks';

interface CallParticipantOptions extends Partial<SerializedUser> {
	id: string;
	name: string;

	micEnabled?: boolean;
	micTrackId?: string;

	cameraEnabled?: boolean;
	cameraTrackId?: string;

	screenshareEnabled?: boolean;
	screenshareVideoTrackId?: string;
	screenshareAudioTrackId?: string;
}

export class CallParticipant extends EventsHandler<CallParticipantEvents> {
	id: string;
	name: string;

	#ctx: CallContext;

	#micEnabled$: BehaviorSubject<boolean>;
	#micTrackId$: BehaviorSubject<string | undefined>;

	#micEnabled: boolean = false;
	#micTrack: MediaStreamTrack | undefined;

	#cameraEnabled$: BehaviorSubject<boolean>;
	#cameraTrackId$: BehaviorSubject<string | undefined>;

	#cameraEnabled: boolean = false;
	#cameraTrack: MediaStreamTrack | undefined;

	#screenshareEnabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);
	#screenshareVideoTrackId$: BehaviorSubject<string | undefined>;
	#screenshareAudioTrackId$: BehaviorSubject<string | undefined>;

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

		this.#micTrackId$ = new BehaviorSubject<string | undefined>(
			options.micEnabled ? options.micTrackId : undefined,
		);

		this.#cameraEnabled$ = new BehaviorSubject<boolean>(
			options.cameraEnabled || false,
		);

		this.#cameraTrackId$ = new BehaviorSubject<string | undefined>(
			options.cameraEnabled ? options.cameraTrackId : undefined,
		);

		this.#screenshareEnabled = options.screenshareEnabled || false;

		this.#screenshareVideoTrackId$ = new BehaviorSubject<string | undefined>(
			options.screenshareEnabled ? options.screenshareVideoTrackId : undefined,
		);

		this.#screenshareAudioTrackId$ = new BehaviorSubject<string | undefined>(
			options.screenshareEnabled ? options.screenshareAudioTrackId : undefined,
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

		const micMetadata$ = this.#micTrackId$.pipe(
			filter((id) => typeof id === 'string'),
			switchMap((id) => {
				const { sessionId, trackName } = parseTrackId(id);
				return of({
					sessionId,
					trackName,
					location: 'remote',
				} satisfies TrackMetadata);
			}),
		);

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

		const cameraMetadata$ = this.#cameraTrackId$.pipe(
			filter((id) => typeof id === 'string'),
			switchMap((id) => {
				const { sessionId, trackName } = parseTrackId(id);
				return of({
					sessionId,
					trackName,
					location: 'remote',
				} satisfies TrackMetadata);
			}),
		);

		const cameraTrack$ = this.#ctx.partyTracks.pull(cameraMetadata$, {
			simulcast: { preferredRid$: this.#ctx.cameraRid$ },
		});

		cameraTrack$.subscribe((track) => {
			this.#cameraEnabled = true;
			this.#cameraTrack = track;
			this.emit('cameraUpdate', { cameraEnabled: true, cameraTrack: track });
			this.#ctx.call.participants.joined.emit('cameraUpdate', this);
			this.#ctx.call.participants.emit('cameraUpdate', this);
		});

		const screenshareVideoMetadata$ = this.#screenshareVideoTrackId$.pipe(
			filter((id) => typeof id === 'string'),
			switchMap((id) => {
				const { sessionId, trackName } = parseTrackId(id);
				return of({
					sessionId,
					trackName,
					location: 'remote',
				} satisfies TrackMetadata);
			}),
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

		const screenshareAudioMetadata$ = this.#screenshareAudioTrackId$.pipe(
			filter((id) => typeof id === 'string'),
			switchMap((id) => {
				const { sessionId, trackName } = parseTrackId(id);
				return of({
					sessionId,
					trackName,
					location: 'remote',
				} satisfies TrackMetadata);
			}),
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

	updateMicState(updates: { micEnabled: boolean; micTrackId?: string }) {
		this.#ctx.logger.debug('🎙️ participant mic state updated', updates);
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
		this.#ctx.logger.debug('🎥 participant camera state updated', updates);
		if (updates.cameraEnabled && updates.cameraTrackId) {
			this.#cameraTrackId$.next(updates.cameraTrackId);
			this.#cameraEnabled$.next(true);
		} else {
			this.#cameraEnabled$.next(false);
		}
	}

	updateScreenshareState(updates: {
		screenshareEnabled: boolean;
		screenshareVideoTrackId?: string;
		screenshareAudioTrackId?: string;
	}) {
		this.#ctx.logger.debug('🖥️ participant screenshare state updated', updates);
		if (updates.screenshareEnabled) {
			if (updates.screenshareVideoTrackId) {
				this.#screenshareVideoTrackId$.next(updates.screenshareVideoTrackId);
			}
			if (updates.screenshareAudioTrackId) {
				this.#screenshareAudioTrackId$.next(updates.screenshareAudioTrackId);
			}
			this.#screenshareEnabled$.next(true);
			this.#screenshareEnabled = true;
		} else {
			this.#screenshareEnabled$.next(false);
			this.#screenshareVideoTrackId$.next(undefined);
			this.#screenshareAudioTrackId$.next(undefined);
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
