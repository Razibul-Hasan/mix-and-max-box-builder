import { __ } from '@wordpress/i18n';
import Icon from './Icon';

export default function Toast( {
	children,
	action,
	onAction,
	onDismiss,
	icon = 'check',
} ) {
	return (
		<div className="mmbb-toast" role="status">
			<span className="mmbb-toast__icon">
				<Icon name={ icon } size={ 14 } strokeWidth={ 2.75 } />
			</span>
			<span className="mmbb-toast__text">{ children }</span>
			{ action ? (
				<button
					type="button"
					className="mmbb-toast__action"
					onClick={ onAction }
				>
					{ action }
				</button>
			) : null }
			{ onDismiss ? (
				<button
					type="button"
					className="mmbb-toast__close"
					aria-label={ __( 'Dismiss', 'mix-and-max-box-builder' ) }
					onClick={ onDismiss }
				>
					<Icon name="close" size={ 16 } />
				</button>
			) : null }
		</div>
	);
}
