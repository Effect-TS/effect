---
"effect": patch
---

Propagate SQL transaction COMMIT errors as typed SqlError failures when cleanup succeeds. Preserve both COMMIT and cleanup errors as defects when cleanup fails, so typed recovery cannot hide an unsafe connection state.
