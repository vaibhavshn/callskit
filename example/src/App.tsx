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
			room: 'abc-xyz',
			displayName: 'Vaibhav',
			defaults: { audio: true, video: true },
			logLevel: 'debug',
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
