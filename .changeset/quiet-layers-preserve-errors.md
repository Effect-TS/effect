---
"effect": patch
---

Preserve non-interrupt failures when a concurrent `Effect.forEach` / `Effect.all` is interrupted; fixes `Layer.build` reporting interrupt-only when a shared memoized layer build is interrupted.
