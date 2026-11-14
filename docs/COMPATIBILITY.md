# Compatibility with other plugins and themes

Everything that makes ProductBoxes work with another plugin or a theme lives in `includes/compatibility/`.
Core code (cart, pricing, storefront) never checks for a specific plugin. It only exposes hooks, and an
integration turns those hooks on when its plugin or theme is active.

```text
includes/compatibility/
  class-compatibility.php        The list of integrations and the loader. Add new ones here.
  class-integration.php          Base class every integration extends.
  plugins/class-woo-payments.php WooPayments (Multi-Currency and express checkout).
  themes/                        Theme integrations (created with the first one).
```

An integration is created on `init` and only registered when `is_active()` returns true, so a store
that does not use the plugin or theme pays nothing for it.

## Add a plugin

1. Create `includes/compatibility/plugins/class-<name>.php`. The class name and file follow the
   autoloader: `Plugins\Acme_Shop` lives in `plugins/class-acme-shop.php`.
2. List it in `Compatibility::integrations()` under `// Plugins.`

```php
namespace MixMax\BoxBuilder\Compatibility\Plugins;

use MixMax\BoxBuilder\Compatibility\Integration;

defined( 'ABSPATH' ) || exit;

final class Acme_Shop extends Integration {
	public function is_active() {
		return class_exists( 'Acme_Shop' );
	}

	public function register() {
		add_filter( 'mmbb_convert_amount', array( $this, 'convert_amount' ), 10, 2 );
	}
}
```

## Add a theme

Same steps, with the file in `includes/compatibility/themes/` and `Themes\Astra` in the list. Use
`theme_is()` from the base class. It is true for the theme and for any child theme of it.

```php
namespace MixMax\BoxBuilder\Compatibility\Themes;

use MixMax\BoxBuilder\Compatibility\Integration;

defined( 'ABSPATH' ) || exit;

final class Astra extends Integration {
	public function is_active() {
		return $this->theme_is( 'astra' );
	}

	public function register() {
		add_action( 'wp_enqueue_scripts', array( $this, 'style' ), 20 );
	}

	public function style() {
		wp_add_inline_style( 'mmbb-storefront', '.mmbb-theme-astra .mmbb-builder { margin-top: 0; }' );
	}
}
```

Plain style fixes need no PHP class: every page already gets a `mmbb-theme-<theme>` body class
(and one for the parent theme of a child theme), so a rule such as
`.mmbb-theme-astra .mmbb-builder { ... }` in `src/storefront/storefront.css` is enough.

## Add one from another plugin or a theme

Without touching this plugin, add a class that extends `MixMax\BoxBuilder\Compatibility\Integration`
and list it with the filter:

```php
add_filter( 'mmbb_compatibility_integrations', function ( $classes ) {
	$classes[] = My_Box_Integration::class;
	return $classes;
} );
```

## Hooks an integration can use

| Hook | Use |
| --- | --- |
| `mmbb_convert_amount` | Convert an amount a merchant typed (store currency) into the shopper's currency. `$kind` is `price`, `discount` or `fee`. For multi-currency plugins. |
| `mmbb_products_cache_context` | Return a string that names what makes cached product prices differ (for example the currency), so visitors do not share one cached list. |
| `mmbb_pricing_quote` | Adjust a finished quote. |
| `mmbb_compatibility_integrations` | Add or remove integration classes. |

Cart lines are priced in `Cart_Lines::reprice()` on `woocommerce_before_calculate_totals` at priority 20.
Anything that must run after a box line has its price set should use priority 30 or later.

## WooPayments

Active when `WC_Payments` exists. What it does and why:

- **Multi-Currency, no double conversion.** WooPayments converts every `get_price()` on the storefront.
  A box line already has its price set from converted product prices, so converting again would
  multiply it. After pricing, box lines (and the hidden container product) are marked, and the
  `wcpay_multi_currency_should_convert_product_price` filter skips them.
- **Multi-Currency, campaign amounts.** A fixed discount, box price, bundle price and gift wrap fee are
  typed in the store currency. They are converted with WooPayments' own `get_price()`: box and bundle
  prices as `product` (rounding and charm pricing), discounts and fees as `coupon` (plain rounding).
  This happens for the server quote and for the amounts sent to the storefront, so the two agree.
  Amounts are only converted in requests where WooPayments converts product prices (not wp-admin).
- **Cached product lists** are kept per currency, because they contain prices.
- **Express checkout (Apple Pay, Google Pay, Link).** The hidden container product is excluded through
  `wcpay_payment_request_is_product_supported`, because a box is built in the builder. The cart and
  checkout buttons work with box lines as they are.

Not covered: full-page caching that ignores the shopper's currency (use a cache that varies by the
WooPayments currency cookie), and analytics totals, which are stored in the order currency.
