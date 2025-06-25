import { AnimatePresence } from 'motion/react';
import { Clock } from './clock';
import { Grid } from './grid';
import { Sidebar } from './sidebar/sidebar';
import {
	MicToggle,
	CameraToggle,
	ChatToggle,
	CameraQualitySelector,
	SettingsToggle,
	ScreenshareToggle,
} from './toggles';
import { ParticipantCount } from './participant-count';
import { useEffect, useRef } from 'react';
import { useCall } from 'callskit/react';
import { Button } from './primitives/button';
import { DismissRegular, PlayRegular } from '@fluentui/react-icons';
import { Settings } from './settings/settings';

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
			if (p.screenshareEnabled && p.screenshareTracks?.audio) {
				stream.addTrack(p.screenshareTracks.audio);
				trackMap.set('screenshare-' + p.id, p.screenshareTracks.audio);
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

		const unsubMic = call.participants.joined.subscribe(
			'micUpdate',
			(participant) => {
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
			},
		);

		const unsubScreenshare = call.participants.joined.subscribe(
			'screenshareUpdate',
			(participant) => {
				if (
					participant.screenshareEnabled &&
					participant.screenshareTracks?.audio
				) {
					stream.addTrack(participant.screenshareTracks.audio);
					trackMap.set(
						'screenshare-' + participant.id,
						participant.screenshareTracks.audio,
					);
				} else {
					const track = trackMap.get('screenshare-' + participant.id);
					if (track) {
						stream.removeTrack(track);
						trackMap.delete('screenshare-' + participant.id);
					}
				}
			},
		);

		return () => {
			unsubMic();
			unsubScreenshare();
		};
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
					<div>
						<CameraQualitySelector />
					</div>
				</div>
				<div className="flex h-full items-center justify-center gap-2">
					<MicToggle />
					<CameraToggle />
					<SettingsToggle />
					<ScreenshareToggle />
				</div>
				<div className="flex h-full items-center justify-end">
					<ChatToggle />
				</div>
			</footer>

			<audio autoPlay ref={audioRef} />

			<Settings audioRef={audioRef} />

			<dialog
				ref={dialogRef}
				className="m-auto w-full max-w-sm flex-col gap-3 rounded-lg p-4 backdrop:bg-black/30 backdrop:backdrop-blur-sm open:flex"
			>
				<h3 className="text-xl font-semibold">Play audio</h3>

				<p className="text-sm text-zinc-700 dark:text-zinc-400">
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
