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
		watch: true,
		external: ['react'],
	},
	{
		entry: {
			server: 'src/server/index.ts',
		},
		format: 'esm',
		dts: true,
		watch: true,
		external: ['partykit'],
	},
]);
