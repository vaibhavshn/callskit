import { AnimatePresence } from 'motion/react';
import { Clock } from './clock';
import { Grid } from './grid';
import { Sidebar } from './sidebar/sidebar';
import {
	MicToggle,
	CameraToggle,
	ChatToggle,
	CameraQualitySelector,
} from './toggles';
import { ParticipantCount } from './participant-count';
import { useEffect, useRef } from 'react';
import { useCall } from 'callskit/react';
import { ControlbarButton } from './primitives/button';

export function Meeting() {
	const call = useCall();
	const audioRef = useRef(new Audio());

	useEffect(() => {
		const stream = new MediaStream();
		const audio = audioRef.current;
		audio.autoplay = true;

		call.participants.joined.toArray().forEach((p) => {
			if (p.micEnabled && p.micTrack) {
				stream.addTrack(p.micTrack);
			}
		});

		audio.srcObject = stream;
		console.log('SUBSCRIBE');

		Object.assign(window, { audio });

		return call.participants.joined.subscribe('micUpdate', (participant) => {
			if (participant.micEnabled && participant.micTrack) {
				console.log('playing', participant.micTrack);
				stream.addTrack(participant.micTrack);
				audio.srcObject = stream;
				audio.play();
			}
		});
	}, [call]);

	return (
		<div className="flex flex-col size-full">
			<header className="flex justify-between items-center px-4 min-h-12">
				<div>
					<h1 className="text-xl font-bold">
						<span className="text-cf-dark">Calls</span>kit
					</h1>
				</div>
				<div className="flex items-center gap-3">
					<Clock className="text-sm" />
					<ParticipantCount />
				</div>
			</header>

			<main className="flex-1 flex overflow-hidden">
				<div className="grow-[2]">
					<Grid />
				</div>
				<AnimatePresence>
					<Sidebar />
				</AnimatePresence>
			</main>

			<footer className="shrink-0 grid grid-cols-3 items-center py-2 px-3">
				<div className="flex items-center">
					<CameraQualitySelector />
				</div>
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
