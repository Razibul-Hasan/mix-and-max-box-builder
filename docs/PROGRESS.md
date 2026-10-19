# Build progress

Updated by the agent at the end of every phase. Newest entry first under each phase.

| Phase | Title | Status | Commit |
| --- | --- | --- | --- |
| 0 | Tooling and repository | done; Docker checks skipped | `Phase 0: Tooling and repository` |
| 1 | Plugin skeleton and lifecycle | not started | |
| 2 | Design system inside the plugin | not started | |
| 3 | Data layer and pricing engine | not started | |
| 4 | REST API for the admin | not started | |
| 5 | Admin app: shell, dashboard, campaigns | not started | |
| 6 | Campaign wizard | not started | |
| 7 | Cart, orders and stock | not started | |
| 8 | Storefront: block, shortcode, builder | not started | |
| 9 | Analytics | not started | |
| 10 | Settings screen and emails | not started | |
| 11 | Hardening and WordPress.org compliance | not started | |
| 12 | Release and submission | not started | |

## Pinned versions

Record exact versions installed in Phase 0 (WordPress in wp-env, WooCommerce, PHP in wp-env, Node, @wordpress/scripts, @wordpress/env, WPCS, PHPUnit).

Phase 0 uses committed `package-lock.json` and `composer.lock` for exact dependency
resolution. Composer's platform is PHP 7.4.33, so dev dependencies remain
installable on the minimum supported PHP branch.

| Tool | Version |
| --- | --- |
| Node / npm used locally | 24.21.0 / 11.19.0 |
| Node minimum for the resolved toolchain | 20.19.0 |
| @wordpress/scripts | 31.8.0 (Node 20 compatible; 36.1.0 requires Node 22+) |
| @wordpress/env | 10.30.0 (Docker workflow; Node 20 compatible) |
| @testing-library/react | 16.3.3 |
| TypeScript (dev tool peer pin) | 5.9.3 |
| @wordpress/element / @wordpress/i18n | 9.0.0 / 6.30.0 |
| Composer used locally | 2.10.3 |
| PHP used locally | 8.2.29 (Local's existing CLI binary) |
| WPCS / PHPCompatibilityWP / PHP_CodeSniffer | 3.4.1 / 2.1.8 / 3.13.6 |
| PHPUnit / PHPUnit Polyfills / wp-phpunit | 9.6.38 / 4.0.0 / 6.9.8 |
| PHP in wp-env | 8.2 configured; not installed here (Docker unavailable) |
| WordPress / WooCommerce / Plugin Check in wp-env | Not installed here; latest release URLs configured, exact installed versions pending Docker run |

## Log

### Phase 0 — Tooling and repository (2026-10-19)

**Done:** Added private npm tooling, webpack extension with admin/storefront
placeholders and default block discovery, WordPress lint/format configs, Composer
dev tools, PHPCS/PHPCompatibility rules, two PHPUnit suites, React/PHP smoke tests,
wp-env config, GPLv2 licence, editor/Git settings, and release allowlist/exclusions.
Added the exact integration command and PHP override instructions to `AGENTS.md`.

**Decisions:** Only the two WordPress runtime packages currently imported are
direct dependencies; add other WordPress packages as later phases import them.
Pin `@wordpress/scripts` 31.8.0 for Node 20 compatibility. The `tokens` command is
reserved now; its generator and generated tokens intentionally arrive in Phase 2.
Pin wp-env 10.30.0 because newer versions pull Playground packages requiring Node
24.18+. Pin TypeScript 5.9.3 because npm otherwise selects TypeScript 7, which the
WordPress ESLint tooling cannot load. Checked every declared Node engine in the
resolved lockfile against Node 20.19.0: no incompatible package remains. This is
an engine-range check; commands were executed on Node 24.21.0.

**Deviations from the plan (and why):** The supplied starter kit had `docs/` and
`design/` nested under `mix-and-max-starter-kit/` and no Git repository. Moved the
two folders to the plugin root, initialized Git, and committed `Starter kit`
(`4f9ff1a`). A guarded no-op plugin header lets wp-env recognize the mapped plugin;
the actual bootstrap, lifecycle, uninstall and readme remain Phase 1 work. The
test bootstrap establishes `ABSPATH` before its guard, because pure PHPUnit runs
without WordPress; this test-only entry point is excluded from the release.

**Integration command:**

```sh
npx wp-env run tests-cli --env-cwd=wp-content/plugins/mix-and-max-box-builder env MMBB_TEST_SUITE=integration vendor/bin/phpunit --testsuite=integration
```

The current [wp-env docs](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/#using-composer-phpunit-and-wp-cli-tools)
describe `cli`. Checked the actual 10.30.0 package source:
`lib/build-docker-compose-config.js` creates `tests-cli`,
mounts `WP_TESTS_DIR=/wordpress-phpunit`, and uses a separate test database.
`lib/wordpress.js` generates its `wp-tests-config.php` with the
correct WordPress `ABSPATH`. The bootstrap reuses this config with Composer's
`wp-phpunit` library, loads WooCommerce on `muplugins_loaded`, and keeps the unit
suite independent of WordPress. Runtime verification remains pending Docker.

**Checks run:**

- `npm install` and Composer install: pass; both lockfiles committed.
- `npm run build`: pass. Both `.asset.php` files list `wp-element` and `wp-i18n`.
  The bundles reference `window.wp`; WordPress libraries are external.
- `npm run lint:js`, `npm run lint:css`, `npm run format`: pass.
- `composer run lint`: pass (5 PHP files); strict Composer manifest validation
  and platform requirement checks also pass.
- `npm run test:js`: pass (1 rendering smoke test).
- `composer run test:unit`: pass (1 test, 2 assertions; no WordPress loaded).
- `npm run plugin-zip`: pass. Extracted into a unique directory under the OS temp
  folder and checked every entry against the allowlist: 15 files, no dev folders
  or hidden files. Full contents are listed below.
- `git diff --check`: pass.

**Tool warnings:** The default webpack scanner says `No entry file discovered in
the "src" directory` because there is no root `src/index.js` or block metadata
yet. The two additional entries compile successfully; automatic block discovery
remains enabled for later phases. npm reports transitive deprecations and 111
development-dependency advisories (1 low, 38 moderate, 70 high, 2 critical).
`npm audit --omit=dev --json` reports zero advisories. Dependency directories are
excluded from the zip. Track the dev-tool advisories for a compatible toolchain
upgrade; no forced major upgrades were applied. npm 11 also leaves optional
native/core-js install scripts unapproved; all available local checks pass without them.

**Skipped checks (and why):** Docker is not installed/on PATH. wp-env startup,
integration smoke, Plugin Check, browser service checks, and WordPress debug-log
verification require that environment. No live merchant/local-site database was
used as a substitute. `npx wp-env start` on the final pinned version reports
`Could not connect to Docker. Is it running?`; earlier startup also confirmed
`spawn docker ENOENT`. Integration and Plugin Check on the final pinned version
also report that Docker is unavailable. They have not passed and are not counted
as passes.

**Open issues:** Run the Docker checks and record actual WordPress, WooCommerce
and Plugin Check versions before declaring the environment verified.
Review the development-tool advisories during hardening.

**Extracted zip contents** (`mix-and-max-box-builder/` root):

```text
LICENSE
mix-and-max-box-builder.php
package.json
webpack.config.js
build/admin-rtl.css
build/admin.asset.php
build/admin.css
build/admin.js
build/storefront-rtl.css
build/storefront.asset.php
build/storefront.css
build/storefront.js
src/admin/index.js
src/storefront/index.js
src/styles/scaffold.css
```

The remaining allowlisted plugin files/directories arrive in their planned
phases. This is a tooling scaffold archive, not a submission release.

<!-- Copy this block for each phase:

### Phase N — Title (YYYY-MM-DD)
**Done:**
**Decisions:**
**Deviations from the plan (and why):**
**Checks run:** build ✅ · lint ✅ · test:js ✅ · test:unit ✅ · test:php ✅ · Plugin Check ✅ (0 errors, n warnings: …)
**Skipped checks (and why):**
**Open issues:**
-->

## Open issues

- Phase 0: Docker is unavailable. Verify wp-env startup (WooCommerce and Plugin
  Check active), `npm run test:php`, Plugin Check, and absence of PHP notices with
  `WP_DEBUG` before relying on the integration environment.
- Phase 0: npm reports 111 development-dependency advisories. Runtime dependencies
  have zero reported advisories; review compatible dev-tool updates in hardening.

## Compatibility matrix (Phase 11)

| Environment | Result | Notes |
| --- | --- | --- |
