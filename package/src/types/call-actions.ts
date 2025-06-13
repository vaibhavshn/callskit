import type { ChatMessagePayload } from '../lib/call-chat/call-chat';
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
				screenshareEnabled: boolean;
				screenshareVideoTrackId?: string;
				screenshareAudioTrackId?: string;
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
