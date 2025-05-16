import { describe, it } from "@effect/vitest"
import { assertNone, assertSome, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Runtime from "effect/Runtime"

describe("Effect", () => {
  it.effect("simple async must return", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.async<number, unknown, never>((cb) => {
        cb(Effect.succeed(42))
      }))
      strictEqual(result, 42)
    }))
  it.effect("simple asyncEffect must return", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.asyncEffect<number, never, never, never, never, never>((resume) => {
        return Effect.succeed(resume(Effect.succeed(42)))
      }))
      strictEqual(result, 42)
    }))
  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const os = require("node:os")
    it.effect("deep asyncEffect doesn't block", () =>
      Effect.gen(function*() {
        const asyncIO = (cont: Effect.Effect<number>): Effect.Effect<number> => {
          return Effect.asyncEffect((cb) => {
            return pipe(
              Effect.sleep(Duration.millis(5)),
              Effect.zipRight(cont),
              Effect.zipRight(Effect.succeed(cb(Effect.succeed(42))))
            )
          })
        }
        const stackIOs = (count: number): Effect.Effect<number> => {
          return count < 0 ? Effect.succeed(42) : asyncIO(stackIOs(count - 1))
        }
        const procNum = Effect.sync(() => os.cpus().length)
        const result = yield* pipe(procNum, Effect.flatMap(stackIOs))
        strictEqual(result, 42)
      }))
  }
  it.effect("interrupt of asyncEffect register", () =>
    Effect.gen(function*() {
      const release = yield* (Deferred.make<void>())
      const acquire = yield* (Deferred.make<void>())
      const fiber = yield* pipe(
        Effect.asyncEffect<unknown, unknown, never, never, never, never>(() =>
          // This will never complete because we never call the callback
          Effect.acquireUseRelease(
            Deferred.succeed(acquire, void 0),
            () => Effect.never,
            () => Deferred.succeed(release, void 0)
          )
        ),
        Effect.disconnect,
        Effect.fork
      )

      yield* (Deferred.await(acquire))
      yield* (Fiber.interruptFork(fiber))
      const result = yield* (Deferred.await(release))
      strictEqual(result, undefined)
    }))
  it.live("async should not resume fiber twice after interruption", () =>
    Effect.gen(function*() {
      const step = yield* (Deferred.make<void>())
      const unexpectedPlace = yield* (Ref.make(Chunk.empty<number>()))
      const runtime = yield* (Effect.runtime<never>())
      const fiber = yield* pipe(
        Effect.async<void, never, never>((cb) => {
          Runtime.runCallback(runtime)(pipe(
            Deferred.await(step),
            Effect.zipRight(Effect.sync(() => cb(Ref.update(unexpectedPlace, Chunk.prepend(1)))))
          ))
        }),
        Effect.ensuring(Effect.async<void, never, never>(() => {
          // The callback is never called so this never completes
          Runtime.runCallback(runtime)(Deferred.succeed(step, undefined))
        })),
        Effect.ensuring(Ref.update(unexpectedPlace, Chunk.prepend(2))),
        Effect.forkDaemon
      )
      const result = yield* pipe(Fiber.interrupt(fiber), Effect.timeout(Duration.seconds(1)), Effect.option)
      const unexpected = yield* (Ref.get(unexpectedPlace))
      deepStrictEqual(unexpected, Chunk.empty())
      assertNone(result) // the timeout should happen
    }))
  it.live("async should not resume fiber twice after synchronous result", () =>
    Effect.gen(function*() {
      const step = yield* (Deferred.make<void>())
      const unexpectedPlace = yield* (Ref.make(Chunk.empty<number>()))
      const runtime = yield* (Effect.runtime<never>())
      const fiber = yield* pipe(
        Effect.async<void, never, never>((resume) => {
          Runtime.runCallback(runtime)(pipe(
            Deferred.await(step),
            Effect.zipRight(Effect.sync(() => resume(Ref.update(unexpectedPlace, Chunk.prepend(1)))))
          ))
          return Effect.void
        }),
        Effect.flatMap(() =>
          Effect.async<void, never, never>(() => {
            // The callback is never called so this never completes
            Runtime.runCallback(runtime)(Deferred.succeed(step, void 0))
          })
        ),
        Effect.ensuring(Ref.update(unexpectedPlace, Chunk.prepend(2))),
        Effect.uninterruptible,
        Effect.forkDaemon
      )
      const result = yield* pipe(Fiber.interrupt(fiber), Effect.timeout(Duration.seconds(1)), Effect.option)
      const unexpected = yield* (Ref.get(unexpectedPlace))
      deepStrictEqual(unexpected, Chunk.empty())
      assertNone(result) // timeout should happen
    }))
  it.effect("sleep 0 must return", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.sleep(Duration.zero))
      strictEqual(result, undefined)
    }))
  it.effect("shallow bind of async chain", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const result = yield* (array.reduce((acc, _) =>
        pipe(
          acc,
          Effect.flatMap((n) =>
            Effect.async<number, never, never>((cb) => {
              cb(Effect.succeed(n + 1))
            })
          )
        ), Effect.succeed(0)))
      strictEqual(result, 10)
    }))
  it.effect("asyncEffect can fail before registering", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.asyncEffect<unknown, unknown, never, never, string, never>((_) => {
          return Effect.fail("ouch")
        }),
        Effect.flip
      )
      strictEqual(result, "ouch")
    }))
  it.effect("asyncEffect can defect before registering", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.asyncEffect<unknown, unknown, never, never, string, never>((_) =>
          Effect.sync(() => {
            throw new Error("ouch")
          })
        ),
        Effect.exit,
        Effect.map(Exit.match({
          onFailure: (cause) =>
            pipe(
              Cause.defects(cause),
              Chunk.head,
              Option.map((e) => (e as Error).message)
            ),
          onSuccess: () => Option.none()
        }))
      )
      assertSome(result, "ouch")
    }))
})
