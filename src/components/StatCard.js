import { __ } from '@wordpress/i18n';
import Icon from './Icon';
import Sparkline from './Sparkline';
import { cx } from './utils';
export default function StatCard( {
	label,
	value,
	delta,
	deltaLabel = __(
		'vs previous period',
		'productboxes-mix-and-match-box-builder'
	),
	upIsGood = true,
	trend,
	icon,
} ) {
	const dir =
		delta === null || delta === undefined
			? 0
			: delta > 0
			? 1
			: delta < 0
			? -1
			: 0;
	const good = dir === 0 ? null : dir > 0 === upIsGood;
	return (
		<div className="mmbb-stat">
			<div className="mmbb-stat__label">
				{ icon ? <Icon name={ icon } size={ 16 } /> : null }
				{ label }
			</div>
			<div className="mmbb-stat__row">
				<div className="mmbb-stat__value">{ value }</div>
				{ trend ? <Sparkline data={ trend } /> : null }
			</div>
			{ delta !== null && delta !== undefined ? (
				<div className="mmbb-stat__delta">
					<span
						className={ cx(
							'mmbb-delta',
							good === true && 'is-good',
							good === false && 'is-bad'
						) }
					>
						<Icon
							name={ dir >= 0 ? 'arrowUp' : 'arrowDown' }
							size={ 14 }
							strokeWidth={ 2.25 }
						/>
						<span className="mmbb-sr">
							{ dir >= 0
								? __(
										'Up',
										'productboxes-mix-and-match-box-builder'
								  )
								: __(
										'Down',
										'productboxes-mix-and-match-box-builder'
								  ) }
						</span>
						{ Math.abs( delta ) }%
					</span>
					<span>{ deltaLabel }</span>
				</div>
			) : null }
		</div>
	);
}
