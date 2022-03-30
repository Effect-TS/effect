import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"

const initial = "initial"
const update = "update"

describe("FiberRef", () => {
  describe("modify", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.modify(() => Tuple(1, update)))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(1)
      expect(value2).toBe(update)
    })
  })

  describe("modifySome", () => {
    it("not changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.modifySome(2, () => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(2)
      expect(value2).toBe(initial)
    })
  })
})
