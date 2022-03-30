import { List } from "../../../src/collection/immutable/List"
import type { IO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { deepMapEffect } from "./test-utils"

describe("Effect", () => {
  describe("RTS synchronous stack safety", () => {
    it("deep map of sync effect", async () => {
      const program = deepMapEffect(10000)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10000)
    })

    it("deep attempt", async () => {
      const program = List.range(0, 10000).reduce(
        Effect.attempt<void>(undefined).foldEffect(Effect.dieNow, Effect.succeedNow),
        (acc, _) => acc.foldEffect(Effect.dieNow, Effect.succeedNow).either().asUnit()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("deep flatMap", async () => {
      function fib(
        n: number,
        a: BigInt = BigInt("0"),
        b: BigInt = BigInt("1")
      ): IO<Error, BigInt> {
        return Effect.succeed(() => ((a as any) + (b as any)) as BigInt).flatMap((b2) =>
          n > 0 ? fib(n - 1, b, b2) : Effect.succeed(b2)
        )
      }

      const result = await fib(1000).unsafeRunPromise()

      const expected = BigInt(
        "113796925398360272257523782552224175572745930353730513145086634176691092536145985470146129334641866902783673042322088625863396052888690096969577173696370562180400527049497109023054114771394568040040412172632376"
      )

      expect(result).toEqual(expected)
    })

    it("deep absolve/attempt is identity", async () => {
      const program = List.range(0, 1000).reduce(Effect.succeed(42), (acc, _) =>
        Effect.absolve(acc.either())
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("deep async absolve/attempt is identity", async () => {
      const program = List.range(0, 1000).reduce(
        Effect.async((cb) => {
          cb(Effect.succeed(42))
        }),
        (acc, _) => Effect.absolve(acc.either())
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })
  })
})
