import apiFetch from '@wordpress/api-fetch';
import { Button, BaseControl } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

/**
 * Open the WordPress media library and resolve with the chosen image id,
 * or null when the dialog is closed without a choice.
 *
 * @param {string} title  Dialog title.
 * @param {string} button Select button label.
 * @return {Promise<number|null>} Attachment id.
 */
function pickImage( title, button ) {
	return new Promise( ( resolve ) => {
		const frame = window.wp?.media?.( {
			title,
			button: { text: button },
			library: { type: 'image' },
			multiple: false,
		} );
		if ( ! frame ) {
			resolve( null );
			return;
		}
		frame.on( 'select', () => {
			const attachment = frame
				.state()
				.get( 'selection' )
				.first()
				?.toJSON();
			resolve( attachment ? attachment.id : null );
		} );
		// The media toolbar closes the frame *before* firing "select", so
		// resolve on close only after "select" has had a chance to run.
		frame.on( 'close', () => setTimeout( () => resolve( null ), 0 ) );
		frame.open();
	} );
}

/**
 * The photo shown for the box in the cart, at checkout and in order emails.
 *
 * @param {Object}   props
 * @param {number}   props.value    Attachment id, or 0 for none.
 * @param {Function} props.onChange Called with the new attachment id.
 */
export default function BoxImageField( { value, onChange } ) {
	const [ url, setUrl ] = useState( '' );

	useEffect( () => {
		let live = true;
		if ( ! value ) {
			setUrl( '' );
			return undefined;
		}
		apiFetch( {
			path: addQueryArgs( '/wp/v2/media/' + value, {
				_fields: 'id,source_url,media_details.sizes',
			} ),
		} )
			.then( ( media ) => {
				if ( live ) {
					setUrl(
						media?.media_details?.sizes?.medium?.source_url ||
							media?.source_url ||
							''
					);
				}
			} )
			.catch( () => live && setUrl( '' ) );
		return () => {
			live = false;
		};
	}, [ value ] );

	const choose = async () => {
		const id = await pickImage(
			__( 'Choose box image', 'productboxes-mix-and-match-box-builder' ),
			__( 'Use this image', 'productboxes-mix-and-match-box-builder' )
		);
		if ( id ) {
			onChange( id );
		}
	};

	return (
		<BaseControl
			id="mmbb-box-image"
			label={ __(
				'Box image',
				'productboxes-mix-and-match-box-builder'
			) }
			__nextHasNoMarginBottom
		>
			<p className="mmbb-box-image__help">
				{ value
					? __(
							'This image represents the box in the cart, at checkout and in order emails.',
							'productboxes-mix-and-match-box-builder'
					  )
					: __(
							'No image chosen — the cart, checkout and order emails will show the first product’s photo.',
							'productboxes-mix-and-match-box-builder'
					  ) }
			</p>
			<div className="mmbb-box-image">
				{ value && url ? (
					<button
						type="button"
						className="mmbb-box-image__preview"
						onClick={ choose }
						aria-label={ __(
							'Change box image',
							'productboxes-mix-and-match-box-builder'
						) }
					>
						<img
							className="mmbb-box-image__image"
							src={ url }
							alt=""
						/>
					</button>
				) : (
					<button
						type="button"
						className="mmbb-box-image__empty"
						onClick={ choose }
					>
						{ __(
							'Choose box image',
							'productboxes-mix-and-match-box-builder'
						) }
					</button>
				) }
				{ value ? (
					<div className="mmbb-box-image__actions">
						<Button
							variant="secondary"
							size="compact"
							onClick={ choose }
						>
							{ __(
								'Change',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
						<Button
							variant="tertiary"
							size="compact"
							isDestructive
							onClick={ () => onChange( 0 ) }
						>
							{ __(
								'Remove',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
					</div>
				) : null }
			</div>
		</BaseControl>
	);
}
