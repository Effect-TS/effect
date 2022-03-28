import type { Either } from "../../../data/Either"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Submerges the error case of an `Either` into the `Stream`.
 *
 * @tsplus fluent ets/Stream absolve
 */
export function absolve_<R, E, E2, A>(
  self: Stream<R, E, Either<E2, A>>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  return self.mapEffect((either) => Effect.fromEither(either))
}

/**
 * Submerges the error case of an `Either` into the `Stream`.
 */
export const absolve = Pipeable(absolve_)
