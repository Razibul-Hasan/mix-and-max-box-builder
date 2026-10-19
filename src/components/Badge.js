import Icon from './Icon';
import { cx } from './utils';

export default function Badge( {
	tone = 'neutral',
	icon,
	dot: withDot,
	children,
	className,
} ) {
	return (
		<span
			className={ cx( 'mmbb-badge', 'mmbb-badge--' + tone, className ) }
		>
			{ withDot ? (
				<span className="mmbb-badge__dot" aria-hidden="true" />
			) : null }
			{ icon ? (
				<Icon name={ icon } size={ 14 } strokeWidth={ 2 } />
			) : null }
			{ children }
		</span>
	);
}
