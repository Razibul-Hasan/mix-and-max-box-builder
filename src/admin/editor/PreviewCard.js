import { __ } from '@wordpress/i18n';
import { Card } from '../../components';
import Preview from './Preview';

/**
 * The shopper preview card shown beside every wizard step.
 *
 * @param {Object} props
 * @param {Object} props.draft    Campaign draft.
 * @param {Array}  props.products Products to show in the preview.
 */
export default function PreviewCard( { draft, products } ) {
	return (
		<Card
			title={ __(
				'Shopper preview',
				'productboxes-mix-and-match-box-builder'
			) }
			subtitle={ __(
				'Updates as you edit. Try adding items.',
				'productboxes-mix-and-match-box-builder'
			) }
		>
			<Preview draft={ draft } products={ products } />
		</Card>
	);
}
