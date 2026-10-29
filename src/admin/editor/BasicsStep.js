import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Badge,
	Card,
	Notice,
	SegmentedControl,
	TextField,
	Toggle,
	useMoney,
} from '../../components';
import { useAdmin } from '../context';
import { tierSummary, typeSummary } from '../format';
import PreviewCard from './PreviewCard';
import { localInputToUtc, utcToLocalInput } from './time';

const DEFAULT_COUNTDOWN_DAYS = 7;

export default function BasicsStep( {
	draft,
	errors,
	dispatch,
	previewProducts,
} ) {
	const { timezone, money } = useAdmin();
	const formatMoney = useMoney();
	const { config } = draft;
	const { schedule, design } = config;
	const [ runs, setRuns ] = useState(
		schedule.start || schedule.end ? 'between' : 'always'
	);
	const set = ( path, value ) => dispatch( { type: 'set', path, value } );
	const decimals = Number.isInteger( money.decimals ) ? money.decimals : 2;

	const pickRuns = ( value ) => {
		setRuns( value );
		if ( value === 'always' ) {
			set( 'schedule', { ...schedule, start: null, end: null } );
		} else {
			set( 'schedule', { ...schedule, countdown_end: null } );
		}
	};

	return (
		<div className="mmbb-editor__cols">
			<div className="mmbb-editor__main">
				<Card
					title={ __(
						'Campaign',
						'productboxes-mix-and-match-box-builder'
					) }
					subtitle={ __(
						'The name is for you. The headline is what shoppers see.',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<TextField
							label={ __(
								'Campaign name',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ draft.title }
							maxLength={ 200 }
							error={ errors.title }
							onChange={ ( event ) =>
								dispatch( {
									type: 'title',
									value: event.target.value,
								} )
							}
						/>
						<TextField
							label={ __(
								'Headline',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ design.headline }
							maxLength={ 80 }
							help={ __(
								'Lead with the number. It sits above the builder in the display font.',
								'productboxes-mix-and-match-box-builder'
							) }
							onChange={ ( event ) =>
								set( 'design.headline', event.target.value )
							}
						/>
						<TextField
							label={ __(
								'Intro line',
								'productboxes-mix-and-match-box-builder'
							) }
							multiline
							rows={ 3 }
							value={ design.intro }
							maxLength={ 240 }
							onChange={ ( event ) =>
								set( 'design.intro', event.target.value )
							}
						/>
					</div>
				</Card>

				<Card
					title={ __(
						'Schedule',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<SegmentedControl
							label={ __(
								'Runs',
								'productboxes-mix-and-match-box-builder'
							) }
							options={ [
								{
									value: 'always',
									label: __(
										'Always on',
										'productboxes-mix-and-match-box-builder'
									),
								},
								{
									value: 'between',
									label: __(
										'Between dates',
										'productboxes-mix-and-match-box-builder'
									),
								},
							] }
							value={ runs }
							onChange={ pickRuns }
						/>
						{ runs === 'between' ? (
							<div className="mmbb-editor__pair">
								<TextField
									type="datetime-local"
									label={ __(
										'Starts',
										'productboxes-mix-and-match-box-builder'
									) }
									value={ utcToLocalInput(
										schedule.start,
										timezone
									) }
									onChange={ ( event ) =>
										set(
											'schedule.start',
											localInputToUtc(
												event.target.value,
												timezone
											)
										)
									}
								/>
								<TextField
									type="datetime-local"
									label={ __(
										'Ends',
										'productboxes-mix-and-match-box-builder'
									) }
									value={ utcToLocalInput(
										schedule.end,
										timezone
									) }
									error={ errors[ 'schedule.end' ] }
									onChange={ ( event ) =>
										set(
											'schedule.end',
											localInputToUtc(
												event.target.value,
												timezone
											)
										)
									}
								/>
							</div>
						) : null }
						<div className="mmbb-editor__rule">
							<Toggle
								label={ __(
									'Countdown timer',
									'productboxes-mix-and-match-box-builder'
								) }
								description={
									runs === 'between'
										? __(
												'Shows above the builder in the last 7 days, counting to the end date above.',
												'productboxes-mix-and-match-box-builder'
										  )
										: __(
												'Shows above the builder and counts to the time you pick. It hides once that time passes.',
												'productboxes-mix-and-match-box-builder'
										  )
								}
								checked={ schedule.countdown_days > 0 }
								onChange={ ( on ) =>
									set(
										'schedule.countdown_days',
										on ? DEFAULT_COUNTDOWN_DAYS : 0
									)
								}
							/>
							{ runs === 'always' &&
							schedule.countdown_days > 0 ? (
								<TextField
									type="datetime-local"
									label={ __(
										'Count down to',
										'productboxes-mix-and-match-box-builder'
									) }
									value={ utcToLocalInput(
										schedule.countdown_end,
										timezone
									) }
									error={ errors[ 'schedule.countdown_end' ] }
									help={ __(
										'The campaign stays on after this. Only the timer stops.',
										'productboxes-mix-and-match-box-builder'
									) }
									onChange={ ( event ) =>
										set(
											'schedule.countdown_end',
											localInputToUtc(
												event.target.value,
												timezone
											)
										)
									}
								/>
							) : null }
						</div>
					</div>
				</Card>
			</div>

			<div className="mmbb-editor__side">
				<PreviewCard draft={ draft } products={ previewProducts } />
				<Card
					title={ __(
						'At a glance',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<div className="mmbb-editor__badges">
							<Badge tone="brand" icon="percent">
								{ typeSummary( config, formatMoney, decimals ) }
							</Badge>
							{ tierSummary( config ) ? (
								<Badge>{ tierSummary( config ) }</Badge>
							) : null }
						</div>
						<p className="mmbb-editor__note">
							{ __(
								'Rules and tiers come from your template. Change them on step 3.',
								'productboxes-mix-and-match-box-builder'
							) }
						</p>
					</div>
				</Card>
				<Notice
					tone="info"
					title={ __(
						'Dates follow your store time',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					{ __(
						'WordPress › Settings › General sets the time zone.',
						'productboxes-mix-and-match-box-builder'
					) }
				</Notice>
			</div>
		</div>
	);
}
