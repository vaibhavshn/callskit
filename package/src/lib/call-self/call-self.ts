import { resilientTrack$ } from 'partytracks/client';
import {
	BehaviorSubject,
	distinctUntilChanged,
	of,
	switchMap,
	tap,
} from 'rxjs';
import type { SerializedUser } from '../../types/call-socket';
import { EventsHandler } from '../../utils/events-handler';
import {
	blackCanvasStreamTrack$,
	inaudibleAudioTrack$,
} from '../../utils/tracks';
import { type CallClientOptions } from '../call-client/call-client';
import { getCurrentCallContext, type CallContext } from '../call-context';
import type { CallSelfEvents } from './call-self-events';

export type CallSelfOptions = {
	name: string;
	defaults: CallClientOptions['defaults'];
};

/** Camera Quality Code
 * - `a` is High Quality
 * - `b` is Data Saver
 */
export type CameraRID = 'a' | 'b';

export class CallSelf extends EventsHandler<CallSelfEvents> {
	id: string = crypto.randomUUID();
	name: string;

	#ctx: CallContext;

	#micEnabled$: BehaviorSubject<boolean>;
	#micEnabled: boolean = false;
	#micTrack: MediaStreamTrack | undefined;
	#micTrackId: string | undefined;

	#cameraEnabled$: BehaviorSubject<boolean>;
	#cameraEnabled: boolean = false;
	#cameraTrack: MediaStreamTrack | undefined;
	#cameraTrackId: string | undefined;

	constructor(options: CallSelfOptions) {
		super();
		this.name = options.name;
		this.#ctx = getCurrentCallContext();

		this.#micEnabled$ = new BehaviorSubject<boolean>(
			options.defaults?.audio ?? false,
		);

		this.#cameraEnabled$ = new BehaviorSubject<boolean>(
			options.defaults?.video ?? false,
		);

		const micTrack$ = this.#micEnabled$.pipe(
			distinctUntilChanged(),
			switchMap((enabled) =>
				enabled
					? resilientTrack$({ kind: 'audioinput' })
					: inaudibleAudioTrack$,
			),
			tap((track) => {
				this.#micTrack = track;
			}),
		);

		const micMetadata$ = this.#ctx.partyTracks.push(micTrack$, {
			sendEncodings$: of([
				{ networkPriority: 'high' },
			] satisfies RTCRtpEncodingParameters[]),
		});

		micMetadata$.subscribe((metadata) => {
			const micEnabled = this.#micEnabled$.value;
			const micTrack = this.#micTrack;

			if (micEnabled && micTrack) {
				const micTrackId = `${metadata.sessionId}/${metadata.trackName}`;
				this.#micTrackId = micTrackId;
				this.#micEnabled = true;
				this.#ctx.socket.sendAction({
					action: 'self/mic-update',
					updates: {
						micEnabled: true,
						micTrackId,
					},
				});
				this.emit('micUpdate', {
					micEnabled: true,
					micTrack,
				});
			} else if (!micEnabled) {
				this.#micEnabled = false;
				this.#ctx.socket.sendAction({
					action: 'self/mic-update',
					updates: { micEnabled: false },
				});
				this.emit('micUpdate', { micEnabled: false });
			}
		});

		const cameraTrack$ = this.#cameraEnabled$.pipe(
			distinctUntilChanged(),
			switchMap((enabled) =>
				enabled
					? resilientTrack$({
							kind: 'videoinput',
							constraints: {
								frameRate: 24,
								width: { ideal: 1280 },
								height: { ideal: 720 },
								aspectRatio: 16 / 9,
								facingMode: 'user',
							},
						})
					: blackCanvasStreamTrack$,
			),
			tap((track) => {
				this.#cameraTrack = track;
			}),
		);

		const cameraMetadata$ = this.#ctx.partyTracks.push(cameraTrack$, {
			sendEncodings$: this.#ctx.cameraEncodings$,
		});

		cameraMetadata$.subscribe((metadata) => {
			const cameraEnabled = this.#cameraEnabled$.value;
			const cameraTrack = this.#cameraTrack;

			if (cameraEnabled && cameraTrack) {
				const cameraTrackId = `${metadata.sessionId}/${metadata.trackName}`;
				this.#cameraTrackId = cameraTrackId;
				this.#cameraEnabled = true;
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: {
						cameraEnabled: true,
						cameraTrackId,
					},
				});
				this.emit('cameraUpdate', {
					cameraEnabled: true,
					cameraTrack,
				});
			} else if (!cameraEnabled) {
				this.#cameraEnabled = false;
				this.#cameraTrackId = undefined;
				this.#ctx.socket.sendAction({
					action: 'self/camera-update',
					updates: { cameraEnabled: false },
				});
				this.emit('cameraUpdate', { cameraEnabled: false });
			}
		});
	}

	startMic() {
		this.#micEnabled$.next(true);
	}

	stopMic() {
		this.#micEnabled$.next(false);
	}

	startCamera() {
		this.#cameraEnabled$.next(true);
	}

	stopCamera() {
		this.#cameraEnabled$.next(false);
	}

	get micEnabled(): boolean {
		return this.#micEnabled;
	}

	get micTrack(): MediaStreamTrack | undefined {
		return this.#micEnabled ? this.#micTrack : undefined;
	}

	get cameraEnabled(): boolean {
		return this.#cameraEnabled;
	}

	get cameraTrack(): MediaStreamTrack | undefined {
		return this.#cameraEnabled ? this.#cameraTrack : undefined;
	}

	setName(name: string) {
		const oldName = this.name;
		this.name = name;
		this.emit('nameChange', this.name, oldName);
	}

	toJSON(): SerializedUser {
		return {
			id: this.id,
			name: this.name,
			micEnabled: this.micEnabled,
			micTrackId: this.#micTrackId,
			cameraEnabled: this.cameraEnabled,
			cameraTrackId: this.#cameraTrackId,
		};
	}
}
