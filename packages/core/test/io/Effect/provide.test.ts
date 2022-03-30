import { constTrue } from "../../../src/data/Function"
import { HasClock, LiveClock } from "../../../src/io/Clock"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"
import type { HasRandom } from "../../../src/io/Random"

describe("Effect", () => {
  describe("provideSomeLayer", () => {
    it("can split environment into two parts", async () => {
      const clockLayer: Layer<{}, never, HasClock> = Layer.fromValue(HasClock)(
        new LiveClock()
      )
      const effect: Effect<HasClock & HasRandom, never, void> = Effect.unit
      const program: Effect<HasRandom, never, boolean> = effect
        .map(constTrue)
        .provideSomeLayer(clockLayer)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
