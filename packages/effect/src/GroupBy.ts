/**
 * @since 2.0.0
 */
import * as internal from "./internal/groupBy.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate } from "./Predicate.js"
import type * as Queue from "./Queue.js"
import type * as Stream from "./Stream.js"
import type * as Take from "./Take.js"
import type { Covariant, NoInfer } from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const GroupByTypeId: unique symbol = internal.GroupByTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type GroupByTypeId = typeof GroupByTypeId

/**
 * Representation of a grouped stream. This allows to filter which groups will
 * be processed. Once this is applied all groups will be processed in parallel
 * and the results will be merged in arbitrary order.
 *
 * @since 2.0.0
 * @category models
 */
export interface GroupBy<out R, out E, out K, out V> extends GroupBy.Variance<R, E, K, V>, Pipeable {
  readonly grouped: Stream.Stream<readonly [K, Queue.Dequeue<Take.Take<V, E>>], E, R>
}

/**
 * @since 2.0.0
 */
export declare namespace GroupBy {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out R, out E, out K, out V> {
    readonly [GroupByTypeId]: {
      readonly _R: Covariant<R>
      readonly _E: Covariant<E>
      readonly _K: Covariant<K>
      readonly _V: Covariant<V>
    }
  }
}

/**
 * Run the function across all groups, collecting the results in an
 * arbitrary order.
 *
 * @since 2.0.0
 * @category destructors
 */
export const evaluate: {
  <K, E, V, R2, E2, A>(
    f: (key: K, stream: Stream.Stream<V, E>) => Stream.Stream<A, E2, R2>,
    options?: { readonly bufferSize?: number | undefined } | undefined
  ): <R>(self: GroupBy<R, E, K, V>) => Stream.Stream<A, E | E2, R2 | R>
  <R, K, E, V, R2, E2, A>(
    self: GroupBy<R, E, K, V>,
    f: (key: K, stream: Stream.Stream<V, E>) => Stream.Stream<A, E2, R2>,
    options?: { readonly bufferSize?: number | undefined } | undefined
  ): Stream.Stream<A, E | E2, R | R2>
} = internal.evaluate

/**
 * Filter the groups to be processed.
 *
 * @since 2.0.0
 * @category utils
 */
export const filter: {
  <K>(predicate: Predicate<NoInfer<K>>): <R, E, V>(self: GroupBy<R, E, K, V>) => GroupBy<R, E, K, V>
  <R, E, V, K>(self: GroupBy<R, E, K, V>, predicate: Predicate<K>): GroupBy<R, E, K, V>
} = internal.filter

/**
 * Only consider the first `n` groups found in the `Stream`.
 *
 * @since 2.0.0
 * @category utils
 */
export const first: {
  (n: number): <R, E, K, V>(self: GroupBy<R, E, K, V>) => GroupBy<R, E, K, V>
  <R, E, K, V>(self: GroupBy<R, E, K, V>, n: number): GroupBy<R, E, K, V>
} = internal.first

/**
 * Constructs a `GroupBy` from a `Stream`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <R, E, K, V>(
  grouped: Stream.Stream<readonly [K, Queue.Dequeue<Take.Take<V, E>>], E, R>
) => GroupBy<R, E, K, V> = internal.make
