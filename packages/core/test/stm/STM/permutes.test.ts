import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { TRef } from "../../../src/stm/TRef"
import { permutation } from "./utils"

describe("STM", () => {
  describe("Permutes 2 variables", () => {
    it("in one fiber", async () => {
      const program = Effect.Do()
        .bind("tRef1", () => TRef.makeCommit(1))
        .bind("tRef2", () => TRef.makeCommit(2))
        .tap(({ tRef1, tRef2 }) => permutation(tRef1, tRef2).commit())
        .bind("value1", ({ tRef1 }) => tRef1.get().commit())
        .bind("value2", ({ tRef2 }) => tRef2.get().commit())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(2)
      expect(value2).toBe(1)
    })

    it("in 100 fibers, the 2 variables should contains the same values", async () => {
      const program = Effect.Do()
        .bind("tRef1", () => TRef.makeCommit(1))
        .bind("tRef2", () => TRef.makeCommit(2))
        .bind("oldValue1", ({ tRef1 }) => tRef1.get().commit())
        .bind("oldValue2", ({ tRef2 }) => tRef2.get().commit())
        .bind("fiber", ({ tRef1, tRef2 }) =>
          Effect.forkAll(List.repeat(permutation(tRef1, tRef2).commit(), 100))
        )
        .tap(({ fiber }) => fiber.join())
        .bind("value1", ({ tRef1 }) => tRef1.get().commit())
        .bind("value2", ({ tRef2 }) => tRef2.get().commit())

      const { oldValue1, oldValue2, value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(oldValue1)
      expect(value2).toBe(oldValue2)
    })
  })
})
