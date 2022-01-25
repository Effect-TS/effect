import type { Either } from "../../../data/Either"
import * as E from "../../../data/Either"
import type { Effect } from "../definition"
import { environmentWithEffect } from "./environmentWithEffect"
import { provideEnvironment_ } from "./provideEnvironment"

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
  return environmentWithEffect(
    (_: Either<R, R1>): Effect<unknown, E | E1, A | A1> =>
      E.fold_(
        _,
        (r) => provideEnvironment_(self, r),
        (r1) => provideEnvironment_(that, r1)
      ),
    __etsTrace
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @ets_data_first join_
 */
export function join<R1, E1, A1>(that: Effect<R1, E1, A1>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<Either<R, R1>, E | E1, A | A1> => {
    return join_(self, that, __etsTrace)
  }
}
