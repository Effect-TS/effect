import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"

describe("Promise", () => {
  describe("complete", () => {
    it("complete a promise using succeed", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, number>())
        .bind("success", ({ promise }) => promise.succeed(32))
        .bind("result", ({ promise }) => promise.await())

      const { result, success } = await program.unsafeRunPromise()

      expect(success).toBe(true)
      expect(result).toBe(32)
    })

    it("complete a promise using complete", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, number>())
        .bind("ref", () => Ref.make(13))
        .tap(({ promise, ref }) => promise.complete(ref.updateAndGet((_) => _ + 1)))
        .bind("v1", ({ promise }) => promise.await())
        .bind("v2", ({ promise }) => promise.await())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(14)
      expect(v2).toBe(14)
    })

    it("complete a promise using completeWith", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, number>())
        .bind("ref", () => Ref.make(13))
        .tap(({ promise, ref }) => promise.completeWith(ref.updateAndGet((_) => _ + 1)))
        .bind("v1", ({ promise }) => promise.await())
        .bind("v2", ({ promise }) => promise.await())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(14)
      expect(v2).toBe(15)
    })

    it("complete a promise twice", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<string, number>())
        .tap(({ promise }) => promise.succeed(1))
        .bind("success", ({ promise }) => promise.complete(Effect.succeedNow(9)))
        .bind("result", ({ promise }) => promise.await())

      const { result, success } = await program.unsafeRunPromise()

      expect(success).toBe(false)
      expect(result).toBe(1)
    })
  })
})
