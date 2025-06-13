import { useCallSelector } from 'callskit/react';
import { useGridLayout, useContainerDimensions } from 'good-grid/react';
import { useMemo, useRef } from 'react';
import { ParticipantTile } from './participant-tile';
import { AnimatePresence } from 'motion/react';
import { type Dimensions } from 'good-grid';
import { ScreenshareTile } from './screenshare-tile';

function Tiles({ dimensions }: { dimensions: Dimensions }) {
	const participants = useCallSelector(
		(call) => call.participants.joined,
	).toArray();
	const self = useCallSelector((call) => call.self);
	const allParticipants = useMemo(
		() => [...participants, self],
		[participants, self],
	);

	const screenshares = useMemo(() => {
		return allParticipants.filter((p) => p.screenshareEnabled);
	}, [allParticipants]);

	const hasMainView = screenshares.length > 0;

	const isMobile = useMemo(() => {
		return dimensions.width < dimensions.height;
	}, [dimensions.width, dimensions.height]);

	const grid = useGridLayout({
		aspectRatio: 4 / 3,
		gap: 8,
		count: allParticipants.length,
		dimensions: dimensions,
		isVertical: isMobile,
		mainView: hasMainView
			? {
					aspectRatio: isMobile ? 4 / 3 : 16 / 9,
					maxWidthRatio: 0.75,
					maxHeightRatio: 0.75,
				}
			: undefined,
	});

	console.log({ screenshares, hasMainView });

	return (
		<AnimatePresence>
			{grid.mainViewLayout && screenshares[0] && (
				<ScreenshareTile
					participant={screenshares[0]}
					style={{
						position: 'absolute',
						top: grid.mainViewLayout.top,
						left: grid.mainViewLayout.left,
						width: grid.mainViewLayout.width,
						height: grid.mainViewLayout.height,
						transition: 'all 0.3s',
					}}
				/>
			)}

			{allParticipants.map((participant, index) => {
				const { top, left, width, height } = grid.positionFor(index);

				return (
					<ParticipantTile
						participant={participant}
						key={participant.id}
						style={{
							position: 'absolute',
							top,
							left,
							width,
							height,
							transition: 'all 0.3s',
						}}
					/>
				);
			})}
		</AnimatePresence>
	);
}

export function Grid() {
	const $grid = useRef<HTMLDivElement>(null);
	const dimensions = useContainerDimensions($grid);

	return (
		<div ref={$grid} className="relative size-full">
			{dimensions && <Tiles dimensions={dimensions} />}
		</div>
	);
}
