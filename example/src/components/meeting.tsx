import { AnimatePresence } from 'motion/react';
import { Clock } from './clock';
import { Grid } from './grid';
import { Sidebar } from './sidebar/sidebar';
import { MicToggle, CameraToggle, ChatToggle } from './toggles';

export function Meeting() {
	return (
		<div className="flex flex-col size-full">
			<header className="flex justify-between items-center px-4 h-12">
				<div>
					<h1 className="text-xl font-bold">
						<span className="text-cf-dark">Calls</span>kit
					</h1>
				</div>
				<div>
					<Clock className="text-sm" />
				</div>
			</header>

			<main className="flex-1 flex overflow-hidden">
				<div className="grow-[2]">
					<Grid />
				</div>
				<AnimatePresence>
					<Sidebar />
				</AnimatePresence>
			</main>

			<footer className="grid grid-cols-3 items-center h-14 py-2 px-3">
				<div></div>
				<div className="flex items-center justify-center h-full gap-2">
					<MicToggle />
					<CameraToggle />
				</div>
				<div className="flex items-center justify-end h-full">
					<ChatToggle />
				</div>
			</footer>
		</div>
	);
}
