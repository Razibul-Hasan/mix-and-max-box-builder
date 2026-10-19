import { __ } from '@wordpress/i18n';
import {
	Card,
	ChoiceCard,
	SegmentedControl,
	TextField,
	Toggle,
} from '../../components';
import Preview from './Preview';

const DEFAULT_COUNTDOWN_DAYS = 7;

export default function DesignStep( { draft, dispatch, previewProducts } ) {
	const { design, schedule } = draft.config;
	const set = ( path, value ) => dispatch( { type: 'set', path, value } );
	// "default" is the same as panel on desktop and bar on phones.
	const layout = design.layout === 'default' ? 'both' : design.layout;

	return (
		<div className="mmbb-editor__cols">
			<div className="mmbb-editor__main">
				<Card
					title={ __( 'Layout', 'mix-and-max-box-builder' ) }
					subtitle={ __(
						'Where the box sits next to the products. Phones always get the bottom bar.',
						'mix-and-max-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<div className="mmbb-editor__trio">
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
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Sticky box beside the grid.',
									'mix-and-max-box-builder'
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
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Dark bar under the page.',
									'mix-and-max-box-builder'
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
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Panel on desktop, bar on phones.',
									'mix-and-max-box-builder'
								) }
								tag={ __( 'Best', 'mix-and-max-box-builder' ) }
							/>
						</div>
						<div className="mmbb-editor__stack mmbb-editor__rule">
							<span className="mmbb-editor__label">
								{ __(
									'Products per row on desktop',
									'mix-and-max-box-builder'
								) }
							</span>
							<SegmentedControl
								label={ __(
									'Products per row',
									'mix-and-max-box-builder'
								) }
								options={ [
									{
										value: 0,
										label: __(
											'Auto',
											'mix-and-max-box-builder'
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
					title={ __( 'Words', 'mix-and-max-box-builder' ) }
					subtitle={ __(
						'Short and number-led. The preview updates as you type.',
						'mix-and-max-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<TextField
							label={ __(
								'Headline',
								'mix-and-max-box-builder'
							) }
							value={ design.headline }
							maxLength={ 80 }
							onChange={ ( event ) =>
								set( 'design.headline', event.target.value )
							}
						/>
						<div className="mmbb-editor__pair">
							<TextField
								label={ __(
									'Sticker',
									'mix-and-max-box-builder'
								) }
								value={ design.sticker }
								maxLength={ 24 }
								help={ __(
									'Two words, shown tilted above the headline.',
									'mix-and-max-box-builder'
								) }
								onChange={ ( event ) =>
									set( 'design.sticker', event.target.value )
								}
							/>
							<TextField
								label={ __(
									'Button',
									'mix-and-max-box-builder'
								) }
								value={ design.cta_label }
								maxLength={ 32 }
								help={ __(
									'Leave empty to use the default text.',
									'mix-and-max-box-builder'
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

				<Card title={ __( 'Attention', 'mix-and-max-box-builder' ) }>
					<div className="mmbb-editor__stack">
						<Toggle
							label={ __(
								'Sticker above the headline',
								'mix-and-max-box-builder'
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
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Bars showing each discount tier at a glance.',
									'mix-and-max-box-builder'
								) }
								checked={ design.show_ladder }
								onChange={ ( on ) =>
									set( 'design.show_ladder', on )
								}
							/>
						</div>
						<div className="mmbb-editor__rule">
							<Toggle
								label={ __(
									'Countdown',
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Uses the end date from step 1.',
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

				<Card title={ __( 'Colors', 'mix-and-max-box-builder' ) }>
					<div className="mmbb-editor__pair">
						<div className="mmbb-editor__stack mmbb-editor__stack--tight">
							<span className="mmbb-editor__label">
								{ __( 'Accent', 'mix-and-max-box-builder' ) }
							</span>
							<SegmentedControl
								label={ __(
									'Accent',
									'mix-and-max-box-builder'
								) }
								options={ [
									{
										value: 'max',
										label: __(
											'Max Orange',
											'mix-and-max-box-builder'
										),
									},
									{
										value: 'theme',
										label: __(
											'Theme color',
											'mix-and-max-box-builder'
										),
									},
								] }
								value={ design.accent }
								onChange={ ( value ) =>
									set( 'design.accent', value )
								}
							/>
						</div>
						<div className="mmbb-editor__stack mmbb-editor__stack--tight">
							<span className="mmbb-editor__label">
								{ __(
									'Builder theme',
									'mix-and-max-box-builder'
								) }
							</span>
							<SegmentedControl
								label={ __(
									'Builder theme',
									'mix-and-max-box-builder'
								) }
								options={ [
									{
										value: 'light',
										label: __(
											'Light',
											'mix-and-max-box-builder'
										),
									},
									{
										value: 'dark',
										label: __(
											'Dark',
											'mix-and-max-box-builder'
										),
									},
								] }
								value={ design.theme }
								onChange={ ( value ) =>
									set( 'design.theme', value )
								}
							/>
						</div>
					</div>
				</Card>
			</div>

			<div className="mmbb-editor__side mmbb-editor__side--sticky">
				<Card
					title={ __( 'Shopper preview', 'mix-and-max-box-builder' ) }
					subtitle={ __(
						'Desktop, top of the builder page',
						'mix-and-max-box-builder'
					) }
				>
					<Preview draft={ draft } products={ previewProducts } />
				</Card>
			</div>
		</div>
	);
}
