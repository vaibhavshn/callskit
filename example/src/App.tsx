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

const ENV = import.meta.env.DEV
	? {
			SOCKET_URL: 'http://127.0.0.1:1999',
			API_URL: 'http://localhost:8787',
		}
	: {
			SOCKET_URL: 'https://callskit-socket.vaibhavshn.partykit.dev',
			API_URL: 'https://callskit-server.vaibhavshn-in.workers.dev',
		};

function App() {
	const [call, createCall] = useCreateCall();

	useEffect(() => {
		const roomNameFromUrl = window.location.pathname.slice(1);
		const room = roomNameFromUrl !== '' ? roomNameFromUrl : 'abc-xyz';
		createCall({
			room,
			displayName: 'User ' + Math.random().toString(36).substring(7),
			logLevel: 'debug',
			config: { preferredCameraQuality: 'high' },
			autoJoin: window.location.hash === '#join',
			socketBaseUrl: ENV.SOCKET_URL,
			apiBaseUrl: ENV.API_URL,
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
