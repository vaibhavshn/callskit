import { useEffect, useRef } from 'react';
import { useMeetingStore } from '../../data/meeting-store';
import { useCall, useCallSelector } from 'callskit/react';
import { DismissRegular } from '@fluentui/react-icons';

export function Settings({
	audioRef,
}: {
	audioRef: React.RefObject<HTMLAudioElement>;
}) {
	const call = useCall();
	const self = useCallSelector((c) => c.self);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const store = useMeetingStore();

	useEffect(() => {
		if (store.settingsOpen) {
			dialogRef.current?.showModal();
		} else {
			dialogRef.current?.close();
		}
	}, [store.settingsOpen]);

	const mics = self.devices?.filter((device) => device.kind === 'audioinput');
	const cameras = self.devices?.filter(
		(device) => device.kind === 'videoinput',
	);
	const speakers = self.devices?.filter(
		(device) => device.kind === 'audiooutput',
	);

	const isSetSinkIdSupported = 'setSinkId' in HTMLAudioElement.prototype;

	const activeDevices = call.self.activeDevices;

	return (
		<dialog
			ref={dialogRef}
			className="relative m-auto w-full max-w-lg flex-col gap-3 rounded-lg p-4 backdrop:bg-black/30 backdrop:backdrop-blur-sm open:flex"
			onClose={() => {
				store.setSettingsOpen(false);
			}}
		>
			<h3 className="mb-3 text-xl font-semibold">Device Settings</h3>
			<button
				onClick={() => store.setSettingsOpen(false)}
				className="absolute top-3 right-3 inline-flex cursor-pointer rounded-md border !border-zinc-400 p-1.5 dark:!border-zinc-800"
			>
				<DismissRegular className="size-4" />
			</button>

			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<label className="w-20 text-sm font-medium">Mic</label>
					<select
						className="flex-1 shrink-0 rounded-md border border-zinc-200 bg-white/5 px-3 text-sm"
						value={activeDevices.mic?.deviceId}
						onChange={(e) => {
							const deviceId = e.currentTarget.value;
							call.self.setMicDevice(deviceId);
						}}
					>
						{mics?.map((device) => (
							<option key={device.deviceId} value={device.deviceId}>
								{device.label}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-2">
					<label className="w-20 text-sm font-medium">Camera</label>
					<select
						className="flex-1 shrink-0 rounded-md border border-zinc-200 bg-white/5 px-3 text-sm"
						value={activeDevices.camera?.deviceId}
						onChange={(e) => {
							const deviceId = e.currentTarget.value;
							call.self.setCameraDevice(deviceId);
						}}
					>
						{cameras?.map((device) => (
							<option key={device.deviceId} value={device.deviceId}>
								{device.label}
							</option>
						))}
					</select>
				</div>

				{isSetSinkIdSupported && (
					<div className="flex items-center gap-2">
						<label className="w-20 text-sm font-medium">Speaker</label>
						<select
							className="flex-1 shrink-0 rounded-md border border-zinc-200 bg-white/5 px-3 text-sm"
							onChange={(e) => {
								const deviceId = e.currentTarget.value;
								audioRef.current?.setSinkId(deviceId);
							}}
						>
							{speakers?.map((device) => (
								<option key={device.deviceId} value={device.deviceId}>
									{device.label}
								</option>
							))}
						</select>
					</div>
				)}
			</div>
		</dialog>
	);
}
