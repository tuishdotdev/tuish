import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	// Turbopack configuration for resolving externals from tuish browser bundle
	turbopack: {
		resolveAlias: {
			// Help Turbopack resolve externals from the tuish browser bundle
			'react-reconciler': 'react-reconciler',
			'react-reconciler/constants.js': 'react-reconciler/constants.js',
			'scheduler': 'scheduler',
		},
	},
	webpack: (config, { isServer }) => {
		if (!isServer) {
			// Stub Node.js modules for browser builds
			// These are used by ink and its dependencies but aren't needed in browser
			config.resolve.fallback = {
				...config.resolve.fallback,
				// Core Node.js modules
				fs: false,
				path: false,
				os: false,
				module: false,
				child_process: false,
				assert: false,
				buffer: false,
				stream: false,
				util: false,
				events: false,
				// Used by 'open' package
				'node:child_process': false,
				'node:os': false,
				'node:path': false,
				'node:fs': false,
				'node:fs/promises': false,
				'node:buffer': false,
				'node:assert': false,
				'node:process': false,
			};

			// Alias 'open' to a browser-compatible version
			config.resolve.alias = {
				...config.resolve.alias,
				'open': false,
			};
		}
		return config;
	},
};

export default withMDX(config);
