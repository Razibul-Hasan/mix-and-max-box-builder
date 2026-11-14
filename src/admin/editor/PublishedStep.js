import { Button, Icon } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { check } from '@wordpress/icons';
import { useAdmin } from '../context';

function linkText( url ) {
	try {
		const parsed = new URL( url );
		return parsed.host + parsed.pathname.replace( /\/$/, '' );
	} catch ( error ) {
		return url;
	}
}

export default function PublishedStep( { campaign } ) {
	const { urls } = useAdmin();
	const pageUrl = campaign.placement.page_url;

	return (
		<div className="mmbb-publish-success">
			<span className="mmbb-publish-success__icon">
				<Icon icon={ check } size={ 24 } />
			</span>
			<h2>
				{ __(
					'Your box is live',
					'productboxes-mix-and-match-box-builder'
				) }
			</h2>
			{ pageUrl ? (
				<p>
					{ __(
						'Shoppers can build it at',
						'productboxes-mix-and-match-box-builder'
					) }
					<a
						href={ pageUrl }
						target="_blank"
						rel="noopener noreferrer"
					>
						{ linkText( pageUrl ) }
					</a>
					.
				</p>
			) : (
				<p>
					{ __(
						'Add the ProductBoxes Box Builder block or paste the shortcode on a page when you are ready.',
						'productboxes-mix-and-match-box-builder'
					) }
				</p>
			) }
			<div className="mmbb-publish-success__actions">
				<Button
					href={ urls.campaigns }
					variant="secondary"
					__next40pxDefaultSize
				>
					{ __(
						'Back to boxes',
						'productboxes-mix-and-match-box-builder'
					) }
				</Button>
				{ pageUrl ? (
					<Button
						href={ pageUrl }
						target="_blank"
						rel="noopener noreferrer"
						variant="primary"
						__next40pxDefaultSize
					>
						{ __(
							'View on store',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				) : null }
			</div>
		</div>
	);
}
