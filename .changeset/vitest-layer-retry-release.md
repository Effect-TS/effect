---
"@effect/vitest": patch
---

Fix unnamed `it.layer` blocks releasing their shared layer before later tests run when a test uses `retry` or `repeats`. Such blocks now keep their resources alive until the enclosing suite ends, so they may overlap with later blocks.
