import { defineConfig } from 'tsup';

let env = {
	SOCKET_URL: 'http://127.0.0.1:1999',
	API_URL: 'http://localhost:8787',
};

if (process.env.NODE_ENV === 'production') {
	env = {
		SOCKET_URL: 'https://callskit-socket.vaibhavshn.partykit.dev',
		API_URL: 'https://callskit-server.vaibhavshn-in.workers.dev',
	};
}

export default defineConfig([
	{
		entry: {
			index: 'src/index.ts',
			react: 'src/react/index.ts',
		},
		format: ['esm', 'cjs'],
		dts: true,
		clean: true,
		treeshake: true,
		env: env,
		external: ['react', 'partysocket', 'partytracks', 'rxjs'],
	},
]);
