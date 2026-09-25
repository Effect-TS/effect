---
"effect": patch
---

Keep the source result type for Effect.repeat with times or schedule, even when while or until is a refinement. Bounded repetition may finish before the predicate stops it, so callers relying on the previous narrowed type must check the result.
