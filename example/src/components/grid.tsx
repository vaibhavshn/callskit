import { useCallSelector } from 'callskit/react';
import { useGridLayout, useContainerDimensions } from 'good-grid/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ParticipantTile } from './participant-tile';
import { AnimatePresence } from 'motion/react';
import { type Dimensions } from 'good-grid';
import { ScreenshareTile } from './screenshare-tile';

function Tiles({ dimensions }: { dimensions: Dimensions }) {
	const self = useCallSelector((call) => call.self);
	const participants = useCallSelector(
		(call) => call.participants.joined,
	).toArray();

	const allParticipants = useMemo(
		() => [...participants, self],
		[participants, self],
	);

	const screenshares = useMemo(() => {
		return allParticipants.filter((p) => p.screenshareEnabled);
	}, [allParticipants]);

	const excessScreenshares = useMemo(
		() => Math.max(0, screenshares.length - 1),
		[screenshares.length],
	);

	const hasMainView = useMemo(
		() => screenshares.length > 0,
		[screenshares.length],
	);

	const isMobile = useMemo(() => {
		return dimensions.width < dimensions.height;
	}, [dimensions.width, dimensions.height]);

	const [activeScreenshare, setActiveScreenshare] = useState(
		() => screenshares[0],
	);

	const aspectRatio = useMemo(() => (isMobile ? 4 / 3 : 16 / 10), [isMobile]);

	const grid = useGridLayout({
		aspectRatio,
		gap: 8,
		count: allParticipants.length + excessScreenshares,
		dimensions: dimensions,
		isVertical: isMobile,
		mainView: hasMainView
			? {
					aspectRatio,
					maxWidthRatio: 0.75,
					maxHeightRatio: 0.75,
				}
			: undefined,
	});

	useEffect(() => {
		// cleanup any stale activeScreenshare value
		if (activeScreenshare && screenshares.length > 0) {
			if (!screenshares.some((p) => p.id === activeScreenshare.id)) {
				setActiveScreenshare(screenshares[0]);
			}
		} else if (!activeScreenshare && screenshares.length > 0) {
			setActiveScreenshare(screenshares[0]);
		} else if (activeScreenshare && screenshares.length === 0) {
			setActiveScreenshare(undefined);
		}
	}, [screenshares, activeScreenshare]);

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

			{excessScreenshares > 0 &&
				screenshares.map((participant, index) => {
					const { top, left, width, height } = grid.positionFor(
						allParticipants.length - 1 + index,
					);

					return (
						<ScreenshareTile
							participant={participant}
							key={`screenshare-${participant.id}`}
							className="cursor-pointer"
							style={{
								position: 'absolute',
								top,
								left,
								width,
								height,
								transition: 'all 0.3s',
							}}
							onClick={() => {
								setActiveScreenshare(participant);
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
