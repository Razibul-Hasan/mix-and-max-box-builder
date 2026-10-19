# ProductTile

The Shopify-style product card for the builder grid: square image, name, meta, price with compare-at, low-stock line, and one action that changes state.

- Provide `name`, `price`, `image` (or `art`), optional `compareAt`, `meta`, `badge` (+ `badgeTone`; `deal` renders a sticker), `stock`.
- State comes from you: `qty` (how many are in the box), `onAdd()`, `onChange(qty)`, `boxFull`.
- States: Add to box (ink) → in box (ink border, Max Orange count chip, ink stepper) → Box is full (disabled) → Sold out (`stock` 0).
- Stock 1–5 shows "Only N left" in `max-strong` with a flame.
