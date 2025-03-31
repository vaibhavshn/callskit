import type { ChatMessage } from '../lib/call-chat/call-chat';
import type { SerializedUser } from './call-socket';

export type RoomEvent =
	| {
			event: 'connected';
	  }
	| {
			event: 'room/init';
			participants: SerializedUser[];
			started_at: string;
			chatMessages: ChatMessage[];
	  };

export type ParticipantEvent =
	| { event: 'participant/joined'; participant: SerializedUser }
	| { event: 'participant/left'; participantId: string }
	| {
			event: 'participant/camera-update';
			data: {
				cameraEnabled: boolean;
				cameraTrackId?: string;
				participantId: string;
			};
	  }
	| {
			event: 'participant/mic-update';
			data: {
				micEnabled: boolean;
				micTrackId?: string;
				participantId: string;
			};
	  };

export type ChatEvent = { event: 'chat/new-message'; message: ChatMessage };

export type CallEvent = RoomEvent | ParticipantEvent | ChatEvent;
