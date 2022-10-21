import { deepMapEffect } from "@effect/core/test/io/Effect/test-utils"
import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS synchronous stack safety", () => {
    it("deep map of sync effect", () =>
      Do(($) => {
        const result = $(deepMapEffect(10_000))
        assert.strictEqual(result, 10000)
      }).unsafeRunPromise())

    it("deep attempt", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 10_000)
        const result = $(
          chunk.reduce(Effect.attempt(constVoid).foldEffect(Effect.die, Effect.succeed), (acc, _) =>
            acc.foldEffect(Effect.die, Effect.succeed).either.unit)
        )
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("deep flatMap", () =>
      Do(($) => {
        function fib(
          n: number,
          a: BigInt = BigInt("0"),
          b: BigInt = BigInt("1")
        ): Effect<never, Error, BigInt> {
          return Effect.sync(() => ((a as any) + (b as any)) as BigInt).flatMap((b2) =>
            n > 0 ? fib(n - 1, b, b2) : Effect.sync(b2)
          )
        }
        const result = $(fib(1000))
        const expected = BigInt(
          "113796925398360272257523782552224175572745930353730513145086634176691092536145985470146129334641866902783673042322088625863396052888690096969577173696370562180400527049497109023054114771394568040040412172632376"
        )
        assert.deepEqual(result, expected)
      }).unsafeRunPromise())

    it("deep absolve/attempt is identity", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 100)
        const result = $(chunk.reduce(Effect.succeed(42), (acc, _) => Effect.absolve(acc.either)))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("deep async absolve/attempt is identity", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 1000)
        const result = $(chunk.reduce(
          Effect.async<never, unknown, unknown>((cb) => {
            cb(Effect.sync(42))
          }),
          (acc, _) => Effect.absolve(acc.either)
        ))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())
  })
})
