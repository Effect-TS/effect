/**
 * Reference-counted handles for sharing one scoped resource across many scoped
 * users. An `RcRef<A, E>` acquires the resource lazily the first time `get`
 * needs it, reuses that value while it is borrowed or kept idle, and finalizes
 * it when the final borrowing scope closes unless an idle timeout keeps it
 * available. Closing the scope that created the reference also closes the
 * cached resource. The module provides `invalidate` for forcing the next `get`
 * to acquire a fresh resource.
 *
 * @since 3.5.0
 */
import type * as Duration from "./Duration.ts"
import type * as Effect from "./Effect.ts"
import * as internal from "./internal/rcRef.ts"
import type { Pipeable } from "./Pipeable.ts"
import type { Scope } from "./Scope.ts"
import type * as Types from "./Types.ts"

const TypeId = "~effect/RcRef"

/**
 * A reference counted reference that manages resource lifecycle.
 *
 * **When to use**
 *
 * Use to share a scoped resource across active users with reference-counted
 * acquisition and release.
 *
 * **Details**
 *
 * An RcRef wraps a resource that can be acquired and released multiple times.
 * The resource is lazily acquired on the first call to `get` and automatically
 * released when the last reference is released or its owning scope closes.
 *
 * @category models
 * @since 3.5.0
 */
export interface RcRef<out A, out E = never> extends Pipeable {
  readonly [TypeId]: RcRef.Variance<A, E>
}

/**
 * Namespace containing type-level members associated with `RcRef`.
 *
 * @since 3.5.0
 */
export declare namespace RcRef {
  /**
   * Type-level variance marker for `RcRef`.
   *
   * **When to use**
   *
   * Use to carry the value and error type parameters for `RcRef` in Effect's
   * type machinery.
   *
   * **Details**
   *
   * This interface records the covariant value and error types carried by an
   * `RcRef`. It is used by Effect's type machinery and is not normally
   * referenced directly by users.
   *
   * @category models
   * @since 3.5.0
   */
  export interface Variance<A, E> {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
  }
}

/**
 * Creates an `RcRef` from an acquire effect.
 *
 * **When to use**
 *
 * Use to create a lazily acquired, reference-counted resource from an acquire
 * effect.
 *
 * **Details**
 *
 * The resource is acquired lazily on the first `get` and shared by subsequent
 * gets while it remains cached. Each `get` adds a reference to the current
 * `Scope`. When the last reference is released, the resource is closed
 * immediately by default, or after `idleTimeToLive` when that option is
 * provided. An infinite idle time keeps the resource until invalidation or
 * until the scope that created the `RcRef` closes.
 *
 * **Gotchas**
 *
 * Closing the scope that creates the `RcRef` closes the cached resource even if
 * borrower scopes are still open. Do not use the reference after its owning
 * scope closes.
 *
 * **Example** (Releasing after an idle period)
 *
 * ```ts import.meta.vitest
 * import { Effect, RcRef } from "effect"
 * import { TestClock } from "effect/testing"
 *
 * const events: Array<string> = []
 * const program = Effect.scoped(Effect.gen(function*() {
 *   const ref = yield* RcRef.make({
 *     acquire: Effect.acquireRelease(
 *       Effect.sync(() => {
 *         events.push("acquire")
 *         return "resource"
 *       }),
 *       () => Effect.sync(() => { events.push("release") })
 *     ),
 *     idleTimeToLive: "1 hour"
 *   })
 *
 *   yield* Effect.scoped(RcRef.get(ref))
 *   const beforeExpiry = [...events]
 *   yield* TestClock.adjust("1 hour")
 *   return [beforeExpiry, [...events]] as const
 * }))
 *
 * await Effect.runPromise(Effect.provide(program, TestClock.layer())) // => [["acquire"], ["acquire", "release"]]
 * ```
 *
 * @see {@link get} for borrowing the cached resource in the current scope
 * @see {@link invalidate} for forcing the next borrow to acquire a fresh resource
 *
 * @category constructors
 * @since 3.5.0
 */
export const make: <A, E, R>(
  options: {
    readonly acquire: Effect.Effect<A, E, R>
    /**
     * When the reference count reaches zero, the resource will be released
     * after this duration.
     */
    readonly idleTimeToLive?: Duration.Input | undefined
  }
) => Effect.Effect<RcRef<A, E>, never, R | Scope> = internal.make

/**
 * Gets the value from an `RcRef`, acquiring it first if needed.
 *
 * **When to use**
 *
 * Use to borrow the current resource within a `Scope`, acquiring it first if
 * necessary.
 *
 * **Details**
 *
 * The reference count is incremented for the current `Scope`, and a release
 * finalizer is added to that scope. When the current scope closes, the
 * reference is released; the resource is closed when the final reference is
 * released, subject to any configured idle time-to-live.
 *
 * **Example** (Releasing after the final borrower closes)
 *
 * ```ts import.meta.vitest
 * import { Effect, Exit, RcRef, Scope } from "effect"
 *
 * const events: Array<string> = []
 * const program = Effect.scoped(Effect.gen(function*() {
 *   const ref = yield* RcRef.make({
 *     acquire: Effect.acquireRelease(
 *       Effect.sync(() => {
 *         events.push("acquire")
 *         return {}
 *       }),
 *       () => Effect.sync(() => { events.push("release") })
 *     )
 *   })
 *
 *   const firstScope = yield* Scope.make()
 *   const secondScope = yield* Scope.make()
 *   const first = yield* Scope.provide(RcRef.get(ref), firstScope)
 *   const second = yield* Scope.provide(RcRef.get(ref), secondScope)
 *   yield* Scope.close(firstScope, Exit.void)
 *   const afterFirstClose = [...events]
 *   yield* Scope.close(secondScope, Exit.void)
 *   return [first === second, afterFirstClose, [...events]] as const
 * }))
 *
 * await Effect.runPromise(program) // => [true, ["acquire"], ["acquire", "release"]]
 * ```
 *
 * @see {@link make} for configuring acquisition and idle lifetime
 * @see {@link invalidate} for replacing a cached resource
 *
 * @category combinators
 * @since 3.5.0
 */
export const get: <A, E>(self: RcRef<A, E>) => Effect.Effect<A, E, Scope> = internal.get

/**
 * Invalidates the currently cached resource, if one has been acquired.
 *
 * **When to use**
 *
 * Use to force future `RcRef.get` calls to acquire a fresh resource when the
 * currently cached resource should no longer be reused.
 *
 * **Details**
 *
 * After invalidation, the next `get` acquires a fresh resource.
 *
 * **Gotchas**
 *
 * Invalidation does not revoke resources already borrowed by active scopes;
 * those remain usable until their scopes close.
 *
 * @see {@link get} for acquiring the current cached resource or the fresh resource after invalidation
 *
 * @category combinators
 * @since 3.19.6
 */
export const invalidate: <A, E>(self: RcRef<A, E>) => Effect.Effect<void> = internal.invalidate
