const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
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
