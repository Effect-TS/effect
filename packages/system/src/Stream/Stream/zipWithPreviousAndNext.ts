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
): Stream<R, E, readonly [O.Option<O>, O, O.Option<O>]> {
  return pipe(
    self,
    zipWithPrevious,
    zipWithNext,
    map(([[prev, curr], next]) => [prev, curr, O.map_(next, ([_, r]) => r)] as const)
  )
}
