# LineChart

A responsive SVG line chart with a crosshair tooltip (pointer and arrow keys), legend for 2+ series, an end label on the hero series and a hidden data table for screen readers.

- Provide `labels` (x values) and `series` (`{name, data, color, area?, label?}`). Colours are tokens: the hero series `chart-1`, the comparison `chart-muted`; `chart-2`/`chart-3` for extra campaigns (max 3 lines).
- Pass `formatValue` for tooltips and `formatTick` for the y-axis (`formatCompact(v, '$')`).
- One y-axis only. A second measure gets its own chart.
