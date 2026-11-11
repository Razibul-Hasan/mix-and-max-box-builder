import { CheckboxControl } from '@wordpress/components';
import { useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Value a row is sorted by for a column.
 *
 * @param {Object} column Column definition.
 * @param {Object} row    Row data.
 * @return {*} Comparable value.
 */
function sortValue( column, row ) {
	if ( column.sortValue ) {
		return column.sortValue( row );
	}
	return row[ column.key ];
}

/**
 * Compare two values: numbers numerically, everything else as text in the
 * user's locale.
 *
 * @param {*} a First value.
 * @param {*} b Second value.
 * @return {number} Negative, zero or positive.
 */
function compare( a, b ) {
	if ( typeof a === 'number' && typeof b === 'number' ) {
		return a - b;
	}
	return String( a ?? '' ).localeCompare( String( b ?? '' ), undefined, {
		numeric: true,
		sensitivity: 'base',
	} );
}

/**
 * A plain, accessible table in the design's style, with optional sorting and
 * row selection.
 *
 * Sorting is controlled when `sort` and `onSort` are passed (for server-side
 * order) and handled here otherwise. Selection is always controlled.
 *
 * @param {Object}   props
 * @param {Array}    props.columns      { key, label, render?, sortable?, sortValue?, numeric?, hideLabel? }.
 * @param {Array}    props.rows         Row objects.
 * @param {Function} props.rowKey       Row => unique key. Defaults to row.id.
 * @param {string}   props.caption      Accessible name, visually hidden.
 * @param {Object}   props.sort         { key, direction: 'asc' | 'desc' }.
 * @param {Function} props.onSort       Called with the next sort.
 * @param {Array}    props.selected     Keys of the selected rows.
 * @param {Function} props.onSelect     Called with the next list of keys. Turns selection on.
 * @param {Function} props.rowLabel     Row => name used for its checkbox label.
 * @param {*}        props.emptyMessage Shown in one cell when there are no rows.
 */
export default function DataTable( {
	columns,
	rows,
	rowKey = ( row ) => row.id,
	caption,
	sort,
	onSort,
	selected = [],
	onSelect,
	rowLabel,
	emptyMessage,
} ) {
	const [ ownSort, setOwnSort ] = useState( null );
	const controlled = sort !== undefined && typeof onSort === 'function';
	const current = controlled ? sort : ownSort;

	const sorted = useMemo( () => {
		if ( controlled || ! current ) {
			return rows;
		}
		const column = columns.find( ( c ) => c.key === current.key );
		if ( ! column ) {
			return rows;
		}
		const sign = current.direction === 'desc' ? -1 : 1;
		return [ ...rows ].sort(
			( a, b ) =>
				sign * compare( sortValue( column, a ), sortValue( column, b ) )
		);
	}, [ rows, columns, current, controlled ] );

	const toggleSort = ( key ) => {
		const next =
			current && current.key === key && current.direction === 'asc'
				? { key, direction: 'desc' }
				: { key, direction: 'asc' };
		if ( controlled ) {
			onSort( next );
		} else {
			setOwnSort( next );
		}
	};

	const selectable = typeof onSelect === 'function';
	const keys = sorted.map( rowKey );
	const chosen = keys.filter( ( k ) => selected.includes( k ) );
	const all = keys.length > 0 && chosen.length === keys.length;
	const some = chosen.length > 0 && ! all;
	const span = columns.length + ( selectable ? 1 : 0 );

	return (
		<div className="mmbb-app-table-wrap">
			<table className="mmbb-app-table">
				{ caption ? (
					<caption className="screen-reader-text">
						{ caption }
					</caption>
				) : null }
				<thead>
					<tr>
						{ selectable ? (
							<th scope="col" className="mmbb-app-table__check">
								<CheckboxControl
									__nextHasNoMarginBottom
									checked={ all }
									indeterminate={ some }
									disabled={ keys.length === 0 }
									aria-label={ __(
										'Select all rows',
										'productboxes-mix-and-match-box-builder'
									) }
									onChange={ ( on ) =>
										onSelect( on ? keys : [] )
									}
								/>
							</th>
						) : null }
						{ columns.map( ( column ) => {
							const active =
								current && current.key === column.key;
							let ariaSort;
							if ( active ) {
								ariaSort =
									current.direction === 'desc'
										? 'descending'
										: 'ascending';
							}
							return (
								<th
									key={ column.key }
									scope="col"
									aria-sort={ ariaSort }
									className={
										column.numeric
											? 'is-numeric'
											: undefined
									}
								>
									{ column.hideLabel ? (
										<span className="screen-reader-text">
											{ column.label }
										</span>
									) : null }
									{ ! column.hideLabel && column.sortable ? (
										<button
											type="button"
											className="mmbb-app-table__sort"
											onClick={ () =>
												toggleSort( column.key )
											}
										>
											{ column.label }
											<span
												className="mmbb-app-table__arrow"
												aria-hidden="true"
											>
												{ active &&
												current.direction === 'desc'
													? '↓'
													: '↑' }
											</span>
										</button>
									) : null }
									{ ! column.hideLabel && ! column.sortable
										? column.label
										: null }
								</th>
							);
						} ) }
					</tr>
				</thead>
				<tbody>
					{ sorted.length === 0 ? (
						<tr>
							<td
								colSpan={ span }
								className="mmbb-app-table__empty"
							>
								{ emptyMessage ||
									__(
										'Nothing to show yet.',
										'productboxes-mix-and-match-box-builder'
									) }
							</td>
						</tr>
					) : null }
					{ sorted.map( ( row ) => {
						const key = rowKey( row );
						const isOn = selected.includes( key );
						return (
							<tr
								key={ key }
								className={ isOn ? 'is-selected' : undefined }
							>
								{ selectable ? (
									<td className="mmbb-app-table__check">
										<CheckboxControl
											__nextHasNoMarginBottom
											checked={ isOn }
											aria-label={ sprintf(
												/* translators: %s: Campaign name. */
												__(
													'Select %s',
													'productboxes-mix-and-match-box-builder'
												),
												rowLabel
													? rowLabel( row )
													: String( key )
											) }
											onChange={ ( on ) =>
												onSelect(
													on
														? [ ...selected, key ]
														: selected.filter(
																( k ) =>
																	k !== key
														  )
												)
											}
										/>
									</td>
								) : null }
								{ columns.map( ( column ) => (
									<td
										key={ column.key }
										className={
											column.numeric
												? 'is-numeric'
												: undefined
										}
									>
										{ column.render
											? column.render( row )
											: row[ column.key ] }
									</td>
								) ) }
							</tr>
						);
					} ) }
				</tbody>
			</table>
		</div>
	);
}
