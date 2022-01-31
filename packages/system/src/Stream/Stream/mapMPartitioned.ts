// ets_tracing: off

import type * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { groupByKey_ } from "./groupByKey.js"
import { mapM_ } from "./mapM.js"

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number
 * of concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is maintained.
 */
export function mapMPartitioned<O, K, R1, E1, O2>(
  keyBy: (o: O) => K,
  f: (o: O) => T.Effect<R1, E1, O2>,
  buffer = 16
) {
  return <R, E>(self: Stream<R, E, O>) =>
    groupByKey_(self, keyBy, buffer).merge((_, s) => mapM_(s, f))
}
