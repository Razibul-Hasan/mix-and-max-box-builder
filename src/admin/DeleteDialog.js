import { useRef } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button, Icon, Modal, Notice } from '../components';
import { useAdmin } from './context';
import { canPause, formatCount, isLive } from './format';

function joinNames( names ) {
	return names.map( ( name ) => '“' + name + '”' ).join( ', ' );
}

/**
 * Confirm deleting one or more campaigns. Focus starts on Cancel. "Pause instead"
 * is offered when something in the selection can be paused.
 *
 * @param {Object}   props
 * @param {Object[]} props.campaigns Campaigns about to be deleted.
 * @param {boolean}  props.busy      A request is running.
 * @param {Function} props.onCancel  Close without doing anything.
 * @param {Function} props.onPause   Pause them instead.
 * @param {Function} props.onDelete  Delete them.
 */
export default function DeleteDialog( {
	campaigns,
	busy,
	onCancel,
	onPause,
	onDelete,
} ) {
	const cancel = useRef( null );
	const { locale } = useAdmin();
	const count = campaigns.length;
	const live = campaigns.filter( ( c ) => isLive( c.status ) );
	const pausable = campaigns.some( ( c ) => canPause( c.status ) );
	const names = campaigns.map( ( c ) => c.title );

	const title =
		count === 1
			? sprintf(
					/* translators: %s: Campaign name. */
					__( 'Delete “%s”?', 'mix-and-max-box-builder' ),
					names[ 0 ]
			  )
			: sprintf(
					/* translators: %d: Number of campaigns. */
					_n(
						'Delete %d campaign?',
						'Delete %d campaigns?',
						count,
						'mix-and-max-box-builder'
					),
					count
			  );

	const description =
		count === 1
			? __(
					'It disappears from its page and shortcode. Orders keep their box details.',
					'mix-and-max-box-builder'
			  )
			: sprintf(
					/* translators: %s: Campaign names. */
					__(
						'%s disappear from their pages and shortcodes. Orders keep their box details.',
						'mix-and-max-box-builder'
					),
					joinNames( names )
			  );

	return (
		<Modal
			role="alertdialog"
			title={ title }
			description={ description }
			icon={ <Icon name="trash" size={ 20 } /> }
			showClose={ false }
			initialFocusRef={ cancel }
			onClose={ busy ? undefined : onCancel }
			footer={
				<>
					<span ref={ cancel } className="mmbb-modal__slot">
						<Button onClick={ onCancel } disabled={ busy }>
							{ __( 'Cancel', 'mix-and-max-box-builder' ) }
						</Button>
					</span>
					{ pausable ? (
						<Button onClick={ onPause } disabled={ busy }>
							{ __( 'Pause instead', 'mix-and-max-box-builder' ) }
						</Button>
					) : null }
					<Button
						variant="danger"
						icon="trash"
						loading={ busy }
						onClick={ onDelete }
					>
						{ sprintf(
							/* translators: %d: Number of campaigns. */
							_n(
								'Delete %d campaign',
								'Delete %d campaigns',
								count,
								'mix-and-max-box-builder'
							),
							count
						) }
					</Button>
				</>
			}
		>
			{ live.map( ( campaign ) => (
				<Notice
					key={ campaign.id }
					tone="warning"
					title={ sprintf(
						/* translators: %s: Campaign name. */
						__( '%s is live', 'mix-and-max-box-builder' ),
						campaign.title
					) }
				>
					{ campaign.stats.boxes_sold > 0
						? sprintf(
								/* translators: %s: Number of boxes sold. */
								__(
									'It has sold %s boxes. Pausing hides it and keeps everything, so you can bring it back.',
									'mix-and-max-box-builder'
								),
								formatCount( campaign.stats.boxes_sold, locale )
						  )
						: __(
								'Pausing hides it and keeps everything, so you can bring it back.',
								'mix-and-max-box-builder'
						  ) }
				</Notice>
			) ) }
		</Modal>
	);
}
