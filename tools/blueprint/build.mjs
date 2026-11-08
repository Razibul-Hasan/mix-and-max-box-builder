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
			'A WooCommerce store with three live box campaigns, illustrated products and 60 days of sample analytics. Use the orange toolbar button to switch between the storefront and the admin.',
		author: 'Razibul-Hasan',
		categories: [ 'WooCommerce' ],
	},
	landingPage: '/',
	preferredVersions: { php: '8.3', wp: 'latest' },
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
		{ step: 'mkdir', path: '/wordpress/wp-content/mu-plugins' },
		{
			step: 'writeFile',
			path: '/wordpress/wp-content/mu-plugins/mmbb-demo-bar.php',
			data: await source( 'demo-bar.php' ),
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
