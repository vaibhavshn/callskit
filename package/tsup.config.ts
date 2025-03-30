import { defineConfig } from 'tsup';

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
		external: ['react', 'partysocket', 'partytracks', 'rxjs'],
	},
]);
