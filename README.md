# CallsKit

A client SDK for handling calls using [Cloudflare Realtime](https://developers.cloudflare.com/realtime/).

CallsKit provides vanilla JS APIs as well as React hooks that makes development with the core APIs easier in React.

See [contributing guide](./CONTRIBUTING.md) for development setup.

## Usage

### Core API Usage (JS)

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
		createCall({ room: 'abc-xyz' });
	}, []);

	return (
		<CallProvider call={call} fallback={<div>Loading...</div>}>
			<MyCallApp />
		</CallProvider>
	);
}
```

Then your app can use the hooks:

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
