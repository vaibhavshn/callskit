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
		call.self.name = name;
	}, [name, call]);

	return (
		<div className="size-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center">
			<div className="grow w-full p-4 flex items-end justify-center md:items-center">
				<div className="flex flex-col w-full gap-4">
					<div className="w-full max-w-[640px]">
						<ParticipantTile participant={self} />
					</div>

					<div className="flex items-center justify-center h-10 gap-2">
						<MicToggle />
						<CameraToggle />
					</div>
				</div>
			</div>

			<div className="grow max-w-[560px] flex flex-col items-center justify-start p-4 w-full">
				<h3 className="text-lg mb-3">Join as</h3>

				<input
					type="text"
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-full mb-4 max-w-64 bg-zinc-50 border border-zinc-200 rounded-lg px-3 h-10"
					onKeyDown={(e) => {
						if (!e.shiftKey && e.key === 'Enter') {
							e.preventDefault();
							call.join();
						}
					}}
				/>

				<Button className="text-base" onClick={() => call.join()}>
					<ArrowEnterLeftFilled className="" />
					Join
				</Button>
			</div>
		</div>
	);
}
