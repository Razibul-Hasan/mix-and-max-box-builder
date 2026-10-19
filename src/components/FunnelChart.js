import { __, sprintf } from '@wordpress/i18n';
import Icon from './Icon';

export default function FunnelChart( {
	steps = [],
	formatValue = ( v ) => Number( v ).toLocaleString( 'en-US' ),
} ) {
	const first = steps[ 0 ] ? steps[ 0 ].value || 1 : 1;
	return (
		<ol className="mmbb-funnel">
			{ steps.map( ( s, i ) => {
				const pct = ( s.value / first ) * 100;
				const prev = i > 0 ? steps[ i - 1 ].value : null;
				return (
					<li key={ s.label } className="mmbb-funnel__item">
						{ prev !== null && prev !== undefined ? (
							<div className="mmbb-funnel__drop">
								<Icon
									name="arrowDown"
									size={ 12 }
									strokeWidth={ 2.25 }
								/>
								{ sprintf(
									/* translators: %s: Percentage continuing to this step. */ __(
										'%s%% continued',
										'mix-and-max-box-builder'
									),
									Math.round(
										prev > 0 ? ( s.value / prev ) * 100 : 0
									)
								) }
							</div>
						) : null }
						<div
							className="mmbb-funnel__step"
							tabIndex={ 0 }
							title={ s.label + ': ' + formatValue( s.value ) }
						>
							<span className="mmbb-funnel__label">
								{ s.label }
								{ s.sub ? (
									<span className="mmbb-funnel__sub">
										{ s.sub }
									</span>
								) : null }
							</span>
							<span className="mmbb-funnel__track">
								<span
									className="mmbb-funnel__fill"
									style={ {
										width: Math.max( 0.5, pct ) + '%',
									} }
								/>
							</span>
							<span className="mmbb-funnel__value">
								{ formatValue( s.value ) }
								<span className="mmbb-funnel__pct">
									{ sprintf(
										/* translators: %s: Percentage of the starting count. */ __(
											'%s%% of start',
											'mix-and-max-box-builder'
										),
										pct.toFixed( pct < 10 ? 1 : 0 )
									) }
								</span>
							</span>
						</div>
					</li>
				);
			} ) }
		</ol>
	);
}
