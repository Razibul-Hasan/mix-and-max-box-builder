import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Card, SegmentedControl } from '../../components';
import { readStored, writeStored } from '../hooks';
import Preview from './Preview';

const DEVICE_KEY = 'mmbb:editor:device';

/**
 * The shopper preview card shown beside every wizard step. Desktop shows three
 * tiles a row; Mobile shows a phone-width frame.
 *
 * @param {Object} props
 * @param {Object} props.draft    Campaign draft.
 * @param {Array}  props.products Products to show in the preview.
 */
export default function PreviewCard( { draft, products } ) {
	const [ device, setDevice ] = useState( () =>
		readStored( DEVICE_KEY, 'desktop' ) === 'mobile' ? 'mobile' : 'desktop'
	);
	const pick = ( next ) => {
		setDevice( next );
		writeStored( DEVICE_KEY, next );
	};

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
			actions={
				<SegmentedControl
					size="sm"
					label={ __(
						'Preview size',
						'productboxes-mix-and-match-box-builder'
					) }
					value={ device }
					onChange={ pick }
					options={ [
						{
							value: 'desktop',
							label: __(
								'Desktop',
								'productboxes-mix-and-match-box-builder'
							),
						},
						{
							value: 'mobile',
							label: __(
								'Mobile',
								'productboxes-mix-and-match-box-builder'
							),
						},
					] }
				/>
			}
		>
			<div className="mmbb-editor__frame" data-device={ device }>
				<Preview draft={ draft } products={ products } />
			</div>
		</Card>
	);
}
