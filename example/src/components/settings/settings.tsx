import { useEffect, useRef, useState } from 'react';
import { useMeetingStore } from '../../data/meeting-store';
import { useCall } from 'callskit/react';

export function Settings({
	audioRef,
}: {
	audioRef: React.RefObject<HTMLAudioElement>;
}) {
	const call = useCall();
	const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const store = useMeetingStore();

	useEffect(() => {
		call.self.devices.then((devices) => {
			setDevices(devices);
		});
	}, [call]);

	useEffect(() => {
		if (store.settingsOpen) {
			dialogRef.current?.showModal();
		} else {
			dialogRef.current?.close();
		}
	}, [store.settingsOpen]);

	console.log({ devices });

	const mics = devices.filter((device) => device.kind === 'audioinput');
	const cameras = devices.filter((device) => device.kind === 'videoinput');
	const speakers = devices.filter((device) => device.kind === 'audiooutput');

	const isSetSinkIdSupported = 'setSinkId' in HTMLAudioElement.prototype;

	return (
		<dialog
			ref={dialogRef}
			className="m-auto w-full max-w-lg flex-col gap-3 rounded-lg p-4 backdrop:bg-black/30 backdrop:backdrop-blur-sm open:flex"
			onClose={() => {
				store.setSettingsOpen(false);
			}}
		>
			<h3 className="mb-3 text-xl font-semibold">Device Settings</h3>

			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<label className="w-20 text-sm font-medium">Mic</label>
					<select
						className="flex-1 shrink-0 rounded-md border border-zinc-200 bg-white/5 px-3 text-sm"
						onChange={(e) => {
							const deviceId = e.currentTarget.value;
							call.self.setMicDevice(deviceId);
						}}
					>
						{mics.map((device) => (
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
						onChange={(e) => {
							const deviceId = e.currentTarget.value;
							call.self.setCameraDevice(deviceId);
						}}
					>
						{cameras.map((device) => (
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
							{speakers.map((device) => (
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
