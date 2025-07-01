import type * as Party from 'partykit/server';
import { createEvent, parseAction } from './helpers';
import type { User } from './types';
import type { ChatMessage } from '..';

export class PartyKitServer implements Party.Server {
	started_at!: Date;

	connectionIds: string[] = [];

	users = new Map<string, User>();

	chat: ChatMessage[] = [];

	constructor(readonly room: Party.Room) {}

	async onStart() {
		this.started_at = new Date();
		const storedUsers = (await this.room.storage.get<User[]>('users')) ?? [];
		this.users = new Map(storedUsers.map((user) => [user.connectionId, user]));
		this.chat = (await this.room.storage.get<ChatMessage[]>('chat')) ?? [];
	}

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		console.log(
			`Connected:
  id: ${conn.id}
  room: ${this.room.id}
  url: ${new URL(ctx.request.url).pathname}`,
		);
		this.connectionIds.push(conn.id);
		conn.send(createEvent({ event: 'connected' }));
	}

	async onClose(connection: Party.Connection) {
		const user = this.users.get(connection.id);
		if (user) {
			this.users.delete(connection.id);
			this.connectionIds = this.connectionIds.filter(
				(id) => id !== connection.id,
			);
			this.room.broadcast(
				createEvent({ event: 'participant/left', participantId: user.id }),
				[connection.id],
			);
		}

		if (this.users.size === 0) {
			await this.room.storage.deleteAll();
		}
	}

	onMessage(message: string, sender: Party.Connection) {
		const payload = parseAction(message);
		const user = this.users.get(sender.id);

		console.log(`received message from ${sender.id}: ${payload}`);

		switch (payload.action) {
			case 'join': {
				const user: User = { ...payload.self, connectionId: sender.id };
				const without = [...this.users.keys(), ...this.connectionIds];
				this.room.broadcast(
					createEvent({
						event: 'room/init',
						participants: [...this.users.values()],
						started_at: this.started_at.toISOString(),
						chatMessages: this.chat,
					}),
					without.filter((id) => id !== sender.id),
				);
				this.connectionIds = this.connectionIds.filter(
					(id) => id !== sender.id,
				);
				this.users.set(sender.id, user);
				this.room.broadcast(
					createEvent({
						event: 'participant/joined',
						participant: payload.self,
					}),
					[sender.id],
				);
				break;
			}

			case 'leave': {
				if (user) {
					this.users.delete(sender.id);
					this.room.broadcast(
						createEvent({
							event: 'participant/left',
							participantId: user.id,
						}),
						[sender.id],
					);
				}
				break;
			}

			case 'self/mic-update': {
				if (user) {
					Object.assign(user, payload.updates);
					this.room.broadcast(
						createEvent({
							event: 'participant/mic-update',
							data: { ...payload.updates, participantId: user.id },
						}),
						[sender.id],
					);
				}
				break;
			}

			case 'self/camera-update': {
				if (user) {
					Object.assign(user, payload.updates);
					this.room.broadcast(
						createEvent({
							event: 'participant/camera-update',
							data: { ...payload.updates, participantId: user.id },
						}),
						[sender.id],
					);
				}
				break;
			}

			case 'self/screenshare-update': {
				if (user) {
					Object.assign(user, payload.updates);
					this.room.broadcast(
						createEvent({
							event: 'participant/screenshare-update',
							data: { ...payload.updates, participantId: user.id },
						}),
						[sender.id],
					);
				}
				break;
			}

			case 'chat/message': {
				if (user) {
					const message: ChatMessage = {
						...payload.message,
						id: crypto.randomUUID(),
						display_name: user.name,
						user_id: user.id,
						created_at: new Date(),
					};
					this.chat.push(message);
					this.room.broadcast(
						createEvent({ event: 'chat/new-message', message }),
					);
				}
				break;
			}
		}
	}
}

PartyKitServer satisfies Party.Worker;

export { routePartyTracksRequest as routeApiRequest } from 'partytracks/server';
