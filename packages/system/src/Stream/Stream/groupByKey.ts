// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { groupBy_ } from "./groupBy.js"

/**
 * Partition a stream using a function and process each stream individually.
 * This returns a data structure that can be used
 * to further filter down which groups shall be processed.
 *
 * After calling apply on the GroupBy object, the remaining groups will be processed
 * in parallel and the resulting streams merged in a nondeterministic fashion.
 *
 * Up to `buffer` elements may be buffered in any group stream before the producer
 * is backpressured. Take care to consume from all streams in order
 * to prevent deadlocks.
 */
export function groupByKey_<R, E, O, K>(
  self: Stream<R, E, O>,
  f: (o: O) => K,
  buffer = 16
) {
  return groupBy_(self, (a) => T.succeed(Tp.tuple(f(a), a)), buffer)
}

/**
 * Partition a stream using a function and process each stream individually.
 * This returns a data structure that can be used
 * to further filter down which groups shall be processed.
 *
 * After calling apply on the GroupBy object, the remaining groups will be processed
 * in parallel and the resulting streams merged in a nondeterministic fashion.
 *
 * Up to `buffer` elements may be buffered in any group stream before the producer
 * is backpressured. Take care to consume from all streams in order
 * to prevent deadlocks.
 */
export function groupByKey<O, K>(f: (o: O) => K, buffer = 16) {
  return <R, E>(self: Stream<R, E, O>) => groupByKey_(self, f, buffer)
}
