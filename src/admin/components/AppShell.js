import { Icon } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { help } from '@wordpress/icons';

const HIRE_EXPERT_URL =
	'https://bestwebexpert.com/?utm_source=productbox_Plugin&utm_medium=dashboard&utm_campaign=productbox_traffic';

/**
 * The box mark from the design: an open box drawn in strokes.
 *
 * @param {Object} props
 * @param {string} props.src Plugin icon address; the drawn mark shows without it.
 */
function LogoMark( { src } ) {
	if ( src ) {
		return (
			<img
				className="mmbb-app__mark-img"
				src={ src }
				alt=""
				width="28"
				height="28"
			/>
		);
	}
	return (
		<span className="mmbb-app__mark" aria-hidden="true">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				focusable="false"
			>
				<path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z" />
				<path d="M3 7.5v9L12 21l9-4.5v-9M12 12v9" />
			</svg>
		</span>
	);
}

/**
 * Admin app shell: a white header with the logo, real admin.php nav links and
 * Help, over a content area at most 1160px wide.
 *
 * @param {Object}  props
 * @param {string}  props.active   Id of the current nav item.
 * @param {Array}   props.nav      Items: { id, label, href }.
 * @param {string}  props.helpUrl  Address the Help link opens.
 * @param {string}  props.logoUrl  Plugin icon shown in the header.
 * @param {*}       props.actions  Extra controls shown before Help.
 * @param {boolean} props.wide     Let the content use the full width.
 * @param {*}       props.children Page content.
 */
export default function AppShell( {
	active,
	nav = [],
	helpUrl,
	logoUrl,
	actions,
	wide = false,
	children,
} ) {
	return (
		<div className="mmbb-app">
			<header className="mmbb-app__head">
				<div className="mmbb-app__logo">
					<LogoMark src={ logoUrl } />
					{ __(
						'ProductBoxes',
						'productboxes-mix-and-match-box-builder'
					) }
				</div>
				<nav
					className="mmbb-app__nav"
					aria-label={ __(
						'ProductBoxes',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					{ nav.map( ( item ) => (
						<a
							key={ item.id }
							href={ item.href }
							className={
								active === item.id ? 'is-current' : undefined
							}
							aria-current={
								active === item.id ? 'page' : undefined
							}
						>
							{ item.label }
						</a>
					) ) }
				</nav>
				<div className="mmbb-app__actions">
					{ actions }
					{ /* A normal link: no nofollow, so it passes link value. */ }
					<a
						className="mmbb-app__cta"
						href={ HIRE_EXPERT_URL }
						target="_blank"
						rel="noopener noreferrer"
					>
						{ __(
							'Get Expert Help',
							'productboxes-mix-and-match-box-builder'
						) }
					</a>
					{ helpUrl ? (
						<a
							href={ helpUrl }
							target="_blank"
							rel="noopener noreferrer"
						>
							<Icon icon={ help } size={ 18 } />
							{ __(
								'Help',
								'productboxes-mix-and-match-box-builder'
							) }
						</a>
					) : null }
				</div>
			</header>
			<main
				className={ wide ? 'mmbb-app__main is-wide' : 'mmbb-app__main' }
			>
				{ children }
			</main>
		</div>
	);
}
