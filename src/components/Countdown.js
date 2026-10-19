import {
	useState,
	useEffect,
	useMemo,
	createInterpolateElement,
} from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import Icon from './Icon';
import { cx } from './utils';

export default function Countdown( {
	seconds,
	endsAt,
	label = __( 'Deal ends in', 'mix-and-max-box-builder' ),
	tone = 'pop',
} ) {
	const target = useMemo(
		() =>
			endsAt
				? new Date( endsAt ).getTime()
				: Date.now() + ( seconds || 0 ) * 1000,
		[ endsAt, seconds ]
	);
	const [ now, setNow ] = useState( Date.now() );
	useEffect( () => {
		const t = setInterval( () => setNow( Date.now() ), 1000 );
		return () => clearInterval( t );
	}, [] );
	let s = Math.max( 0, Math.floor( ( target - now ) / 1000 ) );
	const d = Math.floor( s / 86400 );
	s %= 86400;
	const h = Math.floor( s / 3600 );
	s %= 3600;
	const m = Math.floor( s / 60 );
	const sec = s % 60;
	const p = ( n ) => String( n ).padStart( 2, '0' );
	return (
		<div
			className={ cx( 'mmbb-countdown', 'mmbb-countdown--' + tone ) }
			role="timer"
			aria-live="off"
		>
			<Icon name="clock" size={ 16 } strokeWidth={ 2 } />
			<span className="mmbb-countdown__label">{ label }</span>
			<span className="mmbb-countdown__units">
				{ d > 0 ? (
					<span>
						{ createInterpolateElement(
							sprintf(
								/* translators: %d: Days remaining. */ _n(
									'<time>%d</time>d',
									'<time>%d</time>d',
									d,
									'mix-and-max-box-builder'
								),
								d
							),
							{ time: <b /> }
						) }
					</span>
				) : null }
				<span>
					{ createInterpolateElement(
						sprintf(
							/* translators: %s: Zero-padded hours. */ _n(
								'<time>%s</time>h',
								'<time>%s</time>h',
								h,
								'mix-and-max-box-builder'
							),
							p( h )
						),
						{ time: <b /> }
					) }
				</span>
				<span>
					{ createInterpolateElement(
						sprintf(
							/* translators: %s: Zero-padded minutes. */ _n(
								'<time>%s</time>m',
								'<time>%s</time>m',
								m,
								'mix-and-max-box-builder'
							),
							p( m )
						),
						{ time: <b /> }
					) }
				</span>
				<span>
					{ createInterpolateElement(
						sprintf(
							/* translators: %s: Zero-padded seconds. */ _n(
								'<time>%s</time>s',
								'<time>%s</time>s',
								sec,
								'mix-and-max-box-builder'
							),
							p( sec )
						),
						{ time: <b /> }
					) }
				</span>
			</span>
		</div>
	);
}
