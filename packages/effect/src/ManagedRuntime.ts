/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect.js"
import type * as Exit from "./Exit.js"
import type * as Fiber from "./Fiber.js"
import * as internal from "./internal/managedRuntime.js"
import type * as Layer from "./Layer.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Runtime from "./Runtime.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface ManagedRuntime<in R, out ER> extends Pipeable {
  readonly memoMap: Layer.MemoMap
  readonly runtimeEffect: Effect.Effect<Runtime.Runtime<R>, ER>
  readonly runtime: () => Promise<Runtime.Runtime<R>>

  /**
   * Executes the effect using the provided Scheduler or using the global
   * Scheduler if not provided
   */
  readonly runFork: <A, E>(
    self: Effect.Effect<A, E, R>,
    options?: Runtime.RunForkOptions
  ) => Fiber.RuntimeFiber<A, E | ER>

  /**
   * Executes the effect synchronously returning the exit.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  readonly runSyncExit: <A, E>(effect: Effect.Effect<A, E, R>) => Exit.Exit<A, ER | E>

  /**
   * Executes the effect synchronously throwing in case of errors or async boundaries.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  readonly runSync: <A, E>(effect: Effect.Effect<A, E, R>) => A

  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  readonly runCallback: <A, E>(
    effect: Effect.Effect<A, E, R>,
    options?: Runtime.RunCallbackOptions<A, E | ER> | undefined
  ) => Runtime.Cancel<A, E | ER>

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the value of the effect once the effect has been executed, or will be
   * rejected with the first error or exception throw by the effect.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  readonly runPromise: <A, E>(effect: Effect.Effect<A, E, R>, options?: {
    readonly signal?: AbortSignal | undefined
  }) => Promise<A>

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the `Exit` state of the effect once the effect has been executed.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  readonly runPromiseExit: <A, E>(effect: Effect.Effect<A, E, R>, options?: {
    readonly signal?: AbortSignal | undefined
  }) => Promise<Exit.Exit<A, ER | E>>

  /**
   * Dispose of the resources associated with the runtime.
   */
  readonly dispose: () => Promise<void>

  /**
   * Dispose of the resources associated with the runtime.
   */
  readonly disposeEffect: Effect.Effect<void, never, never>
}

/**
 * Convert a Layer into an ManagedRuntime, that can be used to run Effect's using
 * your services.
 *
 * @since 2.0.0
 * @category runtime class
 * @example
 * import { Console, Effect, Layer, ManagedRuntime } from "effect"
 *
 * class Notifications extends Effect.Tag("Notifications")<
 *   Notifications,
 *   { readonly notify: (message: string) => Effect.Effect<void> }
 * >() {
 *   static Live = Layer.succeed(this, { notify: (message) => Console.log(message) })
 * }
 *
 * async function main() {
 *   const runtime = ManagedRuntime.make(Notifications.Live)
 *   await runtime.runPromise(Notifications.notify("Hello, world!"))
 *   await runtime.dispose()
 * }
 *
 * main()
 */
export const make: <R, E>(
  layer: Layer.Layer<R, E, never>,
  memoMap?: Layer.MemoMap | undefined
) => ManagedRuntime<R, E> = internal.make
