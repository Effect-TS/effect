/**
 * @since 2.0.0
 */
import * as internal from "../internal/groupBy.js"
import type { Predicate } from "../Predicate.js"
import type { Queue } from "../Queue.js"
import type { Stream } from "../Stream.js"
import type { Take } from "../Take.js"

import type { GroupBy } from "../GroupBy.js"

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
 * Run the function across all groups, collecting the results in an
 * arbitrary order.
 *
 * @since 2.0.0
 * @category destructors
 */
export const evaluate: {
  <K, E, V, R2, E2, A>(
    f: (key: K, stream: Stream<never, E, V>) => Stream<R2, E2, A>,
    options?: { readonly bufferSize?: number }
  ): <R>(self: GroupBy<R, E, K, V>) => Stream<R2 | R, E | E2, A>
  <R, K, E, V, R2, E2, A>(
    self: GroupBy<R, E, K, V>,
    f: (key: K, stream: Stream<never, E, V>) => Stream<R2, E2, A>,
    options?: { readonly bufferSize?: number }
  ): Stream<R | R2, E | E2, A>
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
  grouped: Stream<R, E, readonly [K, Queue.Dequeue<Take<E, V>>]>
) => GroupBy<R, E, K, V> = internal.make
