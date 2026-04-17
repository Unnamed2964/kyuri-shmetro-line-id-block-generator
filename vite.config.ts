import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => {
	if (mode === 'package') {
		return {
			build: {
				emptyOutDir: true,
				lib: {
					entry: resolve(__dirname, 'src/index.ts'),
					name: 'ShmetroGenerator',
					formats: ['es', 'cjs', 'umd'],
					fileName: (format) => {
						if (format === 'es') return 'index.js';
						if (format === 'cjs') return 'index.cjs';
						return 'bundle.js';
					}
				},
				rollupOptions: {
					output: {
						exports: 'named'
					}
				}
			}
		};
	}

	return {
		base: '/',
		build: {
			outDir: 'docs',
			emptyOutDir: true
		}
	};
});