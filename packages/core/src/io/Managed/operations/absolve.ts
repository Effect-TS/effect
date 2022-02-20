import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 *
 * @tsplus fluent ets/Managed absolve
 */
export function absolveNow<R, E, E2, A>(
  self: Managed<R, E, Either<E2, A>>,
  __etsTrace?: string
): Managed<R, E | E2, A> {
  return Managed.absolve(self)
}

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 *
 * @tsplus static ets/ManagedOps absolve
 */
export function absolve<R, E, E2, A>(
  self: LazyArg<Managed<R, E, Either<E2, A>>>,
  __etsTrace?: string
): Managed<R, E | E2, A> {
  return Managed.suspend(self).flatMap(Managed.fromEitherNow)
}
