import { __, _n, sprintf } from '@wordpress/i18n';
import Checkbox from './Checkbox';
import { cx, useControlled } from './utils';

export default function DataTable( {
	columns = [],
	rows = [],
	rowKey = 'id',
	selectable,
	selected,
	defaultSelected = [],
	onSelectionChange,
	onRowClick,
	bulkActions,
	empty,
	dense,
} ) {
	const [ sel, setSel ] = useControlled(
		selected,
		defaultSelected,
		onSelectionChange
	);
	const all = rows.length > 0 && sel.length === rows.length;
	const some = sel.length > 0 && ! all;
	const toggleAll = () =>
		setSel( all ? [] : rows.map( ( r ) => r[ rowKey ] ) );
	return (
		<div className="mmbb-table-wrap">
			{ selectable && sel.length > 0 ? (
				<div className="mmbb-table__bulk">
					<Checkbox
						checked={ all }
						indeterminate={ some }
						onChange={ toggleAll }
						label={ sprintf(
							/* translators: %d: Number of items. */ _n(
								'%d selected',
								'%d selected',
								sel.length,
								'mix-and-max-box-builder'
							),
							sel.length
						) }
					/>
					<div className="mmbb-table__bulk-actions">
						{ bulkActions }
					</div>
				</div>
			) : null }
			<table className={ cx( 'mmbb-table', dense && 'is-dense' ) }>
				<thead>
					<tr>
						{ selectable ? (
							<th className="mmbb-table__check">
								<Checkbox
									aria-label={ __(
										'Select all',
										'mix-and-max-box-builder'
									) }
									checked={ all }
									indeterminate={ some }
									onChange={ toggleAll }
								/>
							</th>
						) : null }
						{ columns.map( ( c ) => (
							<th
								key={ c.key }
								style={ { width: c.width } }
								className={ c.numeric ? 'is-num' : undefined }
							>
								{ c.label }
							</th>
						) ) }
					</tr>
				</thead>
				<tbody>
					{ rows.length === 0 ? (
						<tr>
							<td
								colSpan={
									columns.length + ( selectable ? 1 : 0 )
								}
								className="mmbb-table__empty"
							>
								{ empty ||
									__(
										'Nothing here yet.',
										'mix-and-max-box-builder'
									) }
							</td>
						</tr>
					) : (
						rows.map( ( r ) => {
							const k = r[ rowKey ];
							const isSel = sel.indexOf( k ) !== -1;
							return (
								<tr
									key={ k }
									className={ cx(
										isSel && 'is-selected',
										onRowClick && 'is-clickable'
									) }
									onClick={
										onRowClick
											? () => onRowClick( r )
											: undefined
									}
								>
									{ selectable ? (
										<td
											className="mmbb-table__check"
											onClick={ ( e ) =>
												e.stopPropagation()
											}
										>
											<Checkbox
												aria-label={ sprintf(
													/* translators: %s: Row identifier. */ __(
														'Select row %s',
														'mix-and-max-box-builder'
													),
													k
												) }
												checked={ isSel }
												onChange={ () =>
													setSel(
														isSel
															? sel.filter(
																	( x ) =>
																		x !== k
															  )
															: sel.concat( [
																	k,
															  ] )
													)
												}
											/>
										</td>
									) : null }
									{ columns.map( ( c ) => (
										<td
											key={ c.key }
											className={
												c.numeric ? 'is-num' : undefined
											}
										>
											{ c.render
												? c.render( r )
												: r[ c.key ] }
										</td>
									) ) }
								</tr>
							);
						} )
					) }
				</tbody>
			</table>
		</div>
	);
}
