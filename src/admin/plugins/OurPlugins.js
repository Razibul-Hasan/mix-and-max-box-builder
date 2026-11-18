import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PageHeader } from '../components';
import { useAdmin } from '../context';
import Shell from '../Shell';
import './plugins.css';

function actionLabel( status ) {
	if ( status === 'active' ) {
		return __( 'Active', 'productboxes-mix-and-match-box-builder' );
	}
	if ( status === 'installed' ) {
		return __( 'Activate', 'productboxes-mix-and-match-box-builder' );
	}
	return __( 'Install Now', 'productboxes-mix-and-match-box-builder' );
}

function renderAction( plugin, state, install ) {
	if ( plugin.status === 'active' ) {
		return (
			<span className="mmbb-plugins__button is-active">
				{ actionLabel( 'active' ) }
			</span>
		);
	}
	if ( state.installed ) {
		return (
			<a
				className="mmbb-plugins__button"
				href={ state.activateUrl || plugin.action_url }
			>
				{ actionLabel( 'installed' ) }
			</a>
		);
	}
	if ( plugin.can_install ) {
		return (
			<>
				<button
					type="button"
					className="mmbb-plugins__button"
					disabled={ state.busy }
					onClick={ () => install( plugin ) }
				>
					{ state.busy
						? __(
								'Installing…',
								'productboxes-mix-and-match-box-builder'
						  )
						: actionLabel( 'missing' ) }
				</button>
				{ state.error ? (
					<span className="mmbb-plugins__error" role="alert">
						{ state.error }
					</span>
				) : null }
			</>
		);
	}
	return (
		<a className="mmbb-plugins__button" href={ plugin.action_url }>
			{ actionLabel( plugin.status ) }
		</a>
	);
}

/**
 * Other plugins from the same author. The list comes from PHP
 * (Our_Plugins::plugins, filter mmbb_our_plugins), with each plugin's install state.
 */
export default function OurPlugins() {
	const { plugins = [] } = useAdmin();
	// Per-slug result of an install started on this page.
	const [ installs, setInstalls ] = useState( {} );

	const install = ( plugin ) => {
		const updates = window.wp && window.wp.updates;
		const set = ( value ) =>
			setInstalls( ( all ) => ( { ...all, [ plugin.slug ]: value } ) );
		if ( ! updates ) {
			window.location.href = plugin.url;
			return;
		}
		set( { busy: true } );
		updates.installPlugin( {
			slug: plugin.slug,
			success: ( response ) =>
				set( { installed: true, activateUrl: response.activateUrl } ),
			error: ( response ) =>
				set( {
					error:
						( response && response.errorMessage ) ||
						__(
							'Could not install the plugin.',
							'productboxes-mix-and-match-box-builder'
						),
				} ),
		} );
	};

	return (
		<Shell active="plugins">
			<div className="mmbb-plugins">
				<PageHeader
					title={ __(
						'Plugins',
						'productboxes-mix-and-match-box-builder'
					) }
					description={ __(
						'More free plugins from bestwebexpert.',
						'productboxes-mix-and-match-box-builder'
					) }
				/>
				<div className="mmbb-plugins__grid">
					{ plugins.map( ( plugin ) => (
						<div
							className="mmbb-app-card mmbb-plugins__card"
							key={ plugin.url }
						>
							<div className="mmbb-app-card__head mmbb-plugins__head">
								{ plugin.logo ? (
									<img
										className="mmbb-plugins__logo"
										src={ plugin.logo }
										alt=""
										width="40"
										height="40"
									/>
								) : (
									<span
										className="mmbb-plugins__mark"
										aria-hidden="true"
									>
										{ plugin.name.charAt( 0 ) }
									</span>
								) }
								<h2>{ plugin.name }</h2>
								<span className="mmbb-plugins__badge">
									{ __(
										'Free',
										'productboxes-mix-and-match-box-builder'
									) }
								</span>
							</div>
							<div className="mmbb-app-card__body mmbb-plugins__body">
								<p>{ plugin.description }</p>
								<a
									href={ plugin.url }
									target="_blank"
									rel="noopener noreferrer"
								>
									{ __(
										'Plugin details on WordPress.org',
										'productboxes-mix-and-match-box-builder'
									) }
								</a>
							</div>
							<div className="mmbb-app-card__foot mmbb-plugins__foot">
								{ renderAction(
									plugin,
									installs[ plugin.slug ] || {},
									install
								) }
							</div>
						</div>
					) ) }
				</div>
			</div>
		</Shell>
	);
}
