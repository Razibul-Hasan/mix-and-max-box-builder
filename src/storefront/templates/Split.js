import { __, sprintf } from '@wordpress/i18n';

export default function Split( { context, children } ) {
	return (
		<div className="mmbb-template mmbb-template--split">
			<header className="mmbb-split__intro">
				<p>
					{ __(
						'Build your box',
						'productboxes-mix-and-match-box-builder'
					) }
				</p>
				<h2>{ context.headline }</h2>
				{ context.intro ? <span>{ context.intro }</span> : null }
				{ context.tiers.length ? (
					<ol
						className="mmbb-split__tiers"
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
								<b>{ tier.label }</b>
								<small>
									{ sprintf(
										/* translators: %d: Number of items. */
										__(
											'%d items',
											'productboxes-mix-and-match-box-builder'
										),
										tier.qty
									) }
								</small>
							</li>
						) ) }
					</ol>
				) : null }
			</header>
			{ children }
		</div>
	);
}
