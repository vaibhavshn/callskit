import { defineConfig } from 'tsup';

const isProd = process.env.NODE_ENV === 'production';

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
		sourcemap: isProd ? false : true,
		watch: isProd ? false : true,
	},
	{
		entry: {
			server: 'src/server/index.ts',
		},
		format: 'esm',
		dts: true,
		external: ['partykit'],
		sourcemap: isProd ? false : true,
		watch: isProd ? false : true,
	},
]);
