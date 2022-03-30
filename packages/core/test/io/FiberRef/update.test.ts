import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"

const initial = "initial"
const update = "update"

describe("FiberRef", () => {
  describe("updateAndGet", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.updateAndGet(() => update))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(update)
      expect(value2).toBe(update)
    })
  })

  describe("updateSomeAndGet", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          fiberRef.updateSomeAndGet(() => Option.some(update))
        )
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(update)
      expect(value2).toBe(update)
    })

    it("does not change value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.updateSomeAndGet(() => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(initial)
    })
  })
})
