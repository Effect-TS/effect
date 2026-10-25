---
"@effect/vitest": patch
---

Fix `it.layer` without a name releasing its shared layer before later tests run when a test uses `retry` or `repeats`.
