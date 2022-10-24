/**
 * Provides extension methods for streams that are sorted by distinct keys.
 *
 * @tsplus type effect/core/stream/SortedByKey
 * @category model
 * @since 1.0.0
 */
export type SortedByKey<R, E, K, A> = Stream<R, E, readonly [K, A]>

/**
 * @tsplus type effect/core/stream/SortedByKey,Ops
 * @category model
 * @since 1.0.0
 */
export interface SortedByKeyOps {
  $: SortedByKeyAspects
}
export const SortedByKey: SortedByKeyOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stream/SortedByKey.Aspects
 * @category model
 * @since 1.0.0
 */
export interface SortedByKeyAspects {}
