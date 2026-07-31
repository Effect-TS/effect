/**
 * Controls how long resources stay open.
 *
 * A scope is a lifetime boundary. Code can register cleanup effects on it, and
 * closing the scope runs those cleanups with the `Exit` value that ended the
 * work. Most application code uses higher-level APIs such as `Effect.scoped`
 * and `Layer`, while this module is useful when code needs to create, provide,
 * fork, close, or inspect scopes directly.
 *
 * @since 2.0.0
 */

import type * as Context from "./Context.ts"
import type { Effect } from "./Effect.ts"
import type { Exit } from "./Exit.ts"
import * as effect from "./internal/effect.ts"

const TypeId = effect.ScopeTypeId
const CloseableTypeId = effect.ScopeCloseableTypeId

/**
 * A `Scope` represents a context where resources can be acquired and
 * automatically cleaned up when the scope is closed. Scopes can use
 * either sequential or parallel finalization strategies.
 *
 * @category models
 * @since 2.0.0
 */
export interface Scope {
  readonly [TypeId]: typeof TypeId
  readonly strategy: "sequential" | "parallel"
  state: State.Open | State.Closed | State.Empty
}
/**
 * A `Closeable` scope extends the base `Scope` interface with the ability
 * to be closed, executing all registered finalizers.
 *
 * @category models
 * @since 2.0.0
 */
export interface Closeable extends Scope {
  readonly [CloseableTypeId]: typeof CloseableTypeId
}

/**
 * The `State` namespace contains the concrete states of a scope: `Empty`
 * before any finalizers are registered, `Open` with registered finalizers, and
 * `Closed` with the exit value used to close the scope.
 *
 * @since 4.0.0
 */
export declare namespace State {
  /**
   * Represents an open scope with no registered finalizers yet.
   *
   * **Details**
   *
   * Adding the first finalizer transitions the scope to `Open`; closing an
   * empty scope transitions directly to `Closed` without producing a finalizer
   * effect.
   *
   * @category models
   * @since 4.0.0
   */
  export type Empty = {
    readonly _tag: "Empty"
  }
  /**
   * Represents an open scope state where finalizers can be added and
   * the scope is still accepting new resources.
   *
   * @category models
   * @since 4.0.0
   */
  export type Open = {
    readonly _tag: "Open"
    readonly finalizers: Map<{}, (exit: Exit<any, any>) => Effect<void>>
  }
  /**
   * Represents a closed scope state where finalizers have been executed
   * and the scope is no longer accepting new resources.
   *
   * @category models
   * @since 4.0.0
   */
  export type Closed = {
    readonly _tag: "Closed"
    readonly exit: Exit<any, any>
  }
}

/**
 * Service tag for the active resource lifetime.
 *
 * **When to use**
 *
 * Use to access the active lifetime when registering finalizers or sharing
 * resources with the surrounding scope.
 *
 * @category services
 * @since 2.0.0
 */
export const Scope: Context.Service<Scope, Scope> = effect.scopeTag

/**
 * Creates a new `Scope` with the specified finalizer strategy.
 *
 * @see {@link makeUnsafe} for synchronous allocation when the caller controls closure
 *
 * @category constructors
 * @since 2.0.0
 */
export const make: (finalizerStrategy?: "sequential" | "parallel") => Effect<Closeable> = effect.scopeMake

/**
 * Creates a new `Scope` synchronously without wrapping it in an `Effect`.
 * This is useful when you need a scope immediately but should be used with caution
 * as it doesn't provide the same safety guarantees as the `Effect`-wrapped version.
 *
 * **When to use**
 *
 * Use when a scope must be allocated synchronously and the caller will close it
 * manually.
 *
 * @see {@link make} for effectful scope allocation
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeUnsafe: (finalizerStrategy?: "sequential" | "parallel") => Closeable = effect.scopeMakeUnsafe

/**
 * Provides a concrete `Scope` to an effect.
 *
 * **When to use**
 *
 * Use to run an effect that requires `Scope` with a scope managed by the
 * caller.
 *
 * **Details**
 *
 * Providing the scope removes the `Scope` requirement from the effect context.
 *
 * **Example** (Providing a scope)
 *
 * ```ts import.meta.vitest
 * import { Effect, Exit, Scope } from "effect"
 *
 * const events: Array<string> = []
 * const program = Effect.gen(function*() {
 *   const scope = yield* Scope.make()
 *   const resource = yield* Scope.provide(
 *     Effect.acquireRelease(
 *       Effect.sync(() => {
 *         events.push("acquire")
 *         return "resource"
 *       }),
 *       () => Effect.sync(() => { events.push("release") })
 *     ),
 *     scope
 *   )
 *   events.push(`use ${resource}`)
 *   yield* Scope.close(scope, Exit.void)
 * })
 *
 * await Effect.runPromise(program)
 * events // => ["acquire", "use resource", "release"]
 * ```
 *
 * @see {@link use} for providing a closeable scope and closing it when the effect exits
 *
 * @category combinators
 * @since 4.0.0
 */
export const provide: {
  (value: Scope): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, Scope>>
  <A, E, R>(self: Effect<A, E, R>, value: Scope): Effect<A, E, Exclude<R, Scope>>
} = effect.provideScope

/**
 * Registers an exit-aware finalizer on a scope.
 *
 * **When to use**
 *
 * Use when cleanup needs to know whether the scope closed with success,
 * failure, or interruption.
 *
 * **Details**
 *
 * If the scope is open, the finalizer runs when the scope closes and receives
 * the scope's exit value.
 *
 * **Gotchas**
 *
 * If the scope is already closed, the finalizer runs immediately with the
 * stored exit value.
 *
 * **Example** (Adding an exit-aware finalizer)
 *
 * ```ts import.meta.vitest
 * import { Effect, Exit, Scope } from "effect"
 *
 * let closedWith: Exit.Exit<unknown, string> | undefined
 * const program = Effect.gen(function*() {
 *   const scope = yield* Scope.make()
 *   yield* Scope.addFinalizerExit(scope, (exit) => Effect.sync(() => {
 *     closedWith = exit
 *   }))
 *   yield* Scope.close(scope, Exit.fail("failed"))
 * })
 *
 * await Effect.runPromise(program)
 * closedWith // => Exit.fail("failed")
 * ```
 *
 * @see {@link addFinalizer} for cleanup that does not inspect the scope's exit
 *
 * @category combinators
 * @since 2.0.0
 */
export const addFinalizerExit: (scope: Scope, finalizer: (exit: Exit<any, any>) => Effect<unknown>) => Effect<void> =
  effect.scopeAddFinalizerExit

/**
 * Registers a finalizer effect on a scope.
 *
 * **Details**
 *
 * If the scope is open, the finalizer runs when the scope closes, regardless of
 * whether the scope closes successfully or with an error.
 *
 * **Gotchas**
 *
 * If the scope is already closed, the finalizer runs immediately.
 *
 * **Example** (Adding finalizers)
 *
 * ```ts import.meta.vitest
 * import { Effect, Exit, Scope } from "effect"
 *
 * const events: Array<string> = []
 * const program = Effect.gen(function*() {
 *   const scope = yield* Scope.make()
 *   yield* Scope.addFinalizer(scope, Effect.sync(() => events.push("cleanup 1")))
 *   yield* Scope.addFinalizer(scope, Effect.sync(() => events.push("cleanup 2")))
 *   yield* Scope.addFinalizer(scope, Effect.sync(() => events.push("cleanup 3")))
 *   events.push("work")
 *   yield* Scope.close(scope, Exit.void)
 * })
 *
 * await Effect.runPromise(program)
 * events // => ["work", "cleanup 3", "cleanup 2", "cleanup 1"]
 * ```
 *
 * @see {@link addFinalizerExit} for cleanup that receives the scope's exit
 *
 * @category combinators
 * @since 2.0.0
 */
export const addFinalizer: (scope: Scope, finalizer: Effect<unknown>) => Effect<void> = effect.scopeAddFinalizer

/**
 * Creates a closeable child scope registered with a parent scope.
 *
 * **Details**
 *
 * Closing the parent closes the child with the same exit value, and closing the
 * child detaches it from the parent. The optional finalizer strategy configures
 * the child scope and defaults to `"sequential"` when omitted.
 *
 * **Gotchas**
 *
 * Forking an already closed parent returns a closed child with the parent's exit
 * value.
 *
 * **Example** (Closing a child through its parent)
 *
 * ```ts import.meta.vitest
 * import { Effect, Exit, Scope } from "effect"
 *
 * const events: Array<string> = []
 * const program = Effect.gen(function*() {
 *   const parent = yield* Scope.make()
 *   yield* Scope.addFinalizerExit(parent, (exit) =>
 *     Effect.sync(() => { events.push(`parent ${exit._tag}`) }))
 *   const child = yield* Scope.fork(parent)
 *   yield* Scope.addFinalizerExit(child, (exit) =>
 *     Effect.sync(() => { events.push(`child ${exit._tag}`) }))
 *   yield* Scope.close(parent, Exit.fail("failed"))
 * })
 *
 * await Effect.runPromise(program)
 * events // => ["child Failure", "parent Failure"]
 * ```
 *
 * @see {@link forkUnsafe} for synchronous child-scope allocation
 *
 * @category combinators
 * @since 2.0.0
 */
export const fork: (
  scope: Scope,
  finalizerStrategy?: "sequential" | "parallel"
) => Effect<Closeable> = effect.scopeFork

/**
 * Creates a closeable child scope synchronously and registers it with a parent scope.
 *
 * **When to use**
 *
 * Use when a child scope must be created synchronously and the caller controls
 * both parent and child scope lifetimes.
 *
 * **Details**
 *
 * Closing the parent closes the child with the same exit value, and closing the
 * child detaches it from the parent. The optional finalizer strategy configures
 * the child scope and defaults to `"sequential"` when omitted.
 *
 * @see {@link fork} for effectful child-scope allocation
 *
 * @category combinators
 * @since 4.0.0
 */
export const forkUnsafe: (scope: Scope, finalizerStrategy?: "sequential" | "parallel") => Closeable =
  effect.scopeForkUnsafe

/**
 * Closes a scope and runs its registered finalizers.
 *
 * **When to use**
 *
 * Use to close a scope manually with a specific exit value.
 *
 * **Details**
 *
 * Finalizers run in the scope's configured order and receive the supplied
 * `Exit`.
 *
 * @see {@link closeUnsafe} for closing synchronously and receiving the finalizer effect, if any
 *
 * @category combinators
 * @since 2.0.0
 */
export const close: <A, E>(self: Scope, exit: Exit<A, E>) => Effect<void> = effect.scopeClose

/**
 * Closes a scope unsafely with the provided exit value.
 *
 * **When to use**
 *
 * Use when implementing lower-level scope machinery that must transition a
 * scope to `Closed` immediately and can run the returned finalizer effect when
 * one is produced.
 *
 * **Details**
 *
 * Returns an effect that runs registered finalizers, or `undefined` when the
 * scope was already closed or no finalizers need to run.
 *
 * **Gotchas**
 *
 * Ignoring the returned effect skips registered finalizers.
 *
 * @see {@link close} for the usual effectful close operation that always returns an `Effect`
 *
 * @category unsafe
 * @since 4.0.0
 */
export const closeUnsafe: <A, E>(self: Scope, exit_: Exit<A, E>) => Effect<void, never, never> | undefined =
  effect.scopeCloseUnsafe

/**
 * Runs an effect with the provided closeable scope in its context and closes
 * that scope when the effect exits.
 *
 * **When to use**
 *
 * Use when you already have a `Closeable` scope and want to run an effect that
 * requires `Scope` while automatically closing that scope when the effect exits.
 *
 * **Details**
 *
 * The scope is closed with the same exit value as the effect, so registered
 * finalizers can observe whether the effect succeeded, failed, or was
 * interrupted.
 *
 * **Example** (Cleaning up after interruption)
 *
 * ```ts import.meta.vitest
 * import { Effect, Exit, Scope } from "effect"
 *
 * const events: Array<string> = []
 * const program = Effect.gen(function*() {
 *   const scope = yield* Scope.make()
 *   yield* Scope.addFinalizer(scope, Effect.sync(() => { events.push("cleanup") }))
 *   const exit = yield* Effect.exit(Scope.use(Effect.interrupt, scope))
 *   return Exit.hasInterrupts(exit)
 * })
 *
 * await Effect.runPromise(program) // => true
 * events // => ["cleanup"]
 * ```
 *
 * @see {@link provide} for providing a scope without closing it automatically
 * @see `Effect.scoped` for creating and closing a fresh scope around a workflow
 *
 * @category combinators
 * @since 2.0.0
 */
export const use: {
  (scope: Closeable): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, Scope>>
  <A, E, R>(self: Effect<A, E, R>, scope: Closeable): Effect<A, E, Exclude<R, Scope>>
} = effect.scopeUse
