import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Fails with given error 'e' if value is `Left`.
 *
 * @tsplus fluent ets/Stream rightOrFail
 */
export function rightOrFail_<R, E, E2, A1, A2>(
  self: Stream<R, E, Either<A1, A2>>,
  e: LazyArg<E2>,
  __tsplusTrace?: string
): Stream<R, E | E2, A2> {
  return self.mapEffect((either) =>
    either.fold(() => Effect.fail(e), Effect.succeedNow)
  )
}

/**
 * Fails with given error 'e' if value is `Left`.
 */
export const rightOrFail = Pipeable(rightOrFail_)
