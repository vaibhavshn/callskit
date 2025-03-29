import { Hono } from 'hono';
import { routePartyTracksRequest } from './route';
import { cors } from 'hono/cors';

type Bindings = {
	CALLS_APP_ID: string;
	CALLS_APP_TOKEN: string;
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
		request: c.req.raw,
	});
});

export default app;
