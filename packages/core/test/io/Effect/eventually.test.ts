import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("eventually", () => {
    it("succeeds eventually", async () => {
      function effect(ref: Ref<number>) {
        return ref.get.flatMap((n) =>
          n < 10 ? ref.update((n) => n + 1) > Effect.fail("Ouch") : Effect.succeed(n)
        )
      }

      const program = Ref.make(0).flatMap((ref) => effect(ref).eventually())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })
  })
})
