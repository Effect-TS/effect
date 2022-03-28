import type { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number of
 * concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is
 * maintained.
 *
 * @tsplus fluent ets/Stream mapEffectPartitioned
 */
export function mapEffectPartitioned_<R, E, A, R2, E2, A2, K>(
  self: Stream<R, E, A>,
  keyBy: (a: A) => K,
  f: (a: A) => Effect<R2, E2, A2>,
  buffer = 16,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  return self.groupByKey(keyBy, buffer).mergeGroupBy((_, s) => s.mapEffect(f))
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number of
 * concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is
 * maintained.
 */
export const mapEffectPartitioned = Pipeable(mapEffectPartitioned_)
