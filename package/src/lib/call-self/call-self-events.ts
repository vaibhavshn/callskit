export type ParticipantMediaEvents = {
	micUpdate: (
		data:
			| {
					micEnabled: true;
					micTrack: MediaStreamTrack;
			  }
			| {
					micEnabled: false;
			  },
	) => void;
	cameraUpdate: (
		data:
			| {
					cameraEnabled: true;
					cameraTrack: MediaStreamTrack;
			  }
			| {
					cameraEnabled: false;
			  },
	) => void;
	screenshareUpdate: (
		data:
			| {
					screenshareEnabled: true;
					screenshareVideoTrack?: MediaStreamTrack;
					screenshareAudioTrack?: MediaStreamTrack;
			  }
			| { screenshareEnabled: false },
	) => void;
	volumeChange: (volume: number, lastVolume: number) => void;
	nameChange: (name: string, oldName: string) => void;
	devicesUpdate: (devices: MediaDeviceInfo[]) => void;
	activeDeviceUpdate: (type: 'mic' | 'camera', device: MediaDeviceInfo) => void;
};

export type CallSelfEvents = ParticipantMediaEvents;
