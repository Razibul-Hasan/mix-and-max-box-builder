import Icon from './Icon';
import Sticker from './Sticker';
import { cx } from './utils';

export default function ChoiceCard( {
	selected,
	onSelect,
	title,
	description,
	meta,
	tag,
	icon,
	name,
	value,
	disabled,
	children,
	className,
} ) {
	return (
		<label
			className={ cx(
				'mmbb-choice',
				selected && 'is-selected',
				disabled && 'is-disabled',
				className
			) }
		>
			<input
				type="radio"
				className="mmbb-sr"
				name={ name }
				value={ value }
				checked={ !! selected }
				disabled={ disabled }
				onChange={ () => onSelect && onSelect( value ) }
			/>
			{ tag ? (
				<Sticker size="sm" tilt className="mmbb-choice__tag">
					{ tag }
				</Sticker>
			) : null }
			{ icon ? (
				<span className="mmbb-choice__icon">
					<Icon name={ icon } size={ 22 } />
				</span>
			) : null }
			<span className="mmbb-choice__body">
				<span className="mmbb-choice__title">{ title }</span>
				{ description ? (
					<span className="mmbb-choice__desc">{ description }</span>
				) : null }
				{ children }
			</span>
			{ meta ? (
				<span className="mmbb-choice__meta">{ meta }</span>
			) : null }
			<span className="mmbb-choice__radio" aria-hidden="true" />
		</label>
	);
}
