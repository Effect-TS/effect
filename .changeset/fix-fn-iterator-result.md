---
"effect": patch
---

fix(Effect): handle transpiled generator bodies in `Effect.fn`

`Effect.fn(name)(body)` crashed at runtime with `RuntimeException: Not a valid effect: {}` when `body` was a generator function lowered by a compiler (e.g. `babel-preset-expo` on React Native / Hermes) into a plain function returning an iterator IIFE. Such a body fails the `isGeneratorFunction` check, so its return value was passed through as if it were an `Effect`. We now duck-type the result and re-wrap it with `fromIterator` when it is an iterator.
