import {
	CallProvider,
	useCall,
	useCallSelector,
	useCreateCall,
} from 'callskit/react';
import { useEffect } from 'react';
import { ArrowEnterLeftFilled } from '@fluentui/react-icons';
import { Clock } from './components/clock';
import { CameraToggle, ChatToggle, MicToggle } from './components/toggles';
import { Grid } from './components/grid';
import { Sidebar } from './components/sidebar/sidebar';
import { AnimatePresence } from 'motion/react';

function UI() {
	return (
		<div className="flex flex-col size-full">
			<header className="flex justify-between items-center px-4 h-12">
				<div>
					<h1 className="text-xl font-bold">
						<span className="text-orange-400">Calls</span>kit
					</h1>
				</div>
				<div>
					<Clock className="text-sm" />
				</div>
			</header>

			<main className="grow flex overflow-hidden">
				<div className="grow-[2]">
					<Grid />
				</div>
				<AnimatePresence>
					<Sidebar />
				</AnimatePresence>
			</main>

			<footer className="grid grid-cols-3 items-center h-14 py-2 px-3">
				<div></div>
				<div className="flex items-center justify-center h-full gap-2">
					<MicToggle />
					<CameraToggle />
				</div>
				<div className="flex items-center justify-end h-full">
					<ChatToggle />
				</div>
			</footer>
		</div>
	);
}

function Meeting() {
	const call = useCall();
	const roomState = useCallSelector((call) => call.state);

	if (!roomState || roomState === 'connected') {
		return (
			<div className="size-full flex place-items-center justify-center">
				<button className="text-base" onClick={() => call.join()}>
					<ArrowEnterLeftFilled className="" />
					Join
				</button>
			</div>
		);
	}

	return <UI />;
}

function App() {
	const [call, createCall] = useCreateCall();

	useEffect(() => {
		createCall({
			room: 'abc-xyz',
			displayName: 'Vaibhav',
			// defaults: { audio: true, video: true },
			logLevel: 'debug',
		});
	}, [createCall]);

	Object.assign(window, { call });

	return (
		<CallProvider call={call}>
			<Meeting />
		</CallProvider>
	);
}

export default App;
