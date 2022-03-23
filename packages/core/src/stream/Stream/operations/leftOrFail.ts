import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Fails with given error 'e' if value is `Right`.
 *
 * @tsplus fluent ets/Stream leftOrFail
 */
export function leftOrFail_<R, E, E2, A1, A2>(
  self: Stream<R, E, Either<A1, A2>>,
  e: LazyArg<E2>,
  __tsplusTrace?: string
): Stream<R, E | E2, A1> {
  return self.mapEffect((either) =>
    either.fold(Effect.succeedNow, () => Effect.fail(e))
  )
}

/**
 * Fails with given error 'e' if value is `Right`.
 */
export const leftOrFail = Pipeable(leftOrFail_)
