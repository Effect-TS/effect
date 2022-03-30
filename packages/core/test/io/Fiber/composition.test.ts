import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Fiber } from "../../../src/io/Fiber"
import { Promise } from "../../../src/io/Promise"
import { Queue } from "../../../src/io/Queue"

describe("Fiber", () => {
  describe("if one composed fiber fails then all must fail", () => {
    it("await", async () => {
      const program = Fiber.fail("fail").zip(Fiber.never).await()

      const result = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.failures().first).toEqual(
        Option.some("fail")
      )
    })

    it("join", async () => {
      const program = Fiber.fail("fail").zip(Fiber.never).join()

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.failures().first).toEqual(
        Option.some("fail")
      )
    })

    it("awaitAll", async () => {
      const program = Fiber.awaitAll(
        Chunk.fill(100, () => Fiber.never).prepend(Fiber.fail("fail"))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result).toEqual(Exit.succeed(undefined))
    })

    it("joinAll", async () => {
      const program = Fiber.joinAll(
        Chunk.fill(100, () => Fiber.never).prepend(Fiber.fail("fail"))
      ).exit()

      const result = await program.unsafeRunPromise()

      expect(result.isFailure()).toBe(true)
    })

    it("shard example", async () => {
      function shard<R, E, A>(
        queue: Queue<A>,
        n: number,
        worker: (a: A) => Effect<R, E, void>
      ): Effect<R, E, void> {
        const worker1 = queue.take.flatMap((a) => worker(a).uninterruptible()).forever()

        return Effect.forkAll(Chunk.fill(n, () => worker1))
          .flatMap((fiber) => fiber.join())
          .zipRight(Effect.never)
      }

      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(Chunk.range(1, 100)))
        .bindValue(
          "worker",
          ({ queue }) =>
            (n: number) =>
              n === 100 ? Effect.failNow("fail") : queue.offer(n).asUnit()
        )
        .bind("exit", ({ queue, worker }) => shard(queue, 4, worker).exit())
        .tap(({ queue }) => queue.shutdown)
        .map(({ exit }) => exit)

      const result = await program.unsafeRunPromise()

      expect(result.isFailure()).toBe(true)
    })

    it("grandparent interruption is propagated to grandchild despite parent termination", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bindValue("c", ({ latch2 }) =>
          pipe(
            Effect.never.interruptible().onInterrupt(() => latch2.succeed(undefined))
          )
        )
        .bindValue("a", ({ c, latch1 }) =>
          latch1
            .succeed(undefined)
            .zipRight(c.fork().fork())
            .uninterruptible()
            .zipRight(Effect.never)
        )
        .bind("fiber", ({ a }) => a.fork())
        .tap(({ latch1 }) => latch1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ latch2 }) => latch2.await())
        .exit()

      const result = await program.unsafeRunPromise()

      expect(result.isSuccess()).toBe(true)
    })
  })
})
