import { FiberRefs } from "@effect/core/io/FiberRefs"

/**
 * Returns an effect that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into Effect code.
 *
 * @tsplus static effect/core/io/Effect.Ops runtime
 */
export function runtime<R>(): Effect<R, never, Runtime<R>> {
  return Effect.withFiberRuntime<R, never, Runtime<R>>((state, status) =>
    Effect.succeed(
      new Runtime<R>(
        state.getFiberRef(FiberRef.currentEnvironment),
        status.runtimeFlags,
        state.getFiberRefs
      )
    )
  )
}

export const defaultFlags = RuntimeFlags(
  RuntimeFlags.FiberRoots,
  RuntimeFlags.Interruption,
  RuntimeFlags.CooperativeYielding
)

export const defaultRuntime = new Runtime<never>(
  Env.empty,
  defaultFlags,
  new FiberRefs(ImmutableMap.empty())
)

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunPromise
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunPromise
 */
export const unsafeRunPromise = defaultRuntime.unsafeRunPromise

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunAsync
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunAsync
 */
export const unsafeRunAsync = defaultRuntime.unsafeRunAsync

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunAsyncWith
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunAsyncWith
 */
export const unsafeRunAsyncWith = defaultRuntime.unsafeRunAsyncWith

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunPromiseExit
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunPromiseExit
 */
export const unsafeRunPromiseExit = defaultRuntime.unsafeRunPromiseExit

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunWith
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunWith
 */
export const unsafeRunWith = defaultRuntime.unsafeRunWith

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunSync
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunSync
 */
export const unsafeRunSync = defaultRuntime.unsafeRunSync

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunSyncExit
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunSyncExit
 */
export const unsafeRunSyncExit = defaultRuntime.unsafeRunSyncExit
