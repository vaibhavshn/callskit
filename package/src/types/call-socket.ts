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
	micTrackId?: string;

	cameraEnabled: boolean;
	cameraTrackId?: string;
}

export type { CallEvent } from './call-events';
export type { CallAction } from './call-actions';
