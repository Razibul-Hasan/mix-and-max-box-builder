import { isValidElement } from '@wordpress/element';
import Icon from './Icon';
import { cx } from './utils';

export default function Steps( { steps = [], current = 0, onStep, compact } ) {
	return (
		<ol className={ cx( 'mmbb-steps', compact && 'mmbb-steps--compact' ) }>
			{ steps.map( ( s, i ) => {
				const state =
					i < current
						? 'is-done'
						: i === current
						? 'is-current'
						: 'is-next';
				const label =
					s && typeof s === 'object' && ! isValidElement( s )
						? s.label
						: s;
				const href =
					s && typeof s === 'object' && ! isValidElement( s )
						? s.href
						: undefined;
				const inner = (
					<>
						<span className="mmbb-step__dot">
							{ i < current ? (
								<Icon
									name="check"
									size={ 14 }
									strokeWidth={ 2.75 }
								/>
							) : (
								i + 1
							) }
						</span>
						<span className="mmbb-step__label">{ label }</span>
					</>
				);
				return (
					<li
						key={ i }
						className={ cx( 'mmbb-step', state ) }
						aria-current={ i === current ? 'step' : undefined }
					>
						{ href ? (
							<a className="mmbb-step__btn" href={ href }>
								{ inner }
							</a>
						) : onStep ? (
							<button
								type="button"
								className="mmbb-step__btn"
								onClick={ () => onStep( i ) }
							>
								{ inner }
							</button>
						) : (
							inner
						) }
						{ i < steps.length - 1 ? (
							<span
								className="mmbb-step__line"
								aria-hidden="true"
							/>
						) : null }
					</li>
				);
			} ) }
		</ol>
	);
}
