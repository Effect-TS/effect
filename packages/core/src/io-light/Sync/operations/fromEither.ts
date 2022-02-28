import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Sync } from "../definition"

/**
 * Lifts an `Either` into a `Sync` value.
 *
 * @tsplus static ets/SyncOps fromEither
 */
export function fromEither<E, A>(f: LazyArg<Either<E, A>>) {
  return Sync.succeed(f).flatMap((either) =>
    either.fold(
      (e) => Sync.fail(e),
      (a) => Sync.succeed(a)
    )
  )
}
