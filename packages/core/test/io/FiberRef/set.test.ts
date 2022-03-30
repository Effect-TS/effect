import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"
import { Promise } from "../../../src/io/Promise"

const initial = "initial"
const update = "update"

describe("FiberRef", () => {
  describe("set", () => {
    it("updates the current value", async () => {
      const program = FiberRef.make(initial)
        .tap((fiberRef) => fiberRef.set(update))
        .flatMap((fiberRef) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("by a child doesn't update parent's value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("promise", () => Promise.make<never, void>())
        .tap(({ fiberRef, promise }) =>
          fiberRef.set(update).zipRight(promise.succeed(undefined)).fork()
        )
        .tap(({ promise }) => promise.await())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })
  })
})
