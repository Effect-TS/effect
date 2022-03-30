import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"

const initial = "initial"
const update = "update"

describe("FiberRef", () => {
  describe("get", () => {
    it("returns the current value", async () => {
      const program = FiberRef.make(initial).flatMap((fiberRef) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("returns the correct value for a child", async () => {
      const program = FiberRef.make(initial)
        .flatMap((fiberRef) => fiberRef.get().fork())
        .flatMap((fiber) => fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })
  })

  describe("getAndUpdate", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.getAndUpdate(() => update))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(update)
    })
  })

  describe("getAndUpdateSome", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          fiberRef.getAndUpdateSome(() => Option.some(update))
        )
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(update)
    })

    it("doest not change value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.getAndUpdateSome(() => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(initial)
    })
  })
})
