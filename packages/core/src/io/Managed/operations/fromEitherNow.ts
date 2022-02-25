import type { Either } from "../../../data/Either"
import { Managed } from "../definition"

/**
 * Lifts an `Either` into a `Managed` value.
 *
 * @tsplus static ets/ManagedOps fromEitherNow
 */
export function fromEitherNow<E, A>(
  either: Either<E, A>,
  __tsplusTrace?: string
): Managed<unknown, E, A> {
  return Managed.succeedNow(either).flatMap((e) =>
    e.fold(Managed.failNow, Managed.succeedNow)
  )
}
