/**
 * Provides extension methods for streams that are sorted by distinct keys.
 *
 * @tsplus type effect/core/stream/SortedByKey
 */
export type SortedByKey<R, E, K, A> = Stream<R, E, readonly [K, A]>

/**
 * @tsplus type effect/core/stream/SortedByKey,Ops
 */
export interface SortedByKeyOps {
  $: SortedByKeyAspects
}
export const SortedByKey: SortedByKeyOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stream/SortedByKey.Aspects
 */
export interface SortedByKeyAspects {}
