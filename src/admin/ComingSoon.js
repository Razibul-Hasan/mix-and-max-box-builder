import { __ } from '@wordpress/i18n';
import { Button, Card, EmptyState, PageHeader } from '../components';
import { useAdmin } from './context';
import Shell from './Shell';

// Screens built in a later release show where they will live instead of a blank page.
export default function ComingSoon( { active, title, headline, back } ) {
	const { urls } = useAdmin();
	return (
		<Shell active={ active }>
			<PageHeader
				title={ title }
				backLabel={
					back
						? __( 'Campaigns', 'mix-and-max-box-builder' )
						: undefined
				}
				backHref={ back ? urls.campaigns : undefined }
			/>
			<Card padding="none">
				<EmptyState
					icon="sparkle"
					title={ headline }
					description={ __(
						'This screen is not available in this version yet.',
						'mix-and-max-box-builder'
					) }
					action={
						<Button variant="primary" href={ urls.dashboard }>
							{ __(
								'Back to dashboard',
								'mix-and-max-box-builder'
							) }
						</Button>
					}
				/>
			</Card>
		</Shell>
	);
}
