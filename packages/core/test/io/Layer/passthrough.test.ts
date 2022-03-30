import type { Has } from "../../../src/data/Has"
import { tag } from "../../../src/data/Has"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"

describe("Layer", () => {
  describe("passthrough", () => {
    it("passes the inputs through to the next layer", async () => {
      const NumberServiceId = Symbol()
      interface NumberService {
        readonly value: number
      }
      const NumberService = tag<NumberService>(NumberServiceId)

      const ToStringServiceId = Symbol()
      interface ToStringService {
        readonly value: string
      }
      const ToStringService = tag<ToStringService>(ToStringServiceId)

      const layer = Layer.fromFunction(ToStringService)((_: Has<NumberService>) => ({
        value: NumberService.read(_).value.toString()
      }))

      const live = Layer.fromValue(NumberService)({ value: 1 }) >> layer.passthrough()

      const program = Effect.Do()
        .bind("i", () => Effect.service(NumberService))
        .bind("s", () => Effect.service(ToStringService))
        .provideLayer(live)

      const { i, s } = await program.unsafeRunPromise()

      expect(i.value).toBe(1)
      expect(s.value).toBe("1")
    })
  })
})
