import {
	ChatRegular,
	MicOffRegular,
	MicRegular,
	SettingsRegular,
	ShareScreenStartRegular,
	ShareScreenStopRegular,
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
	}, [call.self]);

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
	}, [call.self]);

	return (
		<ControlbarButton onClick={toggleCamera}>
			{cameraEnabled ? <VideoRegular /> : <VideoOffRegular />}
		</ControlbarButton>
	);
}

export function ScreenshareToggle() {
	const call = useCall();
	const screenshareEnabled = useCallSelector(
		(call) => call.self.screenshareEnabled,
	);
	const toggleScreenshare = useCallback(() => {
		if (call.self.screenshareEnabled) {
			call.self.stopScreenshare();
		} else {
			call.self.startScreenshare();
		}
	}, [call.self]);

	return (
		<ControlbarButton onClick={toggleScreenshare}>
			{screenshareEnabled ? (
				<ShareScreenStopRegular />
			) : (
				<ShareScreenStartRegular />
			)}
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

export function SettingsToggle() {
	const store = useMeetingStore();

	return (
		<ControlbarButton
			onClick={() => store.setSettingsOpen(!store.settingsOpen)}
		>
			<SettingsRegular />
		</ControlbarButton>
	);
}

export function CameraQualitySelector() {
	const call = useCall();
	const cameraTrackQuality = useCallSelector((call) => call.cameraTrackQuality);

	return (
		<select
			value={cameraTrackQuality}
			onChange={(e) =>
				call.setRemoteCameraTrackQuality(e.target.value as 'a' | 'b')
			}
			className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-zinc-900 dark:text-white dark:outline-zinc-700"
		>
			<option value="a">💯 High Quality</option>
			<option value="b">🛜 Data Saver</option>
		</select>
	);
}
