// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import type { Stream } from "./definitions.js"
import { map } from "./map.js"
import { zipWithNext } from "./zipWithNext.js"
import { zipWithPrevious } from "./zipWithPrevious.js"

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
