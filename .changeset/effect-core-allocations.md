---
"effect": patch
---

Fix internal frames leaking into rendered stack traces, and drop the closure allocated per step by `map`, `andThen`, `tap`, `match`, `matchCause` and the `catch*` combinators.
