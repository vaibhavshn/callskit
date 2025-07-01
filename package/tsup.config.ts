import { defineConfig } from 'tsup';

export default defineConfig([
	{
		entry: {
			index: 'src/index.ts',
			react: 'src/react/index.ts',
		},
		format: ['esm', 'cjs'],
		dts: true,
		treeshake: true,
		external: ['react'],
	},
	{
		entry: {
			server: 'src/server/index.ts',
		},
		format: 'esm',
		dts: true,
		external: ['partykit'],
	},
]);
