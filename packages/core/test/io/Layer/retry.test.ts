import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"
import { Ref } from "../../../src/io/Ref"
import { Schedule } from "../../../src/io/Schedule"

describe("Layer", () => {
  describe("retry", () => {
    it("retry", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue(
          "effect",
          ({ ref }) => ref.update((n) => n + 1) > Effect.fail("fail")
        )
        .bindValue("layer", ({ effect }) =>
          Layer.fromRawEffect(effect).retry(Schedule.recurs(3))
        )
        .tap(({ layer }) => Effect.scoped(layer.build()).ignore())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(4)
    })
  })
})
