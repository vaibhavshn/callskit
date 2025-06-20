import type { SerializedUser } from '..';

export interface User extends SerializedUser {
	connectionId: string;
}
