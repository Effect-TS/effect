---
"effect": minor
---

add Effect.annotateLogsScoped

This api allows you to annotate logs until the Scope has been closed.

```ts
import { Effect } from "effect"

Effect.gen(function* () {
  yield* Effect.log("no annotations")
  yield* Effect.annotateLogsScoped({ foo: "bar" })
  yield* Effect.log("annotated with foo=bar")
}).pipe(Effect.scoped, Effect.andThen(Effect.log("no annotations again")))
```
