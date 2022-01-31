// ets_tracing: off

import * as E from "../Either/index.js"
import { pipe } from "../Function/index.js"
import { succeed, tryOrElse_ } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R2, E2, A2>(
  that: () => Effect<R2, E2, A2>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>) => orElseEither_(self, that, __trace)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: () => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E2, E.Either<A, A2>> {
  return tryOrElse_(
    self,
    () => map_(that(), E.right),
    (x) => pipe(x, E.left, succeed),
    __trace
  )
}
