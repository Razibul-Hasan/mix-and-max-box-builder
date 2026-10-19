import { __, _n, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import { Button, Icon } from '../../components';

export function stepLabel( id ) {
	const labels = {
		woocommerce: __( 'Install WooCommerce', 'mix-and-max-box-builder' ),
		campaign: __( 'Create a campaign', 'mix-and-max-box-builder' ),
		products: __( 'Add products to the box', 'mix-and-max-box-builder' ),
		placed: __( 'Place the builder on a page', 'mix-and-max-box-builder' ),
		test_order: __( 'Run a test order', 'mix-and-max-box-builder' ),
		live: __( 'Go live', 'mix-and-max-box-builder' ),
	};
	return labels[ id ] || id;
}

// One sentence about the next thing to do.
export function nextHint( next ) {
	const hints = {
		woocommerce: __(
			'Install and activate WooCommerce to continue.',
			'mix-and-max-box-builder'
		),
		campaign: __(
			'Create your first box campaign to get started.',
			'mix-and-max-box-builder'
		),
		products: __(
			'Add the products shoppers can pick from.',
			'mix-and-max-box-builder'
		),
		placed: __(
			'Put the builder on a page so shoppers can find it.',
			'mix-and-max-box-builder'
		),
		test_order: __(
			'Run one test order to check the cart and checkout.',
			'mix-and-max-box-builder'
		),
		live: __(
			'Go live to start selling boxes.',
			'mix-and-max-box-builder'
		),
	};
	return hints[ next ] || '';
}

export function remainingTitle( remaining ) {
	return sprintf(
		/* translators: %d: Number of setup steps left. */
		_n(
			'%d step to your first box sale',
			'%d steps to your first box sale',
			remaining,
			'mix-and-max-box-builder'
		),
		remaining
	);
}

export function progress( setup ) {
	const done = setup.steps.filter( ( s ) => s.done ).length;
	return {
		done,
		total: setup.steps.length,
		remaining: setup.steps.length - done,
	};
}

/**
 * The six setup steps. The next one is highlighted and carries its action inline.
 *
 * @param {Object}   props
 * @param {Object}   props.setup      Response of GET /setup.
 * @param {Object}   props.campaign   The campaign the next step is about, if any.
 * @param {Function} props.onCreate   Open the template picker.
 * @param {Function} props.onCopy     Copy a campaign's shortcode.
 * @param {Function} props.onTestDone Mark the test order as done.
 * @param {boolean}  props.busy       A request is running.
 * @param {string}   props.layout     `wide` for two columns, `stack` for one.
 */
export default function SetupChecklist( {
	setup,
	campaign,
	onCreate,
	onCopy,
	onTestDone,
	busy,
	layout = 'stack',
} ) {
	const editUrl = ( step ) =>
		campaign ? addQueryArgs( campaign.edit_url, { step } ) : '';

	const action = ( id ) => {
		if ( id === 'campaign' ) {
			return (
				<Button size="sm" variant="primary" onClick={ onCreate }>
					{ __( 'Start', 'mix-and-max-box-builder' ) }
				</Button>
			);
		}
		if ( ! campaign ) {
			return null;
		}
		if ( id === 'products' ) {
			return (
				<Button
					size="sm"
					variant="primary"
					href={ editUrl( 'products' ) }
				>
					{ __( 'Add products', 'mix-and-max-box-builder' ) }
				</Button>
			);
		}
		if ( id === 'placed' ) {
			return (
				<Button
					size="sm"
					variant="primary"
					icon="copy"
					onClick={ () => onCopy( campaign ) }
				>
					{ __( 'Copy shortcode', 'mix-and-max-box-builder' ) }
				</Button>
			);
		}
		if ( id === 'test_order' ) {
			return (
				<Button
					size="sm"
					variant="primary"
					loading={ busy }
					onClick={ onTestDone }
				>
					{ __( 'Mark as done', 'mix-and-max-box-builder' ) }
				</Button>
			);
		}
		if ( id === 'live' ) {
			return (
				<Button
					size="sm"
					variant="primary"
					href={ editUrl( 'publish' ) }
				>
					{ __( 'Go live', 'mix-and-max-box-builder' ) }
				</Button>
			);
		}
		return null;
	};

	return (
		<ol className={ 'mmbb-checklist mmbb-checklist--' + layout }>
			{ setup.steps.map( ( step, index ) => {
				const isNext = step.id === setup.next;
				return (
					<li
						key={ step.id }
						className={
							'mmbb-checklist__item' +
							( step.done ? ' is-done' : '' ) +
							( isNext ? ' is-next' : '' )
						}
						aria-current={ isNext ? 'step' : undefined }
					>
						<span
							className="mmbb-checklist__mark"
							aria-hidden="true"
						>
							{ step.done ? (
								<Icon
									name="check"
									size={ 14 }
									strokeWidth={ 2.75 }
								/>
							) : (
								index + 1
							) }
						</span>
						<span className="mmbb-checklist__label">
							{ stepLabel( step.id ) }
							{ step.done ? (
								<span className="mmbb-sr">
									{ ' ' }
									{ __(
										'(done)',
										'mix-and-max-box-builder'
									) }
								</span>
							) : null }
						</span>
						{ isNext ? action( step.id ) : null }
					</li>
				);
			} ) }
		</ol>
	);
}
