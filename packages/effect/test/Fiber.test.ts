import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import {
  Array,
  Chunk,
  Deferred,
  Effect,
  Exit,
  Fiber,
  FiberId,
  FiberRef,
  FiberStatus,
  Function as Fun,
  HashSet,
  pipe,
  Queue,
  Ref
} from "effect"
import { withLatch } from "./utils/latch.js"

const initial = "initial"
const update = "update"
const fibers = Array.makeBy(10000, () => Fiber.void)

describe("Fiber", () => {
  it.effect("should track blockingOn in await", () =>
    Effect.gen(function*() {
      const fiber1 = yield* pipe(Effect.never, Effect.fork)
      const fiber2 = yield* pipe(Fiber.await(fiber1), Effect.fork)
      const blockingOn = yield* pipe(
        Fiber.status(fiber2),
        Effect.flatMap((status) =>
          FiberStatus.isSuspended(status)
            ? Effect.succeed(status.blockingOn)
            : Effect.failSync(Fun.constVoid)
        ),
        Effect.eventually
      )
      deepStrictEqual(blockingOn, Fiber.id(fiber1))
    }))
  it.effect("should track blockingOn in race", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(Effect.never, Effect.race(Effect.never), Effect.fork)
      const blockingOn = yield* pipe(
        Fiber.status(fiber),
        Effect.flatMap(
          (status) => FiberStatus.isSuspended(status) ? Effect.succeed(status.blockingOn) : Effect.fail(void 0 as void)
        ),
        Effect.eventually
      )
      strictEqual(HashSet.size(FiberId.toSet(blockingOn)), 2)
    }))
  it.scoped("inheritLocals works for Fiber created using map", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const child = yield* withLatch((release) =>
        FiberRef.set(fiberRef, update).pipe(Effect.zipRight(release), Effect.fork)
      )
      yield* pipe(child, Fiber.map(Fun.constVoid), Fiber.inheritAll)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, update)
    }))
  it.scoped("inheritLocals works for Fiber created using orElse", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch1 = yield* Deferred.make<void>()
      const latch2 = yield* Deferred.make<void>()
      const child1 = yield* pipe(
        FiberRef.set(fiberRef, "child1"),
        Effect.zipRight(Deferred.succeed(latch1, void 0)),
        Effect.fork
      )
      const child2 = yield* pipe(
        FiberRef.set(fiberRef, "child2"),
        Effect.zipRight(Deferred.succeed(latch2, void 0)),
        Effect.fork
      )
      yield* pipe(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2)))
      yield* pipe(child1, Fiber.orElse(child2), Fiber.inheritAll)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, "child1")
    }))
  it.scoped("inheritLocals works for Fiber created using zip", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch1 = yield* Deferred.make<void>()
      const latch2 = yield* Deferred.make<void>()
      const child1 = yield* pipe(
        FiberRef.set(fiberRef, "child1"),
        Effect.zipRight(Deferred.succeed(latch1, void 0)),
        Effect.fork
      )
      const child2 = yield* pipe(
        FiberRef.set(fiberRef, "child2"),
        Effect.zipRight(Deferred.succeed(latch2, void 0)),
        Effect.fork
      )
      yield* pipe(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2)))
      yield* pipe(child1, Fiber.zip(child2), Fiber.inheritAll)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, "child1")
    }))
  it.effect("join on interrupted Fiber is an inner interruption", () =>
    Effect.gen(function*() {
      const fiberId = FiberId.make(0, 123)
      const result = yield* pipe(Fiber.interrupted(fiberId), Fiber.join, Effect.exit)
      deepStrictEqual(result, Exit.interrupt(fiberId))
    }))
  it.effect("scoped should create a new Fiber and scope it", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const fiber = yield* withLatch((release) =>
        Effect.fork(
          Effect.acquireUseRelease(
            Effect.asVoid(release),
            () => Effect.never,
            () => Ref.set(ref, true)
          )
        )
      )
      yield* Effect.scoped(Fiber.scoped(fiber))
      yield* Fiber.await(fiber)
      const result = yield* Ref.get(ref)
      assertTrue(result)
    }))
  it.effect("shard example", () =>
    Effect.gen(function*() {
      const shard = <A, E, R>(
        queue: Queue.Queue<A>,
        n: number,
        worker: (a: A) => Effect.Effect<void, E, R>
      ): Effect.Effect<never, E, R> => {
        const worker1 = pipe(
          Queue.take(queue),
          Effect.flatMap((a) => Effect.uninterruptible(worker(a))),
          Effect.forever
        )
        return pipe(
          Effect.forkAll(Array.makeBy(n, () => worker1)),
          Effect.flatMap(Fiber.join),
          Effect.zipRight(Effect.never)
        )
      }
      const worker = (n: number) => {
        if (n === 100) {
          return pipe(Queue.shutdown(queue), Effect.zipRight(Effect.fail("fail")))
        }
        return pipe(Queue.offer(queue, n), Effect.asVoid)
      }
      const queue = yield* Queue.unbounded<number>()
      yield* Queue.offerAll(queue, Array.range(1, 100))
      const result = yield* Effect.exit(shard(queue, 4, worker))
      yield* Queue.shutdown(queue)
      assertTrue(Exit.isFailure(result))
    }))
  it.effect("child becoming interruptible is interrupted due to auto-supervision of uninterruptible parent", () =>
    Effect.gen(function*() {
      const latch = yield* Deferred.make<void>()
      const child = pipe(
        Effect.interruptible(Effect.never),
        Effect.onInterrupt(() => Deferred.succeed(latch, void 0)),
        Effect.fork
      )
      yield* Effect.uninterruptible(Effect.fork(child))
      const result = yield* Deferred.await(latch)
      strictEqual(result, undefined)
    }))
  it.effect("dual roots", () =>
    Effect.gen(function*() {
      const rootContains = (fiber: Fiber.RuntimeFiber<any, any>): Effect.Effect<boolean> => {
        return pipe(Fiber.roots, Effect.map(Chunk.unsafeFromArray), Effect.map(Array.contains(fiber)))
      }
      const fiber1 = yield* Effect.forkDaemon(Effect.never)
      const fiber2 = yield* Effect.forkDaemon(Effect.never)
      yield* pipe(
        rootContains(fiber1),
        Effect.flatMap((a) => a ? rootContains(fiber2) : Effect.succeed(false)),
        Effect.repeat({ until: (_) => _ })
      )
      const result = yield* pipe(Fiber.interrupt(fiber1), Effect.zipRight(Fiber.interrupt(fiber2)))
      assertTrue(Exit.isInterrupted(result))
    }))
  it.effect("interruptAll interrupts fibers in parallel", () =>
    Effect.gen(function*() {
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const fiber1 = yield* pipe(Deferred.succeed(deferred1, void 0), Effect.zipRight(Effect.never), Effect.forkDaemon)
      const fiber2 = yield* pipe(
        Deferred.succeed(deferred2, void 0),
        Effect.zipRight(Fiber.await(fiber1)),
        Effect.uninterruptible,
        Effect.forkDaemon
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      yield* Fiber.interruptAll([fiber2, fiber1])
      const result = yield* Fiber.await(fiber2)
      assertTrue(Exit.isInterrupted(result))
    }))
  it.effect("await does not return until all fibers have completed execution", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const fiber = yield* Effect.forkAll(Array.makeBy(100, () => Ref.set(ref, 10)))
      yield* Fiber.interrupt(fiber)
      yield* Ref.set(ref, -1)
      const result = yield* Ref.get(ref)
      strictEqual(result, -1)
    }))
  it.effect("awaitAll - stack safety", () =>
    Effect.gen(function*() {
      const result = yield* Fiber.awaitAll(fibers)
      assertTrue(Array.isArray(result))
      assertTrue(result.length === fibers.length)
      result.forEach((_) => assertTrue(Exit.isSuccess(_) && _.value === undefined))
    }), 10000)
  it.effect("joinAll - stack safety", () =>
    Effect.gen(function*() {
      const result = yield* Fiber.joinAll(fibers)
      assertTrue(Array.isArray(result))
      assertTrue(result.length === fibers.length)
      result.forEach((x) => strictEqual(x, undefined))
    }), 10000)
  it.effect("all - stack safety", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Fiber.join(Fiber.all(fibers)), Effect.asVoid)
      strictEqual(result, undefined)
    }), 10000)
  it.effect("is subtype of Effect", () =>
    Effect.gen(function*() {
      const fiber = yield* Effect.fork(Effect.succeed(1))
      const fiberResult = yield* fiber
      assertTrue(1 === fiberResult)
    }))
})
