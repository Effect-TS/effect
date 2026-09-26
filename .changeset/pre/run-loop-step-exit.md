---
"effect": patch
---

Stop `Effect.map`, `Effect.tap`, `Effect.exit`, `Effect.match` and `Effect.matchCause` allocating a success `Exit` on every step.
