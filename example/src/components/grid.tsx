import { useCallSelector } from 'callskit/react';
import { useGoodGrid, useGridDimensions } from 'good-grid/react';
import { useRef } from 'react';
import { ParticipantTile } from './participant-tile';

export function Grid() {
	const $grid = useRef<HTMLDivElement>(null);
	const dimensions = useGridDimensions($grid);

	const participants = useCallSelector((call) => call.participants).toArray();
	const self = useCallSelector((call) => call.self);
	const allParticipants = [...participants, self];

	const grid = useGoodGrid({
		aspectRatio: '16:9',
		gap: 8,
		dimensions,
		count: allParticipants.length,
	});

	return (
		<div ref={$grid} className="size-full relative">
			{allParticipants.map((participant, index) => {
				const { top, left } = grid.getPosition(index);

				return (
					<ParticipantTile
						participant={participant}
						key={participant.id}
						style={{
							position: 'absolute',
							top,
							left,
							width: grid.width,
							height: grid.height,
							transition: '0.2s all',
						}}
					/>
				);
			})}
		</div>
	);
}
