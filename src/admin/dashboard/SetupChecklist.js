import { Button } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { closeSmall } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';
import { shownOnPath } from '../format';

/**
 * The four steps Home shows, in order. GET /setup reports more (WooCommerce and
 * "go live"); those stay in the payload but are not drawn here.
 */
export const STEPS = [ 'campaign', 'products', 'placed', 'test_order' ];

const hasProducts = ( box ) => {
	const products = ( box && box.config && box.config.products ) || {};
	return (
		( products.ids || [] ).length > 0 ||
		( products.term_ids || [] ).length > 0
	);
};

const isPlaced = ( box ) => shownOnPath( box && box.placement ) !== '';

/**
 * Done / next state of the four steps.
 *
 * @param {Object} setup Response of GET /setup.
 * @return {{steps: Object[], done: number, total: number, next: ?string}} Progress.
 */
export function progress( setup ) {
	const all = ( setup && setup.steps ) || [];
	const steps = STEPS.map( ( id ) => {
		const found = all.find( ( s ) => s.id === id );
		return { id, done: !! ( found && found.done ) };
	} );
	const next = steps.find( ( s ) => ! s.done );
	return {
		steps,
		done: steps.filter( ( s ) => s.done ).length,
		total: steps.length,
		next: next ? next.id : null,
	};
}

/**
 * "Finish setting up": four steps across one card. The next step is
 * highlighted and its action is the primary button.
 *
 * @param {Object}   props
 * @param {Object}   props.setup      Response of GET /setup.
 * @param {Object[]} props.boxes      Boxes from GET /campaigns, to link the steps to.
 * @param {boolean}  props.busy       "Mark as done" is saving.
 * @param {Function} props.onCreate   Open "Create a box".
 * @param {Function} props.onTestDone Mark the test order as done.
 * @param {Function} props.onDismiss  Hide the checklist for this user.
 */
export default function SetupChecklist( {
	setup,
	boxes = [],
	busy,
	onCreate,
	onTestDone,
	onDismiss,
} ) {
	const state = progress( setup );
	const first = boxes[ 0 ];
	const needsProducts = boxes.find( ( b ) => ! hasProducts( b ) ) || first;
	const needsPage = boxes.find( ( b ) => ! isPlaced( b ) ) || first;
	const placed = boxes.find( isPlaced );

	const variant = ( id ) => ( id === state.next ? 'primary' : 'secondary' );

	const productCount = () => {
		const box = boxes.find( hasProducts );
		const ids = ( box && box.config.products.ids ) || [];
		if ( ids.length === 0 ) {
			return __(
				'Products from a category or tag',
				'productboxes-mix-and-match-box-builder'
			);
		}
		return sprintf(
			/* translators: %d: Number of products in the box. */
			_n(
				'%d product picked',
				'%d products picked',
				ids.length,
				'productboxes-mix-and-match-box-builder'
			),
			ids.length
		);
	};

	const content = {
		campaign: {
			title: __(
				'Create a box',
				'productboxes-mix-and-match-box-builder'
			),
			done: first ? first.title : '',
			todo: __(
				'Name it and choose how the discount works.',
				'productboxes-mix-and-match-box-builder'
			),
			action: () => (
				<Button
					__next40pxDefaultSize
					variant={ variant( 'campaign' ) }
					onClick={ onCreate }
				>
					{ __(
						'Create a box',
						'productboxes-mix-and-match-box-builder'
					) }
				</Button>
			),
		},
		products: {
			title: __(
				'Add products',
				'productboxes-mix-and-match-box-builder'
			),
			done: productCount,
			todo: __(
				'Choose what shoppers can pick.',
				'productboxes-mix-and-match-box-builder'
			),
			action: () =>
				needsProducts ? (
					<Button
						__next40pxDefaultSize
						variant={ variant( 'products' ) }
						href={ addQueryArgs( needsProducts.edit_url, {
							step: 'products',
						} ) }
					>
						{ __(
							'Add products',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				) : null,
		},
		placed: {
			title: __(
				'Put it on a page',
				'productboxes-mix-and-match-box-builder'
			),
			done: placed ? shownOnPath( placed.placement ) : '',
			todo: __(
				'So shoppers can find it.',
				'productboxes-mix-and-match-box-builder'
			),
			action: () =>
				needsPage ? (
					<Button
						__next40pxDefaultSize
						variant={ variant( 'placed' ) }
						href={ addQueryArgs( needsPage.edit_url, {
							step: 'publish',
						} ) }
					>
						{ __(
							'Add to a page',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				) : null,
		},
		test_order: {
			title: __(
				'Place a test order',
				'productboxes-mix-and-match-box-builder'
			),
			done: __( 'Checked', 'productboxes-mix-and-match-box-builder' ),
			todo: __(
				'Check the price and the cart line.',
				'productboxes-mix-and-match-box-builder'
			),
			action: () => (
				<div className="mmbb-app-setup__buttons">
					{ placed ? (
						<Button
							__next40pxDefaultSize
							variant={ variant( 'test_order' ) }
							href={ placed.placement.page_url }
							target="_blank"
							rel="noopener noreferrer"
						>
							{ __(
								'Open the box',
								'productboxes-mix-and-match-box-builder'
							) }
							<span className="screen-reader-text">
								{ __(
									'(opens in a new tab)',
									'productboxes-mix-and-match-box-builder'
								) }
							</span>
						</Button>
					) : null }
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						isBusy={ busy }
						aria-disabled={ busy }
						onClick={ busy ? undefined : onTestDone }
					>
						{ __(
							'Mark as done',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				</div>
			),
		},
	};

	return (
		<section className="mmbb-app-card" aria-labelledby="mmbb-setup-title">
			<div className="mmbb-app-card__head">
				<div>
					<h2 id="mmbb-setup-title">
						{ __(
							'Finish setting up',
							'productboxes-mix-and-match-box-builder'
						) }
					</h2>
					<p className="mmbb-app-muted">
						{ sprintf(
							/* translators: 1: Steps done, 2: Total steps. */
							__(
								'%1$d of %2$d done.',
								'productboxes-mix-and-match-box-builder'
							),
							state.done,
							state.total
						) }
					</p>
				</div>
				<Button
					size="compact"
					icon={ closeSmall }
					label={ __(
						'Hide the setup checklist',
						'productboxes-mix-and-match-box-builder'
					) }
					onClick={ onDismiss }
				/>
			</div>
			<ol className="mmbb-app-setup">
				{ state.steps.map( ( step ) => {
					const item = content[ step.id ];
					const isNext = step.id === state.next;
					const detail =
						typeof item.done === 'function'
							? item.done()
							: item.done;
					return (
						<li
							key={ step.id }
							className={
								'mmbb-app-setup__step' +
								( step.done ? ' is-done' : '' ) +
								( isNext ? ' is-next' : '' )
							}
							aria-current={ isNext ? 'step' : undefined }
						>
							<span
								className="mmbb-app-setup__mark"
								aria-hidden="true"
							>
								{ step.done ? (
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
										focusable="false"
									>
										<path d="m5 12 5 5 9-10" />
									</svg>
								) : null }
							</span>
							<div className="mmbb-app-setup__text">
								<div>
									<b>
										{ item.title }{ ' ' }
										<span className="screen-reader-text">
											{ step.done
												? __(
														'(done)',
														'productboxes-mix-and-match-box-builder'
												  )
												: __(
														'(to do)',
														'productboxes-mix-and-match-box-builder'
												  ) }
										</span>
									</b>
									<p className="mmbb-app-muted">
										{ step.done ? detail : item.todo }
									</p>
								</div>
								{ step.done ? null : item.action() }
							</div>
						</li>
					);
				} ) }
			</ol>
		</section>
	);
}
