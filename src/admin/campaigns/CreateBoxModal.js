import { Button, Modal, Notice, TextControl } from '@wordpress/components';
import { useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import { createCampaign } from '../api';
import { boxTypeTitle } from '../format';
import { errorMessage } from '../hooks';
import { navigate } from '../navigate';

/**
 * The three ways a discount can work. Ids are the stored `config.type` values.
 *
 * @return {Object[]} { id, title, description, example }.
 */
function boxTypes() {
	return [
		{
			id: 'tiered',
			title: boxTypeTitle( 'tiered' ),
			description: __(
				'Shoppers add up to a limit. More items unlock more off.',
				'productboxes-mix-and-match-box-builder'
			),
			example: __(
				'4 = 10%, 6 = 15%',
				'productboxes-mix-and-match-box-builder'
			),
		},
		{
			id: 'fixed',
			title: boxTypeTitle( 'fixed' ),
			description: __(
				'Shoppers choose a size, then fill every slot.',
				'productboxes-mix-and-match-box-builder'
			),
			example: __( '6-pack', 'productboxes-mix-and-match-box-builder' ),
		},
		{
			id: 'bundle',
			title: boxTypeTitle( 'bundle' ),
			description: __(
				'A fixed number of items for one price.',
				'productboxes-mix-and-match-box-builder'
			),
			example: __(
				'3 for one price',
				'productboxes-mix-and-match-box-builder'
			),
		},
	];
}

/**
 * "Create a box": a name and how the discount works. Creating saves a draft
 * through POST /campaigns and opens the editor at the products step.
 *
 * @param {Object}   props
 * @param {Function} props.onClose Close without creating anything.
 */
export default function CreateBoxModal( { onClose } ) {
	const [ name, setName ] = useState( '' );
	const [ type, setType ] = useState( 'tiered' );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( '' );
	const formId = 'mmbb-box-type' + useId().replace( /:/g, '' );

	const create = ( event ) => {
		event.preventDefault();
		if ( busy ) {
			return;
		}
		setBusy( true );
		setError( '' );
		createCampaign( 'blank', name.trim(), type )
			.then( ( campaign ) => {
				navigate(
					addQueryArgs( campaign.edit_url, { step: 'products' } )
				);
			} )
			.catch( ( e ) => {
				setBusy( false );
				setError(
					errorMessage(
						e,
						__(
							'The box could not be created. Try again.',
							'productboxes-mix-and-match-box-builder'
						)
					)
				);
			} );
	};

	return (
		<Modal
			title={ __(
				'Create a box',
				'productboxes-mix-and-match-box-builder'
			) }
			onRequestClose={ busy ? () => {} : onClose }
			className="mmbb-app-modal"
			size="medium"
			focusOnMount="firstContentElement"
		>
			<form className="mmbb-app-modal__form" onSubmit={ create }>
				<div className="mmbb-app-modal__body">
					{ error ? (
						<Notice status="error" isDismissible={ false }>
							{ error }
						</Notice>
					) : null }
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Box name',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Only you see this. You can write the shopper headline later.',
							'productboxes-mix-and-match-box-builder'
						) }
						placeholder={ __(
							'Holiday treat box',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ name }
						maxLength={ 200 }
						onChange={ setName }
					/>
					<fieldset className="mmbb-app-choices">
						<legend className="mmbb-app-label">
							{ __(
								'How does the discount work?',
								'productboxes-mix-and-match-box-builder'
							) }
						</legend>
						{ boxTypes().map( ( option ) => (
							<label
								key={ option.id }
								htmlFor={ `${ formId }-${ option.id }` }
								className={
									'mmbb-app-choice' +
									( type === option.id ? ' is-selected' : '' )
								}
							>
								<input
									id={ `${ formId }-${ option.id }` }
									type="radio"
									name={ formId }
									value={ option.id }
									checked={ type === option.id }
									onChange={ () => setType( option.id ) }
								/>
								<span className="mmbb-app-choice__text">
									<b>{ option.title }</b>
									<span className="mmbb-app-choice__desc">
										{ option.description }
									</span>
								</span>
								<span className="mmbb-app-choice__example">
									{ option.example }
								</span>
							</label>
						) ) }
					</fieldset>
					<Notice
						status="info"
						isDismissible={ false }
						className="mmbb-app-modal__notice"
					>
						{ __(
							'Next you pick products, set the discount and choose a look. Nothing goes live until you publish.',
							'productboxes-mix-and-match-box-builder'
						) }
					</Notice>
				</div>
				<div className="mmbb-app-modal__foot">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={ onClose }
						disabled={ busy }
					>
						{ __(
							'Cancel',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						type="submit"
						isBusy={ busy }
						aria-disabled={ busy }
					>
						{ __(
							'Create and pick products',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				</div>
			</form>
		</Modal>
	);
}
