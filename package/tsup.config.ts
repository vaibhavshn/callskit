import { defineConfig } from 'tsup';

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
	console.log('\x1b[1m\x1b[32m%s\x1b[0m', 'Building for production...\n');
} else {
	console.log(
		'\x1b[1m\x1b[33m%s\x1b[0m',
		'Starting watch build for development...\n',
	);
}

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
		sourcemap: !isProd,
		watch: !isProd,
		clean: true,
	},
	{
		entry: {
			server: 'src/server/index.ts',
		},
		format: 'esm',
		dts: true,
		external: ['partykit'],
		sourcemap: !isProd,
		watch: !isProd,
		clean: true,
	},
]);
