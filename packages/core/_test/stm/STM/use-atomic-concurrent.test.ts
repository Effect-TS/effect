import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"
import { compute3RefN, incrementRefN } from "./utils"

describe("STM", () => {
  describe("Using `STM.atomically` perform concurrent computations", () => {
    it("increment `TRef` 100 times in 100 fibers", async () => {
      const program = Effect.Do()
        .bind("ref", () => TRef.makeCommit(0))
        .bind("fiber", ({ ref }) =>
          Effect.forkAll(List.repeat(incrementRefN(99, ref), 10))
        )
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ ref }) => ref.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1000)
    })

    it("compute a `TRef` from 2 variables, increment the first `TRef` and decrement the second `TRef` in different fibers", async () => {
      const program = Effect.Do()
        .bind("refs", () =>
          STM.atomically(TRef.make(10000) + TRef.make(0) + TRef.make(0))
        )
        .bind("fiber", ({ refs }) =>
          Effect.forkAll(
            List.repeat(compute3RefN(99, refs.get(0), refs.get(1), refs.get(2)), 10)
          )
        )
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ refs }) => refs.get(2).get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10000)
    })
  })
})
