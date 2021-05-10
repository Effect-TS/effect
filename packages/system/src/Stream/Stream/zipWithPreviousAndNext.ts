// tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import * as O from "../../Option"
import type { Stream } from "./definitions"
import { map } from "./map"
import { zipWithNext } from "./zipWithNext"
import { zipWithPrevious } from "./zipWithPrevious"

/**
 * Zips each element with both the previous and next element.
 */
export function zipWithPreviousAndNext<R, E, O>(
  self: Stream<R, E, O>
): Stream<R, E, Tp.Tuple<[O.Option<O>, O, O.Option<O>]>> {
  return pipe(
    self,
    zipWithPrevious,
    zipWithNext,
    map(
      ({
        tuple: [
          {
            tuple: [prev, curr]
          },
          next
        ]
      }) =>
        Tp.tuple(
          prev,
          curr,
          O.map_(next, ({ tuple: [_, r] }) => r)
        )
    )
  )
}
