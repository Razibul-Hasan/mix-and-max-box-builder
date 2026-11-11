import { Button, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * Confirm moving boxes to the trash. Their orders and analytics stay; the box
 * stops showing on the store.
 *
 * @param {Object}   props
 * @param {Object[]} props.boxes     Boxes about to be trashed.
 * @param {boolean}  props.busy      The request is running.
 * @param {Function} props.onCancel  Close without doing anything.
 * @param {Function} props.onConfirm Move them to the trash.
 */
export default function TrashDialog( { boxes, busy, onCancel, onConfirm } ) {
	const title =
		boxes.length === 1
			? sprintf(
					/* translators: %s: Box name. */
					__(
						'Move “%s” to the trash?',
						'productboxes-mix-and-match-box-builder'
					),
					boxes[ 0 ].title
			  )
			: sprintf(
					/* translators: %d: Number of boxes. */
					_n(
						'Move %d box to the trash?',
						'Move %d boxes to the trash?',
						boxes.length,
						'productboxes-mix-and-match-box-builder'
					),
					boxes.length
			  );
	return (
		<Modal
			title={ title }
			onRequestClose={ busy ? () => {} : onCancel }
			className="mmbb-app-modal"
			size="small"
		>
			<div className="mmbb-app-modal__body">
				<p>
					{ __(
						'Shoppers can no longer open it. Past orders keep their box details, and its numbers stay in Analytics.',
						'productboxes-mix-and-match-box-builder'
					) }
				</p>
			</div>
			<div className="mmbb-app-modal__foot">
				<Button
					__next40pxDefaultSize
					variant="tertiary"
					onClick={ onCancel }
					disabled={ busy }
				>
					{ __( 'Cancel', 'productboxes-mix-and-match-box-builder' ) }
				</Button>
				<Button
					__next40pxDefaultSize
					variant="primary"
					isDestructive
					isBusy={ busy }
					aria-disabled={ busy }
					onClick={ busy ? undefined : onConfirm }
				>
					{ __(
						'Move to trash',
						'productboxes-mix-and-match-box-builder'
					) }
				</Button>
			</div>
		</Modal>
	);
}
