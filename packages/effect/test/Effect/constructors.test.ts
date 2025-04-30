import { describe, it } from "@effect/vitest"
import { assertNone, assertSome, strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"

describe("Effect", () => {
  it.effect("can lift a value to an option", () =>
    Effect.gen(function*() {
      const result = yield* Effect.succeedSome(42)
      assertSome(result, 42)
    }))
  it.effect("using the none value", () =>
    Effect.gen(function*() {
      const result = yield* Effect.succeedNone
      assertNone(result)
    }))
  it.effect("can use .pipe for composition", () =>
    Effect.gen(function*() {
      return yield* Effect.succeed(1)
    }).pipe(
      Effect.map((n) => n + 1),
      Effect.flatMap((n) =>
        Effect.gen(function*() {
          return yield* Effect.succeed(n + 1)
        })
      ),
      Effect.tap((n) =>
        Effect.sync(() => {
          strictEqual(n, 3)
        })
      )
    ))
  it.effect("can pass this to generator", () => {
    class MyService {
      readonly local = 1
      compute = Effect.gen(this, function*() {
        return yield* Effect.succeed(this.local + 1)
      })
    }
    const instance = new MyService()

    return Effect.map(instance.compute, (n) => {
      strictEqual(n, 2)
    })
  })
})
