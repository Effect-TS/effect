---
"effect": minor
---

**Breaking** (`@stability unstable`): `effect/Terminal` is a record service over one operation per member: `yield* Terminal.columns`, `Terminal.display(text)`, `Effect.provideService(Terminal.columns, Effect.succeed(80))`, all satisfied by any `Layer<Terminal>`. The _type_ `Terminal.Terminal` is now the identity of the whole service (the union of its six keys), not the record of implementations: code that used it as the type of an implementation writes `Terminal.Shape` (`pnpm codemod:shape --module Terminal <paths>` rewrites it). `Terminal.make` takes and returns the record; `yield* Terminal.Terminal` returns a plain object of the members rather than the object the layer provided; the `[TypeId]` brand is gone from it.
