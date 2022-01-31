import type { Either } from "../../../data/Either"
import * as E from "../../../data/Either"
import { Effect } from "../definition"

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @ets fluent ets/Effect join
 */
export function join_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  that: Effect<R1, E1, A1>,
  __etsTrace?: string
): Effect<Either<R, R1>, E | E1, A | A1> {
  return Effect.environmentWithEffect(
    (_: Either<R, R1>): Effect<unknown, E | E1, A | A1> =>
      E.fold_(
        _,
        (r) => self.provideEnvironment(r),
        (r1) => that.provideEnvironment(r1)
      )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @ets_data_first join_
 */
export function join<R1, E1, A1>(that: Effect<R1, E1, A1>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<Either<R, R1>, E | E1, A | A1> => {
    return join_(self, that)
  }
}
