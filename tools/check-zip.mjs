/**
 * Release guard: fails `npm run plugin-zip` when the zip holds anything that
 * must not ship (dev files, tests, tooling, archives, files nothing loads).
 *
 * The allow list is the `files` field in package.json; this is the safety net
 * behind it. When a new file is flagged, exclude it there with a `!` pattern.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire( import.meta.url );
// adm-zip ships with @wordpress/scripts, which builds the zip.
const AdmZip = require(
	require.resolve( 'adm-zip', {
		paths: [ require.resolve( '@wordpress/scripts/package.json' ) ],
	} )
);

const { name } = JSON.parse( readFileSync( 'package.json', 'utf8' ) );
const FORBIDDEN = [
	[ /(^|\/)\./, 'hidden file' ],
	[
		/^(tests|tools|node_modules|vendor|docs|design|coverage)\//,
		'dev folder',
	],
	[ /\.(zip|map|log|bak|tmp|orig|psd|sketch)$/i, 'archive or dev artifact' ],
	[ /\.(test|spec)\.[jt]sx?$/, 'test file' ],
	[
		/^(composer\.(json|lock)|package-lock\.json|phpcs\.xml(\.dist)?|phpunit\.xml(\.dist)?|jest-unit\.config\.js|AGENTS\.md|CLAUDE\.md)$/,
		'dev config',
	],
	// Built or bundled, but never loaded by the plugin.
	[ /^build\/(tokens|components)-rtl\.css$/, 'unused RTL stylesheet' ],
	[
		/^assets\/fonts\/(bricolage-grotesque|figtree)-latin-wght-normal\.woff2$/,
		'font already bundled in build/fonts',
	],
	[ /^assets\/images\/productbox\.png$/, 'image nothing references' ],
];
const REQUIRED = [
	`${ name }.php`,
	'readme.txt',
	'uninstall.php',
	'build/admin.js',
	'build/storefront.js',
	'build/button-boost.css',
	'build/blocks/box-builder/block.json',
	'languages/README.txt',
];

const zip = new AdmZip( `${ name }.zip` );
const files = zip
	.getEntries()
	.filter( ( entry ) => ! entry.isDirectory )
	.map( ( entry ) => ( {
		path: entry.entryName.replace( `${ name }/`, '' ),
		size: entry.header.size,
	} ) );
const paths = new Set( files.map( ( file ) => file.path ) );

const problems = [];
for ( const file of files ) {
	for ( const [ pattern, reason ] of FORBIDDEN ) {
		if ( pattern.test( file.path ) ) {
			problems.push( `  ${ file.path }  (${ reason })` );
		}
	}
}
for ( const path of REQUIRED ) {
	if ( ! paths.has( path ) ) {
		problems.push( `  ${ path }  (missing)` );
	}
}

const kb = ( bytes ) => ( bytes / 1024 ).toFixed( 0 ) + ' KB';
const total = files.reduce( ( sum, file ) => sum + file.size, 0 );
/* eslint-disable no-console -- build log. */
if ( problems.length ) {
	console.error(
		`\n${ name }.zip failed the release check:\n` + problems.join( '\n' )
	);
	process.exit( 1 );
}
console.log(
	`\nRelease check passed: ${ files.length } files, ${ kb(
		total
	) } unpacked.`
);
/* eslint-enable no-console */
