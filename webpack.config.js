const { resolve } = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	// Reuse compiled modules between builds. Rebuilt whenever this file, the
	// lockfile or the build tools change, so a stale cache cannot leak into a release.
	cache: {
		type: 'filesystem',
		cacheDirectory: resolve( __dirname, 'node_modules/.cache/webpack' ),
		buildDependencies: {
			config: [ __filename, resolve( __dirname, 'package-lock.json' ) ],
		},
	},
	output: {
		...defaultConfig.output,
		enabledLibraryTypes: [ 'window' ],
	},
	entry: () => ( {
		...defaultConfig.entry(),
		admin: './src/admin/index.js',
		storefront: './src/storefront/index.js',
		tokens: './src/styles/tokens.js',
		components: {
			import: './src/styles/components.js',
			library: { name: 'mmbbComponents', type: 'window' },
		},
	} ),
};
