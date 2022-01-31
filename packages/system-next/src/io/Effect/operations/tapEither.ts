import * as E from "../../../data/Either"
import { failureOrCause } from "../../Cause"
import { Effect } from "../definition"

/**
 * Returns an effect that effectfully "peeks" at the result of this effect.
 *
 * @tsplus fluent ets/Effect tapEither
 */
export function tapEither_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (either: E.Either<E, A>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A> {
  return self.foldCauseEffect(
    (cause) =>
      E.fold_(
        failureOrCause(cause),
        (e) => f(E.left(e)).zipRight(Effect.failCauseNow(cause)),
        () => Effect.failCauseNow(cause)
      ),
    (a) => f(E.right(a)).as(a)
  )
}

/**
 * Returns an effect that effectfully "peeks" at the result of this effect.
 *
 * @ets_data_first tapEither_
 */
export function tapEither<E, A, R2, E2, X>(
  f: (either: E.Either<E, A>) => Effect<R2, E2, X>,
  __etsTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> => tapEither_(self, f)
}
