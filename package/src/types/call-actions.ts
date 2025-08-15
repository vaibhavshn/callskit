import type { TrackMetadata } from 'partytracks/client';
import type { ChatMessagePayload } from '../lib/call-chat/call-chat';
import type { SerializedUser } from './call-socket';

export type MediaAction =
	| {
			action: 'self/mic-update';
			updates: { micEnabled: boolean; micTrackData?: TrackMetadata };
	  }
	| {
			action: 'self/camera-update';
			updates: { cameraEnabled: boolean; cameraTrackData?: TrackMetadata };
	  }
	| {
			action: 'self/screenshare-update';
			updates: {
				screenshareEnabled: boolean;
				screenshareVideoTrackData?: TrackMetadata;
				screenshareAudioTrackData?: TrackMetadata;
			};
	  };

export type ChatAction = {
	action: 'chat/message';
	message: ChatMessagePayload;
};

export type CallAction =
	| {
			action: 'join';
			self: SerializedUser;
	  }
	| { action: 'leave' }
	| MediaAction
	| ChatAction;
