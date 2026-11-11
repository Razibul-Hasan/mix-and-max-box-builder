import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { external } from '@wordpress/icons';
import { AppShell } from './components';
import { HELP_URL } from './constants';
import { useAdmin } from './context';

/**
 * Every admin screen renders inside this. It feeds AppShell the real admin.php
 * links (frozen page slugs from window.mmbbAdmin.urls), so the browser's back
 * button and the WordPress menu keep working.
 *
 * @param {Object}  props
 * @param {string}  props.active    Page id: dashboard, campaigns, analytics or settings.
 * @param {boolean} props.viewStore Show a "View store" link in the header.
 * @param {boolean} props.wide      Let the content use the full width.
 * @param {*}       props.children  Screen content.
 */
export default function Shell( { active, viewStore, wide, children } ) {
	const { urls, storeUrl } = useAdmin();
	const nav = [
		{
			id: 'dashboard',
			label: __( 'Home', 'productboxes-mix-and-match-box-builder' ),
		},
		{
			id: 'campaigns',
			label: __( 'Boxes', 'productboxes-mix-and-match-box-builder' ),
		},
		{
			id: 'analytics',
			label: __( 'Analytics', 'productboxes-mix-and-match-box-builder' ),
		},
		{
			id: 'settings',
			label: __( 'Settings', 'productboxes-mix-and-match-box-builder' ),
		},
	].map( ( item ) => ( { ...item, href: urls[ item.id ] } ) );

	return (
		<AppShell
			active={ active }
			nav={ nav }
			helpUrl={ HELP_URL }
			wide={ wide }
			actions={
				viewStore ? (
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						icon={ external }
						iconPosition="right"
						href={ storeUrl }
						target="_blank"
						rel="noopener noreferrer"
					>
						{ __(
							'View store',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				) : null
			}
		>
			{ children }
		</AppShell>
	);
}
