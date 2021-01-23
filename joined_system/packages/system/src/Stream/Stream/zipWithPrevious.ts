import { pipe } from "../../Function"
import * as O from "../../Option"
import type { Stream } from "./definitions"
import { mapAccum } from "./mapAccum"

/**
 * Zips each element with the previous element. Initially accompanied by `None`.
 */
export function zipWithPrevious<R, E, O>(
  self: Stream<R, E, O>
): Stream<R, E, readonly [O.Option<O>, O]> {
  return pipe(
    self,
    mapAccum(O.none as O.Option<O>)(
      (prev, next) => [O.some(next), [prev, next] as const] as const
    )
  )
}
