# TextField

Labelled text input with help, error, prefix and suffix.

- Provide `label` (sentence case, no colon), and `help` when the consequence isn't obvious ("Shoppers see 12 slots."). `error` replaces help and marks the field invalid.
- `prefix` takes text (`$`) or an icon name (`search`, `calendar`); `suffix` takes a unit ("items", "%", "per box").
- `multiline` renders a textarea (gift messages). Pass any input attribute through (`value`, `onChange`, `placeholder`, `type`).
- Without a visible label (toolbar search), pass `aria-label`.
