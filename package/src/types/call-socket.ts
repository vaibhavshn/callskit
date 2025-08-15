import type { TrackMetadata } from 'partytracks/client';

export type SerializableObject = {
	[key: string]:
		| string
		| number
		| boolean
		| Date
		| SerializableObject
		| Array<string | number | boolean | Date | SerializableObject>;
};

export interface SerializedUser {
	id: string;
	name: string;

	micEnabled: boolean;
	micTrackData?: TrackMetadata;

	cameraEnabled: boolean;
	cameraTrackData?: TrackMetadata;

	screenshareEnabled: boolean;
	screenshareVideoTrackData?: TrackMetadata;
	screenshareAudioTrackData?: TrackMetadata;
}

export type { CallEvent } from './call-events';
export type { CallAction } from './call-actions';
