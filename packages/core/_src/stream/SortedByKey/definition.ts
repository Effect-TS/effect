/**
 * Provides extension methods for streams that are sorted by distinct keys.
 *
 * @tsplus type ets/SortedByKey
 */
export type SortedByKey<R, E, K, A> = Stream<R, E, Tuple<[K, A]>>;

/**
 * @tsplus type ets/SortedByKey/Ops
 */
export interface SortedByKeyOps {
  $: SortedByKeyAspects;
}
export const SortedByKey: SortedByKeyOps = {
  $: {}
};

/**
 * @tsplus type ets/SortedByKey/Aspects
 */
export interface SortedByKeyAspects {}
