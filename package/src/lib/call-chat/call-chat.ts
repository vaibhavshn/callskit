import { EventsHandler } from '../../utils/events-handler';
import { getCurrentCallContext, type CallContext } from '../call-context';

export type CallChatEvents = {
	loaded: (messages: ChatMessage[]) => void;
	message: (message: ChatMessage) => void;
};

export type ChatMessagePayload =
	| { type: 'text'; message: string }
	| { type: 'image' | 'file'; name: string; url: string; size: number };

type ChatBaseMessage = {
	id: string;
	user_id: string;
	display_name: string;
	created_at: Date;
};

type ChatTextMessage = ChatBaseMessage & ChatMessagePayload;

type ChatImageMessage = ChatBaseMessage & {
	type: 'image';
	url: string;
	size: number;
};

export type ChatMessage = ChatTextMessage | ChatImageMessage;

export class CallChat extends EventsHandler<CallChatEvents> {
	messages: ChatMessage[] = [];

	#ctx: CallContext;

	constructor() {
		super();
		this.#ctx = getCurrentCallContext();
	}

	sendTextMessage(message: string) {
		this.#sendMessage({ type: 'text', message });
	}

	#sendMessage(message: ChatMessagePayload) {
		this.#ctx.socket.sendAction({ action: 'chat/message', message });
	}

	addMessage(message: ChatMessage) {
		const parsedMessage = {
			...message,
			created_at: new Date(message.created_at),
		};
		this.messages = [...this.messages, parsedMessage];
		this.emit('message', parsedMessage);
	}

	addMessagesInBulk(messages: ChatMessage[]) {
		const parsed = messages.map((message) => ({
			...message,
			created_at: new Date(message.created_at),
		}));
		this.messages = [...this.messages, ...parsed];
		this.emit('loaded', parsed);
	}
}
