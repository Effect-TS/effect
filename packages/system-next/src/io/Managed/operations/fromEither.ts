import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Lifts an `Either` into a `Managed` value.
 *
 * @ets static ets/ManagedOps fromEither
 */
export function fromEither<E, A>(
  f: LazyArg<Either<E, A>>,
  __etsTrace?: string
): Managed<unknown, E, A> {
  return Managed.succeed(f).flatMap((e) => e.fold(Managed.failNow, Managed.succeedNow))
}
