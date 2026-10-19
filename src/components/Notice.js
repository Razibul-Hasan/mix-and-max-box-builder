import { __ } from '@wordpress/i18n';
import Icon from './Icon';
import { cx } from './utils';

const NOTICE_ICON = {
	info: 'info',
	success: 'check',
	warning: 'alert',
	critical: 'alert',
};
export default function Notice( {
	tone = 'info',
	title,
	children,
	action,
	onDismiss,
} ) {
	return (
		<div
			className={ cx( 'mmbb-notice', 'mmbb-notice--' + tone ) }
			role={ tone === 'critical' ? 'alert' : 'status' }
		>
			<span className="mmbb-notice__icon">
				<Icon
					name={ NOTICE_ICON[ tone ] }
					size={ 18 }
					strokeWidth={ 2 }
				/>
			</span>
			<div className="mmbb-notice__body">
				{ title ? (
					<p className="mmbb-notice__title">{ title }</p>
				) : null }
				{ children ? (
					<div className="mmbb-notice__text">{ children }</div>
				) : null }
				{ action ? (
					<div className="mmbb-notice__action">{ action }</div>
				) : null }
			</div>
			{ onDismiss ? (
				<button
					type="button"
					className="mmbb-notice__close"
					aria-label={ __( 'Dismiss', 'mix-and-max-box-builder' ) }
					onClick={ onDismiss }
				>
					<Icon name="close" size={ 16 } />
				</button>
			) : null }
		</div>
	);
}
