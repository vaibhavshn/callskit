import { MicOffRegular } from '@fluentui/react-icons';
import { CallParticipant, CallSelf } from 'callskit';
import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';

export function AudioVisualizer({
	participant,
	className,
	...props
}: React.ComponentProps<'div'> & {
	participant: CallParticipant | CallSelf;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const ctxRef = useRef<CanvasRenderingContext2D>(undefined);

	useEffect(() => {
		const ctx = canvasRef.current!.getContext('2d')!;
		ctxRef.current = ctx;
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const ctx = ctxRef.current!;

		return participant.subscribe('volumeChange', (volume) => {
			draw(canvas, ctx, volume);
		});
	}, [participant]);

	return (
		<div
			className={clsx('flex size-6 items-center justify-center', className)}
			{...props}
		>
			<MicOffRegular
				className={clsx(
					'size-full h-full flex-1',
					participant.micEnabled ? 'hidden' : 'block',
				)}
			/>
			<canvas
				ref={canvasRef}
				width={48}
				height={48}
				className={clsx(
					'text-cf-dark size-6 h-full flex-1',
					participant.micEnabled ? 'block' : 'hidden',
				)}
			/>
		</div>
	);
}

const draw = (
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	volume: number,
) => {
	const nSlices = 3;
	const halfwaySlice = Math.round(nSlices / 2);
	const sample = [...Array(nSlices)].map((_, i) => {
		let index = i;
		if (index > halfwaySlice - 1) {
			index = nSlices - index - 1;
		}
		return Math.round(((index + 1) / (halfwaySlice + 1)) * volume);
	});

	const { width, height } = canvas;
	let x = 2;
	const sliceGraphicWidth = 4;
	const sliceWidth = (width * 1.0) / sample.length;
	const slicePadding = sliceWidth - sliceGraphicWidth;

	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = 'rgb(0,0,0,0.0)';
	ctx.fillRect(0, 0, width, height);

	const color = getComputedStyle(canvas).getPropertyValue('color');

	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.lineCap = 'round';
	ctx.lineWidth = 6;

	ctx.beginPath();

	for (const item of sample) {
		const y = Math.min(
			-Math.abs(((item * 1.2) / 10) * height) + height / 2,
			height / 2 - 2.5,
		);
		const sliceHeight = Math.max((height / 2 - y) * 2, 5);
		ctx.moveTo(x + slicePadding / 2, y);
		ctx.lineTo(x + slicePadding / 2, y + sliceHeight);
		x += sliceWidth;
	}

	ctx.stroke();
};
