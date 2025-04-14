import type { CameraRID } from '../call-self/call-self';

type CallEvents = {
	connected: () => void;
	joined: () => void;
	left: () => void;

	mediaConnected: () => void;

	cameraQualityChanged: (newQuality: CameraRID, oldQuality: CameraRID) => void;
};

export type CallClientEvents = CallEvents;
