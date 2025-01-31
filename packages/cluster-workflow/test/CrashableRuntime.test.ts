import * as CrashableRuntime from "@effect/cluster-workflow/CrashableRuntime"
import * as Fiber from "effect/Fiber"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"

import { describe, expect, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

describe.concurrent("CrashableRuntime", () => {
  const withTestEnv = <R, E, A>(fa: Effect.Effect<R, E, A>) => pipe(fa, Logger.withMinimumLogLevel(LogLevel.Info))

  it("Should run as expected if not crashed", () => {
    return Effect.gen(function*(_) {
      const runtime = yield* _(CrashableRuntime.make)

      const value = yield* _(
        runtime.run(() => Effect.succeed(42))
      )

      expect(value).toEqual(42)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Should fail with CrashableRuntimeCrashed", () => {
    return Effect.gen(function*(_) {
      const runtime = yield* _(CrashableRuntime.make)
      const valueRef = yield* _(Ref.make<null | CrashableRuntime.CrashableRuntimeCrashedError>(null))

      yield* _(
        runtime.run(() => runtime.crash),
        Effect.catchAll((error) => Ref.set(valueRef, error))
      )

      const value = yield* _(Ref.get(valueRef))

      expect(value).toEqual(new CrashableRuntime.CrashableRuntimeCrashedError())
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Upon crash, release should not happen", () => {
    return Effect.gen(function*(_) {
      const runtime = yield* _(CrashableRuntime.make)
      const valueRef = yield* _(Ref.make(0))

      yield* _(
        runtime.run(() =>
          Effect.acquireUseRelease(
            Ref.set(valueRef, 1),
            () => pipe(Ref.set(valueRef, 2), Effect.zipRight(runtime.crash), Effect.zipRight(Ref.set(valueRef, 3))),
            () => Ref.set(valueRef, 4)
          )
        ),
        Effect.catchAll(() => Effect.void)
      )

      const value = yield* _(Ref.get(valueRef))

      expect(value).toEqual(2)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Effects in restore should run as regular effects", () => {
    return Effect.gen(function*(_) {
      const runtime = yield* _(CrashableRuntime.make)
      const valueRef = yield* _(Ref.make(0))

      yield* _(
        runtime.run((restore) =>
          restore(pipe(
            runtime.crash,
            Effect.zipRight(Ref.set(valueRef, 42))
          ))
        ),
        Effect.catchAll(() => Effect.void)
      )

      const value = yield* _(Ref.get(valueRef))

      expect(value).toEqual(42)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Internal interrupt should be catched by effect.exit", () => {
    return Effect.gen(function*(_) {
      let exit: any = null

      const test = pipe(
        Effect.interrupt,
        Effect.exit,
        Effect.map((_) => {
          exit = _
        })
      )

      yield* _(test)

      expect(exit).not.toEqual(null)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("External interrupt should not be catched by effect.exit", () => {
    return Effect.gen(function*(_) {
      let exit: any = null

      const test = pipe(
        Effect.never,
        Effect.exit,
        Effect.map((_) => {
          exit = _
        }),
        Effect.timeout(Duration.millis(100)),
        Effect.catchAllCause(() => Effect.void)
      )

      yield* _(test)

      expect(exit).toEqual(null)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Emulation of fiber interrupt from internal", () => {
    let exit: any = null

    const test = pipe(
      Fiber.getCurrentFiber(),
      Option.match({
        onNone: () => Effect.interrupt,
        onSome: (_) => Fiber.interrupt(_)
      }),
      Effect.asVoid,
      Effect.map((_) => {
        exit = _
      })
    )

    Effect.runSyncExit(test)

    expect(exit).toEqual(null)
  })
})
