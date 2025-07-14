import { describe, it } from "@effect/vitest"
import { assertFalse, assertSome, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Array from "effect/Array"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import { constVoid, pipe } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as MutableRef from "effect/MutableRef"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as TestClock from "effect/TestClock"
import { withLatch, withLatchAwait } from "../utils/latch.js"

describe("Effect", () => {
  it.effect("sync forever is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(Effect.succeed(1), Effect.forever, Effect.fork)
      const result = yield* (Fiber.interrupt(fiber))
      assertTrue(Exit.isFailure(result) && Cause.isInterruptedOnly(result.effect_instruction_i0))
    }))
  it.effect("interrupt of never is interrupted with cause", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(Effect.never, Effect.fork)
      const result = yield* (Fiber.interrupt(fiber))
      assertTrue(Exit.isFailure(result) && Cause.isInterruptedOnly(result.effect_instruction_i0))
    }))
  it.effect("asyncEffect is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* (
        pipe(Effect.asyncEffect<never, never, never, never, never, never>(() => Effect.never), Effect.fork)
      )
      const result = yield* (Fiber.interrupt(fiber))
      assertTrue(Exit.isFailure(result) && Cause.isInterruptedOnly(result.effect_instruction_i0))
    }))
  it.effect("async is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(Effect.async<void, never, never>(constVoid), Effect.fork)
      const result = yield* (Fiber.interrupt(fiber))
      assertTrue(Exit.isFailure(result) && Cause.isInterruptedOnly(result.effect_instruction_i0))
    }))
  it.effect("acquireUseRelease - acquire is uninterruptible", () =>
    Effect.gen(function*() {
      const awaiter = Deferred.unsafeMake<void>(FiberId.none)
      const program = Effect.gen(function*() {
        const deferred = yield* (Deferred.make<void>())
        const fiber = yield* (
          pipe(
            Effect.acquireUseRelease(
              pipe(Deferred.succeed(deferred, void 0), Effect.zipLeft(Deferred.await(awaiter))),
              () => Effect.void,
              () => Effect.void
            ),
            Effect.forkDaemon
          )
        )
        return yield* (
          pipe(
            Deferred.await(deferred),
            Effect.zipRight(pipe(
              Fiber.interrupt(fiber),
              Effect.timeoutTo({
                onTimeout: () => 42,
                onSuccess: () => 0,
                duration: Duration.millis(500)
              })
            )),
            Effect.zipLeft(TestClock.adjust(Duration.seconds(1)), { concurrent: true })
          )
        )
      })
      const result = yield* program
      yield* (Deferred.succeed(awaiter, void 0))
      strictEqual(result, 42)
    }))
  it.effect("acquireUseRelease - use is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* (
        Effect.fork(
          Effect.acquireUseRelease(
            Effect.void,
            () => Effect.never,
            () => Effect.void
          )
        )
      )
      const result = yield* (Fiber.interrupt(fiber))
      assertTrue(Exit.isInterrupted(result))
    }))
  it.effect("acquireUseRelease - release is called on interrupt", () =>
    Effect.gen(function*() {
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const fiber = yield* Effect.fork(
        Effect.acquireUseRelease(
          Effect.void,
          () => pipe(Deferred.succeed(deferred1, void 0), Effect.zipRight(Effect.never)),
          () => pipe(Deferred.succeed(deferred2, void 0), Effect.zipRight(Effect.void))
        )
      )
      yield* (Deferred.await(deferred1))
      yield* (Fiber.interrupt(fiber))
      const result = yield* pipe(
        Deferred.await(deferred2),
        Effect.timeoutTo({
          onTimeout: () => 42,
          onSuccess: () => 0,
          duration: Duration.seconds(1)
        })
      )
      strictEqual(result, 0)
    }))
  it.effect("acquireUseRelease acquire returns immediately on interrupt", () =>
    Effect.gen(function*() {
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<number, never>())
      const deferred3 = yield* (Deferred.make<void>())
      const fiber = yield* (
        pipe(
          Effect.acquireUseRelease(
            pipe(Deferred.succeed(deferred1, void 0), Effect.zipRight(Deferred.await(deferred2))),
            () => Effect.void,
            () => Deferred.await(deferred3)
          ),
          Effect.disconnect,
          Effect.fork
        )
      )
      yield* (Deferred.await(deferred1))
      const result = yield* (Fiber.interrupt(fiber))
      yield* (Deferred.succeed(deferred3, void 0))
      assertTrue(Exit.isInterrupted(result))
    }))
  it.effect("acquireUseRelease disconnect use is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          Effect.void,
          () => Effect.never,
          () => Effect.void
        ),
        Effect.disconnect,
        Effect.fork
      )
      const result = yield* (Fiber.interrupt(fiber))
      assertTrue(Exit.isInterrupted(result))
    }))
  it.effect("acquireUseRelease disconnect release called on interrupt in separate fiber", () =>
    Effect.gen(function*() {
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const fiber = yield* (
        pipe(
          Effect.acquireUseRelease(
            Effect.void,
            () => pipe(Deferred.succeed(deferred1, void 0), Effect.zipRight(Effect.never)),
            () => pipe(Deferred.succeed(deferred2, void 0), Effect.zipRight(Effect.void))
          ),
          Effect.disconnect,
          Effect.fork
        )
      )
      yield* (Deferred.await(deferred1))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (
        pipe(
          Deferred.await(deferred2),
          Effect.timeoutTo({
            onTimeout: () => false,
            onSuccess: () => true,
            duration: Duration.seconds(10)
          })
        )
      )
      assertTrue(result)
    }))
  it.effect("catchAll + ensuring + interrupt", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const deferred = yield* (Deferred.make<boolean>())
      const fiber = yield* (
        pipe(
          Deferred.succeed(latch, void 0),
          Effect.zipRight(Effect.never),
          Effect.catchAll(Effect.fail),
          Effect.ensuring(Deferred.succeed(deferred, true)),
          Effect.fork
        )
      )
      yield* (Deferred.await(latch))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Deferred.await(deferred))
      assertTrue(result)
    }))
  it.effect("finalizer can detect interruption", () =>
    Effect.gen(function*() {
      const deferred1 = yield* (Deferred.make<boolean>())
      const deferred2 = yield* (Deferred.make<void>())
      const fiber = yield* (
        pipe(
          Deferred.succeed(deferred2, void 0),
          Effect.zipRight(Effect.never),
          Effect.ensuring(
            pipe(
              Effect.descriptor,
              Effect.flatMap((descriptor) => Deferred.succeed(deferred1, HashSet.size(descriptor.interruptors) > 0))
            )
          ),
          Effect.fork
        )
      )
      yield* (Deferred.await(deferred2))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Deferred.await(deferred1))
      assertTrue(result)
    }))
  it.effect("interrupted cause persists after catching", () =>
    Effect.gen(function*() {
      const process = (list: Chunk.Chunk<Exit.Exit<any>>): Chunk.Chunk<Exit.Exit<any>> => {
        return pipe(list, Chunk.map(Exit.mapErrorCause((cause) => cause)))
      }
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const exits = yield* (Ref.make(Chunk.empty<Exit.Exit<any>>()))
      const fiber = yield* pipe(
        Effect.uninterruptibleMask((restore) =>
          pipe(
            restore(pipe(
              Effect.uninterruptibleMask((restore) =>
                pipe(
                  restore(pipe(Deferred.succeed(latch1, void 0), Effect.zipRight(Deferred.await(latch2)))),
                  Effect.onExit((exit) => Ref.update(exits, Chunk.prepend(exit)))
                )
              ),
              Effect.asVoid
            )),
            Effect.exit,
            Effect.flatMap((exit) => Ref.update(exits, Chunk.prepend(exit)))
          )
        ),
        Effect.fork
      )
      yield* pipe(Deferred.await(latch1), Effect.zipRight(Fiber.interrupt(fiber)))
      const result = yield* pipe(Ref.get(exits), Effect.map(process))
      strictEqual(Chunk.size(result), 2)
      assertTrue(pipe(
        result,
        Array.reduce(true, (acc, curr) =>
          acc && Exit.isFailure(curr) && Cause.isInterruptedOnly(curr.effect_instruction_i0))
      ))
    }))
  it.effect("interruption of raced", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<number>(0))
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const make = (deferred: Deferred.Deferred<void, never>) => {
        return pipe(
          Deferred.succeed(deferred, void 0),
          Effect.zipRight(Effect.never),
          Effect.onInterrupt(() => Ref.update(ref, (n) => n + 1))
        )
      }
      const raced = yield* pipe(make(latch1), Effect.race(make(latch2)), Effect.fork)
      yield* pipe(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2)))
      yield* (Fiber.interrupt(raced))
      const result = yield* (Ref.get(ref))
      strictEqual(result, 2)
    }))
  it.effect("recovery of error in finalizer", () =>
    Effect.gen(function*() {
      const recovered = yield* (Ref.make(false))
      const fiber = yield* (withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(Effect.never),
          Effect.ensuring(pipe(
            Effect.void,
            Effect.zipRight(Effect.fail("uh oh")),
            Effect.catchAll(() => Ref.set(recovered, true))
          )),
          Effect.fork
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(recovered))
      assertTrue(result)
    }))
  it.effect("recovery of interruptible", () =>
    Effect.gen(function*() {
      const recovered = yield* (Ref.make(false))
      const fiber = yield* (withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(pipe(Effect.never, Effect.interruptible)),
          Effect.matchCauseEffect({
            onFailure: (cause) => Ref.set(recovered, Cause.isInterrupted(cause)),
            onSuccess: () => Ref.set(recovered, false)
          }),
          Effect.uninterruptible,
          Effect.fork
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(recovered))
      assertTrue(result)
    }))
  it.effect("sandbox of interruptible", () =>
    Effect.gen(function*() {
      const recovered = yield* (Ref.make<Option.Option<Either.Either<never, boolean>>>(Option.none()))
      const fiber = yield* (withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(pipe(Effect.never, Effect.interruptible)),
          Effect.sandbox,
          Effect.either,
          Effect.flatMap((either) =>
            Ref.set(recovered, Option.some(pipe(either, Either.mapLeft(Cause.isInterrupted))))
          ),
          Effect.uninterruptible,
          Effect.fork
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(recovered))
      assertSome(result, Either.left(true))
    }))
  it.effect("run of interruptible", () =>
    Effect.gen(function*() {
      const recovered = yield* (Ref.make<Option.Option<boolean>>(Option.none()))
      const fiber = yield* (withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(pipe(Effect.never, Effect.interruptible)),
          Effect.exit,
          Effect.flatMap((exit) => Ref.set(recovered, Option.some(Exit.isInterrupted(exit)))),
          Effect.uninterruptible,
          Effect.fork
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(recovered))
      assertSome(result, true)
    }))
  it.effect("alternating interruptibility", () =>
    Effect.gen(function*() {
      const counter = yield* (Ref.make(0))
      const fiber = yield* (withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(pipe(Effect.never, Effect.interruptible, Effect.exit)),
          Effect.zipRight(Ref.update(counter, (n) => n + 1)),
          Effect.uninterruptible,
          Effect.interruptible,
          Effect.exit,
          Effect.zipRight(Ref.update(counter, (n) => n + 1)),
          Effect.uninterruptible,
          Effect.fork
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(counter))
      strictEqual(result, 2)
    }))
  it.effect("interruption after defect", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const fiber = yield* (withLatch((release) =>
        pipe(
          Effect.try(() => {
            throw new Error()
          }),
          Effect.exit,
          Effect.zipRight(release),
          Effect.zipRight(Effect.never),
          Effect.ensuring(Ref.set(ref, true)),
          Effect.fork
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))
  it.effect("interruption after defect 2", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const fiber = yield* (withLatch((release) =>
        pipe(
          Effect.try(() => {
            throw new Error()
          }),
          Effect.exit,
          Effect.zipRight(release),
          Effect.zipRight(pipe(Effect.void, Effect.forever)),
          Effect.ensuring(Ref.set(ref, true)),
          Effect.fork
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))
  it.effect("disconnect returns immediately on interrupt", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<void>())
      const fiber = yield* (
        pipe(
          Deferred.succeed(deferred, void 0),
          Effect.zipRight(Effect.never),
          Effect.ensuring(Effect.never),
          Effect.disconnect,
          Effect.fork
        )
      )
      yield* (Deferred.await(deferred))
      const result = yield* (Fiber.interrupt(fiber))
      assertTrue(Exit.isInterrupted(result))
    }))
  it.live("disconnected effect that is then interrupted eventually performs interruption", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const fiber = yield* (
        pipe(
          Deferred.succeed(deferred1, void 0),
          Effect.zipRight(Effect.never),
          Effect.ensuring(
            pipe(
              Ref.set(ref, true),
              Effect.zipRight(Effect.sleep(Duration.millis(10))),
              Effect.zipRight(Deferred.succeed(deferred2, void 0))
            )
          ),
          Effect.disconnect,
          Effect.fork
        )
      )
      yield* (Deferred.await(deferred1))
      yield* (Fiber.interrupt(fiber))
      yield* (Deferred.await(deferred2))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))
  it.effect("cause reflects interruption", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        withLatch((release) => pipe(release, Effect.zipRight(Effect.fail("foo")), Effect.fork)),
        Effect.flatMap(Fiber.interrupt)
      )
      deepStrictEqual(result, Exit.fail("foo"))
    }))
  it.live("acquireRelease use inherits interrupt status", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const fiber = yield* (withLatchAwait((release2, await2) =>
        pipe(
          withLatch((release1) =>
            pipe(
              Effect.acquireUseRelease(
                release1,
                () =>
                  pipe(
                    await2,
                    Effect.zipRight(Effect.sleep(Duration.millis(10))),
                    Effect.zipRight(Ref.set(ref, true))
                  ),
                () => Effect.void
              ),
              Effect.uninterruptible,
              Effect.fork
            )
          ),
          Effect.zipLeft(release2)
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))
  it.live("acquireRelease use inherits interrupt status 2", () =>
    Effect.gen(function*() {
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const ref = yield* (Ref.make(false))
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          Deferred.succeed(latch1, void 0),
          () =>
            pipe(
              Deferred.await(latch2),
              Effect.zipRight(Effect.sleep(Duration.millis(10))),
              Effect.zipRight(Ref.set(ref, true)),
              Effect.asVoid
            ),
          () => Effect.void
        ),
        Effect.uninterruptible,
        Effect.fork
      )
      yield* (Deferred.await(latch1))
      yield* (Deferred.succeed(latch2, void 0))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))
  it.live("async can be uninterruptible", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const fiber = yield* (withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(Effect.sleep(Duration.millis(10))),
          Effect.zipRight(pipe(Ref.set(ref, true), Effect.asVoid)),
          Effect.uninterruptible,
          Effect.fork
        )
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))
  it.live("closing scope is uninterruptible", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const deferred = yield* (Deferred.make<void>())
      const child = pipe(
        Deferred.succeed(deferred, void 0),
        Effect.zipRight(Effect.sleep(Duration.millis(10))),
        Effect.zipRight(Ref.set(ref, true))
      )
      const parent = pipe(child, Effect.uninterruptible, Effect.fork, Effect.zipRight(Deferred.await(deferred)))
      const fiber = yield* (Effect.fork(parent))
      yield* (Deferred.await(deferred))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))
  it.effect("async cancelation", () =>
    Effect.gen(function*() {
      const ref = MutableRef.make(0)
      const effect = Effect.async(() => {
        pipe(ref, MutableRef.set(MutableRef.get(ref) + 1))
        return Effect.sync(() => {
          pipe(ref, MutableRef.set(MutableRef.get(ref) - 1))
        })
      })
      yield* pipe(Effect.void, Effect.race(effect))
      const result = MutableRef.get(ref)
      strictEqual(result, 0)
    }))
  it.effect("interruption status is inheritable", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const ref = yield* (Ref.make(true))
      yield* pipe(
        Effect.checkInterruptible((isInterruptible) =>
          pipe(Ref.set(ref, isInterruptible), Effect.zipRight(Deferred.succeed(latch, void 0)))
        ),
        Effect.fork,
        Effect.zipRight(Deferred.await(latch)),
        Effect.uninterruptible
      )
      const result = yield* (Ref.get(ref))
      assertFalse(result)
    }))
  it.effect("running an effect preserves interruption status", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<void>())
      const fiber = yield* (
        pipe(Deferred.succeed(deferred, void 0), Effect.zipRight(Effect.never), Effect.fork)
      )
      yield* (Deferred.await(deferred))
      const result = yield* (Fiber.interrupt(fiber))
      assertTrue(
        Exit.isFailure(result) && Exit.isInterrupted(result) && Cause.isInterruptedOnly(result.effect_instruction_i0)
      )
    }))
  it.effect("running an effect swallows inner interruption", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<number>())
      yield* pipe(Effect.interrupt, Effect.exit, Effect.zipRight(Deferred.succeed(deferred, 42)))
      const result = yield* (Deferred.await(deferred))
      strictEqual(result, 42)
    }))
  it.effect("AbortSignal is aborted", () =>
    Effect.gen(function*() {
      let signal: AbortSignal
      const fiber = yield* pipe(
        Effect.async<void, never, never>((_cb, signal_) => {
          signal = signal_
        }),
        Effect.fork
      )
      yield* (Effect.yieldNow())
      yield* (Fiber.interrupt(fiber))
      strictEqual(signal!.aborted, true)
    }))
})
