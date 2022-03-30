import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"

const initial = "initial"
const update = "update"

describe("FiberRef", () => {
  describe("delete", () => {
    it("restores the original value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .tap(({ fiberRef }) => fiberRef.set(update))
        .tap(({ fiberRef }) => fiberRef.delete())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })
  })
})
