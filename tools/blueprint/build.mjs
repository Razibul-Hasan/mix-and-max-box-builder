/**
 * Build the WordPress.org live preview blueprint from the PHP next to it.
 *
 * node tools/blueprint/build.mjs           writes .wordpress-org/blueprints/blueprint.json
 * node tools/blueprint/build.mjs --local   writes a copy that activates a mounted checkout
 *                                          instead of installing from WordPress.org, for
 *                                          testing with @wp-playground/cli.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SLUG = 'productboxes-mix-and-match-box-builder';
const root = new URL( '../../', import.meta.url );
const local = process.argv.includes( '--local' );
const source = ( name ) =>
	readFile( new URL( `tools/blueprint/${ name }`, root ), 'utf8' );

/**
 * Product photos: product slug => Unsplash photo id. Free to use under the
 * Unsplash license, served with CORS so Playground can fetch them. Keep the
 * slugs in step with mmbb_demo_catalog() in demo-content.php.
 */
const PHOTOS = {
	'espresso-roast': '1497935586351-b67a49e012bf',
	'pour-over-blend': '1442512595331-e89e73853f31',
	'barista-latte-kit': '1509042239860-f550ce710b93',
	'breakfast-leaf-tea': '1564890369478-c89ca6d9cde9',
	'herbal-tea-sachets': '1576092768241-dec231879fc3',
	'cold-brew-black-tea': '1556679343-c7306c1976bc',
	'raw-wildflower-honey': '1558642452-9d2a7deb7f62',
	'brown-butter-cookies': '1499636136210-6f4ee915583e',
	'bakery-cookie-bag': '1558961363-fa8fdf82db35',
	'dark-chocolate-shards': '1511381939415-e44015466834',
	'white-almond-bar': '1548907040-4baa42d10919',
	'salted-chocolate-bark': '1606312619070-d48b4c652a52',
	'amber-face-serum': '1608571423902-eed4a5ad8108',
	'botanical-face-oil': '1617897903246-719242758050',
	'charcoal-clay-mask': '1567721913486-6585f069b332',
	'herbal-body-oil': '1612817288484-6f916006741a',
	'hemp-seed-balm': '1611930022073-b7a4ba5fcccd',
	'shower-trio': '1631729371254-42c2892f0e6e',
	'nail-cuticle-oil': '1620916297397-a4a5402a3c6c',
	'makeup-brush-set': '1596462502278-27bfdc403348',
	'amber-soy-candle': '1603006905003-be475563bc59',
	'everyday-mug': '1514228742587-6b1558fcca3d',
	'stoneware-cup-set': '1610701596007-11502861dcfa',
	'oak-serving-board': '1610701596061-2ecf227e85b2',
	'ivory-bud-vase': '1612196808214-b8e1d6145a8c',
	'dot-grid-notebook': '1531346878377-a5be20888e57',
	'insulated-bottle': '1602143407151-7111542de6e8',
	'canvas-market-tote': '1544816155-12df9643f363',
	'round-sunglasses': '1511499767150-a48a237f0083',
	'minimal-white-watch': '1523275335684-37898b6baf30',
	'studio-headphones': '1583394838336-acd977736f90',
	'tan-crossbody-bag': '1600857062241-98e5dba7f214',
	'filigree-bracelet': '1611591437281-460bfbe1220a',
};

const photo = ( id ) =>
	`https://images.unsplash.com/photo-${ id }?w=800&h=800&fit=crop&q=78&fm=jpg`;

const plugin = local
	? {
			step: 'activatePlugin',
			pluginPath: `${ SLUG }/${ SLUG }.php`,
	  }
	: {
			step: 'installPlugin',
			pluginData: { resource: 'wordpress.org/plugins', slug: SLUG },
			options: { activate: true },
	  };

const blueprint = {
	$schema: 'https://playground.wordpress.net/blueprint-schema.json',
	meta: {
		title: 'ProductBoxes demo store',
		description:
			'A WooCommerce store with ten live box campaigns, one per storefront template, real product photos and 60 days of sample analytics. Use the orange toolbar button to switch between the storefront and the admin.',
		author: 'Razibul-Hasan',
		categories: [ 'WooCommerce' ],
	},
	landingPage: '/',
	preferredVersions: { php: '8.3', wp: 'latest' },
	features: { networking: true },
	login: true,
	steps: [
		{
			step: 'installPlugin',
			pluginData: {
				resource: 'wordpress.org/plugins',
				slug: 'woocommerce',
			},
			options: { activate: true },
		},
		plugin,
		{ step: 'mkdir', path: '/tmp/mmbb-demo' },
		...Object.entries( PHOTOS ).map( ( [ slug, id ] ) => ( {
			step: 'writeFile',
			path: `/tmp/mmbb-demo/${ slug }.jpg`,
			data: { resource: 'url', url: photo( id ) },
		} ) ),
		{ step: 'mkdir', path: '/wordpress/wp-content/mu-plugins' },
		{
			step: 'writeFile',
			path: '/wordpress/wp-content/mu-plugins/mmbb-demo-bar.php',
			data: await source( 'demo-bar.php' ),
		},
		{
			step: 'writeFile',
			path: '/wordpress/wp-content/mu-plugins/mmbb-demo-site.php',
			data: await source( 'demo-site.php' ),
		},
		{
			step: 'writeFile',
			path: '/tmp/mmbb-demo-content.php',
			data: await source( 'demo-content.php' ),
		},
		{
			step: 'runPHP',
			code: "<?php require '/wordpress/wp-load.php'; require '/tmp/mmbb-demo-content.php'; mmbb_demo_seed();",
		},
	],
};

const target = local
	? join( tmpdir(), 'mmbb-blueprint-local.json' )
	: fileURLToPath(
			new URL( '.wordpress-org/blueprints/blueprint.json', root )
	  );
await mkdir( join( target, '..' ), { recursive: true } );
await writeFile( target, JSON.stringify( blueprint, null, '\t' ) + '\n' );
process.stdout.write( `${ target }\n` );
