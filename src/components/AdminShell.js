import { __ } from '@wordpress/i18n';
import Icon from './Icon';
import Button from './Button';
import { cx } from './utils';

const ADMIN_NAV = [
	{
		id: 'dashboard',
		label: __( 'Dashboard', 'mix-and-max-box-builder' ),
		icon: 'dashboard',
	},
	{
		id: 'campaigns',
		label: __( 'Campaigns', 'mix-and-max-box-builder' ),
		icon: 'campaign',
	},
	{
		id: 'analytics',
		label: __( 'Analytics', 'mix-and-max-box-builder' ),
		icon: 'analytics',
	},
	{
		id: 'settings',
		label: __( 'Settings', 'mix-and-max-box-builder' ),
		icon: 'settings',
	},
];
export default function AdminShell( {
	active = 'dashboard',
	onNavigate,
	nav = ADMIN_NAV,
	right,
	children,
} ) {
	return (
		<div className="mmbb-shell">
			<header className="mmbb-shell__bar">
				<div className="mmbb-shell__brand">
					<span className="mmbb-logo-tile" aria-hidden="true">
						<Icon name="box" size={ 18 } strokeWidth={ 2.25 } />
					</span>
					<span className="mmbb-shell__name">
						{ __( 'Mix and Max', 'mix-and-max-box-builder' ) }
					</span>
					<span className="mmbb-shell__tag">
						{ __( 'Box Builder', 'mix-and-max-box-builder' ) }
					</span>
				</div>
				<nav
					className="mmbb-shell__nav"
					aria-label={ __(
						'Mix and Max Box Builder',
						'mix-and-max-box-builder'
					) }
				>
					{ nav.map( ( n ) => (
						<a
							key={ n.id }
							href={ n.href || '#/' + n.id }
							aria-current={
								active === n.id ? 'page' : undefined
							}
							className={ cx(
								'mmbb-shell__link',
								active === n.id && 'is-active'
							) }
							onClick={ ( e ) => {
								if ( onNavigate && ! n.href ) {
									e.preventDefault();
									onNavigate( n.id );
								}
							} }
						>
							<Icon name={ n.icon } size={ 18 } />
							{ n.label }
							{ n.count !== null && n.count !== undefined ? (
								<span className="mmbb-shell__count">
									{ n.count }
								</span>
							) : null }
						</a>
					) ) }
				</nav>
				<div className="mmbb-shell__right">
					{ right !== undefined ? (
						right
					) : (
						<Button variant="ghost" size="sm" icon="help">
							{ __( 'Help', 'mix-and-max-box-builder' ) }
						</Button>
					) }
				</div>
			</header>
			<main className="mmbb-shell__main">{ children }</main>
		</div>
	);
}
