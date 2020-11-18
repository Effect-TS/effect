import type { Array } from "../../Array"
import type { HasClock } from "../../Clock"
import * as E from "../../Either"
import * as O from "../../Option"
import type { Schedule } from "../../Schedule"
import type { Transducer } from "../Transducer"
import { aggregateAsyncWithinEither_ } from "./aggregateAsyncWithinEither"
import type { Stream } from "./definitions"
import { filterMap_ } from "./filterMap"

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin<O, R1, E1, P>(
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Array<P>, any>
) {
  return <R, E>(self: Stream<R, E, O>) =>
    aggregateAsyncWithin_(self, transducer, schedule)
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, E, O, R1, E1, P>(
  self: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Array<P>, any>
): Stream<R & R1 & HasClock, E | E1, P> {
  return filterMap_(
    aggregateAsyncWithinEither_(self, transducer, schedule),
    E.fold(() => O.none, O.some)
  )
}
