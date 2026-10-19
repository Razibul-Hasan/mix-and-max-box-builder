import { useId } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import Icon from './Icon';
import Sticker from './Sticker';
import { cx, useControlled } from './utils';
import { useMoney } from './MoneyContext';

export default function BoxSizePicker( {
	sizes = [],
	value,
	defaultValue,
	onChange,
	layout = 'cards',
	name,
} ) {
	const formatMoney = useMoney();
	const auto = useId();
	const [ v, set ] = useControlled(
		value,
		defaultValue !== undefined
			? defaultValue
			: sizes[ 0 ] && sizes[ 0 ].qty,
		onChange
	);
	return (
		<div
			className={ cx( 'mmbb-sizes', 'mmbb-sizes--' + layout ) }
			role="radiogroup"
			aria-label={ __( 'Box size', 'mix-and-max-box-builder' ) }
		>
			{ sizes.map( ( s ) => (
				<label
					key={ s.qty }
					className={ cx(
						'mmbb-size',
						v === s.qty && 'is-selected'
					) }
				>
					<input
						type="radio"
						className="mmbb-sr"
						name={ name || auto }
						value={ s.qty }
						checked={ v === s.qty }
						onChange={ () => set( s.qty ) }
					/>
					{ s.tag ? (
						<Sticker size="sm" tilt className="mmbb-size__tag">
							{ s.tag }
						</Sticker>
					) : null }
					<span className="mmbb-size__qty">{ s.qty }</span>
					<span className="mmbb-size__unit">
						{ s.unit ||
							_n(
								'item',
								'items',
								s.qty,
								'mix-and-max-box-builder'
							) }
					</span>
					{ s.price !== null && s.price !== undefined ? (
						<span className="mmbb-size__price">
							{ layout === 'cards' && s.from !== false
								? sprintf(
										/* translators: %s: Formatted starting price. */ __(
											'from %s',
											'mix-and-max-box-builder'
										),
										formatMoney( s.price )
								  )
								: formatMoney( s.price ) }
						</span>
					) : null }
					{ s.save ? (
						<span className="mmbb-size__save">
							{ sprintf(
								/* translators: %s: Savings label. */ __(
									'Save %s',
									'mix-and-max-box-builder'
								),
								s.save
							) }
						</span>
					) : null }
					<span className="mmbb-size__check" aria-hidden="true">
						<Icon name="check" size={ 14 } strokeWidth={ 2.75 } />
					</span>
				</label>
			) ) }
		</div>
	);
}
