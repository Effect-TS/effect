import * as E from "../../Either"
import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { map_ } from "./map"
import { orElse } from "./orElse"

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElseEither_<R, R1, E, E2, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E2, O2>
): Stream<R & R1, E2, E.Either<O, O2>> {
  return pipe(map_(self, E.left), orElse(map_(that, E.right)))
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElseEither<R1, E2, O2>(that: Stream<R1, E2, O2>) {
  return <R, E, O>(self: Stream<R, E, O>) => orElseEither_(self, that)
}
