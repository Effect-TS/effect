// ets_tracing: off

import type { Either } from "../Either/index.js"
import { pipe } from "../Function/index.js"
import * as core from "./core.js"
import type { Effect } from "./effect.js"
import { either } from "./either.js"
import { fromEither } from "./fromEither.js"

/**
 * Returns an effect that effectfully "peeks" at the result of this effect as an `Either`.
 */
export function tapEither_<R, R1, E, E1, A, A1>(
  self: Effect<R, E, A>,
  f: (exit: Either<E, A>) => Effect<R1, E1, A1>,
  __trace?: string
): Effect<R & R1, E | E1, A> {
  return pipe(
    either(self),
    core.chain((exit) =>
      pipe(
        f(exit),
        core.chain(() => fromEither(() => exit))
      )
    )
  )
}

/**
 * Returns an effect that effectfully "peeks" at the result of this effect as an `Either`.
 *
 * @ets_data_first tapEither_
 */
export function tapEither<R1, E, E1, A, A1>(
  f: (exit: Either<E, A>) => Effect<R1, E1, A1>,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>) => tapEither_(self, f, __trace)
}
