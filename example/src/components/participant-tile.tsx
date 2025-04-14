import { SpinnerIosRegular } from '@fluentui/react-icons';
import { type CallSelf, type CallParticipant } from 'callskit';
import { useCall } from 'callskit/react';
import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';

export function ParticipantTile({
	className,
	participant,
	...props
}: React.ComponentProps<'div'> & {
	participant: CallParticipant | CallSelf;
}) {
	const call = useCall();
	const isSelf = call.self.id === participant.id;
	const $video = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (participant.cameraEnabled && participant.cameraTrack) {
			$video.current!.srcObject = new MediaStream([participant.cameraTrack]);
			$video.current!.play();
		} else {
			$video.current!.srcObject = null;
		}
	}, [participant.cameraTrack, participant.cameraEnabled]);

	return (
		<div
			key={participant.id}
			className={clsx(
				'@container relative aspect-video overflow-hidden rounded-xl border border-zinc-300',
				className,
			)}
			{...props}
		>
			{/* Name Tag */}
			<div className="absolute bottom-3 left-3 z-10 flex h-8 items-center gap-1 rounded-md border bg-white/60 px-2 text-sm backdrop-blur-md dark:bg-white/20">
				<span className="line-clamp-1 max-w-72">{participant.name}</span>
				{isSelf && <span className="text-xs text-zinc-500">(you)</span>}
			</div>

			<video
				ref={$video}
				autoPlay
				muted
				className={clsx(
					'absolute inset-0 z-30 size-full object-cover transition-opacity',
					participant.cameraEnabled ? 'opacity-100' : 'opacity-0',
				)}
			/>

			{/* Avatar */}
			<div
				className={clsx(
					'absolute top-1/2 left-1/2 z-10 flex size-20 -translate-1/2 items-center justify-center rounded-xl text-4xl',
					'bg-gradient-to-br from-orange-300 to-orange-400 text-white',
				)}
			>
				{getInitials(participant.name)}
			</div>

			<div
				className={clsx(
					'absolute inset-0 z-20 flex items-center justify-center bg-white dark:bg-black',
					participant.cameraEnabled ? 'flex' : 'hidden',
				)}
			>
				<SpinnerIosRegular
					className="text-cf-dark size-10 duration-400"
					style={{ animation: 'spin 0.5s linear infinite' }}
				/>
			</div>
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
