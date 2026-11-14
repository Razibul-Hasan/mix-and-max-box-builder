/**
 * Removes build output nobody loads: empty JS files that webpack emits for
 * CSS-only entries (for example build/tokens.js).
 */
import { readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const walk = ( dir ) => {
	for ( const name of readdirSync( dir ) ) {
		const file = join( dir, name );
		if ( statSync( file ).isDirectory() ) {
			walk( file );
		} else if ( /\.js$/.test( name ) && statSync( file ).size === 0 ) {
			rmSync( file );
			console.log( 'removed empty ' + file );
		}
	}
};

walk( 'build' );
