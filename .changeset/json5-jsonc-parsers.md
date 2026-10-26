---
"effect": patch
---

Add `Json5` and `Jsonc` to `effect/encoding`. Both parse a document without dependencies and throw a `SyntaxError` with a line and column on invalid input.
