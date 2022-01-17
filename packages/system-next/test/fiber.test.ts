import * as Chunk from "../src/Collections/Immutable/Chunk"
import * as T from "../src/Effect"
import * as Exit from "../src/Exit"
import * as Fiber from "../src/Fiber"
import * as FiberId from "../src/FiberId"
import * as FiberRef from "../src/FiberRef"
import { flow, identity, pipe } from "../src/Function"
import * as M from "../src/Managed"
import * as O from "../src/Option"
import * as Promise from "../src/Promise"
import * as Queue from "../src/Queue"
import * as Ref from "../src/Ref"
import { withLatch } from "./test-utils/Latch"

const initial = "initial"
const update = "update"
const fibers = Chunk.fill(100000, () => Fiber.unit)

describe("Fiber", () => {
  describe("Create a new Fiber and:", () => {
    it("lift it into Managed", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.do,
          T.bind("ref", () => Ref.make<boolean>(false)),
          T.bind("fiber", ({ ref }) =>
            withLatch((release) =>
              pipe(
                T.zipRight_(release, T.unit),
                T.acquireRelease(T.never, Ref.set_(ref, true)),
                T.fork
              )
            )
          ),
          T.tap(({ fiber }) =>
            pipe(
              fiber,
              Fiber.toManaged,
              M.use(() => T.unit)
            )
          ),
          T.tap(({ fiber }) => Fiber.await(fiber)),
          T.bind("value", ({ ref }) => Ref.get(ref))
        )
      )

      expect(value).toBe(true)
    })
  })

  describe("`inheritLocals` works for Fiber created using:", () => {
    it("`map`", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.do,
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("child", ({ fiberRef }) =>
            withLatch((release) =>
              pipe(FiberRef.set_(fiberRef, update), T.zipRight(release), T.fork)
            )
          ),
          T.tap(({ child }) => Fiber.map_(child, () => undefined).inheritRefs),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(update)
    })

    it("`orElse`", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.do,
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("latch1", () => Promise.make<never, void>()),
          T.bind("latch2", () => Promise.make<never, void>()),
          T.bind("child1", ({ fiberRef, latch1 }) =>
            pipe(
              FiberRef.set_(fiberRef, "child1"),
              T.zipRight(Promise.succeed_(latch1, undefined)),
              T.fork
            )
          ),
          T.bind("child2", ({ fiberRef, latch2 }) =>
            pipe(
              FiberRef.set_(fiberRef, "child2"),
              T.zipRight(Promise.succeed_(latch2, undefined)),
              T.fork
            )
          ),
          T.tap(({ latch1, latch2 }) =>
            T.zipRight_(Promise.await(latch1), Promise.await(latch2))
          ),
          T.tap(({ child1, child2 }) => Fiber.orElse_(child1, child2).inheritRefs),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe("child1")
    })

    it("`zip`", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.do,
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("latch1", () => Promise.make<never, void>()),
          T.bind("latch2", () => Promise.make<never, void>()),
          T.bind("child1", ({ fiberRef, latch1 }) =>
            pipe(
              FiberRef.set_(fiberRef, "child1"),
              T.zipRight(Promise.succeed_(latch1, undefined)),
              T.fork
            )
          ),
          T.bind("child2", ({ fiberRef, latch2 }) =>
            pipe(
              FiberRef.set_(fiberRef, "child2"),
              T.zipRight(Promise.succeed_(latch2, undefined)),
              T.fork
            )
          ),
          T.tap(({ latch1, latch2 }) =>
            T.zipRight_(Promise.await(latch1), Promise.await(latch2))
          ),
          T.tap(({ child1, child2 }) => Fiber.zip_(child1, child2).inheritRefs),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe("child1")
    })
  })

  describe("`Fiber.join` on interrupted Fiber", () => {
    it("is inner interruption", async () => {
      const fiberId = FiberId.make(0, 123)

      const exit = await T.unsafeRunPromise(
        pipe(Fiber.interruptAs(fiberId), Fiber.join, T.exit)
      )

      expect(exit).toHaveProperty("cause.fiberId", fiberId)
    })
  })

  describe("if one composed fiber fails then all must fail", () => {
    it("`await`", async () => {
      const exit = await pipe(
        Fiber.fail("fail"),
        Fiber.zip(Fiber.never),
        Fiber.await,
        T.unsafeRunPromise
      )

      expect(exit).toHaveProperty("cause.left.value", "fail")
    })

    it("`join`", async () => {
      const exit = await pipe(
        Fiber.fail("fail"),
        Fiber.zip(Fiber.never),
        Fiber.join,
        T.exit,
        T.unsafeRunPromise
      )

      expect(exit).toHaveProperty("cause.left.value", "fail")
    })

    it("`awaitAll`", async () => {
      const exit = await pipe(
        Fiber.awaitAll(
          Chunk.prepend_(
            Chunk.fill(100, () => Fiber.never),
            Fiber.fail("fail")
          )
        ),
        T.exit,
        T.unsafeRunPromise
      )

      expect(exit).toEqual(Exit.succeed(undefined))
    })

    it("`joinAll`", async () => {
      const exit = await pipe(
        Fiber.joinAll(
          Chunk.prepend_(
            Chunk.fill(100, () => Fiber.never),
            Fiber.fail("fail")
          )
        ),
        T.exit,
        T.unsafeRunPromise
      )

      expect(Exit.isFailure(exit)).toBeTruthy()
    })

    it("shard example", async () => {
      function shard<R, E, A>(
        queue: Queue.Queue<A>,
        n: number,
        worker: (a: A) => T.Effect<R, E, void>
      ): T.Effect<R, E, void> {
        const worker1 = pipe(
          Queue.take(queue),
          T.chain((a) => T.uninterruptible(worker(a))),
          T.forever
        )
        return pipe(
          T.forkAll(Chunk.fill(n, () => worker1)),
          T.chain(Fiber.join),
          T.zipRight(T.never)
        )
      }

      const { exit } = await pipe(
        T.do,
        T.bind("queue", () => Queue.makeUnbounded<number>()),
        T.tap(({ queue }) => Queue.offerAll_(queue, Chunk.range(1, 100))),
        T.let(
          "worker",
          ({ queue }) =>
            (n: number) =>
              n === 100 ? T.failNow("fail") : T.asUnit(Queue.offer_(queue, n))
        ),
        T.bind("exit", ({ queue, worker }) => T.exit(shard(queue, 4, worker))),
        T.tap(({ queue }) => Queue.shutdown(queue)),
        T.unsafeRunPromise
      )

      expect(Exit.isFailure(exit)).toBeTruthy()
    })

    it("grandparent interruption is propagated to grandchild despite parent termination", async () => {
      const exit = await pipe(
        T.do,
        T.bind("latch1", () => Promise.make<never, void>()),
        T.bind("latch2", () => Promise.make<never, void>()),
        T.let("c", ({ latch2 }) =>
          pipe(
            T.never,
            T.interruptible,
            T.onInterrupt(() => Promise.succeed_(latch2, undefined))
          )
        ),
        T.let("a", ({ c, latch1 }) =>
          pipe(
            Promise.succeed_(latch1, undefined),
            T.zipRight(T.fork(T.fork(c))),
            T.uninterruptible,
            T.zipRight(T.never)
          )
        ),
        T.bind("fiber", ({ a }) => T.fork(a)),
        T.tap(({ latch1 }) => Promise.await(latch1)),
        T.tap(({ fiber }) => Fiber.interrupt(fiber)),
        T.tap(({ latch2 }) => Promise.await(latch2)),
        T.exit,
        T.unsafeRunPromise
      )

      expect(Exit.isSuccess(exit)).toBeTruthy()
    })
  })

  describe("roots", () => {
    test("dual roots", async () => {
      const rootContains = (f: Fiber.Runtime<any, any>): T.UIO<boolean> =>
        pipe(
          Fiber.roots,
          T.map(
            flow(
              Chunk.find((fr) => f === fr),
              O.isSome
            )
          )
        )

      const rootsTest = T.gen(function* (_) {
        const fiber1 = yield* _(pipe(T.never, T.forkDaemon))
        const fiber2 = yield* _(pipe(T.never, T.forkDaemon))
        yield* _(
          pipe(
            rootContains(fiber1),
            T.zipWith(rootContains(fiber2), (b1, b2) => b1 && b2),
            T.repeatUntil(identity)
          )
        )
        yield* _(pipe(Fiber.interrupt(fiber1), T.zipRight(Fiber.interrupt(fiber2))))
        return true
      })

      // Since `rootsTest` has a potentially infinite loop (T.never + T.repeatUntil),
      // race the real test against a 10 second timer and fail the test if it didn't complete.
      // This delay time may be increased if it turns out this test is flaky.
      const test = await pipe(
        T.sleep(10000),
        T.zipRight(T.succeedNow(false)),
        T.race(rootsTest),
        T.unsafeRunPromise
      )

      expect(test).toBeTruthy()
    })
  })

  describe("stack safety", () => {
    it("awaitAll", async () => {
      await pipe(Fiber.awaitAll(fibers), T.unsafeRunPromise)

      expect.anything()
    })
    it("joinAll", async () => {
      await pipe(Fiber.joinAll(fibers), T.unsafeRunPromise)

      expect.anything()
    })
    it("collectAll", async () => {
      await pipe(Fiber.collectAll(fibers), Fiber.join, T.unsafeRunPromise)

      expect.anything()
    })
  })

  describe("track blockingOn", () => {
    it("in await", async () => {
      const { blockingOn, f1 } = await pipe(
        T.do,
        T.bind("f1", () => T.fork(T.never)),
        T.bind("f2", ({ f1 }) => T.fork(Fiber.await(f1))),
        T.bind("blockingOn", ({ f2 }) =>
          pipe(
            f2.status,
            T.continueOrFail(
              () => undefined,
              (status) =>
                status._tag === "Suspended" ? O.some(status.blockingOn) : O.none
            ),
            T.eventually
          )
        ),
        T.unsafeRunPromise
      )

      expect(blockingOn).toStrictEqual(f1.id)
    })
  })
})
