# CallsKit

A client SDK for handling calls using [Cloudflare Realtime](https://developers.cloudflare.com/realtime/).

CallsKit provides vanilla JS APIs as well as React hooks that makes development with the core APIs easier in React.

See [contributing guide](./CONTRIBUTING.md) for development setup.

## Usage

### Server setup

#### API Server

First you would need to route API requests in an API server like so:

```ts
import { routeApiRequest } from 'callskit/server';

app.all('/partytracks/*', (c) => {
	return routeApiRequest({
		appId: c.env.REALTIME_APP_ID,
		token: c.env.REALTIME_API_TOKEN,
		turnServerAppId: c.env.TURN_TOKEN_ID,
		turnServerAppToken: c.env.TURN_API_TOKEN,
		request: c.req.raw,
	});
});
```

Refer [servers/api/src/index.ts](./servers/api/src/index.ts) for a full hono example.

Make sure to put your env variables in the `.dev.vars` file.

Deploy this and use the URL in the client side.

#### Socket Server using PartyKit

CallsKit provides a PartyKit worker that you can use to handle room state.

Just create a PartyKit project using:

```sh
npm create partykit@latest
```

Then, replace the contents of the `src/server.ts` with this:

```js
import { PartyKitServer } from 'callskit/server';

export default PartyKitServer;
```

Then just deploy and use this URL in the client side.

```sh
npm run deploy
```

### Core API Usage (Vanilla JS)

```js
const call = await createCall({ room: 'abc-xyz' });

// then access APIs like so
call.started_at;
call.room;
call.self;
call.self.name;
call.participants.joined.toArray();
call.participants.joined.toArray()[0].name;
call.chat;
```

### React Hooks

You set up the provider like so:

```tsx
import { useCreateCall, CallProvider } from 'callskit/react';

function App() {
	const [call, createCall] = useCreateCall();

	useEffect(() => {
		createCall({
			room: 'abc-xyz',
			socketBaseUrl: 'YOUR_SOCKET_URL',
			// API Base should exclude `/partytracks` at the end
			apiBaseUrl: 'YOUR_API_URL',
		});
	}, []);

	return (
		<CallProvider call={call} fallback={<div>Loading...</div>}>
			<MyCallApp />
		</CallProvider>
	);
}
```

Then your app can use the provided hooks like so.

```tsx
import { useCall, useCallSelector } from 'callskit/react';

function MyCallApp() {
	const call = useCall();
	const participants = useCallSelector(
		(call) => call.participants.joined,
	).toArray();

	const chatMessages = useCallSelector((call) => call.chat.messages);

	// ...
}
```
