import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../../io/Cause"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Returns a stream that always fails with the specified `Cause`.
 *
 * @tsplus static ets/StreamOps failCause
 */
export function failCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): Stream<unknown, E, never> {
  return Stream.fromEffect(Effect.failCause(cause))
}
