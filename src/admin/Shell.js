import { __ } from '@wordpress/i18n';
import { AdminShell, Button } from '../components';
import { HELP_URL } from './constants';
import { useAdmin } from './context';

// The shell never adds a second sidebar: it is a top bar with real admin.php links.
export default function Shell( { active, viewStore, children } ) {
	const { urls, storeUrl } = useAdmin();
	const nav = [
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
	].map( ( item ) => ( { ...item, href: urls[ item.id ] } ) );

	return (
		<AdminShell
			active={ active }
			nav={ nav }
			right={
				<>
					{ viewStore ? (
						<Button
							variant="ghost"
							size="sm"
							icon="external"
							href={ storeUrl }
							target="_blank"
							rel="noopener noreferrer"
						>
							{ __( 'View store', 'mix-and-max-box-builder' ) }
						</Button>
					) : null }
					<Button
						variant="ghost"
						size="sm"
						icon="help"
						href={ HELP_URL }
						target="_blank"
						rel="noopener noreferrer"
					>
						{ __( 'Help', 'mix-and-max-box-builder' ) }
					</Button>
				</>
			}
		>
			{ children }
		</AdminShell>
	);
}
