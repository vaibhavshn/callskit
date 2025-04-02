export function rmsToDbfs(rms: number) {
	if (rms === 0) return -Infinity; // absolute silence
	return 20 * Math.log10(rms); // in decibels (dBFS)
}
