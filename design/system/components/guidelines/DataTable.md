# DataTable

A sortable-ready table with optional row selection and a Max-soft bulk-action bar.

- Provide `columns` (`{key, label, render?, numeric?, width?}`) and `rows` (each with `id` or your `rowKey`). `numeric` right-aligns with tabular figures.
- `selectable` adds checkboxes; pass `bulkActions` (small buttons) to show while rows are selected. Control selection with `selected` + `onSelectionChange`.
- Put it in `Card padding="none"`. First column: bold title plus a muted meta line (`mmbb-cell-title`, `mmbb-cell-meta`).
