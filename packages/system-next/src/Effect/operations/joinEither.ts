import type { Either } from "../../Either"
import * as E from "../../Either"
import type { Effect } from "../definition"
import { environmentWithEffect } from "./environmentWithEffect"
import { map_ } from "./map"
import { provideEnvironment_ } from "./provideEnvironment"

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  that: Effect<R1, E1, A1>,
  __trace?: string
): Effect<E.Either<R, R1>, E | E1, Either<A, A1>> {
  return environmentWithEffect(
    (_: E.Either<R, R1>): Effect<unknown, E | E1, Either<A, A1>> =>
      E.fold_(
        _,
        (r) => map_(provideEnvironment_(self, r), E.left),
        (r1) => map_(provideEnvironment_(that, r1), E.right)
      ),
    __trace
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @ets_data_first joinEither_
 */
export function joinEither<R, E, A, R1, E1, A1>(
  that: Effect<R1, E1, A1>,
  __trace?: string
): (self: Effect<R, E, A>) => Effect<E.Either<R, R1>, E | E1, Either<A, A1>> {
  return (self) => joinEither_(self, that, __trace)
}
