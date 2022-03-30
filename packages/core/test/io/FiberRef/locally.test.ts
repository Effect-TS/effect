import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"

const initial = "initial"
const update = "update"

describe("FiberRef", () => {
  describe("locally", () => {
    it("restores original value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("local", ({ fiberRef }) => fiberRef.get().apply(fiberRef.locally(update)))
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { local, value } = await program.unsafeRunPromise()

      expect(local).toBe(update)
      expect(value).toBe(initial)
    })

    it("restores parent's value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) =>
          fiberRef.get().apply(fiberRef.locally(update)).fork()
        )
        .bind("local", ({ child }) => child.join())
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { local, value } = await program.unsafeRunPromise()

      expect(local).toBe(update)
      expect(value).toBe(initial)
    })

    it("restores undefined value", async () => {
      const program = Effect.Do()
        .bind("child", () => FiberRef.make(initial).fork())
        // Don't use join as it inherits values from child
        .bind("fiberRef", ({ child }) => child.await().flatMap((_) => Effect.done(_)))
        .bind("localValue", ({ fiberRef }) =>
          fiberRef.get().apply(fiberRef.locally(update))
        )
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { localValue, value } = await program.unsafeRunPromise()

      expect(localValue).toBe(update)
      expect(value).toBe(initial)
    })
  })
})
