import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("once", () => {
    it("returns an effect that will only be executed once", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("effect", ({ ref }) => ref.update((n) => n + 1).once())
        .tap(({ effect }) => Effect.collectAllPar(effect.replicate(100)))
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })
})
