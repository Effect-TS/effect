import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Queue } from "../../../src/io/Queue"

describe("Queue", () => {
  describe("awaitShutdown", () => {
    it("once", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(3))
        .bind("promise", () => Promise.make<never, boolean>())
        .tap(({ promise, queue }) =>
          (queue.awaitShutdown > promise.succeed(true)).fork()
        )
        .tap(({ queue }) => queue.shutdown)
        .flatMap(({ promise }) => promise.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("multiple", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(3))
        .bind("promise1", () => Promise.make<never, boolean>())
        .bind("promise2", () => Promise.make<never, boolean>())
        .tap(({ promise1, queue }) =>
          (queue.awaitShutdown > promise1.succeed(true)).fork()
        )
        .tap(({ promise2, queue }) =>
          (queue.awaitShutdown > promise2.succeed(true)).fork()
        )
        .tap(({ queue }) => queue.shutdown)
        .bind("result1", ({ promise1 }) => promise1.await())
        .bind("result2", ({ promise2 }) => promise2.await())

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(true)
      expect(result2).toBe(true)
    })
  })
})
