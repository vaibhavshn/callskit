import { ArrowEnterLeftFilled } from '@fluentui/react-icons';
import { useCall, useCallSelector } from 'callskit/react';
import { useState, useEffect } from 'react';
import { ParticipantTile } from './participant-tile';
import { CameraToggle, MicToggle } from './toggles';
import { Button } from './primitives/button';

export function SetupScreen() {
	const call = useCall();
	const [name, setName] = useState(call.self.name);
	const self = useCallSelector((call) => call.self);

	useEffect(() => {
		// navigator.mediaDevices
		// 	.getUserMedia({ audio: true, video: true })
		// 	.then((stream) => {
		// 		stream.getTracks().map((track) => track.stop());
		// 	});
	}, []);

	useEffect(() => {
		call.self.name = name;
	}, [name, call]);

	return (
		<div className="mx-auto flex size-full max-w-6xl flex-col items-center justify-center md:flex-row">
			<div className="flex w-full grow items-end justify-center p-4 md:items-center">
				<div className="flex w-full flex-col gap-4">
					<div className="w-full max-w-[640px]">
						<ParticipantTile participant={self} />
					</div>

					<div className="flex h-10 items-center justify-center gap-2">
						<MicToggle />
						<CameraToggle />
					</div>
				</div>
			</div>

			<div className="flex w-full max-w-[560px] grow flex-col items-center justify-start p-4">
				<h3 className="mb-3 text-lg">Join as</h3>

				<input
					type="text"
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="mb-4 h-10 w-full max-w-64 rounded-lg border border-zinc-200 bg-white/5 px-3"
					onKeyDown={(e) => {
						if (!e.shiftKey && e.key === 'Enter') {
							e.preventDefault();
							call.join();
						}
					}}
				/>

				<Button className="text-base" onClick={() => call.join()}>
					<ArrowEnterLeftFilled />
					Join
				</Button>
			</div>
		</div>
	);
}
