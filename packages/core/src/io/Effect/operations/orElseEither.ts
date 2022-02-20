import { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @tsplus fluent ets/Effect orElseEither
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
): Effect<R & R2, E2, Either<A, A2>> {
  return self.tryOrElse(
    () => that().map(Either.right),
    (a) => Effect.succeedNow(Either.left(a))
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E2, Either<A, A2>> =>
    self.orElseEither(that)
}
