import { __, _n, sprintf } from '@wordpress/i18n';
import { Notice } from '../components';

/**
 * How close the box is to its free gift. The server decides whether the gift is added.
 *
 * @param {Object} props
 * @param {Object} props.gift     { name, minItems } from the payload.
 * @param {number} props.count    Items in the box.
 * @param {number} props.capacity Slots in the box.
 */
export default function FreeGift( { gift, count, capacity } ) {
	if ( gift.minItems > capacity ) {
		return null;
	}
	if ( count >= gift.minItems ) {
		return (
			<Notice tone="success">
				{ sprintf(
					/* translators: %s: Gift product name. */
					__(
						'Free gift unlocked: %s.',
						'productboxes-mix-and-match-box-builder'
					),
					gift.name
				) }
			</Notice>
		);
	}
	const left = gift.minItems - count;
	return (
		<Notice tone="info">
			{ sprintf(
				/* translators: 1: Number of items still needed, 2: Gift product name. */
				_n(
					'Add %1$d more item to get %2$s free.',
					'Add %1$d more items to get %2$s free.',
					left,
					'productboxes-mix-and-match-box-builder'
				),
				left,
				gift.name
			) }
		</Notice>
	);
}
