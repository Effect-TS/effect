import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import { Stream } from "../definition"

/**
 * A stream that ends with the specified `Exit` value.
 *
 * @tsplus static ets/StreamOps done
 */
export function done<E, A>(
  exit: LazyArg<Exit<E, A>>,
  __tsplusTrace?: string
): Stream<unknown, E, A> {
  return Stream.fromEffect(Effect.done(exit))
}
