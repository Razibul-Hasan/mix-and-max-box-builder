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
	const countTo = draft.config.schedule.countdown_end;

	const copyLink = () =>
		copyText( pageUrl ).then( ( ok ) =>
			toast(
				ok
					? __(
							'Link copied',
							'productboxes-mix-and-match-box-builder'
					  )
					: __(
							'Copy didn’t work. Select the link and copy by hand.',
							'productboxes-mix-and-match-box-builder'
					  )
			)
		);

	let description = pageUrl
		? sprintf(
				/* translators: %s: Address of the page, such as example.com/holiday-box. */
				__(
					'Shoppers can build boxes at %s now.',
					'productboxes-mix-and-match-box-builder'
				),
				linkText( pageUrl )
		  )
		: __(
				'Paste the shortcode on a page to show the builder.',
				'productboxes-mix-and-match-box-builder'
		  );
	if ( end && days > 0 ) {
		description +=
			' ' +
			sprintf(
				/* translators: 1: Number of days, 2: End date. */
				__(
					'The countdown starts %1$d days before %2$s.',
					'productboxes-mix-and-match-box-builder'
				),
				days,
				formatShortDate( end, { locale, timezone } )
			);
	} else if ( ! end && countTo && days > 0 ) {
		description +=
			' ' +
			sprintf(
				/* translators: %s: Date the countdown ends. */
				__(
					'The countdown runs until %s.',
					'productboxes-mix-and-match-box-builder'
				),
				formatShortDate( countTo, { locale, timezone } )
			);
	}

	return (
		<div className="mmbb-editor__done">
			<Card padding="none">
				<EmptyState
					icon="check"
					title={ sprintf(
						/* translators: %s: Campaign name. */
						__(
							'%s is live',
							'productboxes-mix-and-match-box-builder'
						),
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
								{ __(
									'Copy link',
									'productboxes-mix-and-match-box-builder'
								) }
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
									'productboxes-mix-and-match-box-builder'
								) }
							</Button>
						) : null }
						<Button href={ urls.dashboard }>
							{ __(
								'Back to dashboard',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
					</div>
				</div>
			</Card>

			<div className="mmbb-editor__stack mmbb-editor__stack--tight">
				<h2 className="mmbb-editor__h2">
					{ __(
						'What to do next',
						'productboxes-mix-and-match-box-builder'
					) }
				</h2>
				<div className="mmbb-editor__next">
					<a href={ urls.analytics }>
						<span className="mmbb-editor__next-icon">
							<Icon name="analytics" size={ 20 } />
						</span>
						<b>
							{ __(
								'Watch it sell',
								'productboxes-mix-and-match-box-builder'
							) }
						</b>
						<span>
							{ __(
								'Revenue, boxes and the builder funnel update every hour.',
								'productboxes-mix-and-match-box-builder'
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
								'productboxes-mix-and-match-box-builder'
							) }
						</b>
						<span>
							{ pageTitle
								? sprintf(
										/* translators: %s: Page title. */
										__(
											'Appearance › Menus › add the %s page.',
											'productboxes-mix-and-match-box-builder'
										),
										pageTitle
								  )
								: __(
										'Appearance › Menus › add the page that holds the builder.',
										'productboxes-mix-and-match-box-builder'
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
								'productboxes-mix-and-match-box-builder'
							) }
						</b>
						<span>
							{ __(
								'After a week, check where boxes stop and move a tier if most stall one short.',
								'productboxes-mix-and-match-box-builder'
							) }
						</span>
					</a>
				</div>
			</div>
		</div>
	);
}
