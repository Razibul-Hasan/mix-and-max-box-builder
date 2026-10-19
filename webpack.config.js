const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: () => ( {
		...defaultConfig.entry(),
		admin: './src/admin/index.js',
		storefront: './src/storefront/index.js',
	} ),
};
