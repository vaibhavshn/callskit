import type { SerializedUser } from 'callskit';

export interface User extends SerializedUser {
	connectionId: string;
}
