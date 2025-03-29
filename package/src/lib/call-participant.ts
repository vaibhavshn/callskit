import type { SerializedUser } from '../types/call-socket';
import { Observable, of, pipe, ReplaySubject, switchMap } from 'rxjs';
import { EventsHandler } from '../utils/events-handler';
import { partyTracks } from './call-client';
import type { TrackMetadata } from 'partytracks/client';

interface CallParticipantOptions extends Partial<SerializedUser> {
	isSelf?: boolean;
	id?: string;
	name: string;

	micEnabled?: boolean;
	micTrackId?: string;

	cameraEnabled?: boolean;
	cameraTrackId?: string;

	screenShareEnabled?: boolean;
	screenShareTrackIds?: { video: string; audio: string };
}

type ParticipantEvents = {
	camera_update: () => void;
	mic_update: () => void;
};

export class CallParticipant extends EventsHandler<ParticipantEvents> {
	is_self: boolean;

	id: string;

	name: string;

	cameraEnabled: boolean;
	private cameraTrackId: string | undefined;
	cameraTrack: ReplaySubject<MediaStreamTrack>;

	micEnabled: boolean;
	private micTrackId: string | undefined;
	micTrack: ReplaySubject<MediaStreamTrack>;

	ct: Observable<MediaStreamTrack | undefined>;

	constructor(options: CallParticipantOptions) {
		super();
		this.id = options.id || crypto.randomUUID();
		this.name = options.name;
		this.is_self = options.isSelf || false;

		this.ct = new Observable((subscribe) => {
			subscribe.next(undefined);
		});

		this.cameraTrack = new ReplaySubject<MediaStreamTrack>();
		this.micTrack = new ReplaySubject<MediaStreamTrack>();

		if (typeof options.cameraEnabled === 'boolean') {
			this.cameraEnabled = options.cameraEnabled;
			this.cameraTrackId = options.cameraTrackId;
			this.updateCameraState(this.cameraEnabled, this.cameraTrackId);
		} else {
			this.cameraEnabled = false;
		}

		if (typeof options.micEnabled === 'boolean') {
			this.micEnabled = options.micEnabled;
			this.micTrackId = options.micTrackId;
			this.updateMicState(this.micEnabled, this.micTrackId);
		} else {
			this.micEnabled = false;
		}
	}

	static from(obj: SerializedUser): CallParticipant {
		return new CallParticipant(obj);
	}

	to(): SerializedUser {
		return {
			id: this.id,
			name: this.name,
			micEnabled: false,
			cameraEnabled: false,
			screenShareEnabled: false,
		};
	}

	updateCameraState(enabled: boolean, trackId?: string) {
		if (enabled && trackId) {
			const [sessionId, trackName] = trackId.split(':');
			const pulledTrack$ = partyTracks.pull(
				of({
					sessionId,
					trackName,
					location: 'remote',
					simulcast: { preferredRid: 'h' },
				} satisfies TrackMetadata),
			);
			pulledTrack$.subscribe((track) => {
				this.cameraEnabled = true;
				this.cameraTrackId = trackId;
				this.cameraTrack.next(track);
				this.emit('camera_update');
			});
		} else {
			this.cameraEnabled = false;
			this.cameraTrack.next(undefined);
			this.cameraTrackId = undefined;
			this.emit('camera_update');
		}
	}

	updateMicState(enabled: boolean, trackId?: string) {
		if (enabled && trackId) {
			const [sessionId, trackName] = trackId.split(':');
			const pulledTrack$ = partyTracks.pull(
				of({ sessionId, trackName, location: 'remote' }),
			);
			pulledTrack$.subscribe((track) => {
				this.micEnabled = true;
				this.micTrackId = trackId;
				this.cameraTrack.next(track);
				this.emit('mic_update');
			});
		} else {
			this.micEnabled = false;
			this.cameraTrack.next(undefined);
			this.micTrackId = undefined;
			this.emit('mic_update');
		}
	}
}
