import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Returns a stream that always fails with the specified `error`.
 *
 * @tsplus static ets/StreamOps fail
 */
export function fail<E>(
  error: LazyArg<E>,
  __tsplusTrace?: string
): Stream<unknown, E, never> {
  return Stream.fromEffect(Effect.fail(error))
}
