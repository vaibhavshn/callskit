import type * as Party from 'partykit/server';
import { createEvent, parseAction } from './helpers';
import type { User } from './types';

export default class Server implements Party.Server {
	started_at!: Date;

	users: User[] = [];

	constructor(readonly room: Party.Room) {}

	async onStart() {
		this.clearUsers();
		this.users = (await this.room.storage.get<User[]>('users')) ?? [];
		this.started_at = new Date();
	}

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		console.log(
			`Connected:
  id: ${conn.id}
  room: ${this.room.id}
  url: ${new URL(ctx.request.url).pathname}`,
		);

		conn.send(createEvent({ event: 'connected' }));
	}

	onMessage(message: string, sender: Party.Connection) {
		console.log(`connection ${sender.id} sent message: ${message}`);
		const payload = parseAction(message);

		switch (payload.action) {
			case 'join': {
				const user: User = { ...payload.self, connectionId: sender.id };
				const without = this.getConnectionIds([sender.id]);
				console.log(without, sender.id);
				this.room.broadcast(
					createEvent({
						event: 'room/init',
						participants: this.users,
						started_at: this.started_at.toISOString(),
					}),
					without,
				);
				this.addUser(user);
				this.room.broadcast(
					createEvent({
						event: 'participant/joined',
						participant: payload.self,
					}),
					[sender.id],
				);
				console.log(this.users);
				break;
			}

			case 'leave': {
				const user = this.getUser(sender.id);
				if (user) {
					this.room.broadcast(
						createEvent({
							event: 'participant/left',
							participantId: user.id,
						}),
						[sender.id],
					);
				}
				this.removeUser(sender.id);
				break;
			}

			case 'self/mic-update': {
				const { micEnabled, micTrackId } = payload.updates;
				const user = this.getUser(sender.id);
				if (user) {
					user.micEnabled = micEnabled;
					user.micTrackId = micTrackId;
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
				const { cameraEnabled, cameraTrackId } = payload.updates;
				const user = this.getUser(sender.id);
				if (user) {
					user.cameraEnabled = cameraEnabled;
					user.cameraTrackId = cameraTrackId;
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
		}
	}

	onClose(connection: Party.Connection): void | Promise<void> {
		const user = this.users.find((user) => user.connectionId === connection.id);
		if (user) {
			this.removeUser(connection.id);
			this.room.broadcast(
				createEvent({ event: 'participant/left', participantId: user.id }),
			);
		}
	}

	getUser(connectionId: string) {
		return this.users.find((u) => u.connectionId === connectionId);
	}

	async addUser(user: User) {
		console.log(`addUser:${user.id}:${user.name}`);
		this.users.push(user);
		return this.room.storage.put<User[]>('users', this.users);
	}

	async removeUser(connectionId: string) {
		const user = this.getUser(connectionId);

		if (user) {
			console.log(`removeUser:${user.id}:${user.name}`);
			this.users = this.users.filter(
				(user) => user.connectionId !== connectionId,
			);
			return this.syncUsersToDB();
		}
	}

	async syncUsersToDB() {
		await this.room.storage.put<User[]>('users', this.users);
	}

	async clearUsers() {
		this.users = [];
		await this.room.storage.delete('users');
	}

	getConnectionIds(exclude?: string[]) {
		const ids = this.users.map((u) => u.connectionId);
		if (exclude) {
			return ids.filter((id) => !exclude.includes(id));
		}
		return ids;
	}
}

Server satisfies Party.Worker;
