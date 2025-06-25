import type { VideoEncodingRid } from "./call-self";

export const cameraEncodings: RTCRtpEncodingParameters[] = [
	{
		rid: 'low' satisfies VideoEncodingRid,
		scaleResolutionDownBy: 2.0,
		maxBitrate: 500_000,
		maxFramerate: 24.0,
	},
	{
		rid: 'high' satisfies VideoEncodingRid,
		maxBitrate: 1_300_000,
		maxFramerate: 30.0,
	},
];
