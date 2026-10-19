import { __, _n, sprintf } from '@wordpress/i18n';
import Icon from './Icon';
import { cx } from './utils';
import Media from './Media';

export default function BoxSlots( {
	size = 6,
	items = [],
	onRemove,
	columns,
} ) {
	const cols =
		columns || ( size <= 4 ? size : size <= 6 ? 3 : size <= 9 ? 3 : 4 );
	const slots = Array.from( { length: size }, ( _, i ) => items[ i ] );
	return (
		<ol
			className="mmbb-slots"
			style={ {
				gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))',
			} }
			aria-label={ sprintf(
				/* translators: 1: Filled slots, 2: Box capacity. */ _n(
					'Box: %1$d of %2$d filled',
					'Box: %1$d of %2$d filled',
					Math.min( items.length, size ),
					'mix-and-max-box-builder'
				),
				Math.min( items.length, size ),
				size
			) }
		>
			{ slots.map( ( it, i ) => (
				<li
					key={ i }
					className={ cx( 'mmbb-slot', it && 'is-filled' ) }
				>
					{ it ? (
						<>
							<span className="mmbb-slot__media">
								<Media
									image={ it.image }
									art={ it.art }
									name={ it.name }
								/>
							</span>
							{ onRemove ? (
								<button
									type="button"
									className="mmbb-slot__remove"
									aria-label={
										it.name
											? sprintf(
													/* translators: %s: Product name. */ __(
														'Remove %s',
														'mix-and-max-box-builder'
													),
													it.name
											  )
											: __(
													'Remove item',
													'mix-and-max-box-builder'
											  )
									}
									onClick={ () => onRemove( i, it ) }
								>
									<Icon
										name="close"
										size={ 12 }
										strokeWidth={ 2.75 }
									/>
								</button>
							) : null }
						</>
					) : (
						<span className="mmbb-slot__num">{ i + 1 }</span>
					) }
				</li>
			) ) }
		</ol>
	);
}
