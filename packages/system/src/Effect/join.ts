// ets_tracing: off

import type { Either } from "../Either/index.js"
import { left, right } from "../Either/index.js"
import * as E from "../Either/index.js"
import { accessM, provideAll_ } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @ets_data_first join_
 */
export function join<R1, E1, A1>(that: Effect<R1, E1, A1>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<E.Either<R, R1>, E | E1, A | A1> => {
    return join_(self, that, __trace)
  }
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function join_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  that: Effect<R1, E1, A1>,
  __trace?: string
): Effect<E.Either<R, R1>, E | E1, A | A1> {
  return accessM(
    (_: E.Either<R, R1>): Effect<unknown, E | E1, A | A1> =>
      E.fold_(
        _,
        (r) => provideAll_(self, r),
        (r1) => provideAll_(that, r1)
      ),
    __trace
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  that: Effect<R1, E1, A1>,
  __trace?: string
): Effect<E.Either<R, R1>, E | E1, Either<A, A1>> {
  return accessM(
    (_: E.Either<R, R1>): Effect<unknown, E | E1, Either<A, A1>> =>
      E.fold_(
        _,
        (r) => map_(provideAll_(self, r), left),
        (r1) => map_(provideAll_(that, r1), right)
      ),
    __trace
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither<R, E, A, R1, E1, A1>(
  that: Effect<R1, E1, A1>,
  __trace?: string
): (self: Effect<R, E, A>) => Effect<E.Either<R, R1>, E | E1, Either<A, A1>> {
  return (self) => joinEither_(self, that, __trace)
}
