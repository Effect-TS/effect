import { FiberRefs } from "@effect/core/io/FiberRefs"
import * as Context from "@fp-ts/data/Context"

/**
 * Returns an effect that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into Effect code.
 *
 * @tsplus static effect/core/io/Effect.Ops runtime
 * @category getters
 * @since 1.0.0
 */
export function runtime<R>(): Effect<R, never, Runtime<R>> {
  return Effect.withFiberRuntime<R, never, Runtime<R>>((state, status) =>
    Effect.succeed(
      new Runtime<R>(
        state.getFiberRef(FiberRef.currentEnvironment as unknown as FiberRef<Context.Context<R>>),
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
  Context.empty(),
  defaultFlags,
  new FiberRefs(new Map())
)

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunPromise
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunPromise
 * @category runtime
 * @since 1.0.0
 */
export const unsafeRunPromise = defaultRuntime.unsafeRunPromise

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunAsync
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunAsync
 * @category runtime
 * @since 1.0.0
 */
export const unsafeRunAsync = defaultRuntime.unsafeRunAsync

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunAsyncWith
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunAsyncWith
 * @category runtime
 * @since 1.0.0
 */
export const unsafeRunAsyncWith = defaultRuntime.unsafeRunAsyncWith

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunPromiseExit
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunPromiseExit
 * @category runtime
 * @since 1.0.0
 */
export const unsafeRunPromiseExit = defaultRuntime.unsafeRunPromiseExit

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunWith
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunWith
 * @category runtime
 * @since 1.0.0
 */
export const unsafeRunWith = defaultRuntime.unsafeRunWith

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunSync
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunSync
 * @category runtime
 * @since 1.0.0
 */
export const unsafeRunSync = defaultRuntime.unsafeRunSync

/**
 * @tsplus fluent effect/core/io/Effect unsafeRunSyncExit
 * @tsplus static effect/core/io/Effect.Aspects unsafeRunSyncExit
 * @category runtime
 * @since 1.0.0
 */
export const unsafeRunSyncExit = defaultRuntime.unsafeRunSyncExit
