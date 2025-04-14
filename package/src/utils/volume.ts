export function rmsToDbfs(rms: number) {
	if (rms === 0) return -Infinity; // absolute silence
	return 20 * Math.log10(rms); // in decibels (dBFS)
}

// normalize dBFS to [0, 10]
export function dbfsToVolumeLevel(dbfs: number) {
	const minDb = -50; // silence threshold
	const maxDb = -10; // loudest meaningful level

	if (dbfs <= minDb) return 0;
	if (dbfs >= maxDb) return 10;

	// Linear mapping from [minDb, maxDb] → [0, 10]
	return ((dbfs - minDb) / (maxDb - minDb)) * 10;
}

export function normalize_rms(rms: number) {
	return Math.round(dbfsToVolumeLevel(rmsToDbfs(rms)));
}
