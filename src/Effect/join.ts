import type { Either } from "../Either"
import { left, right } from "../Either"
import * as E from "../Either"
import type { Effect } from "."
import { accessM, provideAll_ } from "."
import { map_ } from "./map_"

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function join<R1, E1, A1>(that: Effect<R1, E1, A1>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<E.Either<R, R1>, E | E1, A | A1> => {
    return join_(self, that)
  }
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function join_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  that: Effect<R1, E1, A1>
): Effect<E.Either<R, R1>, E | E1, A | A1> {
  return accessM(
    (_: E.Either<R, R1>): Effect<unknown, E | E1, A | A1> =>
      E.fold_(
        _,
        (r) => provideAll_(self, r),
        (r1) => provideAll_(that, r1)
      )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  that: Effect<R1, E1, A1>
): Effect<E.Either<R, R1>, E | E1, Either<A, A1>> {
  return accessM(
    (_: E.Either<R, R1>): Effect<unknown, E | E1, Either<A, A1>> =>
      E.fold_(
        _,
        (r) => map_(provideAll_(self, r), left),
        (r1) => map_(provideAll_(that, r1), right)
      )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither<R, E, A, R1, E1, A1>(
  that: Effect<R1, E1, A1>
): (self: Effect<R, E, A>) => Effect<E.Either<R, R1>, E | E1, Either<A, A1>> {
  return (self) => joinEither_(self, that)
}
