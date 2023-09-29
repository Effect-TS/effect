/**
 * @since 2.0.0
 */
import type { Cause } from "./Cause"
import type * as Context from "./Context"
import type * as Effect from "./Effect"
import type * as Exit from "./Exit"
import type * as Fiber from "./Fiber"
import type * as FiberId from "./FiberId"
import type * as FiberRefs from "./FiberRefs"
import type { Inspectable } from "./Inspectable"
import * as internal from "./internal/runtime"
import type { Pipeable } from "./Pipeable"
import type * as RuntimeFlags from "./RuntimeFlags"
import type { Scheduler } from "./Scheduler"

/**
 * @since 2.0.0
 * @category models
 */
export interface AsyncFiberException<E, A> {
  readonly _tag: "AsyncFiberException"
  readonly fiber: Fiber.RuntimeFiber<E, A>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Cancel<E, A> {
  (fiberId?: FiberId.FiberId, onExit?: (exit: Exit.Exit<E, A>) => void): void
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Runtime<R> extends Pipeable {
  /**
   * The context used as initial for forks
   */
  readonly context: Context.Context<R>
  /**
   * The runtime flags used as initial for forks
   */
  readonly runtimeFlags: RuntimeFlags.RuntimeFlags
  /**
   * The fiber references used as initial for forks
   */
  readonly fiberRefs: FiberRefs.FiberRefs
}

/**
 * @since 2.0.0
 * @category models
 */
export interface RunForkOptions {
  scheduler?: Scheduler
  updateRefs?: (refs: FiberRefs.FiberRefs, fiberId: FiberId.Runtime) => FiberRefs.FiberRefs
}

/**
 * Executes the effect using the provided Scheduler or using the global
 * Scheduler if not provided
 *
 * @since 2.0.0
 * @category execution
 */
export const runFork: <R>(
  runtime: Runtime<R>
) => <E, A>(self: Effect.Effect<R, E, A>, options?: RunForkOptions | undefined) => Fiber.RuntimeFiber<E, A> =
  internal.unsafeFork

/**
 * Executes the effect synchronously returning the exit.
 *
 * This method is effectful and should only be invoked at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runSyncExit: <R>(runtime: Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>) => Exit.Exit<E, A> =
  internal.unsafeRunSyncExit

/**
 * Executes the effect synchronously throwing in case of errors or async boundaries.
 *
 * This method is effectful and should only be invoked at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runSync: <R>(runtime: Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>) => A = internal.unsafeRunSync

/**
 * Executes the effect asynchronously, eventually passing the exit value to
 * the specified callback.
 *
 * This method is effectful and should only be invoked at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runCallback: <R>(
  runtime: Runtime<R>
) => <E, A>(
  effect: Effect.Effect<R, E, A>,
  onExit?: ((exit: Exit.Exit<E, A>) => void) | undefined
) => (fiberId?: FiberId.FiberId | undefined, onExit?: ((exit: Exit.Exit<E, A>) => void) | undefined) => void =
  internal.unsafeRunCallback

/**
 * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
 * with the value of the effect once the effect has been executed, or will be
 * rejected with the first error or exception throw by the effect.
 *
 * This method is effectful and should only be used at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runPromise: <R>(runtime: Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>) => Promise<A> =
  internal.unsafeRunPromise

/**
 * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
 * with the `Exit` state of the effect once the effect has been executed.
 *
 * This method is effectful and should only be used at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runPromiseExit: <R>(
  runtime: Runtime<R>
) => <E, A>(effect: Effect.Effect<R, E, A>) => Promise<Exit.Exit<E, A>> = internal.unsafeRunPromiseExit

/**
 * @since 2.0.0
 * @category constructors
 */
export const defaultRuntime: Runtime<never> = internal.defaultRuntime

/**
 * @since 2.0.0
 * @category constructors
 */
export const defaultRuntimeFlags: RuntimeFlags.RuntimeFlags = internal.defaultRuntimeFlags

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <R>(
  options: {
    readonly context: Context.Context<R>
    readonly runtimeFlags: RuntimeFlags.RuntimeFlags
    readonly fiberRefs: FiberRefs.FiberRefs
  }
) => Runtime<R> = internal.make

/**
 * @since 2.0.0
 * @category symbols
 */
export const FiberFailureId = Symbol.for("effect/Runtime/FiberFailure")
/**
 * @since 2.0.0
 * @category symbols
 */
export type FiberFailureId = typeof FiberFailureId

/**
 * @since 2.0.0
 * @category symbols
 */
export const FiberFailureCauseId: unique symbol = internal.FiberFailureCauseId

/**
 * @since 2.0.0
 * @category exports
 */
export type FiberFailureCauseId = typeof FiberFailureCauseId

/**
 * @since 2.0.0
 * @category models
 */
export interface FiberFailure extends Error, Inspectable {
  readonly [FiberFailureId]: FiberFailureId
  readonly [FiberFailureCauseId]: Cause<unknown>
}

/**
 * @since 2.0.0
 * @category guards
 */
export const isAsyncFiberException: (u: unknown) => u is AsyncFiberException<unknown, unknown> =
  internal.isAsyncFiberException

/**
 * @since 2.0.0
 * @category guards
 */
export const isFiberFailure: (u: unknown) => u is FiberFailure = internal.isFiberFailure

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeFiberFailure: <E>(cause: Cause<E>) => FiberFailure = internal.fiberFailure
