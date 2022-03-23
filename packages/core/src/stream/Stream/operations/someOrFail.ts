import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus fluent ets/Stream someOrFail
 */
export function someOrFail_<R, E, E2, A>(
  self: Stream<R, E, Option<A>>,
  e: LazyArg<E2>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  return self.mapEffect((option) => option.fold(Effect.fail(e), Effect.succeedNow))
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export const someOrFail = Pipeable(someOrFail_)
