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
import { Button } from './primitives/button';
import { PlayRegular } from '@fluentui/react-icons';

export function Meeting() {
	const call = useCall();
	const audioRef = useRef<HTMLAudioElement>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const stream = new MediaStream();
		const trackMap = new Map<string, MediaStreamTrack>();

		call.participants.joined.toArray().forEach((p) => {
			if (p.micEnabled && p.micTrack) {
				stream.addTrack(p.micTrack);
				trackMap.set(p.id, p.micTrack);
			}
		});

		const audio = audioRef.current!;
		audio.srcObject = stream;

		const play = () => {
			audio.play().catch(() => {
				dialogRef.current!.showModal();
			});
		};

		play();

		Object.assign(window, { audio });

		return call.participants.joined.subscribe('micUpdate', (participant) => {
			if (participant.micEnabled && participant.micTrack) {
				stream.addTrack(participant.micTrack);
				trackMap.set(participant.id, participant.micTrack);
				audio.srcObject = stream;
			} else {
				const track = trackMap.get(participant.id);
				if (track) {
					stream.removeTrack(track);
					trackMap.delete(participant.id);
				}
			}
		});
	}, [call]);

	return (
		<div className="flex size-full flex-col">
			<header className="flex min-h-12 items-center justify-between px-4">
				<div>
					<h1 className="text-xl font-bold">
						<span className="text-cf-dark">Calls</span>Kit
					</h1>
				</div>
				<div className="flex items-center gap-3">
					<Clock className="text-sm" />
					<ParticipantCount />
				</div>
			</header>

			<main className="flex flex-1 overflow-hidden">
				<div className="grow-[2]">
					<Grid />
				</div>
				<AnimatePresence>
					<Sidebar />
				</AnimatePresence>
			</main>

			<footer className="grid shrink-0 grid-cols-3 items-center px-3 py-2">
				<div className="flex items-center">
					<CameraQualitySelector />
				</div>
				<div className="flex h-full items-center justify-center gap-2">
					<MicToggle />
					<CameraToggle />
				</div>
				<div className="flex h-full items-center justify-end">
					<ChatToggle />
				</div>
			</footer>

			<audio autoPlay ref={audioRef} />

			<dialog
				ref={dialogRef}
				className="m-auto w-full max-w-sm flex-col gap-3 rounded-lg p-4 backdrop:bg-black/30 backdrop:backdrop-blur-sm open:flex"
			>
				<h3 className="text-xl font-semibold">Play audio</h3>
				<p className="text-sm text-zinc-700">
					Browser prevented meeting audio from being played automatically, press{' '}
					<strong>Play</strong> to continue.
				</p>
				<Button
					className="justify-center"
					onClick={() => {
						audioRef.current!.play();
						dialogRef.current!.close();
					}}
				>
					<PlayRegular />
					Play
				</Button>
			</dialog>
		</div>
	);
}
