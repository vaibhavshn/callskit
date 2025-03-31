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
import { ButtonProps, ControlbarButton } from './primitives/button';

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
		<ControlbarButton onClick={toggleMic}>
			{micEnabled ? <MicRegular /> : <MicOffRegular />}
		</ControlbarButton>
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
		<ControlbarButton onClick={toggleCamera}>
			{cameraEnabled ? <VideoRegular /> : <VideoOffRegular />}
		</ControlbarButton>
	);
}

export function ChatToggle(props: ButtonProps) {
	const store = useMeetingStore();

	const chatOpen = store.sidebar === 'chat';

	return (
		<ControlbarButton
			onClick={() => {
				store.setSidebar(chatOpen ? undefined : 'chat');
			}}
			data-active={chatOpen ? true : undefined}
			{...props}
		>
			<ChatRegular />
		</ControlbarButton>
	);
}
