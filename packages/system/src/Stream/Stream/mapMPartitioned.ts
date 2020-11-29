import type * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { groupByKey } from "./groupByKey"
import { mapM_ } from "./mapM"

/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number
 * of concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is maintained.
 */
export function mapMPartitioned<O, K>(keyBy: (o: O) => K, buffer = 16) {
  return <R1, E1, O2>(f: (o: O) => T.Effect<R1, E1, O2>) => <R, E>(
    self: Stream<R, E, O>
  ) => groupByKey(self, keyBy, buffer)((_, s) => mapM_(s, f))
}
