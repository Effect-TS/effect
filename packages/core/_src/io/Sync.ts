import * as E from "@effect/core/io/Effect"

export const SyncURI: unique symbol = Symbol.for("@effect/core/io/Sync")

/**
 * A `Sync<R, E, A>` is an `Effect<R, E, A>` that is known to be able to
 * run syncroniously, note that this is a direct sub-type of `Effect` and
 * will be treated as a normal effect when combined with `Effect`
 *
 * @tspls type effect/core/io/Sync
 */
export interface Sync<R, E, A> extends Effect<R, E, A> {
  readonly [SyncURI]: never
}

export const Sync: SyncOps = {}

/**
 * @tsplus type effect/core/io/Sync.Ops
 */
export interface SyncOps {}

/**
 * @tsplus static effect/core/io/Sync.Ops succeed
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <A>(a: A) => Sync<never, never, A> = E.succeed as any

/**
 * @tsplus static effect/core/io/Sync.Ops sync
 * @since 1.0.0
 * @category constructors
 */
export const sync: <A>(a: LazyArg<A>) => Sync<never, never, A> = E.sync as any

/**
 * @tsplus static effect/core/io/Sync.Ops fail
 * @since 1.0.0
 * @category constructors
 */
export const fail: <E>(a: E) => Sync<never, E, never> = E.fail as any

/**
 * @tsplus static effect/core/io/Sync.Ops failSync
 * @since 1.0.0
 * @category constructors
 */
export const failSync: <E>(a: LazyArg<E>) => Sync<never, E, never> = E.failSync as any

/**
 * @tsplus pipeable effect/core/io/Sync map
 * @since 1.0.0
 * @category mapping
 */
export const map: <A, B>(
  f: (a: A) => B
) => <R, E>(self: Sync<R, E, A>) => Sync<R, E, B> = E.map as any

/**
 * @tsplus pipeable effect/core/io/Sync flatMap
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap: <A, B, R2, E2>(
  f: (a: A) => Sync<R2, E2, B>
) => <R, E>(self: Sync<R, E, A>) => Sync<R, E, B> = E.flatMap as any

/**
 * @tsplus fluent effect/core/io/Sync unsafeRunSync
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeRunSync: <E, A>(
  effect: Sync<never, E, A>
) => A = E.unsafeRunSync as any

/**
 * @tsplus fluent effect/core/io/Sync unsafeRunSyncExit
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeRunSyncExit: <E, A>(
  effect: Sync<never, E, A>
) => Exit<E, A> = E.unsafeRunSyncExit as any
