import type { Tuple } from "../../collection/immutable/Tuple"
import type { Stream } from "../Stream"

/**
 * Provides extension methods for streams that are sorted by distinct keys.
 *
 * @tsplus type ets/SortedByKey
 */
export type SortedByKey<R, E, K, A> = Stream<R, E, Tuple<[K, A]>>

/**
 * @tsplus type ets/SortedByKeyOps
 */
export interface SortedByKeyOps {}
export const SortedByKey: SortedByKeyOps = {}
