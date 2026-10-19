import Icon from './Icon';
import { cx } from './utils';

export default function Sticker( {
	tone = 'pop',
	size = 'md',
	tilt,
	icon,
	children,
	className,
} ) {
	return (
		<span
			className={ cx(
				'mmbb-sticker',
				'mmbb-sticker--' + tone,
				'mmbb-sticker--' + size,
				tilt && 'is-tilted',
				className
			) }
		>
			{ icon ? (
				<Icon
					name={ icon }
					size={ size === 'lg' ? 20 : size === 'sm' ? 12 : 15 }
					strokeWidth={ 2.25 }
				/>
			) : null }
			{ children }
		</span>
	);
}

/* ---------------- Forms ---------------- */
