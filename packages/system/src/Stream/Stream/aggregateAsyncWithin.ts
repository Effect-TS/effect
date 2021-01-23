import type * as A from "../../Chunk"
import type * as CL from "../../Clock"
import * as E from "../../Either"
import * as O from "../../Option"
import type * as SC from "../../Schedule"
import type * as TR from "../Transducer"
import { aggregateAsyncWithinEither_ } from "./aggregateAsyncWithinEither"
import type { Stream } from "./definitions"
import { filterMap_ } from "./filterMap"

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin<O, R1, E1, P>(
  transducer: TR.Transducer<R1, E1, O, P>,
  schedule: SC.Schedule<R1, A.Chunk<P>, any>
) {
  return <R, E>(self: Stream<R, E, O>) =>
    aggregateAsyncWithin_(self, transducer, schedule)
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, E, O, R1, E1, P>(
  self: Stream<R, E, O>,
  transducer: TR.Transducer<R1, E1, O, P>,
  schedule: SC.Schedule<R1, A.Chunk<P>, any>
): Stream<R & R1 & CL.HasClock, E | E1, P> {
  return filterMap_(
    aggregateAsyncWithinEither_(self, transducer, schedule),
    E.fold(() => O.none, O.some)
  )
}
