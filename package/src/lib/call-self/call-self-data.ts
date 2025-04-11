export const cameraEncodings: RTCRtpEncodingParameters[] = [
	{
		rid: 'b',
		scaleResolutionDownBy: 2.0,
		maxBitrate: 500_000,
		maxFramerate: 24.0,
	},
	{
		rid: 'a',
		maxBitrate: 1_300_000,
		maxFramerate: 30.0,
	},
];
