import { __, sprintf } from '@wordpress/i18n';

export default function Editorial( { context, children } ) {
	return (
		<div className="mmbb-template mmbb-template--editorial">
			<header className="mmbb-editorial__intro">
				<div className="mmbb-editorial__issue">
					<span>
						{ __(
							'The box edit',
							'productboxes-mix-and-match-box-builder'
						) }
					</span>
					<span>
						{ sprintf(
							/* translators: %d: Maximum items in the box. */
							__(
								'Up to %d',
								'productboxes-mix-and-match-box-builder'
							),
							context.capacity
						) }
					</span>
				</div>
				<h2>{ context.headline }</h2>
				{ context.intro ? <p>{ context.intro }</p> : null }
				<ol
					className="mmbb-editorial__tiers"
					aria-label={ __(
						'Discount tiers',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					{ context.tiers.map( ( tier ) => (
						<li
							key={ tier.qty }
							className={
								context.count >= tier.qty
									? 'is-current'
									: undefined
							}
						>
							<span>
								{ sprintf(
									/* translators: %d: Number of items. */
									__(
										'%d pieces',
										'productboxes-mix-and-match-box-builder'
									),
									tier.qty
								) }
							</span>
							<b>{ tier.label }</b>
						</li>
					) ) }
				</ol>
			</header>
			{ children }
		</div>
	);
}
