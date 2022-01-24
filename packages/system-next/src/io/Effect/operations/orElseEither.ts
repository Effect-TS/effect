import * as E from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../definition"
import { map_ } from "./map"
import { succeedNow } from "./succeedNow"
import { tryOrElse_ } from "./tryOrElse"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @ets fluent ets/Effect orElseEither
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __trace?: string
): Effect<R & R2, E2, E.Either<A, A2>> {
  return tryOrElse_(
    self,
    () => map_(that(), E.right),
    (a) => succeedNow(E.left(a)),
    __trace
  )
}

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
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E2, E.Either<A, A2>> =>
    orElseEither_(self, that, __trace)
}
