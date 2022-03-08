import { Effect } from "../../../src/io/Effect"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"

describe("STM", () => {
  describe("commitEither", () => {
    it("commits this transaction whether it is a success or a failure", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(false))
        .bind("either", ({ tRef }) =>
          (tRef.set(true) > STM.fail("error")).commitEither().flip()
        )
        .bind("value", ({ tRef }) => tRef.get().commit())

      const { either, value } = await program.unsafeRunPromise()

      expect(either).toBe("error")
      expect(value).toBe(true)
    })
  })
})
