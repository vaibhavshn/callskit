import { BehaviorSubject, filter, of, switchMap } from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import type { CallParticipantEvents } from './call-participant-events';
import { type TrackMetadata } from 'partytracks/client';
import { getCurrentCallContext, type CallContext } from '../call-context';
import { normalize_rms } from '../../utils/volume';

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

	volume: number = -Infinity;

	#ctx: CallContext;

	#micEnabled$: BehaviorSubject<boolean>;
	#micTrackId$: BehaviorSubject<string | undefined>;

	#micEnabled: boolean = false;
	#micTrack: MediaStreamTrack | undefined;

	#cameraEnabled$: BehaviorSubject<boolean>;
	#cameraTrackId$: BehaviorSubject<string | undefined>;

	#cameraEnabled: boolean = false;
	#cameraTrack: MediaStreamTrack | undefined;

	#volumeInterval: NodeJS.Timeout | undefined;

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

		this.#micEnabled$.subscribe((enabled) => {
			console.log('mic-subscribe', { enabled });
			if (!enabled) {
				console.log('mic-subscribe:false');
				this.#micEnabled = false;
				this.emit('micUpdate', { micEnabled: false });
				this.#ctx.call.participants.emit('micUpdate', this);
				this.#ctx.call.participants.joined.emit('micUpdate', this);
				// this.#ctx.call.participants.stage.emit('micUpdate', this);
				// this.#startVolumeMeasurement();
			} else if (enabled && this.#micTrack) {
				console.log('mic-subscribe:true');
				this.#micEnabled = true;
				this.emit('micUpdate', {
					micEnabled: true,
					micTrack: this.#micTrack,
				});
				this.#ctx.call.participants.emit('micUpdate', this);
				this.#ctx.call.participants.joined.emit('micUpdate', this);
				// this.#ctx.call.participants.stage.emit('micUpdate', this);
				// this.#stopVolumeMeasurement();
			} else {
				console.log('subscribe:other', enabled, this.#micTrack);
			}
		});

		const micMetadata$ = this.#micTrackId$.pipe(
			filter((id) => typeof id === 'string'),
			switchMap((id) => {
				const [sessionId, trackName] = id.split('/');
				return of({
					sessionId,
					trackName,
					location: 'remote',
				} satisfies TrackMetadata);
			}),
		);

		const micTrack$ = this.#ctx.partyTracks.pull(micMetadata$);

		micTrack$.subscribe((track) => {
			console.log('emitting event', true, track);
			this.#micEnabled = true;
			this.#micTrack = track;
			this.emit('micUpdate', { micEnabled: true, micTrack: track });
			this.#ctx.call.participants.emit('micUpdate', this);
			this.#ctx.call.participants.joined.emit('micUpdate', this);
			// this.#ctx.call.participants.stage.emit('micUpdate', this);
			this.#startVolumeMeasurement();
		});

		this.#cameraEnabled$.subscribe((enabled) => {
			console.log('subscribe', { enabled });
			if (!enabled) {
				console.log('subscribe:false');
				this.#cameraEnabled = false;
				this.emit('cameraUpdate', { cameraEnabled: false });
				this.#ctx.call.participants.emit('cameraUpdate', this);
				this.#ctx.call.participants.joined.emit('cameraUpdate', this);
				// this.#ctx.call.participants.stage.emit('cameraUpdate', this);
			} else if (enabled && this.#cameraTrack) {
				console.log('subscribe:true');
				this.#cameraEnabled = true;
				this.emit('cameraUpdate', {
					cameraEnabled: true,
					cameraTrack: this.#cameraTrack,
				});
				this.#ctx.call.participants.emit('cameraUpdate', this);
				this.#ctx.call.participants.joined.emit('cameraUpdate', this);
				// this.#ctx.call.participants.stage.emit('cameraUpdate', this);
			} else {
				console.log('subscribe:other', enabled, this.#cameraTrack);
			}
		});

		const cameraMetadata$ = this.#cameraTrackId$.pipe(
			filter((id) => typeof id === 'string'),
			switchMap((id) => {
				const [sessionId, trackName] = id.split('/');
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
			console.log('emitting event', true, track);
			this.#cameraEnabled = true;
			this.#cameraTrack = track;
			this.emit('cameraUpdate', { cameraEnabled: true, cameraTrack: track });
			this.#ctx.call.participants.emit('cameraUpdate', this);
			this.#ctx.call.participants.joined.emit('cameraUpdate', this);
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
					this.#ctx.call.participants.joined.emit(
						'volumeChange',
						this,
						lastVolume,
					);
				}
			}, 500);
		}
	}

	#stopVolumeMeasurement() {
		this.#ctx.logger.debug('📏 ending participant volume estimation');
		clearInterval(this.#volumeInterval);
		const lastVolume = this.volume;
		this.volume = -Infinity;
		this.#ctx.call.participants.joined.emit('volumeChange', this, lastVolume);
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

	static fromJSON(obj: SerializedUser): CallParticipant {
		return new CallParticipant(obj);
	}
}
