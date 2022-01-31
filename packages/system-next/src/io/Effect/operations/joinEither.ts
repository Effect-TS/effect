import type { Either } from "../../../data/Either"
import * as E from "../../../data/Either"
import { Effect } from "../definition"

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @tsplus fluent ets/Effect joinEither
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  that: Effect<R1, E1, A1>,
  __etsTrace?: string
): Effect<E.Either<R, R1>, E | E1, Either<A, A1>> {
  return Effect.environmentWithEffect(
    (_: E.Either<R, R1>): Effect<unknown, E | E1, Either<A, A1>> =>
      E.fold_(
        _,
        (r) => self.provideEnvironment(r).map(E.left),
        (r1) => that.provideEnvironment(r1).map(E.right)
      )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @ets_data_first joinEither_
 */
export function joinEither<R, E, A, R1, E1, A1>(
  that: Effect<R1, E1, A1>,
  __etsTrace?: string
): (self: Effect<R, E, A>) => Effect<E.Either<R, R1>, E | E1, Either<A, A1>> {
  return (self) => joinEither_(self, that)
}
