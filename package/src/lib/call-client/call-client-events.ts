import type { VideoEncodingRid } from '../call-self/call-self';

type CallEvents = {
	connected: () => void;
	joined: () => void;
	left: () => void;

	mediaConnected: () => void;

	cameraQualityChanged: (newQuality: VideoEncodingRid, oldQuality: VideoEncodingRid) => void;
};

export type CallClientEvents = CallEvents;
