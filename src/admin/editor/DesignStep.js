import { __, sprintf } from '@wordpress/i18n';
import {
	Card,
	ChoiceCard,
	SegmentedControl,
	TextField,
	Toggle,
} from '../../components';
import { useAdmin } from '../context';
import ColorField from './ColorField';
import PreviewCard from './PreviewCard';

export default function DesignStep( { draft, dispatch, previewProducts } ) {
	const { themeAccent } = useAdmin();
	const { design } = draft.config;
	const set = ( path, value ) => dispatch( { type: 'set', path, value } );
	// "default" is the same as panel on desktop and bar on phones.
	const layout = design.layout === 'default' ? 'both' : design.layout;
	const showLadder = draft.config.type === 'tiered' && design.show_ladder;
	const showCountdown = draft.config.schedule.countdown_days > 0;
	const ladderRows = [
		{
			key: 'ladder_top',
			label: __( 'Top step', 'productboxes-mix-and-match-box-builder' ),
		},
		{
			key: 'ladder_near',
			label: __( 'Next step', 'productboxes-mix-and-match-box-builder' ),
		},
		{
			key: 'ladder_base',
			label: __(
				'Other steps',
				'productboxes-mix-and-match-box-builder'
			),
		},
	];

	return (
		<div className="mmbb-editor__cols">
			<div className="mmbb-editor__main">
				<Card
					title={ __(
						'Layout',
						'productboxes-mix-and-match-box-builder'
					) }
					subtitle={ __(
						'Where the box sits next to the products. Phones always get the bottom bar.',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<div className="mmbb-editor__choices">
							<ChoiceCard
								name="layout"
								value="panel"
								selected={ layout === 'panel' }
								onSelect={ ( value ) =>
									set( 'design.layout', value )
								}
								icon="layers"
								title={ __(
									'Sidebar panel',
									'productboxes-mix-and-match-box-builder'
								) }
								description={ __(
									'Sticky box beside the grid.',
									'productboxes-mix-and-match-box-builder'
								) }
							/>
							<ChoiceCard
								name="layout"
								value="bar"
								selected={ layout === 'bar' }
								onSelect={ ( value ) =>
									set( 'design.layout', value )
								}
								icon="box"
								title={ __(
									'Bottom bar',
									'productboxes-mix-and-match-box-builder'
								) }
								description={ __(
									'Dark bar under the page.',
									'productboxes-mix-and-match-box-builder'
								) }
							/>
							<ChoiceCard
								name="layout"
								value="both"
								selected={ layout === 'both' }
								onSelect={ ( value ) =>
									set( 'design.layout', value )
								}
								icon="dashboard"
								title={ __(
									'Both',
									'productboxes-mix-and-match-box-builder'
								) }
								description={ __(
									'Panel on desktop, bar on phones.',
									'productboxes-mix-and-match-box-builder'
								) }
								tag={ __(
									'Best',
									'productboxes-mix-and-match-box-builder'
								) }
							/>
						</div>
						<div className="mmbb-editor__stack mmbb-editor__rule">
							<span className="mmbb-editor__label">
								{ __(
									'Products per row on desktop',
									'productboxes-mix-and-match-box-builder'
								) }
							</span>
							<SegmentedControl
								label={ __(
									'Products per row',
									'productboxes-mix-and-match-box-builder'
								) }
								options={ [
									{
										value: 0,
										label: __(
											'Auto',
											'productboxes-mix-and-match-box-builder'
										),
									},
									3,
									4,
									5,
								] }
								value={ design.columns }
								onChange={ ( value ) =>
									set( 'design.columns', value )
								}
							/>
						</div>
					</div>
				</Card>

				<Card
					title={ __(
						'Words',
						'productboxes-mix-and-match-box-builder'
					) }
					subtitle={ __(
						'The headline and intro line are set on step 1.',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<div className="mmbb-editor__pair">
							<TextField
								label={ __(
									'Sticker',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.sticker }
								maxLength={ 24 }
								help={ __(
									'Two words, shown tilted above the headline.',
									'productboxes-mix-and-match-box-builder'
								) }
								onChange={ ( event ) =>
									set( 'design.sticker', event.target.value )
								}
							/>
							<TextField
								label={ __(
									'Button',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.cta_label }
								maxLength={ 32 }
								help={ __(
									'Leave empty to use the default text.',
									'productboxes-mix-and-match-box-builder'
								) }
								onChange={ ( event ) =>
									set(
										'design.cta_label',
										event.target.value
									)
								}
							/>
						</div>
					</div>
				</Card>

				<Card
					title={ __(
						'Attention',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<Toggle
							label={ __(
								'Sticker above the headline',
								'productboxes-mix-and-match-box-builder'
							) }
							checked={ design.show_stickers }
							onChange={ ( on ) =>
								set( 'design.show_stickers', on )
							}
						/>
						<div className="mmbb-editor__rule">
							<Toggle
								label={ __(
									'Tier ladder in the hero',
									'productboxes-mix-and-match-box-builder'
								) }
								description={ __(
									'Bars showing each discount tier at a glance.',
									'productboxes-mix-and-match-box-builder'
								) }
								checked={ design.show_ladder }
								onChange={ ( on ) =>
									set( 'design.show_ladder', on )
								}
							/>
						</div>
					</div>
				</Card>

				<Card
					title={ __(
						'Colors',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<div className="mmbb-editor__pair">
							<div className="mmbb-editor__stack mmbb-editor__stack--tight">
								<span className="mmbb-editor__label">
									{ __(
										'Accent',
										'productboxes-mix-and-match-box-builder'
									) }
								</span>
								<SegmentedControl
									label={ __(
										'Accent',
										'productboxes-mix-and-match-box-builder'
									) }
									options={ [
										{
											value: 'max',
											label: __(
												'Max Orange',
												'productboxes-mix-and-match-box-builder'
											),
										},
										{
											value: 'theme',
											label: __(
												'Theme color',
												'productboxes-mix-and-match-box-builder'
											),
										},
										{
											value: 'custom',
											label: __(
												'Custom',
												'productboxes-mix-and-match-box-builder'
											),
										},
									] }
									value={ design.accent }
									onChange={ ( value ) =>
										set( 'design.accent', value )
									}
								/>
								{ design.accent === 'theme' ? (
									<p className="mmbb-editor__note">
										{ themeAccent
											? sprintf(
													/* translators: %s: Hex colour code, such as #3858e9. */
													__(
														'Uses %s from your theme.',
														'productboxes-mix-and-match-box-builder'
													),
													themeAccent
											  )
											: __(
													'Your theme sets no main color, so Max Orange is used.',
													'productboxes-mix-and-match-box-builder'
											  ) }
									</p>
								) : null }
								{ design.accent === 'custom' ? (
									<ColorField
										label={ __(
											'Accent color',
											'productboxes-mix-and-match-box-builder'
										) }
										help={ __(
											'Buttons, stickers and progress. Text on it turns dark or light to stay readable.',
											'productboxes-mix-and-match-box-builder'
										) }
										value={ design.accent_color }
										onChange={ ( value ) =>
											set( 'design.accent_color', value )
										}
									/>
								) : null }
							</div>
							<div className="mmbb-editor__stack mmbb-editor__stack--tight">
								<span className="mmbb-editor__label">
									{ __(
										'Builder theme',
										'productboxes-mix-and-match-box-builder'
									) }
								</span>
								<SegmentedControl
									label={ __(
										'Builder theme',
										'productboxes-mix-and-match-box-builder'
									) }
									options={ [
										{
											value: 'light',
											label: __(
												'Light',
												'productboxes-mix-and-match-box-builder'
											),
										},
										{
											value: 'dark',
											label: __(
												'Dark',
												'productboxes-mix-and-match-box-builder'
											),
										},
										{
											value: 'custom',
											label: __(
												'Custom',
												'productboxes-mix-and-match-box-builder'
											),
										},
									] }
									value={ design.theme }
									onChange={ ( value ) =>
										set( 'design.theme', value )
									}
								/>
								{ design.theme === 'custom' ? (
									<>
										<ColorField
											label={ __(
												'Background',
												'productboxes-mix-and-match-box-builder'
											) }
											value={ design.theme_canvas }
											onChange={ ( value ) =>
												set(
													'design.theme_canvas',
													value
												)
											}
										/>
										<ColorField
											label={ __(
												'Cards',
												'productboxes-mix-and-match-box-builder'
											) }
											help={ __(
												'Text and lines are worked out from the card color.',
												'productboxes-mix-and-match-box-builder'
											) }
											value={ design.theme_surface }
											onChange={ ( value ) =>
												set(
													'design.theme_surface',
													value
												)
											}
										/>
									</>
								) : null }
							</div>
						</div>
						{ showCountdown ? (
							<div className="mmbb-editor__stack mmbb-editor__rule">
								<span className="mmbb-editor__label">
									{ __(
										'Countdown timer',
										'productboxes-mix-and-match-box-builder'
									) }
								</span>
								<SegmentedControl
									label={ __(
										'Countdown timer',
										'productboxes-mix-and-match-box-builder'
									) }
									options={ [
										{
											value: 'default',
											label: __(
												'Match colors',
												'productboxes-mix-and-match-box-builder'
											),
										},
										{
											value: 'custom',
											label: __(
												'Custom',
												'productboxes-mix-and-match-box-builder'
											),
										},
									] }
									value={ design.countdown }
									onChange={ ( value ) =>
										set( 'design.countdown', value )
									}
								/>
								{ design.countdown === 'custom' ? (
									<div className="mmbb-editor__pair">
										<ColorField
											label={ __(
												'Countdown background',
												'productboxes-mix-and-match-box-builder'
											) }
											value={ design.countdown_bg }
											onChange={ ( value ) =>
												set(
													'design.countdown_bg',
													value
												)
											}
										/>
										<ColorField
											label={ __(
												'Countdown text',
												'productboxes-mix-and-match-box-builder'
											) }
											value={ design.countdown_text }
											onChange={ ( value ) =>
												set(
													'design.countdown_text',
													value
												)
											}
										/>
									</div>
								) : (
									<p className="mmbb-editor__note">
										{ __(
											'The timer is yellow with dark text.',
											'productboxes-mix-and-match-box-builder'
										) }
									</p>
								) }
							</div>
						) : null }
						{ showLadder ? (
							<div className="mmbb-editor__stack mmbb-editor__rule">
								<span className="mmbb-editor__label">
									{ __(
										'Discount ladder',
										'productboxes-mix-and-match-box-builder'
									) }
								</span>
								<SegmentedControl
									label={ __(
										'Discount ladder',
										'productboxes-mix-and-match-box-builder'
									) }
									options={ [
										{
											value: 'default',
											label: __(
												'Match colors',
												'productboxes-mix-and-match-box-builder'
											),
										},
										{
											value: 'custom',
											label: __(
												'Custom',
												'productboxes-mix-and-match-box-builder'
											),
										},
									] }
									value={ design.ladder }
									onChange={ ( value ) =>
										set( 'design.ladder', value )
									}
								/>
								{ design.ladder === 'custom' ? (
									ladderRows.map( ( row ) => (
										<div
											className="mmbb-editor__pair"
											key={ row.key }
										>
											<ColorField
												label={ sprintf(
													/* translators: %s: Ladder step, such as "Top step". */
													__(
														'%s background',
														'productboxes-mix-and-match-box-builder'
													),
													row.label
												) }
												value={ design[ row.key ] }
												onChange={ ( value ) =>
													set(
														'design.' + row.key,
														value
													)
												}
											/>
											<ColorField
												label={ sprintf(
													/* translators: %s: Ladder step, such as "Top step". */
													__(
														'%s text',
														'productboxes-mix-and-match-box-builder'
													),
													row.label
												) }
												value={
													design[ row.key + '_text' ]
												}
												onChange={ ( value ) =>
													set(
														'design.' +
															row.key +
															'_text',
														value
													)
												}
											/>
										</div>
									) )
								) : (
									<p className="mmbb-editor__note">
										{ __(
											'The top step uses the accent and the next step is yellow.',
											'productboxes-mix-and-match-box-builder'
										) }
									</p>
								) }
							</div>
						) : null }
					</div>
				</Card>
			</div>

			<div className="mmbb-editor__side mmbb-editor__side--sticky">
				<PreviewCard draft={ draft } products={ previewProducts } />
			</div>
		</div>
	);
}
