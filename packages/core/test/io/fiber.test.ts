import { Chunk } from "../../src/collection/immutable/Chunk"
import { constTrue, constVoid, identity, pipe } from "../../src/data/Function"
import { Option } from "../../src/data/Option"
import { Effect } from "../../src/io/Effect"
import { Exit } from "../../src/io/Exit"
import { Fiber } from "../../src/io/Fiber"
import { FiberId } from "../../src/io/FiberId"
import { FiberRef } from "../../src/io/FiberRef"
import { Promise } from "../../src/io/Promise"
import { Queue } from "../../src/io/Queue"
import { Ref } from "../../src/io/Ref"
import { TraceElement } from "../../src/io/TraceElement"
import { withLatch } from "../test-utils/Latch"

const initial = "initial"
const update = "update"
const fibers = Chunk.fill(100000, () => Fiber.unit)

describe("Fiber", () => {
  describe("Create a new Fiber and:", () => {
    it("lift it into Managed", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<boolean>(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            (release > Effect.unit).acquireRelease(Effect.never, ref.set(true)).fork()
          )
        )
        .tap(({ fiber }) => fiber.toManaged().use(() => Effect.unit))
        .tap(({ fiber }) => fiber.await())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("`inheritLocals` works for Fiber created using:", () => {
    it("`map`", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) =>
          withLatch((release) => fiberRef.set(update).zipRight(release).fork())
        )
        .tap(({ child }) => child.map(constVoid).inheritRefs())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("`orElse`", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("child1", ({ fiberRef, latch1 }) =>
          fiberRef.set("child1").zipRight(latch1.succeed(undefined)).fork()
        )
        .bind("child2", ({ fiberRef, latch2 }) =>
          fiberRef.set("child2").zipRight(latch2.succeed(undefined)).fork()
        )
        .tap(({ latch1, latch2 }) => latch1.await().zipRight(latch2.await()))
        .tap(({ child1, child2 }) => (child1 | child2).inheritRefs())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("child1")
    })

    it("`zip`", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("child1", ({ fiberRef, latch1 }) =>
          fiberRef.set("child1").zipRight(latch1.succeed(undefined)).fork()
        )
        .bind("child2", ({ fiberRef, latch2 }) =>
          fiberRef.set("child2").zipRight(latch2.succeed(undefined)).fork()
        )
        .tap(({ latch1, latch2 }) => latch1.await().zipRight(latch2.await()))
        .tap(({ child1, child2 }) => child1.zip(child2).inheritRefs())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("child1")
    })
  })

  describe("`Fiber.join` on interrupted Fiber", () => {
    it("is inner interruption", async () => {
      const fiberId = FiberId(0, 123, TraceElement.empty)
      const program = Fiber.interruptAs(fiberId).join()

      const result = await program.unsafeRunPromiseExit()

      expect(result).toHaveProperty("cause.fiberId", fiberId)
    })
  })

  describe("if one composed fiber fails then all must fail", () => {
    it("`await`", async () => {
      const program = Fiber.fail("fail").zip(Fiber.never).await()

      const result = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.failures().first).toEqual(
        Option.some("fail")
      )
    })

    it("`join`", async () => {
      const program = Fiber.fail("fail").zip(Fiber.never).join()

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.failures().first).toEqual(
        Option.some("fail")
      )
    })

    it("`awaitAll`", async () => {
      const program = Fiber.awaitAll(
        Chunk.fill(100, () => Fiber.never).prepend(Fiber.fail("fail"))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result).toEqual(Exit.succeed(undefined))
    })

    it("`joinAll`", async () => {
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
        const worker1 = queue
          .take()
          .flatMap((a) => worker(a).uninterruptible())
          .forever()

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
        .tap(({ queue }) => queue.shutdown())
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

  describe("roots", () => {
    test("dual roots", async () => {
      function rootContains(
        fiber: Fiber.Runtime<any, any>
      ): Effect<unknown, never, boolean> {
        return Fiber.roots.map((chunk) => chunk.find((f) => f === fiber).isSome())
      }

      const rootsTest = Effect.Do()
        .bind("fiber1", () => Effect.never.forkDaemon())
        .bind("fiber2", () => Effect.never.forkDaemon())
        .tap(({ fiber1, fiber2 }) =>
          rootContains(fiber1)
            .zipWith(rootContains(fiber2), (b1, b2) => b1 && b2)
            .repeatUntil(identity)
        )
        .tap(({ fiber1, fiber2 }) => fiber1.interrupt().zipRight(fiber2.interrupt()))
        .map(constTrue)

      // Since `rootsTest` has a potentially infinite loop (T.never + T.repeatUntil),
      // race the real test against a 10 second timer and fail the test if it didn't complete.
      // This delay time may be increased if it turns out this test is flaky.
      const program = Effect.sleep(10000)
        .zipRight(Effect.succeedNow(false))
        .race(rootsTest)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("stack safety", () => {
    it("awaitAll", async () => {
      const program = Fiber.awaitAll(fibers)

      await program.unsafeRunPromise()

      expect.anything()
    })
    it("joinAll", async () => {
      const program = Fiber.joinAll(fibers)

      await program.unsafeRunPromise()

      expect.anything()
    })
    it("collectAll", async () => {
      const program = Fiber.collectAll(fibers).join().map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("track blockingOn", () => {
    it("in await", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.never.fork())
        .bind("f2", ({ f1 }) => f1.await().fork())
        .bind("blockingOn", ({ f2 }) =>
          f2._status
            .continueOrFail(
              () => undefined,
              (status) =>
                status._tag === "Suspended"
                  ? Option.some(status.blockingOn)
                  : Option.none
            )
            .eventually()
        )

      const { blockingOn, f1 } = await program.unsafeRunPromise()

      expect(blockingOn).toStrictEqual(f1.id)
    })
  })
})
