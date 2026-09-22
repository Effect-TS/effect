---
"effect": patch
---

Fix the internal stack marker in rendered traces. On V8, drop the closure allocated per step by `map`, `andThen`, `tap`, `match`, `matchCause` and the `catch*` combinators. On engines without V8-style continuation frame labels, `map` retains a marker closure and `match` / `matchCause` retain a sync thunk to keep their rendered stacks clean. Other callback paths may still show internal frames on those engines.

`flatMap` callbacks now receive only the value, without internal runtime arguments or a receiver.
