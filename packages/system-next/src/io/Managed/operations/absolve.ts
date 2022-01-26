import type { Either } from "../../../data/Either"
import { Managed } from "../definition"

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 *
 * @ets fluent ets/Managed absolve
 */
export function absolve<R, E, E2, A>(
  self: Managed<R, E, Either<E2, A>>,
  __etsTrace?: string
): Managed<R, E | E2, A> {
  return self.flatMap(Managed.fromEitherNow)
}
