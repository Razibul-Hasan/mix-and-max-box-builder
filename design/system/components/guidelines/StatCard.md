# StatCard

A KPI tile: label, value, signed delta against a named period, and a 12-point sparkline whose last segment is in `chart-1`.

- Provide `label` (sentence case, no colon), `value` (pre-formatted, compact from 10K), `delta` (percent, signed), `deltaLabel`, `trend` (12 numbers).
- Set `upIsGood={false}` for costs such as Discount given: a rise then shows in `alert`.
- Four per row on desktop; values use proportional figures.
