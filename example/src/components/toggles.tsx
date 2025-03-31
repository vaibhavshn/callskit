import {
	ChatRegular,
	MicOffRegular,
	MicRegular,
	VideoOffRegular,
	VideoRegular,
} from '@fluentui/react-icons';
import { useCall, useCallSelector } from 'callskit/react';
import { useCallback } from 'react';
import { useMeetingStore } from '../data/meeting-store';

export function MicToggle() {
	const call = useCall();
	const micEnabled = useCallSelector((call) => call.self.micEnabled);
	const toggleMic = useCallback(() => {
		if (call.self.micEnabled) {
			call.self.stopMic();
		} else {
			call.self.startMic();
		}
	}, []);

	return (
		<button onClick={toggleMic} className="*:size-6 h-full">
			{micEnabled ? <MicRegular /> : <MicOffRegular />}
		</button>
	);
}

export function CameraToggle() {
	const call = useCall();
	const cameraEnabled = useCallSelector((call) => call.self.cameraEnabled);
	const toggleCamera = useCallback(() => {
		if (call.self.cameraEnabled) {
			call.self.stopCamera();
		} else {
			call.self.startCamera();
		}
	}, []);

	return (
		<button onClick={toggleCamera} className="*:size-6 h-full">
			{cameraEnabled ? <VideoRegular /> : <VideoOffRegular />}
		</button>
	);
}

export function ChatToggle() {
	const store = useMeetingStore();

	const chatOpen = store.sidebar === 'chat';

	return (
		<button
			onClick={() => {
				store.setSidebar(chatOpen ? undefined : 'chat');
			}}
			className="*:size-6 h-full"
		>
			<ChatRegular />
		</button>
	);
}
