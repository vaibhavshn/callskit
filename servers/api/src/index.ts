import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { routeApiRequest } from 'callskit/server';

type Bindings = {
	REALTIME_APP_ID: string;
	REALTIME_API_TOKEN: string;
	TURN_TOKEN_ID: string;
	TURN_API_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
	return c.text('Hello world!');
});

app.use('/partytracks/*', cors());

app.all('/partytracks/*', (c) => {
	return routeApiRequest({
		appId: c.env.REALTIME_APP_ID,
		token: c.env.REALTIME_API_TOKEN,
		turnServerAppId: c.env.TURN_TOKEN_ID,
		turnServerAppToken: c.env.TURN_API_TOKEN,
		request: c.req.raw,
		turnServerCredentialTTL: 86400, // 24 hours
	});
});

export default app;
