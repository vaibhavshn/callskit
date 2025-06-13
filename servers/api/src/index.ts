import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { routePartyTracksRequest } from 'partytracks/server';

type Bindings = {
	CALLS_APP_ID: string;
	CALLS_APP_TOKEN: string;
	TURN_TOKEN_ID: string;
	TURN_API_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
	return c.text('Hello Hono!');
});

app.use('/partytracks/*', cors());

app.all('/partytracks/*', (c) => {
	return routePartyTracksRequest({
		appId: c.env.CALLS_APP_ID,
		token: c.env.CALLS_APP_TOKEN,
		turnServerAppId: c.env.TURN_TOKEN_ID,
		turnServerAppToken: c.env.TURN_API_TOKEN,
		request: c.req.raw,
	});
});

export default app;
