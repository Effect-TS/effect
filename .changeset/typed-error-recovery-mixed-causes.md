---
"effect": patch
---

Stop typed-error operators from swallowing defects and interruption. When a cause also contains `Die` or `Interrupt` reasons, recovery operators such as `Effect.catch`, `catchIf`, `catchTag`, `match`, `result`, `option`, `ignore`, and `Stream.catch` no longer call their handlers and propagate the defects and interruption instead. `mapError` and `mapBoth` now map typed failures while keeping other reasons, and `orDie` keeps existing defects alongside the converted failures.
