---
"@effect/vitest": patch
---

Interrupt an effect when a test finishes. This ensures allocated resources
will be correctly released even if the test times out.

```ts
import { it } from "@effect/vitest"
import { Console, Effect, Layer } from "effect"

class Database extends Effect.Tag("Database")<Database, {}>() {
  static readonly test = Layer.scoped(
    Database,
    Effect.acquireRelease(
      Effect.as(Console.log("database setup"), Database.of({})),
      () => Console.log("database teardown")
    )
  )
}

it.live(
  "testing with closable resources",
  () =>
    Effect.gen(function* () {
      const database = yield* Database
      // performing some time consuming operations
      yield* Effect.sleep("500 millis")
    }).pipe(Effect.provide(Database.test)),
  { timeout: 100 }
)
```
