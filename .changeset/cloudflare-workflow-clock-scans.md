---
"@effect/platform-cloudflare": patch
---

Avoid redundant alarm syncs when replaying existing `DurableClock.sleep` calls and index pending `workflow_clocks` rows so clock lookups do not scan fired rows.
