import { useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import { Badge, Button, Icon, Modal, Notice, ProductArt } from '../components';
import { createCampaign } from './api';
import { useAdmin } from './context';
import { errorMessage } from './hooks';

/**
 * Choosing a template creates a draft and opens the editor at its first step.
 *
 * @param {Object}   props
 * @param {Function} props.onClose Close the dialog.
 */
export default function TemplatePicker( { onClose } ) {
	const { templates } = useAdmin();
	const initial =
		templates.find( ( t ) => t.id === 'holiday' ) || templates[ 0 ];
	const [ picked, setPicked ] = useState( initial ? initial.id : '' );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( '' );
	const selected = useRef( null );
	const current = templates.find( ( t ) => t.id === picked );

	const create = () => {
		setBusy( true );
		setError( '' );
		createCampaign( picked )
			.then( ( campaign ) => {
				window.location.assign(
					addQueryArgs( campaign.edit_url, { step: 'basics' } )
				);
			} )
			.catch( ( e ) => {
				setBusy( false );
				setError(
					errorMessage(
						e,
						__(
							'The campaign could not be created.',
							'mix-and-max-box-builder'
						)
					)
				);
			} );
	};

	return (
		<Modal
			title={ __(
				'Start a new box campaign',
				'mix-and-max-box-builder'
			) }
			description={ __(
				'Templates fill in the rules, tiers and copy. You pick the products next.',
				'mix-and-max-box-builder'
			) }
			size="lg"
			onClose={ onClose }
			initialFocusRef={ selected }
			footer={
				<>
					<span className="mmbb-picker__picked">
						{ __( 'Selected:', 'mix-and-max-box-builder' ) }{ ' ' }
						<b>{ current ? current.title : '' }</b>
					</span>
					<Button onClick={ onClose }>
						{ __( 'Cancel', 'mix-and-max-box-builder' ) }
					</Button>
					<Button
						variant="primary"
						iconRight="arrowRight"
						loading={ busy }
						disabled={ ! current }
						onClick={ create }
					>
						{ __( 'Use template', 'mix-and-max-box-builder' ) }
					</Button>
				</>
			}
		>
			{ error ? (
				<Notice
					tone="critical"
					title={ __(
						'Something went wrong',
						'mix-and-max-box-builder'
					) }
				>
					{ error }
				</Notice>
			) : null }
			<div className="mmbb-picker">
				{ templates.map( ( template ) => {
					const on = template.id === picked;
					return (
						<button
							key={ template.id }
							type="button"
							ref={ on ? selected : undefined }
							className={
								'mmbb-picker__tile' + ( on ? ' is-on' : '' )
							}
							aria-pressed={ on }
							onClick={ () => setPicked( template.id ) }
						>
							<span className="mmbb-picker__art">
								{ template.art.length === 0 ? (
									<span className="mmbb-picker__blank">
										<Icon name="plus" size={ 28 } />
									</span>
								) : (
									template.art
										.slice( 0, 4 )
										.map( ( kind, i ) => (
											<span
												className="mmbb-picker__swatch"
												key={ i }
											>
												<ProductArt kind={ kind } />
											</span>
										) )
								) }
							</span>
							<span className="mmbb-picker__title">
								<b>{ template.title }</b>
								<Badge tone="brand">
									{ template.typeLabel }
								</Badge>
							</span>
							<span className="mmbb-picker__desc">
								{ template.description }
							</span>
						</button>
					);
				} ) }
			</div>
		</Modal>
	);
}
