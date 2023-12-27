/**
 * @since 2.0.0
 */
import * as internal from "./internal/groupBy.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate } from "./Predicate.js"
import type * as Queue from "./Queue.js"
import type * as Stream from "./Stream.js"
import type * as Take from "./Take.js"
import type * as Types from "./Types.js"

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
  readonly grouped: Stream.Stream<R, E, readonly [K, Queue.Dequeue<Take.Take<E, V>>]>
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
      readonly _R: Types.Covariant<R>
      readonly _E: Types.Covariant<E>
      readonly _K: Types.Covariant<K>
      readonly _V: Types.Covariant<V>
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
    f: (key: K, stream: Stream.Stream<never, E, V>) => Stream.Stream<R2, E2, A>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): <R>(self: GroupBy<R, E, K, V>) => Stream.Stream<R2 | R, E | E2, A>
  <R, K, E, V, R2, E2, A>(
    self: GroupBy<R, E, K, V>,
    f: (key: K, stream: Stream.Stream<never, E, V>) => Stream.Stream<R2, E2, A>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): Stream.Stream<R | R2, E | E2, A>
} = internal.evaluate

/**
 * Filter the groups to be processed.
 *
 * @since 2.0.0
 * @category utils
 */
export const filter: {
  <K>(predicate: Predicate<K>): <R, E, V>(self: GroupBy<R, E, K, V>) => GroupBy<R, E, K, V>
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
  grouped: Stream.Stream<R, E, readonly [K, Queue.Dequeue<Take.Take<E, V>>]>
) => GroupBy<R, E, K, V> = internal.make
