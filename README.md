# Shopify Function: metafield-configured market discounts

A small demo of metafield-configured Shopify market discounts.

Built by Daniil Maximkin (taskfordaniel.com).

The JavaScript Function selects a percentage discount from merchant-editable
thresholds, excludes tagged products, and chooses rules by Shopify Market ID.
Configuration is a JSON metafield on the **discount**, not hardcoded in the Function.

This is a self-contained demo with synthetic data. All shop domains, product tags and
resource IDs are invented. `demo-store.example` is deliberately non-routable as
a shop. No store credentials, client data, API sender or Shopify login is needed.

## Run locally

Use Node.js 22 LTS (22.12 or newer) and npm:

```sh
npm ci
npm test
npm run demo
npm run validate -- config/rules.example.json
npm run metafield:dry-run
npm run metafield:dry-run -- --rollback
npm run build
npm run test:wasm
```

`npm run check` runs unit/contract tests, builds WASM, and runs the WASM matrix.
`npm run demo` prints and checks every fixture against its expected result.
The Function and validator have **zero runtime dependencies**. Development tools
are pinned in `package-lock.json`; the test harness uses `node:test`.

The build uses Shopify CLI 4.8.5, the official JavaScript library 2.0.1, and Javy
9.1.0. WASM tests use Shopify's official function-runner 9.2.2 distributed through
the npm-installed CLI. The first build/test can download public compiler/runner
binaries from Shopify's GitHub releases. After tools are cached, the matrix runs
locally. No app provisioning, store requests or login are involved. The older npm
package `@shopify/function-runner` 5.1.4 was checked and is deprecated; it is not a
dependency of this demo.

Output from `npm run demo` (excluding npm's command header):

```text
all-excluded: {"operations":[]}
config-change-without-code: {"operations":[{"productDiscountsAdd":{"candidates":[{"message":"Demo market discount: 11%","targets":[{"cartLine":{"id":"gid://shopify/CartLine/900101","quantity":1}}],"value":{"percentage":{"value":"11"}}}],"selectionStrategy":"FIRST"}}]}
currency-mismatch: {"operations":[]}
disabled: {"operations":[]}
empty-cart: {"operations":[]}
eur-exact-threshold: {"operations":[{"productDiscountsAdd":{"candidates":[{"message":"Demo market discount: 10%","targets":[{"cartLine":{"id":"gid://shopify/CartLine/900101","quantity":1}}],"value":{"percentage":{"value":"10"}}}],"selectionStrategy":"FIRST"}}]}
eur-highest-tier: {"operations":[{"productDiscountsAdd":{"candidates":[{"message":"Demo market discount: 15%","targets":[{"cartLine":{"id":"gid://shopify/CartLine/900101","quantity":1}}],"value":{"percentage":{"value":"15"}}}],"selectionStrategy":"FIRST"}}]}
eur-one-cent-below: {"operations":[]}
excluded-not-counted: {"operations":[]}
invalid-config: {"operations":[]}
malformed-money: {"operations":[]}
missing-config: {"operations":[]}
mixed-targets: {"operations":[{"productDiscountsAdd":{"candidates":[{"message":"Demo market discount: 10%","targets":[{"cartLine":{"id":"gid://shopify/CartLine/900101","quantity":1}},{"cartLine":{"id":"gid://shopify/CartLine/900102","quantity":2}}],"value":{"percentage":{"value":"10"}}}],"selectionStrategy":"FIRST"}}]}
no-exclusions: {"operations":[{"productDiscountsAdd":{"candidates":[{"message":"Demo market discount: 10%","targets":[{"cartLine":{"id":"gid://shopify/CartLine/900101","quantity":1}}],"value":{"percentage":{"value":"10"}}}],"selectionStrategy":"FIRST"}}]}
quantity-already-in-total: {"operations":[]}
tag-query-mismatch: {"operations":[]}
unknown-market: {"operations":[]}
unsupported-merchandise: {"operations":[]}
usd-market: {"operations":[{"productDiscountsAdd":{"candidates":[{"message":"Demo market discount: 12%","targets":[{"cartLine":{"id":"gid://shopify/CartLine/900101","quantity":1}}],"value":{"percentage":{"value":"12"}}}],"selectionStrategy":"FIRST"}}]}
wrong-discount-class: {"operations":[]}
```

## The rule

The example metafield contains:

```json
{
  "version": 1,
  "enabled": true,
  "excludedTags": ["demo-no-promo", "demo-clearance"],
  "markets": [
    {
      "marketId": "gid://shopify/Market/900001",
      "currencyCode": "EUR",
      "tiers": [
        { "minimumSubtotal": "100.00", "percentage": 10 },
        { "minimumSubtotal": "200.00", "percentage": 15 }
      ]
    },
    {
      "marketId": "gid://shopify/Market/900002",
      "currencyCode": "USD",
      "tiers": [{ "minimumSubtotal": "150.00", "percentage": 12 }]
    }
  ]
}
```

All GIDs above and in fixtures are synthetic, not copied from a store.
For each cart, the Function:

1. Validates the configuration and checks `enabled` and the `PRODUCT` discount class.
2. Finds the current market's rule; unknown markets get no promotion.
3. Excludes product variants matching any configured tag. Excluded lines neither
   receive the discount nor contribute to the qualifying subtotal.
4. Adds eligible lines' `cost.totalAmount` in integer cents. The amount already
   includes line quantity; shipping and taxes are not added by this demo.
5. Selects the highest qualifying threshold, including exact equality.
6. Returns one `productDiscountsAdd` candidate targeting all eligible lines with
   `selectionStrategy: "FIRST"`. Missing/invalid config, mismatched currency,
   disabled rules or no eligible tier return `{ "operations": [] }` from `run`.

For example: EUR 60 + EUR 40 eligible lines qualify for 10%; an excluded EUR 500
line does not change the tier and is not targeted. EUR 99.99 does not qualify.
The USD market qualifies at USD 150 with 12%, independently of the EUR rule.

## API contract and metafield ownership

The extension pins **Functions API 2026-10**, using the unified Discount Function
API, target `cart.lines.discounts.generate.run`. Its named WASM export is `run`.
It uses `discount.metafield.jsonValue`, not legacy `discountNode` or a legacy
`discounts/discountApplicationStrategy` output. Shape was reviewed against the
[official Discount Function reference](https://shopify.dev/docs/api/functions/2026-10/discount)
on 2026-10-07.

`src/run.graphql` requests only configuration, discount classes, market ID,
line IDs/quantities, prices, merchandise type, and tag membership. The query
returns Shopify-computed `hasTags` responses; it does not assume access to a raw
list of product tags. `excludedTags` is both configuration and a top-level input
query variable. The namespace/key are identical in the query, extension TOML
and save payload:

```toml
[extensions.input.variables]
namespace = "$app:demo-market-discount"
key = "rules"
```

The owner is the discount node associated with this Function, and the metafield
type is `json`. Shopify loads input variables from a Function **owner** metafield;
shop and app-installation metafields cannot supply these variables. This is why
the demo uses the discount as owner. See
[input query variables](https://shopify.dev/docs/apps/build/functions/input-queries/use-variables-input-queries)
and [metafield configuration](https://shopify.dev/docs/apps/build/functions/input-queries/metafields-for-input-queries).

`schema.graphql` is an explicitly maintained **subset of documented fields** for
offline codegen and contract checks, not a downloaded full Shopify schema. The
schema restricts currencies to the two supported by this demo. It does not prove
all platform validations. `localization.market` remains queryable but is marked
deprecated in the 2026-10 reference. Before upgrading the API version, review
market identification in the full platform schema, update the query, configuration
and fixtures together if it changes, and regenerate types.

## Merchant edits without a code deploy

The Function must be installed and associated with a product-class discount once.
This repository supplies an extension and offline tools, not a deployed app or
an embedded Admin screen. The all-zero client ID in `shopify.app.toml` is a local
build placeholder, not a provisioned application.

In a connected app, the merchant would open that app's discount settings, edit
thresholds, percentages, excluded tags or market rules, and press Save. The app
reads and validates the JSON, then updates this discount's `json` metafield using
[Admin GraphQL `metafieldsSet`](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/metafieldsSet).
It must authenticate as the app owning the reserved namespace, have access to
the discount resource, and check `userErrors`. This is an app settings workflow;
the demo does not claim that Shopify's generic Admin metafield editor exposes
this app-reserved discount field automatically.

The next Function execution reads the updated metafield, including updated tag
query variables. Changing existing configuration values needs no WASM rebuild
or code deployment. A new algorithm, query field, config version or API version
does require a code change/deployment.

Rehearse the save locally:

1. Edit a copy of `config/rules.example.json`.
2. Run `npm run validate -- path/to/rules.json`.
3. Run `npm run metafield:dry-run -- path/to/rules.json` to inspect the mutation
   and variables. This command only prints JSON and never sends it anywhere.
4. For a connected installation, the app saves those values to its own discount
   node. The dry-run builder deliberately fixes a fake owner ID and shop domain.

The JSON Schema checks structure. The dependency-free validator additionally
requires unique market IDs and strictly increasing thresholds and percentages.
Both reject unknown fields. Limits are 20 excluded tags, 20 markets, and 10 tiers
per market. Tags are unique ASCII strings up to 64 characters. Config thresholds
must be nonnegative strings with exactly two decimal places; percentages are
integers from 1 to 100. Input prices also accept whole decimals or trailing zeros
without floating-point rounding. Only EUR and USD are implemented; no FX conversion.

For rollback, preserve the last accepted JSON in your app's change history and
restore it to the same metafield, or set `enabled` to `false`. Do not delete
`excludedTags`: keep the complete valid configuration to preserve query-variable
types. `npm run metafield:dry-run -- --rollback` shows a disabled save payload;
the rollback test verifies that the resulting config yields no discount.

## Tests and evidence

`fixtures/*.json` contain complete synthetic inputs and hand-specified expected
outputs. The matrix covers exact/below thresholds, highest tier, EUR/USD markets,
currency mismatch, mixed and fully excluded carts, quantity handling, invalid or
missing config, disablement, empty cart, unsupported merchandise, query/tag
mismatch, wrong discount class, and a changed percentage with unchanged code.

Tests cover the pure `run` result, deterministic behavior and input immutability,
JSON Schema/runtime validation, output shape against the documented schema
subset, save/rollback payloads, and the same fixture matrix in compiled WASM.
WASM tests require a successful runner result and record instruction counts;
they do not silently skip a missing build or a failing execution. See
[Shopify's testing guidance](https://shopify.dev/docs/apps/build/functions/test-debug-functions)
and [JavaScript toolchain documentation](https://shopify.dev/docs/apps/build/functions/programming-languages/javascript-for-functions).

## Related use case

Companion to the use case [Shopify Functions for discounts and delivery](https://taskfordaniel.com/use-cases/shopify-functions-discounts-delivery/).
Checkout rules live in a Function, values live in a metafield, and invalid config
gives no promotion. This demo covers the discount case only; it does not cover
delivery customization, a merchant UI or dev-store checkout execution.

## Limits

- Local unit and WASM execution are verified; a Shopify dev store, installed app,
  live checkout, app authorization and discount activation are not verified.
- A bad JSON config reaching `run` returns no operations. Invalid GraphQL variable
  types, explicit `null` passed to required field arguments, or oversized input
  can fail before `run` executes. The app must validate before saving. Local
  fallback tests do not prove platform behavior before the Function is invoked.
- The offline GraphQL subset and fixtures do not emulate Shopify's query engine,
  discount combinations, stacking, rounding of final savings or API restrictions.
- The demo implements product percentage discounts only. It does not generate
  shipping rates, hide delivery methods, support customer eligibility/date windows,
  or replace a complete promotion app.
- JavaScript has instruction and memory limits. The measured small fixtures do not
  establish capacity for large carts or maximum-size configurations.
- No server, merchant UI, change-history database or API sender is included.
  The save payload omits `compareDigest`; a production app should manage concurrent
  changes and keep an audit/rollback history.
- The app TOML, shop domain and IDs are placeholders. There is no released app
  or deployment.

## Tree

```text
config/                       JSON Schema and example rules
extensions/market-discount/
  src/run.graphql             Shopify input query
  src/run.js                  Function entrypoint
  src/config.js               validation and exact money parsing
  src/index.js                export for the Shopify build
  schema.graphql              documented offline API subset
  shopify.extension.toml       target and metafield variables
fixtures/                     synthetic input/expected-output matrix
scripts/                      demo, validation and dry-run save helpers
test/                         unit, contract, payload and WASM tests
shopify.app.toml               local build configuration
package.json / package-lock.json
.nvmrc                        Node.js major version
.gitignore                    local artifacts, environment files and logs
README.md / VALIDATION.md / LICENSE
```

Build output and generated types are ignored and regenerated locally.

## License

Apache-2.0. Copyright 2026 Daniil Maximkin. See [LICENSE](LICENSE).
