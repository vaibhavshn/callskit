import { type CallSelf, type CallParticipant } from 'callskit';
import { useCall } from 'callskit/react';
import clsx from 'clsx';
import { ComponentProps, useEffect, useRef } from 'react';

export function ParticipantTile({
	className,
	participant,
	...props
}: ComponentProps<'div'> & {
	participant: CallParticipant | CallSelf;
}) {
	const call = useCall();
	const isSelf = call.self.id === participant.id;
	const $video = useRef<HTMLVideoElement>(null);
	const $audio = useRef<HTMLAudioElement>(null);

	useEffect(() => {
		console.log(
			'video change found',
			participant.name,
			participant.cameraTrack,
			participant.cameraEnabled,
		);
		if (participant.cameraEnabled && participant.cameraTrack) {
			$video.current!.srcObject = new MediaStream([participant.cameraTrack]);
		} else {
			$video.current!.srcObject = null;
		}
	}, [participant.cameraTrack, participant.cameraEnabled, participant.name]);

	useEffect(() => {
		if (isSelf) return;
		console.log(
			'audio change found',
			participant.name,
			participant.micTrack,
			participant.micEnabled,
		);
		if (participant.micEnabled && participant.micTrack) {
			$audio.current!.srcObject = new MediaStream([participant.micTrack]);
		} else {
			$audio.current!.srcObject = null;
		}
	}, [isSelf, participant.micTrack, participant.micEnabled, participant.name]);

	return (
		<div
			key={participant.id}
			className={clsx(
				'border border-zinc-300 rounded-xl aspect-video relative overflow-hidden @container',
				className,
			)}
			{...props}
		>
			{/* Name Tag */}
			<div className="absolute border border-zinc-200 flex items-center gap-1 bottom-3 left-3 bg-white/60 z-10 backdrop-blur-md rounded-md px-2">
				{participant.name}
				{isSelf && <span className="text-zinc-500 text-xs">(you)</span>}
			</div>

			{/* Avatar */}
			<div
				className={clsx(
					'absolute -z-10 top-1/2 left-1/2 -translate-1/2 text-4xl size-20 bg-cf-dark text-white rounded-xl flex items-center justify-center',
				)}
			>
				{getInitials(participant.name)}
			</div>

			<video
				ref={$video}
				autoPlay
				muted
				className={clsx(
					'absolute inset-0 -z-0 size-full object-cover',
					participant.cameraEnabled ? 'visible' : 'invisible',
				)}
			/>

			{!isSelf && <audio autoPlay ref={$audio} />}
		</div>
	);
}

function getInitials(name: string) {
	const split = name.split(' ');
	if (split.length === 0) {
		return 'P';
	} else if (split.length === 1) {
		return name.slice(0, 2).toUpperCase();
	} else {
		return split
			.map((word) => word[0])
			.join('')
			.toUpperCase();
	}
}
