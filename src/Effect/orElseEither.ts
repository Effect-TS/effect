import * as E from "../Either"
import type { Effect } from "./effect"
import { map_ } from "./map_"
import { ISucceed } from "./primitives"
import { tryOrElse_ } from "./tryOrElse_"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 */
export function orElseEither<S2, R2, E2, A2>(that: Effect<S2, R2, E2, A2>) {
  return <S, R, E, A>(self: Effect<S, R, E, A>) => orElseEither_(self, that)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 */
export function orElseEither_<S, R, E, A, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  that: Effect<S2, R2, E2, A2>
): Effect<S | S2, R & R2, E2, E.Either<A, A2>> {
  return tryOrElse_(
    self,
    () => map_(that, E.right),
    (a) => new ISucceed(E.left(a))
  )
}
