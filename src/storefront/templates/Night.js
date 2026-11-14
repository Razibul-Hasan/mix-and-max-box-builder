import { __, sprintf } from '@wordpress/i18n';

export default function Night( { context, children } ) {
	const pct = context.capacity
		? Math.min( 100, ( context.count / context.capacity ) * 100 )
		: 0;
	const reached = context.tiers.filter(
		( tier ) => context.count >= tier.qty
	);
	const best = reached[ reached.length - 1 ];
	return (
		<div className="mmbb-template mmbb-template--night">
			<header className="mmbb-night__hero">
				<div>
					<p className="mmbb-night__deal">
						<span aria-hidden="true" />
						{ __(
							'Build more · save more',
							'productboxes-mix-and-match-box-builder'
						) }
					</p>
					<h2>{ context.headline }</h2>
					{ context.intro ? (
						<p className="mmbb-night__intro">{ context.intro }</p>
					) : null }
				</div>
				<div
					className="mmbb-night__ring"
					style={ { '--mmbb-ring-progress': `${ pct * 3.6 }deg` } }
					role="img"
					aria-label={ sprintf(
						/* translators: 1: Filled slots, 2: Box capacity. */
						__(
							'%1$d of %2$d items selected',
							'productboxes-mix-and-match-box-builder'
						),
						context.count,
						context.capacity
					) }
				>
					<strong>{ context.count }</strong>
					<span>/{ context.capacity }</span>
					<small>
						{ best?.label ||
							__(
								'Start filling',
								'productboxes-mix-and-match-box-builder'
							) }
					</small>
				</div>
			</header>
			{ children }
		</div>
	);
}
