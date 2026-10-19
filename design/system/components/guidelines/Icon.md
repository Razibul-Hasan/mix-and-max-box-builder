# Icon

The one stroke icon set for admin and storefront: 50 glyphs on a 24px grid, 1.75 stroke, round caps.

- Provide `name` (see the Foundations card or `Icon.names`). `size` defaults to 20; use 16 inside small buttons and badges, 18 in nav, 22 on tiles.
- Icons inherit `currentColor`, so colour them with the text token of their context, never a raw hex.
- Decorative by default (`aria-hidden`). Pass `title` only when an icon stands alone and means something; icon-only buttons take `aria-label` on the Button instead.
- Do: pair status icons with a word. Don't: mix in another icon family or emoji.
