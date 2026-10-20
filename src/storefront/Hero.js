import { __, _n, sprintf } from '@wordpress/i18n';
import { Countdown, Sticker, useMoney } from '../components';
import { toMinor } from '../shared/pricing';
import { countdownEnd } from './state';

/**
 * The big figure on a ladder step: "15%", or the amount.
 *
 * @param {Object}   row         Tier { discount_type, value }.
 * @param {Function} formatMoney Formats minor units.
 * @param {number}   decimals    Currency decimals.
 * @return {string} Figure.
 */
function figure( row, formatMoney, decimals ) {
	if ( row.discount_type === 'percent' ) {
		return `${ Number( row.value ) }%`;
	}
	return formatMoney( toMinor( row.value, decimals ) );
}

/**
 * Sticker, headline, intro, countdown and the discount ladder.
 *
 * @param {Object} props
 * @param {Object} props.payload  Storefront payload.
 * @param {number} props.nowMs    The server's current time, in milliseconds.
 * @param {number} props.decimals Currency decimals.
 */
export default function Hero( { payload, nowMs, decimals } ) {
	const formatMoney = useMoney();
	const { config, settings } = payload;
	const { design } = config;
	const ends = countdownEnd( config.schedule, nowMs );
	const tiers =
		config.type === 'tiered' && design.show_ladder
			? config.tiers.slice().sort( ( a, b ) => a.qty - b.qty )
			: [];
	const headline = design.headline || payload.title;

	return (
		<section className="mmbb-hero">
			<div className="mmbb-hero__copy">
				{ design.show_stickers &&
				settings.stickers &&
				design.sticker ? (
					<Sticker tone="max" tilt icon="flame">
						{ design.sticker }
					</Sticker>
				) : null }
				<h2 className="mmbb-hero__headline">{ headline }</h2>
				{ design.intro ? (
					<p className="mmbb-hero__intro">{ design.intro }</p>
				) : null }
				{ ends ? (
					<Countdown
						endsAt={ ends }
						clockOffset={ nowMs - Date.now() }
					/>
				) : null }
			</div>
			{ tiers.length ? (
				<ol
					className="mmbb-hero__ladder"
					aria-label={ __(
						'Discount tiers',
						'mix-and-max-box-builder'
					) }
				>
					{ tiers.map( ( tier, index ) => {
						const top = index === tiers.length - 1;
						let tone;
						if ( top ) {
							tone = 'is-top';
						} else if ( index === tiers.length - 2 ) {
							tone = 'is-near';
						}
						return (
							<li
								key={ tier.qty }
								className={ tone }
								style={ {
									height: `${
										Math.round(
											( ( index + 1 ) / tiers.length ) *
												55
										) + 45
									}%`,
								} }
							>
								{ top && tiers.length > 1 ? (
									<span className="mmbb-hero__max">
										<Sticker tone="ink" size="sm" tilt>
											{ __(
												'Max deal',
												'mix-and-max-box-builder'
											) }
										</Sticker>
									</span>
								) : null }
								<b>{ figure( tier, formatMoney, decimals ) }</b>
								<span>
									{ sprintf(
										/* translators: %d: Number of items. */
										_n(
											'%d item',
											'%d items',
											tier.qty,
											'mix-and-max-box-builder'
										),
										tier.qty
									) }
								</span>
							</li>
						);
					} ) }
				</ol>
			) : null }
		</section>
	);
}
