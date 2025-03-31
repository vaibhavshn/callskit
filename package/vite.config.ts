import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
	// build: {
	// 	emptyOutDir: false,
	// 	lib: {
	// 		entry: {
	// 			browser: 'src/index.ts',
	// 		},
	// 		fileName: () => 'browser.js',
	// 		name: 'CallsKit',
	// 		formats: ['iife'],
	// 	},
	// },
	plugins: [react()],
});
