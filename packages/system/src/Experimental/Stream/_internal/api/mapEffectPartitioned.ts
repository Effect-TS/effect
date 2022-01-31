// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as GroupByKey from "./groupByKey.js"
import * as MapEffect from "./mapEffect.js"
import * as MergeGroupBy from "./mergeGroupBy.js"

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number
 * of concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is maintained.
 */
export function mapEffectPartitioned_<R, R1, E, E1, A, A1, K>(
  self: C.Stream<R, E, A>,
  keyBy: (a: A) => K,
  f: (a: A) => T.Effect<R1, E1, A1>,
  buffer = 16
): C.Stream<R & R1, E | E1, A1> {
  return MergeGroupBy.mergeGroupBy_(
    GroupByKey.groupByKey_(self, keyBy, buffer),
    (_, s) => MapEffect.mapEffect_(s, f)
  )
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number
 * of concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is maintained.
 *
 * @ets_data_first mapEffectPartitioned_
 */
export function mapEffectPartitioned<R1, E1, A, A1, K>(
  keyBy: (a: A) => K,
  f: (a: A) => T.Effect<R1, E1, A1>,
  buffer = 16
) {
  return <R, E>(self: C.Stream<R, E, A>) =>
    mapEffectPartitioned_(self, keyBy, f, buffer)
}
