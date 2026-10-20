import { __, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import { Button, Card, EmptyState, Icon } from '../../components';
import { copyText } from '../copy-text';
import { useAdmin } from '../context';
import { formatShortDate } from '../format';
import { useToast } from '../toast';

function linkText( url ) {
	try {
		const parsed = new URL( url );
		return parsed.host + parsed.pathname.replace( /\/$/, '' );
	} catch ( e ) {
		return url;
	}
}

export default function PublishedStep( { campaign, draft } ) {
	const { urls, locale, timezone } = useAdmin();
	const toast = useToast();
	const { page_url: pageUrl, page_title: pageTitle } = campaign.placement;
	const end = draft.config.schedule.end;
	const days = draft.config.schedule.countdown_days;

	const copyLink = () =>
		copyText( pageUrl ).then( ( ok ) =>
			toast(
				ok
					? __( 'Link copied', 'mix-and-max-box-builder' )
					: __(
							'Copy didn’t work. Select the link and copy by hand.',
							'mix-and-max-box-builder'
					  )
			)
		);

	let description = pageUrl
		? sprintf(
				/* translators: %s: Address of the page, such as example.com/holiday-box. */
				__(
					'Shoppers can build boxes at %s now.',
					'mix-and-max-box-builder'
				),
				linkText( pageUrl )
		  )
		: __(
				'Paste the shortcode on a page to show the builder.',
				'mix-and-max-box-builder'
		  );
	if ( end && days > 0 ) {
		description +=
			' ' +
			sprintf(
				/* translators: 1: Number of days, 2: End date. */
				__(
					'The countdown starts %1$d days before %2$s.',
					'mix-and-max-box-builder'
				),
				days,
				formatShortDate( end, { locale, timezone } )
			);
	}

	return (
		<div className="mmbb-editor__done">
			<Card padding="none">
				<EmptyState
					icon="check"
					title={ sprintf(
						/* translators: %s: Campaign name. */
						__( '%s is live', 'mix-and-max-box-builder' ),
						draft.title
					) }
					description={ description }
				/>
				<div className="mmbb-editor__done-actions">
					{ pageUrl ? (
						<div className="mmbb-editor__link">
							<Icon name="store" size={ 18 } />
							<span>{ linkText( pageUrl ) }</span>
							<Button size="sm" icon="copy" onClick={ copyLink }>
								{ __( 'Copy link', 'mix-and-max-box-builder' ) }
							</Button>
						</div>
					) : null }
					<div className="mmbb-editor__buttons">
						{ pageUrl ? (
							<Button
								variant="max"
								icon="eye"
								href={ pageUrl }
								target="_blank"
								rel="noopener noreferrer"
							>
								{ __(
									'View on store',
									'mix-and-max-box-builder'
								) }
							</Button>
						) : null }
						<Button href={ urls.dashboard }>
							{ __(
								'Back to dashboard',
								'mix-and-max-box-builder'
							) }
						</Button>
					</div>
				</div>
			</Card>

			<div className="mmbb-editor__stack mmbb-editor__stack--tight">
				<h2 className="mmbb-editor__h2">
					{ __( 'What to do next', 'mix-and-max-box-builder' ) }
				</h2>
				<div className="mmbb-editor__next">
					<a href={ urls.analytics }>
						<span className="mmbb-editor__next-icon">
							<Icon name="analytics" size={ 20 } />
						</span>
						<b>
							{ __( 'Watch it sell', 'mix-and-max-box-builder' ) }
						</b>
						<span>
							{ __(
								'Revenue, boxes and the builder funnel update every hour.',
								'mix-and-max-box-builder'
							) }
						</span>
					</a>
					<div>
						<span className="mmbb-editor__next-icon">
							<Icon name="layers" size={ 20 } />
						</span>
						<b>
							{ __(
								'Add a menu link',
								'mix-and-max-box-builder'
							) }
						</b>
						<span>
							{ pageTitle
								? sprintf(
										/* translators: %s: Page title. */
										__(
											'Appearance › Menus › add the %s page.',
											'mix-and-max-box-builder'
										),
										pageTitle
								  )
								: __(
										'Appearance › Menus › add the page that holds the builder.',
										'mix-and-max-box-builder'
								  ) }
						</span>
					</div>
					<a
						href={ addQueryArgs( campaign.edit_url, {
							step: 'rules',
						} ) }
					>
						<span className="mmbb-editor__next-icon">
							<Icon name="percent" size={ 20 } />
						</span>
						<b>
							{ __(
								'Tune your tiers',
								'mix-and-max-box-builder'
							) }
						</b>
						<span>
							{ __(
								'After a week, check where boxes stop and move a tier if most stall one short.',
								'mix-and-max-box-builder'
							) }
						</span>
					</a>
				</div>
			</div>
		</div>
	);
}
