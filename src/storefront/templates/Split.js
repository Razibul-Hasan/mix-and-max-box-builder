import { __ } from '@wordpress/i18n';

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
			</header>
			{ children }
		</div>
	);
}
