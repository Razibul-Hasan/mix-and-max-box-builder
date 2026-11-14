import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Panel,
	PanelBody,
	RadioControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { VStack } from '../components/wp';
import { useAdmin } from '../context';
import { useOpenOnError } from './fields';
import { localInputToUtc, utcToLocalInput } from './time';

const DEFAULT_COUNTDOWN_DAYS = 7;
/**
 * The Basics fields. The editor shows the name and copy under Design
 * (`section="content"`) and the schedule under Discounts (`section="schedule"`).
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
	const schedulePanel = useOpenOnError( errors, [ 'schedule.' ] );
	const dateField = ( { label, value, path, error, help } ) => (
		<TextControl
			type="datetime-local"
			label={ label }
			value={ utcToLocalInput( value, timezone ) }
			help={ error || help }
			aria-invalid={ error ? true : undefined }
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			onChange={ ( next ) =>
				set( path, localInputToUtc( next, timezone ) )
			}
		/>
	);

	return (
		<Panel>
			{ showContent ? (
				<PanelBody
					title={ __(
						'Campaign',
						'productboxes-mix-and-match-box-builder'
					) }
					initialOpen
				>
					<VStack spacing={ 4 }>
						<TextControl
							label={ __(
								'Campaign name',
								'productboxes-mix-and-match-box-builder'
							) }
							help={
								errors.title ||
								__(
									'The name is for you only.',
									'productboxes-mix-and-match-box-builder'
								)
							}
							value={ draft.title }
							aria-invalid={ errors.title ? true : undefined }
							maxLength={ 200 }
							onChange={ ( value ) =>
								dispatch( { type: 'title', value } )
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __(
								'Headline',
								'productboxes-mix-and-match-box-builder'
							) }
							help={ __(
								'Lead with the number. It sits above the builder in the display font.',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ design.headline }
							maxLength={ 80 }
							onChange={ ( value ) =>
								set( 'design.headline', value )
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextareaControl
							label={ __(
								'Intro line',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ design.intro }
							rows={ 3 }
							maxLength={ 240 }
							onChange={ ( value ) =>
								set( 'design.intro', value )
							}
							__nextHasNoMarginBottom
						/>
					</VStack>
				</PanelBody>
			) : null }

			{ showSchedule ? (
				<PanelBody
					title={ __(
						'Schedule',
						'productboxes-mix-and-match-box-builder'
					) }
					{ ...schedulePanel }
				>
					<VStack spacing={ 4 }>
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
						{ runs === 'between'
							? dateField( {
									label: __(
										'Starts',
										'productboxes-mix-and-match-box-builder'
									),
									value: schedule.start,
									path: 'schedule.start',
							  } )
							: null }
						{ runs === 'between'
							? dateField( {
									label: __(
										'Ends',
										'productboxes-mix-and-match-box-builder'
									),
									value: schedule.end,
									path: 'schedule.end',
									error: errors[ 'schedule.end' ],
							  } )
							: null }
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __(
								'Countdown timer',
								'productboxes-mix-and-match-box-builder'
							) }
							help={
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
						{ runs === 'always' && schedule.countdown_days > 0
							? dateField( {
									label: __(
										'Count down to',
										'productboxes-mix-and-match-box-builder'
									),
									value: schedule.countdown_end,
									path: 'schedule.countdown_end',
									error: errors[ 'schedule.countdown_end' ],
									help: __(
										'The campaign stays on after this. Only the timer stops.',
										'productboxes-mix-and-match-box-builder'
									),
							  } )
							: null }
					</VStack>
				</PanelBody>
			) : null }
		</Panel>
	);
}
