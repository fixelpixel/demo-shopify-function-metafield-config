# Local validation, 2026-10-07

Node.js: 22.22.2; the same results were previously observed on 22.23.2.
Synthetic fixtures only. No Shopify login or store access.

| Check | Observed result |
| --- | --- |
| `npm run check` | Exit 0 |
| Unit, schema, GraphQL subset and payload tests | 73 passed, 0 failed, 0 skipped |
| Shopify CLI / Javy build | Successful named `run` WASM export |
| Official function-runner 9.2.2 matrix | 20 passed, 0 failed, 0 skipped |
| Total automated tests | 93 passed |
| `npm run demo` | All 20 input/expected-output fixtures matched |
| `npm run validate` | Example configuration valid |
| `npm run metafield:dry-run -- --rollback` | JSON payload with `enabled: false`; no request sent |

WASM matrix instruction counts ranged from 373,763 to 1,275,571. These are
measurements of small fixtures, not a capacity claim for large carts.

WASM SHA-256 from this build:

```text
0707cce46e34d451c0f71682b95a93122bf3ebc5b76528a84f1047c366542b46
```

WASM and generated types are ignored; reproduce them with `npm run build`.
API shape was checked read-only against Shopify's 2026-10 Discount Function
reference and input-query-variable guidance linked in README. The local GraphQL
schema is a documented subset, not a complete platform schema.

No dev-store checkout, app installation, merchant UI or delivery
customization was tested. See README's Limits section for those boundaries and
the distinction between `run` fallback and failures before Function invocation.
