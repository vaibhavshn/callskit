# CallsKit

A client SDK for handling calls using [Cloudflare Realtime](https://developers.cloudflare.com/realtime/).

CallsKit provides vanilla JS APIs as well as React hooks that makes development with the core APIs easier in React.

## Usage

### Core API Usage (JS)

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
