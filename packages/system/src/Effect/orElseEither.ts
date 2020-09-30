import * as E from "../Either"
import { flow } from "../Function"
import { succeed, tryOrElse_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 */
export function orElseEither<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>) => orElseEither_(self, that)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>
): Effect<R & R2, E2, E.Either<A, A2>> {
  return tryOrElse_(self, () => map_(that, E.right), flow(E.left, succeed))
}
