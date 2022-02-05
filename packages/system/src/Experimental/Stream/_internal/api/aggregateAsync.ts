// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as SC from "../../../../Schedule/index.js"
import type * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as AggregateAsyncWithin from "./aggregateAsyncWithin.js"

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any sink can be used here, but see `Sink.foldWeightedM` and `Sink.foldUntilM` for
 * sinks that cover the common usecases.
 */
export function aggregateAsync_<R, R1, E extends E1, E1, E2, A extends A1, A1, B>(
  self: C.Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>
): C.Stream<R & R1 & CL.HasClock, E2, B> {
  return AggregateAsyncWithin.aggregateAsyncWithin_(self, sink, SC.forever)
}

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any sink can be used here, but see `Sink.foldWeightedM` and `Sink.foldUntilM` for
 * sinks that cover the common usecases.
 *
 * @ets_data_first aggregateAsync_
 */
export function aggregateAsync<R1, E1, E2, A1, B>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>
) {
  return <R, E extends E1, A extends A1>(self: C.Stream<R, E, A>) =>
    aggregateAsync_(self, sink)
}
