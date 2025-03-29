import type { SerializedUser } from './call-socket';

export type MediaAction =
	| {
			action: 'self/mic-update';
			updates: { micEnabled: boolean; micTrackId?: string };
	  }
	| {
			action: 'self/camera-update';
			updates: { cameraEnabled: boolean; cameraTrackId?: string };
	  }
	| {
			action: 'self/screenshare-update';
			updates: {
				screenShareEnabled: boolean;
				screenShareTrackIds?: { video: string; audio?: string };
			};
	  };

export type CallAction =
	| {
			action: 'join';
			self: SerializedUser;
	  }
	| { action: 'leave' }
	| MediaAction;
