import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Panel,
	PanelBody,
	RadioControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { Card, TextField } from '../../components';
import { useAdmin } from '../context';
import { localInputToUtc, utcToLocalInput } from './time';

const DEFAULT_COUNTDOWN_DAYS = 7;

/**
 * The 1.0 Basics fields. The redesigned editor shows the name and copy under
 * Design (`section="content"`) and the schedule under Discounts
 * (`section="schedule"`).
 *
 * @param {Object} props
 * @param {Object} props.draft    The draft.
 * @param {Object} props.errors   Inline errors by path.
 * @param {Object} props.dispatch Editor dispatch.
 * @param {string} props.section  content, schedule, or both when left out.
 */
export default function BasicsStep( { draft, errors, dispatch, section } ) {
	const { timezone } = useAdmin();
	const { config } = draft;
	const { schedule, design } = config;
	const [ runs, setRuns ] = useState(
		schedule.start || schedule.end ? 'between' : 'always'
	);
	const set = ( path, value ) => dispatch( { type: 'set', path, value } );
	const showContent = section !== 'schedule';
	const showSchedule = section !== 'content';

	const pickRuns = ( value ) => {
		setRuns( value );
		if ( value === 'always' ) {
			set( 'schedule', { ...schedule, start: null, end: null } );
		} else {
			set( 'schedule', { ...schedule, countdown_end: null } );
		}
	};

	return (
		<div className="mmbb-editor__pane">
			{ showContent ? (
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
			) : null }

			{ showSchedule ? (
				<Panel>
					<PanelBody
						title={ __(
							'Schedule',
							'productboxes-mix-and-match-box-builder'
						) }
					>
						<div className="mmbb-editor__stack">
							<RadioControl
								label={ __(
									'Runs',
									'productboxes-mix-and-match-box-builder'
								) }
								options={ [
									{
										value: 'always',
										label: __(
											'Always',
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
								onChange={ pickRuns }
								selected={ runs }
							/>
							{ runs === 'between' ? (
								<div className="mmbb-editor__pair">
									<TextControl
										type="datetime-local"
										label={ __(
											'Starts',
											'productboxes-mix-and-match-box-builder'
										) }
										value={ utcToLocalInput(
											schedule.start,
											timezone
										) }
										__next40pxDefaultSize
										__nextHasNoMarginBottom
										onChange={ ( value ) =>
											set(
												'schedule.start',
												localInputToUtc(
													value,
													timezone
												)
											)
										}
									/>
									<TextControl
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
										__next40pxDefaultSize
										__nextHasNoMarginBottom
										onChange={ ( value ) =>
											set(
												'schedule.end',
												localInputToUtc(
													value,
													timezone
												)
											)
										}
									/>
								</div>
							) : null }
							<div className="mmbb-editor__rule">
								<ToggleControl
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
									__nextHasNoMarginBottom
								/>
								{ runs === 'always' &&
								schedule.countdown_days > 0 ? (
									<TextControl
										type="datetime-local"
										label={ __(
											'Count down to',
											'productboxes-mix-and-match-box-builder'
										) }
										value={ utcToLocalInput(
											schedule.countdown_end,
											timezone
										) }
										error={
											errors[ 'schedule.countdown_end' ]
										}
										help={ __(
											'The campaign stays on after this. Only the timer stops.',
											'productboxes-mix-and-match-box-builder'
										) }
										__next40pxDefaultSize
										__nextHasNoMarginBottom
										onChange={ ( value ) =>
											set(
												'schedule.countdown_end',
												localInputToUtc(
													value,
													timezone
												)
											)
										}
									/>
								) : null }
							</div>
						</div>
					</PanelBody>
				</Panel>
			) : null }
		</div>
	);
}
