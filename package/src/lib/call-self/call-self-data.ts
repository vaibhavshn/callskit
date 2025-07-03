import type { VideoEncodingRid } from './call-self';

export const cameraEncodings: RTCRtpEncodingParameters[] = [
	{
		rid: 'h' satisfies VideoEncodingRid,
		scaleResolutionDownBy: 2.0,
		maxBitrate: 500_000,
		maxFramerate: 24.0,
		active: true,
	},
	{
		rid: 'f' satisfies VideoEncodingRid,
		maxBitrate: 1_300_000,
		maxFramerate: 30.0,
	},
];
