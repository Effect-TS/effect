import * as E from "../Either"
import type { Effect } from "."
import { accessM, provideAll_ } from "."

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function join<R1, E1, A1>(that: Effect<R1, E1, A1>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<E.Either<R, R1>, E | E1, A | A1> => {
    return accessM(
      (_: E.Either<R, R1>): Effect<unknown, E | E1, A | A1> =>
        E.fold_(
          _,
          (r) => provideAll_(self, r),
          (r1) => provideAll_(that, r1)
        )
    )
  }
}
