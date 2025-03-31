import { useCallSelector } from 'callskit/react';
import clsx from 'clsx';
import { ComponentProps, useEffect, useMemo, useState } from 'react';

function getElapsedTime(started_at: Date) {
	return (Date.now() - started_at.getTime()) / 1000;
}

const addZero = (n: number) => Math.trunc(n).toString().padStart(2, '0');

export function Clock({ className, ...props }: ComponentProps<'div'>) {
	const started_at = useCallSelector((call) => call.started_at);
	const [elapsed, setElapsed] = useState(() => getElapsedTime(started_at));

	useEffect(() => {
		let timeout: number, request: number;

		const animate = () => {
			setElapsed(getElapsedTime(started_at));
			timeout = setTimeout(() => {
				if (request) {
					request = requestAnimationFrame(animate);
				}
			}, 500);
		};

		request = requestAnimationFrame(animate);

		return () => {
			clearTimeout(timeout);
		};
	}, [started_at]);

	const time = useMemo(() => {
		let time = '';
		if (elapsed >= 3600) {
			time = `${addZero(elapsed / 3600)}:`;
		}
		time += `${addZero((elapsed % 3600) / 60)}:${addZero(elapsed % 60)}`;
		return time;
	}, [elapsed]);

	return (
		<div className={clsx('tabular-nums', className)} {...props}>
			{time}
		</div>
	);
}
