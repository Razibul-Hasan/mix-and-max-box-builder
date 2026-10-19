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
import { slugInput } from './state';
import { localInputToUtc, utcToLocalInput } from './time';

const DEFAULT_COUNTDOWN_DAYS = 7;

export default function BasicsStep( { draft, errors, dispatch, page } ) {
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
		}
	};

	return (
		<div className="mmbb-editor__cols">
			<div className="mmbb-editor__main">
				<Card
					title={ __( 'Campaign', 'mix-and-max-box-builder' ) }
					subtitle={ __(
						'The name is for you. The headline is what shoppers see.',
						'mix-and-max-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<div className="mmbb-editor__pair">
							<TextField
								label={ __(
									'Campaign name',
									'mix-and-max-box-builder'
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
									'Page address',
									'mix-and-max-box-builder'
								) }
								prefix="/"
								value={ page.slug }
								help={ __(
									'Used if you create a new page on step 5.',
									'mix-and-max-box-builder'
								) }
								onChange={ ( event ) =>
									page.setSlug(
										slugInput( event.target.value )
									)
								}
							/>
						</div>
						<TextField
							label={ __(
								'Headline',
								'mix-and-max-box-builder'
							) }
							value={ design.headline }
							maxLength={ 80 }
							help={ __(
								'Lead with the number. It sits above the builder in the display font.',
								'mix-and-max-box-builder'
							) }
							onChange={ ( event ) =>
								set( 'design.headline', event.target.value )
							}
						/>
						<TextField
							label={ __(
								'Intro line',
								'mix-and-max-box-builder'
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

				<Card title={ __( 'Schedule', 'mix-and-max-box-builder' ) }>
					<div className="mmbb-editor__stack">
						<SegmentedControl
							label={ __( 'Runs', 'mix-and-max-box-builder' ) }
							options={ [
								{
									value: 'always',
									label: __(
										'Always on',
										'mix-and-max-box-builder'
									),
								},
								{
									value: 'between',
									label: __(
										'Between dates',
										'mix-and-max-box-builder'
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
										'mix-and-max-box-builder'
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
										'mix-and-max-box-builder'
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
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Shows above the builder in the last 7 days, counting to the end date above.',
									'mix-and-max-box-builder'
								) }
								checked={ schedule.countdown_days > 0 }
								onChange={ ( on ) =>
									set(
										'schedule.countdown_days',
										on ? DEFAULT_COUNTDOWN_DAYS : 0
									)
								}
							/>
						</div>
					</div>
				</Card>
			</div>

			<div className="mmbb-editor__side">
				<Card title={ __( 'At a glance', 'mix-and-max-box-builder' ) }>
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
								'mix-and-max-box-builder'
							) }
						</p>
					</div>
				</Card>
				<Notice
					tone="info"
					title={ __(
						'Dates follow your store time',
						'mix-and-max-box-builder'
					) }
				>
					{ __(
						'WordPress › Settings › General sets the time zone.',
						'mix-and-max-box-builder'
					) }
				</Notice>
			</div>
		</div>
	);
}
