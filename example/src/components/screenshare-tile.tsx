import type { CallParticipant, CallSelf } from 'callskit';
import { useCall } from 'callskit/react';
import clsx from 'clsx';
import { HTMLMotionProps, motion } from 'motion/react';
import { useEffect, useRef } from 'react';

export function ScreenshareTile({
	participant,
	className,
	...props
}: HTMLMotionProps<'div'> & {
	participant: CallParticipant | CallSelf;
}) {
	const call = useCall();
	const videoRef = useRef<HTMLVideoElement>(null);
	const isSelf = call.self.id === participant.id;

	useEffect(() => {
		if (
			participant.screenshareEnabled &&
			participant.screenshareTracks?.video
		) {
			const { video } = participant.screenshareTracks;
			const stream = new MediaStream([video]);
			videoRef.current!.srcObject = stream;
		} else {
			videoRef.current!.srcObject = null;
		}
	}, [participant.screenshareEnabled, participant.screenshareTracks]);

	const id = `screenshare-${participant.id}`;

	return (
		<motion.div
			layoutId={id}
			data-id={id}
			className={clsx(
				'@container relative aspect-video overflow-hidden rounded-xl border border-zinc-300',
				className,
			)}
			{...props}
		>
			<video
				ref={videoRef}
				className={clsx(
					'absolute inset-0 z-30 size-full object-contain transition-opacity',
				)}
				autoPlay
				muted
			/>

			{/* Name Tag */}
			<div className="absolute bottom-3 left-3 z-40 flex h-8 items-center gap-1 rounded-md border bg-white/60 px-1.5 text-sm backdrop-blur-md dark:bg-zinc-700/70">
				<span className="flex shrink-0 grow items-center gap-1">
					<span className="line-clamp-1">{participant.name}</span>
					{isSelf && <span className="text-xs text-zinc-500">(you)</span>}
				</span>
			</div>
		</motion.div>
	);
}
