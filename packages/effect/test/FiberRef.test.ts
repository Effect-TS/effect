import { describe, it } from "@effect/vitest"
import { assertInclude, assertTrue, strictEqual } from "@effect/vitest/utils"
import {
  Chunk,
  Clock,
  Deferred,
  Duration,
  Effect,
  Fiber,
  FiberRef,
  Function as Fun,
  identity,
  Option,
  pipe,
  Runtime
} from "effect"

const initial = "initial"
const update = "update"
const update1 = "update1"
const update2 = "update2"

const increment = (n: number): number => n + 1

const loseTimeAndCpu: Effect.Effect<void> = Effect.yieldNow().pipe(
  Effect.zipLeft(Clock.sleep(Duration.millis(1))),
  Effect.repeatN(100)
)

describe("FiberRef", () => {
  it.scoped("get returns the current value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, initial)
    }))
  it.scoped("get returns the correct value for a child", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const fiber = yield* Effect.fork(FiberRef.get(fiberRef))
      const result = yield* Fiber.join(fiber)
      strictEqual(result, initial)
    }))
  it.scoped("getAndUpdate - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* FiberRef.getAndUpdate(fiberRef, () => update)
      const value2 = yield* FiberRef.get(fiberRef)
      strictEqual(value1, initial)
      strictEqual(value2, update)
    }))
  it.scoped("getAndUpdateSome - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* FiberRef.getAndUpdateSome(fiberRef, () => Option.some(update))
      const value2 = yield* FiberRef.get(fiberRef)
      strictEqual(value1, initial)
      strictEqual(value2, update)
    }))
  it.scoped("getAndUpdateSome - not changing value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* FiberRef.getAndUpdateSome(fiberRef, () => Option.none())
      const value2 = yield* FiberRef.get(fiberRef)
      strictEqual(value1, initial)
      strictEqual(value2, initial)
    }))
  it.scoped("set updates the current value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      yield* FiberRef.set(fiberRef, update)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, update)
    }))
  it.scoped("set by a child doesn't update parent's value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const deferred = yield* Deferred.make<void>()
      yield* FiberRef.set(fiberRef, update).pipe(
        Effect.zipRight(Deferred.succeed(deferred, void 0)),
        Effect.fork
      )
      yield* Deferred.await(deferred)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, initial)
    }))
  it.scoped("modify - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* FiberRef.modify(fiberRef, () => [1, update])
      const value2 = yield* FiberRef.get(fiberRef)
      strictEqual(value1, 1)
      strictEqual(value2, update)
    }))
  it.scoped("modifySome - not changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* FiberRef.modifySome(fiberRef, 2, () => Option.none())
      const value2 = yield* FiberRef.get(fiberRef)
      strictEqual(value1, 2)
      strictEqual(value2, initial)
    }))
  it.scoped("updateAndGet - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* FiberRef.updateAndGet(fiberRef, () => update)
      const value2 = yield* FiberRef.get(fiberRef)
      strictEqual(value1, update)
      strictEqual(value2, update)
    }))
  it.scoped("updateSomeAndGet - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* FiberRef.updateSomeAndGet(fiberRef, () => Option.some(update))
      const value2 = yield* FiberRef.get(fiberRef)
      strictEqual(value1, update)
      strictEqual(value2, update)
    }))
  it.scoped("updateSomeAndGet - not changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* FiberRef.updateSomeAndGet(fiberRef, () => Option.none())
      const value2 = yield* FiberRef.get(fiberRef)
      strictEqual(value1, initial)
      strictEqual(value2, initial)
    }))
  it.scoped("restores the original value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      yield* FiberRef.set(fiberRef, update)
      yield* FiberRef.delete(fiberRef)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, initial)
    }))
  it.scoped("locally - restores original value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const local = yield* Effect.locally(fiberRef, update)(FiberRef.get(fiberRef))
      const value = yield* FiberRef.get(fiberRef)
      strictEqual(local, update)
      strictEqual(value, initial)
    }))
  it.scoped("locally - restores parent's value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const child = yield* Effect.locally(fiberRef, update)(FiberRef.get(fiberRef).pipe(Effect.fork))
      const local = yield* Fiber.join(child)
      const value = yield* FiberRef.get(fiberRef)
      strictEqual(local, update)
      strictEqual(value, initial)
    }))
  it.scoped("locally - restores undefined value", () =>
    Effect.gen(function*() {
      const child = yield* Effect.fork(FiberRef.make(initial)) // Don't use join as it inherits values from child
      // Don't use join as it inherits values from child
      const fiberRef = yield* pipe(Fiber.await(child), Effect.flatten)
      const localValue = yield* Effect.locally(fiberRef, update)(FiberRef.get(fiberRef))
      const value = yield* FiberRef.get(fiberRef)
      strictEqual(localValue, update)
      strictEqual(value, initial)
    }))
  it.scoped("initial value is inherited on join", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const child = yield* Effect.fork(FiberRef.set(fiberRef, update))
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, update)
    }))
  it.scoped("initial value is always available", () =>
    Effect.gen(function*() {
      const child = yield* Effect.fork(FiberRef.make(initial))
      const fiberRef = yield* pipe(Fiber.await(child), Effect.flatten)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, initial)
    }))
  it.scoped("fork function is applied on fork - 1", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(0, { fork: increment })
      const child = yield* Effect.fork(Effect.void)
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, 1)
    }))
  it.scoped("fork function is applied on fork - 2", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(0, { fork: increment })
      const child = yield* pipe(Effect.void, Effect.fork, Effect.flatMap(Fiber.join), Effect.fork)
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, 2)
    }))
  it.scoped("join function is applied on join - 1", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(0, { fork: identity, join: Math.max })
      const child = yield* Effect.fork(FiberRef.update(fiberRef, increment))
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, 1)
    }))
  it.scoped("join function is applied on join - 2", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(0, { fork: identity, join: Math.max })
      const child = yield* Effect.fork(FiberRef.update(fiberRef, increment))
      yield* FiberRef.update(fiberRef, (n) => n + 2)
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, 2)
    }))
  it.scopedLive("the value of the loser is inherited in zipPar", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch = yield* Deferred.make<void>()
      const winner = FiberRef.set(fiberRef, update1).pipe(Effect.zipRight(Deferred.succeed(latch, void 0)))
      const loser = Deferred.await(latch).pipe(
        Effect.zipRight(Clock.sleep(Duration.millis(1))),
        Effect.zipRight(FiberRef.set(fiberRef, update2))
      )
      yield* pipe(winner, Effect.zip(loser, { concurrent: true }))
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, update2)
    }))
  it.scoped("nothing gets inherited with a failure in zipPar", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const success = FiberRef.set(fiberRef, update)
      const failure1 = FiberRef.set(fiberRef, update).pipe(Effect.zipRight(Effect.fail(":-(")))
      const failure2 = FiberRef.set(fiberRef, update).pipe(Effect.zipRight(Effect.fail(":-O")))
      yield* pipe(
        success,
        Effect.zip(failure1.pipe(Effect.zip(failure2, { concurrent: true })), { concurrent: true }),
        Effect.orElse(() => Effect.void)
      )
      const result = yield* FiberRef.get(fiberRef)
      assertInclude(result, initial)
    }))
  it.scoped("the value of all fibers in inherited when running many effects with collectAllPar", () =>
    Effect.gen(function*() {
      const n = 1000
      const fiberRef = yield* FiberRef.make(0, {
        fork: Fun.constant(0),
        join: (a, b) => a + b
      })
      yield* Effect.all(Array.from({ length: n }, () => FiberRef.update(fiberRef, (n) => n + 1)), {
        concurrency: "unbounded",
        discard: true
      })
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, n)
    }))
  it.scoped("its value is inherited after simple race", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      yield* pipe(FiberRef.set(fiberRef, update1), Effect.race(FiberRef.set(fiberRef, update2)))
      const result = yield* FiberRef.get(fiberRef)
      assertTrue(new RegExp(`${update1}|${update2}`).test(result))
    }))
  it.scopedLive("its value is inherited after a race with a bad winner", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch = yield* Deferred.make<void>()
      const badWinner = FiberRef.set(fiberRef, update1).pipe(
        Effect.zipRight(Effect.fail("ups").pipe(Effect.ensuring(Deferred.succeed(latch, void 0))))
      )
      const goodLoser = FiberRef.set(fiberRef, update2).pipe(
        Effect.zipRight(Deferred.await(latch)),
        Effect.zipRight(Effect.sleep(Duration.seconds(1)))
      )
      yield* pipe(badWinner, Effect.race(goodLoser))
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, update2)
    }))
  it.scoped("its value is not inherited after a race of losers", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const loser1 = FiberRef.set(fiberRef, update1).pipe(Effect.zipRight(Effect.fail("ups1")))
      const loser2 = FiberRef.set(fiberRef, update2).pipe(Effect.zipRight(Effect.fail("ups2")))
      yield* pipe(loser1, Effect.race(loser2), Effect.ignore)
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, initial)
    }))
  it.scoped("its value is inherited in a trivial race", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      yield* Effect.raceAll([FiberRef.set(fiberRef, update)])
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, update)
    }))
  it.scoped("the value of the winner is inherited when racing two effects with raceAll", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch = yield* Deferred.make<void>()
      const winner1 = FiberRef.set(fiberRef, update1).pipe(
        Effect.zipRight(Deferred.succeed(latch, void 0))
      )
      const loser1 = Deferred.await(latch).pipe(
        Effect.zipRight(FiberRef.set(fiberRef, update2)),
        Effect.zipRight(loseTimeAndCpu)
      )
      yield* Effect.raceAll([loser1, winner1])
      const value1 = yield* pipe(FiberRef.get(fiberRef), Effect.zipLeft(FiberRef.set(fiberRef, initial)))
      const winner2 = FiberRef.set(fiberRef, update1)
      const loser2 = FiberRef.set(fiberRef, update2).pipe(Effect.zipRight(Effect.fail(":-O")))
      yield* Effect.raceAll([loser2, winner2])
      const value2 = yield* pipe(FiberRef.get(fiberRef), Effect.zipLeft(FiberRef.set(fiberRef, initial)))
      strictEqual(value1, update1)
      strictEqual(value2, update1)
    }))
  it.scoped("the value of the winner is inherited when racing many effects with raceAll", () =>
    Effect.gen(function*() {
      const n = 63
      const fiberRef = yield* FiberRef.make(initial)
      const latch = yield* Deferred.make<void>()
      const winner1 = FiberRef.set(fiberRef, update1).pipe(
        Effect.zipRight(Deferred.succeed(latch, void 0)),
        Effect.asVoid
      )
      const losers1 = Deferred.await(latch).pipe(
        Effect.zipRight(FiberRef.set(fiberRef, update2)),
        Effect.zipRight(loseTimeAndCpu),
        Effect.replicate(n)
      )
      yield* pipe(Chunk.unsafeFromArray(losers1), Chunk.prepend(winner1), Effect.raceAll)
      const value1 = yield* pipe(FiberRef.get(fiberRef), Effect.zipLeft(FiberRef.set(fiberRef, initial)))
      const winner2 = FiberRef.set(fiberRef, update1)
      const losers2 = FiberRef.set(fiberRef, update1).pipe(Effect.zipRight(Effect.fail(":-O")), Effect.replicate(n))
      yield* pipe(Chunk.unsafeFromArray(losers2), Chunk.prepend(winner2), Effect.raceAll)
      const value2 = yield* pipe(FiberRef.get(fiberRef), Effect.zipLeft(FiberRef.set(fiberRef, initial)))
      strictEqual(value1, update1)
      strictEqual(value2, update1)
    }))
  it.scoped("nothing gets inherited when racing failures with raceAll", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const loser = FiberRef.set(fiberRef, update).pipe(Effect.zipRight(Effect.fail("darn")))
      yield* pipe(Effect.raceAll([loser, ...Array.from({ length: 63 }, () => loser)]), Effect.orElse(() => Effect.void))
      const result = yield* FiberRef.get(fiberRef)
      strictEqual(result, initial)
    }))
  it.scoped("fork patch is applied when a fiber is unsafely run", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make<boolean>(true, { fork: Fun.constTrue })
      const deferred = yield* Deferred.make<boolean>()
      const runtime: Runtime.Runtime<never> = yield* Effect.runtime<never>().pipe(Effect.locally(fiberRef, false))
      yield* Effect.sync(() => FiberRef.get(fiberRef).pipe(Effect.intoDeferred(deferred), Runtime.runCallback(runtime)))
      const result = yield* Deferred.await(deferred)
      assertTrue(result)
    }))
  it.scoped("fork patch is applied when a fiber is unsafely forked", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make<boolean>(true, { fork: Fun.constTrue })
      const deferred = yield* Deferred.make<boolean>()
      const runtime: Runtime.Runtime<never> = yield* Effect.locally(Effect.runtime<never>(), fiberRef, false)
      const fiber = yield* Effect.sync(() =>
        Runtime.runFork(runtime)(Effect.intoDeferred(FiberRef.get(fiberRef), deferred))
      )
      yield* Fiber.join(fiber)
      const result = yield* Deferred.await(deferred)
      assertTrue(result)
    }))
  it.scoped("is subtype of Effect", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const result = yield* fiberRef
      strictEqual(result, initial)
    }))
})
