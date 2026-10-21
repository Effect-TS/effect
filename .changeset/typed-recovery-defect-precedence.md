---
"effect": patch
---

Preserve defects in mixed failure causes across Effect, Stream and Channel.

- Typed recovery skips causes containing a defect and converts every typed error to a defect: `Fail(e) + Die(d)` becomes `Die(e) + Die(d)`, preserving reason order and interrupts. Use `catchCause` or `catchDefect` to recover from these causes.
- An interrupt alongside a typed error does not block recovery, including Effect retry and repeat error paths. Retrying or re-raising only the typed error can discard that interrupt.
- The same rule applies to failing `repeat` / `repeatOrElse` policies. Retry-policy failures still propagate unchanged.
- Error mapping in Effect (including eager variants), Exit, Stream and Channel now maps every typed error in place, preserving defects, interrupts and reason order instead of keeping only the first mapped failure. Mapping does not convert typed errors to defects.
