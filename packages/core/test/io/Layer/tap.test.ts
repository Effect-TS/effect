import { tag } from "../../../src/data/Has"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"
import { Ref } from "../../../src/io/Ref"

describe("Layer", () => {
  describe("tap", () => {
    it("peeks at an acquired resource", async () => {
      const BarServiceId = Symbol()

      interface BarService {
        readonly bar: string
      }

      const BarService = tag<BarService>(BarServiceId)

      const program = Effect.Do()
        .bind("ref", () => Ref.make("foo"))
        .bindValue("layer", ({ ref }) =>
          Layer.fromValue(BarService)({ bar: "bar" }).tap((r) =>
            ref.set(BarService.read(r).bar)
          )
        )
        .tap(({ layer }) => Effect.scoped(layer.build()))
        .bind("value", ({ ref }) => ref.get)

      const { value } = await program.unsafeRunPromise()

      expect(value).toBe("bar")
    })
  })
})
