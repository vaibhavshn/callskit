import invariant from 'tiny-invariant';
import { Observable } from 'rxjs';

export function blackCanvasStreamTrack(videoTrack?: MediaStreamTrack) {
	const canvas = document.createElement('canvas');
	canvas.height = videoTrack?.getSettings().height ?? 720;
	canvas.width = videoTrack?.getSettings().width ?? 1280;
	const ctx = canvas.getContext('2d');
	invariant(ctx);
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	// we need to draw to the canvas in order for video
	// frames to be sent on the video track
	setInterval(() => {
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}, 1000);
	return canvas.captureStream().getVideoTracks()[0]!;
}

export function getInaudibleTrack() {
	const audioContext = new AudioContext();

	const oscillator = audioContext.createOscillator();
	oscillator.type = 'triangle';
	// roughly sounds like a box fan
	oscillator.frequency.setValueAtTime(20, audioContext.currentTime);

	const gainNode = audioContext.createGain();
	// even w/ gain at 0 some packets are sent
	gainNode.gain.setValueAtTime(0, audioContext.currentTime);

	oscillator.connect(gainNode);

	const destination = audioContext.createMediaStreamDestination();
	gainNode.connect(destination);

	oscillator.start();

	const track = destination.stream.getAudioTracks()[0]!;
	return { track, audioContext };
}

export const inaudibleAudioTrack$ = new Observable<MediaStreamTrack>(
	(subscriber) => {
		const { audioContext, track } = getInaudibleTrack();
		subscriber.next(track);
		return () => {
			track.stop();
			audioContext.close();
		};
	},
);
