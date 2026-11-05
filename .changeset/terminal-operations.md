---
"effect": minor
---

`effect/Terminal` exports one operation per member (`yield* Terminal.columns`, `Terminal.display(text)`, `Effect.provideService(Terminal.columns, Effect.succeed(80))`), all satisfied by any `Layer<Terminal>`, and `Terminal.Shape` as the name of the record type. Write `Terminal.Shape` where you use `Terminal.Terminal` as the type of an implementation; the next minor makes `Terminal.Terminal` the identity of the whole service. `Terminal.make` takes and returns the record; the `[TypeId]` brand is gone from the interface.
