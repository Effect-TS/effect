import * as it from "effect-test/utils/extend"
import { withLatch } from "effect-test/utils/latch"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as FiberRef from "effect/FiberRef"
import * as FiberStatus from "effect/FiberStatus"
import { constVoid, identity, pipe } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as Queue from "effect/Queue"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"
import { assert, describe } from "vitest"

const initial = "initial"
const update = "update"
const fibers = Array.from({ length: 10000 }, () => Fiber.unit)

describe("Fiber", () => {
  it.effect("should track blockingOn in await", () =>
    Effect.gen(function*($) {
      const fiber1 = yield* $(Effect.never, Effect.fork)
      const fiber2 = yield* $(Fiber.await(fiber1), Effect.fork)
      const blockingOn = yield* $(
        Fiber.status(fiber2),
        Effect.flatMap((status) =>
          FiberStatus.isSuspended(status)
            ? Effect.succeed(status.blockingOn)
            : Effect.failSync(constVoid)
        ),
        Effect.eventually
      )
      assert.deepStrictEqual(blockingOn, Fiber.id(fiber1))
    }))
  it.effect("should track blockingOn in race", () =>
    Effect.gen(function*($) {
      const fiber = yield* $(Effect.never, Effect.race(Effect.never), Effect.fork)
      const blockingOn = yield* $(
        Fiber.status(fiber),
        Effect.flatMap(
          (status) => FiberStatus.isSuspended(status) ? Effect.succeed(status.blockingOn) : Effect.fail(void 0 as void)
        ),
        Effect.eventually
      )
      assert.strictEqual(HashSet.size(FiberId.toSet(blockingOn)), 2)
    }))
  it.scoped("inheritLocals works for Fiber created using map", () =>
    Effect.gen(function*($) {
      const fiberRef = yield* $(FiberRef.make(initial))
      const child = yield* $(
        withLatch((release) => FiberRef.set(fiberRef, update).pipe(Effect.zipRight(release), Effect.fork))
      )
      yield* $(child, Fiber.map(constVoid), Fiber.inheritAll)
      const result = yield* $(FiberRef.get(fiberRef))
      assert.strictEqual(result, update)
    }))
  it.scoped("inheritLocals works for Fiber created using orElse", () =>
    Effect.gen(function*($) {
      const fiberRef = yield* $(FiberRef.make(initial))
      const latch1 = yield* $(Deferred.make<never, void>())
      const latch2 = yield* $(Deferred.make<never, void>())
      const child1 = yield* $(
        FiberRef.set(fiberRef, "child1"),
        Effect.zipRight(Deferred.succeed(latch1, void 0)),
        Effect.fork
      )
      const child2 = yield* $(
        FiberRef.set(fiberRef, "child2"),
        Effect.zipRight(Deferred.succeed(latch2, void 0)),
        Effect.fork
      )
      yield* $(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2)))
      yield* $(child1, Fiber.orElse(child2), Fiber.inheritAll)
      const result = yield* $(FiberRef.get(fiberRef))
      assert.strictEqual(result, "child1")
    }))
  it.scoped("inheritLocals works for Fiber created using zip", () =>
    Effect.gen(function*($) {
      const fiberRef = yield* $(FiberRef.make(initial))
      const latch1 = yield* $(Deferred.make<never, void>())
      const latch2 = yield* $(Deferred.make<never, void>())
      const child1 = yield* $(
        FiberRef.set(fiberRef, "child1"),
        Effect.zipRight(Deferred.succeed(latch1, void 0)),
        Effect.fork
      )
      const child2 = yield* $(
        FiberRef.set(fiberRef, "child2"),
        Effect.zipRight(Deferred.succeed(latch2, void 0)),
        Effect.fork
      )
      yield* $(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2)))
      yield* $(child1, Fiber.zip(child2), Fiber.inheritAll)
      const result = yield* $(FiberRef.get(fiberRef))
      assert.strictEqual(result, "child1")
    }))
  it.effect("join on interrupted Fiber is an inner interruption", () =>
    Effect.gen(function*($) {
      const fiberId = FiberId.make(0, 123)
      const result = yield* $(Fiber.interrupted(fiberId), Fiber.join, Effect.exit)
      assert.deepStrictEqual(result, Exit.interrupt(fiberId))
    }))
  it.effect("scoped should create a new Fiber and scope it", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const fiber = yield* $(withLatch((release) =>
        Effect.fork(
          Effect.acquireUseRelease(
            Effect.asUnit(release),
            () => Effect.never,
            () => Ref.set(ref, true)
          )
        )
      ))
      yield* $(Effect.scoped(Fiber.scoped(fiber)))
      yield* $(Fiber.await(fiber))
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))
  it.effect("shard example", () =>
    Effect.gen(function*($) {
      const shard = <R, E, A>(
        queue: Queue.Queue<A>,
        n: number,
        worker: (a: A) => Effect.Effect<R, E, void>
      ): Effect.Effect<R, E, never> => {
        const worker1 = pipe(
          Queue.take(queue),
          Effect.flatMap((a) => Effect.uninterruptible(worker(a))),
          Effect.forever
        )
        return pipe(
          Effect.forkAll(Array.from({ length: n }, () => worker1)),
          Effect.flatMap(Fiber.join),
          Effect.zipRight(Effect.never)
        )
      }
      const worker = (n: number) => {
        if (n === 100) {
          return pipe(Queue.shutdown(queue), Effect.zipRight(Effect.fail("fail")))
        }
        return pipe(Queue.offer(queue, n), Effect.asUnit)
      }
      const queue = yield* $(Queue.unbounded<number>())
      yield* $(Queue.offerAll(queue, Array.from(Array(100), (_, i) => i + 1)))
      const result = yield* $(Effect.exit(shard(queue, 4, worker)))
      yield* $(Queue.shutdown(queue))
      assert.isTrue(Exit.isFailure(result))
    }))
  it.effect("child becoming interruptible is interrupted due to auto-supervision of uninterruptible parent", () =>
    Effect.gen(function*($) {
      const latch = yield* $(Deferred.make<never, void>())
      const child = pipe(
        Effect.interruptible(Effect.never),
        Effect.onInterrupt(() => Deferred.succeed(latch, void 0)),
        Effect.fork
      )
      yield* $(Effect.uninterruptible(Effect.fork(child)))
      const result = yield* $(Deferred.await(latch))
      assert.isUndefined(result)
    }))
  it.effect("dual roots", () =>
    Effect.gen(function*($) {
      const rootContains = (fiber: Fiber.RuntimeFiber<any, any>): Effect.Effect<never, never, boolean> => {
        return pipe(Fiber.roots, Effect.map(Chunk.unsafeFromArray), Effect.map(ReadonlyArray.contains(fiber)))
      }
      const fiber1 = yield* $(Effect.forkDaemon(Effect.never))
      const fiber2 = yield* $(Effect.forkDaemon(Effect.never))
      yield* $(
        rootContains(fiber1),
        Effect.flatMap((a) => a ? rootContains(fiber2) : Effect.succeed(false)),
        Effect.repeatUntil(identity)
      )
      const result = yield* $(Fiber.interrupt(fiber1), Effect.zipRight(Fiber.interrupt(fiber2)))
      assert.isTrue(Exit.isInterrupted(result))
    }))
  it.effect("interruptAll interrupts fibers in parallel", () =>
    Effect.gen(function*($) {
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const fiber1 = yield* $(
        pipe(Deferred.succeed(deferred1, void 0), Effect.zipRight(Effect.never), Effect.forkDaemon)
      )
      const fiber2 = yield* $(
        pipe(
          Deferred.succeed(deferred2, void 0),
          Effect.zipRight(Fiber.await(fiber1)),
          Effect.uninterruptible,
          Effect.forkDaemon
        )
      )
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      yield* $(Fiber.interruptAll([fiber2, fiber1]))
      const result = yield* $(Fiber.await(fiber2))
      assert.isTrue(Exit.isInterrupted(result))
    }))
  it.effect("await does not return until all fibers have completed execution", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const fiber = yield* $(Effect.forkAll(Array.from({ length: 100 }, () => Ref.set(ref, 10))))
      yield* $(Fiber.interrupt(fiber))
      yield* $(Ref.set(ref, -1))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, -1)
    }))
  it.effect("awaitAll - stack safety", () =>
    Effect.gen(function*($) {
      const result = yield* $(Fiber.awaitAll(fibers))
      assert.isUndefined(result)
    }), 10000)
  it.effect("joinAll - stack safety", () =>
    Effect.gen(function*($) {
      const result = yield* $(Fiber.joinAll(fibers))
      assert.isUndefined(result)
    }), 10000)
  it.effect("all - stack safety", () =>
    Effect.gen(function*($) {
      const result = yield* $(Fiber.join(Fiber.all(fibers)), Effect.asUnit)
      assert.isUndefined(result)
    }), 10000)
})
