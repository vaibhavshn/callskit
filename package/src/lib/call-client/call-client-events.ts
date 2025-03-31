type CallEvents = {
	connected: () => void;
	joined: () => void;
	left: () => void;
};

export type CallClientEvents = CallEvents;
