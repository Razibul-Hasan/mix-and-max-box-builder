import { cx } from './utils';

export default function Card( {
	title,
	subtitle,
	actions,
	footer,
	children,
	padding = 'md',
	className,
	as = 'section',
} ) {
	const T = as;
	return (
		<T
			className={ cx(
				'mmbb-card',
				'mmbb-card--pad-' + padding,
				className
			) }
		>
			{ title || actions ? (
				<header className="mmbb-card__head">
					<div className="mmbb-card__heading">
						{ title ? (
							<h3 className="mmbb-card__title">{ title }</h3>
						) : null }
						{ subtitle ? (
							<p className="mmbb-card__sub">{ subtitle }</p>
						) : null }
					</div>
					{ actions ? (
						<div className="mmbb-card__actions">{ actions }</div>
					) : null }
				</header>
			) : null }
			<div className="mmbb-card__body">{ children }</div>
			{ footer ? (
				<footer className="mmbb-card__foot">{ footer }</footer>
			) : null }
		</T>
	);
}
