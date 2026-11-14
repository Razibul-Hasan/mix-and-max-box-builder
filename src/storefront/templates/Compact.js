import { __, sprintf } from '@wordpress/i18n';

export default function Compact( { context, children } ) {
	const next = context.tiers.find( ( tier ) => context.count < tier.qty );
	const reached = context.tiers.filter(
		( tier ) => context.count >= tier.qty
	);
	const best = reached[ reached.length - 1 ];
	return (
		<div className="mmbb-template mmbb-template--compact">
			<header className="mmbb-compact__head">
				<div>
					<h2>{ context.headline }</h2>
					{ context.intro ? <p>{ context.intro }</p> : null }
				</div>
				<span className="mmbb-compact__deal">
					<b>
						{ best?.label ||
							next?.label ||
							__(
								'Save',
								'productboxes-mix-and-match-box-builder'
							) }
					</b>
					<small>
						{ best
							? __(
									'now',
									'productboxes-mix-and-match-box-builder'
							  )
							: __(
									'next deal',
									'productboxes-mix-and-match-box-builder'
							  ) }
					</small>
				</span>
			</header>
			{ context.tiers.length ? (
				<ol
					className="mmbb-compact__tiers"
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
							<span>
								{ sprintf(
									/* translators: %d: Number of items. */
									__(
										'%d+ items',
										'productboxes-mix-and-match-box-builder'
									),
									tier.qty
								) }
							</span>
						</li>
					) ) }
				</ol>
			) : null }
			{ children }
		</div>
	);
}
