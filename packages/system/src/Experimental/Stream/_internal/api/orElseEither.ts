// ets_tracing: off

import * as E from "../../../../Either/index.js"
import type * as C from "../core.js"
import * as Map from "./map.js"
import * as OrElse from "./orElse.js"

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElseEither_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R & R1, E | E1, E.Either<A, A1>> {
  return OrElse.orElse_(Map.map_(self, E.left), Map.map_(that, E.right))
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R1, E1, A1>(that: C.Stream<R1, E1, A1>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => orElseEither_(self, that)
}
