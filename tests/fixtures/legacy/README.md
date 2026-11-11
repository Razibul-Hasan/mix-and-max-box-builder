# Legacy fixtures (plugin 1.0.0)

Data exactly as plugin 1.0.0 stored it, exported on 2026-11-11 (Redesign Part 1) by running the
1.0.0 code against a test database. `tests/php/integration/LegacyFixturesTest.php` loads these
rows, runs the upgrade routine, and checks that each box still reads, prices, renders and adds to
the cart, and that the order still shows its box.

Never regenerate these files from newer code: they are the record of what 1.0.0 wrote.

| File | What it holds |
| --- | --- |
| `products.json` | Six simple products (ids 9101–9106) the boxes use; 9103 is on sale, 9106 is the free gift |
| `box-tiered.json` | Post 9201 "Holiday treat box": tiered, three percent tiers, a per-product cap, a schedule with a countdown, gift note and gift wrap with a fee |
| `box-fixed.json` | Post 9202 "Cookie box in three sizes": fixed sizes using all three discount types (`fixed_amount`, `box_price`, `percent`) and both size tags, a free gift, dark theme, custom accent and ladder colours, `layout: bar`, 3 columns, no hero |
| `box-bundle.json` | Post 9203 "Any 3 for 12": bundle price, no duplicates, `layout: panel`, custom theme and countdown colours, ladder and stickers off |
| `settings.json` | The `mmbb_settings` option with several keys changed from their defaults |
| `order-with-box.json` | A processing order with the tiered box as one line: every line meta row, including the visible labels and `_mmbb_stock_reduced` |
| `expected.json` | What 1.0.0 answered: the read-back config, the quote, the free gift, the payload keys and product prices, and the order totals |

Each box file has the `mmbb_campaign` post, its raw meta (`_mmbb_config` is the JSON string as
stored) and its hidden container product (9301–9303, `_mmbb_campaign_id`). Amounts in
`expected.json` are integer minor units (cents), store currency USD with 2 decimals.
