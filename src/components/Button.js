import Icon from './Icon';
import { cx } from './utils';

export default function Button( {
	variant = 'secondary',
	size = 'md',
	icon,
	iconRight,
	loading,
	fullWidth,
	className,
	children,
	type = 'button',
	disabled,
	href,
	...rest
} ) {
	const iconOnly = icon && ! children;
	const is = size === 'lg' ? 20 : size === 'sm' ? 16 : 18;
	const cls = cx(
		'mmbb-btn',
		'mmbb-btn--' + variant,
		'mmbb-btn--' + size,
		fullWidth && 'mmbb-btn--full',
		iconOnly && 'mmbb-btn--icon',
		loading && 'is-loading',
		className
	);
	const inner = (
		<>
			{ loading ? (
				<span className="mmbb-spinner" aria-hidden="true" />
			) : icon ? (
				<Icon name={ icon } size={ is } />
			) : null }
			{ children ? (
				<span className="mmbb-btn__label">{ children }</span>
			) : null }
			{ iconRight ? (
				<Icon
					name={ iconRight }
					size={ is }
					className="mmbb-btn__trail"
				/>
			) : null }
		</>
	);
	if ( href ) {
		const off = disabled || loading;
		return (
			<a
				{ ...rest }
				href={ off ? undefined : href }
				aria-disabled={ off || undefined }
				aria-busy={ loading || undefined }
				tabIndex={ off ? -1 : rest.tabIndex }
				onClick={
					off ? ( event ) => event.preventDefault() : rest.onClick
				}
				className={ cls }
			>
				{ inner }
			</a>
		);
	}
	return (
		<button
			type={ type }
			{ ...rest }
			disabled={ disabled || loading }
			aria-busy={ loading || undefined }
			className={ cls }
		>
			{ inner }
		</button>
	);
}
