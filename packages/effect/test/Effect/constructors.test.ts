import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("can lift a value to an option", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeedSome(42))
      assert.deepStrictEqual(result, Option.some(42))
    }))
  it.effect("using the none value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeedNone)
      assert.deepStrictEqual(result, Option.none())
    }))
  it.effect("can use .pipe for composition", () =>
    Effect.gen(function*(_) {
      return yield* _(Effect.succeed(1))
    }).pipe(
      Effect.map((n) => n + 1),
      Effect.flatMap((n) =>
        Effect.gen(function*(_) {
          return yield* _(Effect.succeed(n + 1))
        })
      ),
      Effect.tap((n) =>
        Effect.sync(() => {
          assert.strictEqual(n, 3)
        })
      )
    ))
  it.effect("can pass this to generator", () => {
    class MyService {
      readonly local = 1
      compute = Effect.gen(this, function*(_) {
        return yield* _(Effect.succeed(this.local + 1))
      })
    }
    const instance = new MyService()

    return Effect.map(instance.compute, (n) => {
      assert.strictEqual(n, 2)
    })
  })
})
