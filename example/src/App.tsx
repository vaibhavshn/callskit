import { CallProvider, useCallSelector, useCreateCall } from 'callskit/react';
import { useEffect } from 'react';
import { SetupScreen } from './components/setup-screen';
import { Meeting } from './components/meeting';

function CallApp() {
	const roomState = useCallSelector((call) => call.state);

	if (!roomState || roomState === 'connected') {
		return <SetupScreen />;
	}

	return <Meeting />;
}

function App() {
	const [call, createCall] = useCreateCall();

	useEffect(() => {
		createCall({
			room: 'abc-xyz-2',
			displayName: 'User ' + Math.random().toString(36).substring(7),
			logLevel: 'debug',
			// defaults: { audio: true, video: true },
			config: { maxOnStageParticipants: 3, preferredCameraQuality: 'h' },
			autoJoin: true,
		});
	}, [createCall]);

	Object.assign(window, { call });

	return (
		<CallProvider call={call}>
			<CallApp />
		</CallProvider>
	);
}

export default App;
