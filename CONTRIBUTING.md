# Contributing

Run `npm install` in the root first.

To start developing, add the following env vars from the Cloudflare dashboard to `api/.dev.vars`:

```sh
REALTIME_APP_ID=
REALTIME_API_TOKEN=

TURN_TOKEN_ID=
TURN_API_TOKEN=
```

Now just run the following commands in two terminals.

```sh
npm run dev:web
```

This will start development build for callskit package and start the example as well.

Then run:

```sh
npm run dev:servers
```

This will start both the API and Socket servers.

Now you can visit http://localhost:5173 to view the example.
