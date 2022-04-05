import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"

describe("STM", () => {
  describe("Failure must", () => {
    it("rollback full transaction", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind("either", ({ tRef }) =>
          (tRef.update((n) => n + 10) > STM.fail("error")).commit().either()
        )
        .bind("value", ({ tRef }) => tRef.get().commit())

      const { either, value } = await program.unsafeRunPromise()

      expect(either).toEqual(Either.left("error"))
      expect(value).toBe(0)
    })

    it("be ignored", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind("either", ({ tRef }) =>
          (tRef.update((n) => n + 10) > STM.fail("error")).commit().ignore()
        )
        .bind("value", ({ tRef }) => tRef.get().commit())

      const { either, value } = await program.unsafeRunPromise()

      expect(either).toBeUndefined()
      expect(value).toBe(0)
    })
  })
})
