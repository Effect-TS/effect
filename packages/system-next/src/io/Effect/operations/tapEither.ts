import * as E from "../../../data/Either"
import { failureOrCause } from "../../Cause"
import type { Effect } from "../definition"
import { as_ } from "./as"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { zipRight_ } from "./zipRight"

/**
 * Returns an effect that effectfully "peeks" at the result of this effect.
 *
 * @ets fluent ets/Effect tapEither
 */
export function tapEither_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (either: E.Either<E, A>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A> {
  return foldCauseEffect_(
    self,
    (cause) =>
      E.fold_(
        failureOrCause(cause),
        (e) => zipRight_(f(E.left(e)), failCause(cause)),
        () => failCause(cause)
      ),
    (a) => as_(f(E.right(a)), a),
    __etsTrace
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
  return <R>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    tapEither_(self, f, __etsTrace)
}
