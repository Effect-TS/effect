// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as E from "../../../../Either"
import * as O from "../../../../Option"
import type * as SC from "../../../../Schedule"
import type * as SK from "../../Sink"
import type * as C from "../core"
import * as AggregateAsyncWithinEither from "./aggregateAsyncWithinEither"
import * as Collect from "./collect"

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<
  R,
  R1,
  R2,
  E extends E1,
  E1,
  E2,
  A extends A1,
  A1,
  B,
  C
>(
  self: C.Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
): C.Stream<R & R1 & R2 & CL.HasClock, E2, B> {
  return Collect.collect_(
    AggregateAsyncWithinEither.aggregateAsyncWithinEither_(self, sink, schedule),
    E.fold(
      () => O.none,
      (v) => O.some(v)
    )
  )
}

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 *
 * @ets_data_first aggregateAsyncWithin_
 */
export function aggregateAsyncWithin<R1, R2, E1, E2, A1, B, C>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
) {
  return <R, E extends E1, A extends A1>(self: C.Stream<R, E, A>) =>
    aggregateAsyncWithin_(self, sink, schedule)
}
