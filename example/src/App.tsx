import { CallProvider, useCallSelector, useCreateCall } from 'callskit/react';
import { useEffect } from 'react';
import { SetupScreen } from './components/setup-screen';
import { Meeting } from './components/meeting';
import { SpinnerIosRegular } from '@fluentui/react-icons';

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
		const roomNameFromUrl = window.location.pathname.slice(1);
		const room = roomNameFromUrl !== '' ? roomNameFromUrl : 'abc-xyz';
		createCall({
			room,
			displayName: 'User ' + Math.random().toString(36).substring(7),
			logLevel: 'debug',
			config: { maxOnStageParticipants: 9, preferredCameraQuality: 'a' },
			// autoJoin: true,
			// defaults: { audio: true, video: true },
		});
	}, [createCall]);

	Object.assign(window, { call });

	return (
		<CallProvider
			call={call}
			fallback={
				<div className="flex size-full flex-col items-center justify-center gap-3 text-center">
					<SpinnerIosRegular className="text-cf-dark size-12 animate-spin" />
					<h1 className="text-xl font-bold">
						<span className="text-cf-dark">Calls</span>Kit
					</h1>
				</div>
			}
		>
			<CallApp />
		</CallProvider>
	);
}

export default App;
