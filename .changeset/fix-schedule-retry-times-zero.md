---
"effect": patch
---

Fix `Effect.retry` to respect `times: 0` option by using explicit undefined check instead of truthy check.
